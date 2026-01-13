import { parseCSV, ERROR_CODES } from './csvParser';
import { parseExcel } from './excelParser';
import type { FileFormat, ParseResult, RawPopulationRow, PopulationData } from '../../types';

export { ERROR_CODES } from './csvParser';

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
 * Парсит файл с данными о населении
 * @param file - Файл для парсинга (CSV или Excel)
 * @returns Promise с результатом парсинга
 */
export async function parsePopulationFile(file: File): Promise<ParseResult> {
  const format = getFileFormat(file.name);
  
  if (!format) {
    return {
      success: false,
      error: ERROR_CODES.UNKNOWN_FILE_FORMAT,
    };
  }

  try {
    let rawData: RawPopulationRow[];
    
    if (format === 'csv') {
      rawData = await parseCSV(file);
    } else {
      rawData = await parseExcel(file);
    }

    const populationData = transformRawData(rawData, file.name);
    
    return {
      success: true,
      data: populationData,
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

