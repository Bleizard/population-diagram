import ReactECharts from 'echarts-for-react';
import { useEffect, useMemo, useState } from 'react';
import type { CountryDemographyPoint, CountryDemographyProfile } from '../../../services/countryDataLoader';
import { useI18n } from '../../../i18n';
import styles from './CountryDemographyTrends.module.css';

interface CountryDemographyTrendsProps {
  profile: CountryDemographyProfile | null;
  benchmarkProfile?: CountryDemographyProfile | null;
}

interface TrendCardConfig {
  id: string;
  label: string;
  points: CountryDemographyPoint[];
  color: string;
  formatter: (value: number) => string;
  axisFormatter?: (value: number) => string;
  compareMode?: 'absolute' | 'dualAxis';
}

interface ComparisonSeriesConfig {
  points: CountryDemographyPoint[];
  benchmarkPoints: CountryDemographyPoint[];
  formatter: (value: number) => string;
  axisFormatter?: (value: number) => string;
  benchmarkAxisFormatter?: (value: number) => string;
  note?: string;
  dualAxis?: boolean;
}

const FALLBACK_TEXT = {
  trendsTitle: 'Demographic trends',
  trendsSubtitle: 'Long-run changes in the most explanatory country indicators',
  trendsExpandedTitle: 'Expanded trend',
  trendsExpandedSubtitle: 'A closer view of the full time series for the selected indicator',
  trendsPeriod: 'Period',
  trendsComparedWith: 'Compared with',
  trendsBenchmarkValue: 'Benchmark value',
  euAggregate: 'EU aggregate',
  netMigrationMethodNote: 'net migration plus statistical adjustment',
  fertilityRate: 'Total fertility rate',
  lifeExpectancyBirth: 'Life expectancy at birth',
  netMigration: 'Net migration',
};

function getLatest(points: CountryDemographyPoint[]) {
  return points.length > 0 ? points[points.length - 1] : null;
}

function createMiniChartOption(points: CountryDemographyPoint[], color: string) {
  return {
    animation: false,
    grid: { top: 10, right: 8, bottom: 4, left: 8 },
    xAxis: {
      type: 'category',
      data: points.map((point) => point.year),
      show: false,
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      show: false,
      scale: true,
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      valueFormatter: (value: number) => String(value),
    },
    series: [
      {
        type: 'line',
        data: points.map((point) => point.value),
        smooth: true,
        symbol: 'none',
        lineStyle: {
          width: 2.4,
          color,
        },
        areaStyle: {
          color: `${color}22`,
        },
      },
    ],
  };
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function alignByYear(
  primaryPoints: CountryDemographyPoint[],
  secondaryPoints: CountryDemographyPoint[]
) {
  const secondaryByYear = new Map(secondaryPoints.map((point) => [point.year, point.value]));
  return primaryPoints
    .map((point) => {
      const secondaryValue = secondaryByYear.get(point.year);
      return typeof secondaryValue === 'number'
        ? { year: point.year, primaryValue: point.value, secondaryValue }
        : null;
    })
    .filter((point): point is { year: number; primaryValue: number; secondaryValue: number } => point !== null);
}

function buildComparisonSeries(
  card: TrendCardConfig,
  benchmarkProfile: CountryDemographyProfile | null,
): ComparisonSeriesConfig {
  const benchmarkPoints = benchmarkProfile?.indicators[card.id as keyof CountryDemographyProfile['indicators']] ?? [];

  if (!benchmarkProfile || benchmarkPoints.length <= 1) {
    return {
      points: card.points,
      benchmarkPoints,
      formatter: card.formatter,
      axisFormatter: card.axisFormatter,
    };
  }

  if (card.compareMode === 'dualAxis') {
    const aligned = alignByYear(card.points, benchmarkPoints);
    if (aligned.length <= 1) {
      return {
        points: card.points,
        benchmarkPoints,
        formatter: card.formatter,
        axisFormatter: card.axisFormatter,
      };
    }

    return {
      points: aligned.map((point) => ({ year: point.year, value: point.primaryValue })),
      benchmarkPoints: aligned.map((point) => ({ year: point.year, value: point.secondaryValue })),
      formatter: card.formatter,
      axisFormatter: card.axisFormatter,
      benchmarkAxisFormatter: card.axisFormatter,
      dualAxis: true,
    };
  }

  const aligned = alignByYear(card.points, benchmarkPoints);
  if (aligned.length <= 1) {
    return {
      points: card.points,
      benchmarkPoints,
      formatter: card.formatter,
      axisFormatter: card.axisFormatter,
    };
  }

  return {
    points: aligned.map((point) => ({ year: point.year, value: point.primaryValue })),
    benchmarkPoints: aligned.map((point) => ({ year: point.year, value: point.secondaryValue })),
    formatter: card.formatter,
    axisFormatter: card.axisFormatter,
  };
}

function createExpandedChartOption(
  card: TrendCardConfig,
  comparison: ComparisonSeriesConfig,
  benchmarkLabel?: string
) {
  const alignedBenchmark = comparison.benchmarkPoints;
  const hasBenchmark = alignedBenchmark.length > 1;

  return {
    animation: false,
    grid: { top: 28, right: 20, bottom: 42, left: 56 },
    legend: hasBenchmark
      ? {
          top: 0,
          right: 0,
          itemWidth: 12,
          itemHeight: 12,
          textStyle: {
            color: 'var(--color-text-secondary)',
          },
        }
      : undefined,
    tooltip: {
      trigger: 'axis',
      confine: true,
      formatter: (params: Array<{ axisValueLabel: string; seriesName: string; value: number; color: string }>) => {
        const header = params[0]?.axisValueLabel ?? '';
        const rows = params
          .map((item) => {
            const marker = `<span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:${item.color};margin-right:8px;"></span>`;
            return `${marker}${item.seriesName}: ${comparison.formatter(item.value)}`;
          })
          .join('<br/>');

        return `${header}<br/>${rows}`;
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: comparison.points.map((point) => point.year),
      axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.34)' } },
      axisLabel: { color: 'var(--color-text-secondary)' },
    },
    yAxis: comparison.dualAxis
      ? [
          {
            type: 'value',
            scale: true,
            position: 'left',
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              color: card.color,
              formatter: (value: number) => (comparison.axisFormatter ?? comparison.formatter)(value),
            },
            splitLine: {
              lineStyle: {
                color: 'rgba(148, 163, 184, 0.16)',
                type: 'dashed',
              },
            },
          },
          {
            type: 'value',
            scale: true,
            position: 'right',
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              color: '#94a3b8',
              formatter: (value: number) => (comparison.benchmarkAxisFormatter ?? comparison.formatter)(value),
            },
            splitLine: { show: false },
          },
        ]
      : {
          type: 'value',
          scale: true,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: 'var(--color-text-secondary)',
            formatter: (value: number) => (comparison.axisFormatter ?? comparison.formatter)(value),
          },
          splitLine: {
            lineStyle: {
              color: 'rgba(148, 163, 184, 0.16)',
              type: 'dashed',
            },
          },
        },
    series: [
      {
        type: 'line',
        data: comparison.points.map((point) => point.value),
        yAxisIndex: 0,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: card.color,
        },
        itemStyle: {
          color: card.color,
        },
        name: card.label,
        areaStyle: {
          color: `${card.color}18`,
        },
        emphasis: {
          focus: 'series',
        },
      },
      ...(hasBenchmark
        ? [{
            name: benchmarkLabel,
            type: 'line',
            data: alignedBenchmark.map((point) => point.value),
            yAxisIndex: comparison.dualAxis ? 1 : 0,
            smooth: true,
            symbol: 'none',
            lineStyle: {
              width: 2.4,
              color: '#94a3b8',
              type: 'dashed',
            },
            itemStyle: {
              color: '#94a3b8',
            },
            emphasis: {
              focus: 'series',
            },
          }]
        : []),
    ],
  };
}

export function CountryDemographyTrends({ profile, benchmarkProfile = null }: CountryDemographyTrendsProps) {
  const { t } = useI18n();
  const text = {
    ...FALLBACK_TEXT,
    ...(t.demographyProfile ?? {}),
  };

  const cards = useMemo<TrendCardConfig[]>(() => {
    if (!profile) return [];

    return [
      {
        id: 'population',
        label: t.summary.totalPopulation,
        points: profile.indicators.population,
        color: '#2563eb',
        formatter: (value: number) => Math.round(value).toLocaleString('en-US'),
        axisFormatter: formatCompact,
        compareMode: 'dualAxis' as const,
      },
      {
        id: 'fertilityRate',
        label: text.fertilityRate,
        points: profile.indicators.fertilityRate,
        color: '#ea580c',
        formatter: (value: number) => value.toFixed(2),
      },
      {
        id: 'liveBirths',
        label: text.liveBirths,
        points: profile.indicators.liveBirths,
        color: '#dc2626',
        formatter: (value: number) => Math.round(value).toLocaleString('en-US'),
        axisFormatter: formatCompact,
        compareMode: 'dualAxis' as const,
      },
      {
        id: 'deaths',
        label: text.deaths,
        points: profile.indicators.deaths,
        color: '#f59e0b',
        formatter: (value: number) => Math.round(value).toLocaleString('en-US'),
        axisFormatter: formatCompact,
        compareMode: 'dualAxis' as const,
      },
      {
        id: 'lifeExpectancyBirth',
        label: text.lifeExpectancyBirth,
        points: profile.indicators.lifeExpectancyBirth,
        color: '#059669',
        formatter: (value: number) => value.toFixed(1),
      },
      {
        id: 'netMigration',
        label: text.netMigration,
        points: profile.indicators.netMigration,
        color: '#7c3aed',
        formatter: (value: number) => {
          const rounded = Math.round(value);
          const formatted = Math.abs(rounded).toLocaleString('en-US');
          return rounded > 0 ? `+${formatted}` : rounded < 0 ? `-${formatted}` : formatted;
        },
        axisFormatter: formatCompact,
        compareMode: 'dualAxis' as const,
      },
    ].filter((card) => card.points.length > 1);
  }, [profile, t.summary.totalPopulation, text]);

  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  useEffect(() => {
    if (cards.length === 0) {
      setActiveCardId(null);
      return;
    }

    if (!activeCardId || !cards.some((card) => card.id === activeCardId)) {
      setActiveCardId(cards[0].id);
    }
  }, [activeCardId, cards]);

  if (!profile || cards.length === 0) {
    return null;
  }

  const activeCard = cards.find((card) => card.id === activeCardId) ?? cards[0];
  const activeLatest = getLatest(activeCard.points);
  const comparison = buildComparisonSeries(activeCard, benchmarkProfile);
  const periodStart = comparison.points[0]?.year;
  const periodEnd = comparison.points[comparison.points.length - 1]?.year;
  const benchmarkLatest = comparison.benchmarkPoints.length > 0 ? comparison.benchmarkPoints[comparison.benchmarkPoints.length - 1] : null;
  const benchmarkName = comparison.dualAxis ? text.euAggregate : text.euAverage;
  const benchmarkMethodNote = comparison.dualAxis && activeCard.id === 'netMigration'
    ? text.netMigrationMethodNote
    : null;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>{text.trendsTitle}</h2>
        <p className={styles.subtitle}>{text.trendsSubtitle}</p>
      </div>

      <div className={styles.grid}>
        {cards.map((card) => {
          const latest = getLatest(card.points);
          if (!latest) return null;

          return (
            <button
              key={card.id}
              className={`${styles.card} ${activeCard.id === card.id ? styles.cardActive : ''}`}
              onClick={() => setActiveCardId(card.id)}
              type="button"
              aria-pressed={activeCard.id === card.id}
            >
              <div className={styles.label}>{card.label}</div>
              <div className={styles.valueRow}>
                <div className={styles.value}>{card.formatter(latest.value)}</div>
                <div className={styles.year}>{latest.year}</div>
              </div>
              <div className={styles.chart}>
                <ReactECharts
                  option={createMiniChartOption(card.points, card.color)}
                  style={{ height: 104, width: '100%' }}
                  opts={{ renderer: 'svg' }}
                  notMerge
                />
              </div>
            </button>
          );
        })}
      </div>

      {activeLatest && (
        <div className={styles.expandedPanel}>
          <div className={styles.expandedHeader}>
            <div>
              <div className={styles.expandedEyebrow}>{text.trendsExpandedTitle}</div>
              <h3 className={styles.expandedTitle}>{activeCard.label}</h3>
              <p className={styles.expandedSubtitle}>{text.trendsExpandedSubtitle}</p>
            </div>
            <div className={styles.expandedMeta}>
              <div className={styles.expandedValue} style={{ color: activeCard.color }}>
                {activeCard.formatter(activeLatest.value)}
              </div>
              <div className={styles.expandedPeriod}>
                {text.trendsPeriod}: {periodStart}–{periodEnd}
              </div>
              {(benchmarkLatest || comparison.note) && (
                <div className={styles.expandedBenchmark}>
                  {comparison.dualAxis ? text.trendsBenchmarkValue : text.trendsComparedWith}: {benchmarkName}
                  {benchmarkLatest ? ` ${comparison.formatter(benchmarkLatest.value)}` : ''}
                  {benchmarkMethodNote ? ` · ${benchmarkMethodNote}` : ''}
                  {comparison.note ? ` · ${comparison.note}` : ''}
                </div>
              )}
            </div>
          </div>

          <div className={styles.expandedChart}>
            <ReactECharts
              option={createExpandedChartOption(activeCard, comparison, benchmarkName)}
              style={{ height: 320, width: '100%' }}
              opts={{ renderer: 'svg' }}
              notMerge
            />
          </div>
        </div>
      )}
    </section>
  );
}
