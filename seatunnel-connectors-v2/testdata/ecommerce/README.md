# E-commerce test data (database connector)

A complete, referentially-consistent relational dataset for exercising a
**database (JDBC) connector** with SeaTunnel.

## Data model

```
customers ──1:*── orders ──1:*── order_items ──*:1── products
```

| Table | Key columns | Notes |
| ----- | ----------- | ----- |
| `customers` | `id` PK, `email` UNIQUE | name, country (ISO-2), created_at |
| `products` | `id` PK, `sku` UNIQUE | category, `price NUMERIC`, `in_stock BOOL` |
| `orders` | `id` PK, `customer_id` → customers | status, order_date, `total NUMERIC` |
| `order_items` | `id` PK, `order_id` → orders, `product_id` → products | quantity, unit_price |

**Invariant:** each `orders.total` equals `sum(order_items.quantity * unit_price)`
for that order — the generator enforces it and self-checks (0 mismatches).

Full DDL: [`schema.sql`](schema.sql) (PostgreSQL; portable to MySQL).

## Files

```
ecommerce/
├── schema.sql                 # CREATE TABLE DDL + FKs + indexes
├── generate.py                # deterministic generator (CSV + seed.sql)
├── data/
│   ├── customers.csv          # flat exports (file sources / inspection)
│   ├── products.csv
│   ├── orders.csv
│   ├── order_items.csv
│   └── seed.sql               # INSERTs matching schema.sql
└── pipelines/
    └── postgres_to_console.conf   # JDBC source → Console example
```

## Generate

```bash
python3 generate.py --customers 50 --products 30 --orders 200 --seed 42
```
Deterministic via `--seed`; scale any table independently. Prints a row count
and an integrity check (`total-vs-items mismatches: 0`).

## Load into Postgres

```bash
# spin up a throwaway Postgres (no Docker? use podman the same way)
podman run -d --name shop -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=shop -p 5432:5432 postgres:16

psql postgresql://postgres:postgres@localhost:5432/shop -f schema.sql
psql postgresql://postgres:postgres@localhost:5432/shop -f data/seed.sql

# sanity check
psql postgresql://postgres:postgres@localhost:5432/shop \
  -c "SELECT count(*) FROM order_items;"
```

## Move it with SeaTunnel

[`pipelines/postgres_to_console.conf`](pipelines/postgres_to_console.conf) reads
orders joined to customers and prints them — uses the JDBC connector bundled in
the `apache/seatunnel` image:

```bash
${SEATUNNEL_HOME}/bin/seatunnel.sh --config pipelines/postgres_to_console.conf -e local
```

Or run it through the [seatunnel-operator](../../../tools/seatunnel-operator) by
pasting the `.conf` body into a `SeaTunnelJob`'s `spec.config` (the image must
also bundle the Postgres JDBC driver).
