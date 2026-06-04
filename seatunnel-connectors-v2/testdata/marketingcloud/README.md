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
