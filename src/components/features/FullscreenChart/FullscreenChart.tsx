import { PopulationPyramid } from '../PopulationPyramid';
import { YearSelector } from '../../common/YearSelector';
import { calculateScale } from '../../common/ScaleConfigurator';
import type { ScaleConfig } from '../../common/ScaleConfigurator';
import { getYAxisInterval } from '../../common/YAxisLabelConfig';
import { useI18n } from '../../../i18n';
import type { Theme } from '../../../hooks';
import type { PopulationData, ChartSettings, TimeSeriesPopulationData, AgeRangeConfig } from '../../../types';
import styles from './FullscreenChart.module.css';

interface FullscreenChartProps {
  /** Данные для отображения */
  data: PopulationData;
  /** Исходные данные для медианы */
  sourceDataForMedian?: PopulationData;
  /** Настройки графика */
  settings: ChartSettings;
  /** Текущая тема */
  theme: Theme;
  /** Данные временного ряда */
  timeSeriesData?: TimeSeriesPopulationData | null;
  /** Текущий год */
  currentYear?: number | null;
  /** Заголовок */
  title: string;
  /** Конфиг групп (для агрегированных) */
  groupConfig?: AgeRangeConfig[];
  /** Callback для закрытия */
  onClose: () => void;
  /** Callback при изменении года */
  onYearChange?: (year: number) => void;
  /** Функция получения canvas для GIF */
  getChartCanvas?: (year: number) => Promise<HTMLCanvasElement>;
}

/** Вычисляет максимальное значение */
function getDataMaxValue(data: PopulationData): number {
  let max = 0;
  for (const group of data.ageGroups) {
    max = Math.max(max, group.male, group.female);
  }
  return max;
}

/** Конвертирует настройки в ScaleConfig */
function toScaleConfig(settings: ChartSettings): ScaleConfig {
  return {
    mode: settings.scaleMode,
    customValue: settings.scaleCustomValue,
  };
}

export function FullscreenChart({
  data,
  sourceDataForMedian,
  settings,
  theme,
  timeSeriesData,
  currentYear,
  title,
  groupConfig,
  onClose,
  onYearChange,
  getChartCanvas,
}: FullscreenChartProps) {
  const { t } = useI18n();

  const dataMaxValue = getDataMaxValue(data);
  const effectiveScale = calculateScale(toScaleConfig(settings), dataMaxValue);
  const yAxisInterval = getYAxisInterval(settings.yAxisLabelMode);

  const displayTitle = groupConfig
    ? `${t.chart.grouping} ${groupConfig.map((g) => g.label).join(', ')}`
    : title;

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>{displayTitle}</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            type="button"
            aria-label={t.actions.exitFullscreen}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
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

        <div className={styles.chart}>
          <PopulationPyramid
            data={data}
            sourceDataForMedian={sourceDataForMedian}
            theme={theme}
            viewMode={data.hasGenderData === false ? 'combined' : settings.viewMode}
            maxScale={effectiveScale}
            yAxisInterval={yAxisInterval}
            customTitle={settings.customTitle}
            showTotal={settings.showTotal}
            xAxisSplitCount={settings.xAxisSplitCount}
            showBarLabels={settings.showBarLabels}
            colorProfile={settings.colorProfile}
            showMedianLine={settings.showMedianLine}
            showAsPercentage={settings.showAsPercentage}
          />
        </div>

        {timeSeriesData && currentYear && onYearChange && (
          <div className={styles.timeline}>
            <YearSelector
              years={timeSeriesData.years}
              selectedYear={currentYear}
              onYearChange={onYearChange}
              chartTitle={settings.customTitle || data.title}
              getChartCanvas={getChartCanvas}
            />
          </div>
        )}
      </div>
    </div>
  );
}

