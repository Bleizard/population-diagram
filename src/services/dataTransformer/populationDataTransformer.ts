import type { PopulationData, ChartDataItem, ChartMetadata } from '../../types';

/**
 * Преобразует данные о населении в формат, готовый для отображения на диаграмме
 * @param data - Исходные данные о населении
 * @returns Массив данных для диаграммы
 */
export function transformToChartData(data: PopulationData): ChartDataItem[] {
  return data.ageGroups.map((group) => {
    const male = group.male;
    const female = group.female;
    
    // Вычисляем избыток
    const maleSurplus = male > female ? male - female : 0;
    const femaleSurplus = female > male ? female - male : 0;
    
    // Базовые значения (минимум из двух)
    const maleBase = male - maleSurplus;
    const femaleBase = female - femaleSurplus;

    return {
      age: group.age,
      male: -male, // Отрицательное для отображения слева
      female: female,
      maleSurplus: -maleSurplus, // Отрицательное для отображения слева
      femaleSurplus: femaleSurplus,
      maleBase: -maleBase, // Отрицательное для отображения слева
      femaleBase: femaleBase,
    };
  });
}

/**
 * Извлекает метаданные для диаграммы из данных о населении
 * @param data - Исходные данные о населении
 * @returns Метаданные для диаграммы
 */
export function extractChartMetadata(data: PopulationData): ChartMetadata {
  // Находим максимальное значение для масштабирования
  let maxValue = 0;
  
  for (const group of data.ageGroups) {
    maxValue = Math.max(maxValue, group.male, group.female);
  }

  // Округляем вверх до красивого числа
  maxValue = roundToNiceNumber(maxValue);

  return {
    title: data.title,
    subtitle: data.date,
    source: data.source,
    maxValue,
  };
}

/**
 * Округляет число до "красивого" значения для оси
 */
function roundToNiceNumber(value: number): number {
  if (value === 0) return 100;
  
  const orderOfMagnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / orderOfMagnitude;
  
  let niceNormalized: number;
  if (normalized <= 1) {
    niceNormalized = 1;
  } else if (normalized <= 2) {
    niceNormalized = 2;
  } else if (normalized <= 5) {
    niceNormalized = 5;
  } else {
    niceNormalized = 10;
  }
  
  return niceNormalized * orderOfMagnitude;
}

/**
 * Получает список возрастных групп для оси Y
 */
export function getAgeLabels(data: PopulationData): string[] {
  return data.ageGroups.map((group) => group.age);
}

