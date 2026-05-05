import ReactECharts from 'echarts-for-react';
import { useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import type { PopulationData, ColorProfile } from '../../../types';
import type { Theme } from '../../../hooks';
import type { ViewMode } from '../../common/ViewModeToggle';
import { transformToChartData, extractChartMetadata } from '../../../services/dataTransformer';
import { useI18n } from '../../../i18n';
import { formatPopulation } from '../../../utils';
import { calculatePopulationSummary } from '../../../utils/populationSummary';

// Локальные модули
import { getChartColors } from './chartColors';
import {
  calculateTotals,
  calculateMedianAge,
  findMedianAgeIndex,
  calculateChartHeight,
  calculateBarHeight,
} from './chartCalculations';
import { useChartExport } from './useChartExport';
import { useSplitChartOption } from './useSplitChartOption';
import { useCombinedChartOption } from './useCombinedChartOption';

import styles from './PopulationPyramid.module.css';

/** Методы, доступные через ref */
export interface PopulationPyramidRef {
  /** Экспортировать график в SVG и скачать файл */
  exportToSvg: (filename?: string) => void;
  /** Получить canvas с текущим состоянием графика */
  getCanvas: () => Promise<HTMLCanvasElement>;
}

interface PopulationPyramidProps {
  /** Данные о населении */
  data: PopulationData;
  /** Исходные данные для расчёта медианы (для агрегированных графиков) */
  sourceDataForMedian?: PopulationData;
  /** Текущая тема */
  theme?: Theme;
  /** Режим отображения: split (по полу) или combined (суммарно) */
  viewMode?: ViewMode;
  /** Кастомный максимум для оси X (если не задан, вычисляется автоматически) */
  maxScale?: number;
  /** Интервал отображения меток оси Y */
  yAxisInterval?: number | 'auto' | ((index: number, value: string) => boolean);
  /** Кастомное название графика */
  customTitle?: string;
  /** Показывать общую сумму населения */
  showTotal?: boolean;
  /** Количество делений оси X (с каждой стороны от 0) */
  xAxisSplitCount?: number;
  /** Показывать значения внутри столбиков */
  showBarLabels?: boolean;
  /** Цветовой профиль */
  colorProfile?: ColorProfile;
  /** Показывать медианную линию */
  showMedianLine?: boolean;
  /** Отображать данные в процентах */
  showAsPercentage?: boolean;
  /** Показывать summary-метрики над графиком */
  showSummaryMetrics?: boolean;
  /** Дополнительный CSS класс */
  className?: string;
}

/**
 * Компонент половозрастной пирамиды населения
 * Использует ECharts для отображения горизонтальной гистограммы
 */
export const PopulationPyramid = forwardRef<PopulationPyramidRef, PopulationPyramidProps>(
  function PopulationPyramid({ 
    data,
    sourceDataForMedian,
    theme = 'light', 
    viewMode = 'split',
    maxScale,
    yAxisInterval = 0,
    customTitle,
    showTotal = false,
    xAxisSplitCount = 5,
    showBarLabels = false,
    colorProfile = 'pale',
    showMedianLine = false,
    showAsPercentage = false,
    showSummaryMetrics = true,
    className 
  }, ref) {
    const { t } = useI18n();
    const chartRef = useRef<ReactECharts>(null);
    const summaryText = t.summary ?? {
      totalPopulation: 'Total population',
      childrenShare: 'Age 0-14',
      workingAgeShare: 'Age 15-64',
      seniorShare: 'Age 65+',
      dependencyRatio: 'Dependency ratio',
      sexRatio: 'Sex ratio',
      sexRatioHint: 'males per 100 females',
      notAvailable: 'N/A',
    };
    
    // Экспорт (SVG, canvas)
    const { exportToSvg, getCanvas } = useChartExport(chartRef, theme);
    
    // Экспортируем методы через ref
    useImperativeHandle(ref, () => ({ exportToSvg, getCanvas }), [exportToSvg, getCanvas]);
    
    // Трансформация данных
    const chartData = useMemo(() => transformToChartData(data), [data]);
    const metadata = useMemo(() => extractChartMetadata(data), [data]);
    
    // Цвета
    const colors = useMemo(
      () => getChartColors(colorProfile, theme),
      [colorProfile, theme]
    );
    
    // Расчёты
    const totals = useMemo(() => calculateTotals(data.ageGroups), [data.ageGroups]);
    const summaryAgeGroups = sourceDataForMedian?.ageGroups ?? data.ageGroups;
    
    const medianAge = useMemo(() => {
      return calculateMedianAge(summaryAgeGroups);
    }, [summaryAgeGroups]);
    
    const medianAgeIndex = useMemo(
      () => findMedianAgeIndex(data.ageGroups, medianAge),
      [data.ageGroups, medianAge]
    );
    
    // Размеры
    const groupCount = data.ageGroups.length;
    const chartHeight = useMemo(() => calculateChartHeight(groupCount), [groupCount]);
    const dynamicBarHeight = useMemo(
      () => calculateBarHeight(chartHeight, groupCount),
      [chartHeight, groupCount]
    );
    
    // Эффективные значения
    const effectiveTitle = customTitle?.trim() || metadata.title;
    const effectiveMaxScale = maxScale ?? metadata.maxValue;
    const hasGenderBreakdown = (sourceDataForMedian?.hasGenderData ?? data.hasGenderData) !== false;

    const summaryMetrics = useMemo(() => {
      const summary = calculatePopulationSummary(summaryAgeGroups, hasGenderBreakdown);
      const toShare = (value: number | null) => (
        value !== null ? `${value.toFixed(1)}%` : summaryText.notAvailable
      );
      const dependencyRatio = summary.dependencyRatio !== null
        ? `${summary.dependencyRatio.toFixed(1)}%`
        : summaryText.notAvailable;
      const sexRatio = summary.sexRatio !== null
        ? `${summary.sexRatio.toFixed(1)}`
        : summaryText.notAvailable;

      return [
        { id: 'total', label: summaryText.totalPopulation, value: formatPopulation(summary.totalPopulation) },
        { id: 'median', label: t.common.median, value: summary.medianAge !== null ? `${summary.medianAge}` : summaryText.notAvailable },
        { id: 'young', label: summaryText.childrenShare, value: toShare(summary.youngShare) },
        { id: 'working', label: summaryText.workingAgeShare, value: toShare(summary.workingAgeShare) },
        { id: 'senior', label: summaryText.seniorShare, value: toShare(summary.seniorShare) },
        { id: 'dependency', label: summaryText.dependencyRatio, value: dependencyRatio },
        { id: 'sexRatio', label: summaryText.sexRatio, value: sexRatio, hint: summaryText.sexRatioHint },
      ];
    }, [hasGenderBreakdown, summaryAgeGroups, summaryText, t.common.median]);

    // Опции для режимов
    const splitOption = useSplitChartOption({
      chartData,
      metadata,
      chartHeight,
      colors,
      effectiveMaxScale,
      yAxisInterval,
      effectiveTitle,
      dynamicBarHeight,
      xAxisSplitCount,
      showBarLabels,
      showAsPercentage,
      totalPopulation: totals.total,
      showMedianLine,
      medianAgeIndex,
      medianAge,
      theme,
      t,
    });

    const combinedOption = useCombinedChartOption({
      data,
      metadata,
      colors,
      maxScale,
      yAxisInterval,
      effectiveTitle,
      dynamicBarHeight,
      xAxisSplitCount,
      showBarLabels,
      showAsPercentage,
      totalPopulation: totals.total,
      showMedianLine,
      medianAgeIndex,
      medianAge,
      theme,
      t,
      hasGenderData: data.hasGenderData,
    });

    const option = viewMode === 'split' ? splitOption : combinedOption;
    const sourceInfo = metadata.source || data.source;

    return (
      <div className={`${styles.container} ${className || ''}`}>
        {showSummaryMetrics && (
          <div className={styles.summary}>
            {summaryMetrics.map((metric) => (
              <div key={metric.id} className={styles.summaryCard}>
                <div className={styles.summaryLabel}>{metric.label}</div>
                <div className={styles.summaryValue}>{metric.value}</div>
                {metric.hint && (
                  <div className={styles.summaryHint}>{metric.hint}</div>
                )}
              </div>
            ))}
          </div>
        )}
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ height: chartHeight, width: '100%' }}
          opts={{ renderer: 'svg' }}
          notMerge={true}
        />
        <div className={styles.footer}>
          {showTotal && (
            <div className={styles.totals}>
              <div className={styles.totalItem}>
                <span className={styles.totalLabel}>{t.common.total}:</span>
                <span className={styles.totalValue}>{formatPopulation(totals.total)}</span>
              </div>
              {viewMode === 'split' && data.hasGenderData !== false && (
                <>
                  <div className={styles.totalItem}>
                    <span className={styles.totalDot} style={{ background: colors.male }} />
                    <span className={styles.totalLabel}>{t.common.males}:</span>
                    <span className={styles.totalValue}>{formatPopulation(totals.male)}</span>
                  </div>
                  <div className={styles.totalItem}>
                    <span className={styles.totalDot} style={{ background: colors.female }} />
                    <span className={styles.totalLabel}>{t.common.females}:</span>
                    <span className={styles.totalValue}>{formatPopulation(totals.female)}</span>
                  </div>
                </>
              )}
            </div>
          )}
          {sourceInfo && (
            <div className={styles.source}>
              {sourceInfo}
            </div>
          )}
        </div>
      </div>
    );
  }
);
