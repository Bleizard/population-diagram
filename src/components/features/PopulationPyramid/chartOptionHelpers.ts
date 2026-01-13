import type { ChartColors } from './chartColors';
import type { ChartMetadata } from '../../../types';
import type { Theme } from '../../../hooks';
import type { Translations } from '../../../i18n';
import { CHART_CONFIG } from '../../../constants';
import { formatPopulation } from '../../../utils';

/** Общие шрифты */
export const FONTS = {
  title: "'Playfair Display', Georgia, serif",
  body: "'DM Sans', -apple-system, sans-serif",
} as const;

/** Создаёт конфиг для title */
export function createTitleConfig(
  effectiveTitle: string,
  metadata: ChartMetadata,
  colors: ChartColors
) {
  return {
    text: effectiveTitle,
    subtext: metadata.subtitle || '',
    left: 'center',
    top: 10,
    textStyle: {
      fontSize: 28,
      fontWeight: 600,
      fontFamily: FONTS.title,
      color: colors.text,
    },
    subtextStyle: {
      fontSize: 18,
      fontWeight: 500,
      color: colors.textSecondary,
      fontFamily: FONTS.body,
    },
  };
}

/** Создаёт базовый конфиг для tooltip */
export function createTooltipConfig(colors: ChartColors) {
  return {
    trigger: 'axis' as const,
    axisPointer: {
      type: 'line' as const,
      lineStyle: {
        color: colors.centerLine,
        type: 'dashed' as const,
      },
    },
    backgroundColor: colors.tooltipBg,
    borderColor: colors.tooltipBorder,
    textStyle: { color: colors.text },
  };
}

/** Создаёт конфиг для legend */
export function createLegendConfig(
  data: string[],
  colors: ChartColors,
  theme: Theme,
  topOffset: number = CHART_CONFIG.padding.top + 55
) {
  return {
    data,
    top: topOffset,
    left: '16%',
    orient: 'vertical' as const,
    itemGap: 6,
    itemWidth: 14,
    itemHeight: 10,
    selectedMode: false,
    backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
    borderRadius: 4,
    padding: [8, 12] as [number, number],
    textStyle: {
      fontSize: 11,
      fontFamily: FONTS.body,
      color: colors.text,
    },
  };
}

/** Создаёт конфиг для grid */
export function createGridConfig(topOffset: number = CHART_CONFIG.padding.top + 50) {
  return {
    left: '15%',
    right: '15%',
    top: topOffset,
    bottom: CHART_CONFIG.padding.bottom,
    containLabel: false,
  };
}

/** Создаёт конфиг для xAxis */
export function createXAxisConfig(
  colors: ChartColors,
  scaleMax: number,
  xAxisSplitCount: number,
  showAsPercentage: boolean,
  populationLabel: string,
  isBidirectional: boolean = true
) {
  return {
    type: 'value' as const,
    min: isBidirectional ? -scaleMax : 0,
    max: scaleMax,
    splitNumber: isBidirectional ? xAxisSplitCount * 2 : xAxisSplitCount,
    axisLabel: {
      formatter: (value: number) => {
        const absValue = Math.abs(value);
        return showAsPercentage
          ? `${absValue.toFixed(1)}%`
          : formatPopulation(absValue);
      },
      fontFamily: FONTS.body,
      fontSize: 11,
      color: colors.textSecondary,
    },
    axisLine: { show: true, lineStyle: { color: colors.grid } },
    splitLine: { show: true, lineStyle: { color: colors.grid, type: 'dashed' as const } },
    name: populationLabel,
    nameLocation: 'middle' as const,
    nameGap: 35,
    nameTextStyle: {
      fontSize: 13,
      fontWeight: 500,
      fontFamily: FONTS.body,
      color: colors.text,
    },
  };
}

/** Создаёт конфиг для yAxis */
export function createYAxisConfig(
  ageLabels: string[],
  colors: ChartColors,
  yAxisInterval: number | 'auto' | ((index: number, value: string) => boolean),
  ageLabel: string,
  useCenterLine: boolean = true
) {
  return {
    type: 'category' as const,
    data: ageLabels,
    axisTick: { show: false },
    axisLine: { 
      show: true, 
      lineStyle: { color: useCenterLine ? colors.centerLine : colors.grid } 
    },
    axisLabel: {
      fontSize: 10,
      fontFamily: FONTS.body,
      color: colors.textSecondary,
      interval: yAxisInterval,
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: colors.grid,
        type: 'dashed' as const,
        opacity: 0.5,
      },
    },
    name: ageLabel,
    nameLocation: 'middle' as const,
    nameRotate: 90,
    nameGap: 40,
    nameTextStyle: {
      fontSize: 13,
      fontWeight: 500,
      fontFamily: FONTS.body,
      color: colors.text,
    },
  };
}

/** Создаёт конфиг для markLine (медиана) */
export function createMedianMarkLine(
  showMedianLine: boolean,
  medianAgeIndex: number,
  medianAge: number,
  ageValue: string | undefined,
  colors: ChartColors,
  t: Translations
) {
  if (!showMedianLine || medianAgeIndex < 0 || !ageValue) {
    return {};
  }

  return {
    markLine: {
      silent: true,
      symbol: 'none',
      lineStyle: {
        color: colors.medianLine,
        width: 2,
        type: 'dashed' as const,
      },
      label: {
        show: true,
        formatter: `${t.common.median}: ${medianAge}`,
        position: 'insideStartTop' as const,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: FONTS.body,
        color: colors.medianLine,
        backgroundColor: colors.background,
        padding: [2, 6] as [number, number],
        borderRadius: 3,
      },
      data: [{ yAxis: ageValue }],
    },
  };
}

/** Создаёт конфиг для label внутри столбика */
export function createBarLabelConfig(
  showBarLabels: boolean,
  position: 'insideLeft' | 'insideRight',
  formatter: (params: { dataIndex: number }) => string
) {
  return {
    show: showBarLabels,
    position,
    formatter,
    fontSize: 10,
    fontFamily: FONTS.body,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowBlur: 2,
  };
}

/** Создаёт центральную линию для split режима */
export function createCenterLine(
  colors: ChartColors,
  chartHeight: number
) {
  return {
    type: 'line' as const,
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
  };
}

