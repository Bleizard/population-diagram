import { useMemo, useState, useEffect, useCallback } from 'react';
import { useI18n } from '../../../i18n';
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
export function YearSelector({ years, selectedYear, onYearChange, compact = false }: YearSelectorProps) {
  const { t } = useI18n();
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  
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
          {compact && (
            <span className={styles.compactYear}>{selectedYear}</span>
          )}
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
        >
          {speed}x
        </button>
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
