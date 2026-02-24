import * as XLSX from 'xlsx';
import type { RawPopulationRow, RawTotalOnlyRow } from '../../types';
import { ERROR_CODES } from './csvParser';

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
          throw new Error(ERROR_CODES.EXCEL_PARSE_ERROR);
        }

        const workbook = XLSX.read(data, { type: 'array' });
        
        // Берём первый лист
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error(ERROR_CODES.EXCEL_PARSE_ERROR);
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
        reject(error instanceof Error ? error : new Error(ERROR_CODES.EXCEL_PARSE_ERROR));
      }
    };

    reader.onerror = () => {
      reject(new Error(ERROR_CODES.EXCEL_PARSE_ERROR));
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
      throw new Error(ERROR_CODES.AGE_COLUMN_NOT_FOUND);
    }
    if (male === undefined) {
      throw new Error(ERROR_CODES.MALE_COLUMN_NOT_FOUND);
    }
    if (female === undefined) {
      throw new Error(ERROR_CODES.FEMALE_COLUMN_NOT_FOUND);
    }

    return { age, male, female };
  });
}

/**
 * Парсит Excel файл с total-only данными (без деления по полу)
 */
export async function parseTotalOnlyExcel(file: File): Promise<RawTotalOnlyRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          throw new Error(ERROR_CODES.EXCEL_PARSE_ERROR);
        }

        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error(ERROR_CODES.EXCEL_PARSE_ERROR);
        }

        const worksheet = workbook.Sheets[firstSheetName];

        const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number>>(
          worksheet,
          { defval: '' }
        );

        const rows = normalizeTotalOnlyColumnNames(jsonData);
        resolve(rows);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(ERROR_CODES.EXCEL_PARSE_ERROR));
      }
    };

    reader.onerror = () => {
      reject(new Error(ERROR_CODES.EXCEL_PARSE_ERROR));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Нормализует названия колонок для total-only формата (Excel)
 */
function normalizeTotalOnlyColumnNames(
  data: Record<string, string | number>[]
): RawTotalOnlyRow[] {
  const ageAliases = ['age', 'возраст', 'Age', 'AGE', 'Возраст'];
  const totalAliases = ['total', 'population', 'value', 'count', 'Total', 'Population', 'Value', 'число', 'население', 'всего', 'Население', 'Всего'];

  return data.map((row) => {
    const age = findColumnValue(row, ageAliases);
    const total = findColumnValue(row, totalAliases);

    if (age === undefined) {
      throw new Error(ERROR_CODES.AGE_COLUMN_NOT_FOUND);
    }
    if (total === undefined) {
      throw new Error(ERROR_CODES.TOTAL_COLUMN_NOT_FOUND);
    }

    return { age, total };
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

