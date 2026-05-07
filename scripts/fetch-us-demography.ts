import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Papa from 'papaparse';

import { calculatePopulationSummary } from '../src/utils/populationSummary';
import type { PopulationAgeGroup } from '../src/types';

type CompactSeries = Array<[year: number, value: number]>;

interface CompactCountryData {
  geo: string;
  name: string;
  source: string;
  license: string;
  lastUpdated: string;
  years: number[];
  data: Record<number, { m: number[]; f: number[] }>;
}

interface CountryDemographyProfile {
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

interface NatalityRow {
  year: string;
  race: string;
  live_births: string;
}

interface LifeExpectancyRow {
  year: string;
  race: string;
  sex: string;
  average_life_expectancy: string;
}

const OUTPUT_PATH = join(import.meta.dirname, '..', 'public', 'data', 'demography', 'US.json');
const US_DATA_PATH = join(import.meta.dirname, '..', 'public', 'data', 'US.json');
const SOURCE = 'US Census Bureau Population Estimates Program and CDC/NCHS vital statistics reports';
const LICENSE = 'Public Domain';

const NATALITY_COUNTS_URL =
  'https://data.cdc.gov/resource/89yk-m38d.csv?$select=year,race,live_births&$where=race=%27All%20races%27&$order=year';
const LIFE_EXPECTANCY_URL =
  'https://data.cdc.gov/resource/w9j2-ggv5.csv?$select=year,race,sex,average_life_expectancy&$where=race=%27All%20Races%27%20AND%20sex=%27Both%20Sexes%27&$order=year';

/**
 * Recent manual supplements come from official CDC/NCHS reports because the API-backed
 * public datasets we can access here do not yet expose a continuous friendly series.
 *
 * Sources used for these points:
 * - Births in the United States, 2024
 * - Births in the United States, 2023
 * - Births in the United States, 2022
 * - Births in the United States, 2021
 * - Births: Provisional Data for 2020
 * - Mortality in the United States, 2024 / 2023 / 2022 / 2021 / 2020
 * - Census QuickFacts (population estimates for 2024 and 2025)
 */
const RECENT_POPULATION: CompactSeries = [
  [2024, 340110988],
  [2025, 341784857],
];

const RECENT_BIRTHS: CompactSeries = [
  [2019, 3747540],
  [2020, 3613647],
  [2021, 3664292],
  [2022, 3667758],
  [2023, 3596017],
  [2024, 3628934],
];

const RECENT_DEATHS: CompactSeries = [
  [2019, 2854838],
  [2020, 3383729],
  [2021, 3464231],
  [2022, 3279857],
  [2023, 3090964],
  [2024, 3072666],
];

const RECENT_TOTAL_FERTILITY: CompactSeries = [
  [2019, 1.705],
  [2020, 1.6375],
  [2021, 1.664],
  [2022, 1.6565],
  [2023, 1.621],
  [2024, 1.6265],
];

const RECENT_LIFE_EXPECTANCY_BIRTH: CompactSeries = [
  [2019, 78.8],
  [2020, 77.0],
  [2021, 76.4],
  [2022, 77.5],
  [2023, 78.4],
  [2024, 79.0],
];

const RECENT_LIFE_EXPECTANCY_65: CompactSeries = [
  [2019, 19.6],
  [2020, 18.5],
  [2021, 18.4],
  [2022, 18.9],
  [2023, 19.5],
  [2024, 19.7],
];

function toAgeGroups(male: number[], female: number[]): PopulationAgeGroup[] {
  return Array.from({ length: 101 }, (_, ageNumeric) => ({
    age: ageNumeric === 100 ? '100+' : String(ageNumeric),
    ageNumeric,
    male: male[ageNumeric] ?? 0,
    female: female[ageNumeric] ?? 0,
  }));
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : null;
}

async function fetchCsv<T>(url: string): Promise<T[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const text = await response.text();
  const parsed = Papa.parse<T>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse error for ${url}: ${parsed.errors[0].message}`);
  }

  return parsed.data;
}

function mergeSeries(base: CompactSeries, supplement: CompactSeries): CompactSeries {
  const merged = new Map<number, number>();
  for (const [year, value] of base) merged.set(year, value);
  for (const [year, value] of supplement) merged.set(year, value);
  return [...merged.entries()].sort((a, b) => a[0] - b[0]);
}

function deriveNaturalChange(births: CompactSeries, deaths: CompactSeries): CompactSeries {
  const deathMap = new Map(deaths);
  return births
    .filter(([year]) => deathMap.has(year))
    .map(([year, birthsValue]) => [year, birthsValue - (deathMap.get(year) ?? 0)] as [number, number]);
}

function loadCompactPopulationData(): CompactCountryData {
  return JSON.parse(readFileSync(US_DATA_PATH, 'utf8')) as CompactCountryData;
}

function buildSummarySeries(raw: CompactCountryData): Pick<
  CountryDemographyProfile['indicators'],
  'population' | 'medianAge' | 'oldAgeDependency'
> {
  const population: CompactSeries = [];
  const medianAge: CompactSeries = [];
  const oldAgeDependency: CompactSeries = [];

  for (const year of raw.years) {
    const yearData = raw.data[year];
    if (!yearData) continue;

    const metrics = calculatePopulationSummary(toAgeGroups(yearData.m, yearData.f), true);
    population.push([year, metrics.totalPopulation]);
    medianAge.push([year, metrics.medianAge]);
    oldAgeDependency.push([year, metrics.dependencyRatio]);
  }

  return {
    population: mergeSeries(population, RECENT_POPULATION),
    medianAge,
    oldAgeDependency,
  };
}

async function fetchHistoricalBirthCounts(): Promise<CompactSeries> {
  const rows = await fetchCsv<NatalityRow>(NATALITY_COUNTS_URL);
  return rows
    .map((row) => {
      const year = Number.parseInt(row.year, 10);
      const value = parseNumber(row.live_births);
      return Number.isFinite(year) && value !== null ? [year, value] as [number, number] : null;
    })
    .filter((entry): entry is [number, number] => entry !== null);
}

async function fetchHistoricalLifeExpectancyBirth(): Promise<CompactSeries> {
  const rows = await fetchCsv<LifeExpectancyRow>(LIFE_EXPECTANCY_URL);
  return rows
    .map((row) => {
      const year = Number.parseInt(row.year, 10);
      const value = parseNumber(row.average_life_expectancy);
      return Number.isFinite(year) && value !== null ? [year, value] as [number, number] : null;
    })
    .filter((entry): entry is [number, number] => entry !== null);
}

async function main() {
  console.log('US demography profile fetcher');

  const compactData = loadCompactPopulationData();
  const summarySeries = buildSummarySeries(compactData);

  const [historicalBirths, historicalLifeExpectancyBirth] = await Promise.all([
    fetchHistoricalBirthCounts(),
    fetchHistoricalLifeExpectancyBirth(),
  ]);

  const liveBirths = mergeSeries(historicalBirths, RECENT_BIRTHS);
  const deaths = RECENT_DEATHS;
  const naturalChange = deriveNaturalChange(liveBirths, deaths);
  const fertilityRate = RECENT_TOTAL_FERTILITY;
  const lifeExpectancyBirth = mergeSeries(historicalLifeExpectancyBirth, RECENT_LIFE_EXPECTANCY_BIRTH);
  const lifeExpectancy65 = RECENT_LIFE_EXPECTANCY_65;

  const profile: CountryDemographyProfile = {
    geo: 'US',
    name: 'United States',
    source: SOURCE,
    license: LICENSE,
    lastUpdated: new Date().toISOString().slice(0, 10),
    indicators: {
      population: summarySeries.population,
      medianAge: summarySeries.medianAge,
      oldAgeDependency: summarySeries.oldAgeDependency,
      liveBirths,
      deaths,
      naturalChange,
      netMigration: [],
      fertilityRate,
      meanAgeAtChildbirth: [],
      lifeExpectancyBirth,
      lifeExpectancy65,
    },
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(profile));
  console.log(`Saved ${OUTPUT_PATH}`);
  console.log(`Population years: ${profile.indicators.population[0]?.[0]}–${profile.indicators.population.at(-1)?.[0]}`);
  console.log(`Birth years: ${profile.indicators.liveBirths[0]?.[0]}–${profile.indicators.liveBirths.at(-1)?.[0]}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
