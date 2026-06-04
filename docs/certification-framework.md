# Certification Framework

Certification (`@oax/certification-engine`) converts evaluation, benchmark,
signing, and policy state into a single, governable **certification level** for a
skill *in a context*.

## Levels

Assurance ladder (ascending):

```text
Unreviewed → Submitted → Validated →
Certified Bronze → Certified Silver → Certified Gold →
Enterprise Approved
```

Exception / terminal states (override the ladder):

```text
Restricted · Deprecated · Suspended · Revoked · Expired
```

## How a level is derived

`deriveCertificationLevel(input)` applies, in order:

1. **Exception flags first.** `revoked` → `expired` → `suspended` → `deprecated`
   → `policyRestricted` short-circuit the ladder.
2. **Intake gates.** No signed contract → `Unreviewed`. Signed but below the
   validation threshold → `Submitted`.
3. **Score bands** on the combined `(evaluation + benchmark) / 2`:
   - ≥ 60 → `Validated`
   - ≥ 70 → `Certified Bronze`
   - ≥ 80 → `Certified Silver`
   - ≥ 90 → `Certified Gold`
4. **Enterprise Approved** requires `Certified Gold` **and** a verified publisher
   **and** satisfied governance **and** explicit enterprise sign-off.

```ts
import { certifySkill } from "@oax/certification-engine";

const cert = certifySkill({
  skillId, contextId,
  evaluationScore, benchmarkScore,
  signed: true, publisherVerified: true,
  governanceSatisfied: true, enterpriseApproved: true
}, { workType: "code-review", governanceProfile: "soc2" });
```

A certification carries a **scope** (work type, toolchain, governance profile): a
skill is never "certified" in the abstract, only certified *for a scope*.
