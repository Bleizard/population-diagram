import { lazy, Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n';
import { COUNTRIES, type CountryMeta } from '../../../data/countries';
import { getLocalizedCountryName } from '../../../utils/localizedCountryName';
import { fetchCountryIndex, type CountryIndexEntry } from '../../../services/countryDataLoader';
import type { Theme } from '../../../hooks';
import styles from './CountryBrowser.module.css';

type RegionFilter = 'All' | 'EU' | 'EFTA' | 'Candidate' | 'NorthAmerica' | 'Other';
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

// Pre-compute counts
const REGION_COUNTS: Record<RegionFilter, number> = {
  All: COUNTRIES.length,
  EU: COUNTRIES.filter(c => c.region === 'EU').length,
  EFTA: COUNTRIES.filter(c => c.region === 'EFTA').length,
  Candidate: COUNTRIES.filter(c => c.region === 'Candidate').length,
  NorthAmerica: COUNTRIES.filter(c => c.region === 'NorthAmerica').length,
  Other: COUNTRIES.filter(c => c.region === 'Other').length,
};

export function CountryBrowser({ isLoading, fullWidth, theme }: CountryBrowserProps) {
  const { t, language } = useI18n();
  const [search, setSearch] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('All');
  const [countryIndex, setCountryIndex] = useState<CountryIndexEntry[]>([]);
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
      if (regionFilter !== 'All' && c.region !== regionFilter) return false;
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
  const euCandidatesLabel = (tAny.countryBrowser as Record<string, string>)?.euCandidates
    ?? (t.countryBrowser as Record<string, string>).candidates;

  const regions: { key: RegionFilter; label: string }[] = [
    { key: 'All', label: `${t.countryBrowser.all} (${REGION_COUNTS.All})` },
    { key: 'EU', label: `${t.countryBrowser.eu} (${REGION_COUNTS.EU})` },
    { key: 'EFTA', label: `${t.countryBrowser.efta} (${REGION_COUNTS.EFTA})` },
    { key: 'Candidate', label: `${euCandidatesLabel} (${REGION_COUNTS.Candidate})` },
    { key: 'NorthAmerica', label: `${t.countryBrowser.northAmerica} (${REGION_COUNTS.NorthAmerica})` },
    { key: 'Other', label: `${t.countryBrowser.other} (${REGION_COUNTS.Other})` },
  ];

  function formatYearRange(entry: CountryIndexEntry | undefined): string | null {
    if (!entry || entry.years.length === 0) return null;
    const first = entry.years[0];
    const last = entry.years[entry.years.length - 1];
    return `${first}–${last} (${entry.years.length} ${t.countryBrowser.years})`;
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
              const yearRange = formatYearRange(idx);
              return (
                <div key={country.code} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardFlag}>{country.flag}</span>
                    <p className={styles.cardName}>{localizedNames.get(country.code) ?? country.name}</p>
                  </div>
                  {yearRange && <p className={styles.cardYears}>{yearRange}</p>}
                  <div className={styles.cardActions}>
                    <Link
                      className={`${styles.cardButton} ${isLoading ? styles.cardButtonDisabled : ''}`}
                      to={`/country/${country.code}`}
                      onClick={isLoading ? (e) => e.preventDefault() : undefined}
                    >
                      {t.countryBrowser.view}
                    </Link>
                    {!country.isAggregate && (
                      <Link
                        className={`${styles.cardButton} ${isLoading ? styles.cardButtonDisabled : ''}`}
                        to={`/compare/${country.code}`}
                        onClick={isLoading ? (e) => e.preventDefault() : undefined}
                      >
                        {t.countryBrowser.compare}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
