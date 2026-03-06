import { useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { useI18n } from '../i18n';
import { useComparisonData } from '../hooks/useComparisonData';
import { COUNTRIES } from '../data/countries';
import { getLocalizedCountryName } from '../utils/localizedCountryName';
import { CountrySelector } from '../components/features/CountrySelector';
import { PopulationPyramid } from '../components/features/PopulationPyramid/PopulationPyramid';
import { OverlayPyramid } from '../components/features/OverlayPyramid';
import { YearSelector } from '../components/common/YearSelector';
import { parsePopulationFile } from '../services/fileParser';
import type { Theme } from '../hooks';
import styles from './ComparePage.module.css';

type ViewMode = 'side-by-side' | 'overlay';

interface ComparePageProps {
  theme: Theme;
}

export function ComparePage({ theme }: ComparePageProps) {
  const { left: leftParam, right: rightParam } = useParams<{ left?: string; right?: string }>();
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');

  const {
    left, right,
    setLeftCode, setRightCode,
    setLeftCustomData, setRightCustomData,
    setLeftYear, setRightYear,
    swap, reset,
    syncYears, setSyncYears,
    matchScale, setMatchScale,
    commonYears,
    leftPopulationData, rightPopulationData,
    sharedMaxScale,
  } = useComparisonData();

  // Sync URL params -> state (on mount / param change)
  useEffect(() => {
    const lCode = leftParam?.toUpperCase() ?? null;
    const rCode = rightParam?.toUpperCase() ?? null;
    const lValid = lCode && COUNTRIES.some(c => c.code === lCode) ? lCode : null;
    const rValid = rCode && COUNTRIES.some(c => c.code === rCode) ? rCode : null;

    if (lValid !== left.code) setLeftCode(lValid);
    if (rValid !== right.code) setRightCode(rValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftParam, rightParam]);

  // Sync state -> URL
  const updateUrl = (lCode: string | null, rCode: string | null) => {
    if (lCode && rCode) {
      navigate(`/compare/${lCode}/${rCode}`, { replace: true });
    } else if (lCode) {
      navigate(`/compare/${lCode}`, { replace: true });
    } else if (rCode) {
      navigate(`/compare/${rCode}`, { replace: true });
    } else {
      navigate('/compare', { replace: true });
    }
  };

  const handleLeftChange = (code: string | null) => {
    setLeftCode(code);
    updateUrl(code, right.code);
  };

  const handleRightChange = (code: string | null) => {
    setRightCode(code);
    updateUrl(left.code, code);
  };

  const handleSwap = () => {
    swap();
    updateUrl(right.code, left.code);
  };

  const handleReset = () => {
    reset();
    navigate('/compare', { replace: true });
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
    const c = COUNTRIES.find(c => c.code === code);
    if (!c) return code;
    return getLocalizedCountryName(c.code, language, c.name);
  };

  const leftName = left.code ? getCountryName(left.code) : (left.customLabel || '');
  const rightName = right.code ? getCountryName(right.code) : (right.customLabel || '');

  const hasAnyData = left.data || right.data || left.customLabel || right.customLabel;
  const yearsForSync = syncYears && commonYears.length > 0 ? commonYears : undefined;

  return (
    <div className={styles.page}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeButton} ${viewMode === 'side-by-side' ? styles.modeButtonActive : ''}`}
            onClick={() => setViewMode('side-by-side')}
            type="button"
          >
            {t.comparison.sideBySide}
          </button>
          <button
            className={`${styles.modeButton} ${viewMode === 'overlay' ? styles.modeButtonActive : ''}`}
            onClick={() => setViewMode('overlay')}
            type="button"
          >
            {t.comparison.overlay}
          </button>
        </div>

        <div className={styles.toggles}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={syncYears}
              onChange={e => setSyncYears(e.target.checked)}
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
            <path d="M7 16V4m0 0L3 8m4-4l4 4" />
            <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>

        {/* Reset button */}
        <button
          className={styles.iconButton}
          onClick={handleReset}
          type="button"
          title={t.comparison.reset ?? 'Reset'}
          disabled={!hasAnyData}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
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
          label={t.comparison.left}
          customLabel={left.customLabel}
          onFileUpload={handleLeftFile}
        />
        <CountrySelector
          value={right.code}
          onChange={handleRightChange}
          excludeCode={left.code}
          label={t.comparison.right}
          customLabel={right.customLabel}
          onFileUpload={handleRightFile}
        />
      </div>

      {/* Content area */}
      {viewMode === 'side-by-side' ? (
        <>
          <div className={styles.sideBySide}>
            {/* Left panel */}
            <div className={styles.panel}>
              {left.loading && <div className={styles.loading}><div className={styles.spinner} /></div>}
              {left.error && <div className={styles.error}>{left.error}</div>}
              {leftPopulationData && left.data && (
                <>
                  <PopulationPyramid
                    data={leftPopulationData}
                    theme={theme}
                    customTitle={leftName}
                    maxScale={sharedMaxScale}
                  />
                  {/* Individual year selector only when NOT synced */}
                  {!yearsForSync && (
                    <YearSelector
                      years={left.data.years}
                      selectedYear={left.year}
                      onYearChange={setLeftYear}
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
              {right.loading && <div className={styles.loading}><div className={styles.spinner} /></div>}
              {right.error && <div className={styles.error}>{right.error}</div>}
              {rightPopulationData && right.data && (
                <>
                  <PopulationPyramid
                    data={rightPopulationData}
                    theme={theme}
                    customTitle={rightName}
                    maxScale={sharedMaxScale}
                  />
                  {/* Individual year selector only when NOT synced */}
                  {!yearsForSync && (
                    <YearSelector
                      years={right.data.years}
                      selectedYear={right.year}
                      onYearChange={setRightYear}
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

          {/* Shared year selector when synced */}
          {yearsForSync && (
            <div className={styles.sharedTimeline}>
              <YearSelector
                years={yearsForSync}
                selectedYear={left.year}
                onYearChange={setLeftYear}
                compact
              />
            </div>
          )}
        </>
      ) : (
        /* Overlay mode */
        <div className={styles.overlayContainer}>
          {left.loading || right.loading ? (
            <div className={styles.loading}><div className={styles.spinner} /></div>
          ) : leftPopulationData && rightPopulationData ? (
            <>
              <OverlayPyramid
                leftData={leftPopulationData}
                rightData={rightPopulationData}
                leftName={leftName}
                rightName={rightName}
                theme={theme}
                maxScale={sharedMaxScale}
              />
              {/* Shared year selector when synced, or two selectors */}
              {yearsForSync ? (
                <YearSelector
                  years={yearsForSync}
                  selectedYear={left.year}
                  onYearChange={setLeftYear}
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
                        onYearChange={setLeftYear}
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
                        onYearChange={setRightYear}
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
        </div>
      )}
    </div>
  );
}
