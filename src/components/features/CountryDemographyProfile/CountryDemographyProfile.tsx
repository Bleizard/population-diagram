import { useMemo } from 'react';
import type { CountryDemographyPoint, CountryDemographyProfile as CountryDemographyProfileData } from '../../../services/countryDataLoader';
import { useI18n } from '../../../i18n';
import styles from './CountryDemographyProfile.module.css';

interface CountryDemographyProfileProps {
  profile: CountryDemographyProfileData | null;
}

interface MetricCardProps {
  label: string;
  value: string;
  year: number | null;
  yearLabel: string;
}

interface MetricConfig {
  label: string;
  value: string;
  year: number;
}

function isMetricConfig(value: MetricConfig | null): value is MetricConfig {
  return value !== null;
}

const DEMOGRAPHY_TEXT_FALLBACK = {
  structureTitle: 'Population structure',
  changeTitle: 'Population change',
  dynamicsTitle: 'Fertility and longevity',
  referenceYear: 'Reference year:',
  sourceLabel: 'Source:',
  medianAge: 'Median age',
  oldAgeDependency: 'Old-age dependency ratio',
  liveBirths: 'Live births',
  deaths: 'Deaths',
  naturalChange: 'Natural change',
  netMigration: 'Net migration',
  fertilityRate: 'Total fertility rate',
  meanAgeAtChildbirth: 'Mean age at childbirth',
  lifeExpectancyBirth: 'Life expectancy at birth',
  lifeExpectancy65: 'Life expectancy at 65',
};

function getLatestPoint(series: CountryDemographyPoint[]): CountryDemographyPoint | null {
  return series.length > 0 ? series[series.length - 1] : null;
}

function formatSignedInteger(value: number): string {
  const rounded = Math.round(value);
  const formatted = Math.abs(rounded).toLocaleString('en-US');
  if (rounded > 0) return `+${formatted}`;
  if (rounded < 0) return `-${formatted}`;
  return formatted;
}

function formatCount(value: number): string {
  const rounded = Math.round(value);
  return rounded.toLocaleString('en-US');
}

function formatDecimal(value: number, digits = 1): string {
  return value.toFixed(digits);
}

function MetricCard({ label, value, year, yearLabel }: MetricCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      <div className={styles.meta}>{year !== null ? `${yearLabel} ${year}` : yearLabel}</div>
    </div>
  );
}

export function CountryDemographyProfile({ profile }: CountryDemographyProfileProps) {
  const { t } = useI18n();
  const text = t.demographyProfile ?? DEMOGRAPHY_TEXT_FALLBACK;

  const metricGroups = useMemo(() => {
    if (!profile) return [];

    const indicator = profile.indicators;
    const population = getLatestPoint(indicator.population);
    const medianAge = getLatestPoint(indicator.medianAge);
    const oldAgeDependency = getLatestPoint(indicator.oldAgeDependency);
    const liveBirths = getLatestPoint(indicator.liveBirths);
    const deaths = getLatestPoint(indicator.deaths);
    const naturalChange = getLatestPoint(indicator.naturalChange);
    const netMigration = getLatestPoint(indicator.netMigration);
    const fertilityRate = getLatestPoint(indicator.fertilityRate);
    const meanAgeAtChildbirth = getLatestPoint(indicator.meanAgeAtChildbirth);
    const lifeExpectancyBirth = getLatestPoint(indicator.lifeExpectancyBirth);
    const lifeExpectancy65 = getLatestPoint(indicator.lifeExpectancy65);

    return [
      {
        title: text.structureTitle,
        metrics: [
          population && {
            label: t.summary.totalPopulation,
            value: formatCount(population.value),
            year: population.year,
          },
          medianAge && {
            label: text.medianAge,
            value: formatDecimal(medianAge.value),
            year: medianAge.year,
          },
          oldAgeDependency && {
            label: text.oldAgeDependency,
            value: `${formatDecimal(oldAgeDependency.value)}%`,
            year: oldAgeDependency.year,
          },
        ].filter(isMetricConfig),
      },
      {
        title: text.changeTitle,
        metrics: [
          liveBirths && {
            label: text.liveBirths,
            value: formatCount(liveBirths.value),
            year: liveBirths.year,
          },
          deaths && {
            label: text.deaths,
            value: formatCount(deaths.value),
            year: deaths.year,
          },
          naturalChange && {
            label: text.naturalChange,
            value: formatSignedInteger(naturalChange.value),
            year: naturalChange.year,
          },
          netMigration && {
            label: text.netMigration,
            value: formatSignedInteger(netMigration.value),
            year: netMigration.year,
          },
        ].filter(isMetricConfig),
      },
      {
        title: text.dynamicsTitle,
        metrics: [
          fertilityRate && {
            label: text.fertilityRate,
            value: formatDecimal(fertilityRate.value, 2),
            year: fertilityRate.year,
          },
          meanAgeAtChildbirth && {
            label: text.meanAgeAtChildbirth,
            value: formatDecimal(meanAgeAtChildbirth.value),
            year: meanAgeAtChildbirth.year,
          },
          lifeExpectancyBirth && {
            label: text.lifeExpectancyBirth,
            value: formatDecimal(lifeExpectancyBirth.value),
            year: lifeExpectancyBirth.year,
          },
          lifeExpectancy65 && {
            label: text.lifeExpectancy65,
            value: formatDecimal(lifeExpectancy65.value),
            year: lifeExpectancy65.year,
          },
        ].filter(isMetricConfig),
      },
    ].filter((group) => group.metrics.length > 0);
  }, [profile, t.summary.totalPopulation, text]);

  if (!profile) {
    return null;
  }

  if (metricGroups.length === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      <div className={styles.grid}>
        {metricGroups.map((group) => (
          <div key={group.title} className={styles.group}>
            <h3 className={styles.groupTitle}>{group.title}</h3>
            <div className={styles.cards}>
              {group.metrics.map((metric) => (
                <MetricCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  year={metric.year}
                  yearLabel={text.referenceYear}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.metaSource}>
        {text.sourceLabel} {profile.source}
      </div>
    </section>
  );
}
