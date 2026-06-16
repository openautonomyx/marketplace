import assert from "node:assert/strict";
import { test } from "node:test";

import {
  publicListings,
  registerSeller,
  setListingStatus,
  submitListing
} from "@oax/publishing-engine";

import { sampleSkill } from "./fixtures";

test("anyone can register as a seller (starts unverified)", () => {
  const seller = registerSeller({ id: "seller.alice", name: "Alice" });
  assert.equal(seller.verified, false);
  assert.ok(seller.registeredAt);
});

test("a valid skill is submitted into the pipeline", () => {
  const seller = registerSeller({ id: "seller.alice", name: "Alice" });
  const listing = submitListing(seller, sampleSkill());
  assert.equal(listing.status, "submitted");
  assert.equal(listing.seller.id, "seller.alice");
});

test("an inadmissible skill is rejected with a reason", () => {
  const seller = registerSeller({ id: "seller.bob", name: "Bob" });
  const listing = submitListing(seller, sampleSkill({ capabilities: [] }));
  assert.equal(listing.status, "rejected");
  assert.match(listing.reason ?? "", /capabilities/);
});

test("only listed items are publicly visible", () => {
  const seller = registerSeller({ id: "seller.alice", name: "Alice" });
  const submitted = submitListing(seller, sampleSkill());
  const listed = setListingStatus(submitted, "listed");
  assert.deepEqual(
    publicListings([submitted, listed]).map((l) => l.status),
    ["listed"]
  );
});
