import styles from './YAxisLabelConfig.module.css';

export type YAxisLabelMode = 'all' | 'every2' | 'every5' | 'every10';

interface YAxisLabelConfigProps {
  /** Текущий режим */
  mode: YAxisLabelMode;
  /** Callback при изменении */
  onChange: (mode: YAxisLabelMode) => void;
}

const OPTIONS: Array<{ value: YAxisLabelMode; label: string; hint: string }> = [
  { value: 'all', label: 'All', hint: 'every age' },
  { value: 'every2', label: 'Every 2nd', hint: '0, 2, 4...' },
  { value: 'every5', label: 'Multiple of 5', hint: '0, 5, 10...' },
  { value: 'every10', label: 'Multiple of 10', hint: '0, 10, 20...' },
];

/**
 * Компонент настройки отображения меток оси Y
 */
export function YAxisLabelConfig({ mode, onChange }: YAxisLabelConfigProps) {
  return (
    <div className={styles.container}>
      <div className={styles.options}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`${styles.option} ${mode === opt.value ? styles.active : ''}`}
            onClick={() => onChange(opt.value)}
            type="button"
          >
            {opt.label}
            <span className={styles.hint}>{opt.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Вычисляет интервал для меток оси Y
 */
export function getYAxisInterval(mode: YAxisLabelMode): number | 'auto' | ((index: number, value: string) => boolean) {
  switch (mode) {
    case 'every2':
      return 1; // Показываем каждый второй (интервал = 1 означает пропуск 1)
    case 'every5':
      return (index: number, value: string) => {
        const num = parseInt(value, 10);
        return !isNaN(num) && num % 5 === 0;
      };
    case 'every10':
      return (index: number, value: string) => {
        const num = parseInt(value, 10);
        return !isNaN(num) && num % 10 === 0;
      };
    case 'all':
    default:
      return 0; // Показываем все
  }
}

