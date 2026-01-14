import ReactECharts from 'echarts-for-react';
import { useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import type { PopulationData, ColorProfile } from '../../../types';
import type { Theme } from '../../../hooks';
import type { ViewMode } from '../../common/ViewModeToggle';
import { transformToChartData, extractChartMetadata } from '../../../services/dataTransformer';
import { useI18n } from '../../../i18n';
import { formatPopulation } from '../../../utils';

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
    className 
  }, ref) {
    const { t } = useI18n();
    const chartRef = useRef<ReactECharts>(null);
    
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
    
    const medianAge = useMemo(() => {
      const ageGroups = sourceDataForMedian?.ageGroups ?? data.ageGroups;
      return calculateMedianAge(ageGroups);
    }, [data.ageGroups, sourceDataForMedian]);
    
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
    });

    const option = viewMode === 'split' ? splitOption : combinedOption;
    const sourceInfo = metadata.source || data.source;

    return (
      <div className={`${styles.container} ${className || ''}`}>
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
              {viewMode === 'split' && (
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
