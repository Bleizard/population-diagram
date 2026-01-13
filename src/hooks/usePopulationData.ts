import { useState, useCallback } from 'react';
import type { PopulationData, ParseResult, TimeSeriesPopulationData, DataFormat } from '../types';
import { parsePopulationFile, ERROR_CODES } from '../services/fileParser';
import { useI18n } from '../i18n';

interface UsePopulationDataReturn {
  /** Загруженные данные о населении */
  data: PopulationData | null;
  /** Данные временного ряда (для Eurostat/timeseries) */
  timeSeriesData: TimeSeriesPopulationData | null;
  /** Определённый формат данных */
  detectedFormat: DataFormat | null;
  /** Состояние загрузки */
  isLoading: boolean;
  /** Текст ошибки */
  error: string | null;
  /** Функция загрузки файла */
  loadFile: (file: File) => Promise<void>;
  /** Функция очистки данных */
  clearData: () => void;
  /** Выбрать год из временного ряда */
  selectYear: (year: number) => void;
  /** Текущий выбранный год */
  selectedYear: number | null;
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
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesPopulationData | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<DataFormat | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const result: ParseResult = await parsePopulationFile(file);

      if (result.success && result.data) {
        setData(result.data);
        setDetectedFormat(result.detectedFormat || 'simple');
        
        // Если есть данные временного ряда, сохраняем их
        if (result.timeSeriesData) {
          setTimeSeriesData(result.timeSeriesData);
          // Устанавливаем последний год как выбранный по умолчанию
          const years = result.timeSeriesData.years;
          setSelectedYear(years[years.length - 1]);
        } else {
          setTimeSeriesData(null);
          setSelectedYear(null);
        }
        
        setError(null);
      } else {
        const errorMsg = result.error 
          ? translateErrorCode(result.error, t) 
          : t.errors.unknownError;
        setError(errorMsg);
        setData(null);
        setTimeSeriesData(null);
        setDetectedFormat(null);
        setSelectedYear(null);
      }
    } catch (err) {
      const errorMsg = err instanceof Error 
        ? translateErrorCode(err.message, t)
        : t.errors.fileLoadError;
      setError(errorMsg);
      setData(null);
      setTimeSeriesData(null);
      setDetectedFormat(null);
      setSelectedYear(null);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const selectYear = useCallback((year: number) => {
    if (!timeSeriesData || !timeSeriesData.years.includes(year)) {
      return;
    }
    
    setSelectedYear(year);
    
    // Обновляем data для текущего года
    const yearData = timeSeriesData.dataByYear[year];
    if (yearData) {
      setData({
        title: timeSeriesData.title,
        date: String(year),
        source: timeSeriesData.source,
        ageGroups: yearData,
      });
    }
  }, [timeSeriesData]);

  const clearData = useCallback(() => {
    setData(null);
    setTimeSeriesData(null);
    setDetectedFormat(null);
    setSelectedYear(null);
    setError(null);
  }, []);

  return {
    data,
    timeSeriesData,
    detectedFormat,
    selectedYear,
    isLoading,
    error,
    loadFile,
    clearData,
    selectYear,
  };
}

