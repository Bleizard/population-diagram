import type { DataFormat, DataFormatInfo } from '../types';

/**
 * Описания поддерживаемых форматов данных
 */
export const DATA_FORMATS: Record<Exclude<DataFormat, 'unknown'>, DataFormatInfo> = {
  simple: {
    format: 'simple',
    name: 'Simple',
    description: 'Basic format with age and population by sex',
    requiredColumns: ['age', 'male', 'female'],
    exampleRows: [
      ['age', 'male', 'female'],
      ['0', '450000', '430000'],
      ['1', '455000', '435000'],
      ['2', '460000', '440000'],
      ['...', '...', '...'],
    ],
  },
  timeseries: {
    format: 'timeseries',
    name: 'Time Series',
    description: 'Population data across multiple years',
    requiredColumns: ['year', 'age', 'male', 'female'],
    exampleRows: [
      ['year', 'age', 'male', 'female'],
      ['2020', '0', '450000', '430000'],
      ['2020', '1', '455000', '435000'],
      ['2021', '0', '448000', '428000'],
      ['...', '...', '...', '...'],
    ],
  },
  eurostat: {
    format: 'eurostat',
    name: 'Eurostat',
    description: 'SDMX format from Eurostat database',
    requiredColumns: ['age', 'sex', 'TIME_PERIOD', 'OBS_VALUE'],
    exampleRows: [
      ['DATAFLOW', 'freq', 'age', 'sex', 'geo', 'TIME_PERIOD', 'OBS_VALUE'],
      ['ESTAT:DEMO_PJAN', 'A', 'Y0', 'M', 'FR', '2020', '367944'],
      ['ESTAT:DEMO_PJAN', 'A', 'Y0', 'F', 'FR', '2020', '349815'],
      ['ESTAT:DEMO_PJAN', 'A', 'Y1', 'M', 'FR', '2020', '365187'],
      ['...', '...', '...', '...', '...', '...', '...'],
    ],
  },
};

/**
 * Порядок отображения форматов в UI
 */
export const FORMAT_ORDER: Array<Exclude<DataFormat, 'unknown'>> = [
  'simple',
  'timeseries', 
  'eurostat',
];

/**
 * Алиасы колонок для автоопределения формата
 */
export const COLUMN_ALIASES = {
  age: ['age', 'возраст', 'Age', 'AGE', 'Возраст'],
  male: ['male', 'males', 'мужчины', 'м', 'Male', 'Males', 'MALE', 'Мужчины', 'М'],
  female: ['female', 'females', 'женщины', 'ж', 'Female', 'Females', 'FEMALE', 'Женщины', 'Ж'],
  year: ['year', 'год', 'Year', 'YEAR', 'Год', 'TIME_PERIOD'],
  sex: ['sex', 'пол', 'Sex', 'SEX', 'Пол'],
  geo: ['geo', 'country', 'region', 'страна', 'регион'],
  value: ['OBS_VALUE', 'value', 'значение', 'Value', 'VALUE'],
} as const;

/**
 * Eurostat-специфичные коды возраста
 */
export const EUROSTAT_AGE_CODES = {
  'Y_LT1': 0,      // Less than 1 year
  'Y_OPEN': 100,   // 100+ years
  'TOTAL': -1,     // Total (skip)
  'UNK': -2,       // Unknown (skip)
} as const;

/**
 * Преобразует код возраста Eurostat в число
 */
export function parseEurostatAge(ageCode: string): number | null {
  // Специальные коды
  if (ageCode in EUROSTAT_AGE_CODES) {
    const value = EUROSTAT_AGE_CODES[ageCode as keyof typeof EUROSTAT_AGE_CODES];
    return value >= 0 ? value : null; // null для TOTAL и UNK
  }
  
  // Формат Y0, Y1, ..., Y99
  const match = ageCode.match(/^Y(\d+)$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  return null;
}
