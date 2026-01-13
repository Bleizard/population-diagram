import { useState, useCallback, useMemo, useRef } from 'react';
import { usePopulationData, useTheme, useLanguage } from './hooks';
import { I18nContext } from './i18n';
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
import { YearSelector } from './components/common/YearSelector';
import { ColorProfileSelector } from './components/common/ColorProfileSelector';
import { PopulationPyramid } from './components/features/PopulationPyramid';
import type { PopulationPyramidRef } from './components/features/PopulationPyramid';
import { AgeGroupConfigurator } from './components/features/AgeGroupConfigurator';
import { 
  ChartSettingsPanel, 
  SettingsSection, 
  SettingsButton,
  ChartActionsMenu 
} from './components/features/ChartSettingsPanel';
import { aggregateByAgeGroups } from './services/dataAggregator';
import type { AgeRangeConfig, ChartInstance, ChartSettings, PopulationData } from './types';
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
  colorProfile: 'pale',
  showMedianLine: false,
  showAsPercentage: false,
};

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
  
  // Список дополнительных (агрегированных) графиков
  const [additionalCharts, setAdditionalCharts] = useState<ChartInstance[]>([]);
  
  // Настройки для каждого графика (ключ — ID графика)
  const [chartSettings, setChartSettings] = useState<Record<string, ChartSettings>>({
    [ORIGINAL_CHART_ID]: { ...DEFAULT_SETTINGS },
  });
  
  // ID графика, для которого открыты настройки (null если закрыто)
  const [settingsOpenFor, setSettingsOpenFor] = useState<string | null>(null);
  
  // ID графика в полноэкранном режиме (null если не в полноэкранном)
  const [fullscreenChartId, setFullscreenChartId] = useState<string | null>(null);
  
  // Refs для доступа к методам графиков
  const chartRefs = useRef<Record<string, PopulationPyramidRef | null>>({});

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
  
  // Получение данных для графика с учётом выбранного года
  const getChartData = useCallback((chartId: string, baseData: PopulationData | null): PopulationData | null => {
    if (!baseData) return null;
    
    // Если нет time-series данных, возвращаем базовые данные
    if (!timeSeriesData) return baseData;
    
    const settings = chartSettings[chartId];
    const year = settings?.selectedYear;
    
    // Если год не выбран, возвращаем базовые данные
    if (!year) return baseData;
    
    const yearData = timeSeriesData.dataByYear[year];
    if (!yearData) return baseData;
    
    return {
      title: timeSeriesData.title,
      date: String(year),
      source: timeSeriesData.source,
      ageGroups: yearData,
    };
  }, [timeSeriesData, chartSettings]);
  
  // Обработчик изменения года для конкретного графика
  const handleYearChange = useCallback((chartId: string, year: number) => {
    updateSettings(chartId, { selectedYear: year });
  }, [updateSettings]);
  
  // Получение данных для агрегированного графика с учётом выбранного года
  const getAggregatedChartData = useCallback((chart: ChartInstance): PopulationData => {
    // Если нет time-series данных, возвращаем сохранённые данные
    if (!timeSeriesData || !chart.groupConfig) return chart.data;
    
    const settings = chartSettings[chart.id];
    const year = settings?.selectedYear;
    
    // Если год не выбран, возвращаем сохранённые данные
    if (!year) return chart.data;
    
    const yearData = timeSeriesData.dataByYear[year];
    if (!yearData) return chart.data;
    
    // Пересчитываем агрегацию для выбранного года
    const baseData: PopulationData = {
      title: timeSeriesData.title,
      date: String(year),
      source: timeSeriesData.source,
      ageGroups: yearData,
    };
    
    return aggregateByAgeGroups(baseData, chart.groupConfig);
  }, [timeSeriesData, chartSettings]);

  // Создание нового агрегированного графика
  const handleCreateGroupedChart = useCallback((groups: AgeRangeConfig[]) => {
    const currentData = getChartData(ORIGINAL_CHART_ID, initialData);
    if (!currentData) return;

    const aggregatedData = aggregateByAgeGroups(currentData, groups);
    const newChartId = crypto.randomUUID();
    const newChart: ChartInstance = {
      id: newChartId,
      data: aggregatedData,
      isOriginal: false,
      groupConfig: groups,
    };
    
    // Копируем текущий год из оригинального графика
    const originalSettings = chartSettings[ORIGINAL_CHART_ID];
    const currentYear = originalSettings?.selectedYear ?? initialSelectedYear;

    setAdditionalCharts((prev) => [...prev, newChart]);
    // Добавляем настройки по умолчанию для нового графика с тем же годом
    setChartSettings((prev) => ({
      ...prev,
      [newChartId]: { ...DEFAULT_SETTINGS, selectedYear: currentYear ?? undefined },
    }));
  }, [initialData, getChartData, chartSettings, initialSelectedYear]);

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
  
  // Экспорт графика в SVG
  const handleExportSvg = useCallback((chartId: string) => {
    const chartRef = chartRefs.current[chartId];
    if (chartRef) {
      // Формируем имя файла из названия данных и года
      const settings = chartSettings[chartId];
      const year = settings?.selectedYear;
      const baseName = initialData?.title?.replace(/[^a-zA-Z0-9]/g, '-') || 'population-pyramid';
      const filename = year 
        ? `${baseName}-${year}.svg`
        : `${baseName}.svg`;
      
      chartRef.exportToSvg(filename);
    }
  }, [chartSettings, initialData?.title]);
  
  // Открытие полноэкранного режима
  const handleFullscreen = useCallback((chartId: string) => {
    setFullscreenChartId(chartId);
    // Блокируем прокрутку body
    document.body.style.overflow = 'hidden';
  }, []);
  
  // Закрытие полноэкранного режима
  const handleCloseFullscreen = useCallback(() => {
    setFullscreenChartId(null);
    document.body.style.overflow = '';
  }, []);
  
  // Получение canvas для экспорта GIF
  const createGetChartCanvas = useCallback((chartId: string) => {
    return async (_year: number): Promise<HTMLCanvasElement> => {
      const chartRef = chartRefs.current[chartId];
      if (!chartRef) {
        throw new Error('Chart ref not available');
      }
      // Даём время на обновление графика
      await new Promise(resolve => setTimeout(resolve, 50));
      return chartRef.getCanvas();
    };
  }, []);

  // Вычисляем максимальный возраст для конфигуратора
  const currentOriginalData = getChartData(ORIGINAL_CHART_ID, initialData);
  const maxAge = currentOriginalData 
    ? Math.max(...currentOriginalData.ageGroups.map((g) => g.ageNumeric))
    : 100;

  // Данные и настройки для открытой панели
  const settingsChartData = useMemo(() => {
    if (!settingsOpenFor || !initialData) return null;
    
    if (settingsOpenFor === ORIGINAL_CHART_ID) {
      return getChartData(ORIGINAL_CHART_ID, initialData);
    }
    
    const chart = additionalCharts.find((c) => c.id === settingsOpenFor);
    if (!chart) return null;
    return getAggregatedChartData(chart);
  }, [settingsOpenFor, initialData, additionalCharts, getChartData, getAggregatedChartData]);

  const currentSettings = settingsOpenFor ? getSettings(settingsOpenFor) : null;

  // Хелпер для конвертации настроек в ScaleConfig
  const toScaleConfig = (settings: ChartSettings): ScaleConfig => ({
    mode: settings.scaleMode,
    customValue: settings.scaleCustomValue,
  });

  return (
    <I18nContext.Provider value={{ language, t, setLanguage }}>
    <div className={styles.app}>
      {/* Фоновый паттерн */}
      <div className={styles.backgroundPattern} aria-hidden="true" />
      
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>{t.app.title}</h1>
            <p className={styles.subtitle}>
              {t.app.subtitle}
            </p>
          </div>
          
          <div className={styles.headerActions}>
            <LanguageSelector currentLanguage={language} onChange={setLanguage} />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {!initialData ? (
          <section className={styles.uploadSection}>
            <FileUpload
              onFileSelect={loadFile}
              isLoading={isLoading}
              error={error}
              processingState={processingState}
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
                {t.toolbar.loadAnother}
              </button>
              
              <div className={styles.dataInfo}>
                <span className={styles.dataInfoLabel}>{t.toolbar.loaded}</span>
                <span className={styles.dataInfoValue}>
                  {initialData.ageGroups.length} {t.toolbar.ageGroups}
                </span>
                {detectedFormat && detectedFormat !== 'simple' && detectedFormat !== 'unknown' && (
                  <span className={styles.formatBadge}>
                    {(t.dataFormats as Record<string, { name: string }>)[detectedFormat]?.name || detectedFormat}
                  </span>
                )}
                {additionalCharts.length > 0 && (
                  <span className={styles.chartsCount}>
                    +{additionalCharts.length} {additionalCharts.length === 1 ? t.toolbar.chart : t.toolbar.charts}
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
              const chartData = getChartData(ORIGINAL_CHART_ID, initialData);
              if (!chartData) return null;
              
              const dataMaxValue = getDataMaxValue(chartData);
              const effectiveScale = calculateScale(toScaleConfig(settings), dataMaxValue);
              const yAxisInterval = getYAxisInterval(settings.yAxisLabelMode);
              const currentYear = settings.selectedYear ?? initialSelectedYear;
              
              return (
                <div className={styles.chartWrapper}>
                  <div className={styles.chartHeader}>
                    <h2 className={styles.chartTitle}>{t.chart.originalData}</h2>
                    <div className={styles.chartActions}>
                      <ChartActionsMenu
                        onExportSvg={() => handleExportSvg(ORIGINAL_CHART_ID)}
                        onFullscreen={() => handleFullscreen(ORIGINAL_CHART_ID)}
                      />
                      <SettingsButton onClick={() => setSettingsOpenFor(ORIGINAL_CHART_ID)} />
                    </div>
                  </div>
                  <PopulationPyramid
                    ref={(el) => { chartRefs.current[ORIGINAL_CHART_ID] = el; }}
                    data={chartData} 
                    theme={theme} 
                    viewMode={settings.viewMode}
                    maxScale={effectiveScale}
                    yAxisInterval={yAxisInterval}
                    customTitle={settings.customTitle}
                    showTotal={settings.showTotal}
                    xAxisSplitCount={settings.xAxisSplitCount}
                    showBarLabels={settings.showBarLabels}
                    colorProfile={settings.colorProfile}
                    showMedianLine={settings.showMedianLine}
                    showAsPercentage={settings.showAsPercentage}
                  />
                  {timeSeriesData && currentYear && (
                    <YearSelector
                      years={timeSeriesData.years}
                      selectedYear={currentYear}
                      onYearChange={(year) => handleYearChange(ORIGINAL_CHART_ID, year)}
                      compact
                      chartTitle={settings.customTitle || initialData?.title}
                      getChartCanvas={createGetChartCanvas(ORIGINAL_CHART_ID)}
                    />
                  )}
                </div>
              );
            })()}

            {/* Агрегированные графики */}
            {additionalCharts.map((chart) => {
              const settings = getSettings(chart.id);
              const chartData = getAggregatedChartData(chart);
              const dataMaxValue = getDataMaxValue(chartData);
              const effectiveScale = calculateScale(toScaleConfig(settings), dataMaxValue);
              const yAxisInterval = getYAxisInterval(settings.yAxisLabelMode);
              const currentYear = settings.selectedYear ?? initialSelectedYear;
              
              return (
                <div key={chart.id} className={styles.chartWrapper}>
                  <div className={styles.chartHeader}>
                    <h2 className={styles.chartTitle}>
                      {t.chart.grouping} {chart.groupConfig?.map((g) => g.label).join(', ')}
                    </h2>
                    <div className={styles.chartActions}>
                      <ChartActionsMenu
                        onExportSvg={() => handleExportSvg(chart.id)}
                        onFullscreen={() => handleFullscreen(chart.id)}
                      />
                      <SettingsButton onClick={() => setSettingsOpenFor(chart.id)} />
                      <button
                        className={styles.removeChartButton}
                        onClick={() => handleRemoveChart(chart.id)}
                        type="button"
                        aria-label={t.common.remove}
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
                    ref={(el) => { chartRefs.current[chart.id] = el; }}
                    data={chartData} 
                    theme={theme} 
                    viewMode={settings.viewMode}
                    maxScale={effectiveScale}
                    yAxisInterval={yAxisInterval}
                    customTitle={settings.customTitle}
                    showTotal={settings.showTotal}
                    xAxisSplitCount={settings.xAxisSplitCount}
                    showBarLabels={settings.showBarLabels}
                    colorProfile={settings.colorProfile}
                    showMedianLine={settings.showMedianLine}
                    showAsPercentage={settings.showAsPercentage}
                  />
                  {timeSeriesData && currentYear && (
                    <YearSelector
                      years={timeSeriesData.years}
                      selectedYear={currentYear}
                      onYearChange={(year) => handleYearChange(chart.id, year)}
                      compact
                      chartTitle={settings.customTitle || chart.data.title || chart.id}
                      getChartCanvas={createGetChartCanvas(chart.id)}
                    />
                  )}
                </div>
              );
            })}
            
            {/* Панель настроек */}
            {settingsOpenFor && settingsChartData && currentSettings && (
              <ChartSettingsPanel
                isOpen={true}
                onClose={() => setSettingsOpenFor(null)}
              >
                <SettingsSection title={t.settings.chartTitle}>
                  <ChartTitleInput
                    value={currentSettings.customTitle}
                    originalTitle={settingsChartData.title}
                    onChange={(value) => updateSettings(settingsOpenFor, { customTitle: value })}
                  />
                </SettingsSection>
                
                <SettingsSection title={t.settings.displayFormat}>
                  <ViewModeToggle 
                    mode={currentSettings.viewMode} 
                    onChange={(value) => updateSettings(settingsOpenFor, { viewMode: value })} 
                  />
                </SettingsSection>
                
                <SettingsSection title={t.settings.xAxisScale}>
                  <ScaleConfigurator
                    config={toScaleConfig(currentSettings)}
                    onChange={(config) => updateSettings(settingsOpenFor, { 
                      scaleMode: config.mode, 
                      scaleCustomValue: config.customValue 
                    })}
                    dataMaxValue={getDataMaxValue(settingsChartData)}
                  />
                </SettingsSection>
                
                <SettingsSection title={t.settings.xAxisDivisions}>
                  <XAxisSplitConfig
                    value={currentSettings.xAxisSplitCount}
                    onChange={(value) => updateSettings(settingsOpenFor, { xAxisSplitCount: value })}
                  />
                </SettingsSection>
                
                <SettingsSection title={t.settings.yAxisLabels}>
                  <YAxisLabelConfig
                    mode={currentSettings.yAxisLabelMode}
                    onChange={(value) => updateSettings(settingsOpenFor, { yAxisLabelMode: value })}
                  />
                </SettingsSection>
                
                <SettingsSection title={t.settings.colorProfile}>
                  <ColorProfileSelector
                    value={currentSettings.colorProfile}
                    onChange={(value) => updateSettings(settingsOpenFor, { colorProfile: value })}
                  />
                </SettingsSection>
                
                <SettingsSection title={t.settings.additional}>
                  <ToggleSetting
                    label={t.settings.showTotal}
                    description={t.settings.showTotalDesc}
                    checked={currentSettings.showTotal}
                    onChange={(value) => updateSettings(settingsOpenFor, { showTotal: value })}
                  />
                  <ToggleSetting
                    label={t.settings.barLabels}
                    description={t.settings.barLabelsDesc}
                    checked={currentSettings.showBarLabels}
                    onChange={(value) => updateSettings(settingsOpenFor, { showBarLabels: value })}
                  />
                  <ToggleSetting
                    label={t.settings.showMedianLine}
                    description={t.settings.showMedianLineDesc}
                    checked={currentSettings.showMedianLine}
                    onChange={(value) => updateSettings(settingsOpenFor, { showMedianLine: value })}
                  />
                  <ToggleSetting
                    label={t.settings.showAsPercentage}
                    description={t.settings.showAsPercentageDesc}
                    checked={currentSettings.showAsPercentage}
                    onChange={(value) => updateSettings(settingsOpenFor, { showAsPercentage: value })}
                  />
                </SettingsSection>
              </ChartSettingsPanel>
            )}
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <p>
          {t.app.footer} • 
          <a 
            href="https://github.com/bleizard" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            Aleksandr Iarkeev
          </a>
        </p>
      </footer>
      
      {/* Полноэкранный режим */}
      {fullscreenChartId && (() => {
        const isOriginal = fullscreenChartId === ORIGINAL_CHART_ID;
        const chart = isOriginal ? null : additionalCharts.find(c => c.id === fullscreenChartId);
        const settings = getSettings(fullscreenChartId);
        const chartData = isOriginal 
          ? getChartData(ORIGINAL_CHART_ID, initialData)
          : chart ? getAggregatedChartData(chart) : null;
        
        if (!chartData) return null;
        
        const dataMaxValue = getDataMaxValue(chartData);
        const effectiveScale = calculateScale(toScaleConfig(settings), dataMaxValue);
        const yAxisInterval = getYAxisInterval(settings.yAxisLabelMode);
        const currentYear = settings.selectedYear ?? initialSelectedYear;
        
        return (
          <div className={styles.fullscreenOverlay}>
            <div className={styles.fullscreenContainer}>
              <div className={styles.fullscreenHeader}>
                <h2 className={styles.fullscreenTitle}>
                  {isOriginal ? t.chart.originalData : `${t.chart.grouping} ${chart?.groupConfig?.map(g => g.label).join(', ')}`}
                </h2>
                <button
                  className={styles.fullscreenCloseButton}
                  onClick={handleCloseFullscreen}
                  type="button"
                  aria-label={t.actions.exitFullscreen}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
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
              <div className={styles.fullscreenChart}>
                <PopulationPyramid
                  data={chartData}
                  theme={theme}
                  viewMode={settings.viewMode}
                  maxScale={effectiveScale}
                  yAxisInterval={yAxisInterval}
                  customTitle={settings.customTitle}
                  showTotal={settings.showTotal}
                  xAxisSplitCount={settings.xAxisSplitCount}
                  showBarLabels={settings.showBarLabels}
                  colorProfile={settings.colorProfile}
                  showMedianLine={settings.showMedianLine}
                  showAsPercentage={settings.showAsPercentage}
                />
              </div>
              {timeSeriesData && currentYear && (
                <div className={styles.fullscreenTimeline}>
                  <YearSelector
                    years={timeSeriesData.years}
                    selectedYear={currentYear}
                    onYearChange={(year) => handleYearChange(fullscreenChartId, year)}
                    chartTitle={settings?.customTitle || initialData?.title}
                    getChartCanvas={createGetChartCanvas(fullscreenChartId)}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })()}
      </div>
    </I18nContext.Provider>
  );
}

export default App;
