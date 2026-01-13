import type { PopulationData, PopulationAgeGroup, AgeRangeConfig } from '../../types';

/**
 * Агрегирует данные о населении по заданным возрастным группам
 * @param data - Исходные данные о населении
 * @param groups - Конфигурация возрастных групп для агрегации
 * @returns Новый объект PopulationData с агрегированными данными
 */
export function aggregateByAgeGroups(
  data: PopulationData,
  groups: AgeRangeConfig[]
): PopulationData {
  // Сортируем группы по начальному возрасту
  const sortedGroups = [...groups].sort((a, b) => a.from - b.from);

  const aggregatedGroups: PopulationAgeGroup[] = sortedGroups.map((group) => {
    // Фильтруем возрастные группы, попадающие в диапазон
    const matchingAges = data.ageGroups.filter((ageGroup) => {
      const age = ageGroup.ageNumeric;
      const matchesFrom = age >= group.from;
      const matchesTo = group.to === null || age <= group.to;
      return matchesFrom && matchesTo;
    });

    // Суммируем значения
    const totalMale = matchingAges.reduce((sum, ag) => sum + ag.male, 0);
    const totalFemale = matchingAges.reduce((sum, ag) => sum + ag.female, 0);

    return {
      age: group.label,
      ageNumeric: group.from, // Используем начало диапазона для сортировки
      male: totalMale,
      female: totalFemale,
    };
  });

  return {
    ...data,
    title: `${data.title} (grouped)`,
    ageGroups: aggregatedGroups,
  };
}

/**
 * Генерирует метку для возрастного диапазона
 * @param from - Начало диапазона
 * @param to - Конец диапазона (null = "и старше")
 */
export function generateRangeLabel(from: number, to: number | null): string {
  if (to === null) {
    return `${from}+`;
  }
  if (from === to) {
    return `${from}`;
  }
  return `${from}-${to}`;
}

/**
 * Создаёт конфигурацию возрастной группы
 */
export function createAgeRangeConfig(
  from: number,
  to: number | null
): AgeRangeConfig {
  return {
    id: crypto.randomUUID(),
    from,
    to,
    label: generateRangeLabel(from, to),
  };
}

/**
 * Валидирует конфигурацию групп
 * Проверяет на пересечения и пропуски
 */
export function validateAgeGroups(
  groups: AgeRangeConfig[],
  maxAge: number = 100
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (groups.length === 0) {
    errors.push('Add at least one age group');
    return { valid: false, errors };
  }

  // Сортируем по началу диапазона
  const sorted = [...groups].sort((a, b) => a.from - b.from);

  // Проверяем каждую группу
  for (let i = 0; i < sorted.length; i++) {
    const group = sorted[i];

    // Проверка корректности диапазона
    if (group.to !== null && group.from > group.to) {
      errors.push(`Group "${group.label}": start is greater than end`);
    }

    // Проверка на отрицательные значения
    if (group.from < 0) {
      errors.push(`Group "${group.label}": age cannot be negative`);
    }

    // Проверка на пересечения с предыдущей группой
    if (i > 0) {
      const prevGroup = sorted[i - 1];
      const prevEnd = prevGroup.to ?? maxAge;
      
      if (group.from <= prevEnd) {
        errors.push(`Groups "${prevGroup.label}" and "${group.label}" overlap`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Предустановленные конфигурации групп
 */
export const PRESET_GROUPS = {
  /** Три поколения */
  threeGenerations: [
    createAgeRangeConfig(0, 19),
    createAgeRangeConfig(20, 64),
    createAgeRangeConfig(65, null),
  ],
  /** Пять групп */
  fiveGroups: [
    createAgeRangeConfig(0, 14),
    createAgeRangeConfig(15, 29),
    createAgeRangeConfig(30, 49),
    createAgeRangeConfig(50, 69),
    createAgeRangeConfig(70, null),
  ],
  /** По десятилетиям */
  decades: [
    createAgeRangeConfig(0, 9),
    createAgeRangeConfig(10, 19),
    createAgeRangeConfig(20, 29),
    createAgeRangeConfig(30, 39),
    createAgeRangeConfig(40, 49),
    createAgeRangeConfig(50, 59),
    createAgeRangeConfig(60, 69),
    createAgeRangeConfig(70, 79),
    createAgeRangeConfig(80, null),
  ],
} as const;

/**
 * Получает список пресетов с метаданными
 * @param labels - объект с локализованными метками { preset3, preset5, presetDecades }
 */
export function getPresetOptions(labels?: { preset3: string; preset5: string; presetDecades: string }) {
  return [
    { id: 'threeGenerations', label: labels?.preset3 ?? '3 groups (0-19, 20-64, 65+)', groups: PRESET_GROUPS.threeGenerations },
    { id: 'fiveGroups', label: labels?.preset5 ?? '5 groups', groups: PRESET_GROUPS.fiveGroups },
    { id: 'decades', label: labels?.presetDecades ?? 'By decades', groups: PRESET_GROUPS.decades },
  ];
}

