import { useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { useI18n } from '../i18n';
import { useComparisonData } from '../hooks/useComparisonData';
import { useComparisonSettings } from '../hooks/useComparisonSettings';
import { COMPARABLE_COUNTRIES } from '../data/countries';
import { getLocalizedCountryName } from '../utils/localizedCountryName';
import { CountrySelector } from '../components/features/CountrySelector';
import { PopulationPyramid } from '../components/features/PopulationPyramid/PopulationPyramid';
import { OverlayPyramid } from '../components/features/OverlayPyramid';
import { DifferencePyramid } from '../components/features/DifferencePyramid';
import { ChartSettingsPanel, SettingsSection, SettingsButton } from '../components/features/ChartSettingsPanel';
import {
  YearSelector,
  ViewModeToggle,
  ColorProfileSelector,
  ToggleSetting,
  YAxisLabelConfig,
  XAxisSplitConfig,
  getYAxisInterval,
} from '../components/common';
import { OverlayColorPicker } from '../components/common/OverlayColorPicker';
import { parsePopulationFile } from '../services/fileParser';
import type { Theme } from '../hooks';
import styles from './ComparePage.module.css';

type ViewMode = 'side-by-side' | 'overlay' | 'difference';

interface ComparePageProps {
  theme: Theme;
}

export function ComparePage({ theme }: ComparePageProps) {
  const { left: leftParam, right: rightParam } = useParams<{ left?: string; right?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, language } = useI18n();
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [showAsPercentage, setShowAsPercentage] = useState(false);
  const compSettings = useComparisonSettings();

  const {
    left, right,
    setLeftCode, setRightCode,
    setLeftCustomData, setRightCustomData,
    setLeftYear, setRightYear,
    swap, clearLeft, clearRight,
    syncYears, setSyncYears,
    matchScale, setMatchScale,
    commonYears,
    leftPopulationData, rightPopulationData,
    sharedMaxScale,
  } = useComparisonData();

  const leftYearParam = Number.parseInt(searchParams.get('leftYear') ?? '', 10);
  const rightYearParam = Number.parseInt(searchParams.get('rightYear') ?? '', 10);
  const syncParam = searchParams.get('sync');
  const viewParam = searchParams.get('view');

  const updateUrl = useCallback((
    lCode: string | null,
    rCode: string | null,
    overrides?: Partial<{ leftYear: number | null; rightYear: number | null; syncYears: boolean; viewMode: ViewMode }>
  ) => {
    const pathname = lCode && rCode
      ? `/compare/${lCode}/${rCode}`
      : lCode
        ? `/compare/${lCode}`
        : rCode
          ? `/compare/${rCode}`
          : '/compare';

    const params = new URLSearchParams(searchParams);
    const nextLeftYear = overrides?.leftYear ?? left.year ?? null;
    const nextRightYear = overrides?.rightYear ?? right.year ?? null;
    const nextSync = overrides?.syncYears ?? syncYears;
    const nextView = overrides?.viewMode ?? viewMode;

    if (nextLeftYear) params.set('leftYear', String(nextLeftYear));
    else params.delete('leftYear');

    if (nextRightYear) params.set('rightYear', String(nextRightYear));
    else params.delete('rightYear');

    params.set('sync', nextSync ? '1' : '0');
    params.set('view', nextView);

    navigate({ pathname, search: `?${params.toString()}` }, { replace: true });
  }, [left.year, navigate, right.year, searchParams, syncYears, viewMode]);

  // Sync URL params -> state (on mount / param change)
  useEffect(() => {
    const lCode = leftParam?.toUpperCase() ?? null;
    const rCode = rightParam?.toUpperCase() ?? null;
    const lValid = lCode && COMPARABLE_COUNTRIES.some(c => c.code === lCode) ? lCode : null;
    const rValid = rCode && COMPARABLE_COUNTRIES.some(c => c.code === rCode) ? rCode : null;

    if (lValid !== left.code) setLeftCode(lValid);
    if (rValid !== right.code) setRightCode(rValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftParam, rightParam]);

  useEffect(() => {
    if ((viewParam === 'side-by-side' || viewParam === 'overlay' || viewParam === 'difference') && viewParam !== viewMode) {
      setViewMode(viewParam);
    }
  }, [viewMode, viewParam]);

  useEffect(() => {
    if (syncParam === '1' && !syncYears) setSyncYears(true);
    if (syncParam === '0' && syncYears) setSyncYears(false);
  }, [setSyncYears, syncParam, syncYears]);

  useEffect(() => {
    if (left.data && Number.isFinite(leftYearParam) && left.data.years.includes(leftYearParam) && left.year !== leftYearParam) {
      setLeftYear(leftYearParam);
    }
  }, [left.data, left.year, leftYearParam, setLeftYear]);

  useEffect(() => {
    if (right.data && Number.isFinite(rightYearParam) && right.data.years.includes(rightYearParam) && right.year !== rightYearParam) {
      setRightYear(rightYearParam);
    }
  }, [right.data, right.year, rightYearParam, setRightYear]);

  const handleLeftChange = (code: string | null) => {
    setLeftCode(code);
    updateUrl(code, right.code, { leftYear: null, rightYear: right.year });
  };

  const handleRightChange = (code: string | null) => {
    setRightCode(code);
    updateUrl(left.code, code, { leftYear: left.year, rightYear: null });
  };

  const handleSwap = () => {
    swap();
    updateUrl(right.code, left.code, {
      leftYear: right.year,
      rightYear: left.year,
    });
  };

  const handleLeftReset = () => {
    clearLeft();
    updateUrl(null, right.code, { leftYear: null });
  };

  const handleRightReset = () => {
    clearRight();
    updateUrl(left.code, null, { rightYear: null });
  };

  // File upload handlers
  const handleLeftFile = useCallback(async (file: File) => {
    try {
      const result = await parsePopulationFile(file);
      if (result.success) {
        if (result.timeSeriesData) {
          setLeftCustomData(result.timeSeriesData);
        } else if (result.data) {
          setLeftCustomData(result.data);
        }
        updateUrl(null, right.code);
      }
    } catch {
      // Parse error
    }
  }, [setLeftCustomData, right.code]);

  const handleRightFile = useCallback(async (file: File) => {
    try {
      const result = await parsePopulationFile(file);
      if (result.success) {
        if (result.timeSeriesData) {
          setRightCustomData(result.timeSeriesData);
        } else if (result.data) {
          setRightCustomData(result.data);
        }
        updateUrl(left.code, null);
      }
    } catch {
      // Parse error
    }
  }, [setRightCustomData, left.code]);

  const getCountryName = (code: string | null) => {
    if (!code) return '';
    const c = COMPARABLE_COUNTRIES.find(c => c.code === code);
    if (!c) return code;
    return getLocalizedCountryName(c.code, language, c.name);
  };

  const leftName = left.code ? getCountryName(left.code) : (left.customLabel || '');
  const rightName = right.code ? getCountryName(right.code) : (right.customLabel || '');
  const leftChartTitle = left.code && right.code && left.code === right.code && left.year
    ? `${leftName} ${left.year}`
    : leftName;
  const rightChartTitle = left.code && right.code && left.code === right.code && right.year
    ? `${rightName} ${right.year}`
    : rightName;
  const isSameCountryComparison = Boolean(left.code && right.code && left.code === right.code);

  const hasAnyData = left.data || right.data || left.customLabel || right.customLabel;
  const yearsForSync = syncYears && commonYears.length > 0 ? commonYears : undefined;

  const handleLeftYearChange = (year: number) => {
    setLeftYear(year);
    updateUrl(left.code, right.code, {
      leftYear: year,
      rightYear: syncYears ? year : right.year,
    });
  };

  const handleRightYearChange = (year: number) => {
    setRightYear(year);
    updateUrl(left.code, right.code, {
      leftYear: syncYears ? year : left.year,
      rightYear: year,
    });
  };

  useEffect(() => {
    if (isSameCountryComparison && syncYears) {
      setSyncYears(false);
      updateUrl(left.code, right.code, {
        syncYears: false,
        leftYear: left.year,
        rightYear: right.year,
      });
    }
  }, [isSameCountryComparison, left.code, left.year, right.code, right.year, setSyncYears, syncYears, updateUrl]);

  return (
    <div className={styles.page}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeButton} ${viewMode === 'side-by-side' ? styles.modeButtonActive : ''}`}
            onClick={() => {
              setViewMode('side-by-side');
              updateUrl(left.code, right.code, { viewMode: 'side-by-side' });
            }}
            type="button"
          >
            {t.comparison.sideBySide}
          </button>
          <button
            className={`${styles.modeButton} ${viewMode === 'overlay' ? styles.modeButtonActive : ''}`}
            onClick={() => {
              setViewMode('overlay');
              updateUrl(left.code, right.code, { viewMode: 'overlay' });
            }}
            type="button"
          >
            {t.comparison.overlay}
          </button>
          <button
            className={`${styles.modeButton} ${viewMode === 'difference' ? styles.modeButtonActive : ''}`}
            onClick={() => {
              setViewMode('difference');
              updateUrl(left.code, right.code, { viewMode: 'difference' });
            }}
            type="button"
          >
            {t.comparison.difference}
          </button>
        </div>

        <div className={styles.toggles}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={syncYears}
              onChange={(e) => {
                const nextSync = e.target.checked;
                setSyncYears(nextSync);
                const syncedYear = nextSync && commonYears.length > 0 ? commonYears[commonYears.length - 1] : null;
                updateUrl(left.code, right.code, {
                  syncYears: nextSync,
                  leftYear: syncedYear ?? left.year,
                  rightYear: syncedYear ?? right.year,
                });
              }}
              disabled={commonYears.length === 0}
            />
            <span>{t.comparison.syncYear}</span>
          </label>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={matchScale}
              onChange={e => setMatchScale(e.target.checked)}
            />
            <span>{t.comparison.matchScale}</span>
          </label>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={showAsPercentage}
              onChange={e => setShowAsPercentage(e.target.checked)}
            />
            <span>%</span>
          </label>
        </div>

        {/* Swap button */}
        <button
          className={styles.iconButton}
          onClick={handleSwap}
          type="button"
          title={t.comparison.swap ?? 'Swap'}
          disabled={!hasAnyData}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 7H4m0 0l4-4m-4 4l4 4" />
            <path d="M8 17h12m0 0l-4-4m4 4l-4 4" />
          </svg>
        </button>

        {/* Exit — pushed to the right */}
        <Link to="/countries" className={styles.exitButton}>
          {t.comparison.exit}
        </Link>
      </div>

      {/* Country selectors */}
      <div className={styles.selectors}>
        <CountrySelector
          value={left.code}
          onChange={handleLeftChange}
          excludeCode={right.code}
          allowSameSelection
          label={t.comparison.left}
          customLabel={left.customLabel}
          onFileUpload={handleLeftFile}
          onReset={handleLeftReset}
        />
        <CountrySelector
          value={right.code}
          onChange={handleRightChange}
          excludeCode={left.code}
          allowSameSelection
          label={t.comparison.right}
          customLabel={right.customLabel}
          onFileUpload={handleRightFile}
          onReset={handleRightReset}
        />
      </div>

      {isSameCountryComparison && (
        <div className={styles.sameCountryHint}>
          {language === 'ru'
            ? 'Выбрана одна и та же страна с двух сторон. Используй разные годы слева и справа для внутристранового сравнения.'
            : 'The same country is selected on both sides. Use different years on the left and right for a within-country comparison.'}
        </div>
      )}

      {/* Content area */}
      {viewMode === 'side-by-side' ? (
        <>
          <div className={styles.sideBySide}>
            {/* Left panel */}
            <div className={styles.panel}>
              {leftPopulationData && left.data && (
                <div className={styles.panelToolbar}>
                  <SettingsButton onClick={() => compSettings.openSettings('left')} />
                </div>
              )}
              {left.loading && <div className={styles.loading}><div className={styles.spinner} /></div>}
              {left.error && <div className={styles.error}>{left.error}</div>}
              {leftPopulationData && left.data && (
                <>
                  <PopulationPyramid
                    data={leftPopulationData}
                    theme={theme}
                    customTitle={leftChartTitle}
                    maxScale={sharedMaxScale}
                    showAsPercentage={showAsPercentage || compSettings.left.showAsPercentage}
                    viewMode={compSettings.left.viewMode}
                    colorProfile={compSettings.left.colorProfile}
                    showMedianLine={compSettings.left.showMedianLine}
                    showBarLabels={compSettings.left.showBarLabels}
                    showTotal={compSettings.left.showTotal}
                    yAxisInterval={getYAxisInterval(compSettings.left.yAxisLabelMode)}
                    xAxisSplitCount={compSettings.left.xAxisSplitCount}
                  />
                  {!yearsForSync && (
                    <YearSelector
                      years={left.data.years}
                      selectedYear={left.year}
                      onYearChange={handleLeftYearChange}
                      compact
                    />
                  )}
                </>
              )}
              {!left.code && !left.customLabel && !left.loading && (
                <div className={styles.placeholder}>{t.comparison.selectCountry}</div>
              )}
            </div>

            {/* Right panel */}
            <div className={styles.panel}>
              {rightPopulationData && right.data && (
                <div className={styles.panelToolbar}>
                  <SettingsButton onClick={() => compSettings.openSettings('right')} />
                </div>
              )}
              {right.loading && <div className={styles.loading}><div className={styles.spinner} /></div>}
              {right.error && <div className={styles.error}>{right.error}</div>}
              {rightPopulationData && right.data && (
                <>
                  <PopulationPyramid
                    data={rightPopulationData}
                    theme={theme}
                    customTitle={rightChartTitle}
                    maxScale={sharedMaxScale}
                    showAsPercentage={showAsPercentage || compSettings.right.showAsPercentage}
                    viewMode={compSettings.right.viewMode}
                    colorProfile={compSettings.right.colorProfile}
                    showMedianLine={compSettings.right.showMedianLine}
                    showBarLabels={compSettings.right.showBarLabels}
                    showTotal={compSettings.right.showTotal}
                    yAxisInterval={getYAxisInterval(compSettings.right.yAxisLabelMode)}
                    xAxisSplitCount={compSettings.right.xAxisSplitCount}
                  />
                  {!yearsForSync && (
                    <YearSelector
                      years={right.data.years}
                      selectedYear={right.year}
                      onYearChange={handleRightYearChange}
                      compact
                    />
                  )}
                </>
              )}
              {!right.code && !right.customLabel && !right.loading && (
                <div className={styles.placeholder}>{t.comparison.selectCountry}</div>
              )}
            </div>
          </div>

          {/* Left settings panel */}
          <ChartSettingsPanel
            isOpen={compSettings.settingsOpenFor === 'left'}
            onClose={compSettings.closeSettings}
          >
            <SettingsSection title={t.settings.displayFormat}>
              <ViewModeToggle
                mode={compSettings.left.viewMode}
                onChange={mode => compSettings.updateLeft({ viewMode: mode })}
              />
            </SettingsSection>
            <SettingsSection title={t.settings.colorProfile}>
              <ColorProfileSelector
                value={compSettings.left.colorProfile}
                onChange={colorProfile => compSettings.updateLeft({ colorProfile })}
              />
            </SettingsSection>
            <SettingsSection title={t.settings.additional}>
              <ToggleSetting
                label={t.settings.showMedianLine}
                checked={compSettings.left.showMedianLine}
                onChange={showMedianLine => compSettings.updateLeft({ showMedianLine })}
              />
              <ToggleSetting
                label={t.settings.barLabels}
                checked={compSettings.left.showBarLabels}
                onChange={showBarLabels => compSettings.updateLeft({ showBarLabels })}
              />
              <ToggleSetting
                label={t.settings.showTotal}
                checked={compSettings.left.showTotal}
                onChange={showTotal => compSettings.updateLeft({ showTotal })}
              />
              <ToggleSetting
                label={t.settings.showAsPercentage}
                checked={compSettings.left.showAsPercentage}
                onChange={showAsPercentage => compSettings.updateLeft({ showAsPercentage })}
              />
            </SettingsSection>
            <SettingsSection title={t.settings.yAxisLabels}>
              <YAxisLabelConfig
                mode={compSettings.left.yAxisLabelMode}
                onChange={yAxisLabelMode => compSettings.updateLeft({ yAxisLabelMode })}
              />
            </SettingsSection>
            <SettingsSection title={t.settings.xAxisDivisions}>
              <XAxisSplitConfig
                value={compSettings.left.xAxisSplitCount}
                onChange={xAxisSplitCount => compSettings.updateLeft({ xAxisSplitCount })}
              />
            </SettingsSection>
          </ChartSettingsPanel>

          {/* Right settings panel */}
          <ChartSettingsPanel
            isOpen={compSettings.settingsOpenFor === 'right'}
            onClose={compSettings.closeSettings}
          >
            <SettingsSection title={t.settings.displayFormat}>
              <ViewModeToggle
                mode={compSettings.right.viewMode}
                onChange={mode => compSettings.updateRight({ viewMode: mode })}
              />
            </SettingsSection>
            <SettingsSection title={t.settings.colorProfile}>
              <ColorProfileSelector
                value={compSettings.right.colorProfile}
                onChange={colorProfile => compSettings.updateRight({ colorProfile })}
              />
            </SettingsSection>
            <SettingsSection title={t.settings.additional}>
              <ToggleSetting
                label={t.settings.showMedianLine}
                checked={compSettings.right.showMedianLine}
                onChange={showMedianLine => compSettings.updateRight({ showMedianLine })}
              />
              <ToggleSetting
                label={t.settings.barLabels}
                checked={compSettings.right.showBarLabels}
                onChange={showBarLabels => compSettings.updateRight({ showBarLabels })}
              />
              <ToggleSetting
                label={t.settings.showTotal}
                checked={compSettings.right.showTotal}
                onChange={showTotal => compSettings.updateRight({ showTotal })}
              />
              <ToggleSetting
                label={t.settings.showAsPercentage}
                checked={compSettings.right.showAsPercentage}
                onChange={showAsPercentage => compSettings.updateRight({ showAsPercentage })}
              />
            </SettingsSection>
            <SettingsSection title={t.settings.yAxisLabels}>
              <YAxisLabelConfig
                mode={compSettings.right.yAxisLabelMode}
                onChange={yAxisLabelMode => compSettings.updateRight({ yAxisLabelMode })}
              />
            </SettingsSection>
            <SettingsSection title={t.settings.xAxisDivisions}>
              <XAxisSplitConfig
                value={compSettings.right.xAxisSplitCount}
                onChange={xAxisSplitCount => compSettings.updateRight({ xAxisSplitCount })}
              />
            </SettingsSection>
          </ChartSettingsPanel>

          {/* Shared year selector when synced */}
          {yearsForSync && (
            <div className={styles.sharedTimeline}>
              <YearSelector
                years={yearsForSync}
                selectedYear={left.year}
                onYearChange={handleLeftYearChange}
                compact
              />
            </div>
          )}
        </>
      ) : (
        <div className={styles.overlayContainer}>
          {left.loading || right.loading ? (
            <div className={styles.loading}><div className={styles.spinner} /></div>
          ) : leftPopulationData && rightPopulationData ? (
            <>
              <div className={styles.panelToolbar}>
                <SettingsButton onClick={() => compSettings.openSettings('overlay')} />
              </div>
              {viewMode === 'overlay' ? (
                <OverlayPyramid
                  leftData={leftPopulationData}
                  rightData={rightPopulationData}
                  leftName={leftChartTitle}
                  rightName={rightChartTitle}
                  theme={theme}
                  maxScale={sharedMaxScale}
                  showAsPercentage={showAsPercentage}
                  customColors={compSettings.overlay.colors}
                  yAxisInterval={getYAxisInterval(compSettings.overlay.yAxisLabelMode)}
                  xAxisSplitCount={compSettings.overlay.xAxisSplitCount}
                />
              ) : (
                <DifferencePyramid
                  leftData={leftPopulationData}
                  rightData={rightPopulationData}
                  leftName={leftChartTitle}
                  rightName={rightChartTitle}
                  theme={theme}
                  showAsPercentage={showAsPercentage}
                  customColors={compSettings.overlay.colors}
                  yAxisInterval={getYAxisInterval(compSettings.overlay.yAxisLabelMode)}
                  xAxisSplitCount={compSettings.overlay.xAxisSplitCount}
                />
              )}
              {/* Shared year selector when synced, or two selectors */}
              {yearsForSync ? (
                <YearSelector
                  years={yearsForSync}
                  selectedYear={left.year}
                  onYearChange={handleLeftYearChange}
                  compact
                />
              ) : (
                <div className={styles.overlayYears}>
                  {left.data && (
                    <div className={styles.overlayYearItem}>
                      <span className={styles.overlayYearLabel}>{leftName}</span>
                      <YearSelector
                      years={left.data.years}
                      selectedYear={left.year}
                      onYearChange={handleLeftYearChange}
                      compact
                    />
                    </div>
                  )}
                  {right.data && (
                    <div className={styles.overlayYearItem}>
                      <span className={styles.overlayYearLabel}>{rightName}</span>
                      <YearSelector
                      years={right.data.years}
                      selectedYear={right.year}
                      onYearChange={handleRightYearChange}
                      compact
                    />
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className={styles.placeholder}>
              {t.comparison.selectCountry}
            </div>
          )}

          {/* Overlay settings panel */}
          <ChartSettingsPanel
            isOpen={compSettings.settingsOpenFor === 'overlay'}
            onClose={compSettings.closeSettings}
          >
            <SettingsSection title={t.settings.colorProfile}>
              <OverlayColorPicker
                leftMaleColor={compSettings.overlay.colors.leftMaleColor}
                leftFemaleColor={compSettings.overlay.colors.leftFemaleColor}
                rightMaleColor={compSettings.overlay.colors.rightMaleColor}
                rightFemaleColor={compSettings.overlay.colors.rightFemaleColor}
                leftName={leftName || t.comparison.left}
                rightName={rightName || t.comparison.right}
                onChangeLeftMale={c => compSettings.updateOverlayColors({ leftMaleColor: c })}
                onChangeLeftFemale={c => compSettings.updateOverlayColors({ leftFemaleColor: c })}
                onChangeRightMale={c => compSettings.updateOverlayColors({ rightMaleColor: c })}
                onChangeRightFemale={c => compSettings.updateOverlayColors({ rightFemaleColor: c })}
              />
            </SettingsSection>
            <SettingsSection title={t.settings.yAxisLabels}>
              <YAxisLabelConfig
                mode={compSettings.overlay.yAxisLabelMode}
                onChange={yAxisLabelMode => compSettings.updateOverlay({ yAxisLabelMode })}
              />
            </SettingsSection>
            <SettingsSection title={t.settings.xAxisDivisions}>
              <XAxisSplitConfig
                value={compSettings.overlay.xAxisSplitCount}
                onChange={xAxisSplitCount => compSettings.updateOverlay({ xAxisSplitCount })}
              />
            </SettingsSection>
          </ChartSettingsPanel>
        </div>
      )}
    </div>
  );
}
