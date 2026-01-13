import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { PopulationData, ChartMetadata } from '../../../types';
import type { ChartColors } from './chartColors';
import type { Theme } from '../../../hooks';
import { CHART_CONFIG } from '../../../constants';
import { formatPopulation } from '../../../utils';
import { toPercent } from './chartCalculations';
import type { Translations } from '../../../i18n';

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
      ? rawTotalData.map(val => toPercent(val, totalPopulation))
      : rawTotalData;
    
    // Для combined режима используем двойной масштаб
    const rawCombinedMaxScale = maxScale 
      ? maxScale * 2 
      : Math.ceil(maxTotal * 1.1 / 100000) * 100000;
    const combinedMaxScale = showAsPercentage 
      ? Math.ceil(toPercent(rawCombinedMaxScale, totalPopulation) * 10) / 10
      : rawCombinedMaxScale;

    const LEGEND_LABELS = {
      male: t.common.males,
      female: t.common.females,
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
            value: number;
            dataIndex: number;
          }>;
          
          if (!Array.isArray(items) || items.length === 0) return '';
          
          const item = items[0];
          const age = item.axisValue;
          const ageGroup = data.ageGroups[item.dataIndex];
          const rawTotal = ageGroup.male + ageGroup.female;
          
          const formatVal = (val: number) => showAsPercentage 
            ? `${toPercent(val, totalPopulation).toFixed(2)}%`
            : formatPopulation(val);
          
          return `
            <div style="font-family: 'DM Sans', sans-serif; padding: 4px 0; color: ${colors.text};">
              <div style="font-weight: 600; margin-bottom: 8px;">${AXIS_LABELS.age}: ${age}</div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="display: inline-block; width: 12px; height: 12px; background: ${colors.total}; border-radius: 2px;"></span>
                <span>${t.common.total}: ${formatVal(rawTotal)}</span>
              </div>
              <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid ${colors.grid}; font-size: 0.875em; color: ${colors.textSecondary};">
                <div>${LEGEND_LABELS.male}: ${formatVal(ageGroup.male)}</div>
                <div>${LEGEND_LABELS.female}: ${formatVal(ageGroup.female)}</div>
              </div>
            </div>
          `;
        },
      },
      legend: {
        data: [t.common.total],
        top: CHART_CONFIG.padding.top + 45,
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
        top: CHART_CONFIG.padding.top + 40,
        bottom: CHART_CONFIG.padding.bottom,
        containLabel: false,
      },
      xAxis: {
        type: 'value',
        min: 0,
        max: combinedMaxScale,
        splitNumber: xAxisSplitCount,
        axisLabel: {
          formatter: (value: number) => showAsPercentage 
            ? `${value.toFixed(1)}%`
            : formatPopulation(value),
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
                  yAxis: data.ageGroups[medianAgeIndex]?.age,
                },
              ],
            },
          } : {}),
        },
      ],
    };
  }, [
    data, metadata, colors, maxScale, yAxisInterval, effectiveTitle,
    dynamicBarHeight, xAxisSplitCount, showBarLabels, showAsPercentage,
    totalPopulation, showMedianLine, medianAgeIndex, medianAge, theme, t
  ]);
}

