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
    syncYears, setSyncYears,
    matchScale, setMatchScale,
    commonYears,
    leftPopulationData, rightPopulationData,
    sharedMaxScale,
  } = useComparisonData();

  // Sync URL params → state (on mount / param change)
  useEffect(() => {
    const lCode = leftParam?.toUpperCase() ?? null;
    const rCode = rightParam?.toUpperCase() ?? null;
    const lValid = lCode && COUNTRIES.some(c => c.code === lCode) ? lCode : null;
    const rValid = rCode && COUNTRIES.some(c => c.code === rCode) ? rCode : null;

    if (lValid !== left.code) setLeftCode(lValid);
    if (rValid !== right.code) setRightCode(rValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftParam, rightParam]);

  // Sync state → URL
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
        // Clear code from URL since it's a custom file
        updateUrl(null, right.code);
      }
    } catch {
      // Parse error — silently ignore, user will see no data
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

  const yearsForSelector = syncYears && commonYears.length > 0 ? commonYears : undefined;

  return (
    <div className={styles.page}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <Link to="/countries" className={styles.exitButton}>
          {t.comparison.exit}
        </Link>

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
                <YearSelector
                  years={yearsForSelector ?? left.data.years}
                  selectedYear={left.year}
                  onYearChange={setLeftYear}
                  compact
                />
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
                <YearSelector
                  years={yearsForSelector ?? right.data.years}
                  selectedYear={right.year}
                  onYearChange={setRightYear}
                  compact
                />
              </>
            )}
            {!right.code && !right.customLabel && !right.loading && (
              <div className={styles.placeholder}>{t.comparison.selectCountry}</div>
            )}
          </div>
        </div>
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
              {syncYears && commonYears.length > 0 ? (
                <YearSelector
                  years={commonYears}
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
