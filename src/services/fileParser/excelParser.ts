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
          throw new Error('Не удалось прочитать файл');
        }

        const workbook = XLSX.read(data, { type: 'array' });
        
        // Берём первый лист
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('Excel файл не содержит листов');
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
        reject(error instanceof Error ? error : new Error('Ошибка парсинга Excel'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Ошибка чтения файла'));
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
      throw new Error('Не найдена колонка с возрастом (age/возраст)');
    }
    if (male === undefined) {
      throw new Error('Не найдена колонка с мужчинами (male/мужчины)');
    }
    if (female === undefined) {
      throw new Error('Не найдена колонка с женщинами (female/женщины)');
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

