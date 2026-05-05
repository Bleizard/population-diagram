import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import type { PopulationData } from '../../../types';
import type { Theme } from '../../../hooks';
import { useI18n } from '../../../i18n';
import { THEME_COLORS, type ChartColors } from '../PopulationPyramid/chartColors';
import {
  FONTS,
  createGridConfig,
  createXAxisConfig,
  createYAxisConfig,
  createCenterLine,
} from '../PopulationPyramid/chartOptionHelpers';
import { calculateChartHeight } from '../PopulationPyramid/chartCalculations';
import { formatPopulation } from '../../../utils';
import styles from './OverlayPyramid.module.css';

interface OverlayCustomColors {
  leftMaleColor?: string;
  leftFemaleColor?: string;
  rightMaleColor?: string;
  rightFemaleColor?: string;
}

interface OverlayPyramidProps {
  leftData: PopulationData;
  rightData: PopulationData;
  leftName: string;
  rightName: string;
  theme?: Theme;
  maxScale?: number;
  showAsPercentage?: boolean;
  customColors?: OverlayCustomColors;
  yAxisInterval?: number | 'auto' | ((index: number, value: string) => boolean);
  xAxisSplitCount?: number;
}

const OVERLAY_SOLID_COLORS = {
  leftMale: '#3b82f6',
  leftFemale: '#fb7185',
  rightMale: '#f97316',
  rightFemale: '#14b8a6',
} as const;

/** Convert a hex color to rgba with given alpha */
function withAlpha(hex: string, alpha: number): string {
  // If already rgba, return as-is
  if (hex.startsWith('rgba')) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function OverlayPyramid({
  leftData,
  rightData,
  leftName,
  rightName,
  theme = 'light',
  maxScale: externalMaxScale,
  showAsPercentage = false,
  customColors,
  yAxisInterval: externalYAxisInterval,
  xAxisSplitCount = 5,
}: OverlayPyramidProps) {
  const { t } = useI18n();
  const themeColors = THEME_COLORS[theme];

  // Resolve custom colors with fallbacks
  const resolvedColors = {
    leftMale: customColors?.leftMaleColor ?? OVERLAY_SOLID_COLORS.leftMale,
    leftFemale: customColors?.leftFemaleColor ?? OVERLAY_SOLID_COLORS.leftFemale,
    rightMale: customColors?.rightMaleColor ?? OVERLAY_SOLID_COLORS.rightMale,
    rightFemale: customColors?.rightFemaleColor ?? OVERLAY_SOLID_COLORS.rightFemale,
  };

  // Build a ChartColors-compatible object for helpers that require it
  const colors: ChartColors = {
    ...themeColors,
    male: resolvedColors.leftMale,
    maleSurplus: resolvedColors.leftMale,
    female: resolvedColors.leftFemale,
    femaleSurplus: resolvedColors.leftFemale,
    total: resolvedColors.leftMale,
    totalGradientStart: resolvedColors.leftMale,
    totalGradientEnd: resolvedColors.leftMale,
  };

  const option = useMemo(() => {
    const ageLabels = leftData.ageGroups.map(g => g.age);

    // Total populations for percentage conversion
    const leftTotal = leftData.ageGroups.reduce((s, g) => s + g.male + g.female, 0);
    const rightTotal = rightData.ageGroups.reduce((s, g) => s + g.male + g.female, 0);

    const toPercent = (val: number, total: number) => total > 0 ? (val / total) * 100 : 0;

    const leftMaleValues = leftData.ageGroups.map(g => {
      const v = showAsPercentage ? toPercent(g.male, leftTotal) : g.male;
      return -v;
    });
    const leftFemaleValues = leftData.ageGroups.map(g =>
      showAsPercentage ? toPercent(g.female, leftTotal) : g.female
    );
    const rightMaleValues = rightData.ageGroups.map(g => {
      const v = showAsPercentage ? toPercent(g.male, rightTotal) : g.male;
      return -v;
    });
    const rightFemaleValues = rightData.ageGroups.map(g =>
      showAsPercentage ? toPercent(g.female, rightTotal) : g.female
    );

    // Calculate max scale
    let maxVal = 0;
    const allValues = [...leftMaleValues, ...leftFemaleValues, ...rightMaleValues, ...rightFemaleValues];
    for (const v of allValues) {
      const abs = Math.abs(v);
      if (abs > maxVal) maxVal = abs;
    }

    let scaleMax: number;
    if (externalMaxScale && !showAsPercentage) {
      scaleMax = externalMaxScale;
    } else if (showAsPercentage) {
      scaleMax = Math.ceil(maxVal * 10) / 10;
    } else {
      const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal || 1)));
      scaleMax = Math.ceil(maxVal / magnitude) * magnitude;
    }

    const groupCount = leftData.ageGroups.length;
    const chartHeight = calculateChartHeight(groupCount);

    const grid = createGridConfig(90);
    const xAxis = createXAxisConfig(
      colors,
      scaleMax,
      xAxisSplitCount,
      showAsPercentage,
      t.common.population,
      true,
    );

    const yAxisIntervalFn = externalYAxisInterval !== undefined
      ? externalYAxisInterval
      : ((index: number) => index % 5 === 0);

    const yAxis = createYAxisConfig(
      ageLabels,
      colors,
      yAxisIntervalFn,
      t.common.age,
      true,
    );

    const barWidth = Math.max(3, Math.min(8, Math.floor((chartHeight - 150) / groupCount * 0.35)));

    return {
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'line' as const, lineStyle: { color: themeColors.centerLine, type: 'dashed' as const } },
        backgroundColor: themeColors.tooltipBg,
        borderColor: themeColors.tooltipBorder,
        textStyle: { color: themeColors.text, fontFamily: FONTS.body, fontSize: 12 },
        formatter: (params: Array<{ seriesName: string; value: number; marker: string }>) => {
          if (!params.length) return '';
          const age = (params[0] as unknown as { axisValue: string }).axisValue;
          let html = `<b>${t.common.age}: ${age}</b><br/>`;
          for (const p of params) {
            const absVal = Math.abs(p.value);
            const formatted = showAsPercentage ? `${absVal.toFixed(2)}%` : formatPopulation(absVal);
            html += `${p.marker} ${p.seriesName}: ${formatted}<br/>`;
          }
          return html;
        },
      },
      legend: {
        data: [
          `${leftName} ${t.common.males}`,
          `${leftName} ${t.common.females}`,
          `${rightName} ${t.common.males}`,
          `${rightName} ${t.common.females}`,
        ],
        top: 10,
        left: 'center',
        itemGap: 16,
        itemWidth: 14,
        itemHeight: 10,
        textStyle: { fontSize: 11, fontFamily: FONTS.body, color: themeColors.text },
      },
      grid,
      xAxis,
      yAxis,
      graphic: [createCenterLine(colors, chartHeight)],
      series: [
        {
          name: `${leftName} ${t.common.males}`,
          type: 'bar',
          data: leftMaleValues,
          barWidth,
          barGap: '-100%',
          itemStyle: { color: withAlpha(resolvedColors.leftMale, 0.5), borderRadius: [2, 0, 0, 2] },
          emphasis: { itemStyle: { color: resolvedColors.leftMale } },
        },
        {
          name: `${leftName} ${t.common.females}`,
          type: 'bar',
          data: leftFemaleValues,
          barWidth,
          barGap: '-100%',
          itemStyle: { color: withAlpha(resolvedColors.leftFemale, 0.5), borderRadius: [0, 2, 2, 0] },
          emphasis: { itemStyle: { color: resolvedColors.leftFemale } },
        },
        {
          name: `${rightName} ${t.common.males}`,
          type: 'bar',
          data: rightMaleValues,
          barWidth,
          barGap: '-100%',
          itemStyle: {
            color: 'rgba(0, 0, 0, 0)',
            borderColor: resolvedColors.rightMale,
            borderWidth: 1.5,
            borderRadius: [2, 0, 0, 2],
          },
          emphasis: { itemStyle: { color: withAlpha(resolvedColors.rightMale, 0.25), borderColor: resolvedColors.rightMale } },
        },
        {
          name: `${rightName} ${t.common.females}`,
          type: 'bar',
          data: rightFemaleValues,
          barWidth,
          barGap: '-100%',
          itemStyle: {
            color: 'rgba(0, 0, 0, 0)',
            borderColor: resolvedColors.rightFemale,
            borderWidth: 1.5,
            borderRadius: [0, 2, 2, 0],
          },
          emphasis: { itemStyle: { color: withAlpha(resolvedColors.rightFemale, 0.25), borderColor: resolvedColors.rightFemale } },
        },
      ],
      _chartHeight: chartHeight,
    };
  }, [leftData, rightData, leftName, rightName, theme, themeColors, colors, t, externalMaxScale, showAsPercentage, resolvedColors, externalYAxisInterval, xAxisSplitCount]);

  const chartHeight = (option as unknown as { _chartHeight: number })._chartHeight;

  return (
    <div className={styles.container}>
      <ReactECharts
        option={option}
        style={{ height: chartHeight, width: '100%' }}
        opts={{ renderer: 'svg' }}
        notMerge={true}
      />
    </div>
  );
}
