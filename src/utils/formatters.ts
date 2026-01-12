/**
 * Форматирует число населения для отображения
 * @param value - Число для форматирования
 * @returns Отформатированная строка
 */
export function formatPopulation(value: number): string {
  const absValue = Math.abs(value);
  
  if (absValue >= 1_000_000) {
    return `${(absValue / 1_000_000).toFixed(1)}M`;
  }
  
  if (absValue >= 1_000) {
    return `${Math.round(absValue / 1_000).toLocaleString('ru-RU')} 000`;
  }
  
  return absValue.toLocaleString('ru-RU');
}

/**
 * Форматирует число с разделителями разрядов
 * @param value - Число для форматирования
 * @returns Отформатированная строка с пробелами
 */
export function formatNumber(value: number): string {
  return Math.abs(value).toLocaleString('ru-RU');
}

/**
 * Форматирует дату для отображения
 * @param date - Строка даты или объект Date
 * @returns Отформатированная строка даты
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
