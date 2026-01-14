/**
 * Утилита для логирования с автоматическим отключением в продакшене
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    // Ошибки всегда логируем, но в продакшене можно отправлять в Sentry
    console.error(...args);
    
    if (import.meta.env.PROD) {
      // Пример интеграции с Sentry:
      // Sentry.captureException(new Error(String(args[0])));
    }
  },
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info(...args);
    }
  },
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },
};

