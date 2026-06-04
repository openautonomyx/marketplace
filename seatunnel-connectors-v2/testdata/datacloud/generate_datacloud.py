#!/usr/bin/env python3
"""Transform the e-commerce dataset into Salesforce Data Cloud ingestion test data.

Reads ../ecommerce/data/*.csv (run that generator first) and emits, per object:
  payloads/<Object>.json  -- streaming Ingestion API bodies: {"data": [ {...}, ... ]}
                             chunked to <= --chunk records (Data Cloud streaming limit)
  bulk/<Object>.csv       -- Bulk Ingestion API CSV (header matches ingestion-schema.yaml)

Objects (-> standard DMO): Customer (Individual), Product (Product),
SalesOrder (Sales Order), SalesOrderItem (Sales Order Product).

  python3 generate_datacloud.py --chunk 200
"""

import argparse
import csv
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "ecommerce", "data")
PAYLOADS = os.path.join(HERE, "payloads")
BULK = os.path.join(HERE, "bulk")


def read_csv(name):
    path = os.path.join(SRC, f"{name}.csv")
    if not os.path.isfile(path):
        raise SystemExit(f"missing {path} -- run ../ecommerce/generate.py first")
    with open(path, newline="") as fh:
        return list(csv.DictReader(fh))


def isodt(s: str) -> str:
    # "2024-01-15 09:23:00+0000" -> "2024-01-15T09:23:00Z"
    s = s.replace(" ", "T")
    return s[:-5] + "Z" if s.endswith("+0000") else s


def map_customer(r):
    return {"id": r["id"], "fullName": r["name"], "email": r["email"],
            "country": r["country"], "createdDate": isodt(r["created_at"])}


def map_product(r):
    return {"id": r["id"], "sku": r["sku"], "name": r["name"], "category": r["category"],
            "price": float(r["price"]), "inStock": r["in_stock"].strip().lower() == "true"}


def map_order(r):
    return {"id": r["id"], "customerId": r["customer_id"], "status": r["status"],
            "orderDate": isodt(r["order_date"]), "totalAmount": float(r["total"])}


def map_item(r):
    return {"id": r["id"], "orderId": r["order_id"], "productId": r["product_id"],
            "quantity": int(r["quantity"]), "unitPrice": float(r["unit_price"])}


OBJECTS = {
    "Customer": ("customers", map_customer),
    "Product": ("products", map_product),
    "SalesOrder": ("orders", map_order),
    "SalesOrderItem": ("order_items", map_item),
}


def write_payloads(obj, records, chunk):
    os.makedirs(PAYLOADS, exist_ok=True)
    # One file with all chunks as a JSON array of streaming bodies, plus the raw
    # records are recoverable from bulk CSV. Each element is a POST-ready body.
    bodies = [{"data": records[i:i + chunk]} for i in range(0, len(records), chunk)]
    path = os.path.join(PAYLOADS, f"{obj}.json")
    with open(path, "w") as fh:
        json.dump(bodies if len(bodies) != 1 else bodies[0], fh, indent=2)
        fh.write("\n")
    return path, len(bodies)


def write_bulk_csv(obj, records):
    os.makedirs(BULK, exist_ok=True)
    path = os.path.join(BULK, f"{obj}.csv")
    cols = list(records[0].keys())
    with open(path, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        for r in records:
            w.writerow({k: ("true" if v is True else "false" if v is False else v)
                        for k, v in r.items()})
    return path


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--chunk", type=int, default=200, help="max records per streaming body")
    args = ap.parse_args()

    for obj, (src, fn) in OBJECTS.items():
        records = [fn(r) for r in read_csv(src)]
        _, nbodies = write_payloads(obj, records, args.chunk)
        write_bulk_csv(obj, records)
        print(f"{obj:14} {len(records):4} records  ->  payloads/{obj}.json "
              f"({nbodies} streaming body/bodies), bulk/{obj}.csv")


if __name__ == "__main__":
    main()
