import { useCallback, useMemo } from 'react';
import { useChartSettings } from '../../../hooks';
import { useI18n } from '../../../i18n';
import {
  ViewModeToggle,
  ScaleConfigurator,
  YAxisLabelConfig,
  ChartTitleInput,
  ToggleSetting,
  XAxisSplitConfig,
  ColorProfileSelector,
} from '../../common';
import { ChartCard } from '../ChartCard';
import { AgeGroupConfigurator } from '../AgeGroupConfigurator';
import { ChartSettingsPanel, SettingsSection } from '../ChartSettingsPanel';
import { FullscreenChart } from '../FullscreenChart';
import { ORIGINAL_CHART_ID } from '../../../constants';
import type { Theme } from '../../../hooks';
import type { PopulationData, TimeSeriesPopulationData, DataFormat, AgeRangeConfig } from '../../../types';
import styles from './ChartWorkspace.module.css';

interface ChartWorkspaceProps {
  /** Исходные данные о населении */
  initialData: PopulationData;
  /** Данные временного ряда */
  timeSeriesData: TimeSeriesPopulationData | null;
  /** Определённый формат данных */
  detectedFormat: DataFormat | null;
  /** Начальный выбранный год */
  initialSelectedYear: number | null;
  /** Текущая тема */
  theme: Theme;
  /** Callback для очистки данных */
  onClearData: () => void;
}

export function ChartWorkspace({
  initialData,
  timeSeriesData,
  detectedFormat,
  initialSelectedYear,
  theme,
  onClearData,
}: ChartWorkspaceProps) {
  const { t } = useI18n();
  
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

  // Сброс всех данных
  const handleClearAll = useCallback(() => {
    onClearData();
    resetAll();
  }, [onClearData, resetAll]);
  
  // Создание агрегированного графика
  const handleCreateGroupedChart = useCallback((groups: AgeRangeConfig[]) => {
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
    if (!settingsOpenFor) return null;
    
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
    if (!fullscreenChartId) return null;
    
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
    <>
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
            ? { ...initialData, ageGroups: timeSeriesData.dataByYear[chartYear] || initialData.ageGroups }
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
    </>
  );
}

