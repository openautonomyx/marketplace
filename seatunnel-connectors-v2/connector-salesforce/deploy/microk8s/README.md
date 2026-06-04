# Deploying the Salesforce connector on microk8s

These manifests run a **SeaTunnel Zeta local batch job** that reads from Salesforce and prints to
the console, on a [microk8s](https://microk8s.io/) cluster.

## Prerequisites

- A running microk8s cluster: `microk8s status --wait-ready`
- The `dns` and `registry` addons enabled is recommended: `microk8s enable dns registry`
- A container image that bundles this connector jar in `${SEATUNNEL_HOME}/connectors/`

## Building an image with the connector

The public `apache/seatunnel` image does **not** ship the Salesforce connector. Build a thin
overlay image after `mvn -pl seatunnel-connectors-v2/connector-salesforce package`:

```dockerfile
FROM apache/seatunnel:2.3.11
COPY connector-salesforce-*.jar ${SEATUNNEL_HOME}/connectors/
```

```bash
docker build -t localhost:32000/seatunnel-salesforce:dev .
docker push localhost:32000/seatunnel-salesforce:dev   # microk8s built-in registry
```

Then point `image:` in `salesforce-job.yaml` at `localhost:32000/seatunnel-salesforce:dev`.

## Deploy

```bash
export SALESFORCE_CLIENT_ID=... SALESFORCE_CLIENT_SECRET=... \
       SALESFORCE_USERNAME=... SALESFORCE_PASSWORD=... SALESFORCE_SECURITY_TOKEN=...
./deploy.sh
```

`deploy.sh` applies the namespace/secret/configmap/job, patches the secret from your environment,
(re)creates the job, waits for completion and tails the logs.

## Teardown

```bash
microk8s kubectl delete namespace seatunnel
```

> Credentials in `salesforce-job.yaml` are placeholders. For anything beyond a local smoke test,
> create the secret out-of-band (`kubectl create secret generic ...`) or use a sealed/ESO secret
> rather than committing values.
