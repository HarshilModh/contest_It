import type { OathStats, Outcome } from './types';
import oathCacheRaw from './oath-cache.json';

const oathCache = oathCacheRaw as Record<string, OathStats>;

const DATASET_URL = 'https://data.cityofnewyork.us/resource/jz4z-kudi.json';

/**
 * Full classification of a raw `hearing_result` string.
 *
 * The dataset mixes genuinely adjudicated hearings with cases that never got
 * decided on the merits. Only the first four map onto our `Outcome` union and
 * count toward the odds we report; the rest are tracked so they can be
 * *excluded* from the denominator:
 *
 *  - `pending`     — no hearing_result yet (the single largest bucket)
 *  - `written_off` — the city stopped pursuing collection
 *  - `default`     — respondent never appeared, so it was never contested
 *  - `adjourned`   — rescheduled, outcome recorded on another row
 */
type ResultClass = Outcome | 'default' | 'written_off' | 'adjourned' | 'pending';

export function classifyResult(resultString: string | null | undefined): ResultClass {
  if (!resultString || !resultString.trim()) return 'pending';
  const upper = resultString.toUpperCase().trim();

  if (upper.includes('DISMISS')) return 'dismissed';
  if (upper.includes('ADJOURN') || upper.includes('ADJORN')) return 'adjourned';
  if (upper.includes('WRITTEN OFF')) return 'written_off';
  if (upper.includes('DEFAULT')) return 'default';
  // Checked before in-violation so "SETTL IN-VIO" reads as a settlement.
  if (upper.includes('SETTL') || upper.includes('STIPULAT')) return 'settled';
  if (
    upper.includes('VIOLATION') ||
    upper.includes('IN-VIO') ||
    upper.includes('INVIO') ||
    upper.includes('SUSTAINED') ||
    upper.includes('FINED')
  ) {
    return 'in_violation';
  }

  console.log(`[OATH] Unmapped outcome string encountered: "${resultString}"`);
  return 'other';
}

/** Back-compat wrapper: collapses the excluded classes onto the `Outcome` union. */
export function normalizeOutcome(resultString: string | null | undefined): Outcome {
  const cls = classifyResult(resultString);
  if (cls === 'default') return 'in_violation';
  if (cls === 'dismissed' || cls === 'in_violation' || cls === 'settled') return cls;
  return 'other';
}

/**
 * Normalizes user/OCR input charge codes into an alphanumeric key.
 * e.g., "16-118(2)", "A.C. 16-118 2 A" -> "161182a"
 */
export function normalizeChargeKey(code: string): string {
  return code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

/**
 * Resolves a charge code against the precomputed local cache using exact, normalized,
 * or partial key matching (e.g. "16118" matching "ac161182a").
 */
function findInCache(code: string): OathStats | null {
  const cleaned = code.trim();
  const norm = normalizeChargeKey(cleaned);

  if (oathCache[cleaned]) return oathCache[cleaned];
  if (oathCache[norm]) return oathCache[norm];

  const sectionMatch = cleaned.match(/\b\d{1,3}[-.]\d{1,3}\b/);
  if (sectionMatch) {
    const sec = sectionMatch[0];
    const secNorm = normalizeChargeKey(sec);
    if (oathCache[sec]) return oathCache[sec];
    if (oathCache[secNorm]) return oathCache[secNorm];
  }

  for (const [key, val] of Object.entries(oathCache)) {
    if (key.length >= 4 && (norm.includes(key) || key.includes(norm))) {
      return val;
    }
  }

  return null;
}

interface GroupedRow {
  hearing_result?: string;
  penalty_imposed?: string;
  count?: string;
}

/** Extracts the queryable section number from a messy user/OCR charge code. */
function toQueryCode(chargeCode: string): string {
  const sectionMatch = chargeCode.match(/\b\d{1,3}[-.]\d{1,3}\b/);
  return sectionMatch ? sectionMatch[0] : chargeCode;
}

/**
 * One server-side GROUP BY over every matching row. Returns the full
 * (hearing_result × penalty_imposed) distribution — a few hundred rows that
 * summarize millions of cases exactly, with no row cap and no sampling bias.
 */
async function fetchGroupedRows(queryCode: string, timeoutMs: number): Promise<GroupedRow[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const safeCode = queryCode.replace(/'/g, "''");
    const where = `charge_1_code_section LIKE '%${safeCode}%'`;
    const url =
      `${DATASET_URL}?$select=hearing_result,penalty_imposed,count(*)` +
      `&$where=${encodeURIComponent(where)}` +
      `&$group=hearing_result,penalty_imposed&$limit=50000`;

    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];
    const rows = (await res.json()) as GroupedRow[];
    return Array.isArray(rows) ? rows : [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Folds the grouped distribution into OathStats.
 *
 * `dismissalRate` is computed over **contested hearings only** — cases that
 * actually reached a decision (dismissed / in violation / settled / other).
 * Pending, written-off, and default cases are excluded, because they answer a
 * different question than "if I show up and fight this, what happens?".
 * Penalty figures are the exact weighted average and median among cases that
 * were found in violation — i.e. what you pay if you lose.
 */
export function aggregateGroupedRows(rows: GroupedRow[], chargeCode: string): OathStats | null {
  const counts: Record<ResultClass, number> = {
    dismissed: 0,
    in_violation: 0,
    settled: 0,
    other: 0,
    default: 0,
    written_off: 0,
    adjourned: 0,
    pending: 0,
  };

  const penaltyPairs: Array<[penalty: number, count: number]> = [];

  for (const row of rows) {
    const n = Number(row.count ?? 0);
    if (!Number.isFinite(n) || n <= 0) continue;

    const cls = classifyResult(row.hearing_result);
    counts[cls] += n;

    if (cls === 'in_violation' && row.penalty_imposed != null) {
      const penalty = parseFloat(row.penalty_imposed);
      if (Number.isFinite(penalty)) penaltyPairs.push([penalty, n]);
    }
  }

  const outcomeBreakdown: Record<Outcome, number> = {
    dismissed: counts.dismissed,
    in_violation: counts.in_violation,
    settled: counts.settled,
    other: counts.other,
  };

  const totalCases =
    outcomeBreakdown.dismissed +
    outcomeBreakdown.in_violation +
    outcomeBreakdown.settled +
    outcomeBreakdown.other;

  if (totalCases === 0) return null;

  // Exact weighted average and median from the value distribution.
  penaltyPairs.sort((a, b) => a[0] - b[0]);
  const penaltyTotal = penaltyPairs.reduce((sum, [, c]) => sum + c, 0);
  const penaltySum = penaltyPairs.reduce((sum, [p, c]) => sum + p * c, 0);

  let medianPenaltyImposed: number | null = null;
  let running = 0;
  for (const [penalty, c] of penaltyPairs) {
    running += c;
    if (running >= penaltyTotal / 2) {
      medianPenaltyImposed = penalty;
      break;
    }
  }

  return {
    chargeCode,
    totalCases,
    dismissalRate: Number((outcomeBreakdown.dismissed / totalCases).toFixed(4)),
    outcomeBreakdown,
    avgPenaltyImposed: penaltyTotal > 0 ? Math.round(penaltySum / penaltyTotal) : null,
    medianPenaltyImposed: medianPenaltyImposed !== null ? Math.round(medianPenaltyImposed) : null,
    dataSource: 'live',
    sampleWindow: '2019-2026',
  };
}

/**
 * Live aggregate straight from NYC Open Data, with no cache fallback.
 * Used by `scripts/precompute.ts` so the cache is built by the same math the
 * live path uses.
 */
export async function fetchLiveStats(
  chargeCode: string,
  timeoutMs = 15000
): Promise<OathStats | null> {
  if (!chargeCode || !chargeCode.trim()) return null;
  const cleaned = chargeCode.trim();
  const rows = await fetchGroupedRows(toQueryCode(cleaned), timeoutMs);
  return aggregateGroupedRows(rows, cleaned);
}

/**
 * Retrieves aggregate OATH stats for a charge code, with a short timeout on the
 * live query and automatic fallback to the precomputed local cache.
 */
export async function getStatsForCharge(chargeCode: string): Promise<OathStats | null> {
  if (!chargeCode || !chargeCode.trim()) {
    return null;
  }

  const cleanedCode = chargeCode.trim();

  try {
    const rows = await fetchGroupedRows(toQueryCode(cleanedCode), 6000);
    const stats = aggregateGroupedRows(rows, cleanedCode);
    if (stats) return stats;
  } catch (err) {
    console.warn(
      `[OATH] Live aggregate for code "${cleanedCode}" failed or timed out. Falling back to cache.`,
      err
    );
  }

  const cachedData = findInCache(cleanedCode);
  if (cachedData) {
    return {
      ...cachedData,
      chargeCode: cleanedCode,
      dataSource: 'cached',
    };
  }

  return null;
}
