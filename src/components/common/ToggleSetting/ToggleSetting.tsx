import styles from './ToggleSetting.module.css';

interface ToggleSettingProps {
  /** Текст метки */
  label: string;
  /** Описание (опционально) */
  description?: string;
  /** Текущее значение */
  checked: boolean;
  /** Callback при изменении */
  onChange: (checked: boolean) => void;
}

/**
 * Компонент переключателя для настроек
 */
export function ToggleSetting({ 
  label, 
  description, 
  checked, 
  onChange 
}: ToggleSettingProps) {
  return (
    <label className={styles.container}>
      <div className={styles.info}>
        <span className={styles.label}>{label}</span>
        {description && <span className={styles.description}>{description}</span>}
      </div>
      <div className={styles.toggle}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={styles.input}
        />
        <span className={styles.slider} />
      </div>
    </label>
  );
}

