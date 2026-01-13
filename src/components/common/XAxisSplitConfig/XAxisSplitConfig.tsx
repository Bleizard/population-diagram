import { useI18n } from '../../../i18n';
import styles from './XAxisSplitConfig.module.css';

interface XAxisSplitConfigProps {
  /** Текущее значение (количество делений) */
  value: number;
  /** Callback при изменении */
  onChange: (value: number) => void;
}

const OPTIONS = [2, 3, 4, 5, 6, 8, 10];

/**
 * Компонент настройки количества делений оси X
 */
export function XAxisSplitConfig({ value, onChange }: XAxisSplitConfigProps) {
  const { t } = useI18n();
  
  return (
    <div className={styles.container}>
      <div className={styles.options}>
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            className={`${styles.option} ${value === opt ? styles.active : ''}`}
            onClick={() => onChange(opt)}
            type="button"
          >
            {opt}
          </button>
        ))}
      </div>
      <div className={styles.hint}>
        {t.settings.gridLinesHint}
      </div>
    </div>
  );
}

