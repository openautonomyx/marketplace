#!/usr/bin/env bash
# Stand up the seatunnel-operator on a throwaway local cluster (k3d or kind) and
# run a quick reconcile. Intended for laptops / CI / a scratch server — NOT for
# production. Idempotent: re-running re-applies the manifests.
#
# Usage:
#   ./quickstart-local.sh                 # uses k3d if present, else kind
#   PROVIDER=kind ./quickstart-local.sh   # force kind
#   MODE=in-cluster ./quickstart-local.sh # build image + deploy the Deployment
#
# Default MODE=local runs the operator as a host process against the new cluster
# (no image build needed — the easiest path).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLUSTER="${CLUSTER:-seatunnel}"
PROVIDER="${PROVIDER:-auto}"
MODE="${MODE:-local}"
IMAGE="${IMAGE:-seatunnel-operator:dev}"

need() { command -v "$1" >/dev/null 2>&1; }

if [ "${PROVIDER}" = "auto" ]; then
  if need k3d; then PROVIDER=k3d
  elif need kind; then PROVIDER=kind
  else
    echo "Need k3d or kind on PATH. Install one:"
    echo "  k3d:  curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash"
    echo "  kind: go install sigs.k8s.io/kind@latest   (or download the release binary)"
    exit 1
  fi
fi
need kubectl || { echo "kubectl is required."; exit 1; }
echo ">> provider=${PROVIDER} cluster=${CLUSTER} mode=${MODE}"

echo ">> Creating cluster (if absent)"
case "${PROVIDER}" in
  k3d)
    k3d cluster list 2>/dev/null | grep -q "^${CLUSTER}\b" || k3d cluster create "${CLUSTER}" --wait
    ;;
  kind)
    kind get clusters 2>/dev/null | grep -qx "${CLUSTER}" || kind create cluster --name "${CLUSTER}"
    ;;
  *) echo "Unknown PROVIDER=${PROVIDER}"; exit 1 ;;
esac

echo ">> Installing the SeaTunnelJob CRD"
kubectl apply -f "${HERE}/crd.yaml"

if [ "${MODE}" = "in-cluster" ]; then
  echo ">> Building operator image ${IMAGE}"
  docker build -t "${IMAGE}" "${HERE}"
  echo ">> Importing image into the cluster"
  if [ "${PROVIDER}" = "k3d" ]; then
    k3d image import "${IMAGE}" -c "${CLUSTER}"
  else
    kind load docker-image "${IMAGE}" --name "${CLUSTER}"
  fi
  echo ">> Applying RBAC + Deployment (patched to the local image)"
  kubectl apply -f "${HERE}/rbac.yaml"
  kubectl apply -f "${HERE}/deployment.yaml"
  kubectl -n seatunnel-system set image deployment/seatunnel-operator "operator=${IMAGE}"
  kubectl -n seatunnel-system patch deployment seatunnel-operator \
    --type json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/imagePullPolicy","value":"IfNotPresent"}]'
  kubectl -n seatunnel-system rollout status deployment/seatunnel-operator
  echo ">> Operator running in-cluster. Submit a job:"
  echo "   kubectl apply -f ${HERE}/examples/salesforce-to-console.yaml"
else
  echo ">> CRD installed. Run the operator locally against this cluster with:"
  echo "   python3 ${HERE}/seatunnel_operator.py run"
  echo ">> Then in another shell submit a job:"
  echo "   kubectl apply -f ${HERE}/examples/salesforce-to-console.yaml"
  echo "   kubectl get seatunneljobs"
fi
