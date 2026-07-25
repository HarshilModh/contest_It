import type { OathStats, Outcome } from './types';
import oathCacheRaw from './oath-cache.json';

const oathCache = oathCacheRaw as Record<string, OathStats>;

/**
 * Normalizes hearing_result string from NYC Open Data into our Outcome union.
 */
export function normalizeOutcome(resultString: string | null | undefined): Outcome {
  if (!resultString) return 'other';
  const upper = resultString.toUpperCase().trim();

  if (upper.includes('DISMISS')) {
    return 'dismissed';
  }
  if (
    upper.includes('VIOLATION') ||
    upper.includes('SUSTAINED') ||
    upper.includes('DEFAULT') ||
    upper.includes('IN-VIOL')
  ) {
    return 'in_violation';
  }
  if (upper.includes('SETTL') || upper.includes('STIPULAT')) {
    return 'settled';
  }

  // Log unmapped outcome for monitoring/debugging
  console.log(`[OATH] Unmapped outcome string encountered: "${resultString}"`);
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

  // Try extracting core section number (e.g., "16-118" from "A.C. 16-118 2 A")
  const sectionMatch = cleaned.match(/\b\d{1,3}[-.]\d{1,3}\b/);
  if (sectionMatch) {
    const sec = sectionMatch[0];
    const secNorm = normalizeChargeKey(sec);
    if (oathCache[sec]) return oathCache[sec];
    if (oathCache[secNorm]) return oathCache[secNorm];
  }

  // Look for substring match in cache keys
  for (const [key, val] of Object.entries(oathCache)) {
    if (key.length >= 4 && (norm.includes(key) || key.includes(norm))) {
      return val;
    }
  }

  return null;
}

/**
 * Retrieves aggregate OATH stats for a given charge code from NYC Open Data (Socrata API),
 * with a 5-second timeout and automatic fallback to precomputed local cache.
 */
export async function getStatsForCharge(chargeCode: string): Promise<OathStats | null> {
  if (!chargeCode || !chargeCode.trim()) {
    return null;
  }

  const cleanedCode = chargeCode.trim();
  const sectionMatch = cleanedCode.match(/\b\d{1,3}[-.]\d{1,3}\b/);
  const queryCode = sectionMatch ? sectionMatch[0] : cleanedCode;

  // 1. Attempt live fetch with 5s timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const encode = encodeURIComponent;
    const whereClause = `charge_1_code_section LIKE '%${queryCode}%'`;
    const url = `https://data.cityofnewyork.us/resource/jz4z-kudi.json?$select=hearing_result,penalty_imposed&$where=${encode(whereClause)}&$limit=5000`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const rows = (await res.json()) as Array<{ hearing_result?: string; penalty_imposed?: string }>;

      if (Array.isArray(rows) && rows.length > 0) {
        const totalCases = rows.length;
        const outcomeBreakdown: Record<Outcome, number> = {
          dismissed: 0,
          in_violation: 0,
          settled: 0,
          other: 0
        };

        let penaltySum = 0;
        let penaltyCount = 0;
        const penalties: number[] = [];

        for (const r of rows) {
          const outcome = normalizeOutcome(r.hearing_result);
          outcomeBreakdown[outcome] = (outcomeBreakdown[outcome] || 0) + 1;

          if (r.penalty_imposed) {
            const val = parseFloat(r.penalty_imposed);
            if (!isNaN(val)) {
              penaltySum += val;
              penaltyCount++;
              penalties.push(val);
            }
          }
        }

        penalties.sort((a, b) => a - b);
        const medianPenalty =
          penalties.length > 0
            ? penalties[Math.floor(penalties.length / 2)]
            : null;

        const dismissalRate = totalCases > 0 ? outcomeBreakdown.dismissed / totalCases : 0;
        const avgPenaltyImposed = penaltyCount > 0 ? Math.round(penaltySum / penaltyCount) : null;

        return {
          chargeCode: cleanedCode,
          totalCases,
          dismissalRate: Number(dismissalRate.toFixed(2)),
          outcomeBreakdown,
          avgPenaltyImposed,
          medianPenaltyImposed: medianPenalty !== null ? Math.round(medianPenalty) : null,
          dataSource: 'live',
          sampleWindow: '2019-2026'
        };
      }
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[OATH] Live fetch for code "${cleanedCode}" failed or timed out. Falling back to cache.`, err);
  }

  // 2. Fallback to cached data if live fetch failed, timed out, or returned empty
  const cachedData = findInCache(cleanedCode);
  if (cachedData) {
    return {
      ...cachedData,
      chargeCode: cleanedCode,
      dataSource: 'cached'
    };
  }

  // 3. Return null if no data exists in live API or cache
  return null;
}
