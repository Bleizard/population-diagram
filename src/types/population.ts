/**
 * Данные о населении для одной возрастной группы
 */
export interface PopulationAgeGroup {
  /** Возраст или возрастная группа (например, "0", "1-4", "85+") */
  age: string;
  /** Числовое представление возраста для сортировки */
  ageNumeric: number;
  /** Количество мужчин */
  male: number;
  /** Количество женщин */
  female: number;
}

/**
 * Полный набор данных о населении
 */
export interface PopulationData {
  /** Название страны или региона */
  title: string;
  /** Дата данных (опционально) */
  date?: string;
  /** Источник данных (опционально) */
  source?: string;
  /** Данные по возрастным группам */
  ageGroups: PopulationAgeGroup[];
}

/**
 * Данные, подготовленные для отображения на диаграмме
 */
export interface ChartDataItem {
  /** Возрастная группа */
  age: string;
  /** Количество мужчин (отрицательное для отображения слева) */
  male: number;
  /** Количество женщин */
  female: number;
  /** Избыток мужчин (если male > female) */
  maleSurplus: number;
  /** Избыток женщин (если female > male) */
  femaleSurplus: number;
  /** Базовое значение для мужчин (без избытка) */
  maleBase: number;
  /** Базовое значение для женщин (без избытка) */
  femaleBase: number;
}

/**
 * Метаданные для диаграммы
 */
export interface ChartMetadata {
  /** Заголовок диаграммы */
  title: string;
  /** Подзаголовок (дата) */
  subtitle?: string;
  /** Источник данных */
  source?: string;
  /** Максимальное значение для масштабирования осей */
  maxValue: number;
}

/**
 * Формат входного файла
 */
export type FileFormat = 'csv' | 'xlsx' | 'xls';

/**
 * Результат парсинга файла
 */
export interface ParseResult {
  success: boolean;
  data?: PopulationData;
  error?: string;
}

/**
 * Сырые данные из файла (до преобразования)
 */
export interface RawPopulationRow {
  age: string | number;
  male: string | number;
  female: string | number;
}

/**
 * Конфигурация одной возрастной группы для агрегации
 */
export interface AgeRangeConfig {
  /** Уникальный идентификатор */
  id: string;
  /** Начало диапазона (включительно) */
  from: number;
  /** Конец диапазона (включительно), null означает "и старше" */
  to: number | null;
  /** Метка для отображения (например "0-19", "65+") */
  label: string;
}

/**
 * Данные графика (исходный или агрегированный)
 */
export interface ChartInstance {
  /** Уникальный идентификатор */
  id: string;
  /** Данные о населении */
  data: PopulationData;
  /** Является ли это исходными данными */
  isOriginal: boolean;
  /** Конфигурация групп (для агрегированных) */
  groupConfig?: AgeRangeConfig[];
}

/**
 * Индивидуальные настройки графика
 */
export interface ChartSettings {
  /** Кастомное название */
  customTitle: string;
  /** Режим отображения */
  viewMode: 'split' | 'combined';
  /** Режим масштаба оси X */
  scaleMode: 'auto' | 'fit' | 'custom';
  /** Кастомное значение масштаба */
  scaleCustomValue?: number;
  /** Режим отображения меток оси Y */
  yAxisLabelMode: 'all' | 'every2' | 'every5' | 'every10';
  /** Показывать общую сумму населения */
  showTotal: boolean;
  /** Количество делений оси X (с каждой стороны от 0) */
  xAxisSplitCount: number;
  /** Показывать значения внутри столбиков */
  showBarLabels: boolean;
}
