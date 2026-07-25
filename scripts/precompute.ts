import fs from 'fs';
import path from 'path';
import type { OathStats, Outcome } from '../lib/types';

const COMMON_CHARGES = [
  '16-118',
  '16-120',
  '16-123',
  '28-301.1',
  '151.02',
  '19-102',
  '10-125',
  '14-108',
  '16-118(2)',
  '16-118(6)'
];

function normalizeOutcome(resultString: string | null | undefined): Outcome {
  if (!resultString) return 'other';
  const upper = resultString.toUpperCase().trim();
  if (upper.includes('DISMISS')) return 'dismissed';
  if (
    upper.includes('VIOLATION') ||
    upper.includes('SUSTAINED') ||
    upper.includes('DEFAULT') ||
    upper.includes('IN-VIOL')
  ) {
    return 'in_violation';
  }
  if (upper.includes('SETTL') || upper.includes('STIPULAT')) return 'settled';
  return 'other';
}

async function fetchStatsForCode(code: string): Promise<OathStats | null> {
  const encode = encodeURIComponent;
  const whereClause = `charge_1_code_section LIKE '%${code}%'`;
  const url = `https://data.cityofnewyork.us/resource/jz4z-kudi.json?$select=hearing_result,penalty_imposed&$where=${encode(whereClause)}&$limit=5000`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ hearing_result?: string; penalty_imposed?: string }>;

    if (!Array.isArray(rows) || rows.length === 0) return null;

    let totalCases = rows.length;
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
      chargeCode: code,
      totalCases,
      dismissalRate: Number(dismissalRate.toFixed(2)),
      outcomeBreakdown,
      avgPenaltyImposed,
      medianPenaltyImposed: medianPenalty !== null ? Math.round(medianPenalty) : null,
      dataSource: 'cached',
      sampleWindow: '2019-2026'
    };
  } catch (err) {
    console.error(`Failed precomputing stats for code ${code}:`, err);
    return null;
  }
}

async function main() {
  console.log('Precomputing OATH stats for top charge codes...');
  const cache: Record<string, OathStats> = {};

  for (const code of COMMON_CHARGES) {
    console.log(`Fetching ${code}...`);
    const stats = await fetchStatsForCode(code);
    if (stats) {
      cache[code] = stats;
      // also key by normalized versions
      const normalizedKey = code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      cache[normalizedKey] = stats;
    }
  }

  const outputPath = path.join(process.cwd(), 'lib', 'oath-cache.json');
  fs.writeFileSync(outputPath, JSON.stringify(cache, null, 2), 'utf-8');
  console.log(`Saved precomputed cache to ${outputPath}`);
}

main();
