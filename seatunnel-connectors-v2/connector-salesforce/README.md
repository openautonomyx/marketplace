# connector-salesforce

A SeaTunnel V2 **Salesforce** source and sink connector, following the structure described in the
[SeaTunnel connector-v2 development guide](https://github.com/apache/seatunnel/blob/dev/seatunnel-connectors-v2/README.md).

| What | Where |
| ---- | ----- |
| Connector docs & options | [`docs/salesforce.md`](docs/salesforce.md) |
| Example pipelines | [`src/main/resources/examples`](src/main/resources/examples) |
| Generated test data + generator | [`testdata`](testdata) |
| microk8s deployment | [`deploy/microk8s`](deploy/microk8s) |

## Layout

```
connector-salesforce/
├── pom.xml
├── src/main/java/org/apache/seatunnel/connectors/seatunnel/salesforce/
│   ├── client/      # SalesforceClient (OAuth + REST), SalesforceQueryResult
│   ├── config/      # Option definitions + (de)serializable config views
│   ├── exception/   # SeaTunnel-style error codes + exception
│   ├── util/        # SalesforceRowConverter (JSON <-> SeaTunnelRow)
│   ├── source/      # Source, Factory, SplitEnumerator, Reader, Split, State
│   └── sink/        # Sink, Factory, Writer
├── src/main/resources/
│   ├── examples/                         # ready-to-edit pipeline configs
│   └── plugin-mapping.properties.snippet # lines to register the plugin
├── src/test/...      # unit test for the row converter + a fixture
├── testdata/         # deterministic Salesforce-shaped fixtures + Python generator
└── deploy/microk8s/  # Namespace/Secret/ConfigMap/Job + deploy.sh
```

## Generating test data

```bash
python3 testdata/generate_test_data.py --accounts 50 --contacts 100 --out testdata
```

Produces `accounts_query_response.json` / `contacts_query_response.json` (shaped exactly like a
Salesforce REST `query` response) plus matching CSVs. Deterministic via `--seed`.

## Notes / scope

- This module is a **drop-in** for an `apache/seatunnel` checkout; it depends on `seatunnel-api`
  and `connector-common` which live there. It does not build standalone in this repository (there
  is no SeaTunnel parent POM here). See [`docs/salesforce.md`](docs/salesforce.md#installing-into-a-seatunnel-checkout)
  for the three registration steps.
- Auth uses the OAuth 2.0 username-password flow. Source = paginated SOQL; sink = composite
  sObject collection insert (≤200/request).
