/**
 * Fetches Australian population data from the ABS SDMX API.
 *
 * Dataflow: ERP_Q (Estimated Resident Population, quarterly)
 * Dimensions: MEASURE=1(persons), SEX=1(male)/2(female), AGE=0-100, REGION=AUS, FREQ=Q
 * Uses Q3 (September quarter, reference date ~June 30) for annual snapshots.
 *
 * API: https://api.data.abs.gov.au/
 * License: CC BY 3.0 AU
 *
 * Run: npx tsx scripts/fetch-abs.ts
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
const SOURCE = 'Australian Bureau of Statistics (ABS)';
const LICENSE = 'CC BY 3.0 AU';
const RATE_LIMIT_MS = 1000;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function emptyAgeBins(): number[] {
  return new Array(101).fill(0);
}

async function main() {
  console.log('ABS Australia Data Fetcher (SDMX CSV)');
  console.log(`Output: ${OUTPUT_DIR}\n`);

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const dataByYear: Record<number, { m: number[]; f: number[] }> = {};
  const yearsSet = new Set<number>();

  // Build age list: 0,1,2,...,100
  const ages = Array.from({ length: 101 }, (_, i) => String(i)).join('+');

  // Fetch males and females separately to avoid too-large requests
  for (const sexInfo of [{ code: '1', key: 'm' as const, label: 'males' }, { code: '2', key: 'f' as const, label: 'females' }]) {
    console.log(`  Fetching ${sexInfo.label}...`);

    // MEASURE=1 (persons), SEX=1or2, AGE=0-100, REGION=AUS, FREQ=Q
    const url = `https://api.data.abs.gov.au/data/ERP_Q/1.${sexInfo.code}.${ages}.AUS.Q?startPeriod=1970&endPeriod=2025&dimensionAtObservation=AllDimensions`;

    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/vnd.sdmx.data+csv;version=1.0.0' }
      });

      if (!response.ok) {
        console.warn(`    HTTP ${response.status}`);
        await delay(RATE_LIMIT_MS);
        continue;
      }

      const csv = await response.text();
      const lines = csv.split('\n');

      // Header: DATAFLOW,MEASURE,SEX,AGE,REGION,FREQ,TIME_PERIOD,OBS_VALUE,...
      const header = lines[0].split(',');
      const ageColIdx = header.indexOf('AGE');
      const timeColIdx = header.indexOf('TIME_PERIOD');
      const valueColIdx = header.indexOf('OBS_VALUE');

      if (ageColIdx === -1 || timeColIdx === -1 || valueColIdx === -1) {
        console.warn('    Unexpected CSV header:', header.join(','));
        continue;
      }

      let rowCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const fields = line.split(',');
        const ageStr = fields[ageColIdx];
        const timePeriod = fields[timeColIdx];
        const value = parseFloat(fields[valueColIdx]);

        if (isNaN(value)) continue;

        // Parse age
        let age: number;
        if (ageStr === 'TOT' || ageStr === '8599') continue; // skip totals/aggregates
        age = parseInt(ageStr, 10);
        if (isNaN(age) || age < 0) continue;
        if (age > 100) age = 100;

        // Parse time period — use Q3 (Sep quarter, closest to June 30 reference)
        const yearMatch = timePeriod.match(/(\d{4})-Q3/);
        if (!yearMatch) continue;
        const year = parseInt(yearMatch[1], 10);

        yearsSet.add(year);
        if (!dataByYear[year]) {
          dataByYear[year] = { m: emptyAgeBins(), f: emptyAgeBins() };
        }
        dataByYear[year][sexInfo.key][age] += Math.round(value);
        rowCount++;
      }

      console.log(`    Parsed ${rowCount} rows`);
    } catch (err) {
      console.error(`    Error: ${err}`);
    }

    await delay(RATE_LIMIT_MS);
  }

  const years = Array.from(yearsSet)
    .filter(y => {
      const d = dataByYear[y];
      return d && (d.m.some(v => v > 0) || d.f.some(v => v > 0));
    })
    .sort((a, b) => a - b);

  if (years.length === 0) {
    console.error('\nNo data fetched from ABS.');
    return;
  }

  const validData: Record<number, { m: number[]; f: number[] }> = {};
  for (const y of years) validData[y] = dataByYear[y];

  const compactData: CompactCountryData = {
    geo: 'AU',
    name: 'Australia',
    source: SOURCE,
    license: LICENSE,
    lastUpdated: new Date().toISOString().split('T')[0],
    years,
    data: validData,
  };

  const filePath = join(OUTPUT_DIR, 'AU.json');
  writeFileSync(filePath, JSON.stringify(compactData));
  console.log(`\nSaved: ${filePath}`);
  console.log(`Years: ${years.length} (${years[0]}–${years[years.length - 1]})`);
}

main().catch(console.error);
