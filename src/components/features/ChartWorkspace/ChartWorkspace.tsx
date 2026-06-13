import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { EmbedCodeModal } from '../EmbedCodeModal';
import { GroupedChartModal } from '../GroupedChartModal';
import { ProjectionScenarioModal } from '../ProjectionScenarioModal';
import { generateSimpleEmbedCode } from '../../../utils/embedCodeGenerator';
import {
  buildProjectedTimeSeriesData,
  buildProjectionBaseline,
  type PopulationProjectionScenario,
} from '../../../utils/demographicProjection';
import { ORIGINAL_CHART_ID } from '../../../constants';
import type { Theme } from '../../../hooks';
import type { PopulationData, TimeSeriesPopulationData, DataFormat, AgeRangeConfig } from '../../../types';
import type { CountryDemographyProfile } from '../../../services/countryDataLoader';
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
  /** Режим профиля страны */
  profileMode?: boolean;
  /** Демографический профиль страны для сценариев прогноза */
  demographyProfile?: CountryDemographyProfile | null;
}

export function ChartWorkspace({
  initialData,
  timeSeriesData,
  detectedFormat,
  initialSelectedYear,
  theme,
  onClearData,
  profileMode = false,
  demographyProfile = null,
}: ChartWorkspaceProps) {
  const { t } = useI18n();
  const tAny = t as Record<string, unknown>;
  const [embedCode, setEmbedCode] = useState<string | null>(null);
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [isGroupedChartModalOpen, setIsGroupedChartModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProjectionModalOpen, setIsProjectionModalOpen] = useState(false);
  const [projectionScenario, setProjectionScenario] = useState<PopulationProjectionScenario | null>(null);
  const [projectedTimeSeriesData, setProjectedTimeSeriesData] = useState<TimeSeriesPopulationData | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  
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

  const actionLabels = {
    futureScenario: (tAny.actions as Record<string, string> | undefined)?.futureScenario
      ?? (profileMode ? 'Future scenario' : 'Projection'),
    editFutureScenario: (tAny.actions as Record<string, string> | undefined)?.editFutureScenario
      ?? 'Edit scenario',
    resetProjection: (tAny.actions as Record<string, string> | undefined)?.resetProjection
      ?? 'Return to observed data',
    projectionBadge: (tAny.actions as Record<string, string> | undefined)?.projectionBadge
      ?? 'Projection active',
  };

  const effectiveTimeSeriesData = projectedTimeSeriesData ?? timeSeriesData;

  // Сброс всех данных
  const handleClearAll = useCallback(() => {
    onClearData();
    resetAll();
  }, [onClearData, resetAll]);

  useEffect(() => {
    setProjectedTimeSeriesData(null);
    setProjectionScenario(null);
    setIsProjectionModalOpen(false);
  }, [timeSeriesData?.geoCode, initialData?.title]);

  const profileGroupedChart = profileMode ? additionalCharts[additionalCharts.length - 1] ?? null : null;
  const profileActiveChartId = profileGroupedChart?.id ?? ORIGINAL_CHART_ID;
  const profileSelectedYear = getSettings(ORIGINAL_CHART_ID).selectedYear
    ?? initialSelectedYear
    ?? timeSeriesData?.years[timeSeriesData.years.length - 1]
    ?? new Date().getFullYear();

  const projectionBaseline = useMemo(() => {
    if (!profileMode || !demographyProfile) return null;

    const baselineYear = projectionScenario?.startYear ?? profileSelectedYear;
    const baselineAgeGroups = timeSeriesData?.dataByYear[baselineYear] ?? initialData.ageGroups;
    return buildProjectionBaseline(demographyProfile, baselineAgeGroups, baselineYear);
  }, [demographyProfile, initialData.ageGroups, profileMode, profileSelectedYear, projectionScenario?.startYear, timeSeriesData]);

  const canRunProjection = profileMode && Boolean(demographyProfile && projectionBaseline && timeSeriesData);
  
  // Создание агрегированного графика
  const handleCreateGroupedChart = useCallback((groups: AgeRangeConfig[]) => {
    const sourceChartId = profileMode ? profileActiveChartId : ORIGINAL_CHART_ID;
    const sourceSettings = getSettings(sourceChartId);
    const sourceYear = sourceSettings.selectedYear ?? initialSelectedYear;
    const currentData = effectiveTimeSeriesData && sourceYear
      ? {
          title: effectiveTimeSeriesData.title,
          date: String(sourceYear),
          source: effectiveTimeSeriesData.source,
          ageGroups: effectiveTimeSeriesData.dataByYear[sourceYear] || initialData.ageGroups,
        }
      : initialData;

    createGroupedChart(groups, currentData, sourceYear, { replaceExisting: profileMode });
  }, [createGroupedChart, effectiveTimeSeriesData, getSettings, initialData, initialSelectedYear, profileActiveChartId, profileMode]);

  const handleRestoreOriginal = useCallback(() => {
    additionalCharts.forEach((chart) => removeChart(chart.id));
    setIsProfileMenuOpen(false);
  }, [additionalCharts, removeChart]);

  const handleProfileYearChange = useCallback((year: number) => {
    handleYearChange(ORIGINAL_CHART_ID, year);
    if (profileActiveChartId !== ORIGINAL_CHART_ID) {
      handleYearChange(profileActiveChartId, year);
    }
  }, [handleYearChange, profileActiveChartId]);

  const handleApplyProjection = useCallback((nextScenario: PopulationProjectionScenario) => {
    if (!projectionBaseline || !timeSeriesData) return;

    const baseAgeGroups = timeSeriesData.dataByYear[nextScenario.startYear] ?? initialData.ageGroups;
    const projected = buildProjectedTimeSeriesData(
      timeSeriesData.title,
      baseAgeGroups,
      nextScenario,
      projectionBaseline,
    );

    setProjectedTimeSeriesData({
      ...projected,
      geoCode: timeSeriesData.geoCode,
      hasGenderData: timeSeriesData.hasGenderData,
    });
    setProjectionScenario(nextScenario);
    setIsProjectionModalOpen(false);
    handleProfileYearChange(nextScenario.endYear);
  }, [handleProfileYearChange, initialData.ageGroups, projectionBaseline, timeSeriesData]);

  const handleResetProjection = useCallback(() => {
    const resetYear = projectionScenario?.startYear
      ?? initialSelectedYear
      ?? timeSeriesData?.years[timeSeriesData.years.length - 1]
      ?? null;

    setProjectedTimeSeriesData(null);
    setProjectionScenario(null);
    setIsProjectionModalOpen(false);

    if (resetYear) {
      handleProfileYearChange(resetYear);
    }
  }, [handleProfileYearChange, initialSelectedYear, projectionScenario?.startYear, timeSeriesData]);

  const handleFullscreenYearChange = useCallback((year: number) => {
    if (profileMode && fullscreenChartId === profileActiveChartId) {
      handleProfileYearChange(year);
      return;
    }

    if (fullscreenChartId) {
      handleYearChange(fullscreenChartId, year);
    }
  }, [fullscreenChartId, handleProfileYearChange, handleYearChange, profileActiveChartId, profileMode]);

  // Генерация embed кода
  const handleGetEmbedCode = useCallback((chartId: string) => {
    const settings = getSettings(chartId);
    const isOriginal = chartId === ORIGINAL_CHART_ID;
    const chartData = isOriginal
      ? getChartData(ORIGINAL_CHART_ID, initialData, effectiveTimeSeriesData)
      : (() => {
          const chart = additionalCharts.find(c => c.id === chartId);
          return chart ? getAggregatedChartData(chart, effectiveTimeSeriesData, initialData) : null;
        })();
    
    if (!chartData) return;

    const baseUrl = import.meta.env.BASE_URL === '/' 
      ? window.location.origin 
      : `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, '');

    const code = generateSimpleEmbedCode(
      chartData,
      settings,
      effectiveTimeSeriesData,
      theme,
      baseUrl
    );
    
    setEmbedCode(code);
    setIsEmbedModalOpen(true);
  }, [additionalCharts, effectiveTimeSeriesData, getAggregatedChartData, getChartData, getSettings, initialData, theme]);

  // Данные оригинального графика
  const originalChartData = getChartData(ORIGINAL_CHART_ID, initialData, effectiveTimeSeriesData);
  
  // Максимальный возраст для конфигуратора
  const maxAge = originalChartData 
    ? Math.max(...originalChartData.ageGroups.map((g) => g.ageNumeric))
    : 100;

  const profileActiveSettings = getSettings(profileActiveChartId);
  const profileActiveChartData = profileGroupedChart
    ? getAggregatedChartData(profileGroupedChart, effectiveTimeSeriesData, initialData)
    : originalChartData;
  const profileActiveYear = profileActiveSettings.selectedYear ?? initialSelectedYear;
  const profileSourceData = profileGroupedChart && effectiveTimeSeriesData && profileActiveYear
    ? { ...initialData, ageGroups: effectiveTimeSeriesData.dataByYear[profileActiveYear] || initialData.ageGroups }
    : undefined;

  // Данные для панели настроек
  const settingsChartData = useMemo(() => {
    if (!settingsOpenFor) return null;
    
    if (settingsOpenFor === ORIGINAL_CHART_ID) {
      return getChartData(ORIGINAL_CHART_ID, initialData, effectiveTimeSeriesData);
    }
    
    const chart = additionalCharts.find((c) => c.id === settingsOpenFor);
    if (!chart) return null;
    return getAggregatedChartData(chart, effectiveTimeSeriesData, initialData);
  }, [settingsOpenFor, initialData, additionalCharts, effectiveTimeSeriesData, getChartData, getAggregatedChartData]);

  const currentSettings = settingsOpenFor ? getSettings(settingsOpenFor) : null;

  // Данные для полноэкранного режима
  const fullscreenData = useMemo(() => {
    if (!fullscreenChartId) return null;
    
    const isOriginal = fullscreenChartId === ORIGINAL_CHART_ID;
    const chart = isOriginal ? null : additionalCharts.find(c => c.id === fullscreenChartId);
    const settings = getSettings(fullscreenChartId);
    const chartData = isOriginal 
      ? getChartData(ORIGINAL_CHART_ID, initialData, effectiveTimeSeriesData)
      : chart ? getAggregatedChartData(chart, effectiveTimeSeriesData, initialData) : null;
    
    if (!chartData) return null;
    
    const currentYear = settings.selectedYear ?? initialSelectedYear;
    const sourceDataForMedian = !isOriginal && effectiveTimeSeriesData && currentYear
      ? { ...initialData, ageGroups: effectiveTimeSeriesData.dataByYear[currentYear] || initialData.ageGroups }
      : undefined;
    
    return {
      data: chartData,
      settings,
      sourceDataForMedian,
      currentYear,
      title: isOriginal ? t.chart.originalData : '',
      groupConfig: chart?.groupConfig,
    };
  }, [fullscreenChartId, initialData, additionalCharts, effectiveTimeSeriesData, getSettings, getChartData, getAggregatedChartData, initialSelectedYear, t.chart.originalData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isProfileMenuOpen) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isProfileMenuOpen]);

  return (
    <>
      <section className={`${styles.chartSection} ${profileMode ? styles.chartSectionProfile : ''}`}>
        {!profileMode && (
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
        )}

        <div className={profileMode ? styles.profileShell : styles.workspaceStack}>
          {profileMode && (
            <div className={styles.profileHeader}>
              <div>
                <div className={styles.profileTitleRow}>
                  <h2 className={styles.profileTitle}>{t.app.title}</h2>
                  {profileGroupedChart && (
                    <span className={styles.profileModeBadge}>
                      {t.groupConfig.activeMode}
                    </span>
                  )}
                  {projectionScenario && (
                    <span className={`${styles.profileModeBadge} ${styles.projectionBadge}`}>
                      {actionLabels.projectionBadge}: {projectionScenario.endYear}
                    </span>
                  )}
                </div>
                <p className={styles.profileSubtitle}>{t.app.subtitle}</p>
              </div>
              <div className={styles.profileMenu} ref={profileMenuRef}>
                <div className={styles.profileActions}>
                  <button
                    className={styles.profileMenuButton}
                    onClick={() => setIsProfileMenuOpen((open) => !open)}
                    type="button"
                    aria-label={t.actions.menu}
                    aria-expanded={isProfileMenuOpen}
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
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="12" cy="5" r="1" />
                      <circle cx="12" cy="19" r="1" />
                    </svg>
                  </button>
                  <button
                    className={styles.profileMenuButton}
                    onClick={() => openSettings(profileActiveChartId)}
                    type="button"
                    aria-label={t.settings.title}
                    title={t.settings.title}
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
                      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>

                {isProfileMenuOpen && (
                  <div className={styles.profileMenuDropdown}>
                    <button
                      className={styles.profileMenuItem}
                      onClick={() => {
                        setIsGroupedChartModalOpen(true);
                        setIsProfileMenuOpen(false);
                      }}
                      type="button"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 3v18h18" />
                        <path d="m19 9-5 5-4-4-3 3" />
                      </svg>
                      {t.groupConfig.createGrouped}
                    </button>
                    {profileGroupedChart && (
                      <button
                        className={styles.profileMenuItem}
                        onClick={handleRestoreOriginal}
                        type="button"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 12a9 9 0 1 0 3-6.7" />
                          <path d="M3 3v6h6" />
                        </svg>
                        {t.settings.resetTitle}
                      </button>
                    )}
                    {canRunProjection && (
                      <button
                        className={styles.profileMenuItem}
                        onClick={() => {
                          setIsProjectionModalOpen(true);
                          setIsProfileMenuOpen(false);
                        }}
                        type="button"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 3v6" />
                          <path d="m16.5 7.5-4.5 4.5-3-3L4 14" />
                          <path d="M20 6v6h-6" />
                          <path d="M5 21h14" />
                        </svg>
                        {projectionScenario ? actionLabels.editFutureScenario : actionLabels.futureScenario}
                      </button>
                    )}
                    {projectionScenario && (
                      <button
                        className={styles.profileMenuItem}
                        onClick={() => {
                          handleResetProjection();
                          setIsProfileMenuOpen(false);
                        }}
                        type="button"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 12a9 9 0 1 0 3-6.7" />
                          <path d="M3 3v6h6" />
                        </svg>
                        {actionLabels.resetProjection}
                      </button>
                    )}
                    <button
                      className={styles.profileMenuItem}
                      onClick={() => {
                        handleGetEmbedCode(profileActiveChartId);
                        setIsProfileMenuOpen(false);
                      }}
                      type="button"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" x2="8" y1="13" y2="13" />
                        <line x1="16" x2="8" y1="17" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      {t.actions.embedCode}
                    </button>
                    <button
                      className={styles.profileMenuItem}
                      onClick={() => {
                        openFullscreen(profileActiveChartId);
                        setIsProfileMenuOpen(false);
                      }}
                      type="button"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                        <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                        <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                        <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                      </svg>
                      {t.actions.fullscreen}
                    </button>
                    <button
                      className={styles.profileMenuItem}
                      onClick={() => {
                        exportToSvg(
                          profileActiveChartId,
                          profileGroupedChart ? profileGroupedChart.data.title : initialData?.title
                        );
                        setIsProfileMenuOpen(false);
                      }}
                      type="button"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" x2="12" y1="15" y2="3" />
                      </svg>
                      {t.actions.exportSvg}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {!profileMode && (
            <AgeGroupConfigurator
              onCreateChart={handleCreateGroupedChart}
              maxAge={maxAge}
              variant="default"
            />
          )}

          {profileMode && profileActiveChartData && (
            <ChartCard
              ref={(el) => { chartRefs.current[profileActiveChartId] = el; }}
              chartId={profileActiveChartId}
              data={profileActiveChartData}
              sourceDataForMedian={profileSourceData}
              settings={profileActiveSettings}
              theme={theme}
              timeSeriesData={effectiveTimeSeriesData}
              currentYear={profileActiveYear}
              title=""
              groupConfig={profileGroupedChart?.groupConfig}
              onExportSvg={() => exportToSvg(profileActiveChartId, initialData?.title)}
              onFullscreen={() => openFullscreen(profileActiveChartId)}
              onGetEmbedCode={() => handleGetEmbedCode(profileActiveChartId)}
              onOpenSettings={() => openSettings(profileActiveChartId)}
              onYearChange={handleProfileYearChange}
              getChartCanvas={createGetChartCanvas(profileActiveChartId)}
              variant="flat"
              showSummaryMetrics={false}
              showHeader={false}
              showActionsMenu={false}
              showSettingsButton={false}
            />
          )}

          {!profileMode && originalChartData && (() => {
            const settings = getSettings(ORIGINAL_CHART_ID);
            const currentYear = settings.selectedYear ?? initialSelectedYear;
            
            return (
              <ChartCard
                ref={(el) => { chartRefs.current[ORIGINAL_CHART_ID] = el; }}
                chartId={ORIGINAL_CHART_ID}
                data={originalChartData}
                settings={settings}
                theme={theme}
                timeSeriesData={effectiveTimeSeriesData}
                currentYear={currentYear}
                title={t.chart.originalData}
                onExportSvg={() => exportToSvg(ORIGINAL_CHART_ID, initialData?.title)}
                onFullscreen={() => openFullscreen(ORIGINAL_CHART_ID)}
                onGetEmbedCode={() => handleGetEmbedCode(ORIGINAL_CHART_ID)}
                onOpenSettings={() => openSettings(ORIGINAL_CHART_ID)}
                onYearChange={(year) => handleYearChange(ORIGINAL_CHART_ID, year)}
                getChartCanvas={createGetChartCanvas(ORIGINAL_CHART_ID)}
                variant="default"
                showSummaryMetrics
              />
            );
          })()}

          {!profileMode && additionalCharts.map((chart) => {
            const settings = getSettings(chart.id);
            const chartData = getAggregatedChartData(chart, effectiveTimeSeriesData, initialData);
            const chartYear = settings.selectedYear ?? initialSelectedYear;
            const sourceData = effectiveTimeSeriesData && chartYear
              ? { ...initialData, ageGroups: effectiveTimeSeriesData.dataByYear[chartYear] || initialData.ageGroups }
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
                timeSeriesData={effectiveTimeSeriesData}
                currentYear={currentYear}
                title=""
                groupConfig={chart.groupConfig}
                removable
                onExportSvg={() => exportToSvg(chart.id, chart.data.title)}
                onFullscreen={() => openFullscreen(chart.id)}
                onGetEmbedCode={() => handleGetEmbedCode(chart.id)}
                onOpenSettings={() => openSettings(chart.id)}
                onRemove={() => removeChart(chart.id)}
                onYearChange={(year) => handleYearChange(chart.id, year)}
                getChartCanvas={createGetChartCanvas(chart.id)}
                variant="default"
                showSummaryMetrics
              />
            );
          })}
        </div>
        
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
            
            {settingsChartData?.hasGenderData !== false && (
              <SettingsSection title={t.settings.displayFormat}>
                <ViewModeToggle
                  mode={currentSettings.viewMode}
                  onChange={(value) => updateSettings(settingsOpenFor, { viewMode: value })}
                />
              </SettingsSection>
            )}
            
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
          timeSeriesData={effectiveTimeSeriesData}
          currentYear={fullscreenData.currentYear}
          title={fullscreenData.title}
          groupConfig={fullscreenData.groupConfig}
          onClose={closeFullscreen}
          onYearChange={handleFullscreenYearChange}
          getChartCanvas={createGetChartCanvas(fullscreenChartId)}
        />
      )}

      {/* Модальное окно embed кода */}
      {embedCode && (
        <EmbedCodeModal
          isOpen={isEmbedModalOpen}
          onClose={() => {
            setIsEmbedModalOpen(false);
            setEmbedCode(null);
          }}
          embedCode={embedCode}
        />
      )}

      <GroupedChartModal
        isOpen={isGroupedChartModalOpen}
        onClose={() => setIsGroupedChartModalOpen(false)}
        onCreateChart={handleCreateGroupedChart}
        maxAge={maxAge}
      />

      <ProjectionScenarioModal
        isOpen={isProjectionModalOpen}
        baseline={projectionBaseline}
        initialScenario={projectionScenario}
        onClose={() => setIsProjectionModalOpen(false)}
        onApply={handleApplyProjection}
      />
    </>
  );
}
