import { useMemo, useState, useEffect, useCallback } from 'react';
import { useI18n } from '../../../i18n';
import { exportToGif, downloadGif, calculateFrameDelay } from '../../../services/gifExporter';
import styles from './YearSelector.module.css';

interface YearSelectorProps {
  /** Список доступных годов */
  years: number[];
  /** Текущий выбранный год */
  selectedYear: number;
  /** Обработчик изменения года */
  onYearChange: (year: number) => void;
  /** Компактный режим (без заголовка и информации) */
  compact?: boolean;
  /** Название графика (для имени файла при экспорте) */
  chartTitle?: string;
  /** Функция для получения canvas графика для заданного года */
  getChartCanvas?: (year: number) => Promise<HTMLCanvasElement>;
}

/** Доступные скорости воспроизведения */
const PLAYBACK_SPEEDS = [0.5, 1, 2, 3, 5] as const;
type PlaybackSpeed = typeof PLAYBACK_SPEEDS[number];

/**
 * Вычисляет интервал отображения меток годов
 */
function getYearLabelInterval(totalYears: number): number {
  if (totalYears <= 10) return 1;
  if (totalYears <= 20) return 2;
  if (totalYears <= 30) return 5;
  if (totalYears <= 60) return 10;
  return 20;
}

/**
 * Компонент для выбора года из временного ряда
 */
export function YearSelector({ 
  years, 
  selectedYear, 
  onYearChange, 
  compact = false,
  chartTitle,
  getChartCanvas,
}: YearSelectorProps) {
  const { t } = useI18n();
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportingYear, setExportingYear] = useState<number | null>(null);
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value, 10);
    onYearChange(years[index]);
  };

  const handlePrev = useCallback(() => {
    const currentIndex = years.indexOf(selectedYear);
    if (currentIndex > 0) {
      onYearChange(years[currentIndex - 1]);
    }
  }, [years, selectedYear, onYearChange]);

  const handleNext = useCallback(() => {
    const currentIndex = years.indexOf(selectedYear);
    if (currentIndex < years.length - 1) {
      onYearChange(years[currentIndex + 1]);
      return true; // есть ещё годы
    }
    return false; // достигли конца
  }, [years, selectedYear, onYearChange]);

  const currentIndex = years.indexOf(selectedYear);
  const isAtEnd = currentIndex === years.length - 1;
  const isAtStart = currentIndex === 0;
  
  // Автоматическое воспроизведение
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      const hasMore = handleNext();
      if (!hasMore) {
        setIsPlaying(false);
      }
    }, 1000 / speed);
    
    return () => clearInterval(interval);
  }, [isPlaying, speed, handleNext]);

  // Остановка при достижении конца
  useEffect(() => {
    if (isAtEnd && isPlaying) {
      setIsPlaying(false);
    }
  }, [isAtEnd, isPlaying]);

  const togglePlay = () => {
    if (isAtEnd) {
      // Если в конце, начинаем сначала
      onYearChange(years[0]);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const cycleSpeed = () => {
    const currentIdx = PLAYBACK_SPEEDS.indexOf(speed);
    const nextIdx = (currentIdx + 1) % PLAYBACK_SPEEDS.length;
    setSpeed(PLAYBACK_SPEEDS[nextIdx]);
  };

  // Экспорт в GIF
  const handleExportGif = useCallback(async () => {
    if (!getChartCanvas || isExporting) return;
    
    setIsExporting(true);
    setExportProgress(0);
    setExportingYear(years[0]);
    
    // Сохраняем текущий год чтобы восстановить потом
    const originalYear = selectedYear;
    
    try {
      const result = await exportToGif({
        years,
        frameDelay: calculateFrameDelay(speed),
        quality: 10,
        onProgress: (progress, currentYear) => {
          setExportProgress(Math.round(progress));
          setExportingYear(currentYear);
        },
        getChartCanvas: async (year) => {
          // Переключаем год и ждём обновления графика
          onYearChange(year);
          // Небольшая задержка для рендеринга
          await new Promise(resolve => setTimeout(resolve, 100));
          return getChartCanvas(year);
        },
      });
      
      // Скачиваем GIF
      const filename = `${chartTitle || 'population-pyramid'}-${years[0]}-${years[years.length - 1]}.gif`;
      downloadGif(result.url, filename.replace(/\s+/g, '_'));
      
      // Освобождаем URL
      setTimeout(() => URL.revokeObjectURL(result.url), 1000);
    } catch (error) {
      console.error('GIF export failed:', error);
    } finally {
      // Восстанавливаем оригинальный год
      onYearChange(originalYear);
      setIsExporting(false);
      setExportProgress(0);
      setExportingYear(null);
    }
  }, [getChartCanvas, isExporting, years, speed, selectedYear, onYearChange, chartTitle]);
  
  // Определяем какие года показывать
  const labelInterval = useMemo(() => getYearLabelInterval(years.length), [years.length]);
  
  const visibleYears = useMemo(() => {
    const startYear = years[0];
    return years.filter((year, index) => {
      // Всегда показываем первый и последний год
      if (index === 0 || index === years.length - 1) return true;
      // Показываем каждый N-й год, кратный интервалу
      return (year - startYear) % labelInterval === 0;
    });
  }, [years, labelInterval]);

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
      {!compact && (
        <div className={styles.header}>
          <span className={styles.label}>{t.yearSelector.label}</span>
          <span className={styles.yearDisplay}>{selectedYear}</span>
        </div>
      )}
      
      {/* Год по центру всего контейнера */}
      {compact && (
        <span className={styles.compactYear}>{selectedYear}</span>
      )}
      
      <div className={styles.controls}>
        {/* Play/Pause button */}
        <button
          className={`${styles.navButton} ${styles.playButton} ${isPlaying ? styles.playing : ''}`}
          onClick={togglePlay}
          aria-label={isPlaying ? t.yearSelector.pause : t.yearSelector.play}
          title={isPlaying ? t.yearSelector.pause : t.yearSelector.play}
        >
          {isPlaying ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          className={styles.navButton}
          onClick={handlePrev}
          disabled={isAtStart || isPlaying}
          aria-label={t.yearSelector.previous}
        >
          ◀
        </button>
        
        <div className={styles.sliderContainer}>
          <div className={styles.sliderWrapper}>
            <div 
              className={styles.sliderProgress}
              style={{ width: `${(currentIndex / (years.length - 1)) * 100}%` }}
            />
            <input
              type="range"
              className={styles.slider}
              min={0}
              max={years.length - 1}
              value={currentIndex}
              onChange={handleSliderChange}
              aria-label={t.yearSelector.label}
              disabled={isPlaying}
            />
          </div>
          <div className={styles.yearMarks}>
            {visibleYears.map((year) => {
              const index = years.indexOf(year);
              return (
                <span
                  key={year}
                  className={`${styles.yearMark} ${year === selectedYear ? styles.active : ''}`}
                  style={{ left: `${(index / (years.length - 1)) * 100}%` }}
                >
                  {year}
                </span>
              );
            })}
          </div>
        </div>
        
        <button
          className={styles.navButton}
          onClick={handleNext}
          disabled={isAtEnd || isPlaying}
          aria-label={t.yearSelector.next}
        >
          ▶
        </button>

        {/* Speed button */}
        <button
          className={`${styles.navButton} ${styles.speedButton}`}
          onClick={cycleSpeed}
          aria-label={t.yearSelector.speed}
          title={t.yearSelector.speed}
          disabled={isExporting}
        >
          {speed}x
        </button>

        {/* GIF Export button */}
        {getChartCanvas && (
          <button
            className={`${styles.navButton} ${styles.gifButton} ${isExporting ? styles.exporting : ''}`}
            onClick={handleExportGif}
            disabled={isExporting || isPlaying}
            aria-label={t.yearSelector.exportGif}
            title={isExporting 
              ? `${t.yearSelector.exporting} ${exportProgress}% (${exportingYear})`
              : t.yearSelector.exportGif
            }
          >
            {isExporting ? (
              <div className={styles.exportProgress}>
                <svg className={styles.spinner} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
                </svg>
                <span className={styles.progressText}>{exportProgress}%</span>
              </div>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M8 12h8" />
                <path d="M12 8v8" />
                <circle cx="7" cy="7" r="1" fill="currentColor" />
                <circle cx="17" cy="7" r="1" fill="currentColor" />
              </svg>
            )}
          </button>
        )}
      </div>
      
      {!compact && (
        <div className={styles.info}>
          {t.yearSelector.dataFrom} {years[0]} {t.yearSelector.dataTo} {years[years.length - 1]}
          <span className={styles.count}>({years.length} {t.yearSelector.years})</span>
        </div>
      )}
    </div>
  );
}
