/**
 * Rebuilds public/data/index.json from all country JSON files in public/data/.
 *
 * Reads each {CODE}.json file, extracts metadata, and writes index.json.
 *
 * Run: npx tsx scripts/build-index.ts
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { COUNTRIES } from './countries';

interface CompactCountryData {
  geo: string;
  name: string;
  source: string;
  license: string;
  lastUpdated: string;
  years: number[];
  data: Record<number, { m: number[]; f: number[] }>;
}

interface CountryIndexEntry {
  code: string;
  name: string;
  region: string;
  flag: string;
  years: number[];
  lastUpdated: string;
}

const DATA_DIR = join(import.meta.dirname, '..', 'public', 'data');

function main() {
  console.log('Building index.json from country data files...');
  console.log(`Data directory: ${DATA_DIR}\n`);

  if (!existsSync(DATA_DIR)) {
    console.error('Data directory does not exist.');
    return;
  }

  // Build a lookup from country code to metadata
  const countryMeta = new Map(COUNTRIES.map(c => [c.code, c]));

  // Find all JSON files (excluding index.json)
  const files = readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json') && f !== 'index.json')
    .sort();

  const index: CountryIndexEntry[] = [];

  for (const file of files) {
    const code = file.replace('.json', '');
    const filePath = join(DATA_DIR, file);

    try {
      const raw = readFileSync(filePath, 'utf-8');
      const data: CompactCountryData = JSON.parse(raw);

      const meta = countryMeta.get(code);
      if (!meta) {
        console.warn(`  ${code}: not found in COUNTRIES list, skipping`);
        continue;
      }

      index.push({
        code: meta.code,
        name: meta.name,
        region: meta.region,
        flag: meta.flag,
        years: data.years || [],
        lastUpdated: data.lastUpdated || new Date().toISOString().split('T')[0],
      });

      console.log(`  ${meta.flag} ${meta.code}: ${data.years?.length || 0} years`);
    } catch (err) {
      console.warn(`  ${code}: failed to read (${err})`);
    }
  }

  const indexPath = join(DATA_DIR, 'index.json');
  writeFileSync(indexPath, JSON.stringify(index, null, 2));

  console.log(`\nIndex written: ${indexPath}`);
  console.log(`Total countries: ${index.length}`);
}

main();
