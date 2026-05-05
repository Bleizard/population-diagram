import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import type { PopulationAgeGroup, PopulationData } from '../../../types';
import type { Theme } from '../../../hooks';
import { useI18n } from '../../../i18n';
import { formatPopulation } from '../../../utils';
import { THEME_COLORS, type ChartColors } from '../PopulationPyramid/chartColors';
import {
  FONTS,
  createGridConfig,
  createXAxisConfig,
  createYAxisConfig,
  createCenterLine,
} from '../PopulationPyramid/chartOptionHelpers';
import { calculateChartHeight, calculateTotals, toPercent } from '../PopulationPyramid/chartCalculations';
import styles from './DifferencePyramid.module.css';

interface DifferencePyramidProps {
  leftData: PopulationData;
  rightData: PopulationData;
  leftName: string;
  rightName: string;
  theme?: Theme;
  showAsPercentage?: boolean;
  yAxisInterval?: number | 'auto' | ((index: number, value: string) => boolean);
  xAxisSplitCount?: number;
  customColors?: {
    leftMaleColor?: string;
    leftFemaleColor?: string;
    rightMaleColor?: string;
    rightFemaleColor?: string;
  };
}

interface DifferenceRow {
  age: string;
  ageNumeric: number;
  leftMale: number;
  leftFemale: number;
  rightMale: number;
  rightFemale: number;
  totalDiff: number;
}

const DEFAULT_COLORS = {
  leftMale: '#3b82f6',
  leftFemale: '#fb7185',
  rightMale: '#f97316',
  rightFemale: '#14b8a6',
} as const;

function alignAgeGroups(leftGroups: PopulationAgeGroup[], rightGroups: PopulationAgeGroup[]): PopulationAgeGroup[] {
  const rightMap = new Map(rightGroups.map(group => [group.age, group]));

  return leftGroups.map((group) => {
    const match = rightMap.get(group.age);
    return match ?? {
      age: group.age,
      ageNumeric: group.ageNumeric,
      male: 0,
      female: 0,
    };
  });
}

function formatDelta(value: number, showAsPercentage: boolean): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  const absValue = Math.abs(value);
  return showAsPercentage
    ? `${sign}${absValue.toFixed(2)}%`
    : `${sign}${formatPopulation(absValue)}`;
}

export function DifferencePyramid({
  leftData,
  rightData,
  leftName,
  rightName,
  theme = 'light',
  showAsPercentage = false,
  yAxisInterval: externalYAxisInterval,
  xAxisSplitCount = 5,
  customColors,
}: DifferencePyramidProps) {
  const { t } = useI18n();
  const themeColors = THEME_COLORS[theme];

  const resolvedColors = {
    leftMale: customColors?.leftMaleColor ?? DEFAULT_COLORS.leftMale,
    leftFemale: customColors?.leftFemaleColor ?? DEFAULT_COLORS.leftFemale,
    rightMale: customColors?.rightMaleColor ?? DEFAULT_COLORS.rightMale,
    rightFemale: customColors?.rightFemaleColor ?? DEFAULT_COLORS.rightFemale,
  };

  const chartColors: ChartColors = {
    ...themeColors,
    male: resolvedColors.leftMale,
    maleSurplus: resolvedColors.leftMale,
    female: resolvedColors.leftFemale,
    femaleSurplus: resolvedColors.leftFemale,
    total: resolvedColors.rightMale,
    totalGradientStart: resolvedColors.leftMale,
    totalGradientEnd: resolvedColors.rightMale,
  };

  const option = useMemo(() => {
    const alignedRightGroups = alignAgeGroups(leftData.ageGroups, rightData.ageGroups);
    const leftTotals = calculateTotals(leftData.ageGroups);
    const rightTotals = calculateTotals(rightData.ageGroups);
    const showGenderSplit = leftData.hasGenderData !== false && rightData.hasGenderData !== false;

    const rows: DifferenceRow[] = leftData.ageGroups.map((leftGroup, index) => {
      const rightGroup = alignedRightGroups[index];

      const leftMaleRaw = showAsPercentage ? toPercent(leftGroup.male, leftTotals.total) : leftGroup.male;
      const leftFemaleRaw = showAsPercentage ? toPercent(leftGroup.female, leftTotals.total) : leftGroup.female;
      const rightMaleRaw = showAsPercentage ? toPercent(rightGroup.male, rightTotals.total) : rightGroup.male;
      const rightFemaleRaw = showAsPercentage ? toPercent(rightGroup.female, rightTotals.total) : rightGroup.female;

      const maleDiff = leftMaleRaw - rightMaleRaw;
      const femaleDiff = leftFemaleRaw - rightFemaleRaw;
      const totalDiff = maleDiff + femaleDiff;

      return {
        age: leftGroup.age,
        ageNumeric: leftGroup.ageNumeric,
        leftMale: -Math.max(maleDiff, 0),
        leftFemale: -Math.max(femaleDiff, 0),
        rightMale: Math.max(-maleDiff, 0),
        rightFemale: Math.max(-femaleDiff, 0),
        totalDiff,
      };
    });

    const ageLabels = rows.map(row => row.age);
    const chartHeight = calculateChartHeight(rows.length);
    const yAxisIntervalFn = externalYAxisInterval !== undefined
      ? externalYAxisInterval
      : ((index: number) => index % 5 === 0);

    let maxValue = rows.reduce((currentMax, row) => {
      const rowMax = Math.max(
        Math.abs(row.leftMale + row.leftFemale),
        Math.abs(row.rightMale + row.rightFemale),
        Math.abs(row.totalDiff),
      );
      return Math.max(currentMax, rowMax);
    }, 0);

    if (showAsPercentage) {
      maxValue = maxValue > 0 ? Math.ceil(maxValue * 10) / 10 : 1;
    } else if (maxValue > 0) {
      const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
      maxValue = Math.ceil(maxValue / magnitude) * magnitude;
    } else {
      maxValue = 100;
    }

    const leftLabel = leftName || t.comparison.left;
    const rightLabel = rightName || t.comparison.right;
    const legendData = showGenderSplit
      ? [
          `${leftLabel} ${t.common.males}`,
          `${leftLabel} ${t.common.females}`,
          `${rightLabel} ${t.common.males}`,
          `${rightLabel} ${t.common.females}`,
        ]
      : [leftLabel, rightLabel];

    return {
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: {
          type: 'line' as const,
          lineStyle: { color: themeColors.centerLine, type: 'dashed' as const },
        },
        backgroundColor: themeColors.tooltipBg,
        borderColor: themeColors.tooltipBorder,
        textStyle: { color: themeColors.text, fontFamily: FONTS.body, fontSize: 12 },
        formatter: (params: Array<{ dataIndex: number; seriesName: string; value: number; marker: string }>) => {
          if (!params.length) return '';

          const row = rows[params[0].dataIndex];
          const visibleItems = params.filter(item => Math.abs(item.value) > 0);
          const leader = row.totalDiff > 0 ? leftLabel : row.totalDiff < 0 ? rightLabel : t.common.total;

          let html = `<b>${t.common.age}: ${row.age}</b><br/>`;
          for (const item of visibleItems) {
            html += `${item.marker} ${item.seriesName}: ${formatDelta(Math.abs(item.value), showAsPercentage)}<br/>`;
          }
          html += `<br/><b>${t.common.total}: ${formatDelta(row.totalDiff, showAsPercentage)}</b>`;
          if (row.totalDiff !== 0) {
            html += `<br/>${leader}`;
          }
          return html;
        },
      },
      legend: {
        data: legendData,
        top: 10,
        left: 'center',
        itemGap: 16,
        itemWidth: 14,
        itemHeight: 10,
        textStyle: { fontSize: 11, fontFamily: FONTS.body, color: themeColors.text },
      },
      grid: createGridConfig(90),
      xAxis: createXAxisConfig(chartColors, maxValue, xAxisSplitCount, showAsPercentage, t.common.population, true),
      yAxis: createYAxisConfig(ageLabels, chartColors, yAxisIntervalFn, t.common.age, true),
      graphic: [createCenterLine(chartColors, chartHeight)],
      series: showGenderSplit
        ? [
            {
              name: `${leftLabel} ${t.common.males}`,
              type: 'bar',
              stack: 'left',
              data: rows.map(row => row.leftMale),
              itemStyle: { color: resolvedColors.leftMale, borderRadius: [2, 0, 0, 2] },
              emphasis: { itemStyle: { opacity: 0.85 } },
            },
            {
              name: `${leftLabel} ${t.common.females}`,
              type: 'bar',
              stack: 'left',
              data: rows.map(row => row.leftFemale),
              itemStyle: { color: resolvedColors.leftFemale, borderRadius: [2, 0, 0, 2] },
              emphasis: { itemStyle: { opacity: 0.85 } },
            },
            {
              name: `${rightLabel} ${t.common.males}`,
              type: 'bar',
              stack: 'right',
              data: rows.map(row => row.rightMale),
              itemStyle: { color: resolvedColors.rightMale, borderRadius: [0, 2, 2, 0] },
              emphasis: { itemStyle: { opacity: 0.85 } },
            },
            {
              name: `${rightLabel} ${t.common.females}`,
              type: 'bar',
              stack: 'right',
              data: rows.map(row => row.rightFemale),
              itemStyle: { color: resolvedColors.rightFemale, borderRadius: [0, 2, 2, 0] },
              emphasis: { itemStyle: { opacity: 0.85 } },
            },
          ]
        : [
            {
              name: leftLabel,
              type: 'bar',
              data: rows.map(row => Math.min(row.totalDiff, 0)),
              itemStyle: { color: resolvedColors.leftMale, borderRadius: [2, 0, 0, 2] },
              emphasis: { itemStyle: { opacity: 0.85 } },
            },
            {
              name: rightLabel,
              type: 'bar',
              data: rows.map(row => Math.max(-row.totalDiff, 0)),
              itemStyle: { color: resolvedColors.rightMale, borderRadius: [0, 2, 2, 0] },
              emphasis: { itemStyle: { opacity: 0.85 } },
            },
          ],
      _chartHeight: chartHeight,
    };
  }, [chartColors, leftData, rightData, leftName, rightName, themeColors, showAsPercentage, externalYAxisInterval, xAxisSplitCount, resolvedColors, t]);

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
