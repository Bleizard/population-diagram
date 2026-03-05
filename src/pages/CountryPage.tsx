import { useEffect, useRef, lazy, Suspense, useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
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

interface CountryPageProps {
  initialData: ReturnType<typeof usePopulationData>['data'];
  timeSeriesData: ReturnType<typeof usePopulationData>['timeSeriesData'];
  detectedFormat: ReturnType<typeof usePopulationData>['detectedFormat'];
  initialSelectedYear: ReturnType<typeof usePopulationData>['selectedYear'];
  isLoading: boolean;
  theme: Theme;
  loadPreloaded: (code: string) => void;
  onClearData: () => void;
}

export function CountryPage({
  initialData, timeSeriesData, detectedFormat, initialSelectedYear,
  isLoading, theme, loadPreloaded, onClearData,
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

  if (!initialData) {
    return <LoadingFallback text={loadingText} />;
  }

  return (
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
  );
}
