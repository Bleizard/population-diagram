/**
 * Fetches compact population pyramids and demography profiles from the
 * U.S. Census Bureau International Database (IDB).
 *
 * Security:
 * - Reads the API key only from process.env.CENSUS_API_KEY.
 * - Never writes the key to disk.
 *
 * Defaults:
 * - Imports only former USSR countries missing from the current dataset.
 * - Cuts the series at 2024 by default to avoid future projections.
 *
 * Run:
 *   CENSUS_API_KEY=... npx tsx scripts/fetch-idb.ts
 *   CENSUS_API_KEY=... ONLY=UA,GE npx tsx scripts/fetch-idb.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { COUNTRIES, type CountryMeta } from './countries';

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

type CompactSeries = Array<[year: number, value: number]>;

interface CompactCountryDemographyProfile {
  geo: string;
  name: string;
  source: string;
  license: string;
  lastUpdated: string;
  indicators: {
    population: CompactSeries;
    medianAge: CompactSeries;
    oldAgeDependency: CompactSeries;
    liveBirths: CompactSeries;
    deaths: CompactSeries;
    naturalChange: CompactSeries;
    netMigration: CompactSeries;
    fertilityRate: CompactSeries;
    meanAgeAtChildbirth: CompactSeries;
    lifeExpectancyBirth: CompactSeries;
    lifeExpectancy65: CompactSeries;
  };
}

type ApiTable = string[][];

const OUTPUT_DIR = join(import.meta.dirname, '..', 'public', 'data');
const DEMOGRAPHY_DIR = join(OUTPUT_DIR, 'demography');
const INDEX_PATH = join(OUTPUT_DIR, 'index.json');
const SOURCE = 'U.S. Census Bureau International Database (IDB)';
const LICENSE = 'Public Domain';
const RATE_LIMIT_MS = 250;
const MAX_RETRIES = 3;
const MAX_YEAR = Number.parseInt(process.env.IDB_MAX_YEAR ?? '2024', 10);
const IDB_CODES = new Set([
  'AM', 'AZ', 'BY', 'GE', 'KG', 'KZ', 'RU', 'TJ', 'TM', 'UA', 'UZ',
  'IL', 'AE', 'SA', 'OM', 'QA',
  'JP', 'KR', 'MN', 'ID', 'TH', 'VN', 'MY', 'SG', 'PH',
  'EG', 'ZA', 'NG', 'KE', 'ET', 'MA', 'DZ', 'TN', 'GH', 'BW',
  'BR', 'AR', 'CL', 'CO', 'PE', 'UY',
]);
const IDB_COUNTRIES = COUNTRIES.filter((country) => IDB_CODES.has(country.code));

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emptyAgeBins(): number[] {
  return new Array(101).fill(0);
}

function getApiKey(): string {
  const apiKey = process.env.CENSUS_API_KEY?.trim() ?? '';
  if (!apiKey) {
    throw new Error('Missing CENSUS_API_KEY environment variable.');
  }
  return apiKey;
}

async function fetchApiTable(url: URL): Promise<ApiTable> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json() as ApiTable;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_RETRIES) {
        await delay(RATE_LIMIT_MS * attempt);
      }
    }
  }

  throw lastError ?? new Error('Unknown Census IDB error');
}

function buildSingleYearUrl(countryCode: string, apiKey: string): URL {
  const url = new URL('https://api.census.gov/data/timeseries/idb/1year');
  url.searchParams.set('get', 'NAME,GENC,POP');
  url.searchParams.set('YR', `1950:${MAX_YEAR}`);
  url.searchParams.set('AGE', '0:100');
  url.searchParams.set('SEX', '1,2');
  url.searchParams.set('for', `genc standard countries and areas:${countryCode}`);
  url.searchParams.set('key', apiKey);
  return url;
}

function buildFiveYearUrl(countryCode: string, apiKey: string): URL {
  const url = new URL('https://api.census.gov/data/timeseries/idb/5year');
  url.searchParams.set('get', 'NAME,GENC,POP,MEDAGE,DEPND65_,BIRTHS,DEATHS,NATINCR,NIM,TFR,E0');
  url.searchParams.set('YR', `1950:${MAX_YEAR}`);
  url.searchParams.set('for', `genc standard countries and areas:${countryCode}`);
  url.searchParams.set('key', apiKey);
  return url;
}

function indexByHeader(header: string[]): Record<string, number> {
  return Object.fromEntries(header.map((name, index) => [name, index]));
}

function parseIntOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  const numeric = Number.parseInt(normalized, 10);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseFloatOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  const numeric = Number.parseFloat(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function pushSeriesValue(target: CompactSeries, year: number, value: number | null) {
  if (value === null) return;
  target.push([year, value]);
}

function parseCompactCountryData(table: ApiTable, country: CountryMeta): CompactCountryData {
  const [header, ...rows] = table;
  const headerIndex = indexByHeader(header);

  const yearIndex = headerIndex.YR;
  const ageIndex = headerIndex.AGE;
  const sexIndex = headerIndex.SEX;
  const populationIndex = headerIndex.POP;

  const dataByYear: Record<number, { m: number[]; f: number[] }> = {};

  for (const row of rows) {
    const year = parseIntOrNull(row[yearIndex]);
    const age = parseIntOrNull(row[ageIndex]);
    const sex = parseIntOrNull(row[sexIndex]);
    const population = parseIntOrNull(row[populationIndex]);

    if (year === null || age === null || sex === null || population === null) continue;
    if (year > MAX_YEAR || age < 0 || age > 100) continue;

    if (!dataByYear[year]) {
      dataByYear[year] = { m: emptyAgeBins(), f: emptyAgeBins() };
    }

    if (sex === 1) dataByYear[year].m[age] = population;
    if (sex === 2) dataByYear[year].f[age] = population;
  }

  const years = Object.keys(dataByYear)
    .map((value) => Number(value))
    .filter((year) => Number.isFinite(year))
    .sort((a, b) => a - b)
    .filter((year) => {
      const entry = dataByYear[year];
      return entry.m.some((value) => value > 0) || entry.f.some((value) => value > 0);
    });

  const filteredData = Object.fromEntries(years.map((year) => [year, dataByYear[year]]));

  return {
    geo: country.code,
    name: country.name,
    source: SOURCE,
    license: LICENSE,
    lastUpdated: new Date().toISOString().slice(0, 10),
    years,
    data: filteredData,
  };
}

function parseDemographyProfile(table: ApiTable, country: CountryMeta): CompactCountryDemographyProfile {
  const [header, ...rows] = table;
  const headerIndex = indexByHeader(header);

  const profile: CompactCountryDemographyProfile = {
    geo: country.code,
    name: country.name,
    source: SOURCE,
    license: LICENSE,
    lastUpdated: new Date().toISOString().slice(0, 10),
    indicators: {
      population: [],
      medianAge: [],
      oldAgeDependency: [],
      liveBirths: [],
      deaths: [],
      naturalChange: [],
      netMigration: [],
      fertilityRate: [],
      meanAgeAtChildbirth: [],
      lifeExpectancyBirth: [],
      lifeExpectancy65: [],
    },
  };

  for (const row of rows) {
    const year = parseIntOrNull(row[headerIndex.YR]);
    if (year === null || year > MAX_YEAR) continue;

    pushSeriesValue(profile.indicators.population, year, parseIntOrNull(row[headerIndex.POP]));
    pushSeriesValue(profile.indicators.medianAge, year, parseFloatOrNull(row[headerIndex.MEDAGE]));
    pushSeriesValue(profile.indicators.oldAgeDependency, year, parseFloatOrNull(row[headerIndex['DEPND65_']]));
    pushSeriesValue(profile.indicators.liveBirths, year, parseIntOrNull(row[headerIndex.BIRTHS]));
    pushSeriesValue(profile.indicators.deaths, year, parseIntOrNull(row[headerIndex.DEATHS]));
    pushSeriesValue(profile.indicators.naturalChange, year, parseIntOrNull(row[headerIndex.NATINCR]));
    pushSeriesValue(profile.indicators.netMigration, year, parseIntOrNull(row[headerIndex.NIM]));
    pushSeriesValue(profile.indicators.fertilityRate, year, parseFloatOrNull(row[headerIndex.TFR]));
    pushSeriesValue(profile.indicators.lifeExpectancyBirth, year, parseFloatOrNull(row[headerIndex.E0]));
  }

  return profile;
}

async function fetchCountryBundle(country: CountryMeta, apiKey: string): Promise<{
  compact: CompactCountryData;
  demography: CompactCountryDemographyProfile;
}> {
  const [singleYearTable, fiveYearTable] = await Promise.all([
    fetchApiTable(buildSingleYearUrl(country.code, apiKey)),
    fetchApiTable(buildFiveYearUrl(country.code, apiKey)),
  ]);

  return {
    compact: parseCompactCountryData(singleYearTable, country),
    demography: parseDemographyProfile(fiveYearTable, country),
  };
}

function ensureDirectories() {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  if (!existsSync(DEMOGRAPHY_DIR)) mkdirSync(DEMOGRAPHY_DIR, { recursive: true });
}

function getFilteredCountries(): CountryMeta[] {
  const onlyCodes = new Set(
    (process.env.ONLY ?? '')
      .split(',')
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean)
  );

  if (onlyCodes.size === 0) return IDB_COUNTRIES;
  return IDB_COUNTRIES.filter((country) => onlyCodes.has(country.code));
}

function loadIndex(): CountryIndexEntry[] {
  if (!existsSync(INDEX_PATH)) return [];
  return JSON.parse(readFileSync(INDEX_PATH, 'utf-8')) as CountryIndexEntry[];
}

function saveIndex(updatedEntries: CountryIndexEntry[]) {
  const order = new Map(COUNTRIES.map((country, index) => [country.code, index]));
  const sorted = [...updatedEntries].sort(
    (left, right) => (order.get(left.code) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.code) ?? Number.MAX_SAFE_INTEGER)
  );
  writeFileSync(INDEX_PATH, JSON.stringify(sorted, null, 2));
}

async function main() {
  const apiKey = getApiKey();
  const countries = getFilteredCountries();

  console.log('Census IDB importer');
  console.log(`Countries: ${countries.length}`);
  console.log(`Max year: ${MAX_YEAR}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  ensureDirectories();

  const indexMap = new Map(loadIndex().map((entry) => [entry.code, entry]));
  let successCount = 0;

  for (const [index, country] of countries.entries()) {
    console.log(`[${index + 1}/${countries.length}] ${country.flag} ${country.name} (${country.code})`);

    const { compact, demography } = await fetchCountryBundle(country, apiKey);

    writeFileSync(join(OUTPUT_DIR, `${country.code}.json`), JSON.stringify(compact));
    writeFileSync(join(DEMOGRAPHY_DIR, `${country.code}.json`), JSON.stringify(demography));

    indexMap.set(country.code, {
      code: country.code,
      name: country.name,
      region: country.region,
      flag: country.flag,
      years: compact.years,
      lastUpdated: compact.lastUpdated,
    });

    successCount += 1;
    console.log(`  Saved ${compact.years.length} years (${compact.years[0]}-${compact.years[compact.years.length - 1]})\n`);
    await delay(RATE_LIMIT_MS);
  }

  saveIndex([...indexMap.values()]);

  console.log('─'.repeat(40));
  console.log(`Done. Saved: ${successCount}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`IDB import failed: ${message}`);
  process.exitCode = 1;
});
