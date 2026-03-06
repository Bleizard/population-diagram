import { useEffect, useRef, lazy, Suspense, useMemo } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { COUNTRIES } from '../data/countries';
import { getLocalizedCountryName } from '../utils/localizedCountryName';
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
  loadPreloaded: (code: string) => void;
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

  const localizedName = useMemo(
    () => country ? getLocalizedCountryName(country.code, language, country.name) : '',
    [country, language],
  );

  // Ref persists across re-renders — prevents re-triggering after clearData
  const loadTriggered = useRef(false);

  useEffect(() => {
    if (country && !initialData && !loadTriggered.current && !isLoading) {
      loadTriggered.current = true;
      loadPreloaded(upperCode);
    }
  }, [country, upperCode, initialData, loadPreloaded, isLoading]);

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
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 16px', marginBottom: 8 }}>
        <Link
          to={`/compare/${upperCode}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            fontFamily: "'DM Sans', -apple-system, sans-serif",
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            textDecoration: 'none',
          }}
        >
          {t.countryBrowser.compare}
        </Link>
      </div>
      <Suspense fallback={<LoadingFallback text={loadingText} />}>
        <ChartWorkspace
          initialData={initialData}
          timeSeriesData={timeSeriesData}
          detectedFormat={detectedFormat}
          initialSelectedYear={initialSelectedYear}
          theme={theme}
          onClearData={onClearData}
        />
      </Suspense>
    </>
  );
}
