import { useState, useCallback, useMemo } from 'react';
import { usePopulationData, useTheme } from './hooks';
import { FileUpload } from './components/common/FileUpload';
import { ThemeToggle } from './components/common/ThemeToggle';
import { ViewModeToggle } from './components/common/ViewModeToggle';
import type { ViewMode } from './components/common/ViewModeToggle';
import { ScaleConfigurator, calculateScale } from './components/common/ScaleConfigurator';
import type { ScaleConfig } from './components/common/ScaleConfigurator';
import { PopulationPyramid } from './components/features/PopulationPyramid';
import { AgeGroupConfigurator } from './components/features/AgeGroupConfigurator';
import { aggregateByAgeGroups } from './services/dataAggregator';
import type { AgeRangeConfig, ChartInstance } from './types';
import styles from './App.module.css';

function App() {
  const { data, isLoading, error, loadFile, clearData } = usePopulationData();
  const { theme, toggleTheme } = useTheme();
  
  // Режим отображения (с делением по полу или суммарно)
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  
  // Настройка масштаба оси X
  const [scaleConfig, setScaleConfig] = useState<ScaleConfig>({ mode: 'auto' });
  
  // Список дополнительных (агрегированных) графиков
  const [additionalCharts, setAdditionalCharts] = useState<ChartInstance[]>([]);

  // Вычисляем реальный максимум из данных
  const dataMaxValue = useMemo(() => {
    if (!data) return 0;
    let max = 0;
    for (const group of data.ageGroups) {
      max = Math.max(max, group.male, group.female);
    }
    return max;
  }, [data]);

  // Вычисляем эффективный масштаб
  const effectiveScale = useMemo(() => {
    return calculateScale(scaleConfig, dataMaxValue);
  }, [scaleConfig, dataMaxValue]);

  // Создание нового агрегированного графика
  const handleCreateGroupedChart = useCallback((groups: AgeRangeConfig[]) => {
    if (!data) return;

    const aggregatedData = aggregateByAgeGroups(data, groups);
    const newChart: ChartInstance = {
      id: crypto.randomUUID(),
      data: aggregatedData,
      isOriginal: false,
      groupConfig: groups,
    };

    setAdditionalCharts((prev) => [...prev, newChart]);
  }, [data]);

  // Удаление агрегированного графика
  const handleRemoveChart = useCallback((chartId: string) => {
    setAdditionalCharts((prev) => prev.filter((c) => c.id !== chartId));
  }, []);

  // Сброс всех данных
  const handleClearAll = useCallback(() => {
    clearData();
    setAdditionalCharts([]);
    setViewMode('split');
    setScaleConfig({ mode: 'auto' });
  }, [clearData]);

  // Вычисляем максимальный возраст для конфигуратора
  const maxAge = data 
    ? Math.max(...data.ageGroups.map((g) => g.ageNumeric))
    : 100;

  return (
    <div className={styles.app}>
      {/* Фоновый паттерн */}
      <div className={styles.backgroundPattern} aria-hidden="true" />
      
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>Population Pyramid</h1>
            <p className={styles.subtitle}>
              Визуализация половозрастной структуры населения
            </p>
          </div>
          
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <main className={styles.main}>
        {!data ? (
          <section className={styles.uploadSection}>
            <FileUpload
              onFileSelect={loadFile}
              isLoading={isLoading}
              error={error}
            />
          </section>
        ) : (
          <section className={styles.chartSection}>
            <div className={styles.toolbar}>
              <button
                className={styles.backButton}
                onClick={handleClearAll}
                type="button"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Загрузить другой файл
              </button>
              
              <ViewModeToggle mode={viewMode} onChange={setViewMode} />
              
              <div className={styles.dataInfo}>
                <span className={styles.dataInfoLabel}>Загружено:</span>
                <span className={styles.dataInfoValue}>
                  {data.ageGroups.length} возрастных групп
                </span>
                {additionalCharts.length > 0 && (
                  <span className={styles.chartsCount}>
                    +{additionalCharts.length} график{additionalCharts.length === 1 ? '' : additionalCharts.length < 5 ? 'а' : 'ов'}
                  </span>
                )}
              </div>
            </div>

            {/* Настройки отображения */}
            <div className={styles.settingsRow}>
              <ScaleConfigurator
                config={scaleConfig}
                onChange={setScaleConfig}
                dataMaxValue={dataMaxValue}
              />
            </div>

            {/* Конфигуратор групп */}
            <AgeGroupConfigurator
              onCreateChart={handleCreateGroupedChart}
              maxAge={maxAge}
            />

            {/* Оригинальный график */}
            <div className={styles.chartWrapper}>
              <div className={styles.chartHeader}>
                <h2 className={styles.chartTitle}>Исходные данные</h2>
              </div>
              <PopulationPyramid 
                data={data} 
                theme={theme} 
                viewMode={viewMode}
                maxScale={effectiveScale}
              />
            </div>

            {/* Агрегированные графики */}
            {additionalCharts.map((chart) => (
              <div key={chart.id} className={styles.chartWrapper}>
                <div className={styles.chartHeader}>
                  <h2 className={styles.chartTitle}>
                    Группировка: {chart.groupConfig?.map((g) => g.label).join(', ')}
                  </h2>
                  <button
                    className={styles.removeChartButton}
                    onClick={() => handleRemoveChart(chart.id)}
                    type="button"
                    aria-label="Удалить график"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <PopulationPyramid 
                  data={chart.data} 
                  theme={theme} 
                  viewMode={viewMode}
                  maxScale={effectiveScale}
                />
              </div>
            ))}
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <p>
          Построение половозрастных пирамид • 
          <a 
            href="https://github.com/bleizard" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            Aleksandr Iarkeev
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
