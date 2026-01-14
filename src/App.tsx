import { useCallback, lazy, Suspense, useEffect } from 'react';
import { usePopulationData, useTheme, useLanguage } from './hooks';
import { I18nContext } from './i18n';
import { FileUpload } from './components/common';
import { AppHeader, AppFooter } from './components/layout';
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

function App() {
  const { theme, toggleTheme } = useTheme();
  const { language, t, setLanguage } = useLanguage();
  
  const { 
    data: initialData, 
    timeSeriesData, 
    detectedFormat,
    selectedYear: initialSelectedYear,
    isLoading, 
    error, 
    loadFile, 
    clearData,
    processingState,
  } = usePopulationData({ t });

  // Загрузка демо-файла
  const loadDemo = useCallback(async () => {
    try {
      const response = await fetch('/examples/spain-1975-2024.csv');
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
    } else {
      document.title = `${baseTitle} - Visualize Age-Sex Structure from CSV/Excel`;
    }
  }, [initialData]);

  return (
    <I18nContext.Provider value={{ language, t, setLanguage }}>
      <div className={styles.app}>
        <div className={styles.backgroundPattern} aria-hidden="true" />
        
        <AppHeader
          theme={theme}
          onToggleTheme={toggleTheme}
          language={language}
          onLanguageChange={setLanguage}
        />

        <main className={styles.main}>
          {!initialData ? (
            <section className={styles.uploadSection}>
              <FileUpload
                onFileSelect={loadFile}
                onLoadDemo={loadDemo}
                isLoading={isLoading}
                error={error}
                processingState={processingState}
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
                onClearData={clearData}
              />
            </Suspense>
          )}
        </main>

        <AppFooter />
      </div>
    </I18nContext.Provider>
  );
}

export default App;
