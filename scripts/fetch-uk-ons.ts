/**
 * Fetches United Kingdom population data from official ONS mid-year estimate datasets.
 *
 * Sources:
 * - 2001–2020: ONS dataset edition "mid-2019-april-2020-geography"
 * - 2011–2022: ONS dataset edition "mid-2021-april-2022-geography"
 *
 * The ONS files expose ages 0..89 and a 90+ aggregate. To keep the pyramid usable,
 * the 90+ bucket is distributed across ages 90..100 using the EU aggregate age profile
 * for the matching year as a reference shape.
 *
 * Run:
 *   npx tsx scripts/fetch-uk-ons.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Papa from 'papaparse';
import { calculatePopulationSummary } from '../src/utils/populationSummary';
import type { PopulationAgeGroup } from '../src/types';

interface CompactCountryData {
  geo: string;
  name: string;
  source: string;
  license: string;
  lastUpdated: string;
  years: number[];
  data: Record<number, { m: number[]; f: number[] }>;
}

interface CompactCountryDemographyProfile {
  geo: string;
  name: string;
  source: string;
  license: string;
  lastUpdated: string;
  indicators: {
    population: Array<[year: number, value: number]>;
    medianAge: Array<[year: number, value: number]>;
    oldAgeDependency: Array<[year: number, value: number]>;
    liveBirths: Array<[year: number, value: number]>;
    deaths: Array<[year: number, value: number]>;
    naturalChange: Array<[year: number, value: number]>;
    netMigration: Array<[year: number, value: number]>;
    fertilityRate: Array<[year: number, value: number]>;
    meanAgeAtChildbirth: Array<[year: number, value: number]>;
    lifeExpectancyBirth: Array<[year: number, value: number]>;
    lifeExpectancy65: Array<[year: number, value: number]>;
  };
}

type SexKey = 'm' | 'f';

interface OnsRow {
  v4_0: string;
  Time: string;
  Geography: string;
  Sex: string;
  Age: string;
}

const OUTPUT_DIR = join(import.meta.dirname, '..', 'public', 'data');
const DEMOGRAPHY_DIR = join(OUTPUT_DIR, 'demography');
const HISTORIC_URL = 'https://download.ons.gov.uk/downloads/datasets/mid-year-pop-est/editions/mid-2019-april-2020-geography/versions/3.csv';
const RECENT_URL = 'https://download.ons.gov.uk/downloads/datasets/mid-year-pop-est/editions/mid-2021-april-2022-geography/versions/2.csv';
const SOURCE = 'Office for National Statistics (mid-year population estimates)';
const LICENSE = 'Open Government Licence v3.0';

function emptyAgeBins(): number[] {
  return new Array(101).fill(0);
}

function getYearData(
  dataByYear: Record<number, { m: number[]; f: number[] }>,
  year: number,
) {
  if (!dataByYear[year]) {
    dataByYear[year] = { m: emptyAgeBins(), f: emptyAgeBins() };
  }
  return dataByYear[year];
}

function allocateByWeights(total: number, weights: number[]): number[] {
  if (total <= 0) return new Array(weights.length).fill(0);
  const sum = weights.reduce((acc, value) => acc + value, 0);
  const normalized = sum > 0 ? weights.map((value) => value / sum) : weights.map(() => 1 / weights.length);
  const raw = normalized.map((value) => value * total);
  const floored = raw.map((value) => Math.floor(value));
  let remainder = total - floored.reduce((acc, value) => acc + value, 0);

  const rankedFractions = raw
    .map((value, index) => ({ index, fraction: value - floored[index] }))
    .sort((a, b) => b.fraction - a.fraction);

  for (const entry of rankedFractions) {
    if (remainder <= 0) break;
    floored[entry.index] += 1;
    remainder -= 1;
  }

  return floored;
}

function parseAge(age: string): number | '90+' | null {
  if (age === 'Total') return null;
  if (age === '90+') return '90+';
  const numericAge = Number(age);
  return Number.isInteger(numericAge) && numericAge >= 0 && numericAge <= 89 ? numericAge : null;
}

function ageGroupsFromBins(yearData: { m: number[]; f: number[] }): PopulationAgeGroup[] {
  return Array.from({ length: 101 }, (_, ageNumeric) => ({
    age: ageNumeric === 100 ? '100+' : String(ageNumeric),
    ageNumeric,
    male: yearData.m[ageNumeric] ?? 0,
    female: yearData.f[ageNumeric] ?? 0,
  }));
}

async function fetchCsv(url: string): Promise<OnsRow[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }

  const text = await response.text();
  const parsed = Papa.parse<OnsRow>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse error for ${url}: ${parsed.errors[0].message}`);
  }

  return parsed.data;
}

function loadEuReference(): CompactCountryData {
  const filePath = join(OUTPUT_DIR, 'EU.json');
  return JSON.parse(readFileSync(filePath, 'utf-8')) as CompactCountryData;
}

function getReferenceWeights(
  reference: CompactCountryData,
  year: number,
  sex: SexKey,
): number[] {
  const referenceYears = reference.years;
  const nearestYear = referenceYears.reduce((best, current) => (
    Math.abs(current - year) < Math.abs(best - year) ? current : best
  ), referenceYears[0]);
  const bins = reference.data[nearestYear]?.[sex] ?? emptyAgeBins();
  const weights = bins.slice(90, 101);
  const sum = weights.reduce((acc, value) => acc + value, 0);

  if (sum > 0) return weights;

  return [18, 16, 14, 12, 10, 8, 7, 6, 4, 3, 2];
}

async function main() {
  console.log('ONS UK population fetcher');

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  if (!existsSync(DEMOGRAPHY_DIR)) {
    mkdirSync(DEMOGRAPHY_DIR, { recursive: true });
  }

  const dataByYear: Record<number, { m: number[]; f: number[] }> = {};
  const ninetyPlusTotals = new Map<string, number>();
  const euReference = loadEuReference();

  for (const url of [HISTORIC_URL, RECENT_URL]) {
    console.log(`Fetching ${url}`);
    const rows = await fetchCsv(url);

    for (const row of rows) {
      if (row.Geography !== 'UNITED KINGDOM') continue;

      const sex: SexKey | null = row.Sex === 'Male' ? 'm' : row.Sex === 'Female' ? 'f' : null;
      if (!sex) continue;

      const year = Number(row.Time);
      if (!Number.isInteger(year)) continue;

      const population = Number(row.v4_0);
      if (!Number.isFinite(population)) continue;

      const age = parseAge(String(row.Age).trim());
      if (age === null) continue;

      if (age === '90+') {
        ninetyPlusTotals.set(`${year}:${sex}`, population);
        continue;
      }

      const yearData = getYearData(dataByYear, year);
      yearData[sex][age] = population;
    }
  }

  for (const [key, total] of ninetyPlusTotals.entries()) {
    const [yearString, sex] = key.split(':') as [string, SexKey];
    const year = Number(yearString);
    const weights = getReferenceWeights(euReference, year, sex);
    const allocated = allocateByWeights(total, weights);
    const yearData = getYearData(dataByYear, year);

    for (let offset = 0; offset <= 10; offset += 1) {
      yearData[sex][90 + offset] = allocated[offset];
    }
  }

  const years = Object.keys(dataByYear)
    .map((year) => Number(year))
    .filter((year) => Number.isFinite(year))
    .sort((a, b) => a - b);

  const compactData: CompactCountryData = {
    geo: 'UK',
    name: 'United Kingdom',
    source: SOURCE,
    license: LICENSE,
    lastUpdated: new Date().toISOString().slice(0, 10),
    years,
    data: Object.fromEntries(years.map((year) => [year, dataByYear[year]])),
  };

  const demographyProfile: CompactCountryDemographyProfile = {
    geo: 'UK',
    name: 'United Kingdom',
    source: SOURCE,
    license: LICENSE,
    lastUpdated: compactData.lastUpdated,
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

  for (const year of years) {
    const summary = calculatePopulationSummary(ageGroupsFromBins(dataByYear[year]), true);
    demographyProfile.indicators.population.push([year, summary.totalPopulation]);

    if (summary.medianAge !== null) {
      demographyProfile.indicators.medianAge.push([year, summary.medianAge]);
    }
    if (summary.dependencyRatio !== null) {
      demographyProfile.indicators.oldAgeDependency.push([year, summary.dependencyRatio]);
    }
  }

  writeFileSync(join(OUTPUT_DIR, 'UK.json'), JSON.stringify(compactData));
  writeFileSync(join(DEMOGRAPHY_DIR, 'UK.json'), JSON.stringify(demographyProfile));

  console.log(`Saved ${join(OUTPUT_DIR, 'UK.json')}`);
  console.log(`Saved ${join(DEMOGRAPHY_DIR, 'UK.json')}`);
  console.log(`Years: ${years[0]}–${years[years.length - 1]} (${years.length})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
