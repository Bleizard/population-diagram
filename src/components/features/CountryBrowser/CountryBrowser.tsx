import { lazy, Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n';
import { COUNTRIES, type CountryMeta } from '../../../data/countries';
import { getLocalizedCountryName } from '../../../utils/localizedCountryName';
import { getLocalizedCapitalName } from '../../../utils/localizedCapitalName';
import { formatPopulation } from '../../../utils';
import {
  fetchCountryIndex,
  fetchCountryDemographyProfile,
  fetchCountrySummary,
  type CountryIndexEntry,
  type CountryDemographyProfile,
  type CountrySummaryEntry,
} from '../../../services/countryDataLoader';
import type { Theme } from '../../../hooks';
import styles from './CountryBrowser.module.css';

type RegionFilter = 'All' | 'Europe' | 'Asia' | 'Africa' | 'Oceania' | 'America';
type BrowserMode = 'list' | 'map';

interface CountryBrowserProps {
  isLoading: boolean;
  fullWidth?: boolean;
  theme: Theme;
}

const BROWSER_MODE_STORAGE_KEY = 'population-country-browser-mode';

const CountryMapBrowser = lazy(() =>
  import('../CountryMapBrowser').then((module) => ({ default: module.CountryMapBrowser }))
);

const EUROPE_CODES = new Set([
  'EU', 'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'EL', 'HU',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO', 'CH', 'AL', 'BA', 'ME', 'MK', 'MD', 'RS', 'TR', 'GE', 'UA', 'XK',
  'UK', 'BY', 'RU',
]);

const ASIA_CODES = new Set([
  'JP', 'AM', 'AZ', 'KZ', 'KG', 'TJ', 'TM', 'UZ', 'IL', 'AE', 'SA', 'OM', 'QA', 'KR',
  'MN', 'ID', 'TH', 'VN', 'MY', 'SG', 'PH', 'CN', 'IN', 'PK', 'BD',
]);

const AFRICA_CODES = new Set([
  'EG', 'ZA', 'NG', 'KE', 'ET', 'ZM', 'NE', 'TD', 'CI', 'CD', 'SN', 'NA', 'AO', 'MA',
  'DZ', 'TN', 'GH', 'BW',
]);

const OCEANIA_CODES = new Set(['AU']);

const AMERICA_CODES = new Set([
  'US', 'CA', 'MX', 'BR', 'AR', 'BO', 'CL', 'CO', 'EC', 'PE', 'PY', 'UY', 'VE', 'GY', 'SR',
]);

function getBrowserRegion(country: CountryMeta): Exclude<RegionFilter, 'All'> {
  if (EUROPE_CODES.has(country.code)) return 'Europe';
  if (ASIA_CODES.has(country.code)) return 'Asia';
  if (AFRICA_CODES.has(country.code)) return 'Africa';
  if (OCEANIA_CODES.has(country.code)) return 'Oceania';
  if (AMERICA_CODES.has(country.code)) return 'America';
  return 'Europe';
}

const REGION_COUNTS: Record<RegionFilter, number> = {
  All: COUNTRIES.length,
  Europe: COUNTRIES.filter((country) => getBrowserRegion(country) === 'Europe').length,
  Asia: COUNTRIES.filter((country) => getBrowserRegion(country) === 'Asia').length,
  Africa: COUNTRIES.filter((country) => getBrowserRegion(country) === 'Africa').length,
  Oceania: COUNTRIES.filter((country) => getBrowserRegion(country) === 'Oceania').length,
  America: COUNTRIES.filter((country) => getBrowserRegion(country) === 'America').length,
};

function getLatestValue(
  profile: CountryDemographyProfile | null | undefined,
  key: 'population' | 'medianAge' | 'oldAgeDependency' | 'lifeExpectancyBirth',
): number | null {
  const series = profile?.indicators[key];
  if (!series || series.length === 0) return null;
  return series[series.length - 1]?.value ?? null;
}

function getDisplaySourceLabel(rawSource: string | null | undefined): string | null {
  if (!rawSource) return null;

  if (
    rawSource.includes('US Census Bureau')
    && (rawSource.includes('CDC') || rawSource.includes('National Center for Health Statistics'))
  ) return 'US Census + CDC';
  if (rawSource.includes('Eurostat')) return 'Eurostat';
  if (rawSource.includes('Office for National Statistics')) return 'ONS';
  if (rawSource.includes('Australian Bureau of Statistics')) return 'ABS';
  if (rawSource.includes('International Database')) return 'US Census IDB';
  if (rawSource.includes('CDC') || rawSource.includes('National Center for Health Statistics')) return 'CDC/NCHS';
  if (rawSource.includes('US Census Bureau')) return 'US Census Bureau';
  if (rawSource.includes('Statistics Canada')) return 'Statistics Canada';

  return rawSource.replace(/\s*\(.*?\)\s*/g, ' ').trim();
}

export function CountryBrowser({ isLoading, fullWidth, theme }: CountryBrowserProps) {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('All');
  const [countryIndex, setCountryIndex] = useState<CountryIndexEntry[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, CountryDemographyProfile | null>>({});
  const [summaryMap, setSummaryMap] = useState<Record<string, CountrySummaryEntry | null>>({});
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [browserMode, setBrowserMode] = useState<BrowserMode>(() => {
    if (typeof window === 'undefined') return 'list';
    const saved = window.localStorage.getItem(BROWSER_MODE_STORAGE_KEY);
    return saved === 'map' ? 'map' : 'list';
  });

  useEffect(() => {
    fetchCountryIndex()
      .then(setCountryIndex)
      .catch(() => {/* index load failed — cards will show without year info */});
  }, []);

  useEffect(() => {
    let isCancelled = false;

    Promise.all(
      COUNTRIES.map(async (country) => {
        try {
          const profile = await fetchCountryDemographyProfile(country.code);
          return [country.code, profile] as const;
        } catch {
          return [country.code, null] as const;
        }
      })
    ).then((entries) => {
      if (isCancelled) return;
      setProfileMap(Object.fromEntries(entries));
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    Promise.all(
      COUNTRIES.map(async (country) => {
        try {
          const summary = await fetchCountrySummary(country.code);
          return [country.code, summary] as const;
        } catch {
          return [country.code, null] as const;
        }
      })
    ).then((entries) => {
      if (isCancelled) return;
      setSummaryMap(Object.fromEntries(entries));
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(BROWSER_MODE_STORAGE_KEY, browserMode);
    }
  }, [browserMode]);

  useEffect(() => {
    if (!isSearchExpanded) return;
    searchInputRef.current?.focus();
  }, [isSearchExpanded]);

  const indexMap = useMemo(() => {
    const map = new Map<string, CountryIndexEntry>();
    for (const entry of countryIndex) {
      map.set(entry.code, entry);
    }
    return map;
  }, [countryIndex]);

  // Localized country names map
  const localizedNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of COUNTRIES) {
      map.set(c.code, getLocalizedCountryName(c.code, language, c.name));
    }
    return map;
  }, [language]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return COUNTRIES.filter((c: CountryMeta) => {
      if (regionFilter !== 'All' && getBrowserRegion(c) !== regionFilter) return false;
      if (q) {
        const locName = localizedNames.get(c.code) ?? c.name;
        if (!c.name.toLowerCase().includes(q)
          && !locName.toLowerCase().includes(q)
          && !c.code.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      const nameA = localizedNames.get(a.code) ?? a.name;
      const nameB = localizedNames.get(b.code) ?? b.name;
      return nameA.localeCompare(nameB, language);
    });
  }, [search, regionFilter, localizedNames, language]);

  const mapFiltered = useMemo(
    () => filtered.filter((country) => !country.isAggregate),
    [filtered],
  );

  const tAny = t as Record<string, unknown>;

  const regions: { key: RegionFilter; label: string }[] = [
    { key: 'All', label: `${t.countryBrowser.all} (${REGION_COUNTS.All})` },
    { key: 'Europe', label: `${(tAny.countryBrowser as Record<string, string>)?.europe ?? 'Europe'} (${REGION_COUNTS.Europe})` },
    { key: 'Asia', label: `${(tAny.countryBrowser as Record<string, string>)?.asia ?? 'Asia'} (${REGION_COUNTS.Asia})` },
    { key: 'Africa', label: `${(tAny.countryBrowser as Record<string, string>)?.africa ?? 'Africa'} (${REGION_COUNTS.Africa})` },
    { key: 'Oceania', label: `${(tAny.countryBrowser as Record<string, string>)?.oceania ?? 'Australia & Oceania'} (${REGION_COUNTS.Oceania})` },
    { key: 'America', label: `${(tAny.countryBrowser as Record<string, string>)?.america ?? 'America'} (${REGION_COUNTS.America})` },
  ];

  const browserText = {
    capital: (tAny.countryBrowser as Record<string, string>)?.capital ?? (language === 'ru' ? 'Столица' : 'Capital'),
    population: (tAny.countryBrowser as Record<string, string>)?.population ?? (language === 'ru' ? 'Население' : 'Population'),
    medianAge: (tAny.countryBrowser as Record<string, string>)?.medianAge ?? t.demographyProfile.medianAge,
    dataPeriod: (tAny.countryBrowser as Record<string, string>)?.dataPeriod ?? (language === 'ru' ? 'Период данных' : 'Data period'),
    lifeExpectancy: (tAny.countryBrowser as Record<string, string>)?.lifeExpectancy ?? (language === 'ru' ? 'Продолж. жизни' : 'Life expectancy'),
    dependencyRatio: (tAny.countryBrowser as Record<string, string>)?.dependencyRatio ?? t.summary.dependencyRatio,
    source: (tAny.countryBrowser as Record<string, string>)?.source ?? (language === 'ru' ? 'Источник' : 'Source'),
    compareCountry: (tAny.countryBrowser as Record<string, string>)?.compareCountry ?? (language === 'ru' ? 'Сравнить страну' : 'Compare country'),
  };

  function formatYearRange(entry: CountryIndexEntry | undefined): string | null {
    if (!entry || entry.years.length === 0) return null;
    const first = entry.years[0];
    const last = entry.years[entry.years.length - 1];
    return `${first}–${last}`;
  }

  function closeSearch() {
    setSearch('');
    setIsSearchExpanded(false);
  }

  return (
    <div className={`${styles.container} ${fullWidth ? styles.fullWidth : ''} ${browserMode === 'map' ? styles.mapMode : ''}`}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>{t.countryBrowser.title}</h2>

        <div className={styles.viewModeToggle}>
          <button
            type="button"
            className={`${styles.viewModeButton} ${browserMode === 'list' ? styles.viewModeButtonActive : ''}`}
            onClick={() => setBrowserMode('list')}
          >
            {t.countryBrowser.listMode}
          </button>
          <button
            type="button"
            className={`${styles.viewModeButton} ${browserMode === 'map' ? styles.viewModeButtonActive : ''}`}
            onClick={() => setBrowserMode('map')}
          >
            {t.countryBrowser.mapMode}
          </button>
        </div>
      </div>

      {isSearchExpanded ? (
        <div className={styles.searchExpandedRow}>
          <input
            ref={searchInputRef}
            type="text"
            className={styles.searchInput}
            placeholder={t.countryBrowser.search}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                closeSearch();
              }
            }}
          />
          <button
            type="button"
            className={styles.searchCloseButton}
            onClick={closeSearch}
            aria-label={t.common.close}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ) : (
        <div className={styles.filterRow}>
          <div className={styles.regionTabs}>
            {regions.map(r => (
              <button
                key={r.key}
                className={`${styles.regionTab} ${regionFilter === r.key ? styles.regionTabActive : ''}`}
                onClick={() => setRegionFilter(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.searchTrigger}
            onClick={() => setIsSearchExpanded(true)}
            aria-label={t.countryBrowser.search}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
              <path d="M16 16L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {browserMode === 'map' ? (
        mapFiltered.length === 0 ? (
          <div className={styles.noResults}>{t.countryBrowser.noResults}</div>
        ) : (
          <Suspense fallback={<div className={styles.noResults}>{t.countryBrowser.mapLoading}</div>}>
            <CountryMapBrowser
              countries={mapFiltered}
              localizedNames={localizedNames}
              isLoading={isLoading}
              theme={theme}
            />
          </Suspense>
        )
      ) : (
        <div className={styles.grid}>
          {filtered.length === 0 ? (
            <div className={styles.noResults}>{t.countryBrowser.noResults}</div>
          ) : (
            filtered.map(country => {
              const idx = indexMap.get(country.code);
              const profile = profileMap[country.code];
              const summary = summaryMap[country.code];
              const yearRange = formatYearRange(idx);
              const hasResolvedProfile = Object.prototype.hasOwnProperty.call(profileMap, country.code);
              const hasResolvedSummary = Object.prototype.hasOwnProperty.call(summaryMap, country.code);
              const isDataUnavailable =
                hasResolvedProfile &&
                hasResolvedSummary &&
                profile === null &&
                summary === null &&
                (!idx || idx.years.length === 0);
              const isCardInteractive = !isLoading && !isDataUnavailable;
              const population = getLatestValue(profile, 'population') ?? summary?.metrics.totalPopulation ?? null;
              const medianAge = getLatestValue(profile, 'medianAge') ?? summary?.metrics.medianAge ?? null;
              const lifeExpectancy = getLatestValue(profile, 'lifeExpectancyBirth');
              const dependencyRatio = getLatestValue(profile, 'oldAgeDependency') ?? summary?.metrics.dependencyRatio ?? null;
              const sourceLabel = getDisplaySourceLabel(profile?.source ?? summary?.source);
              return (
                <div
                  key={country.code}
                  className={`${styles.card} ${isLoading ? styles.cardDisabled : ''} ${isDataUnavailable ? styles.cardMuted : ''}`}
                  role="link"
                  tabIndex={isCardInteractive ? 0 : -1}
                  onClick={() => {
                    if (isCardInteractive) navigate(`/country/${country.code}`);
                  }}
                  onKeyDown={(event) => {
                    if (!isCardInteractive) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/country/${country.code}`);
                    }
                  }}
                >
                  {!country.isAggregate && !isDataUnavailable && (
                    <Link
                      className={styles.compareIconButton}
                      to={`/compare/${country.code}`}
                      onClick={(event) => {
                        if (!isCardInteractive) {
                          event.preventDefault();
                          return;
                        }
                        event.stopPropagation();
                      }}
                      aria-label={browserText.compareCountry}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M7 5H5v14h2V5zm12 0h-2v14h2V5zM14 9h-2v10h2V9zm-5 4H7v6h2v-6z" fill="currentColor" />
                      </svg>
                    </Link>
                  )}

                  <div className={styles.cardHeader}>
                    <span className={styles.cardFlag}>{country.flag}</span>
                    <div className={styles.cardHeading}>
                      <p className={styles.cardName}>{localizedNames.get(country.code) ?? country.name}</p>
                    </div>
                  </div>

                  <div className={styles.cardSummaryGrid}>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>{browserText.capital}</span>
                      <span className={styles.summaryValue}>
                        {getLocalizedCapitalName(country.code, language, country.capital)}
                      </span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>{browserText.population}</span>
                      <span className={styles.summaryValue}>
                        {population !== null ? formatPopulation(population) : t.summary.notAvailable}
                      </span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>{browserText.medianAge}</span>
                      <span className={styles.summaryValue}>
                        {medianAge !== null ? medianAge.toFixed(1) : t.summary.notAvailable}
                      </span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>{browserText.lifeExpectancy}</span>
                      <span className={styles.summaryValue}>
                        {lifeExpectancy !== null ? lifeExpectancy.toFixed(1) : t.summary.notAvailable}
                      </span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>{browserText.dataPeriod}</span>
                      <span className={styles.summaryValue}>{yearRange ?? t.summary.notAvailable}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>{browserText.dependencyRatio}</span>
                      <span className={styles.summaryValue}>
                        {dependencyRatio !== null ? `${dependencyRatio.toFixed(1)}%` : t.summary.notAvailable}
                      </span>
                    </div>
                  </div>
                  {sourceLabel && (
                    <div className={styles.cardSourceMeta}>
                      <span className={styles.cardSourceLabel}>{browserText.source}</span>
                      <span className={styles.cardSourceValue}>{sourceLabel}</span>
                    </div>
                  )}
                  {isDataUnavailable && <div className={styles.cardOverlay} aria-hidden="true" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
