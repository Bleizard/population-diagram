import { useCallback, lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { usePopulationData, useTheme, useLanguage, type Theme } from './hooks';
import { I18nContext } from './i18n';
import { FileUpload, ErrorBoundary } from './components/common';
import { AppHeader, AppFooter } from './components/layout';
import { CountryBrowser } from './components/features';
import { CountriesPage, ComparePage, CountryPage, DemoPage } from './pages';
import { COUNTRIES } from './data/countries';
import { getLocalizedCountryName } from './utils/localizedCountryName';
import styles from './App.module.css';

// Lazy load тяжёлого компонента с графиками (включает ECharts)
const ChartWorkspace = lazy(() =>
  import('./components/features/ChartWorkspace').then(m => ({ default: m.ChartWorkspace }))
);

// Компонент загрузки
function ChartLoadingFallback() {
  return (
    <div className={styles.loadingFallback}>
      <div className={styles.loadingSpinner} />
      <p>Loading charts...</p>
    </div>
  );
}

function HomePage({
  initialData, timeSeriesData, detectedFormat, initialSelectedYear,
  isLoading, error, theme, loadFile, onClearData,
  processingState
}: {
  initialData: ReturnType<typeof usePopulationData>['data'];
  timeSeriesData: ReturnType<typeof usePopulationData>['timeSeriesData'];
  detectedFormat: ReturnType<typeof usePopulationData>['detectedFormat'];
  initialSelectedYear: ReturnType<typeof usePopulationData>['selectedYear'];
  isLoading: boolean;
  error: string | null | undefined;
  theme: Theme;
  loadFile: (file: File) => void;
  onClearData: () => void;
  processingState: ReturnType<typeof usePopulationData>['processingState'];
}) {
  return (
    <>
      {!initialData ? (
        <section className={styles.uploadSection}>
          <FileUpload
            onFileSelect={loadFile}
            isLoading={isLoading}
            error={error}
            processingState={processingState}
          />
          <CountryBrowser
            isLoading={isLoading}
          />
        </section>
      ) : (
        <Suspense fallback={<ChartLoadingFallback />}>
          <ChartWorkspace
            initialData={initialData}
            timeSeriesData={timeSeriesData}
            detectedFormat={detectedFormat}
            initialSelectedYear={initialSelectedYear}
            theme={theme}
            onClearData={onClearData}
          />
        </Suspense>
      )}
    </>
  );
}

function App() {
  const { theme, toggleTheme } = useTheme();
  const { language, t, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    data: initialData,
    timeSeriesData,
    detectedFormat,
    selectedYear: initialSelectedYear,
    isLoading,
    error,
    loadFile,
    loadPreloaded,
    clearData,
    processingState,
  } = usePopulationData({ t });

  // Clear data + navigate to home
  const handleClearData = useCallback(() => {
    clearData();
    navigate('/');
  }, [clearData, navigate]);

  // Загрузка демо-файла
  const loadDemo = useCallback(async () => {
    try {
      const baseUrl = import.meta.env.BASE_URL;
      const response = await fetch(`${baseUrl}examples/spain-1975-2024.csv`);
      const blob = await response.blob();
      const file = new File([blob], 'spain-1975-2024.csv', { type: 'text/csv' });
      loadFile(file);
    } catch (err) {
      console.error('Failed to load demo file:', err);
    }
  }, [loadFile]);

  // Динамическое обновление title для SEO
  useEffect(() => {
    const baseTitle = 'Population Pyramid Builder';
    if (initialData) {
      const dataTitle = initialData.title || 'Population Data';
      document.title = `${dataTitle} - ${baseTitle}`;
    } else if (location.pathname === '/countries') {
      document.title = `Browse Countries - ${baseTitle}`;
    } else if (location.pathname === '/demo') {
      document.title = `Demo: Spain Population Pyramid 1975-2024 - ${baseTitle}`;
    } else if (location.pathname.startsWith('/compare')) {
      document.title = `Compare Population Pyramids - ${baseTitle}`;
    } else if (location.pathname.startsWith('/country/')) {
      const code = location.pathname.split('/')[2]?.toUpperCase();
      const country = COUNTRIES.find(c => c.code === code);
      if (country) {
        const localName = getLocalizedCountryName(country.code, language, country.name);
        document.title = `${localName} Population Pyramid - ${baseTitle}`;
      }
    } else {
      document.title = `${baseTitle} - Visualize Age-Sex Structure from CSV/Excel`;
    }
  }, [initialData, location.pathname, language]);

  // Shared props for chart-displaying routes
  const chartProps = {
    initialData,
    timeSeriesData,
    detectedFormat,
    initialSelectedYear,
    isLoading,
    theme,
    onClearData: handleClearData,
  };

  return (
    <ErrorBoundary>
      <I18nContext.Provider value={{ language, t, setLanguage }}>
        <div className={styles.app}>
        <div className={styles.backgroundPattern} aria-hidden="true" />

        <AppHeader
          theme={theme}
          onToggleTheme={toggleTheme}
          language={language}
          onLanguageChange={setLanguage}
          onLogoClick={handleClearData}
        />

        <main className={styles.main}>
          <Routes>
            <Route path="/" element={
              <HomePage
                initialData={initialData}
                timeSeriesData={timeSeriesData}
                detectedFormat={detectedFormat}
                initialSelectedYear={initialSelectedYear}
                isLoading={isLoading}
                error={error}
                theme={theme}
                loadFile={loadFile}
                onClearData={handleClearData}
                processingState={processingState}
              />
            } />
            <Route path="/demo" element={
              <DemoPage {...chartProps} loadDemo={loadDemo} />
            } />
            <Route path="/country/:code" element={
              <CountryPage {...chartProps} error={error} loadPreloaded={loadPreloaded} />
            } />
            <Route path="/compare" element={
              <ComparePage theme={theme} />
            } />
            <Route path="/compare/:left" element={
              <ComparePage theme={theme} />
            } />
            <Route path="/compare/:left/:right" element={
              <ComparePage theme={theme} />
            } />
            <Route path="/countries" element={
              <CountriesPage isLoading={isLoading} />
            } />
          </Routes>
        </main>

        <AppFooter />
        </div>
      </I18nContext.Provider>
    </ErrorBoundary>
  );
}

export default App;
