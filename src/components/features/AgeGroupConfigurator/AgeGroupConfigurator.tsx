import { useState, useCallback } from 'react';
import type { AgeRangeConfig } from '../../../types';
import {
  createAgeRangeConfig,
  validateAgeGroups,
  getPresetOptions,
} from '../../../services/dataAggregator';
import { useI18n } from '../../../i18n';
import styles from './AgeGroupConfigurator.module.css';

interface AgeGroupConfiguratorProps {
  /** Callback при создании группированного графика */
  onCreateChart: (groups: AgeRangeConfig[]) => void;
  /** Максимальный возраст в данных */
  maxAge?: number;
}

/**
 * Компонент для настройки возрастных групп и создания агрегированных графиков
 */
export function AgeGroupConfigurator({
  onCreateChart,
  maxAge = 100,
}: AgeGroupConfiguratorProps) {
  const { t } = useI18n();
  const [groups, setGroups] = useState<AgeRangeConfig[]>([
    createAgeRangeConfig(0, 19),
    createAgeRangeConfig(20, 64),
    createAgeRangeConfig(65, null),
  ]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const presets = getPresetOptions({
    preset3: t.groupConfig.preset3,
    preset5: t.groupConfig.preset5,
    presetDecades: t.groupConfig.presetDecades,
  });

  const handleAddGroup = useCallback(() => {
    // Находим следующий свободный диапазон
    const sortedGroups = [...groups].sort((a, b) => a.from - b.from);
    let nextFrom = 0;

    if (sortedGroups.length > 0) {
      const lastGroup = sortedGroups[sortedGroups.length - 1];
      nextFrom = (lastGroup.to ?? maxAge) + 1;
    }

    const newGroup = createAgeRangeConfig(nextFrom, null);
    setGroups([...groups, newGroup]);
    setErrors([]);
  }, [groups, maxAge]);

  const handleRemoveGroup = useCallback((id: string) => {
    setGroups(groups.filter((g) => g.id !== id));
    setErrors([]);
  }, [groups]);

  const handleUpdateGroup = useCallback(
    (id: string, field: 'from' | 'to', value: string) => {
      setGroups(
        groups.map((g) => {
          if (g.id !== id) return g;

          const numValue = value === '' ? (field === 'to' ? null : 0) : parseInt(value, 10);
          const newFrom = field === 'from' ? (numValue ?? 0) : g.from;
          const newTo = field === 'to' ? numValue : g.to;

          // Генерируем новую метку
          let label: string;
          if (newTo === null) {
            label = `${newFrom}+`;
          } else if (newFrom === newTo) {
            label = `${newFrom}`;
          } else {
            label = `${newFrom}-${newTo}`;
          }

          return {
            ...g,
            from: newFrom,
            to: newTo,
            label,
          };
        })
      );
      setErrors([]);
    },
    [groups]
  );

  const handleSelectPreset = useCallback((presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      // Создаём новые объекты с новыми ID
      const newGroups = preset.groups.map((g) =>
        createAgeRangeConfig(g.from, g.to)
      );
      setGroups(newGroups);
      setErrors([]);
    }
  }, [presets]);

  const handleCreate = useCallback(() => {
    const validation = validateAgeGroups(groups, maxAge);
    
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    onCreateChart(groups);
    setIsExpanded(false);
  }, [groups, maxAge, onCreateChart]);

  return (
    <div className={styles.container}>
      <button
        className={styles.toggleButton}
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        {t.groupConfig.createGrouped}
        <svg
          className={`${styles.chevron} ${isExpanded ? styles.expanded : ''}`}
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
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isExpanded && (
        <div className={styles.panel}>
          <div className={styles.presets}>
            <span className={styles.presetsLabel}>{t.groupConfig.presets}</span>
            {presets.map((preset) => (
              <button
                key={preset.id}
                className={styles.presetButton}
                onClick={() => handleSelectPreset(preset.id)}
                type="button"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className={styles.groupsList}>
            <div className={styles.groupsHeader}>
              <span>{t.groupConfig.ageGroups}</span>
              <button
                className={styles.addButton}
                onClick={handleAddGroup}
                type="button"
              >
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
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {t.groupConfig.add}
              </button>
            </div>

            {groups.map((group, index) => (
              <div key={group.id} className={styles.groupRow}>
                <span className={styles.groupIndex}>{index + 1}.</span>
                
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>{t.groupConfig.from}</label>
                  <input
                    type="number"
                    min="0"
                    max={maxAge}
                    value={group.from}
                    onChange={(e) => handleUpdateGroup(group.id, 'from', e.target.value)}
                    className={styles.input}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>{t.groupConfig.to}</label>
                  <input
                    type="number"
                    min="0"
                    max={maxAge}
                    value={group.to ?? ''}
                    placeholder="∞"
                    onChange={(e) => handleUpdateGroup(group.id, 'to', e.target.value)}
                    className={styles.input}
                  />
                </div>

                <span className={styles.preview}>{group.label}</span>

                <button
                  className={styles.removeButton}
                  onClick={() => handleRemoveGroup(group.id)}
                  type="button"
                  aria-label={t.groupConfig.removeGroup}
                  disabled={groups.length <= 1}
                >
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
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {errors.length > 0 && (
            <div className={styles.errors}>
              {errors.map((error, i) => (
                <p key={i} className={styles.error}>
                  {error}
                </p>
              ))}
            </div>
          )}

          <button
            className={styles.createButton}
            onClick={handleCreate}
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
            {t.groupConfig.createChart}
          </button>
        </div>
      )}
    </div>
  );
}

