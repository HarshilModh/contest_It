import fs from 'fs';
import path from 'path';
import type { OathStats } from '../lib/types';
import { fetchLiveStats } from '../lib/oath';

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
  '16-118(6)',
  '16-118 2',
  'A.C. 16-118 2 A',
  '10.119.',
  '10-119',
  '16-120 A',
  '16-120 C',
  'A.C. 16-120 C',
  '16-120 D',
  '1-08',
  '27-2005',
  '24-142'
];

async function fetchStatsForCode(code: string): Promise<OathStats | null> {
  try {
    const stats = await fetchLiveStats(code);
    if (!stats) return null;
    return { ...stats, dataSource: 'cached' };
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
