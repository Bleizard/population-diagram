import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import XLSX from 'xlsx';

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

const BASE_URL = 'https://www.abs.gov.au';
const OUTPUT_PATH = join(import.meta.dirname, '..', 'public', 'data', 'demography', 'AU.json');
const AU_DATA_PATH = join(import.meta.dirname, '..', 'public', 'data', 'AU.json');
const SOURCE = 'Australian Bureau of Statistics (ABS historical data cubes, SDMX API and life expectancy releases)';
const LICENSE = 'CC BY 4.0';

function toAgeGroups(male: number[], female: number[]): PopulationAgeGroup[] {
  const groups: PopulationAgeGroup[] = [];
  for (let age = 0; age <= 100; age += 1) {
    groups.push({
      age: age === 100 ? '100+' : String(age),
      ageNumeric: age,
      male: male[age] ?? 0,
      female: female[age] ?? 0,
    });
  }
  return groups;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseYearCell(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const rangeMatch = trimmed.match(/(\d{4})\s*-\s*(\d{4})$/);
  if (rangeMatch) return Number.parseInt(rangeMatch[2], 10);

  const singleMatch = trimmed.match(/(\d{4})/);
  return singleMatch ? Number.parseInt(singleMatch[1], 10) : null;
}

function buildSeriesFromRow(
  rows: unknown[][],
  headerRowIndex: number,
  rowMatcher: (row: unknown[]) => boolean,
  startColumnIndex: number
): CompactSeries {
  const header = rows[headerRowIndex] ?? [];
  const row = rows.find(rowMatcher);
  if (!row) return [];

  const series: CompactSeries = [];
  for (let col = startColumnIndex; col < header.length; col += 1) {
    const year = parseYearCell(header[col]);
    const rawValue = row[col];
    if (year === null || !isFiniteNumber(rawValue)) continue;
    series.push([year, rawValue]);
  }

  return series;
}

async function fetchWorkbookRows(url: string, preferredSheetPattern: RegExp): Promise<unknown[][]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch workbook ${url}: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: 'buffer' });
  const sheetName = workbook.SheetNames.find((name) => preferredSheetPattern.test(name)) ?? workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, blankrows: false });
}

function mergeSeries(base: CompactSeries, extra: CompactSeries): CompactSeries {
  const merged = new Map<number, number>();
  for (const [year, value] of base) merged.set(year, value);
  for (const [year, value] of extra) merged.set(year, value);
  return [...merged.entries()].sort((a, b) => a[0] - b[0]);
}

function deriveNaturalChange(births: CompactSeries, deaths: CompactSeries): CompactSeries {
  const deathMap = new Map(deaths);
  return births
    .filter(([year]) => deathMap.has(year))
    .map(([year, birthsValue]) => [year, birthsValue - (deathMap.get(year) ?? 0)] as [number, number]);
}

async function fetchAbsCsvSeries(url: string): Promise<CompactSeries> {
  const response = await fetch(url, {
    headers: { Accept: 'application/vnd.sdmx.data+csv;version=1.0.0' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ABS CSV ${url}: ${response.status}`);
  }

  const text = await response.text();
  const lines = text.trim().split('\n');
  if (lines.length <= 1) return [];

  const header = lines[0].split(',');
  const yearIndex = header.indexOf('TIME_PERIOD');
  const valueIndex = header.indexOf('OBS_VALUE');
  if (yearIndex === -1 || valueIndex === -1) return [];

  const series: CompactSeries = [];
  for (const line of lines.slice(1)) {
    const fields = line.split(',');
    const year = Number.parseInt(fields[yearIndex] ?? '', 10);
    const value = Number.parseFloat(fields[valueIndex] ?? '');
    if (!Number.isFinite(year) || !Number.isFinite(value)) continue;
    series.push([year, value]);
  }

  return series.sort((a, b) => a[0] - b[0]);
}

function getCompactPopulationData(): CompactCountryData {
  return JSON.parse(readFileSync(AU_DATA_PATH, 'utf8')) as CompactCountryData;
}

function getPopulationWeight(raw: CompactCountryData, year: number, ageIndex: number): { male: number; female: number } | null {
  const entry = raw.data[year];
  if (!entry) return null;
  return {
    male: entry.m[ageIndex] ?? 0,
    female: entry.f[ageIndex] ?? 0,
  };
}

function weightedAverage(male: number, female: number, maleWeight: number, femaleWeight: number): number {
  const totalWeight = maleWeight + femaleWeight;
  if (totalWeight <= 0) return (male + female) / 2;
  return ((male * maleWeight) + (female * femaleWeight)) / totalWeight;
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

  return { population, medianAge, oldAgeDependency };
}

async function buildHistoricalSeries() {
  const birthsWorkbook = await fetchWorkbookRows(
    `${BASE_URL}/statistics/people/population/historical-population/2021/HPDC4.xlsx`,
    /^Table 1$/
  );
  const deathsWorkbook = await fetchWorkbookRows(
    `${BASE_URL}/statistics/people/population/historical-population/2021/HPDC5.xlsx`,
    /^Table 1$/
  );
  const fertilityWorkbook = await fetchWorkbookRows(
    `${BASE_URL}/statistics/people/population/historical-population/2021/HPDC4.xlsx`,
    /^Table 3$/
  );
  const maternalAgeWorkbook = await fetchWorkbookRows(
    `${BASE_URL}/statistics/people/population/historical-population/2021/HPDC4.xlsx`,
    /^Table 8$/
  );
  const migrationWorkbook = await fetchWorkbookRows(
    `${BASE_URL}/statistics/people/population/historical-population/2021/HPDC7.xlsx`,
    /^Table 1$/
  );
  const lifeBirthWorkbook = await fetchWorkbookRows(
    `${BASE_URL}/statistics/people/population/historical-population/2021/HPDC6.xlsx`,
    /^Table 1$/
  );
  const lifeMaleWorkbook = await fetchWorkbookRows(
    `${BASE_URL}/statistics/people/population/historical-population/2021/HPDC6.xlsx`,
    /^Table 2$/
  );
  const lifeFemaleWorkbook = await fetchWorkbookRows(
    `${BASE_URL}/statistics/people/population/historical-population/2021/HPDC6.xlsx`,
    /^Table 6$/
  );

  return {
    liveBirths: buildSeriesFromRow(
      birthsWorkbook,
      4,
      (row) => row[0] === 'Person' && String(row[1]).includes('Australia'),
      2
    ),
    deaths: buildSeriesFromRow(
      deathsWorkbook,
      4,
      (row) => row[0] === 'Person' && String(row[1]).includes('Australia'),
      2
    ),
    fertilityRate: buildSeriesFromRow(
      fertilityWorkbook,
      4,
      (row) => row[0] === 'Total Fertility Rate',
      1
    ),
    meanAgeAtChildbirth: buildSeriesFromRow(
      maternalAgeWorkbook,
      4,
      (row) => row[0] === 'Australia',
      1
    ),
    netMigration: buildSeriesFromRow(
      migrationWorkbook,
      4,
      (row) => String(row[0]).includes('Australia'),
      1
    ),
    lifeBirthMale: buildSeriesFromRow(
      lifeBirthWorkbook,
      4,
      (row) => row[0] === 'Male' && String(row[1]).includes('Australia'),
      2
    ),
    lifeBirthFemale: buildSeriesFromRow(
      lifeBirthWorkbook,
      4,
      (row) => row[0] === 'Female' && String(row[1]).includes('Australia'),
      2
    ),
    life65Male: buildSeriesFromRow(
      lifeMaleWorkbook,
      4,
      (row) => row[0] === 65,
      1
    ),
    life65Female: buildSeriesFromRow(
      lifeFemaleWorkbook,
      4,
      (row) => row[0] === 65,
      1
    ),
  };
}

async function buildRecentLifeSeries(raw: CompactCountryData): Promise<{
  lifeExpectancyBirth: CompactSeries;
  lifeExpectancy65: CompactSeries;
}> {
  const windows = [
    { endYear: 2022, url: `${BASE_URL}/statistics/people/population/life-expectancy/2020-2022/3302055001DO001_20202022.xlsx` },
    { endYear: 2023, url: `${BASE_URL}/statistics/people/population/life-expectancy/2021-2023/3302055001DO001_20212023.xlsx` },
    { endYear: 2024, url: `${BASE_URL}/statistics/people/population/life-expectancy/2022-2024/3302055001DO001_20222024.xlsx` },
  ];

  const birthSeries: CompactSeries = [];
  const age65Series: CompactSeries = [];

  for (const window of windows) {
    const rows = await fetchWorkbookRows(window.url, /^Table(?: |_1\.)9$/);
    const birthRow = rows.find((row) => row[0] === 0);
    const age65Row = rows.find((row) => row[0] === 65);
    if (!birthRow || !age65Row) continue;

    const birthWeights = getPopulationWeight(raw, window.endYear, 0);
    const age65Weights = getPopulationWeight(raw, window.endYear, 65);
    if (!birthWeights || !age65Weights) continue;

    const maleBirth = Number(birthRow[4]);
    const femaleBirth = Number(birthRow[8]);
    const maleAge65 = Number(age65Row[4]);
    const femaleAge65 = Number(age65Row[8]);

    if (Number.isFinite(maleBirth) && Number.isFinite(femaleBirth)) {
      birthSeries.push([
        window.endYear,
        weightedAverage(maleBirth, femaleBirth, birthWeights.male, birthWeights.female),
      ]);
    }

    if (Number.isFinite(maleAge65) && Number.isFinite(femaleAge65)) {
      age65Series.push([
        window.endYear,
        weightedAverage(maleAge65, femaleAge65, age65Weights.male, age65Weights.female),
      ]);
    }
  }

  return {
    lifeExpectancyBirth: birthSeries,
    lifeExpectancy65: age65Series,
  };
}

function combineSexWeightedSeries(
  raw: CompactCountryData,
  male: CompactSeries,
  female: CompactSeries,
  ageIndex: number
): CompactSeries {
  const femaleMap = new Map(female);
  const series: CompactSeries = [];

  for (const [year, maleValue] of male) {
    const femaleValue = femaleMap.get(year);
    const weights = getPopulationWeight(raw, year, ageIndex);
    if (femaleValue === undefined || !weights) continue;
    series.push([
      year,
      weightedAverage(maleValue, femaleValue, weights.male, weights.female),
    ]);
  }

  return series;
}

async function main() {
  const raw = getCompactPopulationData();
  const summarySeries = buildSummarySeries(raw);
  const historical = await buildHistoricalSeries();

  const recentBirths = await fetchAbsCsvSeries(
    'https://api.data.abs.gov.au/data/BIRTHS_SUMMARY/1.AUS.A?startPeriod=2018&endPeriod=2024&dimensionAtObservation=AllDimensions'
  );
  const recentDeaths = await fetchAbsCsvSeries(
    'https://api.data.abs.gov.au/data/DEATHS_SUMMARY/4.3.AUS.A?startPeriod=2018&endPeriod=2024&dimensionAtObservation=AllDimensions'
  );
  const recentFertility = await fetchAbsCsvSeries(
    'https://api.data.abs.gov.au/data/FERTILITY_AGE_STATE/11.TOT.AUS.A?startPeriod=2018&endPeriod=2024&dimensionAtObservation=AllDimensions'
  );
  const recentMaternalAge = await fetchAbsCsvSeries(
    'https://api.data.abs.gov.au/data/CONFINEMENTS_NUPTIALITY/14.TOT.AUS.A?startPeriod=2018&endPeriod=2024&dimensionAtObservation=AllDimensions'
  );
  const recentMigration = await fetchAbsCsvSeries(
    'https://api.data.abs.gov.au/data/NOM_FY/3.TOT.3.AUS.A?startPeriod=2018&endPeriod=2025&dimensionAtObservation=AllDimensions'
  );

  const historicalLifeBirth = combineSexWeightedSeries(raw, historical.lifeBirthMale, historical.lifeBirthFemale, 0);
  const historicalLife65 = combineSexWeightedSeries(raw, historical.life65Male, historical.life65Female, 65);
  const recentLife = await buildRecentLifeSeries(raw);

  const liveBirths = mergeSeries(historical.liveBirths, recentBirths);
  const deaths = mergeSeries(historical.deaths, recentDeaths);
  const fertilityRate = mergeSeries(historical.fertilityRate, recentFertility);
  const meanAgeAtChildbirth = mergeSeries(historical.meanAgeAtChildbirth, recentMaternalAge);
  const netMigration = mergeSeries(historical.netMigration, recentMigration);
  const lifeExpectancyBirth = mergeSeries(historicalLifeBirth, recentLife.lifeExpectancyBirth);
  const lifeExpectancy65 = mergeSeries(historicalLife65, recentLife.lifeExpectancy65);

  const profile: CountryDemographyProfile = {
    geo: 'AU',
    name: 'Australia',
    source: SOURCE,
    license: LICENSE,
    lastUpdated: new Date().toISOString().split('T')[0],
    indicators: {
      population: summarySeries.population,
      medianAge: summarySeries.medianAge,
      oldAgeDependency: summarySeries.oldAgeDependency,
      liveBirths,
      deaths,
      naturalChange: deriveNaturalChange(liveBirths, deaths),
      netMigration,
      fertilityRate,
      meanAgeAtChildbirth,
      lifeExpectancyBirth,
      lifeExpectancy65,
    },
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(profile));
  console.log(`Saved ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
