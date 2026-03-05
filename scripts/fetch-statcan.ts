/**
 * Fetches Canadian population data from Statistics Canada.
 *
 * Table 17-10-0005-01: Population estimates on July 1, by age and gender.
 * Downloads the CSV ZIP, extracts, and parses.
 *
 * License: Statistics Canada Open Licence
 *
 * Run: npx tsx scripts/fetch-statcan.ts
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';

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
const SOURCE = 'Statistics Canada, Table 17-10-0005-01';
const LICENSE = 'Statistics Canada Open Licence';

function emptyAgeBins(): number[] {
  return new Array(101).fill(0);
}

/**
 * Parse age from StatCan "Age group" column.
 * "0 years" → 0, "1 year" → 1, "99 years" → 99, "100 years and older" → 100
 */
function parseAge(ageStr: string): number {
  const trimmed = ageStr.replace(/^"|"$/g, '').trim();
  if (trimmed.includes('100 years and older')) return 100;
  const match = trimmed.match(/^(\d+)\s+(year|years)$/);
  if (match) {
    const age = parseInt(match[1], 10);
    return age >= 0 && age <= 100 ? age : -1;
  }
  return -1; // skip aggregated groups like "0 to 4 years", "All ages"
}

async function main() {
  console.log('Statistics Canada Data Fetcher');
  console.log(`Output: ${OUTPUT_DIR}\n`);

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Download CSV ZIP
  const zipUrl = 'https://www150.statcan.gc.ca/n1/tbl/csv/17100005-eng.zip';
  const tmpDir = join(tmpdir(), 'statcan-pop');
  const zipPath = join(tmpDir, '17100005-eng.zip');

  mkdirSync(tmpDir, { recursive: true });

  console.log('Downloading CSV ZIP...');
  const response = await fetch(zipUrl);
  if (!response.ok) {
    console.error(`HTTP ${response.status}: ${response.statusText}`);
    return;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(zipPath, buffer);
  console.log(`  Downloaded: ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);

  // Unzip
  console.log('Extracting...');
  execSync(`unzip -o "${zipPath}" -d "${tmpDir}"`, { stdio: 'pipe' });

  // Read CSV
  const csvPath = join(tmpDir, '17100005.csv');
  if (!existsSync(csvPath)) {
    console.error('CSV file not found after extraction.');
    return;
  }

  console.log('Parsing CSV...');
  const csvContent = readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');

  // Parse header
  const header = lines[0].replace(/^\uFEFF/, ''); // strip BOM
  const cols = header.split(',').map(h => h.replace(/^"|"$/g, '').trim());

  const refDateIdx = cols.indexOf('REF_DATE');
  const geoIdx = cols.indexOf('GEO');
  const genderIdx = cols.indexOf('Gender');
  const ageIdx = cols.indexOf('Age group');
  const valueIdx = cols.indexOf('VALUE');

  if (refDateIdx === -1 || genderIdx === -1 || ageIdx === -1 || valueIdx === -1) {
    console.error('Missing expected columns in CSV.');
    console.error('Found columns:', cols);
    return;
  }

  const dataByYear: Record<number, { m: number[]; f: number[] }> = {};
  const yearsSet = new Set<number>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (fields are quoted)
    const fields = line.split(',').map(f => f.replace(/^"|"$/g, '').trim());

    const geo = fields[geoIdx];
    if (geo !== 'Canada') continue;

    const gender = fields[genderIdx];
    let sex: 'm' | 'f' | null = null;
    if (gender === 'Men+' || gender === 'Males') sex = 'm';
    else if (gender === 'Women+' || gender === 'Females') sex = 'f';
    if (!sex) continue;

    const ageStr = fields[ageIdx];
    const age = parseAge(ageStr);
    if (age < 0) continue;

    const year = parseInt(fields[refDateIdx], 10);
    if (isNaN(year)) continue;

    const value = parseInt(fields[valueIdx], 10);
    if (isNaN(value)) continue;

    yearsSet.add(year);
    if (!dataByYear[year]) {
      dataByYear[year] = { m: emptyAgeBins(), f: emptyAgeBins() };
    }
    dataByYear[year][sex][age] += value;
  }

  const years = Array.from(yearsSet)
    .filter(y => {
      const d = dataByYear[y];
      return d && (d.m.some(v => v > 0) || d.f.some(v => v > 0));
    })
    .sort((a, b) => a - b);

  if (years.length === 0) {
    console.error('No valid data parsed from CSV.');
    return;
  }

  const validData: Record<number, { m: number[]; f: number[] }> = {};
  for (const y of years) validData[y] = dataByYear[y];

  const compactData: CompactCountryData = {
    geo: 'CA',
    name: 'Canada',
    source: SOURCE,
    license: LICENSE,
    lastUpdated: new Date().toISOString().split('T')[0],
    years,
    data: validData,
  };

  const filePath = join(OUTPUT_DIR, 'CA.json');
  writeFileSync(filePath, JSON.stringify(compactData));
  console.log(`\nSaved: ${filePath}`);
  console.log(`Years: ${years.length} (${years[0]}–${years[years.length - 1]})`);

  // Cleanup
  try {
    execSync(`rm -rf "${tmpDir}"`, { stdio: 'pipe' });
  } catch { /* ignore */ }
}

main().catch(console.error);
