/**
 * Цвета для диаграммы половозрастной пирамиды
 */
export const CHART_COLORS = {
  /** Основной цвет для мужчин (светло-синий) */
  male: '#93c5fd',
  /** Цвет для избытка мужчин (тёмно-синий) */
  maleSurplus: '#3b82f6',
  /** Основной цвет для женщин (светло-розовый) */
  female: '#fda4af',
  /** Цвет для избытка женщин (тёмно-розовый) */
  femaleSurplus: '#f43f5e',
  /** Цвет сетки */
  grid: '#e5e7eb',
  /** Цвет текста */
  text: '#374151',
  /** Цвет вспомогательного текста */
  textSecondary: '#6b7280',
  /** Цвет центральной линии */
  centerLine: '#9ca3af',
} as const;

/**
 * Настройки диаграммы
 */
export const CHART_CONFIG = {
  /** Высота бара */
  barHeight: 12,
  /** Отступ между барами */
  barGap: 2,
  /** Минимальная высота диаграммы */
  minHeight: 600,
  /** Высота на одну возрастную группу */
  heightPerAge: 14,
  /** Отступы */
  padding: {
    top: 80,
    right: 80,
    bottom: 60,
    left: 80,
  },
} as const;

/**
 * Метки для легенды
 */
export const LEGEND_LABELS = {
  male: 'Males',
  maleSurplus: 'Male surplus',
  female: 'Females',
  femaleSurplus: 'Female surplus',
} as const;

/**
 * Метки для осей
 */
export const AXIS_LABELS = {
  age: 'Age',
  population: 'Population',
} as const;

