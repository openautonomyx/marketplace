#!/usr/bin/env python3
"""seatunnel-operator: a small Kubernetes operator for SeaTunnel pipelines.

It watches `SeaTunnelJob` custom resources (group marketplace.openautonomyx.io)
and reconciles each one into:

  * a ConfigMap holding the pipeline config (HOCON), and
  * a batch/v1 Job that runs `seatunnel.sh --config ... -e <engine>`,

both owned by the SeaTunnelJob via ownerReferences (so deleting the CR garbage
collects them). The Job's progress is mirrored back into `.status.phase`.

Design notes
------------
* No third-party deps. All cluster I/O goes through `kubectl` (configurable via
  KUBECTL, default "kubectl"), and CRs are read as JSON so we never parse YAML.
* The render layer (`render_configmap` / `render_job` / `desired_objects`) is
  pure: it maps a CR dict to manifest dicts and is unit-tested offline with no
  cluster. The reconcile layer wraps it with apply/status calls.
* Reconciliation is idempotent and content-addressed: a hash of the relevant
  spec fields names the Job, so an edited CR rolls a fresh Job and stale ones
  are pruned.

Usage:
  seatunnel_operator.py run [--namespace NS] [--interval SECONDS]   # control loop
  seatunnel_operator.py reconcile-once [--namespace NS]             # single pass
  seatunnel_operator.py render --cr FILE.json                       # print manifests, no cluster
"""

from __future__ import annotations

import argparse
import datetime as _dt
import hashlib
import json
import os
import subprocess
import sys
import time
from typing import Any

GROUP = "marketplace.openautonomyx.io"
VERSION = "v1alpha1"
CR_PLURAL = "seatunneljobs"
API_VERSION = f"{GROUP}/{VERSION}"
KIND = "SeaTunnelJob"
MANAGED_BY = "seatunnel-operator"
CONFIG_FILE_NAME = "pipeline.conf"
CONFIG_MOUNT_PATH = "/opt/seatunnel-job"
DNS_LABEL_MAX = 63  # Kubernetes object names (Job/ConfigMap) are DNS labels.

DEFAULT_RESOURCES = {
    "requests": {"cpu": "500m", "memory": "1Gi"},
    "limits": {"cpu": "1", "memory": "2Gi"},
}

# Terminal/active phases.
PHASE_PENDING = "Pending"
PHASE_RUNNING = "Running"
PHASE_SUCCEEDED = "Succeeded"
PHASE_FAILED = "Failed"


# --------------------------------------------------------------------------- #
# Pure render layer (no cluster access; unit-tested offline)
# --------------------------------------------------------------------------- #
def spec_hash(spec: dict[str, Any]) -> str:
    """Stable short hash over the spec fields that affect the rendered Job."""
    material = {
        "image": spec.get("image"),
        "engine": spec.get("engine", "local"),
        "config": spec.get("config"),
        "secretRef": spec.get("secretRef"),
        "backoffLimit": spec.get("backoffLimit", 1),
        "activeDeadlineSeconds": spec.get("activeDeadlineSeconds"),
        "resources": spec.get("resources") or DEFAULT_RESOURCES,
    }
    blob = json.dumps(material, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(blob).hexdigest()[:10]


def owner_reference(cr: dict[str, Any]) -> dict[str, Any]:
    meta = cr["metadata"]
    return {
        "apiVersion": API_VERSION,
        "kind": KIND,
        "name": meta["name"],
        "uid": meta["uid"],
        "controller": True,
        "blockOwnerDeletion": True,
    }


def _names(cr: dict[str, Any]) -> tuple[str, str]:
    """Return (job_name, configmap_name) derived from the CR name + spec hash.

    Job/ConfigMap names are DNS labels capped at 63 chars. A SeaTunnelJob CR name
    may be a DNS *subdomain* (up to 253 chars), so the base is truncated to leave
    room for ``-<hash>`` and keep the result a valid label.
    """
    base = cr["metadata"]["name"]
    h = spec_hash(cr["spec"])
    keep = DNS_LABEL_MAX - len(h) - 1  # room for the "-" separator
    trimmed = base[:keep].rstrip("-.") or base[:1]
    name = f"{trimmed}-{h}"
    return name, name


def _common_labels(cr: dict[str, Any]) -> dict[str, str]:
    return {
        "app.kubernetes.io/managed-by": MANAGED_BY,
        "marketplace.openautonomyx.io/seatunneljob": cr["metadata"]["name"],
    }


def render_configmap(cr: dict[str, Any]) -> dict[str, Any]:
    name, cm_name = _names(cr)
    return {
        "apiVersion": "v1",
        "kind": "ConfigMap",
        "metadata": {
            "name": cm_name,
            "namespace": cr["metadata"]["namespace"],
            "labels": _common_labels(cr),
            "ownerReferences": [owner_reference(cr)],
        },
        "data": {CONFIG_FILE_NAME: cr["spec"]["config"]},
    }


def render_job(cr: dict[str, Any]) -> dict[str, Any]:
    spec = cr["spec"]
    job_name, cm_name = _names(cr)
    engine = spec.get("engine", "local")

    container: dict[str, Any] = {
        "name": "seatunnel",
        "image": spec["image"],
        "command": ["/bin/sh", "-c"],
        "args": [
            "${SEATUNNEL_HOME}/bin/seatunnel.sh "
            f"--config {CONFIG_MOUNT_PATH}/{CONFIG_FILE_NAME} -e {engine}"
        ],
        "resources": spec.get("resources") or DEFAULT_RESOURCES,
        "volumeMounts": [{"name": "job-config", "mountPath": CONFIG_MOUNT_PATH}],
    }
    if spec.get("secretRef"):
        container["envFrom"] = [{"secretRef": {"name": spec["secretRef"]}}]

    pod_spec: dict[str, Any] = {
        "restartPolicy": "Never",
        "containers": [container],
        "volumes": [{"name": "job-config", "configMap": {"name": cm_name}}],
    }

    job_spec: dict[str, Any] = {
        "backoffLimit": spec.get("backoffLimit", 1),
        "template": {"metadata": {"labels": _common_labels(cr)}, "spec": pod_spec},
    }
    if spec.get("activeDeadlineSeconds"):
        job_spec["activeDeadlineSeconds"] = spec["activeDeadlineSeconds"]

    return {
        "apiVersion": "batch/v1",
        "kind": "Job",
        "metadata": {
            "name": job_name,
            "namespace": cr["metadata"]["namespace"],
            "labels": _common_labels(cr),
            "ownerReferences": [owner_reference(cr)],
        },
        "spec": job_spec,
    }


def desired_objects(cr: dict[str, Any]) -> list[dict[str, Any]]:
    return [render_configmap(cr), render_job(cr)]


def phase_from_job_status(job: dict[str, Any]) -> tuple[str, str]:
    """Map a Job's status into (phase, message)."""
    status = (job or {}).get("status", {})
    conditions = status.get("conditions", []) or []
    for cond in conditions:
        if cond.get("type") == "Complete" and cond.get("status") == "True":
            return PHASE_SUCCEEDED, cond.get("message", "Job completed")
        if cond.get("type") == "Failed" and cond.get("status") == "True":
            return PHASE_FAILED, cond.get("message", "Job failed")
    if status.get("active", 0):
        return PHASE_RUNNING, "Job pod is running"
    return PHASE_PENDING, "Waiting for the Job to start"


# --------------------------------------------------------------------------- #
# kubectl I/O layer
# --------------------------------------------------------------------------- #
def kubectl_argv() -> list[str]:
    # KUBECTL may contain args, e.g. "microk8s kubectl".
    return os.environ.get("KUBECTL", "kubectl").split()


def _run(args: list[str], stdin: str | None = None, check: bool = True) -> str:
    proc = subprocess.run(
        kubectl_argv() + args,
        input=stdin,
        capture_output=True,
        text=True,
    )
    if check and proc.returncode != 0:
        raise RuntimeError(
            f"kubectl {' '.join(args)} failed (rc={proc.returncode}): {proc.stderr.strip()}"
        )
    return proc.stdout


def apply(obj: dict[str, Any]) -> None:
    _run(["apply", "-f", "-"], stdin=json.dumps(obj))


def list_crs(namespace: str | None) -> list[dict[str, Any]]:
    args = ["get", CR_PLURAL, "-o", "json"]
    if namespace:
        args += ["-n", namespace]
    else:
        args += ["--all-namespaces"]
    out = _run(args, check=False)
    if not out.strip():
        return []
    return json.loads(out).get("items", [])


def get_job(namespace: str, name: str) -> dict[str, Any] | None:
    out = _run(["get", "job", name, "-n", namespace, "-o", "json"], check=False)
    if not out.strip():
        return None
    return json.loads(out)


def list_owned_jobs(cr: dict[str, Any]) -> list[dict[str, Any]]:
    ns = cr["metadata"]["namespace"]
    selector = f"marketplace.openautonomyx.io/seatunneljob={cr['metadata']['name']}"
    out = _run(["get", "job", "-n", ns, "-l", selector, "-o", "json"], check=False)
    if not out.strip():
        return []
    return json.loads(out).get("items", [])


def patch_status(cr: dict[str, Any], status: dict[str, Any]) -> None:
    ns = cr["metadata"]["namespace"]
    name = cr["metadata"]["name"]
    body = json.dumps({"status": status})
    _run(
        [
            "patch",
            f"{CR_PLURAL}.{GROUP}",
            name,
            "-n",
            ns,
            "--subresource=status",
            "--type=merge",
            "-p",
            body,
        ],
        check=False,
    )


def delete_job(namespace: str, name: str) -> None:
    _run(
        ["delete", "job", name, "-n", namespace, "--ignore-not-found",
         "--cascade=foreground"],
        check=False,
    )


# --------------------------------------------------------------------------- #
# Reconcile layer
# --------------------------------------------------------------------------- #
def _now() -> str:
    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def reconcile_one(cr: dict[str, Any], log=print) -> dict[str, Any]:
    """Drive a single SeaTunnelJob toward its desired state. Returns new status."""
    ns = cr["metadata"]["namespace"]
    name = cr["metadata"]["name"]
    desired_job_name, _ = _names(cr)
    new_hash = spec_hash(cr["spec"])
    generation = cr["metadata"].get("generation")

    # Apply the desired ConfigMap + Job (idempotent).
    for obj in desired_objects(cr):
        apply(obj)

    # Prune Jobs from previous spec revisions.
    for job in list_owned_jobs(cr):
        jname = job["metadata"]["name"]
        if jname != desired_job_name:
            log(f"[{ns}/{name}] pruning stale job {jname}")
            delete_job(ns, jname)

    current = get_job(ns, desired_job_name)
    phase, message = phase_from_job_status(current) if current else (PHASE_PENDING, "Job not yet created")

    status = {
        "phase": phase,
        "jobName": desired_job_name,
        "configHash": new_hash,
        "message": message,
        "observedGeneration": generation,
        "lastTransitionTime": _now(),
    }
    patch_status(cr, status)
    log(f"[{ns}/{name}] phase={phase} job={desired_job_name}")
    return status


def reconcile_all(namespace: str | None, log=print) -> int:
    crs = list_crs(namespace)
    for cr in crs:
        try:
            reconcile_one(cr, log=log)
        except Exception as exc:  # keep the loop alive across a single bad CR
            meta = cr.get("metadata", {})
            log(f"[{meta.get('namespace')}/{meta.get('name')}] reconcile error: {exc}")
    return len(crs)


def run_loop(namespace: str | None, interval: float, log=print) -> None:
    log(
        f"seatunnel-operator watching {CR_PLURAL}.{GROUP} "
        f"({'namespace ' + namespace if namespace else 'all namespaces'}), "
        f"interval={interval}s"
    )
    while True:
        try:
            n = reconcile_all(namespace, log=log)
            log(f"reconciled {n} SeaTunnelJob(s)")
        except Exception as exc:
            log(f"reconcile pass failed: {exc}")
        time.sleep(interval)


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def _cmd_render(args: argparse.Namespace) -> int:
    with open(args.cr) as fh:
        cr = json.load(fh)
    # Allow a minimal CR (no uid/namespace) for offline rendering.
    cr.setdefault("metadata", {})
    cr["metadata"].setdefault("namespace", "default")
    cr["metadata"].setdefault("uid", "00000000-0000-0000-0000-000000000000")
    for obj in desired_objects(cr):
        print("---")
        print(json.dumps(obj, indent=2))
    return 0


def _cmd_reconcile_once(args: argparse.Namespace) -> int:
    n = reconcile_all(args.namespace)
    print(f"reconciled {n} SeaTunnelJob(s)")
    return 0


def _cmd_run(args: argparse.Namespace) -> int:
    run_loop(args.namespace, args.interval)
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="seatunnel-operator", description=__doc__)
    sub = p.add_subparsers(dest="command", required=True)

    run = sub.add_parser("run", help="run the reconcile control loop")
    run.add_argument("--namespace", default=os.environ.get("WATCH_NAMESPACE") or None)
    run.add_argument("--interval", type=float, default=float(os.environ.get("RECONCILE_INTERVAL", "15")))
    run.set_defaults(func=_cmd_run)

    once = sub.add_parser("reconcile-once", help="run a single reconcile pass and exit")
    once.add_argument("--namespace", default=os.environ.get("WATCH_NAMESPACE") or None)
    once.set_defaults(func=_cmd_reconcile_once)

    render = sub.add_parser("render", help="render manifests for a CR (JSON) without a cluster")
    render.add_argument("--cr", required=True, help="path to a SeaTunnelJob CR as JSON")
    render.set_defaults(func=_cmd_render)

    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
