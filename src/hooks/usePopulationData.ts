import { useState, useCallback } from 'react';
import type { PopulationData, ParseResult } from '../types';
import { parsePopulationFile } from '../services/fileParser';

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
 * Хук для управления состоянием данных о населении
 * Обрабатывает загрузку файлов и хранит результат
 */
export function usePopulationData(): UsePopulationDataReturn {
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
        setError(result.error || 'Неизвестная ошибка');
        setData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке файла');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

