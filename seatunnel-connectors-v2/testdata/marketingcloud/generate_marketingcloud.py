#!/usr/bin/env python3
"""Reshape the generic marketing dataset into Salesforce Marketing Cloud (SFMC) test data.

Reads ../datasets/marketing/data/*.csv (run that generator first) and emits:

  data_extensions/Subscribers.csv   -- a sendable Data Extension (subscribers/contacts)
  data_extensions/Campaigns.csv     -- campaign reference DE
  data_views/_Sent.csv              -- SFMC system data-view shapes, split from email_events
  data_views/_Open.csv
  data_views/_Click.csv
  data_views/_Bounce.csv
  data_views/_Unsubscribe.csv
  rest_payloads/subscribers_rows.json  -- REST async DE upsert body {"items":[...]}

These mirror the columns SFMC exposes in Automation Studio SQL (the `_Sent`,
`_Open`, `_Click`, `_Bounce`, `_Unsubscribe` data views) and the contact DE you
push via the REST async Data Extension rows API.

VERIFY field names/endpoints against your SFMC instance — they vary by account.
"""

import csv
import json
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "datasets", "marketing", "data")
DE = os.path.join(HERE, "data_extensions")
DV = os.path.join(HERE, "data_views")
RP = os.path.join(HERE, "rest_payloads")

CLICK_URLS = [
    ("https://example.com/pricing", "pricing-cta"),
    ("https://example.com/demo", "book-demo"),
    ("https://example.com/blog/launch", "blog-launch"),
    ("https://example.com/webinar", "webinar-reg"),
]
BOUNCE_CATS = ["HardBounce", "SoftBounce", "BlockBounce"]


def read_csv(name):
    path = os.path.join(SRC, f"{name}.csv")
    if not os.path.isfile(path):
        raise SystemExit(f"missing {path} -- run ../datasets/generate.py --domain marketing first")
    with open(path, newline="") as fh:
        return list(csv.DictReader(fh))


def write_csv(path, cols, rows):
    with open(path, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)


def main():
    rng = random.Random(42)
    leads = read_csv("leads")
    campaigns = read_csv("campaigns")
    events = read_csv("email_events")

    # --- Subscribers DE (sendable contact data) ---------------------------- #
    subs_cols = ["SubscriberKey", "EmailAddress", "Status", "Country", "Source", "DateCreated"]
    subs = [{
        "SubscriberKey": f"L{r['id']}",
        "EmailAddress": r["email"],
        "Status": "Active" if r["status"] != "DISQUALIFIED" else "Unsubscribed",
        "Country": r["country"],
        "Source": r["source"],
        "DateCreated": r["created_at"],
    } for r in leads]
    write_csv(os.path.join(DE, "Subscribers.csv"), subs_cols, subs)

    camp_cols = ["CampaignId", "Name", "Channel", "StartDate", "EndDate", "Budget"]
    write_csv(os.path.join(DE, "Campaigns.csv"), camp_cols, [{
        "CampaignId": c["id"], "Name": c["name"], "Channel": c["channel"],
        "StartDate": c["start_date"], "EndDate": c["end_date"], "Budget": c["budget"],
    } for c in campaigns])

    # --- tracking data views (split email_events by type) ------------------ #
    views = {k: [] for k in ("_Sent", "_Open", "_Click", "_Bounce", "_Unsubscribe")}
    for e in events:
        base = {"SendID": e["campaign_id"], "SubscriberKey": f"L{e['lead_id']}", "EventDate": e["ts"]}
        et = e["event_type"]
        if et == "SENT":
            views["_Sent"].append(base)
        elif et == "OPEN":
            views["_Open"].append({**base, "IsUnique": 1})
        elif et == "CLICK":
            url, link = rng.choice(CLICK_URLS)
            views["_Click"].append({**base, "URL": url, "LinkName": link, "IsUnique": 1})
        elif et == "BOUNCE":
            views["_Bounce"].append({**base, "BounceCategory": rng.choice(BOUNCE_CATS),
                                     "SMTPBounceReason": "550 mailbox unavailable"})
        elif et == "UNSUBSCRIBE":
            views["_Unsubscribe"].append(base)

    view_cols = {
        "_Sent": ["SendID", "SubscriberKey", "EventDate"],
        "_Open": ["SendID", "SubscriberKey", "EventDate", "IsUnique"],
        "_Click": ["SendID", "SubscriberKey", "EventDate", "URL", "LinkName", "IsUnique"],
        "_Bounce": ["SendID", "SubscriberKey", "EventDate", "BounceCategory", "SMTPBounceReason"],
        "_Unsubscribe": ["SendID", "SubscriberKey", "EventDate"],
    }
    for name, rows in views.items():
        write_csv(os.path.join(DV, f"{name}.csv"), view_cols[name], rows)

    # --- REST async DE upsert payload (subscribers) ------------------------ #
    payload = {"items": [{k: r[k] for k in subs_cols} for r in subs]}
    with open(os.path.join(RP, "subscribers_rows.json"), "w") as fh:
        json.dump(payload, fh, indent=2)
        fh.write("\n")

    print(f"Subscribers={len(subs)} Campaigns={len(campaigns)}")
    for name, rows in views.items():
        print(f"{name:14} {len(rows)}")
    print(f"rest_payloads/subscribers_rows.json ({len(subs)} items)")


if __name__ == "__main__":
    main()
