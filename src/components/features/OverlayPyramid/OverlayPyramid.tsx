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

interface OverlayPyramidProps {
  leftData: PopulationData;
  rightData: PopulationData;
  leftName: string;
  rightName: string;
  theme?: Theme;
  maxScale?: number;
}

// Overlay colors with alpha
const OVERLAY_COLORS = {
  leftMale: 'rgba(59, 130, 246, 0.55)',    // blue
  leftFemale: 'rgba(244, 114, 182, 0.55)',  // pink
  rightMale: 'rgba(16, 185, 129, 0.55)',    // green
  rightFemale: 'rgba(245, 158, 11, 0.55)',  // amber
} as const;

const OVERLAY_SOLID_COLORS = {
  leftMale: '#3b82f6',
  leftFemale: '#f472b6',
  rightMale: '#10b981',
  rightFemale: '#f59e0b',
} as const;

export function OverlayPyramid({
  leftData,
  rightData,
  leftName,
  rightName,
  theme = 'light',
  maxScale: externalMaxScale,
}: OverlayPyramidProps) {
  const { t } = useI18n();
  const themeColors = THEME_COLORS[theme];

  // Build a ChartColors-compatible object for helpers that require it
  const colors: ChartColors = {
    ...themeColors,
    male: OVERLAY_SOLID_COLORS.leftMale,
    maleSurplus: OVERLAY_SOLID_COLORS.leftMale,
    female: OVERLAY_SOLID_COLORS.leftFemale,
    femaleSurplus: OVERLAY_SOLID_COLORS.leftFemale,
    total: OVERLAY_SOLID_COLORS.leftMale,
    totalGradientStart: OVERLAY_SOLID_COLORS.leftMale,
    totalGradientEnd: OVERLAY_SOLID_COLORS.leftMale,
  };

  const option = useMemo(() => {
    const ageLabels = leftData.ageGroups.map(g => g.age);
    const leftMaleValues = leftData.ageGroups.map(g => -g.male);
    const leftFemaleValues = leftData.ageGroups.map(g => g.female);
    const rightMaleValues = rightData.ageGroups.map(g => -g.male);
    const rightFemaleValues = rightData.ageGroups.map(g => g.female);

    // Calculate max scale
    let maxVal = 0;
    for (const g of leftData.ageGroups) {
      if (g.male > maxVal) maxVal = g.male;
      if (g.female > maxVal) maxVal = g.female;
    }
    for (const g of rightData.ageGroups) {
      if (g.male > maxVal) maxVal = g.male;
      if (g.female > maxVal) maxVal = g.female;
    }
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal || 1)));
    const scaleMax = externalMaxScale ?? Math.ceil(maxVal / magnitude) * magnitude;

    const groupCount = leftData.ageGroups.length;
    const chartHeight = calculateChartHeight(groupCount);

    const grid = createGridConfig(90);
    const xAxis = createXAxisConfig(
      colors,
      scaleMax,
      5,
      false,
      t.common.population,
      true,
    );
    const yAxis = createYAxisConfig(
      ageLabels,
      colors,
      (index: number) => index % 5 === 0,
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
            html += `${p.marker} ${p.seriesName}: ${formatPopulation(Math.abs(p.value))}<br/>`;
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
          itemStyle: { color: OVERLAY_COLORS.leftMale, borderRadius: [2, 0, 0, 2] },
          emphasis: { itemStyle: { color: OVERLAY_SOLID_COLORS.leftMale } },
        },
        {
          name: `${leftName} ${t.common.females}`,
          type: 'bar',
          data: leftFemaleValues,
          barWidth,
          barGap: '-100%',
          itemStyle: { color: OVERLAY_COLORS.leftFemale, borderRadius: [0, 2, 2, 0] },
          emphasis: { itemStyle: { color: OVERLAY_SOLID_COLORS.leftFemale } },
        },
        {
          name: `${rightName} ${t.common.males}`,
          type: 'bar',
          data: rightMaleValues,
          barWidth,
          barGap: '-100%',
          itemStyle: { color: OVERLAY_COLORS.rightMale, borderRadius: [2, 0, 0, 2] },
          emphasis: { itemStyle: { color: OVERLAY_SOLID_COLORS.rightMale } },
        },
        {
          name: `${rightName} ${t.common.females}`,
          type: 'bar',
          data: rightFemaleValues,
          barWidth,
          barGap: '-100%',
          itemStyle: { color: OVERLAY_COLORS.rightFemale, borderRadius: [0, 2, 2, 0] },
          emphasis: { itemStyle: { color: OVERLAY_SOLID_COLORS.rightFemale } },
        },
      ],
      _chartHeight: chartHeight,
    };
  }, [leftData, rightData, leftName, rightName, theme, themeColors, colors, t, externalMaxScale]);

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
