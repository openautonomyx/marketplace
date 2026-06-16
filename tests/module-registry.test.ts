import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ModuleRegistry,
  catalogJsonLd,
  defaultRegistry,
  type MarketplaceModule
} from "@oax/module-registry";

const mod = (id: string, kind: MarketplaceModule["kind"] = "engine"): MarketplaceModule => ({
  id,
  kind,
  name: id,
  version: "0.1.0",
  description: id
});

test("register, get, has, and list round-trip", () => {
  const r = new ModuleRegistry();
  r.register(mod("engine.a")).register(mod("action.b", "action"));
  assert.equal(r.size, 2);
  assert.ok(r.has("engine.a"));
  assert.equal(r.get("action.b")?.kind, "action");
  assert.deepEqual(r.list().map((m) => m.id).sort(), ["action.b", "engine.a"]);
});

test("listByKind filters by module kind", () => {
  const r = new ModuleRegistry().registerAll([mod("engine.a"), mod("action.b", "action")]);
  assert.deepEqual(r.listByKind("action").map((m) => m.id), ["action.b"]);
});

test("registering a duplicate id throws", () => {
  const r = new ModuleRegistry().register(mod("engine.a"));
  assert.throws(() => r.register(mod("engine.a")), /already registered/i);
});

test("the default registry contains engines and actions", () => {
  const r = defaultRegistry();
  assert.ok(r.listByKind("engine").length >= 7);
  assert.ok(r.listByKind("action").length >= 7);
  assert.ok(r.has("action.evaluate"));
  assert.ok(r.has("engine.certification"));
});

test("catalogJsonLd renders a directory ItemList of all modules", () => {
  const r = defaultRegistry();
  const catalog = catalogJsonLd(r);
  assert.equal(catalog["@type"], "ItemList");
  assert.equal((catalog.itemListElement as unknown[]).length, r.size);
});
