import { useI18n } from '../../../i18n';
import styles from './YAxisLabelConfig.module.css';

export type YAxisLabelMode = 'all' | 'every2' | 'every5' | 'every10';

interface YAxisLabelConfigProps {
  /** Текущий режим */
  mode: YAxisLabelMode;
  /** Callback при изменении */
  onChange: (mode: YAxisLabelMode) => void;
}

/**
 * Компонент настройки отображения меток оси Y
 */
export function YAxisLabelConfig({ mode, onChange }: YAxisLabelConfigProps) {
  const { t } = useI18n();
  
  const OPTIONS: Array<{ value: YAxisLabelMode; label: string; hint: string }> = [
    { value: 'all', label: t.yAxis.all, hint: t.yAxis.allHint },
    { value: 'every2', label: t.yAxis.every2, hint: t.yAxis.every2Hint },
    { value: 'every5', label: t.yAxis.every5, hint: t.yAxis.every5Hint },
    { value: 'every10', label: t.yAxis.every10, hint: t.yAxis.every10Hint },
  ];

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

