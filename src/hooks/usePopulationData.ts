import { useState, useCallback } from 'react';
import type { PopulationData, ParseResult, TimeSeriesPopulationData, DataFormat, ProcessingState, ProcessingStep } from '../types';
import { parsePopulationFile, detectDataFormat, ERROR_CODES } from '../services/fileParser';
import type { Translations } from '../i18n';
import { getStepDelay, delay } from '../config';

interface UsePopulationDataProps {
  /** Объект переводов */
  t: Translations;
}

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
  /** Состояние обработки файла */
  processingState: ProcessingState;
}

const INITIAL_PROCESSING_STATE: ProcessingState = {
  step: 'idle',
  progress: 0,
};

/**
 * Переводит код ошибки в локализованное сообщение
 */
function translateErrorCode(code: string, t: Translations): string {
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
 * @param props.t - Объект переводов для локализации ошибок
 */
export function usePopulationData({ t }: UsePopulationDataProps): UsePopulationDataReturn {
  const [data, setData] = useState<PopulationData | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesPopulationData | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<DataFormat | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>(INITIAL_PROCESSING_STATE);

  // Обновление этапа обработки
  const updateStep = useCallback((step: ProcessingStep, extra: Partial<ProcessingState> = {}) => {
    const progressMap: Record<ProcessingStep, number> = {
      idle: 0,
      reading: 20,
      detecting: 40,
      validating: 60,
      building: 80,
      done: 100,
      error: 0,
    };
    
    setProcessingState(prev => ({
      ...prev,
      step,
      progress: progressMap[step],
      ...extra,
    }));
  }, []);

  const loadFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setProcessingState(INITIAL_PROCESSING_STATE);

    try {
      // Этап 1: Чтение файла
      updateStep('reading', { message: t.processing.reading });
      await delay(getStepDelay('reading'));

      // Этап 2: Определение формата
      updateStep('detecting', { message: t.processing.detecting });
      const format = await detectDataFormat(file);
      await delay(getStepDelay('detecting'));
      
      updateStep('detecting', { 
        message: t.processing.detecting,
        detectedFormat: format,
      });

      // Этап 3: Валидация
      updateStep('validating', { 
        message: t.processing.validating,
        detectedFormat: format,
      });
      await delay(getStepDelay('validating'));

      // Этап 4: Построение модели данных
      updateStep('building', { 
        message: t.processing.building,
        detectedFormat: format,
      });
      
      const result: ParseResult = await parsePopulationFile(file);
      await delay(getStepDelay('building'));

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
        
        // Этап 5: Завершено
        await delay(getStepDelay('done'));
        updateStep('done', { 
          message: t.processing.done,
          detectedFormat: result.detectedFormat || 'simple',
        });
        
        setError(null);
      } else {
        const errorMsg = result.error 
          ? translateErrorCode(result.error, t) 
          : t.errors.unknownError;
        
        updateStep('error', { 
          message: errorMsg,
          error: errorMsg,
        });
        
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
      
      updateStep('error', { 
        message: errorMsg,
        error: errorMsg,
      });
      
      setError(errorMsg);
      setData(null);
      setTimeSeriesData(null);
      setDetectedFormat(null);
      setSelectedYear(null);
    } finally {
      setIsLoading(false);
    }
  }, [t, updateStep]);

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
    setProcessingState(INITIAL_PROCESSING_STATE);
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
    processingState,
  };
}
