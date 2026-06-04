import type { RuntimeSignal } from "./types";

/**
 * Aggregate runtime signals into a single 0..1 health factor. Absent signals are
 * treated as neutral (0.7) rather than perfect, so unproven skills do not appear
 * as trustworthy as skills with a healthy production track record.
 */
export function aggregateRuntimeHealth(signals: RuntimeSignal[]): number {
  if (signals.length === 0) return 0.7;
  const sum = signals.reduce((acc, s) => acc + clamp01(s.health), 0);
  return clamp01(sum / signals.length);
}

/** Most recent signal timestamp, or undefined if there are none. */
export function latestSignalAt(signals: RuntimeSignal[]): string | undefined {
  if (signals.length === 0) return undefined;
  return signals
    .map((s) => s.observedAt)
    .sort()
    .at(-1);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
