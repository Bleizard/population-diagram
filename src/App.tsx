import { useCallback, useMemo } from 'react';
import { usePopulationData, useTheme, useLanguage, useChartSettings } from './hooks';
import { I18nContext } from './i18n';
import { FileUpload } from './components/common/FileUpload';
import { ViewModeToggle } from './components/common/ViewModeToggle';
import { ScaleConfigurator } from './components/common/ScaleConfigurator';
import { YAxisLabelConfig } from './components/common/YAxisLabelConfig';
import { ChartTitleInput } from './components/common/ChartTitleInput';
import { ToggleSetting } from './components/common/ToggleSetting';
import { XAxisSplitConfig } from './components/common/XAxisSplitConfig';
import { ColorProfileSelector } from './components/common/ColorProfileSelector';
import { AppHeader } from './components/layout/AppHeader';
import { AppFooter } from './components/layout/AppFooter';
import { ChartCard } from './components/features/ChartCard';
import { AgeGroupConfigurator } from './components/features/AgeGroupConfigurator';
import { ChartSettingsPanel, SettingsSection } from './components/features/ChartSettingsPanel';
import { FullscreenChart } from './components/features/FullscreenChart';
import { ORIGINAL_CHART_ID } from './constants';
import styles from './App.module.css';

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
  
  const {
    additionalCharts,
    settingsOpenFor,
    fullscreenChartId,
    chartRefs,
    getSettings,
    updateSettings,
    getDataMaxValue,
    toScaleConfig,
    getChartData,
    getAggregatedChartData,
    handleYearChange,
    createGroupedChart,
    removeChart,
    resetAll,
    openSettings,
    closeSettings,
    openFullscreen,
    closeFullscreen,
    exportToSvg,
    createGetChartCanvas,
  } = useChartSettings();

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

  // Сброс всех данных
  const handleClearAll = useCallback(() => {
    clearData();
    resetAll();
  }, [clearData, resetAll]);
  
  // Создание агрегированного графика
  const handleCreateGroupedChart = useCallback((groups: Parameters<typeof createGroupedChart>[0]) => {
    const currentData = getChartData(ORIGINAL_CHART_ID, initialData, timeSeriesData);
    createGroupedChart(groups, currentData, initialSelectedYear);
  }, [createGroupedChart, getChartData, initialData, timeSeriesData, initialSelectedYear]);

  // Данные оригинального графика
  const originalChartData = getChartData(ORIGINAL_CHART_ID, initialData, timeSeriesData);
  
  // Максимальный возраст для конфигуратора
  const maxAge = originalChartData 
    ? Math.max(...originalChartData.ageGroups.map((g) => g.ageNumeric))
    : 100;

  // Данные для панели настроек
  const settingsChartData = useMemo(() => {
    if (!settingsOpenFor || !initialData) return null;
    
    if (settingsOpenFor === ORIGINAL_CHART_ID) {
      return getChartData(ORIGINAL_CHART_ID, initialData, timeSeriesData);
    }
    
    const chart = additionalCharts.find((c) => c.id === settingsOpenFor);
    if (!chart) return null;
    return getAggregatedChartData(chart, timeSeriesData, initialData);
  }, [settingsOpenFor, initialData, additionalCharts, getChartData, getAggregatedChartData, timeSeriesData]);

  const currentSettings = settingsOpenFor ? getSettings(settingsOpenFor) : null;

  // Данные для полноэкранного режима
  const fullscreenData = useMemo(() => {
    if (!fullscreenChartId || !initialData) return null;
    
    const isOriginal = fullscreenChartId === ORIGINAL_CHART_ID;
    const chart = isOriginal ? null : additionalCharts.find(c => c.id === fullscreenChartId);
    const settings = getSettings(fullscreenChartId);
    const chartData = isOriginal 
      ? getChartData(ORIGINAL_CHART_ID, initialData, timeSeriesData)
      : chart ? getAggregatedChartData(chart, timeSeriesData, initialData) : null;
    
    if (!chartData) return null;
    
    const currentYear = settings.selectedYear ?? initialSelectedYear;
    const sourceDataForMedian = !isOriginal && timeSeriesData && currentYear
      ? { ...initialData, ageGroups: timeSeriesData.dataByYear[currentYear] || initialData.ageGroups }
      : undefined;
    
    return {
      data: chartData,
      settings,
      sourceDataForMedian,
      currentYear,
      title: isOriginal ? t.chart.originalData : '',
      groupConfig: chart?.groupConfig,
    };
  }, [fullscreenChartId, initialData, additionalCharts, getSettings, getChartData, getAggregatedChartData, timeSeriesData, initialSelectedYear, t.chart.originalData]);

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
            <section className={styles.chartSection}>
              {/* Toolbar */}
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
              {originalChartData && (() => {
                const settings = getSettings(ORIGINAL_CHART_ID);
                const currentYear = settings.selectedYear ?? initialSelectedYear;
                
                return (
                  <ChartCard
                    ref={(el) => { chartRefs.current[ORIGINAL_CHART_ID] = el; }}
                    chartId={ORIGINAL_CHART_ID}
                    data={originalChartData}
                    settings={settings}
                    theme={theme}
                    timeSeriesData={timeSeriesData}
                    currentYear={currentYear}
                    title={t.chart.originalData}
                    onExportSvg={() => exportToSvg(ORIGINAL_CHART_ID, initialData?.title)}
                    onFullscreen={() => openFullscreen(ORIGINAL_CHART_ID)}
                    onOpenSettings={() => openSettings(ORIGINAL_CHART_ID)}
                    onYearChange={(year) => handleYearChange(ORIGINAL_CHART_ID, year)}
                    getChartCanvas={createGetChartCanvas(ORIGINAL_CHART_ID)}
                  />
                );
              })()}

              {/* Агрегированные графики */}
              {additionalCharts.map((chart) => {
                const settings = getSettings(chart.id);
                const chartData = getAggregatedChartData(chart, timeSeriesData, initialData);
                const chartYear = settings.selectedYear ?? initialSelectedYear;
                const sourceData = timeSeriesData && chartYear
                  ? { ...initialData!, ageGroups: timeSeriesData.dataByYear[chartYear] || initialData!.ageGroups }
                  : initialData;
                const currentYear = settings.selectedYear ?? initialSelectedYear;
                
                return (
                  <ChartCard
                    key={chart.id}
                    ref={(el) => { chartRefs.current[chart.id] = el; }}
                    chartId={chart.id}
                    data={chartData}
                    sourceDataForMedian={sourceData ?? undefined}
                    settings={settings}
                    theme={theme}
                    timeSeriesData={timeSeriesData}
                    currentYear={currentYear}
                    title=""
                    groupConfig={chart.groupConfig}
                    removable
                    onExportSvg={() => exportToSvg(chart.id, chart.data.title)}
                    onFullscreen={() => openFullscreen(chart.id)}
                    onOpenSettings={() => openSettings(chart.id)}
                    onRemove={() => removeChart(chart.id)}
                    onYearChange={(year) => handleYearChange(chart.id, year)}
                    getChartCanvas={createGetChartCanvas(chart.id)}
                  />
                );
              })}
              
              {/* Панель настроек */}
              {settingsOpenFor && settingsChartData && currentSettings && (
                <ChartSettingsPanel isOpen={true} onClose={closeSettings}>
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

        <AppFooter />
        
        {/* Полноэкранный режим */}
        {fullscreenChartId && fullscreenData && (
          <FullscreenChart
            data={fullscreenData.data}
            sourceDataForMedian={fullscreenData.sourceDataForMedian}
            settings={fullscreenData.settings}
            theme={theme}
            timeSeriesData={timeSeriesData}
            currentYear={fullscreenData.currentYear}
            title={fullscreenData.title}
            groupConfig={fullscreenData.groupConfig}
            onClose={closeFullscreen}
            onYearChange={(year) => handleYearChange(fullscreenChartId, year)}
            getChartCanvas={createGetChartCanvas(fullscreenChartId)}
          />
        )}
      </div>
    </I18nContext.Provider>
  );
}

export default App;
