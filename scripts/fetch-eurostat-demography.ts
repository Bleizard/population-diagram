/**
 * Fetches compact demographic country profiles from Eurostat Statistics API.
 *
 * Data sources used:
 * - demo_gind: population change / births / deaths / migration
 * - demo_find: fertility indicators
 * - demo_pjanind: population structure indicators
 * - demo_mlexpec: life expectancy by age and sex
 *
 * Run:
 *   npx tsx scripts/fetch-eurostat-demography.ts
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { COUNTRIES } from './countries';

interface JsonStatResponse {
  id: string[];
  size: number[];
  dimension: Record<string, {
    category: {
      index: Record<string, number>;
      label?: Record<string, string>;
    };
  }>;
  value: Record<string, number>;
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

interface DemographyEntity {
  code: string;
  name: string;
}

const OUTPUT_DIR = join(import.meta.dirname, '..', 'public', 'data', 'demography');
const SOURCE = 'Eurostat (online data codes: demo_gind, demo_find, demo_pjanind, demo_mlexpec)';
const LICENSE = 'CC BY 4.0';
const RATE_LIMIT_MS = 500;
const MAX_RETRIES = 3;
const BENCHMARK_PROFILES: DemographyEntity[] = [
  { code: 'EU27_2020', name: 'European Union' },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildMultipliers(size: number[]): number[] {
  const multipliers = new Array(size.length);
  multipliers[size.length - 1] = 1;

  for (let i = size.length - 2; i >= 0; i -= 1) {
    multipliers[i] = multipliers[i + 1] * size[i + 1];
  }

  return multipliers;
}

function decodeFlatIndex(flatIndex: number, size: number[]): number[] {
  const multipliers = buildMultipliers(size);
  let remaining = flatIndex;
  const indices = new Array(size.length);

  for (let i = 0; i < size.length; i += 1) {
    indices[i] = Math.floor(remaining / multipliers[i]);
    remaining %= multipliers[i];
  }

  return indices;
}

function invertIndexMap(indexMap: Record<string, number>): Map<number, string> {
  const inverted = new Map<number, string>();
  for (const [code, index] of Object.entries(indexMap)) {
    inverted.set(index, code);
  }
  return inverted;
}

async function fetchJson(url: string): Promise<JsonStatResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json() as JsonStatResponse;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_RETRIES) {
        await delay(RATE_LIMIT_MS * attempt);
      }
    }
  }

  throw lastError ?? new Error('Unknown Eurostat fetch error');
}

function extractIndicatorSeries(
  json: JsonStatResponse,
  indicatorDimension: string,
  timeDimension: string
): Record<string, CompactSeries> {
  const indicatorIndex = json.id.indexOf(indicatorDimension);
  const timeIndex = json.id.indexOf(timeDimension);
  if (indicatorIndex < 0 || timeIndex < 0) {
    return {};
  }

  const indicatorCodes = invertIndexMap(json.dimension[indicatorDimension].category.index);
  const timeCodes = invertIndexMap(json.dimension[timeDimension].category.index);
  const buckets = new Map<string, Array<[number, number]>>();

  for (const [flatIndexString, rawValue] of Object.entries(json.value)) {
    if (rawValue === null || rawValue === undefined || Number.isNaN(rawValue)) continue;

    const decoded = decodeFlatIndex(Number(flatIndexString), json.size);
    const indicatorCode = indicatorCodes.get(decoded[indicatorIndex]);
    const yearCode = timeCodes.get(decoded[timeIndex]);
    if (!indicatorCode || !yearCode) continue;

    const year = Number(yearCode);
    if (!Number.isFinite(year)) continue;

    const bucket = buckets.get(indicatorCode) ?? [];
    bucket.push([year, Number(rawValue)]);
    buckets.set(indicatorCode, bucket);
  }

  return Object.fromEntries(
    [...buckets.entries()].map(([indicator, points]) => [
      indicator,
      points.sort((a, b) => a[0] - b[0]),
    ])
  );
}

function isProfileEmpty(profile: CompactCountryDemographyProfile): boolean {
  return Object.values(profile.indicators).every((series) => series.length === 0);
}

async function fetchCountryProfile(country: DemographyEntity): Promise<CompactCountryDemographyProfile | null> {
  const base = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';

  try {
    const [gind, find, pjanind, mlexpec] = await Promise.all([
      fetchJson(`${base}/demo_gind?geo=${country.code}&lang=en`),
      fetchJson(`${base}/demo_find?geo=${country.code}&lang=en`),
      fetchJson(`${base}/demo_pjanind?geo=${country.code}&lang=en`),
      fetchJson(`${base}/demo_mlexpec?geo=${country.code}&sex=T&age=Y_LT1&age=Y65&lang=en`),
    ]);

    const gindSeries = extractIndicatorSeries(gind, 'indic_de', 'time');
    const findSeries = extractIndicatorSeries(find, 'indic_de', 'time');
    const pjanindSeries = extractIndicatorSeries(pjanind, 'indic_de', 'time');
    const mlexpecSeries = extractIndicatorSeries(mlexpec, 'age', 'time');

    const profile: CompactCountryDemographyProfile = {
      geo: country.code,
      name: country.name,
      source: SOURCE,
      license: LICENSE,
      lastUpdated: new Date().toISOString().slice(0, 10),
      indicators: {
        population: gindSeries.JAN ?? [],
        medianAge: pjanindSeries.MEDAGEPOP ?? [],
        oldAgeDependency: pjanindSeries.OLDDEP1 ?? [],
        liveBirths: gindSeries.LBIRTH ?? [],
        deaths: gindSeries.DEATH ?? [],
        naturalChange: gindSeries.NATGROW ?? [],
        netMigration: gindSeries.MIGT ?? [],
        fertilityRate: findSeries.TOTFERRT ?? [],
        meanAgeAtChildbirth: findSeries.AGEMOTH ?? [],
        lifeExpectancyBirth: mlexpecSeries.Y_LT1 ?? [],
        lifeExpectancy65: mlexpecSeries.Y65 ?? [],
      },
    };

    return isProfileEmpty(profile) ? null : profile;
  } catch (error) {
    console.warn(`  Failed for ${country.code}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function main() {
  console.log('Eurostat country demography fetcher');
  console.log(`Countries: ${COUNTRIES.length}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let saved = 0;
  let skipped = 0;

  for (const [index, country] of COUNTRIES.entries()) {
    console.log(`[${index + 1}/${COUNTRIES.length}] ${country.flag} ${country.name} (${country.code})`);
    const profile = await fetchCountryProfile(country);

    if (!profile) {
      console.log('  Skipped (no profile data)\n');
      skipped += 1;
      await delay(RATE_LIMIT_MS);
      continue;
    }

    const filePath = join(OUTPUT_DIR, `${country.code}.json`);
    writeFileSync(filePath, JSON.stringify(profile));
    console.log('  Saved profile\n');
    saved += 1;
    await delay(RATE_LIMIT_MS);
  }

  for (const benchmark of BENCHMARK_PROFILES) {
    console.log(`[benchmark] ${benchmark.name} (${benchmark.code})`);
    const profile = await fetchCountryProfile(benchmark);

    if (!profile) {
      console.log('  Skipped (no benchmark data)\n');
      await delay(RATE_LIMIT_MS);
      continue;
    }

    const filePath = join(OUTPUT_DIR, `${benchmark.code}.json`);
    writeFileSync(filePath, JSON.stringify(profile));
    console.log('  Saved benchmark profile\n');
    saved += 1;
    await delay(RATE_LIMIT_MS);
  }

  console.log('─'.repeat(40));
  console.log(`Done. Saved: ${saved}, skipped: ${skipped}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
