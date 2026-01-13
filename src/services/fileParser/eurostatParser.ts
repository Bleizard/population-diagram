import Papa from 'papaparse';
import type { TimeSeriesPopulationData, PopulationAgeGroup } from '../../types';

/**
 * Интерфейс для сырой строки Eurostat
 */
interface RawEurostatRow {
  DATAFLOW?: string;
  'LAST UPDATE'?: string;
  freq?: string;
  unit?: string;
  age: string;
  sex: string;
  geo: string;
  TIME_PERIOD: string | number;
  OBS_VALUE: string | number;
  OBS_FLAG?: string;
  CONF_STATUS?: string;
}

/**
 * Проверяет, является ли файл форматом Eurostat
 * @param headers - заголовки файла
 */
export function isEurostatFormat(headers: string[]): boolean {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  // Обязательные колонки для Eurostat формата
  const requiredColumns = ['age', 'sex', 'geo', 'time_period', 'obs_value'];
  
  return requiredColumns.every(col => normalizedHeaders.includes(col));
}

/**
 * Парсит Eurostat формат возраста в стандартный
 * @param eurostatAge - возраст в формате Eurostat (Y0, Y1, ..., Y_GE100)
 */
function parseEurostatAge(eurostatAge: string): { age: string; ageNumeric: number } {
  const trimmed = eurostatAge.trim();
  
  // Пропускаем TOTAL и UNK
  if (trimmed === 'TOTAL' || trimmed === 'UNK') {
    return { age: trimmed, ageNumeric: -1 };
  }
  
  // Y_GE100 - 100 лет и старше
  if (trimmed.startsWith('Y_GE')) {
    const num = parseInt(trimmed.replace('Y_GE', ''), 10);
    return { age: `${num}+`, ageNumeric: num };
  }
  
  // Y_LT1 - младше 1 года
  if (trimmed === 'Y_LT1') {
    return { age: '0', ageNumeric: 0 };
  }
  
  // Y0, Y1, ..., Y99
  if (trimmed.startsWith('Y')) {
    const num = parseInt(trimmed.replace('Y', ''), 10);
    return { age: String(num), ageNumeric: num };
  }
  
  // Попробуем извлечь число напрямую
  const numMatch = trimmed.match(/(\d+)/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    return { age: String(num), ageNumeric: num };
  }
  
  return { age: trimmed, ageNumeric: -1 };
}

/**
 * Парсит CSV файл в формате Eurostat
 * @param file - CSV файл для парсинга
 * @returns Promise с данными временного ряда
 */
export async function parseEurostat(file: File): Promise<TimeSeriesPopulationData> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawEurostatRow>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        try {
          const data = transformEurostatData(results.data, file.name);
          resolve(data);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`Failed to parse Eurostat CSV: ${error.message}`));
      },
    });
  });
}

/**
 * Преобразует сырые данные Eurostat в TimeSeriesPopulationData
 */
function transformEurostatData(
  rawData: RawEurostatRow[],
  fileName: string
): TimeSeriesPopulationData {
  // Фильтруем пустые строки и строки с TOTAL/UNK в возрасте
  const validRows = rawData.filter(row => {
    const age = String(row.age).trim();
    return age && age !== 'TOTAL' && age !== 'UNK' && row.sex !== 'T';
  });
  
  // Получаем уникальные годы
  const yearsSet = new Set<number>();
  validRows.forEach(row => {
    const year = typeof row.TIME_PERIOD === 'number' 
      ? row.TIME_PERIOD 
      : parseInt(String(row.TIME_PERIOD), 10);
    if (!isNaN(year)) {
      yearsSet.add(year);
    }
  });
  const years = Array.from(yearsSet).sort((a, b) => a - b);
  
  // Получаем код страны из первой строки
  const geoCode = rawData[0]?.geo || 'Unknown';
  
  // Группируем данные по годам
  const dataByYear: Record<number, PopulationAgeGroup[]> = {};
  
  for (const year of years) {
    // Получаем данные за этот год
    const yearRows = validRows.filter(row => {
      const rowYear = typeof row.TIME_PERIOD === 'number'
        ? row.TIME_PERIOD
        : parseInt(String(row.TIME_PERIOD), 10);
      return rowYear === year;
    });
    
    // Группируем по возрасту
    const ageMap = new Map<string, { male: number; female: number; ageNumeric: number }>();
    
    for (const row of yearRows) {
      const { age, ageNumeric } = parseEurostatAge(row.age);
      
      if (ageNumeric < 0) continue; // Пропускаем невалидные возрасты
      
      if (!ageMap.has(age)) {
        ageMap.set(age, { male: 0, female: 0, ageNumeric });
      }
      
      const entry = ageMap.get(age)!;
      let value = 0;
      if (typeof row.OBS_VALUE === 'number' && !isNaN(row.OBS_VALUE)) {
        value = row.OBS_VALUE;
      } else if (row.OBS_VALUE != null && row.OBS_VALUE !== '') {
        const parsed = parseFloat(String(row.OBS_VALUE));
        value = isNaN(parsed) ? 0 : parsed;
      }
      
      const sex = String(row.sex).toUpperCase();
      if (sex === 'M') {
        entry.male = value;
      } else if (sex === 'F') {
        entry.female = value;
      }
    }
    
    // Преобразуем в массив PopulationAgeGroup
    const ageGroups: PopulationAgeGroup[] = [];
    ageMap.forEach((data, age) => {
      ageGroups.push({
        age,
        ageNumeric: data.ageNumeric,
        male: data.male,
        female: data.female,
      });
    });
    
    // Сортируем по возрасту
    ageGroups.sort((a, b) => a.ageNumeric - b.ageNumeric);
    
    dataByYear[year] = ageGroups;
  }
  
  // Извлекаем название из имени файла
  const title = fileName.replace(/\.(csv|xlsx?|xls)$/i, '').replace(/_/g, ' ');
  
  return {
    title,
    source: 'Eurostat',
    geoCode,
    years,
    dataByYear,
  };
}

/**
 * Получает заголовки CSV файла для определения формата
 */
export async function getCSVHeaders(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      preview: 1, // Только первая строка
      complete: (results) => {
        if (results.data.length > 0) {
          resolve(results.data[0] as string[]);
        } else {
          resolve([]);
        }
      },
      error: (error) => {
        reject(new Error(`Failed to read CSV headers: ${error.message}`));
      },
    });
  });
}

