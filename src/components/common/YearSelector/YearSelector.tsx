import { useI18n } from '../../../i18n';
import styles from './YearSelector.module.css';

interface YearSelectorProps {
  /** Список доступных годов */
  years: number[];
  /** Текущий выбранный год */
  selectedYear: number;
  /** Обработчик изменения года */
  onYearChange: (year: number) => void;
}

/**
 * Компонент для выбора года из временного ряда
 */
export function YearSelector({ years, selectedYear, onYearChange }: YearSelectorProps) {
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>{t.yearSelector.label}</span>
        <span className={styles.yearDisplay}>{selectedYear}</span>
      </div>
      
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
            {years.map((year, index) => (
              <span
                key={year}
                className={`${styles.yearMark} ${year === selectedYear ? styles.active : ''}`}
                style={{ left: `${(index / (years.length - 1)) * 100}%` }}
              >
                {year}
              </span>
            ))}
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
      
      <div className={styles.info}>
        {t.yearSelector.dataFrom} {years[0]} {t.yearSelector.dataTo} {years[years.length - 1]}
        <span className={styles.count}>({years.length} {t.yearSelector.years})</span>
      </div>
    </div>
  );
}

