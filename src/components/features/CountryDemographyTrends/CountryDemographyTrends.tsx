import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import type { CountryDemographyPoint, CountryDemographyProfile } from '../../../services/countryDataLoader';
import { useI18n } from '../../../i18n';
import styles from './CountryDemographyTrends.module.css';

interface CountryDemographyTrendsProps {
  profile: CountryDemographyProfile | null;
}

interface TrendCardConfig {
  label: string;
  points: CountryDemographyPoint[];
  color: string;
  formatter: (value: number) => string;
}

const FALLBACK_TEXT = {
  trendsTitle: 'Demographic trends',
  trendsSubtitle: 'Long-run changes in the most explanatory country indicators',
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

export function CountryDemographyTrends({ profile }: CountryDemographyTrendsProps) {
  const { t } = useI18n();
  const text = {
    ...FALLBACK_TEXT,
    ...(t.demographyProfile ?? {}),
  };

  const cards = useMemo<TrendCardConfig[]>(() => {
    if (!profile) return [];

    return [
      {
        label: t.summary.totalPopulation,
        points: profile.indicators.population,
        color: '#2563eb',
        formatter: (value: number) => Math.round(value).toLocaleString('en-US'),
      },
      {
        label: text.fertilityRate,
        points: profile.indicators.fertilityRate,
        color: '#ea580c',
        formatter: (value: number) => value.toFixed(2),
      },
      {
        label: text.lifeExpectancyBirth,
        points: profile.indicators.lifeExpectancyBirth,
        color: '#059669',
        formatter: (value: number) => value.toFixed(1),
      },
      {
        label: text.netMigration,
        points: profile.indicators.netMigration,
        color: '#7c3aed',
        formatter: (value: number) => {
          const rounded = Math.round(value);
          const formatted = Math.abs(rounded).toLocaleString('en-US');
          return rounded > 0 ? `+${formatted}` : rounded < 0 ? `-${formatted}` : formatted;
        },
      },
    ].filter((card) => card.points.length > 1);
  }, [profile, t.summary.totalPopulation, text]);

  if (!profile || cards.length === 0) {
    return null;
  }

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
            <div key={card.label} className={styles.card}>
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
            </div>
          );
        })}
      </div>
    </section>
  );
}
