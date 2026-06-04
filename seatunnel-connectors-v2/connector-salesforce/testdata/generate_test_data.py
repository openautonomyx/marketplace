#!/usr/bin/env python3
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
"""Generate Salesforce-shaped test fixtures for the connector.

Produces JSON files that mirror the shape of a Salesforce REST `query` response
(the `records` envelope, with the per-record `attributes` metadata) so they can
be served by a mock endpoint in tests or e2e runs, plus a flat CSV for quick
inspection. Deterministic by default (fixed seed) so fixtures are reproducible.
"""

import argparse
import csv
import json
import random
from datetime import datetime, timedelta

INDUSTRIES = ["Technology", "Finance", "Healthcare", "Retail", "Energy", "Manufacturing"]
FIRST_NAMES = ["Avery", "Jordan", "Riley", "Morgan", "Casey", "Quinn", "Harper", "Rowan"]
LAST_NAMES = ["Nguyen", "Patel", "Garcia", "Smith", "Khan", "Okafor", "Rossi", "Larsson"]


def sfid(prefix: str, n: int) -> str:
    return f"{prefix}{n:015d}"


def iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000+0000")


def gen_accounts(count: int, rng: random.Random):
    base = datetime(2020, 1, 1)
    rows = []
    for i in range(count):
        created = base + timedelta(days=rng.randint(0, 2000), minutes=rng.randint(0, 1440))
        rows.append(
            {
                "Id": sfid("001", i + 1),
                "Name": f"{rng.choice(INDUSTRIES)} Corp {i + 1}",
                "Industry": rng.choice(INDUSTRIES),
                "AnnualRevenue": round(rng.uniform(1e5, 5e8), 2),
                "NumberOfEmployees": rng.randint(5, 25000),
                "IsActive": rng.random() > 0.15,
                "CreatedDate": iso(created),
            }
        )
    return rows


def gen_contacts(count: int, rng: random.Random):
    rows = []
    for i in range(count):
        first = rng.choice(FIRST_NAMES)
        last = rng.choice(LAST_NAMES)
        rows.append(
            {
                "Id": sfid("003", i + 1),
                "AccountId": sfid("001", rng.randint(1, max(1, count))),
                "FirstName": first,
                "LastName": last,
                "Email": f"{first}.{last}{i}@example.com".lower(),
                "Phone": f"+1-202-555-{rng.randint(1000, 9999)}",
            }
        )
    return rows


def write_query_response(path: str, sobject: str, rows: list):
    payload = {
        "totalSize": len(rows),
        "done": True,
        "records": [{"attributes": {"type": sobject, "url": f"/services/data/v59.0/sobjects/{sobject}/{r['Id']}"}, **r} for r in rows],
    }
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2)
    print(f"wrote {len(rows):>5} {sobject} records -> {path}")


def write_csv(path: str, rows: list):
    if not rows:
        return
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    print(f"wrote {len(rows):>5} rows                 -> {path}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--accounts", type=int, default=50)
    parser.add_argument("--contacts", type=int, default=100)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--out", default=".")
    args = parser.parse_args()

    rng = random.Random(args.seed)
    accounts = gen_accounts(args.accounts, rng)
    contacts = gen_contacts(args.contacts, rng)

    write_query_response(f"{args.out}/accounts_query_response.json", "Account", accounts)
    write_query_response(f"{args.out}/contacts_query_response.json", "Contact", contacts)
    write_csv(f"{args.out}/accounts.csv", accounts)
    write_csv(f"{args.out}/contacts.csv", contacts)


if __name__ == "__main__":
    main()
