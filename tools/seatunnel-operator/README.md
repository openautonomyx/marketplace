# seatunnel-operator

A small Kubernetes **operator** that turns declarative `SeaTunnelJob` custom
resources into running SeaTunnel batch Jobs. It generalizes the hand-rolled
`deploy.sh` under
[`connector-salesforce/deploy/microk8s`](../../seatunnel-connectors-v2/connector-salesforce/deploy/microk8s):
instead of a connector-specific script, you `kubectl apply` a `SeaTunnelJob`
and the operator reconciles it.

```
SeaTunnelJob (CR)  ──watch──▶  seatunnel-operator  ──reconcile──▶  ConfigMap + Job
        ▲                                                                │
        └───────────────────── status.phase ◀───────────────────────────┘
```

## What it does

For each `SeaTunnelJob` it:

1. renders a **ConfigMap** holding the pipeline config (the `spec.config` HOCON),
2. renders a **Job** that runs `seatunnel.sh --config … -e <engine>`, mounting that
   config and (optionally) injecting a Secret via `envFrom`,
3. owns both via `ownerReferences`, so deleting the CR garbage-collects them,
4. mirrors the Job's progress into `status.phase` (`Pending`/`Running`/`Succeeded`/`Failed`).

Reconciliation is **content-addressed**: the Job/ConfigMap names embed a hash of
the spec, so editing a `SeaTunnelJob` rolls a fresh Job and prunes the stale one.

## Files

| File | Purpose |
| ---- | ------- |
| `crd.yaml` | `SeaTunnelJob` CustomResourceDefinition (`marketplace.openautonomyx.io/v1alpha1`) |
| `seatunnel_operator.py` | The operator: pure render layer + kubectl-backed reconcile loop. Stdlib only. |
| `rbac.yaml` | Namespace, ServiceAccount, ClusterRole/Binding |
| `deployment.yaml` | Runs the operator in-cluster |
| `Dockerfile` | Operator image (Python 3 + kubectl) |
| `examples/salesforce-to-console.yaml` | A sample `SeaTunnelJob` (Salesforce → Console) |
| `tests/test_render.py` | Offline unit tests for the render/status layer |

## Try it without a cluster

The render layer is pure, so you can see exactly what a CR produces and run the
tests with no Kubernetes:

```bash
cd tools/seatunnel-operator
python3 -m unittest discover -s tests -v

# render the manifests for a CR (JSON in, manifests out)
python3 seatunnel_operator.py render --cr my-seatunneljob.json
```

## Quickstart on a local cluster (daemonless / no Docker)

`quickstart-local.sh` stands up a throwaway cluster and wires up the operator.
It is **daemonless and dockerless by default**: it prefers [Podman](https://podman.io/)
over Docker and, in the default `MODE=local`, runs the operator as a plain host
process so there is **no image to build at all**.

```bash
# kind (Podman provider) or minikube --driver=podman, then operator as a host process
./tools/seatunnel-operator/quickstart-local.sh

# add the Kubernetes Dashboard
DASHBOARD=1 ./tools/seatunnel-operator/quickstart-local.sh

# build + deploy the operator in-cluster instead (podman build, no Docker daemon)
MODE=in-cluster ./tools/seatunnel-operator/quickstart-local.sh
```

> **k3d is intentionally avoided** here — it requires the Docker daemon. The
> daemonless stack is Podman + kind (Podman provider) or `minikube --driver=podman`.
> To just *run* the operator you don't even need a container engine — `python3
> seatunnel_operator.py run` against any kubeconfig is enough.

## Dashboard

The operator ships no UI; SeaTunnelJobs are first-class API objects, so any
cluster dashboard lists them (with the CRD's printer columns) once installed.
[`dashboard.yaml`](dashboard.yaml) adds a login ServiceAccount + RBAC (including
read on the SeaTunnelJob CRD) for the standard **Kubernetes Dashboard**:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml
kubectl apply -f tools/seatunnel-operator/dashboard.yaml
kubectl -n kubernetes-dashboard create token dashboard-user        # paste at login
kubectl -n kubernetes-dashboard port-forward svc/kubernetes-dashboard 8443:443
```

## Deploy on microk8s

```bash
# 0) build the operator image (use `podman build` if you avoid Docker)
podman build -t localhost:32000/seatunnel-operator:dev tools/seatunnel-operator
podman push localhost:32000/seatunnel-operator:dev

# 1) install the CRD, RBAC, and the operator — one bundled manifest
microk8s kubectl apply -f tools/seatunnel-operator/install.yaml

# 2) submit a pipeline (edit the image + secret first)
microk8s kubectl apply -f tools/seatunnel-operator/examples/salesforce-to-console.yaml

# 3) watch it
microk8s kubectl get seatunneljobs
microk8s kubectl logs job/$(microk8s kubectl get stj salesforce-to-console -o jsonpath='{.status.jobName}')
```

`install.yaml` is a single-file bundle of `crd.yaml` + `rbac.yaml` +
`deployment.yaml` (apply the parts individually if you prefer). On any other
cluster, swap `microk8s kubectl` for `kubectl`.

> The image referenced by `spec.image` must bundle the SeaTunnel runtime **and**
> the connector jars the pipeline uses. For the Salesforce example, build the
> overlay image described in
> [`connector-salesforce/deploy/microk8s/README.md`](../../seatunnel-connectors-v2/connector-salesforce/deploy/microk8s/README.md).

## Run the loop locally (against any kubectl context)

You don't have to run in-cluster to try the controller — point it at your
current context. It shells out to `kubectl` (override with `KUBECTL`, e.g.
`microk8s kubectl`):

```bash
microk8s kubectl apply -f tools/seatunnel-operator/crd.yaml
KUBECTL="microk8s kubectl" python3 tools/seatunnel-operator/seatunnel_operator.py reconcile-once
KUBECTL="microk8s kubectl" python3 tools/seatunnel-operator/seatunnel_operator.py run --interval 10
```

## `SeaTunnelJob` spec

| Field | Required | Description |
| ----- | -------- | ----------- |
| `image` | yes | Image bundling SeaTunnel + the connector jars |
| `config` | yes | The full SeaTunnel pipeline config (HOCON) |
| `engine` | no (`local`) | `seatunnel.sh -e` value: `local` or `cluster` |
| `secretRef` | no | Secret in the same namespace; its keys become env vars (`envFrom`) |
| `backoffLimit` | no (`1`) | Job `backoffLimit` |
| `activeDeadlineSeconds` | no | Hard wall-clock limit for the Job |
| `resources` | no | Container resource requests/limits |

## Scope / notes

- Batch pipelines (`job.mode = "BATCH"`); the status maps a Job's `Complete`/`Failed`
  conditions to phases. Streaming jobs run too, but stay `Running`.
- The reconcile loop is a polling controller (default 15s) — deliberately simple
  and dependency-free. A production build would swap polling for a watch and add
  leader election; the pure render layer would carry over unchanged.
- Secrets in `examples/` are placeholders. Create them out-of-band
  (`kubectl create secret …`) or via a sealed/ESO secret for anything real.
