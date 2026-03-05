/**
 * Скрипт загрузки данных населения из Eurostat Statistics API.
 *
 * Использует датасет demo_pjan (Population on 1 January by age and sex).
 * API: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_pjan
 *
 * Запуск: npx tsx scripts/fetch-eurostat.ts
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { COUNTRIES, type CountryMeta } from './countries';

// ─── Типы ────────────────────────────────────────────────
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

// JSON-stat response types
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

// ─── Конфигурация ────────────────────────────────────────
const OUTPUT_DIR = join(import.meta.dirname, '..', 'public', 'data');
const RATE_LIMIT_MS = 1500;
const MAX_RETRIES = 3;
const SOURCE = 'Eurostat (online data code: demo_pjan)';
const LICENSE = 'CC BY 4.0';

// Все возрасты Y0..Y99 + Y_GE100
const AGE_CODES = Array.from({ length: 100 }, (_, i) => `Y${i}`).concat('Y_GE100');

// ─── Утилиты ─────────────────────────────────────────────
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseAgeCode(code: string): number {
  if (code === 'Y_GE100') return 100;
  const match = code.match(/^Y(\d+)$/);
  if (match) {
    const age = parseInt(match[1], 10);
    return age <= 100 ? age : -1;
  }
  return -1;
}

/**
 * Загружает данные из Eurostat Statistics API для одной страны.
 */
async function fetchCountryData(country: CountryMeta): Promise<CompactCountryData | null> {
  const ageParams = AGE_CODES.map(a => `age=${a}`).join('&');
  const url = `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_pjan?geo=${country.code}&sex=M&sex=F&${ageParams}&lang=en`;

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`  Fetching ${country.code} (attempt ${attempt})...`);
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`  No data for ${country.code} (404)`);
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json: JsonStatResponse = await response.json();
      return parseJsonStat(json, country);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`  Attempt ${attempt} failed for ${country.code}: ${lastError.message}`);
      if (attempt < MAX_RETRIES) {
        await delay(RATE_LIMIT_MS * 2);
      }
    }
  }

  console.error(`  Failed to fetch ${country.code} after ${MAX_RETRIES} attempts: ${lastError?.message}`);
  return null;
}

/**
 * Парсит JSON-stat ответ от Eurostat Statistics API.
 *
 * Формат value: плоский объект с индексами.
 * Индекс вычисляется как: sum over dims of (dimIndex * product of sizes of subsequent dims)
 * Измерения в порядке id[]: freq, unit, age, sex, geo, time
 */
function parseJsonStat(json: JsonStatResponse, country: CountryMeta): CompactCountryData {
  const { id: dimIds, size: dimSizes, dimension, value } = json;

  // Получаем индексы категорий для каждого измерения
  const dimIndices = dimIds.map(dimId => dimension[dimId].category.index);

  // Вычисляем множители для перевода multi-dim индекса в плоский
  const multipliers = new Array(dimIds.length);
  multipliers[dimIds.length - 1] = 1;
  for (let i = dimIds.length - 2; i >= 0; i--) {
    multipliers[i] = multipliers[i + 1] * dimSizes[i + 1];
  }

  // Находим индексы нужных измерений
  const ageIdx = dimIds.indexOf('age');
  const sexIdx = dimIds.indexOf('sex');
  const timeIdx = dimIds.indexOf('time');

  const sexIndices = dimIndices[sexIdx];
  const ageIndices = dimIndices[ageIdx];
  const timeIndices = dimIndices[timeIdx];

  const mSexIdx = sexIndices['M'];
  const fSexIdx = sexIndices['F'];

  // Собираем данные по годам
  const dataByYear: Record<number, { m: number[]; f: number[] }> = {};
  const yearsSet = new Set<number>();

  for (const [flatIdx, val] of Object.entries(value)) {
    if (val === null || val === undefined) continue;

    // Декодируем плоский индекс обратно в multi-dim
    let remaining = parseInt(flatIdx, 10);
    const indices = new Array(dimIds.length);
    for (let i = 0; i < dimIds.length; i++) {
      indices[i] = Math.floor(remaining / multipliers[i]);
      remaining = remaining % multipliers[i];
    }

    const currentSexIdx = indices[sexIdx];
    const sex = currentSexIdx === mSexIdx ? 'm' : currentSexIdx === fSexIdx ? 'f' : null;
    if (!sex) continue;

    // Находим возраст
    const currentAgeIdx = indices[ageIdx];
    let ageCode: string | null = null;
    for (const [code, idx] of Object.entries(ageIndices)) {
      if (idx === currentAgeIdx) { ageCode = code; break; }
    }
    if (!ageCode) continue;
    const ageNum = parseAgeCode(ageCode);
    if (ageNum < 0) continue;

    // Находим год
    const currentTimeIdx = indices[timeIdx];
    let yearStr: string | null = null;
    for (const [code, idx] of Object.entries(timeIndices)) {
      if (idx === currentTimeIdx) { yearStr = code; break; }
    }
    if (!yearStr) continue;
    const year = parseInt(yearStr, 10);
    if (isNaN(year)) continue;

    yearsSet.add(year);
    if (!dataByYear[year]) {
      dataByYear[year] = {
        m: new Array(101).fill(0),
        f: new Array(101).fill(0),
      };
    }
    dataByYear[year][sex][ageNum] = Math.round(Number(val));
  }

  const years = Array.from(yearsSet).sort((a, b) => a - b);

  // Удаляем годы без данных
  const validYears = years.filter(year => {
    const d = dataByYear[year];
    return d.m.some(v => v > 0) || d.f.some(v => v > 0);
  });

  const validData: Record<number, { m: number[]; f: number[] }> = {};
  for (const year of validYears) {
    validData[year] = dataByYear[year];
  }

  return {
    geo: country.code,
    name: country.name,
    source: SOURCE,
    license: LICENSE,
    lastUpdated: new Date().toISOString().split('T')[0],
    years: validYears,
    data: validData,
  };
}

// ─── Main ────────────────────────────────────────────────
async function main() {
  console.log('Eurostat Data Fetcher (Statistics API)');
  console.log(`Countries: ${COUNTRIES.length}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const index: CountryIndexEntry[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const country of COUNTRIES) {
    console.log(`[${successCount + failCount + 1}/${COUNTRIES.length}] ${country.flag} ${country.name} (${country.code})`);

    const data = await fetchCountryData(country);

    if (data && data.years.length > 0) {
      const filePath = join(OUTPUT_DIR, `${country.code}.json`);
      writeFileSync(filePath, JSON.stringify(data));
      console.log(`  Saved: ${data.years.length} years (${data.years[0]}-${data.years[data.years.length - 1]})\n`);

      index.push({
        code: country.code,
        name: country.name,
        region: country.region,
        flag: country.flag,
        years: data.years,
        lastUpdated: data.lastUpdated,
      });
      successCount++;
    } else {
      console.log(`  Skipped (no data)\n`);
      failCount++;
    }

    // Rate limiting
    await delay(RATE_LIMIT_MS);
  }

  // Записываем индекс
  const indexPath = join(OUTPUT_DIR, 'index.json');
  writeFileSync(indexPath, JSON.stringify(index, null, 2));

  console.log('─'.repeat(40));
  console.log(`Done! Success: ${successCount}, Failed: ${failCount}`);
  console.log(`Index: ${indexPath}`);
}

main().catch(console.error);
