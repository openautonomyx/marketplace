import type { Skill } from "@oax/context-engine";

import type { Seller, SkillListing, ListingStatus } from "./types";

export interface SellerRegistration {
  id: string;
  name: string;
  contact?: string;
  /** Verification is earned later; open onboarding starts unverified. */
  verified?: boolean;
  did?: string;
}

/** Register a seller. Open by default: anyone can sell (starts unverified). */
export function registerSeller(input: SellerRegistration): Seller {
  return {
    id: input.id,
    name: input.name,
    verified: input.verified ?? false,
    did: input.did,
    contact: input.contact,
    registeredAt: new Date().toISOString()
  };
}

/**
 * Submit a skill listing. A listing enters as "submitted" and must pass through
 * the certification pipeline before it is "listed" — open to publish, gated to
 * be trusted. Basic admissibility is checked here.
 */
export function submitListing(seller: Seller, skill: Skill): SkillListing {
  const id = `listing.${seller.id}.${skill.id}`;
  const submittedAt = new Date().toISOString();

  const problems: string[] = [];
  if (skill.capabilities.length === 0) problems.push("no declared capabilities");
  if (!skill.version?.version) problems.push("missing version");

  if (problems.length > 0) {
    return { id, seller, skill, status: "rejected", submittedAt, reason: problems.join("; ") };
  }
  return { id, seller, skill, status: "submitted", submittedAt };
}

/** Transition a listing's status (e.g. to "listed" once certified). */
export function setListingStatus(
  listing: SkillListing,
  status: ListingStatus,
  reason?: string
): SkillListing {
  return { ...listing, status, reason };
}

/** The publicly visible marketplace: only listings that reached "listed". */
export function publicListings(listings: SkillListing[]): SkillListing[] {
  return listings.filter((l) => l.status === "listed");
}
