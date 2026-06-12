import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { COUNTRIES } from '../data/countries';
import { useI18n } from '../i18n';
import {
  fetchCountryDemographyProfile,
  fetchCountrySummary,
  type CountryDemographyProfile,
  type CountrySummaryEntry,
} from '../services/countryDataLoader';
import { getLocalizedCountryName } from '../utils/localizedCountryName';
import styles from './RankingsPage.module.css';

type RankingMetricKey =
  | 'median-age'
  | 'share-65-plus'
  | 'dependency-ratio'
  | 'working-age-share'
  | 'youngest-population';

interface RankingsPageText {
  title: string;
  subtitle: string;
  scope: string;
  allCountries: string;
  europeOnly: string;
  metric: string;
  year: string;
  source: string;
  explore: string;
  loading: string;
  empty: string;
  medianAge: string;
  share65Plus: string;
  dependencyRatio: string;
  workingAgeShare: string;
  youngestPopulation: string;
  oldestPopulations: string;
  highest65Plus: string;
  highestDependency: string;
  highestWorkingAgeShare: string;
  youngestPopulations: string;
  oldestPopulationsInEurope: string;
  highest65PlusInEurope: string;
  highestDependencyInEurope: string;
  highestWorkingAgeShareInEurope: string;
  youngestPopulationsInEurope: string;
}

interface RankingDefinition {
  key: RankingMetricKey;
  tabLabel: string;
  getValue: (
    profile: CountryDemographyProfile | null,
    summary: CountrySummaryEntry | null
  ) => { value: number; year: number | null } | null;
  format: (value: number) => string;
  direction: 'asc' | 'desc';
}

interface RankingRow {
  code: string;
  flag: string;
  name: string;
  capital: string;
  value: number;
  formattedValue: string;
  year: number | null;
  source: string;
}

const FALLBACK_TEXT: RankingsPageText = {
  title: 'Rankings',
  subtitle: 'Browse demographic leaderboards and jump straight into country profiles',
  scope: 'Scope',
  allCountries: 'All countries',
  europeOnly: 'Europe',
  metric: 'Metric',
  year: 'Year',
  source: 'Source',
  explore: 'Open country profile',
  loading: 'Loading rankings...',
  empty: 'Not enough data for this ranking yet',
  medianAge: 'Median age',
  share65Plus: 'Age 65+',
  dependencyRatio: 'Dependency ratio',
  workingAgeShare: 'Age 15-64',
  youngestPopulation: 'Youngest population',
  oldestPopulations: 'Oldest populations',
  highest65Plus: 'Highest 65+ shares',
  highestDependency: 'Highest dependency ratios',
  highestWorkingAgeShare: 'Highest working-age shares',
  youngestPopulations: 'Youngest populations',
  oldestPopulationsInEurope: 'Oldest populations in Europe',
  highest65PlusInEurope: 'Highest 65+ shares in Europe',
  highestDependencyInEurope: 'Highest dependency ratios in Europe',
  highestWorkingAgeShareInEurope: 'Highest working-age shares in Europe',
  youngestPopulationsInEurope: 'Youngest populations in Europe',
};

const EUROPEAN_RANKING_CODES = new Set(
  COUNTRIES.filter((country) => {
    if (country.isAggregate) return false;
    return country.region === 'EU'
      || country.region === 'EFTA'
      || country.region === 'Candidate'
      || country.code === 'UK';
  }).map((country) => country.code)
);
const ALL_RANKING_CODES = new Set(
  COUNTRIES.filter((country) => !country.isAggregate).map((country) => country.code)
);

type RankingScope = 'all' | 'europe';

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatDecimal(value: number) {
  return value.toFixed(1);
}

function getLatestValue(series: Array<{ year: number; value: number }> | undefined) {
  if (!series || series.length === 0) return null;
  return series[series.length - 1] ?? null;
}

export function RankingsPage() {
  const { metric } = useParams<{ metric?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, language } = useI18n();
  const [profiles, setProfiles] = useState<Record<string, CountryDemographyProfile | null>>({});
  const [summaries, setSummaries] = useState<Record<string, CountrySummaryEntry | null>>({});
  const [isLoading, setIsLoading] = useState(true);

  const text: RankingsPageText = {
    ...FALLBACK_TEXT,
    ...(t.rankings ?? {}),
  };

  const definitions = useMemo<Record<RankingMetricKey, RankingDefinition>>(() => ({
    'median-age': {
      key: 'median-age',
      tabLabel: text.medianAge,
      getValue: (profile) => {
        const point = getLatestValue(profile?.indicators.medianAge);
        return point ? { value: point.value, year: point.year } : null;
      },
      format: formatDecimal,
      direction: 'desc',
    },
    'share-65-plus': {
      key: 'share-65-plus',
      tabLabel: text.share65Plus,
      getValue: (_profile, summary) => (
        summary?.metrics.seniorShare !== null && summary?.metrics.seniorShare !== undefined
          ? { value: summary.metrics.seniorShare, year: summary.year }
          : null
      ),
      format: formatPercent,
      direction: 'desc',
    },
    'dependency-ratio': {
      key: 'dependency-ratio',
      tabLabel: text.dependencyRatio,
      getValue: (profile, summary) => {
        const profilePoint = getLatestValue(profile?.indicators.oldAgeDependency);
        if (profilePoint) return { value: profilePoint.value, year: profilePoint.year };
        if (summary?.metrics.dependencyRatio !== null && summary?.metrics.dependencyRatio !== undefined) {
          return { value: summary.metrics.dependencyRatio, year: summary.year };
        }
        return null;
      },
      format: formatPercent,
      direction: 'desc',
    },
    'working-age-share': {
      key: 'working-age-share',
      tabLabel: text.workingAgeShare,
      getValue: (_profile, summary) => (
        summary?.metrics.workingAgeShare !== null && summary?.metrics.workingAgeShare !== undefined
          ? { value: summary.metrics.workingAgeShare, year: summary.year }
          : null
      ),
      format: formatPercent,
      direction: 'desc',
    },
    'youngest-population': {
      key: 'youngest-population',
      tabLabel: text.youngestPopulation,
      getValue: (profile) => {
        const point = getLatestValue(profile?.indicators.medianAge);
        return point ? { value: point.value, year: point.year } : null;
      },
      format: formatDecimal,
      direction: 'asc',
    },
  }), [text]);

  const rankingKey = (metric ?? 'median-age') as RankingMetricKey;
  const rankingDefinition = definitions[rankingKey];
  const scopeParam = searchParams.get('scope');
  const rankingScope: RankingScope = scopeParam === 'europe' ? 'europe' : 'all';

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    Promise.all(
      COUNTRIES.filter((country) => ALL_RANKING_CODES.has(country.code)).map(async (country) => {
        const [profile, summary] = await Promise.all([
          fetchCountryDemographyProfile(country.code).catch(() => null),
          fetchCountrySummary(country.code).catch(() => null),
        ]);
        return [country.code, profile, summary] as const;
      })
    ).then((entries) => {
      if (isCancelled) return;
      setProfiles(Object.fromEntries(entries.map(([code, profile]) => [code, profile])));
      setSummaries(Object.fromEntries(entries.map(([code, _profile, summary]) => [code, summary])));
      setIsLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  const rows = useMemo<RankingRow[]>(() => {
    if (!rankingDefinition) return [];
    const allowedCodes = rankingScope === 'europe' ? EUROPEAN_RANKING_CODES : ALL_RANKING_CODES;

    return COUNTRIES
      .filter((country) => allowedCodes.has(country.code))
      .map((country) => {
        const profile = profiles[country.code] ?? null;
        const summary = summaries[country.code] ?? null;
        const point = rankingDefinition.getValue(profile, summary);
        if (!point) return null;

        return {
          code: country.code,
          flag: country.flag,
          name: getLocalizedCountryName(country.code, language, country.name),
          capital: country.capital,
          value: point.value,
          formattedValue: rankingDefinition.format(point.value),
          year: point.year,
          source: profile?.source || summary?.source || '',
        };
      })
      .filter((row): row is RankingRow => row !== null)
      .sort((a, b) => rankingDefinition.direction === 'desc' ? b.value - a.value : a.value - b.value);
  }, [language, profiles, rankingDefinition, rankingScope, summaries]);

  const rankingTitle = useMemo(() => {
    const scopeLabel = rankingScope === 'europe' ? text.europeOnly : text.allCountries;
    const baseTitle = (() => {
      switch (rankingKey) {
        case 'median-age':
          return text.oldestPopulations;
        case 'share-65-plus':
          return text.highest65Plus;
        case 'dependency-ratio':
          return text.highestDependency;
        case 'working-age-share':
          return text.highestWorkingAgeShare;
        case 'youngest-population':
          return text.youngestPopulations;
        default:
          return text.title;
      }
    })();

    return language === 'ru'
      ? `${baseTitle} — ${scopeLabel}`
      : `${baseTitle} · ${scopeLabel}`;
  }, [language, rankingKey, rankingScope, text]);

  if (!rankingDefinition) {
    return <Navigate to="/rankings/median-age" replace />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div>
          <p className={styles.kicker}>{text.title}</p>
          <h2 className={styles.title}>{rankingTitle}</h2>
          <p className={styles.subtitle}>{text.subtitle}</p>
        </div>

        <div className={styles.scopeRow}>
          <span className={styles.scopeLabel}>{text.scope}</span>
          <div className={styles.scopeToggle}>
            <button
              type="button"
              className={`${styles.scopeButton} ${rankingScope === 'all' ? styles.scopeButtonActive : ''}`}
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set('scope', 'all');
                setSearchParams(params, { replace: true });
              }}
            >
              {text.allCountries}
            </button>
            <button
              type="button"
              className={`${styles.scopeButton} ${rankingScope === 'europe' ? styles.scopeButtonActive : ''}`}
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set('scope', 'europe');
                setSearchParams(params, { replace: true });
              }}
            >
              {text.europeOnly}
            </button>
          </div>
        </div>

        <div className={styles.tabs}>
          {(Object.keys(definitions) as RankingMetricKey[]).map((key) => (
            <Link
              key={key}
              to={`/rankings/${key}?scope=${rankingScope}`}
              className={`${styles.tab} ${key === rankingKey ? styles.tabActive : ''}`}
            >
              {definitions[key].tabLabel}
            </Link>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className={styles.emptyState}>{text.loading}</div>
      ) : rows.length === 0 ? (
        <div className={styles.emptyState}>{text.empty}</div>
      ) : (
        <div className={styles.list}>
          {rows.map((row, index) => (
            <Link key={row.code} to={`/country/${row.code}`} className={styles.card}>
              <div className={styles.rank}>{index + 1}</div>
              <div className={styles.country}>
                <span className={styles.flag}>{row.flag}</span>
                <div>
                  <div className={styles.countryName}>{row.name}</div>
                  <div className={styles.countryMeta}>{row.capital}</div>
                </div>
              </div>
              <div className={styles.metricBlock}>
                <div className={styles.metricLabel}>{text.metric}</div>
                <div className={styles.metricValue}>{row.formattedValue}</div>
              </div>
              <div className={styles.metaBlock}>
                <div><span className={styles.metaLabel}>{text.year}</span> {row.year ?? '—'}</div>
                <div><span className={styles.metaLabel}>{text.source}</span> {row.source}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
