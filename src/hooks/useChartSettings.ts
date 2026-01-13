import { useState, useCallback, useRef } from 'react';
import type { ChartSettings, ChartInstance, PopulationData, AgeRangeConfig, TimeSeriesPopulationData } from '../types';
import type { PopulationPyramidRef } from '../components/features/PopulationPyramid';
import type { ScaleConfig } from '../components/common/ScaleConfigurator';
import { aggregateByAgeGroups } from '../services/dataAggregator';
import { ORIGINAL_CHART_ID, DEFAULT_CHART_SETTINGS } from '../constants';

interface UseChartSettingsReturn {
  /** Настройки всех графиков */
  chartSettings: Record<string, ChartSettings>;
  /** Список дополнительных (агрегированных) графиков */
  additionalCharts: ChartInstance[];
  /** ID графика с открытой панелью настроек */
  settingsOpenFor: string | null;
  /** ID графика в полноэкранном режиме */
  fullscreenChartId: string | null;
  /** Refs для доступа к методам графиков */
  chartRefs: React.MutableRefObject<Record<string, PopulationPyramidRef | null>>;
  
  /** Получить настройки графика */
  getSettings: (chartId: string) => ChartSettings;
  /** Обновить настройки графика */
  updateSettings: (chartId: string, updates: Partial<ChartSettings>) => void;
  /** Получить максимальное значение из данных */
  getDataMaxValue: (chartData: { ageGroups: { male: number; female: number }[] }) => number;
  /** Конвертировать настройки в ScaleConfig */
  toScaleConfig: (settings: ChartSettings) => ScaleConfig;
  
  /** Получить данные для графика с учётом выбранного года */
  getChartData: (chartId: string, baseData: PopulationData | null, timeSeriesData: TimeSeriesPopulationData | null) => PopulationData | null;
  /** Получить данные для агрегированного графика */
  getAggregatedChartData: (chart: ChartInstance, timeSeriesData: TimeSeriesPopulationData | null, initialData: PopulationData | null) => PopulationData;
  /** Обработчик изменения года */
  handleYearChange: (chartId: string, year: number) => void;
  
  /** Создать агрегированный график */
  createGroupedChart: (groups: AgeRangeConfig[], currentData: PopulationData | null, initialSelectedYear: number | null) => void;
  /** Удалить агрегированный график */
  removeChart: (chartId: string) => void;
  /** Сбросить все настройки */
  resetAll: () => void;
  
  /** Открыть панель настроек */
  openSettings: (chartId: string) => void;
  /** Закрыть панель настроек */
  closeSettings: () => void;
  
  /** Открыть полноэкранный режим */
  openFullscreen: (chartId: string) => void;
  /** Закрыть полноэкранный режим */
  closeFullscreen: () => void;
  
  /** Экспорт графика в SVG */
  exportToSvg: (chartId: string, title?: string) => void;
  /** Создать функцию получения canvas для GIF */
  createGetChartCanvas: (chartId: string) => (year: number) => Promise<HTMLCanvasElement>;
}

export function useChartSettings(): UseChartSettingsReturn {
  // Настройки для каждого графика
  const [chartSettings, setChartSettings] = useState<Record<string, ChartSettings>>({
    [ORIGINAL_CHART_ID]: { ...DEFAULT_CHART_SETTINGS },
  });
  
  // Список дополнительных графиков
  const [additionalCharts, setAdditionalCharts] = useState<ChartInstance[]>([]);
  
  // ID графика с открытыми настройками
  const [settingsOpenFor, setSettingsOpenFor] = useState<string | null>(null);
  
  // ID графика в полноэкранном режиме
  const [fullscreenChartId, setFullscreenChartId] = useState<string | null>(null);
  
  // Refs для графиков
  const chartRefs = useRef<Record<string, PopulationPyramidRef | null>>({});

  // Получение настроек
  const getSettings = useCallback((chartId: string): ChartSettings => {
    return chartSettings[chartId] ?? { ...DEFAULT_CHART_SETTINGS };
  }, [chartSettings]);

  // Обновление настроек
  const updateSettings = useCallback((chartId: string, updates: Partial<ChartSettings>) => {
    setChartSettings((prev) => ({
      ...prev,
      [chartId]: {
        ...(prev[chartId] ?? DEFAULT_CHART_SETTINGS),
        ...updates,
      },
    }));
  }, []);

  // Максимальное значение из данных
  const getDataMaxValue = useCallback((chartData: { ageGroups: { male: number; female: number }[] }) => {
    let max = 0;
    for (const group of chartData.ageGroups) {
      max = Math.max(max, group.male, group.female);
    }
    return max;
  }, []);

  // Конвертация в ScaleConfig
  const toScaleConfig = useCallback((settings: ChartSettings): ScaleConfig => ({
    mode: settings.scaleMode,
    customValue: settings.scaleCustomValue,
  }), []);

  // Получение данных с учётом года
  const getChartData = useCallback((
    chartId: string, 
    baseData: PopulationData | null,
    timeSeriesData: TimeSeriesPopulationData | null
  ): PopulationData | null => {
    if (!baseData) return null;
    if (!timeSeriesData) return baseData;
    
    const settings = chartSettings[chartId];
    const year = settings?.selectedYear;
    if (!year) return baseData;
    
    const yearData = timeSeriesData.dataByYear[year];
    if (!yearData) return baseData;
    
    return {
      title: timeSeriesData.title,
      date: String(year),
      source: timeSeriesData.source,
      ageGroups: yearData,
    };
  }, [chartSettings]);

  // Получение агрегированных данных
  const getAggregatedChartData = useCallback((
    chart: ChartInstance,
    timeSeriesData: TimeSeriesPopulationData | null,
    _initialData: PopulationData | null // Сохраняется для совместимости API
  ): PopulationData => {
    if (!timeSeriesData || !chart.groupConfig) return chart.data;
    
    const settings = chartSettings[chart.id];
    const year = settings?.selectedYear;
    if (!year) return chart.data;
    
    const yearData = timeSeriesData.dataByYear[year];
    if (!yearData) return chart.data;
    
    const baseData: PopulationData = {
      title: timeSeriesData.title,
      date: String(year),
      source: timeSeriesData.source,
      ageGroups: yearData,
    };
    
    return aggregateByAgeGroups(baseData, chart.groupConfig);
  }, [chartSettings]);

  // Изменение года
  const handleYearChange = useCallback((chartId: string, year: number) => {
    updateSettings(chartId, { selectedYear: year });
  }, [updateSettings]);

  // Создание агрегированного графика
  const createGroupedChart = useCallback((
    groups: AgeRangeConfig[], 
    currentData: PopulationData | null,
    initialSelectedYear: number | null
  ) => {
    if (!currentData) return;

    const aggregatedData = aggregateByAgeGroups(currentData, groups);
    const newChartId = crypto.randomUUID();
    const newChart: ChartInstance = {
      id: newChartId,
      data: aggregatedData,
      isOriginal: false,
      groupConfig: groups,
    };
    
    const originalSettings = chartSettings[ORIGINAL_CHART_ID];
    const currentYear = originalSettings?.selectedYear ?? initialSelectedYear;

    setAdditionalCharts((prev) => [...prev, newChart]);
    setChartSettings((prev) => ({
      ...prev,
      [newChartId]: { ...DEFAULT_CHART_SETTINGS, selectedYear: currentYear ?? undefined },
    }));
  }, [chartSettings]);

  // Удаление графика
  const removeChart = useCallback((chartId: string) => {
    setAdditionalCharts((prev) => prev.filter((c) => c.id !== chartId));
    setChartSettings((prev) => {
      const { [chartId]: _, ...rest } = prev;
      return rest;
    });
    if (settingsOpenFor === chartId) {
      setSettingsOpenFor(null);
    }
  }, [settingsOpenFor]);

  // Сброс всех настроек
  const resetAll = useCallback(() => {
    setAdditionalCharts([]);
    setChartSettings({ [ORIGINAL_CHART_ID]: { ...DEFAULT_CHART_SETTINGS } });
    setSettingsOpenFor(null);
    setFullscreenChartId(null);
  }, []);

  // Открытие/закрытие настроек
  const openSettings = useCallback((chartId: string) => {
    setSettingsOpenFor(chartId);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpenFor(null);
  }, []);

  // Открытие/закрытие полноэкранного режима
  const openFullscreen = useCallback((chartId: string) => {
    setFullscreenChartId(chartId);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeFullscreen = useCallback(() => {
    setFullscreenChartId(null);
    document.body.style.overflow = '';
  }, []);

  // Экспорт в SVG
  const exportToSvg = useCallback((chartId: string, title?: string) => {
    const chartRef = chartRefs.current[chartId];
    if (chartRef) {
      const settings = chartSettings[chartId];
      const year = settings?.selectedYear;
      const baseName = title?.replace(/[^a-zA-Z0-9]/g, '-') || 'population-pyramid';
      const filename = year ? `${baseName}-${year}.svg` : `${baseName}.svg`;
      chartRef.exportToSvg(filename);
    }
  }, [chartSettings]);

  // Создание функции для получения canvas
  const createGetChartCanvas = useCallback((chartId: string) => {
    return async (_year: number): Promise<HTMLCanvasElement> => {
      const chartRef = chartRefs.current[chartId];
      if (!chartRef) {
        throw new Error('Chart ref not available');
      }
      await new Promise(resolve => setTimeout(resolve, 50));
      return chartRef.getCanvas();
    };
  }, []);

  return {
    chartSettings,
    additionalCharts,
    settingsOpenFor,
    fullscreenChartId,
    chartRefs,
    
    getSettings,
    updateSettings,
    getDataMaxValue,
    toScaleConfig,
    
    getChartData,
    getAggregatedChartData,
    handleYearChange,
    
    createGroupedChart,
    removeChart,
    resetAll,
    
    openSettings,
    closeSettings,
    
    openFullscreen,
    closeFullscreen,
    
    exportToSvg,
    createGetChartCanvas,
  };
}

