import { useEffect, useRef, lazy, Suspense } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { COUNTRIES } from '../data/countries';
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
  const upperCode = code?.toUpperCase() ?? '';
  const country = COUNTRIES.find(c => c.code === upperCode);

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

  if (!initialData) {
    return <LoadingFallback text={`${country.flag} Loading ${country.name}...`} />;
  }

  return (
    <Suspense fallback={<LoadingFallback text={`${country.flag} Loading ${country.name}...`} />}>
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
