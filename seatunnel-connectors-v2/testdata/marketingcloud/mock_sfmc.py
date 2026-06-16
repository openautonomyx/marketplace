#!/usr/bin/env python3
"""A tiny mock of the Salesforce Marketing Cloud REST API for keyless local demos.

Implements just enough to exercise publish.py end-to-end without any credentials:
  POST /v2/token                                          -> access_token + rest_instance_url
  POST /data/v1/async/dataextensions/key:<KEY>/rows       -> {requestId}; stores rows
  GET  /data/v1/async/<id>/status                         -> {requestStatus: Complete}

Received rows are written to received/<KEY>.json so you can confirm what landed.

  python3 mock_sfmc.py --port 8787       # then point publish.py at it via SFMC_AUTH_URL
"""

import argparse
import json
import os
import re
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
RECEIVED = os.path.join(HERE, "received")
STORE = {}  # requestId -> {"key":..., "count":...}
PORT = 8787


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read(self):
        n = int(self.headers.get("Content-Length", 0) or 0)
        return json.loads(self.rfile.read(n).decode() or "{}") if n else {}

    def do_POST(self):
        if self.path.endswith("/v2/token"):
            self._read()
            self._send(200, {"access_token": "mock-token-" + uuid.uuid4().hex[:8],
                             "rest_instance_url": f"http://127.0.0.1:{PORT}/",
                             "expires_in": 3600, "token_type": "Bearer"})
            return
        m = re.match(r"^/data/v1/async/dataextensions/key:([^/]+)/rows$", self.path)
        if m:
            key = m.group(1)
            payload = self._read()
            items = payload.get("items", [])
            os.makedirs(RECEIVED, exist_ok=True)
            with open(os.path.join(RECEIVED, f"{key}.json"), "w") as fh:
                json.dump(items, fh, indent=2)
            rid = uuid.uuid4().hex
            STORE[rid] = {"key": key, "count": len(items)}
            self._send(202, {"requestId": rid})
            return
        self._send(404, {"error": "not found", "path": self.path})

    def do_GET(self):
        m = re.match(r"^/data/v1/async/([^/]+)/status$", self.path)
        if m and m.group(1) in STORE:
            info = STORE[m.group(1)]
            self._send(200, {"requestStatus": "Complete", "resultStatus": "OK", **info})
            return
        self._send(404, {"error": "not found", "path": self.path})

    def log_message(self, *a):  # quieter
        pass


def main():
    global PORT
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--port", type=int, default=PORT)
    args = ap.parse_args()
    PORT = args.port
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"mock SFMC listening on http://127.0.0.1:{PORT} (token + async DE rows + status)")
    srv.serve_forever()


if __name__ == "__main__":
    main()
