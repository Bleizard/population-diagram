import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { ChartDataItem, ChartMetadata } from '../../../types';
import type { ChartColors } from './chartColors';
import type { Theme } from '../../../hooks';
import { CHART_CONFIG } from '../../../constants';
import { formatPopulation } from '../../../utils';
import { toPercent } from './chartCalculations';
import type { Translations } from '../../../i18n';

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
    
    const AXIS_LABELS = {
      age: t.common.age,
      population: t.common.population,
    };

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
          fontSize: 18,
          fontWeight: 500,
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
              <div style="font-weight: 600; margin-bottom: 8px;">${AXIS_LABELS.age}: ${age}</div>
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
        },
      },
      legend: {
        data: [
          LEGEND_LABELS.male,
          LEGEND_LABELS.maleSurplus,
          LEGEND_LABELS.female,
          LEGEND_LABELS.femaleSurplus,
        ],
        top: CHART_CONFIG.padding.top + 55,
        left: '16%',
        orient: 'vertical',
        itemGap: 6,
        itemWidth: 14,
        itemHeight: 10,
        selectedMode: false,
        backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        borderRadius: 4,
        padding: [8, 12],
        textStyle: {
          fontSize: 11,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          color: colors.text,
        },
      },
      grid: {
        left: '15%',
        right: '15%',
        top: CHART_CONFIG.padding.top + 50,
        bottom: CHART_CONFIG.padding.bottom,
        containLabel: false,
      },
      xAxis: {
        type: 'value',
        min: -scaleMax,
        max: scaleMax,
        splitNumber: xAxisSplitCount * 2,
        axisLabel: {
          formatter: (value: number) => showAsPercentage 
            ? `${Math.abs(value).toFixed(1)}%`
            : formatPopulation(Math.abs(value)),
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
        nameLocation: 'middle',
        nameRotate: 90,
        nameGap: 40,
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
          ...(showMedianLine && medianAgeIndex >= 0 ? {
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: {
                color: colors.medianLine,
                width: 2,
                type: 'dashed',
              },
              label: {
                show: true,
                formatter: `${t.common.median}: ${medianAge}`,
                position: 'insideStartTop',
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                color: colors.medianLine,
                backgroundColor: colors.background,
                padding: [2, 6],
                borderRadius: 3,
              },
              data: [
                {
                  yAxis: chartData[medianAgeIndex]?.age,
                },
              ],
            },
          } : {}),
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
  }, [
    chartData, metadata, chartHeight, colors, effectiveMaxScale, yAxisInterval,
    effectiveTitle, dynamicBarHeight, xAxisSplitCount, showBarLabels,
    showAsPercentage, totalPopulation, showMedianLine, medianAgeIndex, medianAge, theme, t
  ]);
}

