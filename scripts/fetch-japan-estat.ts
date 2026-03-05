/**
 * Fetches Japan population data from e-Stat (Statistics Bureau of Japan).
 *
 * Dataset: Population Estimates — Total population, by age (single years) and sex
 * StatsDataId: 0003448237
 * API: https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData
 * License: CC BY 4.0
 *
 * Requires: E_STAT_APP_ID environment variable (register at https://www.e-stat.go.jp/api/)
 *
 * Run: E_STAT_APP_ID=your_id npx tsx scripts/fetch-japan-estat.ts
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface CompactCountryData {
  geo: string;
  name: string;
  source: string;
  license: string;
  lastUpdated: string;
  years: number[];
  data: Record<number, { m: number[]; f: number[] }>;
}

const OUTPUT_DIR = join(import.meta.dirname, '..', 'public', 'data');
const SOURCE = 'Statistics Bureau of Japan, e-Stat';
const LICENSE = 'CC BY 4.0';
const RATE_LIMIT_MS = 2000;

const APP_ID = process.env.E_STAT_APP_ID || '';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function emptyAgeBins(): number[] {
  return new Array(101).fill(0);
}

/**
 * Parse age from e-Stat age label.
 * Patterns: "0歳", "1歳", ..., "99歳", "100歳以上"
 */
function parseAgeLabel(label: string): number {
  if (label.includes('100') && label.includes('以上')) return 100;
  if (label === '100歳以上' || label === '100+') return 100;
  const match = label.match(/^(\d+)\s*歳?$/);
  if (match) {
    const age = parseInt(match[1], 10);
    if (label.includes('以上') && age < 100) return -1; // skip aggregate groups
    return age >= 0 && age <= 100 ? age : -1;
  }
  return -1;
}

interface EStatValue {
  '$': string;
  '@tab'?: string;
  '@cat01'?: string;
  '@cat02'?: string;
  '@cat03'?: string;
  '@area'?: string;
  '@time'?: string;
  [key: string]: string | undefined;
}

interface EStatClass {
  '@id': string;
  '@name': string;
  CLASS: Array<{ '@code': string; '@name': string; '@level'?: string }> | { '@code': string; '@name': string; '@level'?: string };
}

async function fetchEstatData(): Promise<Record<number, { m: number[]; f: number[] }>> {
  const dataByYear: Record<number, { m: number[]; f: number[] }> = {};

  if (!APP_ID) {
    console.error('E_STAT_APP_ID is required.');
    console.error('Register at: https://www.e-stat.go.jp/api/api-info/api-guide');
    return dataByYear;
  }

  // Known statsDataId for population estimates by single year of age and sex
  // Try multiple known table IDs
  const statsDataIds = [
    '0003448237', // Population Estimates monthly
    '0003411595', // Population Estimates annual
    '0003312019', // Population by age (5-year) — fallback
  ];

  for (const statsDataId of statsDataIds) {
    console.log(`Trying statsDataId: ${statsDataId}...`);

    const baseUrl = 'https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData';
    const params = new URLSearchParams({
      appId: APP_ID,
      statsDataId,
      lang: 'J',
      limit: '100000',
      metaGetFlg: 'Y',
      cntGetFlg: 'N',
    });

    try {
      const response = await fetch(`${baseUrl}?${params}`);
      if (!response.ok) {
        console.warn(`  HTTP ${response.status}`);
        continue;
      }

      const json = await response.json();
      const result = json.GET_STATS_DATA;
      if (!result || result.RESULT?.STATUS !== 0) {
        console.warn(`  API error: ${result?.RESULT?.ERROR_MSG || 'unknown'}`);
        continue;
      }

      const statData = result.STATISTICAL_DATA;
      if (!statData) continue;

      // Build category lookups
      const classInfo = statData.CLASS_INF?.CLASS_OBJ;
      if (!classInfo) continue;

      const classArray: EStatClass[] = Array.isArray(classInfo) ? classInfo : [classInfo];
      const categoryMaps: Record<string, Record<string, string>> = {};

      for (const cls of classArray) {
        const id = cls['@id'];
        const categories = Array.isArray(cls.CLASS) ? cls.CLASS : [cls.CLASS];
        categoryMaps[id] = {};
        for (const cat of categories) {
          if (cat) categoryMaps[id][cat['@code']] = cat['@name'] || '';
        }
      }

      // Parse values
      const values: EStatValue[] = (() => {
        const v = statData.DATA_INF?.VALUE;
        if (!v) return [];
        return Array.isArray(v) ? v : [v];
      })();

      if (values.length === 0) {
        console.warn('  No data values');
        continue;
      }

      console.log(`  Found ${values.length} data points`);

      for (const val of values) {
        const numValue = parseInt(val['$'], 10);
        if (isNaN(numValue)) continue;

        let sex: 'm' | 'f' | null = null;
        let age = -1;
        let year = -1;

        // Inspect each attribute to find sex, age, time
        for (const [key, code] of Object.entries(val)) {
          if (key === '$' || code === undefined) continue;
          const attrKey = key.replace('@', '');

          // Time
          if (attrKey === 'time') {
            const yearMatch = String(code).match(/(\d{4})/);
            if (yearMatch) year = parseInt(yearMatch[1], 10);
            continue;
          }

          const label = categoryMaps[attrKey]?.[String(code)] || '';

          // Sex detection
          if (label === '男' || label.includes('男性') || label === '男性人口') sex = 'm';
          else if (label === '女' || label.includes('女性') || label === '女性人口') sex = 'f';

          // Age detection
          if (label.includes('歳') || label.includes('才')) {
            const parsed = parseAgeLabel(label);
            if (parsed >= 0) age = parsed;
          }
        }

        if (sex && age >= 0 && year > 0) {
          if (!dataByYear[year]) {
            dataByYear[year] = { m: emptyAgeBins(), f: emptyAgeBins() };
          }
          // e-Stat population data may be in thousands — check magnitude
          dataByYear[year][sex][age] += numValue;
        }
      }

      if (Object.keys(dataByYear).length > 0) {
        console.log(`  Successfully parsed data for ${Object.keys(dataByYear).length} years`);
        break; // Found working dataset
      }
    } catch (err) {
      console.error(`  Error: ${err}`);
    }

    await delay(RATE_LIMIT_MS);
  }

  return dataByYear;
}

async function main() {
  console.log('Japan e-Stat Data Fetcher');
  console.log(`Output: ${OUTPUT_DIR}\n`);

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const dataByYear = await fetchEstatData();

  const years = Object.keys(dataByYear)
    .map(Number)
    .filter(y => {
      const d = dataByYear[y];
      return d.m.some(v => v > 0) || d.f.some(v => v > 0);
    })
    .sort((a, b) => a - b);

  if (years.length === 0) {
    console.error('\nNo data fetched from e-Stat.');
    console.error('Make sure E_STAT_APP_ID is set correctly.');
    return;
  }

  const validData: Record<number, { m: number[]; f: number[] }> = {};
  for (const y of years) validData[y] = dataByYear[y];

  const compactData: CompactCountryData = {
    geo: 'JP',
    name: 'Japan',
    source: SOURCE,
    license: LICENSE,
    lastUpdated: new Date().toISOString().split('T')[0],
    years,
    data: validData,
  };

  const filePath = join(OUTPUT_DIR, 'JP.json');
  writeFileSync(filePath, JSON.stringify(compactData));
  console.log(`\nSaved: ${filePath}`);
  console.log(`Years: ${years.length} (${years[0]}–${years[years.length - 1]})`);
}

main().catch(console.error);
