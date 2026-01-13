import { useState, useCallback, useMemo } from 'react';
import { usePopulationData, useTheme, useLanguage } from './hooks';
// i18n context will be used when components are translated
// import { I18nContext } from './i18n';
import { FileUpload } from './components/common/FileUpload';
import { ThemeToggle } from './components/common/ThemeToggle';
import { LanguageSelector } from './components/common/LanguageSelector';
import { ViewModeToggle } from './components/common/ViewModeToggle';
import { ScaleConfigurator, calculateScale } from './components/common/ScaleConfigurator';
import type { ScaleConfig } from './components/common/ScaleConfigurator';
import { YAxisLabelConfig, getYAxisInterval } from './components/common/YAxisLabelConfig';
import { ChartTitleInput } from './components/common/ChartTitleInput';
import { ToggleSetting } from './components/common/ToggleSetting';
import { XAxisSplitConfig } from './components/common/XAxisSplitConfig';
import { PopulationPyramid } from './components/features/PopulationPyramid';
import { AgeGroupConfigurator } from './components/features/AgeGroupConfigurator';
import { 
  ChartSettingsPanel, 
  SettingsSection, 
  SettingsButton 
} from './components/features/ChartSettingsPanel';
import { aggregateByAgeGroups } from './services/dataAggregator';
import type { AgeRangeConfig, ChartInstance, ChartSettings } from './types';
import styles from './App.module.css';

// ID для оригинального графика
const ORIGINAL_CHART_ID = 'original';

// Настройки по умолчанию
const DEFAULT_SETTINGS: ChartSettings = {
  customTitle: '',
  viewMode: 'split',
  scaleMode: 'auto',
  yAxisLabelMode: 'all',
  showTotal: false,
  xAxisSplitCount: 5,
  showBarLabels: false,
};

function App() {
  const { data, isLoading, error, loadFile, clearData } = usePopulationData();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  
  // Список дополнительных (агрегированных) графиков
  const [additionalCharts, setAdditionalCharts] = useState<ChartInstance[]>([]);
  
  // Настройки для каждого графика (ключ — ID графика)
  const [chartSettings, setChartSettings] = useState<Record<string, ChartSettings>>({
    [ORIGINAL_CHART_ID]: { ...DEFAULT_SETTINGS },
  });
  
  // ID графика, для которого открыты настройки (null если закрыто)
  const [settingsOpenFor, setSettingsOpenFor] = useState<string | null>(null);

  // Получение настроек графика (с дефолтными значениями)
  const getSettings = useCallback((chartId: string): ChartSettings => {
    return chartSettings[chartId] ?? { ...DEFAULT_SETTINGS };
  }, [chartSettings]);

  // Обновление настроек конкретного графика
  const updateSettings = useCallback((chartId: string, updates: Partial<ChartSettings>) => {
    setChartSettings((prev) => ({
      ...prev,
      [chartId]: {
        ...(prev[chartId] ?? DEFAULT_SETTINGS),
        ...updates,
      },
    }));
  }, []);

  // Вычисляем реальный максимум из данных для графика
  const getDataMaxValue = useCallback((chartData: { ageGroups: { male: number; female: number }[] }) => {
    let max = 0;
    for (const group of chartData.ageGroups) {
      max = Math.max(max, group.male, group.female);
    }
    return max;
  }, []);

  // Создание нового агрегированного графика
  const handleCreateGroupedChart = useCallback((groups: AgeRangeConfig[]) => {
    if (!data) return;

    const aggregatedData = aggregateByAgeGroups(data, groups);
    const newChartId = crypto.randomUUID();
    const newChart: ChartInstance = {
      id: newChartId,
      data: aggregatedData,
      isOriginal: false,
      groupConfig: groups,
    };

    setAdditionalCharts((prev) => [...prev, newChart]);
    // Добавляем настройки по умолчанию для нового графика
    setChartSettings((prev) => ({
      ...prev,
      [newChartId]: { ...DEFAULT_SETTINGS },
    }));
  }, [data]);

  // Удаление агрегированного графика
  const handleRemoveChart = useCallback((chartId: string) => {
    setAdditionalCharts((prev) => prev.filter((c) => c.id !== chartId));
    // Удаляем настройки графика
    setChartSettings((prev) => {
      const { [chartId]: _, ...rest } = prev;
      return rest;
    });
    // Закрываем панель настроек если она была открыта для этого графика
    if (settingsOpenFor === chartId) {
      setSettingsOpenFor(null);
    }
  }, [settingsOpenFor]);

  // Сброс всех данных
  const handleClearAll = useCallback(() => {
    clearData();
    setAdditionalCharts([]);
    setChartSettings({ [ORIGINAL_CHART_ID]: { ...DEFAULT_SETTINGS } });
    setSettingsOpenFor(null);
  }, [clearData]);

  // Вычисляем максимальный возраст для конфигуратора
  const maxAge = data 
    ? Math.max(...data.ageGroups.map((g) => g.ageNumeric))
    : 100;

  // Данные и настройки для открытой панели
  const settingsChartData = useMemo(() => {
    if (!settingsOpenFor || !data) return null;
    
    if (settingsOpenFor === ORIGINAL_CHART_ID) {
      return data;
    }
    
    const chart = additionalCharts.find((c) => c.id === settingsOpenFor);
    return chart?.data ?? null;
  }, [settingsOpenFor, data, additionalCharts]);

  const currentSettings = settingsOpenFor ? getSettings(settingsOpenFor) : null;

  // Хелпер для конвертации настроек в ScaleConfig
  const toScaleConfig = (settings: ChartSettings): ScaleConfig => ({
    mode: settings.scaleMode,
    customValue: settings.scaleCustomValue,
  });

  return (
    <div className={styles.app}>
      {/* Фоновый паттерн */}
      <div className={styles.backgroundPattern} aria-hidden="true" />
      
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>Population Pyramid</h1>
            <p className={styles.subtitle}>
              Population age-sex structure visualization
            </p>
          </div>
          
          <div className={styles.headerActions}>
            <LanguageSelector currentLanguage={language} onChange={setLanguage} />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
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
                Load another file
              </button>
              
              <div className={styles.dataInfo}>
                <span className={styles.dataInfoLabel}>Loaded:</span>
                <span className={styles.dataInfoValue}>
                  {data.ageGroups.length} age groups
                </span>
                {additionalCharts.length > 0 && (
                  <span className={styles.chartsCount}>
                    +{additionalCharts.length} chart{additionalCharts.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>

            {/* Конфигуратор групп */}
            <AgeGroupConfigurator
              onCreateChart={handleCreateGroupedChart}
              maxAge={maxAge}
            />

            {/* Оригинальный график */}
            {(() => {
              const settings = getSettings(ORIGINAL_CHART_ID);
              const dataMaxValue = getDataMaxValue(data);
              const effectiveScale = calculateScale(toScaleConfig(settings), dataMaxValue);
              const yAxisInterval = getYAxisInterval(settings.yAxisLabelMode);
              
              return (
                <div className={styles.chartWrapper}>
                  <div className={styles.chartHeader}>
                    <h2 className={styles.chartTitle}>Original data</h2>
                    <SettingsButton onClick={() => setSettingsOpenFor(ORIGINAL_CHART_ID)} />
                  </div>
                  <PopulationPyramid 
                    data={data} 
                    theme={theme} 
                    viewMode={settings.viewMode}
                    maxScale={effectiveScale}
                    yAxisInterval={yAxisInterval}
                    customTitle={settings.customTitle}
                    showTotal={settings.showTotal}
                    xAxisSplitCount={settings.xAxisSplitCount}
                    showBarLabels={settings.showBarLabels}
                  />
      </div>
              );
            })()}

            {/* Агрегированные графики */}
            {additionalCharts.map((chart) => {
              const settings = getSettings(chart.id);
              const dataMaxValue = getDataMaxValue(chart.data);
              const effectiveScale = calculateScale(toScaleConfig(settings), dataMaxValue);
              const yAxisInterval = getYAxisInterval(settings.yAxisLabelMode);
              
              return (
                <div key={chart.id} className={styles.chartWrapper}>
                  <div className={styles.chartHeader}>
                    <h2 className={styles.chartTitle}>
                      Grouping: {chart.groupConfig?.map((g) => g.label).join(', ')}
                    </h2>
                    <div className={styles.chartActions}>
                      <SettingsButton onClick={() => setSettingsOpenFor(chart.id)} />
                      <button
                        className={styles.removeChartButton}
                        onClick={() => handleRemoveChart(chart.id)}
                        type="button"
                        aria-label="Remove chart"
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
                  </div>
                  <PopulationPyramid 
                    data={chart.data} 
                    theme={theme} 
                    viewMode={settings.viewMode}
                    maxScale={effectiveScale}
                    yAxisInterval={yAxisInterval}
                    customTitle={settings.customTitle}
                    showTotal={settings.showTotal}
                    xAxisSplitCount={settings.xAxisSplitCount}
                    showBarLabels={settings.showBarLabels}
                  />
                </div>
              );
            })}
            
            {/* Панель настроек */}
            {settingsOpenFor && settingsChartData && currentSettings && (
              <ChartSettingsPanel
                isOpen={true}
                onClose={() => setSettingsOpenFor(null)}
              >
                <SettingsSection title="Chart title">
                  <ChartTitleInput
                    value={currentSettings.customTitle}
                    originalTitle={settingsChartData.title}
                    onChange={(value) => updateSettings(settingsOpenFor, { customTitle: value })}
                  />
                </SettingsSection>
                
                <SettingsSection title="Display format">
                  <ViewModeToggle 
                    mode={currentSettings.viewMode} 
                    onChange={(value) => updateSettings(settingsOpenFor, { viewMode: value })} 
                  />
                </SettingsSection>
                
                <SettingsSection title="X-axis scale">
                  <ScaleConfigurator
                    config={toScaleConfig(currentSettings)}
                    onChange={(config) => updateSettings(settingsOpenFor, { 
                      scaleMode: config.mode, 
                      scaleCustomValue: config.customValue 
                    })}
                    dataMaxValue={getDataMaxValue(settingsChartData)}
                  />
                </SettingsSection>
                
                <SettingsSection title="X-axis divisions">
                  <XAxisSplitConfig
                    value={currentSettings.xAxisSplitCount}
                    onChange={(value) => updateSettings(settingsOpenFor, { xAxisSplitCount: value })}
                  />
                </SettingsSection>
                
                <SettingsSection title="Y-axis labels (age)">
                  <YAxisLabelConfig
                    mode={currentSettings.yAxisLabelMode}
                    onChange={(value) => updateSettings(settingsOpenFor, { yAxisLabelMode: value })}
                  />
                </SettingsSection>
                
                <SettingsSection title="Additional">
                  <ToggleSetting
                    label="Show Total"
                    description="Total population across all age groups"
                    checked={currentSettings.showTotal}
                    onChange={(value) => updateSettings(settingsOpenFor, { showTotal: value })}
                  />
                  <ToggleSetting
                    label="Bar labels"
                    description="Display numeric values inside bars"
                    checked={currentSettings.showBarLabels}
                    onChange={(value) => updateSettings(settingsOpenFor, { showBarLabels: value })}
                  />
                </SettingsSection>
              </ChartSettingsPanel>
            )}
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <p>
          Population Pyramid Builder • 
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
