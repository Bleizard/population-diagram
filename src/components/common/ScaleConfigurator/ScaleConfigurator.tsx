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
      <div className={styles.options}>
        <button
          className={`${styles.option} ${config.mode === 'auto' ? styles.active : ''}`}
          onClick={() => handleModeChange('auto')}
          type="button"
        >
          Auto
          <span className={styles.optionHint}>rounded</span>
        </button>

        <button
          className={`${styles.option} ${config.mode === 'fit' ? styles.active : ''}`}
          onClick={() => handleModeChange('fit')}
          type="button"
        >
          Fit data
          <span className={styles.optionHint}>+10%</span>
        </button>

        <button
          className={`${styles.option} ${config.mode === 'custom' ? styles.active : ''}`}
          onClick={() => handleModeChange('custom')}
          type="button"
        >
          Manual
        </button>
      </div>

      {config.mode === 'custom' && (
        <div className={styles.customInput}>
          <label className={styles.inputLabel}>Maximum:</label>
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
          <span className={styles.infoLabel}>Data max:</span>
          <span className={styles.infoValue}>{formatNumber(dataMaxValue)}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Scale to:</span>
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
  return value.toLocaleString('en-US');
}

/**
 * Форматирует число для input (с пробелами)
 */
function formatNumberForInput(value: number): string {
  return value.toLocaleString('en-US');
}

/**
 * Парсит число из строки с пробелами
 */
function parseInputNumber(value: string): number {
  const cleaned = value.replace(/\s/g, '').replace(',', '.');
  return parseInt(cleaned, 10) || 0;
}

