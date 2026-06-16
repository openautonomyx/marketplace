#!/usr/bin/env python3
"""Mock API server implementing openapi.yaml, backed by the test-data CSVs.

Serves, for every table in the multi-domain datasets:
  GET  /<table>           list (supports ?limit= & ?offset=)
  GET  /<table>/{id}      fetch by id
  POST /<table>           create (in-memory append)

Rows are typed per the OpenAPI schemas (int64/double/boolean/...). Stdlib only.

  python3 serve.py --port 8080
"""

import argparse
import csv
import glob
import json
import os
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
DATASETS = os.path.join(HERE, "..", "datasets")

TABLES = {}   # "domain/table" -> list[dict] (typed rows)
TYPES = {}    # "domain/table" -> {col: openapi-type-dict}


def model_name(domain, table):
    return domain.capitalize() + "".join(w.capitalize() for w in table.split("_"))


def coerce(value, t):
    if value == "" or value is None:
        return None
    typ = t.get("type")
    try:
        if typ == "integer":
            return int(value)
        if typ == "number":
            return float(value)
        if typ == "boolean":
            return str(value).strip().lower() in ("true", "1", "t", "yes")
    except (ValueError, TypeError):
        return value
    return value


def load(spec):
    schemas = spec["components"]["schemas"]
    for path in sorted(glob.glob(os.path.join(DATASETS, "*", "data", "*.csv"))):
        domain = os.path.basename(os.path.dirname(os.path.dirname(path)))
        table = os.path.splitext(os.path.basename(path))[0]
        key = f"{domain}/{table}"
        props = schemas.get(model_name(domain, table), {}).get("properties", {})
        TYPES[key] = props
        with open(path, newline="") as fh:
            TABLES[key] = [{k: coerce(v, props.get(k, {})) for k, v in row.items()}
                           for row in csv.DictReader(fh)]


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        body = json.dumps(obj, default=str).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        m = re.match(r"^/([a-z_]+)/([a-z_]+)(?:/([^/?]+))?(?:\?(.*))?$", self.path)
        if not m:
            return self._send(404, {"error": "use /<domain>/<table>"})
        key = f"{m.group(1)}/{m.group(2)}"
        rid, qs = m.group(3), m.group(4) or ""
        if key not in TABLES:
            return self._send(404, {"error": f"unknown collection '{key}'"})
        rows = TABLES[key]
        if rid is not None:
            for r in rows:
                if str(r.get("id")) == rid:
                    return self._send(200, r)
            return self._send(404, {"error": f"{key} id={rid} not found"})
        q = dict(p.split("=", 1) for p in qs.split("&") if "=" in p)
        offset, limit = int(q.get("offset", 0)), int(q.get("limit", 50))
        return self._send(200, {"count": len(rows), "items": rows[offset:offset + limit]})

    def do_POST(self):
        m = re.match(r"^/([a-z_]+)/([a-z_]+)$", self.path)
        key = f"{m.group(1)}/{m.group(2)}" if m else None
        if key not in TABLES:
            return self._send(404, {"error": "unknown collection"})
        n = int(self.headers.get("Content-Length", 0) or 0)
        body = json.loads(self.rfile.read(n).decode() or "{}") if n else {}
        TABLES[key].append(body)
        return self._send(201, body)

    def log_message(self, *a):
        pass


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--port", type=int, default=8080)
    args = ap.parse_args()
    import yaml
    spec = yaml.safe_load(open(os.path.join(HERE, "openapi.yaml")))
    load(spec)
    print(f"loaded {len(TABLES)} collections: {', '.join(sorted(TABLES))}")
    srv = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"serving the OpenAPI contract on http://127.0.0.1:{args.port}")
    srv.serve_forever()


if __name__ == "__main__":
    main()
