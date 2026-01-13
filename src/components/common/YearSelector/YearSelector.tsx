import { useMemo } from 'react';
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
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value, 10);
    onYearChange(years[index]);
  };

  const handlePrev = () => {
    const currentIndex = years.indexOf(selectedYear);
    if (currentIndex > 0) {
      onYearChange(years[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    const currentIndex = years.indexOf(selectedYear);
    if (currentIndex < years.length - 1) {
      onYearChange(years[currentIndex + 1]);
    }
  };

  const currentIndex = years.indexOf(selectedYear);
  
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
        <button
          className={styles.navButton}
          onClick={handlePrev}
          disabled={currentIndex === 0}
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
          disabled={currentIndex === years.length - 1}
          aria-label={t.yearSelector.next}
        >
          ▶
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

