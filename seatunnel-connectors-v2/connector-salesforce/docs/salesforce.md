# Salesforce Connector

> Source and sink connector for [Salesforce](https://developer.salesforce.com/docs) built on
> the Salesforce REST API.

## Support

| Source | Sink |
| ------ | ---- |
| ✅      | ✅    |

- **Source** runs a SOQL query and emits one row per record (paginated via `nextRecordsUrl`).
- **Sink** writes rows to a single sObject using the composite sObjects collection API
  (up to 200 records per request).

## Authentication

The connector uses the OAuth 2.0 **username-password** flow against
`${url}/services/oauth2/token`. You need a Salesforce *connected app* (consumer key +
secret), a username, a password and, for requests from untrusted networks, a security token.

## Source Options

| Name              | Type   | Required | Default                       | Description                                  |
| ----------------- | ------ | -------- | ----------------------------- | -------------------------------------------- |
| url               | string | no       | `https://login.salesforce.com`| OAuth login endpoint (use `test.` for sandbox). |
| client_id         | string | yes      | -                             | Connected app consumer key.                  |
| client_secret     | string | yes      | -                             | Connected app consumer secret.               |
| username          | string | yes      | -                             | Salesforce username.                         |
| password          | string | yes      | -                             | Salesforce password.                         |
| security_token    | string | no       | `""`                          | Appended to the password.                    |
| version           | string | no       | `59.0`                        | REST API version.                            |
| query             | string | yes      | -                             | SOQL statement; selected fields must match `schema`. |
| query_batch_size  | int    | no       | `2000`                        | Records per page (`Sforce-Query-Options` header). |
| schema            | config | yes      | -                             | Standard SeaTunnel schema describing the output row. |

## Sink Options

| Name           | Type    | Required | Default                        | Description                                   |
| -------------- | ------- | -------- | ------------------------------ | --------------------------------------------- |
| url            | string  | no       | `https://login.salesforce.com` | OAuth login endpoint.                         |
| client_id      | string  | yes      | -                              | Connected app consumer key.                   |
| client_secret  | string  | yes      | -                              | Connected app consumer secret.                |
| username       | string  | yes      | -                              | Salesforce username.                          |
| password       | string  | yes      | -                              | Salesforce password.                          |
| security_token | string  | no       | `""`                           | Appended to the password.                     |
| version        | string  | no       | `59.0`                         | REST API version.                             |
| object         | string  | yes      | -                              | Target sObject (e.g. `Account`).              |
| max_batch_size | int     | no       | `200`                          | Records per composite request (max 200).      |
| all_or_none    | boolean | no       | `false`                        | Roll back the whole batch if any record fails.|

The `Id` field is dropped automatically when writing, since Salesforce assigns it on insert.

## Type Mapping

| Salesforce (JSON) | SeaTunnel type            |
| ----------------- | ------------------------- |
| text / picklist   | STRING                    |
| checkbox          | BOOLEAN                   |
| number / int      | INT / BIGINT              |
| number / decimal  | FLOAT / DOUBLE / DECIMAL  |
| date              | DATE                      |
| datetime          | TIMESTAMP                 |

## Example: Salesforce → Console

```hocon
source {
  Salesforce {
    client_id = "xxx"
    client_secret = "xxx"
    username = "user@example.com"
    password = "secret"
    security_token = "token"
    query = "SELECT Id, Name, AnnualRevenue FROM Account"
    schema = {
      fields {
        Id = string
        Name = string
        AnnualRevenue = double
      }
    }
  }
}
sink { Console {} }
```

See [`../src/main/resources/examples`](../src/main/resources/examples) for full pipelines and
[`../testdata`](../testdata) for generated fixtures.

## Installing into a SeaTunnel checkout

This module is self-contained but must be registered like any other connector-v2:

1. Add `<module>connector-salesforce</module>` to `seatunnel-connectors-v2/pom.xml`.
2. Add the `connector-salesforce` dependency to `seatunnel-dist/pom.xml`.
3. Append the lines in [`../src/main/resources/plugin-mapping.properties.snippet`](../src/main/resources/plugin-mapping.properties.snippet)
   to the repo-root `plugin-mapping.properties`.
