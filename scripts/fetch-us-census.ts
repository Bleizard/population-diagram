/**
 * Fetches US population data from the US Census Bureau PEP (charv dataset).
 *
 * Vintage 2023: ages 0–84 single year + 85+ aggregate.
 * Since single-year data above 84 is unavailable, 85+ is placed in bin 100.
 *
 * API: https://api.census.gov/data/2023/pep/charv
 * License: Public Domain (U.S. Government Work)
 *
 * Run: npx tsx scripts/fetch-us-census.ts
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
const SOURCE = 'US Census Bureau, Population Estimates Program (PEP)';
const LICENSE = 'Public Domain';
const RATE_LIMIT_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function emptyAgeBins(): number[] {
  return new Array(101).fill(0);
}

/**
 * Parse Census AGE code to single-year age.
 * "0001" = age 0, "0100" = age 1, "0200" = age 2, ..., "8400" = age 84
 * "8599" = 85+ aggregate (mapped to bin 100)
 * Other codes (group aggregates like "0401", "0509") are skipped.
 */
function parseAgeCode(code: string): number {
  if (code === '0001') return 0;
  if (code === '8599') return 100; // 85+ aggregate → bin 100
  // Single year: XX00 where XX is 01–84
  if (code.length === 4 && code.endsWith('00') && code !== '0000') {
    const age = parseInt(code.substring(0, 2), 10);
    if (age >= 1 && age <= 84) return age;
  }
  return -1; // skip aggregates
}

async function fetchVintageYear(vintage: number, yearParam: string, calendarYear: number): Promise<{ m: number[]; f: number[] } | null> {
  const m = emptyAgeBins();
  const f = emptyAgeBins();
  let hasData = false;

  for (const sexInfo of [{ code: '1', key: 'm' as const }, { code: '2', key: 'f' as const }]) {
    const url = `https://api.census.gov/data/${vintage}/pep/charv?get=POP,SEX,AGE&for=us:1&YEAR=${yearParam}&SEX=${sexInfo.code}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404 || response.status === 400) return null;
        throw new Error(`HTTP ${response.status}`);
      }

      const data: string[][] = await response.json();
      const bins = sexInfo.key === 'm' ? m : f;

      for (let i = 1; i < data.length; i++) {
        const pop = parseInt(data[i][0], 10);
        const ageCode = data[i][2];
        if (isNaN(pop)) continue;

        const age = parseAgeCode(ageCode);
        if (age >= 0) {
          bins[age] += pop;
          hasData = true;
        }
      }
    } catch (err) {
      console.warn(`    Error for SEX=${sexInfo.code}: ${err}`);
      return null;
    }

    await delay(RATE_LIMIT_MS);
  }

  return hasData ? { m, f } : null;
}

async function main() {
  console.log('US Census Bureau Data Fetcher (PEP charv)');
  console.log(`Output: ${OUTPUT_DIR}\n`);

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const dataByYear: Record<number, { m: number[]; f: number[] }> = {};
  const years: number[] = [];

  // Vintage 2023 PEP: YEAR parameter
  // YEAR=2020 (base), 2021, 2022, 2023
  for (const calendarYear of [2020, 2021, 2022, 2023]) {
    console.log(`  Fetching ${calendarYear} (vintage 2023)...`);
    const result = await fetchVintageYear(2023, String(calendarYear), calendarYear);
    if (result) {
      dataByYear[calendarYear] = result;
      years.push(calendarYear);
      console.log(`    OK`);
    } else {
      console.log(`    No data`);
    }
    await delay(RATE_LIMIT_MS);
  }

  years.sort((a, b) => a - b);

  if (years.length === 0) {
    console.error('\nNo data fetched from Census API.');
    return;
  }

  const compactData: CompactCountryData = {
    geo: 'US',
    name: 'United States',
    source: SOURCE,
    license: LICENSE,
    lastUpdated: new Date().toISOString().split('T')[0],
    years,
    data: dataByYear,
  };

  const filePath = join(OUTPUT_DIR, 'US.json');
  writeFileSync(filePath, JSON.stringify(compactData));
  console.log(`\nSaved: ${filePath}`);
  console.log(`Years: ${years.length} (${years[0]}–${years[years.length - 1]})`);
}

main().catch(console.error);
