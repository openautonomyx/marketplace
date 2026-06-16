#!/usr/bin/env python3
"""Publish the SFMC test data to Salesforce Marketing Cloud via the REST API.

Authenticates with OAuth 2.0 (v2 client_credentials), then upserts the
Subscribers rows into a Data Extension using the async Data Extension rows API.

No third-party deps (urllib). The target Data Extension must already exist
(create it from de-schema.json in the SFMC UI, or via SOAP). Configure via env:

  SFMC_SUBDOMAIN     e.g. mc6yxz...   (the part before .auth.marketingcloudapis.com)
  SFMC_CLIENT_ID
  SFMC_CLIENT_SECRET
  SFMC_ACCOUNT_ID    the MID (optional but recommended)
  SFMC_DE_KEY        external key of the Data Extension   (default: Subscribers)
  SFMC_PAYLOAD       path to the rowset json              (default: rest_payloads/subscribers_rows.json)

Usage:
  python3 publish.py            # publish subscribers
  python3 publish.py --poll     # publish then poll the async status
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))


def _post(url, body, headers, method="POST"):
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json", **headers}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode()}


def _get(url, headers):
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode()}


def env(name, default=None, required=False):
    v = os.environ.get(name, default)
    if required and not v:
        sys.exit(f"missing required env var {name}")
    return v


def authenticate(subdomain, client_id, client_secret, account_id):
    # SFMC_AUTH_URL lets you point at a mock/local endpoint (keyless demo); otherwise
    # the real SFMC auth host is derived from the subdomain.
    url = os.environ.get("SFMC_AUTH_URL") or f"https://{subdomain}.auth.marketingcloudapis.com/v2/token"
    body = {"grant_type": "client_credentials", "client_id": client_id or "", "client_secret": client_secret or ""}
    if account_id:
        body["account_id"] = account_id
    status, data = _post(url, body, {})
    if status != 200:
        sys.exit(f"auth failed ({status}): {data}")
    return data["access_token"], data["rest_instance_url"].rstrip("/")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--poll", action="store_true", help="poll the async request status after upserting")
    ap.add_argument("--de-key", default=env("SFMC_DE_KEY", "Subscribers"))
    ap.add_argument("--payload", default=env("SFMC_PAYLOAD", os.path.join(HERE, "rest_payloads", "subscribers_rows.json")))
    args = ap.parse_args()

    mock = bool(os.environ.get("SFMC_AUTH_URL"))  # keyless/local demo mode
    subdomain = env("SFMC_SUBDOMAIN", required=not mock)
    token, rest = authenticate(subdomain,
                               env("SFMC_CLIENT_ID", required=not mock),
                               env("SFMC_CLIENT_SECRET", required=not mock),
                               env("SFMC_ACCOUNT_ID"))
    auth = {"Authorization": f"Bearer {token}"}
    print(f">> authenticated; rest_instance_url={rest}")

    with open(args.payload) as fh:
        payload = json.load(fh)
    n = len(payload.get("items", []))
    url = f"{rest}/data/v1/async/dataextensions/key:{args.de_key}/rows"
    print(f">> upserting {n} rows into DE '{args.de_key}' (async)")
    status, data = _post(url, payload, auth)
    if status not in (200, 201, 202):
        sys.exit(f"upsert failed ({status}): {data}")
    request_id = data.get("requestId") or data.get("RequestId")
    print(f">> accepted (HTTP {status}); requestId={request_id}")

    if args.poll and request_id:
        for _ in range(20):
            time.sleep(3)
            s, d = _get(f"{rest}/data/v1/async/{request_id}/status", auth)
            state = (d.get("status") or d).get("requestStatus") if isinstance(d.get("status"), dict) else d.get("requestStatus", d)
            print(f"   status: {json.dumps(d)[:200]}")
            if isinstance(d, dict) and d.get("requestStatus") in ("Complete", "Error"):
                break
    print(">> done.")


if __name__ == "__main__":
    main()
