import { useState, useCallback, useEffect } from 'react';
import { useI18n } from '../../../i18n';
import styles from './ChartTitleInput.module.css';

interface ChartTitleInputProps {
  /** Текущее значение заголовка */
  value: string;
  /** Исходное название (из файла) */
  originalTitle: string;
  /** Callback при изменении */
  onChange: (value: string) => void;
}

/**
 * Поле ввода для кастомного названия графика
 */
export function ChartTitleInput({ 
  value, 
  originalTitle, 
  onChange 
}: ChartTitleInputProps) {
  const { t } = useI18n();
  const [localValue, setLocalValue] = useState(value);
  
  // Синхронизация с внешним значением
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  const handleBlur = useCallback(() => {
    onChange(localValue);
  }, [localValue, onChange]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onChange(localValue);
      (e.target as HTMLInputElement).blur();
    }
  }, [localValue, onChange]);
  
  const handleReset = useCallback(() => {
    setLocalValue('');
    onChange('');
  }, [onChange]);
  
  const isCustom = localValue.trim() !== '';
  const displayPlaceholder = originalTitle || t.settings.enterTitle;

  return (
    <div className={styles.container}>
      <div className={styles.inputWrapper}>
        <input
          type="text"
          className={styles.input}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={displayPlaceholder}
        />
        {isCustom && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={handleReset}
            aria-label={t.settings.resetTitle}
            title={t.settings.resetTitle}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {originalTitle && (
        <div className={styles.hint}>
          <span className={styles.hintLabel}>{t.settings.fromFile}</span>
          <span className={styles.hintValue}>{originalTitle}</span>
        </div>
      )}
    </div>
  );
}

