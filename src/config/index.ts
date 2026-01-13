/**
 * Конфигурация приложения
 * 
 * Эти настройки используются для разработки и отладки.
 * Не выводятся в UI, но влияют на поведение приложения.
 */

export const config = {
  /**
   * Настройки загрузки файлов
   */
  fileLoading: {
    /**
     * Включить искусственные задержки между этапами загрузки
     * Полезно для демонстрации и отладки UI состояний загрузки
     */
    enableDelays: true,

    /**
     * Задержки для каждого этапа загрузки (в миллисекундах)
     * Работает только если enableDelays = true
     */
    stepDelays: {
      /** Чтение файла */
      reading: 500,
      /** Определение формата */
      detecting: 400,
      /** Валидация данных */
      validating: 600,
      /** Построение модели данных */
      building: 500,
      /** Завершение */
      done: 300,
    },
  },

  /**
   * Настройки разработки
   */
  dev: {
    /** Включить логирование в консоль */
    enableLogging: false,
  },
} as const;

/**
 * Тип конфигурации
 */
export type AppConfig = typeof config;

/**
 * Хелпер для получения задержки этапа
 */
export function getStepDelay(step: keyof typeof config.fileLoading.stepDelays): number {
  if (!config.fileLoading.enableDelays) {
    return 0;
  }
  return config.fileLoading.stepDelays[step];
}

/**
 * Утилита для создания задержки
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

