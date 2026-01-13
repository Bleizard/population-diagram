import Papa from 'papaparse';
import type { RawPopulationRow } from '../../types';

/**
 * Парсит CSV файл и возвращает массив строк с данными
 * @param file - CSV файл для парсинга
 * @returns Promise с массивом данных о населении
 */
export async function parseCSV(file: File): Promise<RawPopulationRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string | number>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        try {
          const rows = normalizeColumnNames(results.data);
          resolve(rows);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`Ошибка парсинга CSV: ${error.message}`));
      },
    });
  });
}

/**
 * Нормализует названия колонок к стандартному формату
 * Поддерживает различные варианты написания колонок
 */
function normalizeColumnNames(
  data: Record<string, string | number>[]
): RawPopulationRow[] {
  // Возможные названия колонок
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

/**
 * Находит значение в объекте по одному из возможных ключей
 */
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

