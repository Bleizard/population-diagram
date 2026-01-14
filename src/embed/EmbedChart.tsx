import { useMemo, useRef } from 'react';
import { PopulationPyramid } from '../components/features/PopulationPyramid';
import type { PopulationPyramidRef } from '../components/features/PopulationPyramid';
import { YearSelector } from '../components/common';
import { extractChartMetadata } from '../services/dataTransformer';
import type { PopulationData, ColorProfile, TimeSeriesPopulationData } from '../types';
import type { Theme } from '../hooks';
import styles from './EmbedChart.module.css';

type ViewMode = 'split' | 'combined';

interface EmbedChartProps {
  /** Данные о населении */
  data: PopulationData;
  /** Данные временного ряда (опционально) */
  timeSeriesData?: TimeSeriesPopulationData | null;
  /** Текущий выбранный год (для временного ряда) */
  selectedYear?: number | null;
  /** Тема */
  theme?: Theme;
  /** Режим отображения */
  viewMode?: ViewMode;
  /** Максимальный масштаб оси X */
  maxScale?: number;
  /** Интервал отображения меток оси Y */
  yAxisInterval?: number | 'auto' | ((index: number, value: string) => boolean);
  /** Кастомное название */
  customTitle?: string;
  /** Количество делений оси X */
  xAxisSplitCount?: number;
  /** Показывать значения внутри столбиков */
  showBarLabels?: boolean;
  /** Цветовой профиль */
  colorProfile?: ColorProfile;
  /** Показывать медианную линию */
  showMedianLine?: boolean;
  /** Отображать данные в процентах */
  showAsPercentage?: boolean;
  /** Callback при изменении года */
  onYearChange?: (year: number) => void;
}

/**
 * Упрощённая версия графика для встраивания на другие сайты
 * Без настроек, без экспорта, только интерактивный график
 */
export function EmbedChart({
  data,
  timeSeriesData,
  selectedYear,
  theme = 'light',
  viewMode = 'split',
  maxScale,
  yAxisInterval = 0,
  customTitle,
  xAxisSplitCount = 5,
  showBarLabels = false,
  colorProfile = 'pale',
  showMedianLine = false,
  showAsPercentage = false,
  onYearChange,
}: EmbedChartProps) {
  const chartRef = useRef<PopulationPyramidRef>(null);

  // Метаданные
  const metadata = useMemo(() => extractChartMetadata(data), [data]);

  // Эффективные значения
  const effectiveTitle = customTitle?.trim() || metadata.title;
  const effectiveMaxScale = maxScale ?? metadata.maxValue;
  const currentYear = selectedYear ?? (timeSeriesData ? timeSeriesData.years[timeSeriesData.years.length - 1] : null);

  // Данные для текущего года (если есть временной ряд)
  const currentData = useMemo(() => {
    if (!timeSeriesData || !currentYear) return data;
    const yearData = timeSeriesData.dataByYear[currentYear];
    if (!yearData) return data;
    return {
      ...data,
      ageGroups: yearData,
      date: String(currentYear),
    };
  }, [data, timeSeriesData, currentYear]);

  return (
    <div className={styles.embedContainer}>
      <PopulationPyramid
        ref={chartRef}
        data={currentData}
        theme={theme}
        viewMode={viewMode}
        maxScale={effectiveMaxScale}
        yAxisInterval={yAxisInterval}
        customTitle={effectiveTitle}
        xAxisSplitCount={xAxisSplitCount}
        showBarLabels={showBarLabels}
        colorProfile={colorProfile}
        showMedianLine={showMedianLine}
        showAsPercentage={showAsPercentage}
      />
      {timeSeriesData && currentYear && onYearChange && (
        <div className={styles.embedTimeline}>
          <YearSelector
            years={timeSeriesData.years}
            selectedYear={currentYear}
            onYearChange={onYearChange}
            compact
            chartTitle={effectiveTitle}
          />
        </div>
      )}
    </div>
  );
}

