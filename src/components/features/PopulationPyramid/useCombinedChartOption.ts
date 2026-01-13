import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { PopulationData, ChartMetadata } from '../../../types';
import type { ChartColors } from './chartColors';
import type { Theme } from '../../../hooks';
import type { Translations } from '../../../i18n';
import { CHART_CONFIG } from '../../../constants';
import { formatPopulation } from '../../../utils';
import { toPercent } from './chartCalculations';
import {
  createTitleConfig,
  createTooltipConfig,
  createLegendConfig,
  createGridConfig,
  createXAxisConfig,
  createYAxisConfig,
  createMedianMarkLine,
} from './chartOptionHelpers';

interface UseCombinedChartOptionParams {
  data: PopulationData;
  metadata: ChartMetadata;
  colors: ChartColors;
  maxScale?: number;
  yAxisInterval: number | 'auto' | ((index: number, value: string) => boolean);
  effectiveTitle: string;
  dynamicBarHeight: number;
  xAxisSplitCount: number;
  showBarLabels: boolean;
  showAsPercentage: boolean;
  totalPopulation: number;
  showMedianLine: boolean;
  medianAgeIndex: number;
  medianAge: number;
  theme: Theme;
  t: Translations;
}

/**
 * Хук для построения опций ECharts в режиме combined (суммарно)
 */
export function useCombinedChartOption({
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
  totalPopulation,
  showMedianLine,
  medianAgeIndex,
  medianAge,
  theme,
  t,
}: UseCombinedChartOptionParams): EChartsOption {
  return useMemo(() => {
    const ageLabels = data.ageGroups.map((group) => group.age);
    const rawTotalData = data.ageGroups.map((group) => group.male + group.female);
    const maxTotal = Math.max(...rawTotalData);
    
    // Конвертируем в проценты если нужно
    const totalData = showAsPercentage
      ? rawTotalData.map((val) => toPercent(val, totalPopulation))
      : rawTotalData;
    
    // Для combined режима используем двойной масштаб
    const rawCombinedMaxScale = maxScale
      ? maxScale * 2
      : Math.ceil((maxTotal * 1.1) / 100000) * 100000;
    const combinedMaxScale = showAsPercentage
      ? Math.ceil(toPercent(rawCombinedMaxScale, totalPopulation) * 10) / 10
      : rawCombinedMaxScale;

    // Кастомный tooltip formatter для combined режима
    const tooltipFormatter = (params: unknown) => {
      const items = params as Array<{
        axisValue: string;
        value: number;
        dataIndex: number;
      }>;
      
      if (!Array.isArray(items) || items.length === 0) return '';
      
      const item = items[0];
      const age = item.axisValue;
      const ageGroup = data.ageGroups[item.dataIndex];
      const rawTotal = ageGroup.male + ageGroup.female;
      
      const formatVal = (val: number) =>
        showAsPercentage
          ? `${toPercent(val, totalPopulation).toFixed(2)}%`
          : formatPopulation(val);
      
      return `
        <div style="font-family: 'DM Sans', sans-serif; padding: 4px 0; color: ${colors.text};">
          <div style="font-weight: 600; margin-bottom: 8px;">${t.common.age}: ${age}</div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span style="display: inline-block; width: 12px; height: 12px; background: ${colors.total}; border-radius: 2px;"></span>
            <span>${t.common.total}: ${formatVal(rawTotal)}</span>
          </div>
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid ${colors.grid}; font-size: 0.875em; color: ${colors.textSecondary};">
            <div>${t.common.males}: ${formatVal(ageGroup.male)}</div>
            <div>${t.common.females}: ${formatVal(ageGroup.female)}</div>
          </div>
        </div>
      `;
    };

    const medianMarkLine = createMedianMarkLine(
      showMedianLine,
      medianAgeIndex,
      medianAge,
      data.ageGroups[medianAgeIndex]?.age,
      colors,
      t
    );

    return {
      backgroundColor: colors.background,
      title: createTitleConfig(effectiveTitle, metadata, colors),
      tooltip: {
        ...createTooltipConfig(colors),
        formatter: tooltipFormatter,
      },
      legend: createLegendConfig([t.common.total], colors, theme, CHART_CONFIG.padding.top + 45),
      grid: createGridConfig(CHART_CONFIG.padding.top + 40),
      xAxis: createXAxisConfig(colors, combinedMaxScale, xAxisSplitCount, showAsPercentage, t.common.population, false),
      yAxis: createYAxisConfig(ageLabels, colors, yAxisInterval, t.common.age, false),
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
            itemStyle: { opacity: 0.9 },
          },
          label: {
            show: showBarLabels,
            position: 'insideRight',
            formatter: (params: unknown) => {
              const p = params as { value?: number };
              const val = p.value ?? 0;
              return showAsPercentage ? `${val.toFixed(2)}%` : formatPopulation(val);
            },
            fontSize: 10,
            fontFamily: "'DM Sans', sans-serif",
            color: '#fff',
            textShadowColor: 'rgba(0,0,0,0.3)',
            textShadowBlur: 2,
          },
          ...medianMarkLine,
        },
      ],
    };
  }, [
    data, metadata, colors, maxScale, yAxisInterval, effectiveTitle,
    dynamicBarHeight, xAxisSplitCount, showBarLabels, showAsPercentage,
    totalPopulation, showMedianLine, medianAgeIndex, medianAge, theme, t
  ]);
}
