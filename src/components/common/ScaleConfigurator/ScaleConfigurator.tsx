import { useState, useCallback, useEffect } from 'react';
import styles from './ScaleConfigurator.module.css';

export type ScaleMode = 'auto' | 'fit' | 'custom';

export interface ScaleConfig {
  mode: ScaleMode;
  customValue?: number;
}

interface ScaleConfiguratorProps {
  /** Текущая конфигурация */
  config: ScaleConfig;
  /** Callback при изменении конфигурации */
  onChange: (config: ScaleConfig) => void;
  /** Реальное максимальное значение из данных */
  dataMaxValue: number;
}

/**
 * Компонент для настройки масштаба горизонтальной оси
 */
export function ScaleConfigurator({
  config,
  onChange,
  dataMaxValue,
}: ScaleConfiguratorProps) {
  const [customInput, setCustomInput] = useState(
    config.customValue?.toString() || ''
  );

  // Синхронизируем input при внешнем изменении
  useEffect(() => {
    if (config.mode === 'custom' && config.customValue) {
      setCustomInput(formatNumberForInput(config.customValue));
    }
  }, [config.customValue, config.mode]);

  const handleModeChange = useCallback(
    (mode: ScaleMode) => {
      if (mode === 'custom') {
        // При переключении на custom, предлагаем текущий максимум
        const suggestedValue = Math.ceil(dataMaxValue / 100000) * 100000;
        setCustomInput(formatNumberForInput(suggestedValue));
        onChange({ mode, customValue: suggestedValue });
      } else {
        onChange({ mode });
      }
    },
    [onChange, dataMaxValue]
  );

  const handleCustomValueChange = useCallback(
    (value: string) => {
      setCustomInput(value);
      const numValue = parseInputNumber(value);
      if (numValue > 0) {
        onChange({ mode: 'custom', customValue: numValue });
      }
    },
    [onChange]
  );

  // Показываем реальный максимум и текущий масштаб
  const currentScale = calculateScale(config, dataMaxValue);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 6H3" />
          <path d="M10 12H3" />
          <path d="M10 18H3" />
          <circle cx="17" cy="15" r="3" />
          <path d="m21 19-1.9-1.9" />
        </svg>
        <span className={styles.label}>Масштаб оси X:</span>
      </div>

      <div className={styles.options}>
        <button
          className={`${styles.option} ${config.mode === 'auto' ? styles.active : ''}`}
          onClick={() => handleModeChange('auto')}
          type="button"
        >
          Авто
          <span className={styles.optionHint}>округление</span>
        </button>

        <button
          className={`${styles.option} ${config.mode === 'fit' ? styles.active : ''}`}
          onClick={() => handleModeChange('fit')}
          type="button"
        >
          По данным
          <span className={styles.optionHint}>+10%</span>
        </button>

        <button
          className={`${styles.option} ${config.mode === 'custom' ? styles.active : ''}`}
          onClick={() => handleModeChange('custom')}
          type="button"
        >
          Вручную
        </button>
      </div>

      {config.mode === 'custom' && (
        <div className={styles.customInput}>
          <label className={styles.inputLabel}>Максимум:</label>
          <input
            type="text"
            value={customInput}
            onChange={(e) => handleCustomValueChange(e.target.value)}
            placeholder="1 500 000"
            className={styles.input}
          />
        </div>
      )}

      <div className={styles.info}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Макс. в данных:</span>
          <span className={styles.infoValue}>{formatNumber(dataMaxValue)}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Шкала до:</span>
          <span className={styles.infoValue}>{formatNumber(currentScale)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Вычисляет масштаб на основе конфигурации
 */
export function calculateScale(config: ScaleConfig, dataMaxValue: number): number {
  switch (config.mode) {
    case 'fit':
      // +10% от максимума, округлённое до красивого числа
      return roundToNiceNumber(dataMaxValue * 1.1, true);
    case 'custom':
      return config.customValue || dataMaxValue;
    case 'auto':
    default:
      return roundToNiceNumber(dataMaxValue, false);
  }
}

/**
 * Округляет число до "красивого" значения
 * @param tight - если true, округляет ближе к значению
 */
function roundToNiceNumber(value: number, tight: boolean = false): number {
  if (value === 0) return 100;

  const orderOfMagnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / orderOfMagnitude;

  let niceNormalized: number;
  
  if (tight) {
    // Более плотное округление
    if (normalized <= 1.2) {
      niceNormalized = 1.2;
    } else if (normalized <= 1.5) {
      niceNormalized = 1.5;
    } else if (normalized <= 2) {
      niceNormalized = 2;
    } else if (normalized <= 2.5) {
      niceNormalized = 2.5;
    } else if (normalized <= 3) {
      niceNormalized = 3;
    } else if (normalized <= 4) {
      niceNormalized = 4;
    } else if (normalized <= 5) {
      niceNormalized = 5;
    } else if (normalized <= 6) {
      niceNormalized = 6;
    } else if (normalized <= 8) {
      niceNormalized = 8;
    } else {
      niceNormalized = 10;
    }
  } else {
    // Стандартное округление
    if (normalized <= 1) {
      niceNormalized = 1;
    } else if (normalized <= 2) {
      niceNormalized = 2;
    } else if (normalized <= 5) {
      niceNormalized = 5;
    } else {
      niceNormalized = 10;
    }
  }

  return niceNormalized * orderOfMagnitude;
}

/**
 * Форматирует число с пробелами
 */
function formatNumber(value: number): string {
  return value.toLocaleString('ru-RU');
}

/**
 * Форматирует число для input (с пробелами)
 */
function formatNumberForInput(value: number): string {
  return value.toLocaleString('ru-RU');
}

/**
 * Парсит число из строки с пробелами
 */
function parseInputNumber(value: string): number {
  const cleaned = value.replace(/\s/g, '').replace(',', '.');
  return parseInt(cleaned, 10) || 0;
}

