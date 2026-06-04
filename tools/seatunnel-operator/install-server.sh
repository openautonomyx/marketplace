#!/usr/bin/env bash
# Provision a single Linux server to run the seatunnel-operator, end to end.
#
# Cluster:  k3s (single-binary Kubernetes, systemd service, bundled containerd —
#           no Docker daemon). Installs kubectl + a kubeconfig as a side effect.
# Operator: by default runs as a host process under its own systemd unit
#           (container-daemonless, survives reboots). MODE=in-cluster instead
#           builds an image with Podman, imports it into k3s, and deploys it.
#
# Usage (run as root, or a sudo-capable user):
#   sudo ./install-server.sh
#   sudo MODE=in-cluster ./install-server.sh
#   sudo DASHBOARD=1 ./install-server.sh
#
# Env:
#   MODE=local|in-cluster   (default local)
#   DASHBOARD=0|1           (default 0)
#   IMAGE=...               (in-cluster image tag; default seatunnel-operator:dev)
#   RECONCILE_INTERVAL=15   (operator poll interval, seconds)
#   PREFIX=/opt/seatunnel-operator   (install dir for MODE=local)
#
# NOTE: this script changes system state (installs k3s, writes a systemd unit).
# It is syntax-checked but must be run on a real server; review before use.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${MODE:-local}"
DASHBOARD="${DASHBOARD:-0}"
IMAGE="${IMAGE:-seatunnel-operator:dev}"
RECONCILE_INTERVAL="${RECONCILE_INTERVAL:-15}"
PREFIX="${PREFIX:-/opt/seatunnel-operator}"
KUBECONFIG_PATH="/etc/rancher/k3s/k3s.yaml"
DASHBOARD_URL="https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml"

# --- privilege helper -------------------------------------------------------
SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  command -v sudo >/dev/null 2>&1 || { echo "Run as root or install sudo."; exit 1; }
  SUDO="sudo"
fi
need() { command -v "$1" >/dev/null 2>&1; }

echo ">> Preflight"
[ "$(uname -s)" = "Linux" ] || { echo "k3s requires Linux."; exit 1; }
need curl || { echo "curl is required."; exit 1; }
KUBECTL="kubectl"

# --- 1) k3s -----------------------------------------------------------------
if need k3s; then
  echo ">> k3s already installed"
else
  echo ">> Installing k3s (this starts the k3s systemd service)"
  curl -sfL https://get.k3s.io | ${SUDO} sh -
fi
# k3s ships kubectl + writes a root-owned kubeconfig; make it usable here.
export KUBECONFIG="${KUBECONFIG_PATH}"
need kubectl || KUBECTL="k3s kubectl"

echo ">> Waiting for the node to be Ready"
for _ in $(seq 1 60); do
  if ${SUDO} ${KUBECTL} get nodes 2>/dev/null | grep -q " Ready "; then break; fi
  sleep 5
done
${SUDO} ${KUBECTL} get nodes

# --- 2) CRD -----------------------------------------------------------------
echo ">> Installing the SeaTunnelJob CRD"
${SUDO} ${KUBECTL} apply -f "${HERE}/crd.yaml"

# --- 3) operator ------------------------------------------------------------
if [ "${MODE}" = "in-cluster" ]; then
  need podman || { echo "MODE=in-cluster needs podman (daemonless build)."; exit 1; }
  echo ">> Building operator image ${IMAGE} with podman"
  podman build -t "${IMAGE}" "${HERE}"
  echo ">> Importing the image into k3s (containerd)"
  podman save "${IMAGE}" -o /tmp/seatunnel-operator.tar
  ${SUDO} k3s ctr images import /tmp/seatunnel-operator.tar
  rm -f /tmp/seatunnel-operator.tar
  echo ">> Applying RBAC + Deployment (pinned to the imported image)"
  ${SUDO} ${KUBECTL} apply -f "${HERE}/rbac.yaml"
  ${SUDO} ${KUBECTL} apply -f "${HERE}/deployment.yaml"
  ${SUDO} ${KUBECTL} -n seatunnel-system set image deployment/seatunnel-operator "operator=${IMAGE}"
  ${SUDO} ${KUBECTL} -n seatunnel-system patch deployment seatunnel-operator \
    --type json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/imagePullPolicy","value":"IfNotPresent"}]'
  ${SUDO} ${KUBECTL} -n seatunnel-system rollout status deployment/seatunnel-operator
  echo ">> Operator running in-cluster (Deployment seatunnel-operator)."
else
  echo ">> Installing the operator as a host systemd service (no container)"
  need python3 || { echo "python3 is required for MODE=local."; exit 1; }
  ${SUDO} install -d "${PREFIX}"
  ${SUDO} install -m 0644 "${HERE}/seatunnel_operator.py" "${PREFIX}/seatunnel_operator.py"
  ${SUDO} tee /etc/systemd/system/seatunnel-operator.service >/dev/null <<UNIT
[Unit]
Description=SeaTunnel Operator (reconciles SeaTunnelJob CRs into k8s Jobs)
After=k3s.service network-online.target
Wants=k3s.service network-online.target

[Service]
Environment=KUBECONFIG=${KUBECONFIG_PATH}
Environment=KUBECTL=${KUBECTL}
Environment=RECONCILE_INTERVAL=${RECONCILE_INTERVAL}
ExecStart=/usr/bin/env python3 ${PREFIX}/seatunnel_operator.py run
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
  ${SUDO} systemctl daemon-reload
  ${SUDO} systemctl enable --now seatunnel-operator.service
  echo ">> Operator service status:"
  ${SUDO} systemctl --no-pager --full status seatunnel-operator.service || true
fi

# --- 4) dashboard (optional) ------------------------------------------------
if [ "${DASHBOARD}" = "1" ]; then
  echo ">> Installing the Kubernetes Dashboard + scoped access"
  ${SUDO} ${KUBECTL} apply -f "${DASHBOARD_URL}"
  ${SUDO} ${KUBECTL} apply -f "${HERE}/dashboard.yaml"
  echo "   token:  ${SUDO} ${KUBECTL} -n kubernetes-dashboard create token dashboard-user"
  echo "   tunnel: ${SUDO} ${KUBECTL} -n kubernetes-dashboard port-forward --address 0.0.0.0 svc/kubernetes-dashboard 8443:443"
fi

cat <<DONE

>> Done.
   kubeconfig: ${KUBECONFIG_PATH}  (export KUBECONFIG=${KUBECONFIG_PATH})
   submit a pipeline:
     ${SUDO} ${KUBECTL} apply -f ${HERE}/examples/salesforce-to-console.yaml
     ${SUDO} ${KUBECTL} get seatunneljobs
$( [ "${MODE}" = "local" ] && echo "   operator logs:  ${SUDO} journalctl -u seatunnel-operator -f" )
$( [ "${MODE}" = "in-cluster" ] && echo "   operator logs:  ${SUDO} ${KUBECTL} -n seatunnel-system logs deploy/seatunnel-operator -f" )
DONE
