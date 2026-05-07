import type { PopulationAgeGroup, TimeSeriesPopulationData } from '../../types';
import { calculatePopulationSummary, type PopulationSummaryMetrics } from '../../utils/populationSummary';

// ─── Типы ────────────────────────────────────────────────

export interface CountryIndexEntry {
  code: string;
  name: string;
  region: string;
  flag: string;
  years: number[];
  lastUpdated: string;
}

interface CompactCountryData {
  geo: string;
  name: string;
  source: string;
  license: string;
  lastUpdated: string;
  years: number[];
  data: Record<number, { m: number[]; f: number[] }>;
}

interface CountryDataMeta {
  source: string;
  license: string;
  lastUpdated: string;
}

export interface CountrySummaryEntry {
  year: number | null;
  source: string;
  license: string;
  lastUpdated: string;
  metrics: PopulationSummaryMetrics;
}

export type CountryDemographySeriesName =
  | 'population'
  | 'medianAge'
  | 'oldAgeDependency'
  | 'liveBirths'
  | 'deaths'
  | 'naturalChange'
  | 'netMigration'
  | 'fertilityRate'
  | 'meanAgeAtChildbirth'
  | 'lifeExpectancyBirth'
  | 'lifeExpectancy65';

export interface CountryDemographyPoint {
  year: number;
  value: number;
}

export interface CountryDemographyProfile {
  geo: string;
  name: string;
  source: string;
  license: string;
  lastUpdated: string;
  indicators: Record<CountryDemographySeriesName, CountryDemographyPoint[]>;
}

// ─── Кэш ─────────────────────────────────────────────────

const countryDataCache = new Map<string, TimeSeriesPopulationData>();
const countryDataMetaCache = new Map<string, CountryDataMeta>();
const countrySummaryCache = new Map<string, CountrySummaryEntry>();
const countryDemographyCache = new Map<string, CountryDemographyProfile | null>();
let indexCache: CountryIndexEntry[] | null = null;

const DEMOGRAPHY_PROFILE_ALIASES: Record<string, string> = {
  EU: 'EU27_2020',
};

// ─── Функции ─────────────────────────────────────────────

function getBaseUrl(): string {
  return import.meta.env.BASE_URL || '/';
}

/**
 * Загружает индекс всех доступных стран.
 */
export async function fetchCountryIndex(): Promise<CountryIndexEntry[]> {
  if (indexCache) return indexCache;

  const response = await fetch(`${getBaseUrl()}data/index.json`);
  if (!response.ok) throw new Error(`Failed to load country index: ${response.status}`);

  indexCache = await response.json();
  return indexCache!;
}

/**
 * Конвертирует компактные данные в массив PopulationAgeGroup.
 */
function convertToAgeGroups(m: number[], f: number[], geoCode?: string): PopulationAgeGroup[] {
  if (geoCode === 'US') {
    const groups: PopulationAgeGroup[] = [];
    for (let i = 0; i <= 84; i++) {
      groups.push({
        age: String(i),
        ageNumeric: i,
        male: m[i] || 0,
        female: f[i] || 0,
      });
    }

    groups.push({
      age: '85+',
      ageNumeric: 85,
      male: m[100] || 0,
      female: f[100] || 0,
    });

    return groups;
  }

  const groups: PopulationAgeGroup[] = [];
  for (let i = 0; i < 101; i++) {
    groups.push({
      age: i === 100 ? '100+' : String(i),
      ageNumeric: i,
      male: m[i] || 0,
      female: f[i] || 0,
    });
  }
  return groups;
}

/**
 * Загружает данные страны и конвертирует в TimeSeriesPopulationData.
 */
export async function fetchCountryData(code: string): Promise<TimeSeriesPopulationData> {
  const cached = countryDataCache.get(code);
  if (cached) return cached;

  const response = await fetch(`${getBaseUrl()}data/${code}.json`);
  if (!response.ok) throw new Error(`Failed to load data for ${code}: ${response.status}`);

  const raw: CompactCountryData = await response.json();

  const dataByYear: Record<number, PopulationAgeGroup[]> = {};
  for (const year of raw.years) {
    const yearData = raw.data[year];
    if (yearData) {
      dataByYear[year] = convertToAgeGroups(yearData.m, yearData.f, raw.geo);
    }
  }

  const result: TimeSeriesPopulationData = {
    title: raw.name,
    source: raw.source,
    geoCode: raw.geo,
    years: raw.years,
    dataByYear,
  };

  countryDataCache.set(code, result);
  countryDataMetaCache.set(code, {
    source: raw.source,
    license: raw.license,
    lastUpdated: raw.lastUpdated,
  });
  return result;
}

export async function fetchCountrySummary(code: string): Promise<CountrySummaryEntry> {
  const cached = countrySummaryCache.get(code);
  if (cached) return cached;

  const data = await fetchCountryData(code);
  const latestYear = [...data.years].reverse().find((year) => Array.isArray(data.dataByYear[year])) ?? null;
  const ageGroups = latestYear !== null ? data.dataByYear[latestYear] : [];

  const summary: CountrySummaryEntry = {
    year: latestYear,
    source: data.source ?? '',
    license: countryDataMetaCache.get(code)?.license ?? '',
    lastUpdated: countryDataMetaCache.get(code)?.lastUpdated ?? '',
    metrics: calculatePopulationSummary(ageGroups, data.hasGenderData !== false),
  };

  countrySummaryCache.set(code, summary);
  return summary;
}

export async function fetchCountryDemographyProfile(code: string): Promise<CountryDemographyProfile | null> {
  if (countryDemographyCache.has(code)) {
    return countryDemographyCache.get(code) ?? null;
  }

  const resolvedCode = DEMOGRAPHY_PROFILE_ALIASES[code] ?? code;
  const response = await fetch(`${getBaseUrl()}data/demography/${resolvedCode}.json`);
  if (response.status === 404) {
    countryDemographyCache.set(code, null);
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to load demography profile for ${code}: ${response.status}`);
  }

  const raw = await response.json() as Omit<CountryDemographyProfile, 'indicators'> & {
    indicators: Record<CountryDemographySeriesName, Array<[number, number]>>;
  };

  const profile: CountryDemographyProfile = {
    ...raw,
    indicators: Object.fromEntries(
      Object.entries(raw.indicators).map(([key, series]) => [
        key,
        series.map(([year, value]) => ({ year, value })),
      ])
    ) as CountryDemographyProfile['indicators'],
  };

  countryDemographyCache.set(code, profile);
  if (resolvedCode !== code) {
    countryDemographyCache.set(resolvedCode, profile);
  }
  return profile;
}
