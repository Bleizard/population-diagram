import { useEffect, useRef, lazy, Suspense, useMemo, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { COUNTRIES } from '../data/countries';
import { getLocalizedCountryName } from '../utils/localizedCountryName';
import {
  CountryDemographyTrends,
  CountryPageHero,
} from '../components/features';
import {
  fetchCountryDemographyProfile,
  type CountryDemographyProfile as CountryDemographyProfileData,
} from '../services/countryDataLoader';
import type { usePopulationData } from '../hooks';
import type { Theme } from '../hooks';
import styles from '../App.module.css';

interface QuickCompareLink {
  code: string;
  name: string;
  flag: string;
  url: string;
}

const QUICK_COMPARE_MAP: Record<string, string[]> = {
  AT: ['DE', 'IT', 'CH'],
  BE: ['FR', 'NL', 'DE'],
  BG: ['RO', 'EL', 'RS'],
  CH: ['DE', 'FR', 'IT'],
  CY: ['EL', 'IT', 'FR'],
  CZ: ['DE', 'PL', 'SK'],
  DE: ['FR', 'PL', 'IT'],
  DK: ['SE', 'DE', 'NL'],
  EE: ['LV', 'FI', 'LT'],
  EL: ['IT', 'BG', 'RO'],
  ES: ['FR', 'PT', 'IT'],
  FI: ['SE', 'EE', 'DE'],
  FR: ['DE', 'ES', 'IT'],
  HR: ['SI', 'IT', 'AT'],
  HU: ['AT', 'SK', 'RO'],
  IE: ['FR', 'DE', 'ES'],
  IS: ['NO', 'DK', 'SE'],
  IT: ['DE', 'FR', 'ES'],
  LI: ['CH', 'AT', 'DE'],
  LT: ['LV', 'EE', 'PL'],
  LU: ['BE', 'DE', 'FR'],
  LV: ['EE', 'LT', 'FI'],
  ME: ['RS', 'AL', 'HR'],
  MK: ['RS', 'BG', 'EL'],
  MT: ['IT', 'ES', 'FR'],
  NL: ['DE', 'BE', 'FR'],
  NO: ['SE', 'DK', 'DE'],
  PL: ['DE', 'CZ', 'SK'],
  PT: ['ES', 'FR', 'IT'],
  RO: ['HU', 'BG', 'PL'],
  RS: ['RO', 'BG', 'HU'],
  SE: ['DK', 'FI', 'DE'],
  SI: ['AT', 'IT', 'HR'],
  SK: ['CZ', 'PL', 'HU'],
  TR: ['EL', 'BG', 'RO'],
  AL: ['RS', 'IT', 'EL'],
  BA: ['RS', 'HR', 'SI'],
  AU: ['JP', 'US', 'CA'],
  CA: ['US', 'AU', 'JP'],
  JP: ['AU', 'US', 'CA'],
  US: ['CA', 'AU', 'JP'],
};

function buildQuickCompareLinks(
  countryCode: string,
  language: string,
): QuickCompareLink[] {
  const currentCountry = COUNTRIES.find((item) => item.code === countryCode);
  if (!currentCountry || currentCountry.isAggregate) return [];

  const fallbackCodes = COUNTRIES
    .filter((item) => item.region === currentCountry.region && item.code !== countryCode && !item.isAggregate)
    .slice(0, 3)
    .map((item) => item.code);

  const candidateCodes = (QUICK_COMPARE_MAP[countryCode] ?? fallbackCodes)
    .filter((code, index, list) => code !== countryCode && list.indexOf(code) === index)
    .slice(0, 3);

  return candidateCodes
    .map((code) => COUNTRIES.find((item) => item.code === code))
    .filter((item): item is (typeof COUNTRIES)[number] => Boolean(item))
    .map((item) => ({
      code: item.code,
      name: getLocalizedCountryName(item.code, language, item.name),
      flag: item.flag,
      url: `/compare/${countryCode}/${item.code}`,
    }));
}

const ChartWorkspace = lazy(() =>
  import('../components/features/ChartWorkspace').then(m => ({ default: m.ChartWorkspace }))
);

function LoadingFallback({ text }: { text: string }) {
  return (
    <div className={styles.loadingFallback}>
      <div className={styles.loadingSpinner} />
      <p>{text}</p>
    </div>
  );
}

function DataUnavailable({ flag, name, message, backLabel }: { flag: string; name: string; message: string; backLabel: string }) {
  return (
    <div className={styles.loadingFallback}>
      <p style={{ fontSize: '2.5rem', margin: 0 }}>{flag}</p>
      <p style={{ fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>{name}</p>
      <p>{message}</p>
      <Link to="/countries" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
        {backLabel}
      </Link>
    </div>
  );
}

interface CountryPageProps {
  initialData: ReturnType<typeof usePopulationData>['data'];
  timeSeriesData: ReturnType<typeof usePopulationData>['timeSeriesData'];
  detectedFormat: ReturnType<typeof usePopulationData>['detectedFormat'];
  initialSelectedYear: ReturnType<typeof usePopulationData>['selectedYear'];
  isLoading: boolean;
  error: string | null | undefined;
  theme: Theme;
  loadPreloaded: (code: string) => Promise<void>;
  onClearData: () => void;
}

export function CountryPage({
  initialData, timeSeriesData, detectedFormat, initialSelectedYear,
  isLoading, error, theme, loadPreloaded, onClearData,
}: CountryPageProps) {
  const { code } = useParams<{ code: string }>();
  const { t, language } = useI18n();
  const upperCode = code?.toUpperCase() ?? '';
  const country = COUNTRIES.find(c => c.code === upperCode);
  const isAggregateProfile = country?.isAggregate === true;
  const supportsPyramid = !isAggregateProfile || upperCode === 'EU';
  const [demographyProfile, setDemographyProfile] = useState<CountryDemographyProfileData | null>(null);
  const [euBenchmarkProfile, setEuBenchmarkProfile] = useState<CountryDemographyProfileData | null>(null);
  const [isDemographyLoaded, setIsDemographyLoaded] = useState(false);

  const localizedName = useMemo(
    () => country ? getLocalizedCountryName(country.code, language, country.name) : '',
    [country, language],
  );
  const quickCompareLinks = useMemo(
    () => (country ? buildQuickCompareLinks(country.code, language) : []),
    [country, language],
  );

  // Keep track of the country currently being requested to avoid duplicate fetches.
  const pendingCountryCode = useRef<string | null>(null);

  useEffect(() => {
    if (!country || isLoading || !supportsPyramid) return;

    const loadedCode = timeSeriesData?.geoCode?.toUpperCase() ?? null;
    if (loadedCode === upperCode) {
      pendingCountryCode.current = null;
      return;
    }

    if (pendingCountryCode.current === upperCode) return;

    pendingCountryCode.current = upperCode;
    Promise.resolve(loadPreloaded(upperCode)).finally(() => {
      if (pendingCountryCode.current === upperCode) {
        pendingCountryCode.current = null;
      }
    });
  }, [country, upperCode, loadPreloaded, supportsPyramid, isLoading, timeSeriesData?.geoCode]);

  useEffect(() => {
    let isCancelled = false;
    setDemographyProfile(null);
    setIsDemographyLoaded(false);

    if (!country) return;

    fetchCountryDemographyProfile(upperCode)
      .then((profile) => {
        if (!isCancelled) {
          setDemographyProfile(profile);
          setIsDemographyLoaded(true);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setDemographyProfile(null);
          setIsDemographyLoaded(true);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [country, upperCode]);

  useEffect(() => {
    let isCancelled = false;

    if (upperCode === 'EU') {
      setEuBenchmarkProfile(null);
      return () => {
        isCancelled = true;
      };
    }

    fetchCountryDemographyProfile('EU27_2020')
      .then((profile) => {
        if (!isCancelled) {
          setEuBenchmarkProfile(profile);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setEuBenchmarkProfile(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  if (!country) {
    return <Navigate to="/countries" replace />;
  }

  const loadingText = `${country.flag} ${t.countryBrowser.loadingCountry.replace('{country}', localizedName)}`;

  if (isAggregateProfile && !isDemographyLoaded) {
    return <LoadingFallback text={loadingText} />;
  }

  if (isAggregateProfile && !demographyProfile) {
    return (
      <DataUnavailable
        flag={country.flag}
        name={localizedName}
        message={t.countryBrowser.dataUnavailable}
        backLabel={t.countryBrowser.backToCatalog}
      />
    );
  }

  // Show error state when loading failed (data unavailable)
  if (!initialData && !isLoading && error) {
    return (
      <DataUnavailable
        flag={country.flag}
        name={localizedName}
        message={t.countryBrowser.dataUnavailable}
        backLabel={t.countryBrowser.backToCatalog}
      />
    );
  }

  if (supportsPyramid && !initialData) {
    return <LoadingFallback text={loadingText} />;
  }

  return (
    <>
      <CountryPageHero
        flag={country.flag}
        name={localizedName}
        compareLabel={isAggregateProfile ? undefined : t.countryBrowser.compare}
        compareUrl={isAggregateProfile ? undefined : `/compare/${upperCode}`}
        quickCompareLinks={quickCompareLinks}
        profile={demographyProfile}
        benchmarkProfile={euBenchmarkProfile}
      />
      <CountryDemographyTrends profile={demographyProfile} benchmarkProfile={euBenchmarkProfile} />
      {supportsPyramid && initialData && (
        <Suspense fallback={<LoadingFallback text={loadingText} />}>
          <ChartWorkspace
            initialData={initialData}
            timeSeriesData={timeSeriesData}
            detectedFormat={detectedFormat}
            initialSelectedYear={initialSelectedYear}
            theme={theme}
            onClearData={onClearData}
            profileMode
          />
        </Suspense>
      )}
    </>
  );
}
