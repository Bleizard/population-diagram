import { parseCSV, parseTotalOnlyCSV, ERROR_CODES } from './csvParser';
import { parseExcel, parseTotalOnlyExcel } from './excelParser';
import { parseEurostat, isEurostatFormat, getCSVHeaders } from './eurostatParser';
import type { FileFormat, DataFormat, ParseResult, RawPopulationRow, RawTotalOnlyRow, PopulationData, TimeSeriesPopulationData } from '../../types';

export { ERROR_CODES } from './csvParser';
export { isEurostatFormat, parseEurostat } from './eurostatParser';

/** Алиасы для колонки total (используются при определении формата) */
const TOTAL_ALIASES_LOWER = ['total', 'population', 'value', 'count', 'число', 'население', 'всего'];

/**
 * Определяет формат файла по расширению
 */
export function getFileFormat(fileName: string): FileFormat | null {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'csv':
      return 'csv';
    case 'xlsx':
      return 'xlsx';
    case 'xls':
      return 'xls';
    default:
      return null;
  }
}

/**
 * Определяет формат данных по заголовкам
 */
export async function detectDataFormat(file: File): Promise<DataFormat> {
  const fileFormat = getFileFormat(file.name);

  if (fileFormat === 'csv') {
    try {
      const headers = await getCSVHeaders(file);

      // Проверяем Eurostat формат
      if (isEurostatFormat(headers)) {
        return 'eurostat';
      }

      const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

      // Проверяем timeseries формат (year, age, male, female) — более специфичный
      if (normalizedHeaders.includes('year') &&
          normalizedHeaders.includes('age') &&
          (normalizedHeaders.includes('male') || normalizedHeaders.includes('males')) &&
          (normalizedHeaders.includes('female') || normalizedHeaders.includes('females'))) {
        return 'timeseries';
      }

      // Simple формат (age, male, female)
      if (normalizedHeaders.includes('age') &&
          (normalizedHeaders.includes('male') || normalizedHeaders.includes('males')) &&
          (normalizedHeaders.includes('female') || normalizedHeaders.includes('females'))) {
        return 'simple';
      }

      // Проверяем total-only форматы (менее специфичные — после gendered)
      const hasTotalColumn = normalizedHeaders.some(h => TOTAL_ALIASES_LOWER.includes(h));

      if (normalizedHeaders.includes('year') && normalizedHeaders.includes('age') && hasTotalColumn) {
        return 'timeseries-total';
      }

      if (normalizedHeaders.includes('age') && hasTotalColumn) {
        return 'simple-total';
      }

      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  // Для Excel — пытаемся определить формат по заголовкам первого листа
  if (fileFormat === 'xlsx' || fileFormat === 'xls') {
    try {
      const headers = await getExcelHeaders(file);
      if (headers) {
        const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

        const hasGenderedColumns =
          (normalizedHeaders.includes('male') || normalizedHeaders.includes('males')) &&
          (normalizedHeaders.includes('female') || normalizedHeaders.includes('females'));

        if (hasGenderedColumns) {
          return 'simple';
        }

        const hasTotalColumn = normalizedHeaders.some(h => TOTAL_ALIASES_LOWER.includes(h));
        if (normalizedHeaders.includes('age') && hasTotalColumn) {
          return 'simple-total';
        }
      }
    } catch {
      // Fallback
    }
    return 'simple';
  }

  return 'simple';
}

/**
 * Получает заголовки из Excel файла
 */
async function getExcelHeaders(file: File): Promise<string[] | null> {
  const { read, utils } = await import('xlsx');
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) { resolve(null); return; }
        const workbook = read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        if (!firstSheet) { resolve(null); return; }
        const worksheet = workbook.Sheets[firstSheet];
        const jsonData = utils.sheet_to_json<Record<string, string | number>>(worksheet, { defval: '' });
        if (jsonData.length > 0) {
          resolve(Object.keys(jsonData[0]));
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Парсит файл с данными о населении
 * Автоматически определяет формат данных
 * @param file - Файл для парсинга (CSV или Excel)
 * @returns Promise с результатом парсинга
 */
export async function parsePopulationFile(file: File): Promise<ParseResult> {
  const fileFormat = getFileFormat(file.name);

  if (!fileFormat) {
    return {
      success: false,
      error: ERROR_CODES.UNKNOWN_FILE_FORMAT,
    };
  }

  try {
    // Определяем формат данных
    const dataFormat = await detectDataFormat(file);

    // Eurostat формат
    if (dataFormat === 'eurostat') {
      const timeSeriesData = await parseEurostat(file);

      // Для обратной совместимости также возвращаем data с последним годом
      const lastYear = timeSeriesData.years[timeSeriesData.years.length - 1];
      const lastYearData = timeSeriesData.dataByYear[lastYear];

      return {
        success: true,
        data: {
          title: timeSeriesData.title,
          date: String(lastYear),
          source: timeSeriesData.source,
          ageGroups: lastYearData,
        },
        timeSeriesData,
        detectedFormat: 'eurostat',
      };
    }

    // Total-only форматы
    if (dataFormat === 'simple-total' || dataFormat === 'timeseries-total') {
      let rawData: RawTotalOnlyRow[];

      if (fileFormat === 'csv') {
        rawData = await parseTotalOnlyCSV(file);
      } else {
        rawData = await parseTotalOnlyExcel(file);
      }

      if (dataFormat === 'timeseries-total') {
        const timeSeriesData = transformTimeSeriesTotalOnlyData(rawData, file.name);
        const lastYear = timeSeriesData.years[timeSeriesData.years.length - 1];
        const lastYearData = timeSeriesData.dataByYear[lastYear];

        return {
          success: true,
          data: {
            title: timeSeriesData.title,
            date: String(lastYear),
            ageGroups: lastYearData,
            hasGenderData: false,
          },
          timeSeriesData,
          detectedFormat: 'timeseries-total',
        };
      }

      // simple-total
      const populationData = transformTotalOnlyRawData(rawData, file.name);

      return {
        success: true,
        data: populationData,
        detectedFormat: 'simple-total',
      };
    }

    // Simple и timeseries форматы
    let rawData: RawPopulationRow[];

    if (fileFormat === 'csv') {
      rawData = await parseCSV(file);
    } else {
      rawData = await parseExcel(file);
    }

    const populationData = transformRawData(rawData, file.name);

    return {
      success: true,
      data: populationData,
      detectedFormat: dataFormat,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error while parsing file',
    };
  }
}

/**
 * Преобразует сырые данные в структурированный формат PopulationData
 */
function transformRawData(rawData: RawPopulationRow[], fileName: string): PopulationData {
  const ageGroups = rawData.map((row) => ({
    age: String(row.age),
    ageNumeric: parseAgeToNumeric(String(row.age)),
    male: parseNumber(row.male),
    female: parseNumber(row.female),
  }));

  // Сортируем по возрасту
  ageGroups.sort((a, b) => a.ageNumeric - b.ageNumeric);

  // Извлекаем название из имени файла (убираем расширение)
  const title = fileName.replace(/\.(csv|xlsx?|xls)$/i, '');

  return {
    title,
    ageGroups,
  };
}

/**
 * Преобразует total-only данные в PopulationData
 * Делит total пополам на male/female для совместимости с существующей логикой
 */
function transformTotalOnlyRawData(rawData: RawTotalOnlyRow[], fileName: string): PopulationData {
  const ageGroups = rawData.map((row) => {
    const total = parseNumber(row.total);
    const half = Math.round(total / 2);
    return {
      age: String(row.age),
      ageNumeric: parseAgeToNumeric(String(row.age)),
      male: half,
      female: total - half,
    };
  });

  ageGroups.sort((a, b) => a.ageNumeric - b.ageNumeric);

  const title = fileName.replace(/\.(csv|xlsx?|xls)$/i, '');

  return {
    title,
    ageGroups,
    hasGenderData: false,
  };
}

/**
 * Преобразует timeseries total-only данные в TimeSeriesPopulationData
 */
function transformTimeSeriesTotalOnlyData(rawData: RawTotalOnlyRow[], fileName: string): TimeSeriesPopulationData {
  const title = fileName.replace(/\.(csv|xlsx?|xls)$/i, '');

  // Группируем по годам
  const yearMap: Record<number, RawTotalOnlyRow[]> = {};
  for (const row of rawData) {
    // year может быть в поле row, нужно извлечь из raw данных
    // parseTotalOnlyCSV возвращает RawTotalOnlyRow, но для timeseries у нас есть year в исходных данных
    // Здесь row может содержать year как дополнительное поле (из CSV парсера с dynamicTyping)
    const year = (row as unknown as Record<string, unknown>)['year'] as number;
    if (year != null) {
      if (!yearMap[year]) yearMap[year] = [];
      yearMap[year].push(row);
    }
  }

  const years = Object.keys(yearMap).map(Number).sort((a, b) => a - b);
  const dataByYear: Record<number, import('../../types').PopulationAgeGroup[]> = {};

  for (const year of years) {
    const rows = yearMap[year];
    const ageGroups = rows.map((row) => {
      const total = parseNumber(row.total);
      const half = Math.round(total / 2);
      return {
        age: String(row.age),
        ageNumeric: parseAgeToNumeric(String(row.age)),
        male: half,
        female: total - half,
      };
    });
    ageGroups.sort((a, b) => a.ageNumeric - b.ageNumeric);
    dataByYear[year] = ageGroups;
  }

  return {
    title,
    years,
    dataByYear,
    hasGenderData: false,
  };
}

/**
 * Парсит возраст в числовое значение для сортировки
 * Поддерживает форматы: "25", "25-29", "85+", "100+"
 */
function parseAgeToNumeric(age: string): number {
  // Убираем пробелы
  const cleaned = age.trim();

  // Пробуем найти первое число
  const match = cleaned.match(/(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return 0;
}

/**
 * Преобразует значение в число
 */
function parseNumber(value: string | number): number {
  if (typeof value === 'number') {
    return Math.abs(value);
  }

  // Убираем пробелы и заменяем запятые на точки
  const cleaned = String(value).replace(/\s/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : Math.abs(parsed);
}

export { parseCSV, parseTotalOnlyCSV } from './csvParser';
export { parseExcel, parseTotalOnlyExcel } from './excelParser';
export { getCSVHeaders } from './eurostatParser';
