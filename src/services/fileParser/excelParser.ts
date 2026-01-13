import * as XLSX from 'xlsx';
import type { RawPopulationRow } from '../../types';

/**
 * Парсит Excel файл и возвращает массив строк с данными
 * @param file - Excel файл для парсинга
 * @returns Promise с массивом данных о населении
 */
export async function parseExcel(file: File): Promise<RawPopulationRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          throw new Error('Failed to read file');
        }

        const workbook = XLSX.read(data, { type: 'array' });
        
        // Берём первый лист
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('Excel file contains no sheets');
        }

        const worksheet = workbook.Sheets[firstSheetName];
        
        // Конвертируем в JSON с заголовками
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number>>(
          worksheet,
          { defval: '' }
        );

        const rows = normalizeColumnNames(jsonData);
        resolve(rows);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Excel parsing error'));
      }
    };

    reader.onerror = () => {
      reject(new Error('File reading error'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Нормализует названия колонок к стандартному формату
 */
function normalizeColumnNames(
  data: Record<string, string | number>[]
): RawPopulationRow[] {
  const ageAliases = ['age', 'возраст', 'Age', 'AGE', 'Возраст'];
  const maleAliases = ['male', 'males', 'мужчины', 'м', 'Male', 'Males', 'MALE', 'Мужчины', 'М'];
  const femaleAliases = ['female', 'females', 'женщины', 'ж', 'Female', 'Females', 'FEMALE', 'Женщины', 'Ж'];

  return data.map((row) => {
    const age = findColumnValue(row, ageAliases);
    const male = findColumnValue(row, maleAliases);
    const female = findColumnValue(row, femaleAliases);

    if (age === undefined) {
      throw new Error('Age column not found (age)');
    }
    if (male === undefined) {
      throw new Error('Male column not found (male)');
    }
    if (female === undefined) {
      throw new Error('Female column not found (female)');
    }

    return { age, male, female };
  });
}

function findColumnValue(
  row: Record<string, string | number>,
  aliases: string[]
): string | number | undefined {
  for (const alias of aliases) {
    if (alias in row) {
      return row[alias];
    }
  }
  return undefined;
}

