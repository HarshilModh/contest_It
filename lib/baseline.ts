import type { OathStats } from './types';
import oathCacheRaw from './oath-cache.json';

/**
 * The all-charges baseline, computed from our precomputed cache so a single
 * charge's odds can be read against the wider picture ("34% for this charge vs
 * 21% across the codes we track").
 *
 * Deduped by section number first: the cache intentionally keys the same
 * underlying aggregate under several spellings ("16-118", "16-118(2)",
 * "A.C. 16-118 2 A"), and counting those repeatedly would weight one charge
 * several times over.
 *
 * Case-weighted rather than a mean of rates, so a code with 1,300 hearings
 * doesn't move the baseline as much as one with 700,000.
 */

function sectionKey(stats: OathStats): string {
  const match = stats.chargeCode.match(/\b\d{1,3}[-.]\d{1,3}\b/);
  return match ? match[0] : stats.chargeCode.trim().toLowerCase();
}

function computeBaseline() {
  const bySection = new Map<string, OathStats>();
  for (const stats of Object.values(oathCacheRaw as Record<string, OathStats>)) {
    const key = sectionKey(stats);
    if (!bySection.has(key)) bySection.set(key, stats);
  }

  const entries = [...bySection.values()];
  const caseCount = entries.reduce((sum, s) => sum + s.totalCases, 0);
  const dismissedCount = entries.reduce((sum, s) => sum + s.outcomeBreakdown.dismissed, 0);

  return {
    /** Dismissal rate across every tracked charge, 0..1. */
    rate: caseCount > 0 ? dismissedCount / caseCount : 0,
    /** How many distinct charge sections went into the baseline. */
    codeCount: entries.length,
    /** Total contested hearings behind the baseline. */
    caseCount,
  };
}

export const BASELINE = computeBaseline();

/** How a charge compares to the baseline, for UI copy. */
export function compareToBaseline(rate: number) {
  const diff = rate - BASELINE.rate;
  const relative = BASELINE.rate > 0 ? rate / BASELINE.rate : 1;
  // Below a point of difference the comparison isn't worth claiming.
  if (Math.abs(diff) < 0.01) {
    return { direction: "typical" as const, diff, relative };
  }
  return { direction: diff > 0 ? ("above" as const) : ("below" as const), diff, relative };
}
