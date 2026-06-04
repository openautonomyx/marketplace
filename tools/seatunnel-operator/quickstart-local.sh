#!/usr/bin/env bash
# Stand up the seatunnel-operator on a throwaway local cluster and run a quick
# reconcile. Daemonless / dockerless by default: prefers Podman over Docker and
# defaults to running the operator as a host process (no image build at all).
#
# Usage:
#   ./quickstart-local.sh                  # auto: kind (or minikube), operator as a host process
#   PROVIDER=minikube ./quickstart-local.sh
#   MODE=in-cluster ./quickstart-local.sh  # build the operator image + deploy it
#   DASHBOARD=1 ./quickstart-local.sh      # also install the Kubernetes Dashboard
#
# Notes
#   * MODE=local (default) needs NO container build — just python3 + kubectl.
#   * MODE=in-cluster builds an image with podman (preferred) or docker.
#   * k3d is intentionally NOT a default: it requires the Docker daemon.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLUSTER="${CLUSTER:-seatunnel}"
PROVIDER="${PROVIDER:-auto}"
MODE="${MODE:-local}"
IMAGE="${IMAGE:-seatunnel-operator:dev}"
DASHBOARD="${DASHBOARD:-0}"

need() { command -v "$1" >/dev/null 2>&1; }

# --- pick a daemonless container engine (podman preferred) ------------------
ENGINE=""
if need podman; then ENGINE=podman
elif need docker; then ENGINE=docker
fi

# --- pick a cluster provider that works without the Docker daemon -----------
if [ "${PROVIDER}" = "auto" ]; then
  if need kind; then PROVIDER=kind
  elif need minikube; then PROVIDER=minikube
  else
    echo "Need kind or minikube on PATH (both run on Podman, daemonless):"
    echo "  kind:     go install sigs.k8s.io/kind@latest   (or download the release binary)"
    echo "  minikube: https://minikube.sigs.k8s.io/docs/start/"
    echo "  engine:   install podman (daemonless)          https://podman.io/"
    exit 1
  fi
fi
need kubectl || { echo "kubectl is required."; exit 1; }

# kind talks to Podman via this flag; harmless if the engine is docker.
if [ "${PROVIDER}" = "kind" ] && [ "${ENGINE}" = "podman" ]; then
  export KIND_EXPERIMENTAL_PROVIDER=podman
fi
echo ">> provider=${PROVIDER} engine=${ENGINE:-<none>} mode=${MODE} cluster=${CLUSTER}"

echo ">> Creating cluster (if absent)"
case "${PROVIDER}" in
  kind)
    kind get clusters 2>/dev/null | grep -qx "${CLUSTER}" || kind create cluster --name "${CLUSTER}"
    ;;
  minikube)
    if [ "${ENGINE}" = "podman" ]; then DRIVER="podman"; else DRIVER="${MINIKUBE_DRIVER:-docker}"; fi
    minikube -p "${CLUSTER}" status >/dev/null 2>&1 || minikube -p "${CLUSTER}" start --driver="${DRIVER}"
    ;;
  *) echo "Unsupported PROVIDER=${PROVIDER} for a dockerless setup."; exit 1 ;;
esac

echo ">> Installing the SeaTunnelJob CRD"
kubectl apply -f "${HERE}/crd.yaml"

if [ "${MODE}" = "in-cluster" ]; then
  [ -n "${ENGINE}" ] || { echo "MODE=in-cluster needs podman or docker to build the image."; exit 1; }
  echo ">> Building operator image ${IMAGE} with ${ENGINE}"
  "${ENGINE}" build -t "${IMAGE}" "${HERE}"
  echo ">> Loading the image into the cluster"
  case "${PROVIDER}" in
    kind)
      if [ "${ENGINE}" = "podman" ]; then
        "${ENGINE}" save "${IMAGE}" -o /tmp/${CLUSTER}-op.tar && kind load image-archive /tmp/${CLUSTER}-op.tar --name "${CLUSTER}" && rm -f /tmp/${CLUSTER}-op.tar
      else
        kind load docker-image "${IMAGE}" --name "${CLUSTER}"
      fi
      ;;
    minikube) minikube -p "${CLUSTER}" image load "${IMAGE}" ;;
  esac
  echo ">> Applying RBAC + Deployment (pinned to the local image)"
  kubectl apply -f "${HERE}/rbac.yaml"
  kubectl apply -f "${HERE}/deployment.yaml"
  kubectl -n seatunnel-system set image deployment/seatunnel-operator "operator=${IMAGE}"
  kubectl -n seatunnel-system patch deployment seatunnel-operator \
    --type json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/imagePullPolicy","value":"IfNotPresent"}]'
  kubectl -n seatunnel-system rollout status deployment/seatunnel-operator
  echo ">> Operator running in-cluster."
else
  echo ">> CRD installed. Run the operator locally (daemonless — just python3):"
  echo "   python3 ${HERE}/seatunnel_operator.py run"
fi

if [ "${DASHBOARD}" = "1" ]; then
  echo ">> Installing the Kubernetes Dashboard + scoped access"
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml
  kubectl apply -f "${HERE}/dashboard.yaml"
  echo "   token:  kubectl -n kubernetes-dashboard create token dashboard-user"
  echo "   tunnel: kubectl -n kubernetes-dashboard port-forward svc/kubernetes-dashboard 8443:443"
fi

echo ">> Submit a pipeline:"
echo "   kubectl apply -f ${HERE}/examples/salesforce-to-console.yaml && kubectl get seatunneljobs"
