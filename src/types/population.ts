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
 * Формат входного файла (расширение)
 */
export type FileExtension = 'csv' | 'xlsx' | 'xls';

/**
 * @deprecated Используйте FileExtension
 */
export type FileFormat = FileExtension;

/**
 * Формат данных (структура)
 */
export type DataFormat = 'simple' | 'timeseries' | 'eurostat' | 'unknown';

/**
 * Описание формата данных
 */
export interface DataFormatInfo {
  /** Идентификатор формата */
  format: DataFormat;
  /** Название формата */
  name: string;
  /** Описание */
  description: string;
  /** Обязательные колонки */
  requiredColumns: string[];
  /** Пример данных (массив строк) */
  exampleRows: string[][];
}

/**
 * Результат парсинга файла
 */
export interface ParseResult {
  success: boolean;
  data?: PopulationData;
  /** Данные временного ряда (если формат timeseries или eurostat) */
  timeSeriesData?: TimeSeriesPopulationData;
  /** Определённый формат данных */
  detectedFormat?: DataFormat;
  error?: string;
}

/**
 * Сырые данные из файла (до преобразования) - простой формат
 */
export interface RawPopulationRow {
  age: string | number;
  male: string | number;
  female: string | number;
}

/**
 * Сырые данные с годом (формат timeseries)
 */
export interface RawTimeSeriesRow extends RawPopulationRow {
  year: number;
}

/**
 * Сырые данные Eurostat
 */
export interface RawEurostatRow {
  age: string;
  sex: 'M' | 'F' | 'T';
  geo: string;
  TIME_PERIOD: number;
  OBS_VALUE: number;
}

/**
 * Данные о населении за несколько лет
 */
export interface TimeSeriesPopulationData {
  /** Название страны или региона */
  title: string;
  /** Источник данных */
  source?: string;
  /** Код страны (для Eurostat) */
  geoCode?: string;
  /** Доступные годы */
  years: number[];
  /** Данные по годам */
  dataByYear: Record<number, PopulationAgeGroup[]>;
}

/**
 * Этап обработки файла
 */
export type ProcessingStep = 
  | 'idle'
  | 'reading'
  | 'detecting'
  | 'validating'
  | 'building'
  | 'done'
  | 'error';

/**
 * Состояние обработки файла
 */
export interface ProcessingState {
  /** Текущий этап */
  step: ProcessingStep;
  /** Прогресс (0-100) */
  progress: number;
  /** Определённый формат */
  detectedFormat?: DataFormat;
  /** Превью данных (первые N строк как массив массивов) */
  preview?: string[][];
  /** Заголовки колонок */
  headers?: string[];
  /** Предупреждения валидации */
  warnings?: string[];
  /** Ошибка */
  error?: string;
  /** Сообщение текущего этапа */
  message?: string;
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
 * Цветовой профиль графика
 */
export type ColorProfile = 'pale' | 'contrast';

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
  /** Выбранный год (для time-series данных) */
  selectedYear?: number;
  /** Цветовой профиль */
  colorProfile: ColorProfile;
  /** Показывать медианную линию */
  showMedianLine: boolean;
  /** Отображать данные в процентах */
  showAsPercentage: boolean;
}
