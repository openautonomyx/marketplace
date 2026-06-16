# Salesforce Data Cloud test data

The [e-commerce dataset](../ecommerce) reshaped into **Data Cloud Ingestion API**
test data: an OpenAPI ingestion schema, ready-to-POST streaming payloads, and
bulk CSVs — mapped to the standard Customer 360 Data Model Objects (DMOs).

> ⚠️ **Verify the API details.** Data Cloud's endpoints/limits change; the paths
> below reflect the Connect/Ingestion APIs as of early 2026. Cross-check against
> the Postman collections (Salesforce Data Cloud Connect APIs / Platform APIs) —
> those pages block automated fetching, so they couldn't be auto-validated here.

## Object → standard DMO mapping

| Ingestion object | Standard DMO | Key fields |
| ---------------- | ------------ | ---------- |
| `Customer` | **Individual** (+ Contact Point Email) | `id`→Individual Id, `email`→Contact Point Email, `fullName`, `country` |
| `Product` | **Product** | `id`→Product Id, `sku`, `name`, `category`, `price`, `inStock` |
| `SalesOrder` | **Sales Order** | `id`→Order Id, `customerId`→Individual Id, `status`, `orderDate`, `totalAmount` |
| `SalesOrderItem` | **Sales Order Product** | `id`, `orderId`→Sales Order, `productId`→Product, `quantity`, `unitPrice` |

`Customer`/`Product` are profile-style (upsert by id); `SalesOrder`/`SalesOrderItem`
are engagement-style with an event time (`orderDate`).

## Files

```
datacloud/
├── ingestion-schema.yaml      # OpenAPI 3.0.1 — upload when creating the Ingestion API connector
├── generate_datacloud.py      # builds the payloads/CSVs from ../ecommerce/data
├── payloads/<Object>.json     # streaming Ingestion API bodies {"data":[...]}, chunked <=200
└── bulk/<Object>.csv          # Bulk Ingestion API CSVs
```

Regenerate (after running `../ecommerce/generate.py`):
```bash
python3 generate_datacloud.py --chunk 200
```

## 1. Authenticate (OAuth JWT → Data Cloud token exchange)

```bash
# (a) get a core Salesforce access token — JWT bearer flow with your connected app
CORE_TOKEN=...   # from https://login.salesforce.com/services/oauth2/token

# (b) exchange it for a Data Cloud token + tenant-specific instance URL
curl -s https://MYDOMAIN.my.salesforce.com/services/a360/token \
  -d grant_type=urn:salesforce:grant-type:external:cdp \
  -d subject_token="$CORE_TOKEN" \
  -d subject_token_type=urn:ietf:params:oauth:token-type:access_token
# -> { "access_token": "<DC_TOKEN>", "instance_url": "https://<tenant>.c360a.salesforce.com", ... }
```

## 2. Stream records (near real-time)

```bash
# POST a payloads/<Object>.json body to the source object on your ingestion connector
curl -X POST "https://<tenant>.c360a.salesforce.com/api/v1/ingest/sources/<ConnectorApiName>/Product" \
  -H "Authorization: Bearer $DC_TOKEN" \
  -H "Content-Type: application/json" \
  --data @payloads/Product.json
```
For objects whose JSON is an array of bodies (e.g. `SalesOrderItem.json`), POST
each element's `{"data":[...]}` separately.

## 3. Bulk load (large volumes)

```bash
DC=https://<tenant>.c360a.salesforce.com
# create job
JOB=$(curl -s -X POST "$DC/api/v1/ingest/jobs" -H "Authorization: Bearer $DC_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"object":"Customer","sourceName":"<ConnectorApiName>","operation":"upsert"}' | jq -r .id)
# upload the CSV
curl -X PUT "$DC/api/v1/ingest/jobs/$JOB/batches" -H "Authorization: Bearer $DC_TOKEN" \
  -H "Content-Type: text/csv" --data-binary @bulk/Customer.csv
# close + let it process
curl -X PATCH "$DC/api/v1/ingest/jobs/$JOB" -H "Authorization: Bearer $DC_TOKEN" \
  -H "Content-Type: application/json" -d '{"state":"UploadComplete"}'
```

## 4. Read it back (Query API v2, SQL)

```bash
curl -X POST "https://<tenant>.c360a.salesforce.com/api/v2/query" \
  -H "Authorization: Bearer $DC_TOKEN" -H "Content-Type: application/json" \
  -d '{"sql":"SELECT id__c, totalAmount__c FROM SalesOrder__dlm LIMIT 10"}'
```
(DLO/DMO API names get the `__dlm`/`__dll` suffixes Data Cloud assigns on mapping.)
