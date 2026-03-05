import type { PopulationAgeGroup, TimeSeriesPopulationData } from '../../types';

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

// ─── Кэш ─────────────────────────────────────────────────

const countryDataCache = new Map<string, TimeSeriesPopulationData>();
let indexCache: CountryIndexEntry[] | null = null;

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
function convertToAgeGroups(m: number[], f: number[]): PopulationAgeGroup[] {
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
      dataByYear[year] = convertToAgeGroups(yearData.m, yearData.f);
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
  return result;
}
