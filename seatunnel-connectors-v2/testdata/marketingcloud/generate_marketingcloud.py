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

    # --- Sends / _Job (one aggregate row per campaign send) ---------------- #
    from collections import defaultdict
    by_send = defaultdict(lambda: defaultdict(int))
    sent_dates = defaultdict(list)
    for e in events:
        by_send[e["campaign_id"]][e["event_type"]] += 1
        if e["event_type"] == "SENT":
            sent_dates[e["campaign_id"]].append(e["ts"])
    camp_by_id = {c["id"]: c for c in campaigns}
    subjects = ["Don't miss out", "Your weekly update", "A special offer inside",
                "We saved your seat", "New features just dropped"]
    jobs = []
    for cid in sorted(by_send, key=int):
        ct = by_send[cid]
        sent_n = ct["SENT"]
        jobs.append({
            "SendID": cid, "EmailName": camp_by_id.get(cid, {}).get("name", f"Send {cid}"),
            "SubjectLine": rng.choice(subjects),
            "SendDate": min(sent_dates[cid]) if sent_dates[cid] else "",
            "NumberSent": sent_n, "NumberDelivered": sent_n - ct["BOUNCE"], "NumberBounced": ct["BOUNCE"],
            "NumberOpened": ct["OPEN"], "NumberClicked": ct["CLICK"], "NumberUnsubscribed": ct["UNSUBSCRIBE"],
        })
    write_csv(os.path.join(DV, "_Job.csv"),
              ["SendID", "EmailName", "SubjectLine", "SendDate", "NumberSent", "NumberDelivered",
               "NumberBounced", "NumberOpened", "NumberClicked", "NumberUnsubscribed"], jobs)

    # --- _Complaint (spam complaints: a small fraction of opens) ----------- #
    complaints = [{"SendID": o["SendID"], "SubscriberKey": o["SubscriberKey"], "EventDate": o["EventDate"]}
                  for o in views["_Open"] if rng.random() < 0.02]
    write_csv(os.path.join(DV, "_Complaint.csv"), ["SendID", "SubscriberKey", "EventDate"], complaints)

    # --- Lists + _ListSubscribers ------------------------------------------ #
    lists = [{"ListID": 1, "ListName": "All Subscribers", "Type": "Public"},
             {"ListID": 2, "ListName": "Newsletter", "Type": "Public"},
             {"ListID": 3, "ListName": "Product Updates", "Type": "Public"}]
    write_csv(os.path.join(DE, "Lists.csv"), ["ListID", "ListName", "Type"], lists)
    list_subs = []
    for s in subs:
        memberships = [1] + [l["ListID"] for l in lists[1:] if rng.random() > 0.5]
        for lid in memberships:
            list_subs.append({"ListID": lid, "SubscriberKey": s["SubscriberKey"],
                              "Status": s["Status"], "DateJoined": s["DateCreated"]})
    write_csv(os.path.join(DV, "_ListSubscribers.csv"),
              ["ListID", "SubscriberKey", "Status", "DateJoined"], list_subs)

    # --- Journey Builder: Journeys, JourneyActivities, _Journey entries ----- #
    jnames = ["Welcome Series", "Abandoned Cart", "Re-engagement", "Onboarding"]
    act_seq = ["EMAIL", "WAIT", "DECISION", "EMAIL"]
    journeys, activities, entries = [], [], []
    act_id = 0
    for jid, jn in enumerate(jnames, start=1):
        journeys.append({"JourneyId": jid, "Name": jn, "Status": rng.choice(["Published", "Draft", "Stopped"]),
                         "Version": 1, "CreatedDate": rng.choice(subs)["DateCreated"]})
        for order, atype in enumerate(act_seq, start=1):
            act_id += 1
            activities.append({"ActivityId": act_id, "JourneyId": jid, "Sequence": order,
                               "ActivityType": atype, "Name": f"{atype.title()} {order}"})
        for s in rng.sample(subs, k=min(rng.randint(20, 60), len(subs))):
            entries.append({"VersionID": jid, "ContactKey": s["SubscriberKey"],
                            "JourneyName": jn, "EntryDate": s["DateCreated"]})
    write_csv(os.path.join(DE, "Journeys.csv"), ["JourneyId", "Name", "Status", "Version", "CreatedDate"], journeys)
    write_csv(os.path.join(DE, "JourneyActivities.csv"),
              ["ActivityId", "JourneyId", "Sequence", "ActivityType", "Name"], activities)
    write_csv(os.path.join(DV, "_Journey.csv"), ["VersionID", "ContactKey", "JourneyName", "EntryDate"], entries)

    print(f"Subscribers={len(subs)} Campaigns={len(campaigns)} Sends={len(jobs)} "
          f"Lists={len(lists)} ListSubscribers={len(list_subs)} Journeys={len(journeys)} "
          f"JourneyActivities={len(activities)} JourneyEntries={len(entries)} Complaints={len(complaints)}")
    for name, rows in views.items():
        print(f"{name:14} {len(rows)}")
    print(f"rest_payloads/subscribers_rows.json ({len(subs)} items)")


if __name__ == "__main__":
    main()
