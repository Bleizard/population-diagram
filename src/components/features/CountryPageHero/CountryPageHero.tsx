import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type {
  CountryDemographyPoint,
  CountryDemographyProfile,
  CountryDemographySeriesName,
} from '../../../services/countryDataLoader';
import { useI18n } from '../../../i18n';
import styles from './CountryPageHero.module.css';

interface CountryPageHeroProps {
  flag: string;
  name: string;
  compareLabel?: string;
  compareUrl?: string;
  quickCompareLinks: Array<{
    code: string;
    name: string;
    flag: string;
    url: string;
  }>;
  profile: CountryDemographyProfile | null;
  benchmarkProfile: CountryDemographyProfile | null;
}

interface SummaryCard {
  label: string;
  value: string;
  year: number;
}

interface BenchmarkCard {
  label: string;
  value: string;
  benchmarkValue: string;
  benchmarkYear: number;
  tone: 'above' | 'below' | 'close';
}

interface DetailCard {
  label: string;
  value: string;
  year: number;
}

interface DetailGroup {
  title: string;
  metrics: DetailCard[];
}

interface HeroText {
  title: string;
  subtitle: string;
  subtitleIdb?: string;
  referenceYear: string;
  sourceLabel: string;
  structureTitle: string;
  changeTitle: string;
  dynamicsTitle: string;
  medianAge: string;
  fertilityRate: string;
  lifeExpectancyBirth: string;
  lifeExpectancy65: string;
  netMigration: string;
  oldAgeDependency: string;
  liveBirths: string;
  deaths: string;
  naturalChange: string;
  meanAgeAtChildbirth: string;
  insightsTitle: string;
  benchmarkTitle: string;
  detailsTitle: string;
  euAverage: string;
  aboveEuAverage: string;
  belowEuAverage: string;
  closeToEuAverage: string;
  migrationLedGrowth: string;
  naturalDeclineOffsetByMigration: string;
  belowReplacementFertility: string;
  youngerThanEu: string;
  olderThanEu: string;
  higherLongevityThanEu: string;
  lowerLongevityThanEu: string;
  highAgeingPressure: string;
}

function formatPopulation(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

function formatSigned(value: number): string {
  const rounded = Math.round(value);
  const formatted = Math.abs(rounded).toLocaleString('en-US');
  return rounded > 0 ? `+${formatted}` : rounded < 0 ? `-${formatted}` : formatted;
}

function formatDecimal(value: number, digits = 1): string {
  return value.toFixed(digits);
}

function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

function getLatest(series: Array<{ year: number; value: number }>) {
  return series.length > 0 ? series[series.length - 1] : null;
}

function getLatestIndicator(
  profile: CountryDemographyProfile | null,
  key: CountryDemographySeriesName,
): CountryDemographyPoint | null {
  return profile ? getLatest(profile.indicators[key]) : null;
}

function comparisonTone(value: number, reference: number, tolerance: number): 'above' | 'below' | 'close' {
  const diff = value - reference;
  if (Math.abs(diff) <= tolerance) return 'close';
  return diff > 0 ? 'above' : 'below';
}

const FALLBACK_TEXT: HeroText = {
  title: 'Demographic profile',
  subtitle: 'A broader demographic snapshot built around Eurostat country indicators',
  referenceYear: 'Reference year:',
  sourceLabel: 'Source:',
  structureTitle: 'Population structure',
  changeTitle: 'Population change',
  dynamicsTitle: 'Fertility and longevity',
  medianAge: 'Median age',
  fertilityRate: 'Total fertility rate',
  lifeExpectancyBirth: 'Life expectancy at birth',
  lifeExpectancy65: 'Life expectancy at 65',
  netMigration: 'Net migration',
  oldAgeDependency: 'Old-age dependency ratio',
  liveBirths: 'Live births',
  deaths: 'Deaths',
  naturalChange: 'Natural change',
  meanAgeAtChildbirth: 'Mean age at childbirth',
  insightsTitle: 'What stands out',
  benchmarkTitle: 'Against the EU average',
  detailsTitle: 'All indicators',
  euAverage: 'EU average',
  aboveEuAverage: 'Above EU average',
  belowEuAverage: 'Below EU average',
  closeToEuAverage: 'Close to EU average',
  migrationLedGrowth: 'Population growth is currently migration-led',
  naturalDeclineOffsetByMigration: 'Migration more than offsets natural decline',
  belowReplacementFertility: 'Fertility remains below replacement level',
  youngerThanEu: 'Younger age profile than the EU average',
  olderThanEu: 'Older age profile than the EU average',
  higherLongevityThanEu: 'Life expectancy is above the EU average',
  lowerLongevityThanEu: 'Life expectancy is below the EU average',
  highAgeingPressure: 'Ageing pressure is above the EU average',
};

export function CountryPageHero({
  flag,
  name,
  compareLabel,
  compareUrl,
  quickCompareLinks,
  profile,
  benchmarkProfile,
}: CountryPageHeroProps) {
  const { t } = useI18n();
  const text: HeroText = {
    ...FALLBACK_TEXT,
    ...(t.demographyProfile ?? {}),
  };
  const subtitle = profile?.source.includes('International Database')
    ? (text.subtitleIdb ?? 'Latest country-level demographic indicators from the U.S. Census Bureau IDB')
    : text.subtitle;

  const summaryCards = useMemo<SummaryCard[]>(
    () => (profile ? [
      (() => {
        const point = getLatest(profile.indicators.population);
        return point ? {
          label: t.summary.totalPopulation,
          value: formatPopulation(point.value),
          year: point.year,
        } : null;
      })(),
      (() => {
        const point = getLatest(profile.indicators.medianAge);
        return point ? {
          label: text.medianAge,
          value: formatDecimal(point.value),
          year: point.year,
        } : null;
      })(),
      (() => {
        const point = getLatest(profile.indicators.fertilityRate);
        return point ? {
          label: text.fertilityRate,
          value: formatDecimal(point.value, 2),
          year: point.year,
        } : null;
      })(),
      (() => {
        const point = getLatest(profile.indicators.lifeExpectancyBirth);
        return point ? {
          label: text.lifeExpectancyBirth,
          value: formatDecimal(point.value),
          year: point.year,
        } : null;
      })(),
      (() => {
        const point = getLatest(profile.indicators.netMigration);
        return point ? {
          label: text.netMigration,
          value: formatSigned(point.value),
          year: point.year,
        } : null;
      })(),
    ].filter((card): card is SummaryCard => card !== null) : []),
    [profile, t.summary.totalPopulation, text],
  );

  const benchmarkCards = useMemo<BenchmarkCard[]>(() => {
    if (!profile || !benchmarkProfile) return [];

    const countryMedianAge = getLatestIndicator(profile, 'medianAge');
    const euMedianAge = getLatestIndicator(benchmarkProfile, 'medianAge');
    const countryFertility = getLatestIndicator(profile, 'fertilityRate');
    const euFertility = getLatestIndicator(benchmarkProfile, 'fertilityRate');
    const countryLifeExpectancy = getLatestIndicator(profile, 'lifeExpectancyBirth');
    const euLifeExpectancy = getLatestIndicator(benchmarkProfile, 'lifeExpectancyBirth');
    const countryDependency = getLatestIndicator(profile, 'oldAgeDependency');
    const euDependency = getLatestIndicator(benchmarkProfile, 'oldAgeDependency');

    return [
      countryMedianAge && euMedianAge ? {
        label: text.medianAge,
        value: formatDecimal(countryMedianAge.value),
        benchmarkValue: formatDecimal(euMedianAge.value),
        benchmarkYear: euMedianAge.year,
        tone: comparisonTone(countryMedianAge.value, euMedianAge.value, 0.7),
      } : null,
      countryFertility && euFertility ? {
        label: text.fertilityRate,
        value: formatDecimal(countryFertility.value, 2),
        benchmarkValue: formatDecimal(euFertility.value, 2),
        benchmarkYear: euFertility.year,
        tone: comparisonTone(countryFertility.value, euFertility.value, 0.05),
      } : null,
      countryLifeExpectancy && euLifeExpectancy ? {
        label: text.lifeExpectancyBirth,
        value: formatDecimal(countryLifeExpectancy.value),
        benchmarkValue: formatDecimal(euLifeExpectancy.value),
        benchmarkYear: euLifeExpectancy.year,
        tone: comparisonTone(countryLifeExpectancy.value, euLifeExpectancy.value, 0.35),
      } : null,
      countryDependency && euDependency ? {
        label: text.oldAgeDependency,
        value: formatPercent(countryDependency.value),
        benchmarkValue: formatPercent(euDependency.value),
        benchmarkYear: euDependency.year,
        tone: comparisonTone(countryDependency.value, euDependency.value, 0.8),
      } : null,
    ].filter((card): card is BenchmarkCard => card !== null);
  }, [benchmarkProfile, profile, text]);

  const detailGroups = useMemo<DetailGroup[]>(() => {
    if (!profile) return [];

    const population = getLatestIndicator(profile, 'population');
    const medianAge = getLatestIndicator(profile, 'medianAge');
    const oldAgeDependency = getLatestIndicator(profile, 'oldAgeDependency');
    const liveBirths = getLatestIndicator(profile, 'liveBirths');
    const deaths = getLatestIndicator(profile, 'deaths');
    const naturalChange = getLatestIndicator(profile, 'naturalChange');
    const netMigration = getLatestIndicator(profile, 'netMigration');
    const fertilityRate = getLatestIndicator(profile, 'fertilityRate');
    const meanAgeAtChildbirth = getLatestIndicator(profile, 'meanAgeAtChildbirth');
    const lifeExpectancyBirth = getLatestIndicator(profile, 'lifeExpectancyBirth');
    const lifeExpectancy65 = getLatestIndicator(profile, 'lifeExpectancy65');

    const groups = [
      {
        title: text.structureTitle,
        metrics: [
          population ? {
            label: t.summary.totalPopulation,
            value: formatPopulation(population.value),
            year: population.year,
          } : null,
          medianAge ? {
            label: text.medianAge,
            value: formatDecimal(medianAge.value),
            year: medianAge.year,
          } : null,
          oldAgeDependency ? {
            label: text.oldAgeDependency,
            value: formatPercent(oldAgeDependency.value),
            year: oldAgeDependency.year,
          } : null,
        ].filter((metric): metric is DetailCard => metric !== null),
      },
      {
        title: text.changeTitle,
        metrics: [
          liveBirths ? {
            label: text.liveBirths,
            value: formatPopulation(liveBirths.value),
            year: liveBirths.year,
          } : null,
          deaths ? {
            label: text.deaths,
            value: formatPopulation(deaths.value),
            year: deaths.year,
          } : null,
          naturalChange ? {
            label: text.naturalChange,
            value: formatSigned(naturalChange.value),
            year: naturalChange.year,
          } : null,
          netMigration ? {
            label: text.netMigration,
            value: formatSigned(netMigration.value),
            year: netMigration.year,
          } : null,
        ].filter((metric): metric is DetailCard => metric !== null),
      },
      {
        title: text.dynamicsTitle,
        metrics: [
          fertilityRate ? {
            label: text.fertilityRate,
            value: formatDecimal(fertilityRate.value, 2),
            year: fertilityRate.year,
          } : null,
          meanAgeAtChildbirth ? {
            label: text.meanAgeAtChildbirth,
            value: formatDecimal(meanAgeAtChildbirth.value),
            year: meanAgeAtChildbirth.year,
          } : null,
          lifeExpectancyBirth ? {
            label: text.lifeExpectancyBirth,
            value: formatDecimal(lifeExpectancyBirth.value),
            year: lifeExpectancyBirth.year,
          } : null,
          lifeExpectancy65 ? {
            label: text.lifeExpectancy65,
            value: formatDecimal(lifeExpectancy65.value),
            year: lifeExpectancy65.year,
          } : null,
        ].filter((metric): metric is DetailCard => metric !== null),
      },
    ];

    return groups.filter((group) => group.metrics.length > 0);
  }, [profile, t.summary.totalPopulation, text]);

  const insights = useMemo(() => {
    if (!profile) return [];

    const result: string[] = [];
    const fertility = getLatestIndicator(profile, 'fertilityRate');
    const naturalChange = getLatestIndicator(profile, 'naturalChange');
    const netMigration = getLatestIndicator(profile, 'netMigration');
    const medianAge = getLatestIndicator(profile, 'medianAge');
    const euMedianAge = getLatestIndicator(benchmarkProfile, 'medianAge');
    const lifeExpectancy = getLatestIndicator(profile, 'lifeExpectancyBirth');
    const euLifeExpectancy = getLatestIndicator(benchmarkProfile, 'lifeExpectancyBirth');
    const oldAgeDependency = getLatestIndicator(profile, 'oldAgeDependency');
    const euOldAgeDependency = getLatestIndicator(benchmarkProfile, 'oldAgeDependency');

    if (netMigration && naturalChange) {
      if (naturalChange.value < 0 && netMigration.value > Math.abs(naturalChange.value)) {
        result.push(text.naturalDeclineOffsetByMigration);
      } else if (netMigration.value > 0 && netMigration.value > Math.abs(naturalChange.value) * 0.75) {
        result.push(text.migrationLedGrowth);
      }
    }

    if (fertility && fertility.value < 2.1) {
      result.push(text.belowReplacementFertility);
    }

    if (medianAge && euMedianAge) {
      const ageTone = comparisonTone(medianAge.value, euMedianAge.value, 1.2);
      if (ageTone === 'below') result.push(text.youngerThanEu);
      if (ageTone === 'above') result.push(text.olderThanEu);
    }

    if (lifeExpectancy && euLifeExpectancy) {
      const longevityTone = comparisonTone(lifeExpectancy.value, euLifeExpectancy.value, 0.7);
      if (longevityTone === 'above') result.push(text.higherLongevityThanEu);
      if (longevityTone === 'below') result.push(text.lowerLongevityThanEu);
    }

    if (oldAgeDependency && euOldAgeDependency && oldAgeDependency.value > euOldAgeDependency.value + 2.5) {
      result.push(text.highAgeingPressure);
    }

    return [...new Set(result)].slice(0, 3);
  }, [benchmarkProfile, profile, text]);

  const comparisonToneLabel = (tone: BenchmarkCard['tone']) => {
    if (tone === 'above') return text.aboveEuAverage;
    if (tone === 'below') return text.belowEuAverage;
    return text.closeToEuAverage;
  };

  const comparisonToneClass = (tone: BenchmarkCard['tone']) => {
    if (tone === 'above') return styles.benchmarkToneAbove;
    if (tone === 'below') return styles.benchmarkToneBelow;
    return styles.benchmarkToneClose;
  };

  return (
    <section className={styles.hero}>
      <div className={styles.topRow}>
        <div className={styles.titleWrap}>
          <div className={styles.flag}>{flag}</div>
          <div>
            <p className={styles.eyebrow}>{text.title}</p>
            <h1 className={styles.title}>{name}</h1>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>
        </div>

        {compareLabel && compareUrl && (
          <Link className={styles.compareButton} to={compareUrl}>
            {compareLabel}
          </Link>
        )}
      </div>

      {quickCompareLinks.length > 0 && (
        <div className={styles.quickCompareBlock}>
          <div className={styles.sectionLabel}>{t.comparison.compareWith}</div>
          <div className={styles.quickCompareList}>
            {quickCompareLinks.map((item) => (
              <Link key={item.code} className={styles.quickCompareChip} to={item.url}>
                <span className={styles.quickCompareFlag}>{item.flag}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {insights.length > 0 && (
        <div className={styles.insightsBlock}>
          <div className={styles.sectionLabel}>{text.insightsTitle}</div>
          <div className={styles.insightList}>
            {insights.map((insight) => (
              <div key={insight} className={styles.insightChip}>
                {insight}
              </div>
            ))}
          </div>
        </div>
      )}

      {summaryCards.length > 0 && (
        <div className={styles.summaryGrid}>
          {summaryCards.map((card) => (
            <div key={card.label} className={styles.summaryCard}>
              <div className={styles.summaryLabel}>{card.label}</div>
              <div className={styles.summaryValue}>{card.value}</div>
              <div className={styles.summaryMeta}>{text.referenceYear} {card.year}</div>
            </div>
          ))}
        </div>
      )}

      {benchmarkCards.length > 0 && (
        <div className={styles.benchmarkBlock}>
          <div className={styles.sectionLabel}>{text.benchmarkTitle}</div>
          <div className={styles.benchmarkGrid}>
            {benchmarkCards.map((card) => (
              <div key={card.label} className={styles.benchmarkCard}>
                <div className={styles.benchmarkHeader}>
                  <div className={styles.summaryLabel}>{card.label}</div>
                  <div className={`${styles.benchmarkTone} ${comparisonToneClass(card.tone)}`}>
                    {comparisonToneLabel(card.tone)}
                  </div>
                </div>
                <div className={styles.benchmarkValue}>{card.value}</div>
                <div className={styles.benchmarkMeta}>
                  {text.euAverage}: {card.benchmarkValue} • {card.benchmarkYear}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {profile && detailGroups.length > 0 && (
        <div className={styles.detailsBlock}>
          <div className={styles.sectionLabel}>{text.detailsTitle}</div>
          <div className={styles.detailsGrid}>
            {detailGroups.map((group) => (
              <div key={group.title} className={styles.detailGroup}>
                <h3 className={styles.detailGroupTitle}>{group.title}</h3>
                <div className={styles.detailCards}>
                  {group.metrics.map((metric) => (
                    <div key={`${group.title}-${metric.label}`} className={styles.detailCard}>
                      <div className={styles.summaryLabel}>{metric.label}</div>
                      <div className={styles.detailValue}>{metric.value}</div>
                      <div className={styles.summaryMeta}>{text.referenceYear} {metric.year}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className={styles.sourceMeta}>{text.sourceLabel} {profile.source}</div>
        </div>
      )}
    </section>
  );
}
