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
  const [demographyProfile, setDemographyProfile] = useState<CountryDemographyProfileData | null>(null);
  const [euBenchmarkProfile, setEuBenchmarkProfile] = useState<CountryDemographyProfileData | null>(null);

  const localizedName = useMemo(
    () => country ? getLocalizedCountryName(country.code, language, country.name) : '',
    [country, language],
  );

  // Keep track of the country currently being requested to avoid duplicate fetches.
  const pendingCountryCode = useRef<string | null>(null);

  useEffect(() => {
    if (!country || isLoading) return;

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
  }, [country, upperCode, loadPreloaded, isLoading, timeSeriesData?.geoCode]);

  useEffect(() => {
    let isCancelled = false;
    setDemographyProfile(null);

    if (!country) return;

    fetchCountryDemographyProfile(upperCode)
      .then((profile) => {
        if (!isCancelled) {
          setDemographyProfile(profile);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setDemographyProfile(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [country, upperCode]);

  useEffect(() => {
    let isCancelled = false;

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

  if (!initialData) {
    return <LoadingFallback text={loadingText} />;
  }

  return (
    <>
      <CountryPageHero
        flag={country.flag}
        name={localizedName}
        compareLabel={t.countryBrowser.compare}
        compareUrl={`/compare/${upperCode}`}
        profile={demographyProfile}
        benchmarkProfile={euBenchmarkProfile}
      />
      <CountryDemographyTrends profile={demographyProfile} benchmarkProfile={euBenchmarkProfile} />
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
    </>
  );
}
