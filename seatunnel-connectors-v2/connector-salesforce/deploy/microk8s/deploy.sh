#!/usr/bin/env bash
# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# Deploy the Salesforce ingest job to a local microk8s cluster.
#
# Usage:
#   export SALESFORCE_CLIENT_ID=... SALESFORCE_CLIENT_SECRET=... \
#          SALESFORCE_USERNAME=... SALESFORCE_PASSWORD=... SALESFORCE_SECURITY_TOKEN=...
#   ./deploy.sh
set -euo pipefail

KUBECTL="${KUBECTL:-microk8s kubectl}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NS=seatunnel

echo ">> Ensuring microk8s is ready"
microk8s status --wait-ready >/dev/null

echo ">> Applying namespace + manifests"
${KUBECTL} apply -f "${HERE}/salesforce-job.yaml"

echo ">> Patching credentials from environment (if provided)"
for key in CLIENT_ID CLIENT_SECRET USERNAME PASSWORD SECURITY_TOKEN; do
  var="SALESFORCE_${key}"
  if [ -n "${!var:-}" ]; then
    ${KUBECTL} -n "${NS}" patch secret salesforce-credentials \
      --type merge \
      -p "{\"stringData\":{\"${var}\":\"${!var}\"}}"
  fi
done

echo ">> Restarting the job to pick up the latest config/secret"
${KUBECTL} -n "${NS}" delete job salesforce-ingest --ignore-not-found
${KUBECTL} apply -f "${HERE}/salesforce-job.yaml"

echo ">> Waiting for completion (timeout 5m)"
${KUBECTL} -n "${NS}" wait --for=condition=complete --timeout=5m job/salesforce-ingest || true

echo ">> Job logs:"
${KUBECTL} -n "${NS}" logs job/salesforce-ingest --tail=200 || true
