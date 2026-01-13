import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import type { PopulationData } from '../../../types';
import type { Theme } from '../../../hooks';
import type { ViewMode } from '../../common/ViewModeToggle';
import { transformToChartData, extractChartMetadata } from '../../../services/dataTransformer';
import { LEGEND_LABELS, AXIS_LABELS, CHART_CONFIG } from '../../../constants';
import { formatPopulation } from '../../../utils';
import styles from './PopulationPyramid.module.css';

interface PopulationPyramidProps {
  /** Данные о населении */
  data: PopulationData;
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
  /** Дополнительный CSS класс */
  className?: string;
}

/**
 * Цвета диаграммы для разных тем
 */
const THEME_COLORS = {
  light: {
    male: '#93c5fd',
    maleSurplus: '#3b82f6',
    female: '#fda4af',
    femaleSurplus: '#f43f5e',
    total: '#3b82f6',
    totalGradientStart: '#60a5fa',
    totalGradientEnd: '#2563eb',
    text: '#374151',
    textSecondary: '#6b7280',
    grid: '#e5e7eb',
    centerLine: '#9ca3af',
    background: '#ffffff',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e5e7eb',
  },
  dark: {
    male: '#7dd3fc',
    maleSurplus: '#38bdf8',
    female: '#fda4af',
    femaleSurplus: '#fb7185',
    total: '#60a5fa',
    totalGradientStart: '#93c5fd',
    totalGradientEnd: '#3b82f6',
    text: '#e2e8f0',
    textSecondary: '#94a3b8',
    grid: '#334155',
    centerLine: '#64748b',
    background: '#1e293b',
    tooltipBg: '#1e293b',
    tooltipBorder: '#475569',
  },
};

/**
 * Компонент половозрастной пирамиды населения
 * Использует ECharts для отображения горизонтальной гистограммы
 */
export function PopulationPyramid({ 
  data, 
  theme = 'light', 
  viewMode = 'split',
  maxScale,
  yAxisInterval = 0,
  customTitle,
  showTotal = false,
  xAxisSplitCount = 5,
  showBarLabels = false,
  className 
}: PopulationPyramidProps) {
  const chartData = useMemo(() => transformToChartData(data), [data]);
  const metadata = useMemo(() => extractChartMetadata(data), [data]);
  const colors = THEME_COLORS[theme];
  
  // Используем кастомное название если оно задано
  const effectiveTitle = customTitle?.trim() || metadata.title;
  
  // Вычисляем общие суммы
  const totals = useMemo(() => {
    let male = 0;
    let female = 0;
    for (const group of data.ageGroups) {
      male += group.male;
      female += group.female;
    }
    return { male, female, total: male + female };
  }, [data.ageGroups]);
  
  // Используем кастомный масштаб или из метаданных
  const effectiveMaxScale = maxScale ?? metadata.maxValue;

  // Количество групп
  const groupCount = data.ageGroups.length;
  
  // Минимальная высота графика
  const minChartHeight = groupCount <= 10 ? 400 : CHART_CONFIG.minHeight;
  
  // Высота диаграммы зависит от количества возрастных групп
  const chartHeight = Math.max(
    minChartHeight,
    groupCount * CHART_CONFIG.heightPerAge + 
    CHART_CONFIG.padding.top + 
    CHART_CONFIG.padding.bottom
  );
  
  // Доступная высота для данных (без отступов и заголовка)
  const availableHeight = chartHeight - CHART_CONFIG.padding.top - CHART_CONFIG.padding.bottom - 80;
  
  // Динамическая высота бара — занимаем ~70% доступного пространства на группу
  const dynamicBarHeight = useMemo(() => {
    const maxBarHeight = Math.floor((availableHeight / groupCount) * 0.7);
    // Ограничиваем: минимум 10, максимум 60
    return Math.max(10, Math.min(60, maxBarHeight));
  }, [availableHeight, groupCount]);

  // Конфигурация для режима "split" (по полу)
  const splitOption: EChartsOption = useMemo(() => {
    const ageLabels = chartData.map((item) => item.age);
    
    const maleBaseData = chartData.map((item) => item.maleBase);
    const maleSurplusData = chartData.map((item) => item.maleSurplus);
    const femaleBaseData = chartData.map((item) => item.femaleBase);
    const femaleSurplusData = chartData.map((item) => item.femaleSurplus);

    return {
      backgroundColor: colors.background,
      title: {
        text: effectiveTitle,
        subtext: metadata.subtitle || '',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 28,
          fontWeight: 600,
          fontFamily: "'Playfair Display', Georgia, serif",
          color: colors.text,
        },
        subtextStyle: {
          fontSize: 14,
          color: colors.textSecondary,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { 
          type: 'line',
          lineStyle: {
            color: colors.centerLine,
            type: 'dashed',
          },
        },
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text },
        formatter: (params: unknown) => {
          const items = params as Array<{
            axisValue: string;
            seriesName: string;
            value: number;
          }>;
          
          if (!Array.isArray(items) || items.length === 0) return '';
          
          const age = items[0].axisValue;
          let maleTotal = 0;
          let femaleTotal = 0;
          
          items.forEach((item) => {
            const value = Math.abs(item.value);
            if (item.seriesName.includes('Male')) {
              maleTotal += value;
            } else {
              femaleTotal += value;
            }
          });
          
          return `
            <div style="font-family: 'DM Sans', sans-serif; padding: 4px 0; color: ${colors.text};">
              <div style="font-weight: 600; margin-bottom: 8px;">Age: ${age}</div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="display: inline-block; width: 12px; height: 12px; background: ${colors.male}; border-radius: 2px;"></span>
                <span>Males: ${formatPopulation(maleTotal)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 12px; height: 12px; background: ${colors.female}; border-radius: 2px;"></span>
                <span>Females: ${formatPopulation(femaleTotal)}</span>
              </div>
              <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid ${colors.grid};">
                <strong>Total: ${formatPopulation(maleTotal + femaleTotal)}</strong>
              </div>
            </div>
          `;
        },
      },
      legend: {
        data: [
          LEGEND_LABELS.male,
          LEGEND_LABELS.maleSurplus,
          LEGEND_LABELS.female,
          LEGEND_LABELS.femaleSurplus,
        ],
        top: 55,
        left: 20,
        orient: 'vertical',
        itemGap: 8,
        itemWidth: 16,
        itemHeight: 12,
        selectedMode: false,
        textStyle: {
          fontSize: 12,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          color: colors.text,
        },
      },
      grid: {
        left: CHART_CONFIG.padding.left,
        right: CHART_CONFIG.padding.right,
        top: CHART_CONFIG.padding.top + 80,
        bottom: CHART_CONFIG.padding.bottom,
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        min: -effectiveMaxScale,
        max: effectiveMaxScale,
        splitNumber: xAxisSplitCount * 2,
        axisLabel: {
          formatter: (value: number) => formatPopulation(Math.abs(value)),
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          fontSize: 11,
          color: colors.textSecondary,
        },
        axisLine: { show: true, lineStyle: { color: colors.grid } },
        splitLine: { show: true, lineStyle: { color: colors.grid, type: 'dashed' } },
        name: AXIS_LABELS.population,
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: {
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          color: colors.text,
        },
      },
      yAxis: {
        type: 'category',
        data: ageLabels,
        axisTick: { show: false },
        axisLine: { show: true, lineStyle: { color: colors.centerLine } },
        axisLabel: {
          fontSize: 10,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          color: colors.textSecondary,
          interval: yAxisInterval,
        },
        splitLine: { 
          show: true, 
          lineStyle: { 
            color: colors.grid, 
            type: 'dashed',
            opacity: 0.5,
          } 
        },
        name: AXIS_LABELS.age,
        nameLocation: 'end',
        nameGap: 10,
        nameTextStyle: {
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          color: colors.text,
        },
      },
      series: [
        {
          name: LEGEND_LABELS.male,
          type: 'bar',
          stack: 'male',
          data: maleBaseData,
          itemStyle: { color: colors.male },
          barWidth: dynamicBarHeight,
          barGap: '-100%',
          emphasis: { itemStyle: { opacity: 0.8 } },
          label: {
            show: showBarLabels,
            position: 'insideRight',
            formatter: (params: { dataIndex: number }) => {
              const value = Math.abs(chartData[params.dataIndex].male);
              return formatPopulation(value);
            },
            fontSize: 10,
            fontFamily: "'DM Sans', sans-serif",
            color: '#fff',
            textShadowColor: 'rgba(0,0,0,0.3)',
            textShadowBlur: 2,
          },
        },
        {
          name: LEGEND_LABELS.maleSurplus,
          type: 'bar',
          stack: 'male',
          data: maleSurplusData,
          itemStyle: { color: colors.maleSurplus },
          barWidth: dynamicBarHeight,
          emphasis: { itemStyle: { opacity: 0.8 } },
        },
        {
          name: LEGEND_LABELS.female,
          type: 'bar',
          stack: 'female',
          data: femaleBaseData,
          itemStyle: { color: colors.female },
          barWidth: dynamicBarHeight,
          barGap: '-100%',
          emphasis: { itemStyle: { opacity: 0.8 } },
          label: {
            show: showBarLabels,
            position: 'insideLeft',
            formatter: (params: { dataIndex: number }) => {
              const value = chartData[params.dataIndex].female;
              return formatPopulation(value);
            },
            fontSize: 10,
            fontFamily: "'DM Sans', sans-serif",
            color: '#fff',
            textShadowColor: 'rgba(0,0,0,0.3)',
            textShadowBlur: 2,
          },
        },
        {
          name: LEGEND_LABELS.femaleSurplus,
          type: 'bar',
          stack: 'female',
          data: femaleSurplusData,
          itemStyle: { color: colors.femaleSurplus },
          barWidth: dynamicBarHeight,
          emphasis: { itemStyle: { opacity: 0.8 } },
        },
      ],
      graphic: [
        {
          type: 'line',
          z: 100,
          shape: {
            x1: '50%',
            y1: CHART_CONFIG.padding.top + 80,
            x2: '50%',
            y2: chartHeight - CHART_CONFIG.padding.bottom,
          },
          style: {
            stroke: colors.centerLine,
            lineWidth: 1,
          },
        },
      ],
    };
  }, [chartData, metadata, chartHeight, colors, effectiveMaxScale, yAxisInterval, effectiveTitle, dynamicBarHeight, xAxisSplitCount, showBarLabels]);

  // Конфигурация для режима "combined" (суммарно)
  const combinedOption: EChartsOption = useMemo(() => {
    const ageLabels = data.ageGroups.map((group) => group.age);
    const totalData = data.ageGroups.map((group) => group.male + group.female);
    const maxTotal = Math.max(...totalData);
    // Для combined режима используем двойной масштаб (male + female)
    const combinedMaxScale = maxScale ? maxScale * 2 : Math.ceil(maxTotal * 1.1 / 100000) * 100000;

    return {
      backgroundColor: colors.background,
      title: {
        text: effectiveTitle,
        subtext: metadata.subtitle || '',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 28,
          fontWeight: 600,
          fontFamily: "'Playfair Display', Georgia, serif",
          color: colors.text,
        },
        subtextStyle: {
          fontSize: 14,
          color: colors.textSecondary,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { 
          type: 'line',
          lineStyle: {
            color: colors.centerLine,
            type: 'dashed',
          },
        },
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text },
        formatter: (params: unknown) => {
          const items = params as Array<{
            axisValue: string;
            value: number;
            dataIndex: number;
          }>;
          
          if (!Array.isArray(items) || items.length === 0) return '';
          
          const item = items[0];
          const age = item.axisValue;
          const total = item.value;
          const ageGroup = data.ageGroups[item.dataIndex];
          
          return `
            <div style="font-family: 'DM Sans', sans-serif; padding: 4px 0; color: ${colors.text};">
              <div style="font-weight: 600; margin-bottom: 8px;">Age: ${age}</div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="display: inline-block; width: 12px; height: 12px; background: ${colors.total}; border-radius: 2px;"></span>
                <span>Total: ${formatPopulation(total)}</span>
              </div>
              <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid ${colors.grid}; font-size: 0.875em; color: ${colors.textSecondary};">
                <div>Males: ${formatPopulation(ageGroup.male)}</div>
                <div>Females: ${formatPopulation(ageGroup.female)}</div>
              </div>
            </div>
          `;
        },
      },
      legend: {
        data: ['Total'],
        top: 55,
        left: 20,
        orient: 'vertical',
        itemGap: 8,
        itemWidth: 16,
        itemHeight: 12,
        selectedMode: false,
        textStyle: {
          fontSize: 12,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          color: colors.text,
        },
      },
      grid: {
        left: CHART_CONFIG.padding.left,
        right: CHART_CONFIG.padding.right,
        top: CHART_CONFIG.padding.top + 60,
        bottom: CHART_CONFIG.padding.bottom,
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        min: 0,
        max: combinedMaxScale,
        splitNumber: xAxisSplitCount,
        axisLabel: {
          formatter: (value: number) => formatPopulation(value),
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          fontSize: 11,
          color: colors.textSecondary,
        },
        axisLine: { show: true, lineStyle: { color: colors.grid } },
        splitLine: { show: true, lineStyle: { color: colors.grid, type: 'dashed' } },
        name: AXIS_LABELS.population,
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: {
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          color: colors.text,
        },
      },
      yAxis: {
        type: 'category',
        data: ageLabels,
        axisTick: { show: false },
        axisLine: { show: true, lineStyle: { color: colors.grid } },
        axisLabel: {
          fontSize: 10,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          color: colors.textSecondary,
          interval: yAxisInterval,
        },
        splitLine: { 
          show: true, 
          lineStyle: { 
            color: colors.grid, 
            type: 'dashed',
            opacity: 0.5,
          } 
        },
        name: AXIS_LABELS.age,
        nameLocation: 'end',
        nameGap: 10,
        nameTextStyle: {
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          color: colors.text,
        },
      },
      series: [
        {
          name: 'Total',
          type: 'bar',
          data: totalData,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: colors.totalGradientStart },
                { offset: 1, color: colors.totalGradientEnd },
              ],
            },
            borderRadius: [0, 4, 4, 0],
          },
          barWidth: dynamicBarHeight,
          emphasis: {
            itemStyle: {
              opacity: 0.9,
            },
          },
          label: {
            show: showBarLabels,
            position: 'insideRight',
            formatter: (params: { value: number }) => formatPopulation(params.value),
            fontSize: 10,
            fontFamily: "'DM Sans', sans-serif",
            color: '#fff',
            textShadowColor: 'rgba(0,0,0,0.3)',
            textShadowBlur: 2,
          },
        },
      ],
    };
  }, [data, metadata, colors, maxScale, yAxisInterval, effectiveTitle, dynamicBarHeight, xAxisSplitCount, showBarLabels]);

  const option = viewMode === 'split' ? splitOption : combinedOption;
  const sourceInfo = metadata.source || data.source;

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <ReactECharts
        option={option}
        style={{ height: chartHeight, width: '100%' }}
        opts={{ renderer: 'svg' }}
        notMerge={true}
      />
      <div className={styles.footer}>
        {showTotal && (
          <div className={styles.totals}>
            <div className={styles.totalItem}>
              <span className={styles.totalLabel}>Total:</span>
              <span className={styles.totalValue}>{formatPopulation(totals.total)}</span>
            </div>
            {viewMode === 'split' && (
              <>
                <div className={styles.totalItem}>
                  <span className={styles.totalDot} style={{ background: colors.male }} />
                  <span className={styles.totalLabel}>Males:</span>
                  <span className={styles.totalValue}>{formatPopulation(totals.male)}</span>
                </div>
                <div className={styles.totalItem}>
                  <span className={styles.totalDot} style={{ background: colors.female }} />
                  <span className={styles.totalLabel}>Females:</span>
                  <span className={styles.totalValue}>{formatPopulation(totals.female)}</span>
                </div>
              </>
            )}
          </div>
        )}
        {sourceInfo && (
          <div className={styles.source}>
            Source: {sourceInfo}
          </div>
        )}
      </div>
    </div>
  );
}
