import { useEffect, useRef, lazy, Suspense } from 'react';
import type { usePopulationData } from '../hooks';
import type { Theme } from '../hooks';
import styles from '../App.module.css';

const ChartWorkspace = lazy(() =>
  import('../components/features/ChartWorkspace').then(m => ({ default: m.ChartWorkspace }))
);

function LoadingFallback() {
  return (
    <div className={styles.loadingFallback}>
      <div className={styles.loadingSpinner} />
      <p>Loading demo data...</p>
    </div>
  );
}

interface DemoPageProps {
  initialData: ReturnType<typeof usePopulationData>['data'];
  timeSeriesData: ReturnType<typeof usePopulationData>['timeSeriesData'];
  detectedFormat: ReturnType<typeof usePopulationData>['detectedFormat'];
  initialSelectedYear: ReturnType<typeof usePopulationData>['selectedYear'];
  isLoading: boolean;
  theme: Theme;
  loadDemo: () => void;
  onClearData: () => void;
}

export function DemoPage({
  initialData, timeSeriesData, detectedFormat, initialSelectedYear,
  isLoading, theme, loadDemo, onClearData,
}: DemoPageProps) {
  // Ref persists across re-renders (including when clearData nullifies initialData)
  // because this component stays mounted — no conditional swap in the route.
  const loadTriggered = useRef(false);

  useEffect(() => {
    if (!initialData && !loadTriggered.current && !isLoading) {
      loadTriggered.current = true;
      loadDemo();
    }
  }, [initialData, loadDemo, isLoading]);

  if (!initialData) {
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
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
