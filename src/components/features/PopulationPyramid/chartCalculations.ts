import type { PopulationAgeGroup } from '../../../types';
import { CHART_CONFIG } from '../../../constants';

/**
 * Результат расчёта тоталов
 */
export interface Totals {
  male: number;
  female: number;
  total: number;
}

/**
 * Вычисляет общие суммы по полу
 */
export function calculateTotals(ageGroups: PopulationAgeGroup[]): Totals {
  let male = 0;
  let female = 0;
  for (const group of ageGroups) {
    male += group.male;
    female += group.female;
  }
  return { male, female, total: male + female };
}

/**
 * Вычисляет медианный возраст
 * @param ageGroups — массив возрастных групп
 * @returns медианный возраст (число)
 */
export function calculateMedianAge(ageGroups: PopulationAgeGroup[]): number {
  let totalPopulation = 0;
  for (const group of ageGroups) {
    totalPopulation += group.male + group.female;
  }
  
  const halfPopulation = totalPopulation / 2;
  
  let cumulative = 0;
  for (const group of ageGroups) {
    cumulative += group.male + group.female;
    if (cumulative >= halfPopulation) {
      return group.ageNumeric;
    }
  }
  return 0;
}

/**
 * Находит индекс возрастной группы, содержащей медианный возраст
 * Для агрегированных данных ищет группу, в диапазон которой попадает медиана
 */
export function findMedianAgeIndex(
  ageGroups: PopulationAgeGroup[],
  medianAge: number
): number {
  // Сначала пробуем точное совпадение
  const exactIndex = ageGroups.findIndex(g => g.ageNumeric === medianAge);
  if (exactIndex >= 0) return exactIndex;
  
  // Для агрегированных данных ищем группу, содержащую медианный возраст
  for (let i = 0; i < ageGroups.length; i++) {
    const next = ageGroups[i + 1];
    // Если следующей группы нет или её ageNumeric > medianAge
    if (!next || next.ageNumeric > medianAge) {
      return i;
    }
  }
  
  return ageGroups.length - 1;
}

/**
 * Конвертирует значение в проценты от общей суммы
 */
export function toPercent(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0;
}

/**
 * Вычисляет высоту графика в зависимости от количества групп
 */
export function calculateChartHeight(groupCount: number): number {
  const minHeight = groupCount <= 10 ? 400 : CHART_CONFIG.minHeight;
  return Math.max(
    minHeight,
    groupCount * CHART_CONFIG.heightPerAge + 
    CHART_CONFIG.padding.top + 
    CHART_CONFIG.padding.bottom
  );
}

/**
 * Вычисляет динамическую высоту столбика
 */
export function calculateBarHeight(
  chartHeight: number,
  groupCount: number
): number {
  const availableHeight = chartHeight - CHART_CONFIG.padding.top - CHART_CONFIG.padding.bottom - 80;
  const maxBarHeight = Math.floor((availableHeight / groupCount) * 0.7);
  // Ограничиваем: минимум 10, максимум 60
  return Math.max(10, Math.min(60, maxBarHeight));
}

