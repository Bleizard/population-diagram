import { useState, useCallback } from 'react';
import type { PopulationData, ParseResult } from '../types';
import { parsePopulationFile, ERROR_CODES } from '../services/fileParser';
import { useI18n } from '../i18n';

interface UsePopulationDataReturn {
  /** Загруженные данные о населении */
  data: PopulationData | null;
  /** Состояние загрузки */
  isLoading: boolean;
  /** Текст ошибки */
  error: string | null;
  /** Функция загрузки файла */
  loadFile: (file: File) => Promise<void>;
  /** Функция очистки данных */
  clearData: () => void;
}

/**
 * Переводит код ошибки в локализованное сообщение
 */
function translateErrorCode(code: string, t: ReturnType<typeof useI18n>['t']): string {
  const errorMap: Record<string, string> = {
    [ERROR_CODES.AGE_COLUMN_NOT_FOUND]: t.errors.ageColumnNotFound,
    [ERROR_CODES.MALE_COLUMN_NOT_FOUND]: t.errors.maleColumnNotFound,
    [ERROR_CODES.FEMALE_COLUMN_NOT_FOUND]: t.errors.femaleColumnNotFound,
    [ERROR_CODES.CSV_PARSE_ERROR]: t.errors.csvParseError,
    [ERROR_CODES.EXCEL_PARSE_ERROR]: t.errors.excelParseError,
    [ERROR_CODES.UNKNOWN_FILE_FORMAT]: t.errors.unknownFileFormat,
  };
  return errorMap[code] || code;
}

/**
 * Хук для управления состоянием данных о населении
 * Обрабатывает загрузку файлов и хранит результат
 */
export function usePopulationData(): UsePopulationDataReturn {
  const { t } = useI18n();
  const [data, setData] = useState<PopulationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const result: ParseResult = await parsePopulationFile(file);

      if (result.success && result.data) {
        setData(result.data);
        setError(null);
      } else {
        const errorMsg = result.error 
          ? translateErrorCode(result.error, t) 
          : t.errors.unknownError;
        setError(errorMsg);
        setData(null);
      }
    } catch (err) {
      const errorMsg = err instanceof Error 
        ? translateErrorCode(err.message, t)
        : t.errors.fileLoadError;
      setError(errorMsg);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const clearData = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    data,
    isLoading,
    error,
    loadFile,
    clearData,
  };
}

