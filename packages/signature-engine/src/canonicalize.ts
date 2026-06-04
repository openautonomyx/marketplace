/**
 * Deterministic JSON canonicalization.
 *
 * Produces a stable string for any JSON-serializable value by recursively sorting
 * object keys so that semantically identical documents hash identically regardless
 * of key insertion order. This is a pragmatic subset of RFC 8785 (JCS): it does
 * not re-serialize numbers to the JCS number grammar, which is sufficient for the
 * string-and-structure-heavy skill contracts the marketplace signs today.
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      const v = obj[key];
      // Drop undefined so it never affects the digest.
      if (v === undefined) continue;
      sorted[key] = sortValue(v);
    }
    return sorted;
  }
  return value;
}
