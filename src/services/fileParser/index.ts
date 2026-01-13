import { parseCSV, ERROR_CODES } from './csvParser';
import { parseExcel } from './excelParser';
import { parseEurostat, isEurostatFormat, getCSVHeaders } from './eurostatParser';
import type { FileFormat, DataFormat, ParseResult, RawPopulationRow, PopulationData } from '../../types';

export { ERROR_CODES } from './csvParser';
export { isEurostatFormat, parseEurostat } from './eurostatParser';

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
      
      // Проверяем timeseries формат (year, age, male, female)
      const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
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
      
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }
  
  // Для Excel пока поддерживаем только simple формат
  return 'simple';
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

export { parseCSV } from './csvParser';
export { parseExcel } from './excelParser';
export { getCSVHeaders } from './eurostatParser';

