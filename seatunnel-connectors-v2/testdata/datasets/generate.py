#!/usr/bin/env python3
"""Multi-domain relational test-data generator.

Builds complete, referentially-consistent datasets for several domains, each
emitted to datasets/<domain>/ as:
  schema.sql        -- PostgreSQL DDL (PKs/FKs/indexes)
  data/*.csv        -- one CSV per table
  data/seed.sql     -- INSERTs matching schema.sql

Domains: ecommerce, healthcare, banking, iot, saas.
Deterministic per (domain, seed). Scale every table with --scale (xN).

  python3 generate.py                 # all domains, base size
  python3 generate.py --scale 10      # ~10x rows
  python3 generate.py --domain banking iot
"""

import argparse
import csv
import os
import random
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
EPOCH = datetime(2023, 1, 1, tzinfo=timezone.utc)

FIRST = ["Avery", "Jordan", "Riley", "Morgan", "Casey", "Quinn", "Harper", "Rowan", "Sasha", "Devin", "Noa", "Kai"]
LAST = ["Nguyen", "Patel", "Garcia", "Smith", "Khan", "Okafor", "Rossi", "Larsson", "Mori", "Haddad", "Silva", "Cohen"]
COUNTRIES = ["US", "GB", "IN", "BR", "DE", "NG", "JP", "SE"]
CITIES = ["Austin", "London", "Mumbai", "São Paulo", "Berlin", "Lagos", "Tokyo", "Malmö"]

DOMAINS = {}        # name -> builder(rng, scale) -> dict[table] = list[row]
SCHEMAS = {}        # name -> DDL string


def domain(ddl):
    def deco(fn):
        DOMAINS[fn.__name__] = fn
        SCHEMAS[fn.__name__] = ddl
        return fn
    return deco


def name(rng):
    return f"{rng.choice(FIRST)} {rng.choice(LAST)}"


def iso(dt):
    return dt.strftime("%Y-%m-%d %H:%M:%S%z")


def ts(rng, days=400):
    return EPOCH + timedelta(days=rng.randint(0, days), minutes=rng.randint(0, 1440))


# --------------------------------------------------------------------------- #
# ecommerce
# --------------------------------------------------------------------------- #
@domain("""CREATE TABLE customers (
    id BIGINT PRIMARY KEY, name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE, country CHAR(2) NOT NULL, created_at TIMESTAMPTZ NOT NULL);
CREATE TABLE products (
    id BIGINT PRIMARY KEY, sku VARCHAR(32) NOT NULL UNIQUE, name VARCHAR(160) NOT NULL,
    category VARCHAR(40) NOT NULL, price NUMERIC(10,2) NOT NULL, in_stock BOOLEAN NOT NULL);
CREATE TABLE orders (
    id BIGINT PRIMARY KEY, customer_id BIGINT NOT NULL REFERENCES customers(id),
    status VARCHAR(16) NOT NULL, order_date TIMESTAMPTZ NOT NULL, total NUMERIC(12,2) NOT NULL);
CREATE TABLE order_items (
    id BIGINT PRIMARY KEY, order_id BIGINT NOT NULL REFERENCES orders(id),
    product_id BIGINT NOT NULL REFERENCES products(id), quantity INTEGER NOT NULL, unit_price NUMERIC(10,2) NOT NULL);
""")
def ecommerce(rng, scale):
    cats = ["Electronics", "Books", "Home", "Toys", "Apparel", "Grocery"]
    adj, noun = ["Compact", "Deluxe", "Eco", "Pro", "Mini", "Ultra"], ["Widget", "Gadget", "Lamp", "Mug", "Charger", "Bottle"]
    customers = [{"id": i, "name": name(rng), "email": f"user{i}@example.com",
                  "country": rng.choice(COUNTRIES), "created_at": iso(ts(rng))} for i in range(1, 50 * scale + 1)]
    products = [{"id": i, "sku": f"SKU-{i:05d}", "name": f"{rng.choice(adj)} {rng.choice(noun)}",
                 "category": rng.choice(cats), "price": round(rng.uniform(4.99, 499.99), 2),
                 "in_stock": rng.random() > 0.15} for i in range(1, 30 * scale + 1)]
    orders, items, iid = [], [], 0
    for oid in range(1, 200 * scale + 1):
        c = rng.choice(customers)
        total = 0.0
        for p in rng.sample(products, k=min(rng.randint(1, 5), len(products))):
            iid += 1
            qty, up = rng.randint(1, 4), float(p["price"])
            total += qty * up
            items.append({"id": iid, "order_id": oid, "product_id": p["id"], "quantity": qty, "unit_price": round(up, 2)})
        orders.append({"id": oid, "customer_id": c["id"], "status": rng.choice(["PENDING", "PAID", "SHIPPED", "CANCELLED"]),
                       "order_date": iso(ts(rng)), "total": round(total, 2)})
    return {"customers": customers, "products": products, "orders": orders, "order_items": items}


# --------------------------------------------------------------------------- #
# healthcare
# --------------------------------------------------------------------------- #
@domain("""CREATE TABLE patients (
    id BIGINT PRIMARY KEY, name VARCHAR(120) NOT NULL, birth_date DATE NOT NULL,
    gender CHAR(1) NOT NULL, country CHAR(2) NOT NULL);
CREATE TABLE providers (
    id BIGINT PRIMARY KEY, name VARCHAR(120) NOT NULL, specialty VARCHAR(40) NOT NULL);
CREATE TABLE encounters (
    id BIGINT PRIMARY KEY, patient_id BIGINT NOT NULL REFERENCES patients(id),
    provider_id BIGINT NOT NULL REFERENCES providers(id), encounter_date TIMESTAMPTZ NOT NULL,
    type VARCHAR(20) NOT NULL, status VARCHAR(16) NOT NULL);
CREATE TABLE prescriptions (
    id BIGINT PRIMARY KEY, encounter_id BIGINT NOT NULL REFERENCES encounters(id),
    drug VARCHAR(80) NOT NULL, dosage VARCHAR(40) NOT NULL, days_supply INTEGER NOT NULL);
""")
def healthcare(rng, scale):
    specs = ["Cardiology", "Pediatrics", "Oncology", "Dermatology", "Neurology", "General"]
    drugs = ["Amoxicillin", "Lisinopril", "Metformin", "Atorvastatin", "Ibuprofen", "Omeprazole"]
    patients = [{"id": i, "name": name(rng),
                 "birth_date": (datetime(1950, 1, 1) + timedelta(days=rng.randint(0, 25000))).strftime("%Y-%m-%d"),
                 "gender": rng.choice(["M", "F", "U"]), "country": rng.choice(COUNTRIES)} for i in range(1, 80 * scale + 1)]
    providers = [{"id": i, "name": name(rng), "specialty": rng.choice(specs)} for i in range(1, 15 * scale + 1)]
    encounters, scripts, sid = [], [], 0
    for eid in range(1, 300 * scale + 1):
        encounters.append({"id": eid, "patient_id": rng.choice(patients)["id"], "provider_id": rng.choice(providers)["id"],
                           "encounter_date": iso(ts(rng)), "type": rng.choice(["OFFICE", "TELEHEALTH", "ER", "INPATIENT"]),
                           "status": rng.choice(["SCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED"])})
        for _ in range(rng.randint(0, 3)):
            sid += 1
            scripts.append({"id": sid, "encounter_id": eid, "drug": rng.choice(drugs),
                            "dosage": f"{rng.choice([10,20,50,100,250,500])}mg", "days_supply": rng.choice([7, 14, 30, 90])})
    return {"patients": patients, "providers": providers, "encounters": encounters, "prescriptions": scripts}


# --------------------------------------------------------------------------- #
# banking
# --------------------------------------------------------------------------- #
@domain("""CREATE TABLE branches (
    id BIGINT PRIMARY KEY, name VARCHAR(80) NOT NULL, city VARCHAR(60) NOT NULL, country CHAR(2) NOT NULL);
CREATE TABLE customers (
    id BIGINT PRIMARY KEY, name VARCHAR(120) NOT NULL, email VARCHAR(160) NOT NULL UNIQUE,
    branch_id BIGINT NOT NULL REFERENCES branches(id), created_at TIMESTAMPTZ NOT NULL);
CREATE TABLE accounts (
    id BIGINT PRIMARY KEY, customer_id BIGINT NOT NULL REFERENCES customers(id),
    type VARCHAR(12) NOT NULL, currency CHAR(3) NOT NULL, balance NUMERIC(14,2) NOT NULL, opened_at TIMESTAMPTZ NOT NULL);
CREATE TABLE transactions (
    id BIGINT PRIMARY KEY, account_id BIGINT NOT NULL REFERENCES accounts(id),
    ts TIMESTAMPTZ NOT NULL, amount NUMERIC(14,2) NOT NULL, kind VARCHAR(10) NOT NULL, description VARCHAR(120));
""")
def banking(rng, scale):
    branches = [{"id": i, "name": f"Branch {i}", "city": rng.choice(CITIES), "country": rng.choice(COUNTRIES)}
                for i in range(1, 8 * scale + 1)]
    customers = [{"id": i, "name": name(rng), "email": f"client{i}@bank.example",
                  "branch_id": rng.choice(branches)["id"], "created_at": iso(ts(rng))} for i in range(1, 60 * scale + 1)]
    accounts, txns, tid = [], [], 0
    for aid in range(1, 100 * scale + 1):
        bal = round(rng.uniform(0, 50000), 2)
        accounts.append({"id": aid, "customer_id": rng.choice(customers)["id"], "type": rng.choice(["CHECKING", "SAVINGS", "CREDIT"]),
                         "currency": rng.choice(["USD", "GBP", "EUR", "INR"]), "balance": bal, "opened_at": iso(ts(rng))})
        for _ in range(rng.randint(1, 8)):
            tid += 1
            kind = rng.choice(["DEBIT", "CREDIT", "FEE", "INTEREST"])
            amt = round(rng.uniform(1, 2000), 2) * (-1 if kind in ("DEBIT", "FEE") else 1)
            txns.append({"id": tid, "account_id": aid, "ts": iso(ts(rng)), "amount": amt,
                         "kind": kind, "description": rng.choice(["POS", "ATM", "Transfer", "Payroll", "Subscription"])})
    return {"branches": branches, "customers": customers, "accounts": accounts, "transactions": txns}


# --------------------------------------------------------------------------- #
# iot
# --------------------------------------------------------------------------- #
@domain("""CREATE TABLE sites (
    id BIGINT PRIMARY KEY, name VARCHAR(80) NOT NULL, city VARCHAR(60) NOT NULL, country CHAR(2) NOT NULL);
CREATE TABLE devices (
    id BIGINT PRIMARY KEY, site_id BIGINT NOT NULL REFERENCES sites(id),
    model VARCHAR(40) NOT NULL, firmware VARCHAR(16) NOT NULL, installed_at TIMESTAMPTZ NOT NULL);
CREATE TABLE sensors (
    id BIGINT PRIMARY KEY, device_id BIGINT NOT NULL REFERENCES devices(id),
    metric VARCHAR(24) NOT NULL, unit VARCHAR(12) NOT NULL);
CREATE TABLE readings (
    id BIGINT PRIMARY KEY, sensor_id BIGINT NOT NULL REFERENCES sensors(id),
    ts TIMESTAMPTZ NOT NULL, value NUMERIC(12,4) NOT NULL);
""")
def iot(rng, scale):
    metrics = [("temperature", "C"), ("humidity", "%"), ("pressure", "hPa"), ("voltage", "V"), ("co2", "ppm")]
    sites = [{"id": i, "name": f"Site {i}", "city": rng.choice(CITIES), "country": rng.choice(COUNTRIES)}
             for i in range(1, 6 * scale + 1)]
    devices = [{"id": i, "site_id": rng.choice(sites)["id"], "model": rng.choice(["DX-100", "DX-200", "EdgeNode", "GatewayV3"]),
                "firmware": f"{rng.randint(1,4)}.{rng.randint(0,9)}.{rng.randint(0,9)}", "installed_at": iso(ts(rng))}
               for i in range(1, 40 * scale + 1)]
    sensors, readings, rid = [], [], 0
    sidc = 0
    for d in devices:
        for _ in range(rng.randint(1, 3)):
            sidc += 1
            m, u = rng.choice(metrics)
            sensors.append({"id": sidc, "device_id": d["id"], "metric": m, "unit": u})
    for s in sensors:
        for _ in range(rng.randint(2, 6)):
            rid += 1
            readings.append({"id": rid, "sensor_id": s["id"], "ts": iso(ts(rng, days=30)), "value": round(rng.uniform(0, 100), 4)})
    return {"sites": sites, "devices": devices, "sensors": sensors, "readings": readings}


# --------------------------------------------------------------------------- #
# saas
# --------------------------------------------------------------------------- #
@domain("""CREATE TABLE accounts (
    id BIGINT PRIMARY KEY, name VARCHAR(120) NOT NULL, plan VARCHAR(16) NOT NULL,
    country CHAR(2) NOT NULL, created_at TIMESTAMPTZ NOT NULL);
CREATE TABLE users (
    id BIGINT PRIMARY KEY, account_id BIGINT NOT NULL REFERENCES accounts(id),
    email VARCHAR(160) NOT NULL UNIQUE, role VARCHAR(16) NOT NULL, active BOOLEAN NOT NULL);
CREATE TABLE subscriptions (
    id BIGINT PRIMARY KEY, account_id BIGINT NOT NULL REFERENCES accounts(id),
    plan VARCHAR(16) NOT NULL, status VARCHAR(12) NOT NULL, started_at TIMESTAMPTZ NOT NULL, mrr NUMERIC(10,2) NOT NULL);
CREATE TABLE invoices (
    id BIGINT PRIMARY KEY, subscription_id BIGINT NOT NULL REFERENCES subscriptions(id),
    issued_at TIMESTAMPTZ NOT NULL, amount NUMERIC(10,2) NOT NULL, paid BOOLEAN NOT NULL);
""")
def saas(rng, scale):
    plans = {"FREE": 0, "STARTER": 49, "PRO": 199, "ENTERPRISE": 999}
    accounts = [{"id": i, "name": f"{rng.choice(LAST)} {rng.choice(['Inc','LLC','Labs','Group'])}",
                 "plan": rng.choice(list(plans)), "country": rng.choice(COUNTRIES), "created_at": iso(ts(rng))}
                for i in range(1, 40 * scale + 1)]
    users, subs, invoices, uid, iid = [], [], [], 0, 0
    for a in accounts:
        for _ in range(rng.randint(1, 6)):
            uid += 1
            users.append({"id": uid, "account_id": a["id"], "email": f"u{uid}@{a['id']}.example",
                          "role": rng.choice(["ADMIN", "MEMBER", "VIEWER"]), "active": rng.random() > 0.2})
        mrr = float(plans[a["plan"]])
        sid = a["id"]
        subs.append({"id": sid, "account_id": a["id"], "plan": a["plan"],
                     "status": rng.choice(["ACTIVE", "TRIAL", "PAST_DUE", "CANCELLED"]), "started_at": iso(ts(rng)), "mrr": round(mrr, 2)})
        for _ in range(rng.randint(1, 6)):
            iid += 1
            invoices.append({"id": iid, "subscription_id": sid, "issued_at": iso(ts(rng)),
                             "amount": round(mrr, 2), "paid": rng.random() > 0.25})
    return {"accounts": accounts, "users": users, "subscriptions": subs, "invoices": invoices}


# --------------------------------------------------------------------------- #
# writers
# --------------------------------------------------------------------------- #
def sql_value(v):
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def write_domain(dname, tables):
    base = os.path.join(HERE, dname)
    data = os.path.join(base, "data")
    os.makedirs(data, exist_ok=True)
    with open(os.path.join(base, "schema.sql"), "w") as fh:
        fh.write(f"-- {dname} data model (PostgreSQL). Generated by ../generate.py\n")
        fh.write(SCHEMAS[dname])
    for table, rows in tables.items():
        with open(os.path.join(data, f"{table}.csv"), "w", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)
    with open(os.path.join(data, "seed.sql"), "w") as fh:
        fh.write(f"-- {dname} seed data. Load after schema.sql.\nBEGIN;\n")
        for table, rows in tables.items():
            cols = list(rows[0].keys())
            for r in rows:
                fh.write(f"INSERT INTO {table} ({', '.join(cols)}) VALUES "
                         f"({', '.join(sql_value(r[c]) for c in cols)});\n")
        fh.write("COMMIT;\n")
    return {t: len(r) for t, r in tables.items()}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--domain", nargs="*", choices=list(DOMAINS), default=list(DOMAINS))
    ap.add_argument("--scale", type=int, default=1, help="row multiplier (xN)")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    for dname in args.domain:
        rng = random.Random(f"{dname}-{args.seed}")
        counts = write_domain(dname, DOMAINS[dname](rng, args.scale))
        print(f"{dname:11} " + "  ".join(f"{t}={n}" for t, n in counts.items()))


if __name__ == "__main__":
    main()
