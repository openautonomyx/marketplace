import type {
  Skill,
  SkillClaim,
  SkillPublisher
} from "@oax/context-engine";

/**
 * The signed skill contract. It binds publisher claims to a concrete, hashable
 * document so an enterprise can verify *what* was certified.
 */
export interface SkillContract {
  /** JSON-LD context URI(s); mirrored in the example .jsonld file. */
  "@context"?: string | string[];
  "@type"?: string;
  skillId: string;
  version: string;
  publisher: SkillPublisher;
  capabilityClaims: SkillClaim[];
  supportedWorkType: string[];
  protocolSupport: string[];
  toolsUsed: string[];
  permissionsRequired: string[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  dataAccessScope: string[];
  environmentAssumptions: string[];
  processAssumptions: string[];
  performanceClaims: SkillClaim[];
  reliabilityClaims: SkillClaim[];
  failureModes: string[];
  auditEvidence: string[];
  governanceRequirements: string[];
  certificationScope: string;
  /** Attached after digesting/signing. */
  signature?: SkillSignature;
}

/**
 * A placeholder signature block. This intentionally does NOT perform real
 * cryptographic private-key signing — it records signer metadata, the algorithm,
 * the digest, and a timestamp. DID/VC/Sigstore-backed signing comes later.
 */
export interface SkillSignature {
  /** Algorithm used for the digest, e.g. "sha-256". */
  digestAlgorithm: string;
  /** Hex-encoded digest of the canonicalized contract (signature excluded). */
  digest: string;
  /** Identifier of the signer (publisher or marketplace authority). */
  signerId: string;
  /** Signing scheme. Until real signing lands this is "placeholder". */
  signatureAlgorithm: "placeholder";
  createdAt: string;
  /** Explicit note that this is not a cryptographic signature yet. */
  note: string;
}

/** Convenience helper to build a contract skeleton from a Skill. */
export function contractFromSkill(skill: Skill): Partial<SkillContract> {
  return {
    skillId: skill.id,
    version: skill.version.version,
    publisher: skill.publisher,
    capabilityClaims: skill.claims,
    supportedWorkType: skill.capabilities.map((c) => c.workType),
    protocolSupport: skill.protocols,
    toolsUsed: skill.toolsUsed,
    permissionsRequired: skill.permissionsRequired
  };
}
