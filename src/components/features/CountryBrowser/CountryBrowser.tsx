import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n';
import { COUNTRIES, type CountryMeta } from '../../../data/countries';
import { getLocalizedCountryName } from '../../../utils/localizedCountryName';
import { fetchCountryIndex, type CountryIndexEntry } from '../../../services/countryDataLoader';
import styles from './CountryBrowser.module.css';

type RegionFilter = 'All' | 'EU' | 'EFTA' | 'Candidate' | 'NorthAmerica' | 'Other';

interface CountryBrowserProps {
  isLoading: boolean;
  fullWidth?: boolean;
}

// Pre-compute counts
const REGION_COUNTS: Record<RegionFilter, number> = {
  All: COUNTRIES.length,
  EU: COUNTRIES.filter(c => c.region === 'EU').length,
  EFTA: COUNTRIES.filter(c => c.region === 'EFTA').length,
  Candidate: COUNTRIES.filter(c => c.region === 'Candidate').length,
  NorthAmerica: COUNTRIES.filter(c => c.region === 'NorthAmerica').length,
  Other: COUNTRIES.filter(c => c.region === 'Other').length,
};

export function CountryBrowser({ isLoading, fullWidth }: CountryBrowserProps) {
  const { t, language } = useI18n();
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('All');
  const [countryIndex, setCountryIndex] = useState<CountryIndexEntry[]>([]);

  useEffect(() => {
    fetchCountryIndex()
      .then(setCountryIndex)
      .catch(() => {/* index load failed — cards will show without year info */});
  }, []);

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
    });
  }, [search, regionFilter, localizedNames]);

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

  return (
    <div className={`${styles.container} ${fullWidth ? styles.fullWidth : ''}`}>
      <h2 className={styles.title}>{t.countryBrowser.title}</h2>

      <div className={styles.searchWrapper}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder={t.countryBrowser.search}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

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

      <div className={styles.grid}>
        {filtered.length === 0 ? (
          <div className={styles.noResults}>{t.countryBrowser.noResults}</div>
        ) : (
          filtered.map(country => {
            const idx = indexMap.get(country.code);
            const yearRange = formatYearRange(idx);
            return (
              <div key={country.code} className={styles.card}>
                <span className={styles.cardFlag}>{country.flag}</span>
                <div className={styles.cardInfo}>
                  <p className={styles.cardName}>{localizedNames.get(country.code) ?? country.name}</p>
                  {yearRange && <p className={styles.cardYears}>{yearRange}</p>}
                </div>
                <Link
                  className={`${styles.viewButton} ${isLoading ? styles.viewButtonDisabled : ''}`}
                  to={`/country/${country.code}`}
                  onClick={isLoading ? (e) => e.preventDefault() : undefined}
                >
                  {t.countryBrowser.view}
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
