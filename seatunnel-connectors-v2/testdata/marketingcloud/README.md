# Salesforce Marketing Cloud (SFMC) test data

The [generic marketing dataset](../datasets/marketing) reshaped into **Marketing
Cloud** shapes: a sendable **Data Extension** of subscribers + the **tracking
data views** (`_Sent`, `_Open`, `_Click`, `_Bounce`, `_Unsubscribe`) you'd query
in Automation Studio, plus a REST upsert payload.

> ⚠️ SFMC ≠ Data Cloud. This targets the **Marketing Cloud Engagement** REST/SOAP
> APIs. Field names/types and endpoints vary by account — **verify against yours**.
> (The dev-center page blocks automated fetching, so this is from known shapes.)

## Files

```
marketingcloud/
├── de-schema.json                     # Subscribers Data Extension field definitions
├── data_extensions/
│   ├── Subscribers.csv                # sendable contact DE (SubscriberKey, EmailAddress, ...)
│   ├── Campaigns.csv                  # campaign reference DE
│   ├── Lists.csv                      # subscriber lists
│   ├── Journeys.csv                   # Journey Builder journeys
│   └── JourneyActivities.csv          # activities per journey (EMAIL/WAIT/DECISION)
├── data_views/                        # mirror SFMC system data views (Automation Studio SQL)
│   ├── _Sent.csv  _Open.csv  _Click.csv  _Bounce.csv  _Unsubscribe.csv
│   ├── _Job.csv                       # send aggregates (NumberSent/Delivered/Opened/...)
│   ├── _Complaint.csv                 # spam complaints
│   ├── _ListSubscribers.csv           # list membership
│   └── _Journey.csv                   # journey entries (VersionID, ContactKey, EntryDate)
└── rest_payloads/
    └── subscribers_rows.json          # REST async DE upsert body {"items":[...]}
```

### Objects / models

| Object | Kind | Maps from |
| ------ | ---- | --------- |
| `Subscribers` | sendable DE | leads |
| `Campaigns` | DE | campaigns |
| `Lists` + `_ListSubscribers` | DE + data view | derived list membership |
| `Journeys` + `JourneyActivities` + `_Journey` | Journey Builder | derived journeys/entries |
| `_Job` | send data view | email_events aggregated per send |
| `_Sent/_Open/_Click/_Bounce/_Unsubscribe/_Complaint` | tracking data views | email_events split by type |

Regenerate (after `../datasets/generate.py --domain marketing`):
```bash
python3 generate_marketingcloud.py
```

## Publish via API

`publish.py` (stdlib only) authenticates with OAuth v2 and upserts the
subscribers into a Data Extension via the async DE rows API:

```bash
export SFMC_SUBDOMAIN=...  SFMC_CLIENT_ID=...  SFMC_CLIENT_SECRET=...  SFMC_ACCOUNT_ID=...
python3 publish.py --poll
```
The target DE must already exist (create it from `de-schema.json`).

### Try it without credentials (local mock)

`mock_sfmc.py` is a tiny local stand-in for the SFMC REST API — run the whole
publish flow with **no API key**:

```bash
python3 mock_sfmc.py --port 8787 &                       # local fake SFMC
SFMC_AUTH_URL="http://127.0.0.1:8787/v2/token" python3 publish.py --poll
# -> upserts 200 rows; received/Subscribers.json shows exactly what landed
```
This exercises token → async DE upsert → status end to end (verified: 200/200).

## 1. Authenticate (OAuth 2.0 v2, server-to-server)

```bash
curl -s https://MY_SUBDOMAIN.auth.marketingcloudapis.com/v2/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"client_credentials","client_id":"...","client_secret":"...","account_id":"<MID>"}'
# -> { "access_token": "...", "rest_instance_url": "https://MY_SUBDOMAIN.rest.marketingcloudapis.com/",
#      "soap_instance_url": "https://MY_SUBDOMAIN.soap.marketingcloudapis.com/", ... }
```

## 2. Push subscribers into a Data Extension (REST async upsert)

```bash
REST=https://MY_SUBDOMAIN.rest.marketingcloudapis.com
curl -X POST "$REST/data/v1/async/dataextensions/key:Subscribers/rows" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  --data @rest_payloads/subscribers_rows.json
# (create the DE first from de-schema.json via the UI or SOAP DataExtension.)
```

## 3. Read engagement events (tracking)

In SFMC these live in the **system data views**, queried via Automation Studio SQL
(or retrieved via SOAP `SentEvent`/`OpenEvent`/`ClickEvent`/`BounceEvent`/`UnsubEvent`).
The CSVs in `data_views/` mirror those columns, e.g.:

```sql
SELECT s.SubscriberKey, c.Name AS campaign, o.EventDate
FROM   _Open o
JOIN   _Sent s ON s.SubscriberKey = o.SubscriberKey AND s.SendID = o.SendID
JOIN   Campaigns c ON c.CampaignId = o.SendID
```

| Data view | Rows here | Key columns |
| --------- | --------- | ----------- |
| `_Sent` | sends | SendID, SubscriberKey, EventDate |
| `_Open` | opens | + IsUnique |
| `_Click` | clicks | + URL, LinkName, IsUnique |
| `_Bounce` | bounces | + BounceCategory, SMTPBounceReason |
| `_Unsubscribe` | opt-outs | SendID, SubscriberKey, EventDate |

`SendID` here maps to the source `campaign_id`; `SubscriberKey` is `L<lead id>`.
