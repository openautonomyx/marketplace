#!/usr/bin/env python3
"""Generate typed dataclass models from the dataset SQL DDL.

Emits one module per domain under models/<domain>.py, with a @dataclass per
table (required/NOT NULL fields first, the rest Optional) plus a from_dict().

  python3 generate_models.py
"""
import re, os, glob

HERE = os.path.dirname(os.path.abspath(__file__))
DATASETS = os.path.join(HERE, "..", "datasets")

def split_cols(body):
    parts, depth, cur = [], 0, ""
    for ch in body:
        if ch == "(": depth += 1
        elif ch == ")": depth -= 1
        if ch == "," and depth == 0: parts.append(cur.strip()); cur = ""
        else: cur += ch
    if cur.strip(): parts.append(cur.strip())
    return parts

def py_type(sql):
    s = sql.upper()
    if s.startswith(("BIGINT", "INTEGER", "INT", "SMALLINT")): return "int"
    if s.startswith(("NUMERIC", "DECIMAL", "REAL", "DOUBLE", "FLOAT")): return "float"
    if s.startswith("BOOLEAN"): return "bool"
    return "str"  # VARCHAR/CHAR/TEXT/DATE/TIMESTAMP

def classname(table):
    return "".join(w.capitalize() for w in table.split("_"))

SKIP = ("PRIMARY", "FOREIGN", "CONSTRAINT", "CHECK", "UNIQUE")

def main():
    domains = {}
    for sf in sorted(glob.glob(os.path.join(DATASETS, "*", "schema.sql"))):
        dom = os.path.basename(os.path.dirname(sf))
        sql = "\n".join(l for l in open(sf).read().splitlines() if not l.strip().startswith("--"))
        tables = []
        for tbl, body in re.findall(r"CREATE TABLE (\w+)\s*\((.*?)\);", sql, re.S):
            req, opt = [], []
            for col in split_cols(body):
                toks = col.split()
                if not toks or toks[0].upper() in SKIP: continue
                field = (toks[0], py_type(toks[1]))
                if "NOT NULL" in col.upper() or "PRIMARY KEY" in col.upper(): req.append(field)
                else: opt.append(field)
            tables.append((tbl, req, opt))
        domains[dom] = tables

    init_lines = ['"""Typed dataclass models for the test datasets (generated)."""', ""]
    for dom, tables in domains.items():
        lines = [f'"""{dom} domain models (generated from datasets/{dom}/schema.sql)."""',
                 "from __future__ import annotations", "from dataclasses import dataclass",
                 "from typing import Optional", "", "",
                 "def _coerce(v, t):",
                 "    if v is None or v == \"\": return None",
                 "    if t == \"int\": return int(v)",
                 "    if t == \"float\": return float(v)",
                 "    if t == \"bool\": return str(v).strip().lower() in (\"true\", \"1\", \"t\", \"yes\")",
                 "    return v", "", ""]
        names = []
        for tbl, req, opt in tables:
            cn = classname(tbl); names.append(cn)
            lines.append("@dataclass")
            lines.append(f"class {cn}:")
            for f, t in req:
                lines.append(f"    {f}: {t}")
            for f, t in opt:
                lines.append(f"    {f}: Optional[{t}] = None")
            lines.append("")
            tmap = "{" + ", ".join(f'"{f}": "{t}"' for f, t in (req + opt)) + "}"
            lines.append(f"    _fields = {tmap}")
            lines.append("")
            lines.append("    @classmethod")
            lines.append("    def from_dict(cls, d: dict) -> \"%s\":" % cn)
            lines.append("        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})")
            lines.append("")
            lines.append("")
        open(os.path.join(HERE, f"{dom}.py"), "w").write("\n".join(lines))
        init_lines.append(f"from . import {dom}  # noqa: F401")
        print(f"{dom}.py: {', '.join(names)}")
    open(os.path.join(HERE, "__init__.py"), "w").write("\n".join(init_lines) + "\n")

if __name__ == "__main__":
    main()
