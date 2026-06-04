# Multi-domain test datasets

Complete, referentially-consistent relational test data across five domains —
one generator, one command. Each domain emits PostgreSQL DDL + per-table CSVs +
a `seed.sql` of INSERTs. All foreign keys resolve (verified).

## Domains

| Domain | Tables (FK chain) |
| ------ | ----------------- |
| `ecommerce` | customers → orders → order_items ← products |
| `healthcare` | patients, providers → encounters → prescriptions |
| `banking` | branches → customers → accounts → transactions |
| `iot` | sites → devices → sensors → readings |
| `saas` | accounts → users, accounts → subscriptions → invoices |

## Generate

```bash
python3 generate.py                 # all domains, base size
python3 generate.py --scale 10      # ~10x rows per table
python3 generate.py --domain banking iot --scale 5
```

Deterministic per `(domain, --seed)`. Output lands in `datasets/<domain>/`:

```
<domain>/
├── schema.sql        # CREATE TABLE DDL (PKs / FKs / constraints)
└── data/
    ├── <table>.csv   # one CSV per table
    └── seed.sql      # INSERTs matching schema.sql
```

## Load into Postgres

```bash
psql "$DB" -f datasets/banking/schema.sql
psql "$DB" -f datasets/banking/data/seed.sql
```

## Use with SeaTunnel / the operator

Point the JDBC connector at any table (see
[`../ecommerce/pipelines`](../ecommerce/pipelines) for a `Jdbc → Console`
example), or paste a pipeline config into a `SeaTunnelJob` for the
[seatunnel-operator](../../../tools/seatunnel-operator).

> Default dialect is PostgreSQL. MySQL DDL/seed output can be added on request
> (AUTO_INCREMENT, DATETIME, etc.) — the data CSVs are dialect-agnostic.
