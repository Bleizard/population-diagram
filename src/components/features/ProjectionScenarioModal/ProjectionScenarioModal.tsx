import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../../i18n';
import { formatPopulation } from '../../../utils';
import type {
  PopulationProjectionScenario,
  ProjectionBaseline,
  ProjectionMetricScenario,
  ProjectionTrend,
} from '../../../utils/demographicProjection';
import styles from './ProjectionScenarioModal.module.css';

interface ProjectionScenarioModalProps {
  isOpen: boolean;
  baseline: ProjectionBaseline | null;
  initialScenario: PopulationProjectionScenario | null;
  onClose: () => void;
  onApply: (scenario: PopulationProjectionScenario) => void;
}

interface ProjectionText {
  title: string;
  subtitle: string;
  horizon: string;
  horizonHint: string;
  untilYear: string;
  baselinePopulation: string;
  observedBirthRate: string;
  migrationNote: string;
  observedValue: string;
  targetValue: string;
  trend: string;
  stable: string;
  rise: string;
  fall: string;
  manual: string;
  fertilityRate: string;
  deathRate: string;
  fertilityHint: string;
  deathRateHint: string;
  deathsNow: string;
  cancel: string;
  apply: string;
  perThousand: string;
  childrenPerWoman: string;
}

const FALLBACK_TEXT: ProjectionText = {
  title: 'Future scenario',
  subtitle: 'Build a simplified population projection from the current pyramid. Net migration is excluded.',
  horizon: 'Projection horizon',
  horizonHint: 'Default horizon is 50 years ahead, but you can choose any future year.',
  untilYear: 'Project until',
  baselinePopulation: 'Starting population',
  observedBirthRate: 'Observed birth rate',
  migrationNote: 'Migration is ignored in this mode to keep the scenario readable and comparable.',
  observedValue: 'Observed value',
  targetValue: 'Target by horizon end',
  trend: 'Trend',
  stable: 'Stable',
  rise: 'Rise',
  fall: 'Fall',
  manual: 'Manual',
  fertilityRate: 'Fertility rate',
  deathRate: 'Death rate',
  fertilityHint: 'Total fertility rate, births per woman.',
  deathRateHint: 'Crude death rate per 1,000 people.',
  deathsNow: 'Current deaths',
  cancel: 'Cancel',
  apply: 'Run projection',
  perThousand: 'per 1,000',
  childrenPerWoman: 'children per woman',
};

interface MetricConfig {
  key: keyof Pick<PopulationProjectionScenario, 'fertilityRate' | 'deathRate'>;
  label: string;
  hint: string;
  unit: string;
  digits: number;
}

function createDefaultScenario(baseline: ProjectionBaseline): PopulationProjectionScenario {
  return {
    startYear: baseline.startYear,
    endYear: baseline.startYear + 50,
    fertilityRate: {
      startValue: baseline.fertilityRate.value,
      endValue: baseline.fertilityRate.value,
      trend: 'stable',
    },
    deathRate: {
      startValue: baseline.deathRate.value,
      endValue: baseline.deathRate.value,
      trend: 'stable',
    },
  };
}

function applyTrendPreset(
  metricKey: MetricConfig['key'],
  startValue: number,
  trend: ProjectionTrend,
) {
  if (trend === 'stable') return startValue;

  const delta = metricKey === 'fertilityRate' ? 0.18 : 0.14;
  return trend === 'rise'
    ? startValue * (1 + delta)
    : startValue * (1 - delta);
}

function formatNumber(value: number, digits: number) {
  return Number.isFinite(value) ? value.toFixed(digits) : '0';
}

export function ProjectionScenarioModal({
  isOpen,
  baseline,
  initialScenario,
  onClose,
  onApply,
}: ProjectionScenarioModalProps) {
  const { t, language } = useI18n();
  const tAny = t as Record<string, unknown>;
  const text: ProjectionText = {
    ...FALLBACK_TEXT,
    ...((tAny.projection as Partial<ProjectionText> | undefined) ?? {}),
  };

  const [scenario, setScenario] = useState<PopulationProjectionScenario | null>(null);

  useEffect(() => {
    if (!isOpen || !baseline) return;
    setScenario(initialScenario ?? createDefaultScenario(baseline));
  }, [baseline, initialScenario, isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const metrics = useMemo<MetricConfig[]>(() => [
    {
      key: 'fertilityRate',
      label: text.fertilityRate,
      hint: text.fertilityHint,
      unit: text.childrenPerWoman,
      digits: 2,
    },
    {
      key: 'deathRate',
      label: text.deathRate,
      hint: text.deathRateHint,
      unit: text.perThousand,
      digits: 1,
    },
  ], [text]);

  if (!isOpen || !baseline || !scenario) return null;

  const canApply = scenario.endYear > scenario.startYear
    && metrics.every((metric) => {
      const metricScenario = scenario[metric.key];
      return Number.isFinite(metricScenario.startValue)
        && Number.isFinite(metricScenario.endValue)
        && metricScenario.startValue >= 0
        && metricScenario.endValue >= 0;
    });

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>{text.title}</h3>
            <p className={styles.subtitle}>{text.subtitle}</p>
          </div>
          <button
            className={styles.closeButton}
            onClick={onClose}
            type="button"
            aria-label={t.common.close}
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
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.content}>
          <section className={styles.hero}>
            <div className={styles.heroCard}>
              <span className={styles.heroLabel}>{text.baselinePopulation}</span>
              <strong className={styles.heroValue}>{formatPopulation(baseline.population)}</strong>
              <span className={styles.heroMeta}>{baseline.startYear}</span>
            </div>
            <div className={styles.heroCard}>
              <span className={styles.heroLabel}>{text.observedBirthRate}</span>
              <strong className={styles.heroValue}>{formatNumber(baseline.birthRate.value, 1)}</strong>
              <span className={styles.heroMeta}>{text.perThousand}</span>
            </div>
            <div className={styles.heroCard}>
              <span className={styles.heroLabel}>{text.untilYear}</span>
              <input
                className={styles.yearInput}
                type="number"
                min={baseline.startYear + 1}
                value={scenario.endYear}
                onChange={(event) => {
                  const nextYear = Number(event.target.value);
                  setScenario((prev) => prev ? { ...prev, endYear: nextYear } : prev);
                }}
              />
              <span className={styles.heroMeta}>{text.horizonHint}</span>
            </div>
          </section>

          <p className={styles.migrationNote}>{text.migrationNote}</p>

          <div className={styles.metricsGrid}>
            {metrics.map((metric) => {
              const metricScenario = scenario[metric.key];
              const baselineMetric = baseline[metric.key];
              const observedValue = metricScenario.startValue;
              const endValue = metricScenario.endValue;
              const isManual = metricScenario.trend === 'manual';

              return (
                <section key={metric.key} className={styles.metricCard}>
                  <div className={styles.metricHeader}>
                    <div>
                      <h4 className={styles.metricTitle}>{metric.label}</h4>
                      <p className={styles.metricHint}>{metric.hint}</p>
                    </div>
                    <span className={styles.metricYear}>
                      {language === 'ru' ? `база ${baselineMetric.year}` : `base ${baselineMetric.year}`}
                    </span>
                  </div>

                  {metric.key === 'deathRate' && baselineMetric.rawValue !== undefined && (
                    <div className={styles.metricFacts}>
                      <span>{text.deathsNow}</span>
                      <strong>{formatPopulation(baselineMetric.rawValue)}</strong>
                    </div>
                  )}

                  <div className={styles.inputGrid}>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>{text.observedValue}</span>
                      <div className={`${styles.inputShell} ${styles.inputShellReadOnly}`}>
                        <span className={styles.readOnlyValue}>{formatNumber(observedValue, metric.digits)}</span>
                        <span className={styles.unit}>{metric.unit}</span>
                      </div>
                    </div>

                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>{text.targetValue}</span>
                      <div className={styles.inputShell}>
                        <input
                          className={styles.input}
                          type="number"
                          step={metric.digits === 2 ? '0.01' : '0.1'}
                          min="0"
                          disabled={!isManual}
                          value={formatNumber(endValue, metric.digits)}
                          onChange={(event) => {
                            if (!isManual) return;
                            const nextValue = Number(event.target.value);
                            setScenario((prev) => {
                              if (!prev) return prev;
                              const nextMetric = prev[metric.key] as ProjectionMetricScenario;
                              return {
                                ...prev,
                                [metric.key]: {
                                  ...nextMetric,
                                  endValue: nextValue,
                                },
                              };
                            });
                          }}
                        />
                        <span className={styles.unit}>{metric.unit}</span>
                      </div>
                    </label>
                  </div>

                  <div className={styles.trendRow}>
                    <span className={styles.fieldLabel}>{text.trend}</span>
                    <div className={styles.trendButtons}>
                      {(['stable', 'rise', 'fall', 'manual'] as ProjectionTrend[]).map((trend) => {
                        const label = trend === 'stable'
                          ? text.stable
                          : trend === 'rise'
                            ? text.rise
                            : trend === 'fall'
                              ? text.fall
                              : text.manual;

                        return (
                          <button
                            key={trend}
                            type="button"
                            className={`${styles.trendButton} ${metricScenario.trend === trend ? styles.trendButtonActive : ''}`}
                            onClick={() => {
                              setScenario((prev) => {
                              if (!prev) return prev;
                              const nextMetric = prev[metric.key] as ProjectionMetricScenario;
                              const nextEndValue = trend === 'manual'
                                ? nextMetric.endValue
                                : applyTrendPreset(metric.key, nextMetric.startValue, trend);

                              return {
                                ...prev,
                                  [metric.key]: {
                                    ...nextMetric,
                                    trend,
                                    endValue: nextEndValue,
                                  },
                                };
                              });
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.secondaryButton} type="button" onClick={onClose}>
            {text.cancel}
          </button>
          <button
            className={styles.primaryButton}
            type="button"
            disabled={!canApply}
            onClick={() => {
              if (!canApply) return;
              onApply(scenario);
            }}
          >
            {text.apply}
          </button>
        </div>
      </div>
    </>
  );
}
