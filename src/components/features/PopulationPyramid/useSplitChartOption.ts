import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { ChartDataItem, ChartMetadata } from '../../../types';
import type { ChartColors } from './chartColors';
import type { Theme } from '../../../hooks';
import type { Translations } from '../../../i18n';
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
  createBarLabelConfig,
  createCenterLine,
} from './chartOptionHelpers';

interface UseSplitChartOptionParams {
  chartData: ChartDataItem[];
  metadata: ChartMetadata;
  chartHeight: number;
  colors: ChartColors;
  effectiveMaxScale: number;
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
 * Хук для построения опций ECharts в режиме split (по полу)
 */
export function useSplitChartOption({
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
  totalPopulation,
  showMedianLine,
  medianAgeIndex,
  medianAge,
  theme,
  t,
}: UseSplitChartOptionParams): EChartsOption {
  return useMemo(() => {
    const ageLabels = chartData.map((item) => item.age);
    
    // Конвертируем данные в проценты если нужно
    const convertValue = (val: number) =>
      showAsPercentage ? toPercent(val, totalPopulation) : val;
    
    const maleBaseData = chartData.map((item) => convertValue(item.maleBase));
    const maleSurplusData = chartData.map((item) => convertValue(item.maleSurplus));
    const femaleBaseData = chartData.map((item) => convertValue(item.femaleBase));
    const femaleSurplusData = chartData.map((item) => convertValue(item.femaleSurplus));
    
    // Максимум для шкалы
    const scaleMax = showAsPercentage
      ? Math.ceil(toPercent(effectiveMaxScale, totalPopulation) * 10) / 10
      : effectiveMaxScale;

    const LEGEND_LABELS = {
      male: t.common.males,
      maleSurplus: t.common.maleSurplus,
      female: t.common.females,
      femaleSurplus: t.common.femaleSurplus,
    };

    // Кастомный tooltip formatter для split режима
    const tooltipFormatter = (params: unknown) => {
      const items = params as Array<{
        axisValue: string;
        seriesIndex: number;
        value: number;
      }>;
      
      if (!Array.isArray(items) || items.length === 0) return '';
      
      const age = items[0].axisValue;
      let maleTotal = 0;
      let femaleTotal = 0;
      
      items.forEach((item) => {
        const value = Math.abs(item.value);
        if (item.seriesIndex < 2) {
          maleTotal += value;
        } else {
          femaleTotal += value;
        }
      });
      
      return `
        <div style="font-family: 'DM Sans', sans-serif; padding: 4px 0; color: ${colors.text};">
          <div style="font-weight: 600; margin-bottom: 8px;">${t.common.age}: ${age}</div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span style="display: inline-block; width: 12px; height: 12px; background: ${colors.male}; border-radius: 2px;"></span>
            <span>${LEGEND_LABELS.male}: ${formatPopulation(maleTotal)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 12px; height: 12px; background: ${colors.female}; border-radius: 2px;"></span>
            <span>${LEGEND_LABELS.female}: ${formatPopulation(femaleTotal)}</span>
          </div>
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid ${colors.grid};">
            <strong>${t.common.total}: ${formatPopulation(maleTotal + femaleTotal)}</strong>
          </div>
        </div>
      `;
    };

    const medianMarkLine = createMedianMarkLine(
      showMedianLine,
      medianAgeIndex,
      medianAge,
      chartData[medianAgeIndex]?.age,
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
      legend: createLegendConfig(
        [LEGEND_LABELS.male, LEGEND_LABELS.maleSurplus, LEGEND_LABELS.female, LEGEND_LABELS.femaleSurplus],
        colors,
        theme
      ),
      grid: createGridConfig(),
      xAxis: createXAxisConfig(colors, scaleMax, xAxisSplitCount, showAsPercentage, t.common.population, true),
      yAxis: createYAxisConfig(ageLabels, colors, yAxisInterval, t.common.age, true),
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
          label: createBarLabelConfig(
            showBarLabels,
            'insideRight',
            (params) => formatPopulation(Math.abs(chartData[params.dataIndex].male))
          ),
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
          label: createBarLabelConfig(
            showBarLabels,
            'insideLeft',
            (params) => formatPopulation(chartData[params.dataIndex].female)
          ),
        },
        {
          name: LEGEND_LABELS.femaleSurplus,
          type: 'bar',
          stack: 'female',
          data: femaleSurplusData,
          itemStyle: { color: colors.femaleSurplus },
          barWidth: dynamicBarHeight,
          emphasis: { itemStyle: { opacity: 0.8 } },
          ...medianMarkLine,
        },
      ],
      graphic: [createCenterLine(colors, chartHeight)],
    };
  }, [
    chartData, metadata, chartHeight, colors, effectiveMaxScale, yAxisInterval,
    effectiveTitle, dynamicBarHeight, xAxisSplitCount, showBarLabels,
    showAsPercentage, totalPopulation, showMedianLine, medianAgeIndex, medianAge, theme, t
  ]);
}
