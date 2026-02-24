import { forwardRef } from 'react';
import { PopulationPyramid } from '../PopulationPyramid';
import type { PopulationPyramidRef } from '../PopulationPyramid';
import { YearSelector } from '../../common/YearSelector';
import { ChartActionsMenu, SettingsButton } from '../ChartSettingsPanel';
import { calculateScale } from '../../common/ScaleConfigurator';
import type { ScaleConfig } from '../../common/ScaleConfigurator';
import { getYAxisInterval } from '../../common/YAxisLabelConfig';
import { useI18n } from '../../../i18n';
import type { Theme } from '../../../hooks';
import type { PopulationData, ChartSettings, TimeSeriesPopulationData, AgeRangeConfig } from '../../../types';
import styles from './ChartCard.module.css';

interface ChartCardProps {
  /** Уникальный ID графика */
  chartId: string;
  /** Данные для отображения */
  data: PopulationData;
  /** Исходные данные для расчёта медианы (для агрегированных) */
  sourceDataForMedian?: PopulationData;
  /** Настройки графика */
  settings: ChartSettings;
  /** Текущая тема */
  theme: Theme;
  /** Данные временного ряда (если есть) */
  timeSeriesData?: TimeSeriesPopulationData | null;
  /** Текущий год (для timeline) */
  currentYear?: number | null;
  /** Заголовок карточки */
  title: string;
  /** Конфиг групп (для агрегированных графиков) */
  groupConfig?: AgeRangeConfig[];
  /** Можно ли удалить график */
  removable?: boolean;
  /** Callback для экспорта SVG */
  onExportSvg: () => void;
  /** Callback для полноэкранного режима */
  onFullscreen: () => void;
  /** Callback для получения embed кода */
  onGetEmbedCode?: () => void;
  /** Callback для открытия настроек */
  onOpenSettings: () => void;
  /** Callback для удаления */
  onRemove?: () => void;
  /** Callback при изменении года */
  onYearChange?: (year: number) => void;
  /** Функция получения canvas для GIF */
  getChartCanvas?: (year: number) => Promise<HTMLCanvasElement>;
}

/** Вычисляет максимальное значение из данных */
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

export const ChartCard = forwardRef<PopulationPyramidRef, ChartCardProps>(
  function ChartCard(
    {
      // chartId не используется напрямую, но нужен для идентификации
      chartId: _chartId,
      data,
      sourceDataForMedian,
      settings,
      theme,
      timeSeriesData,
      currentYear,
      title,
      groupConfig,
      removable = false,
      onExportSvg,
      onFullscreen,
      onGetEmbedCode,
      onOpenSettings,
      onRemove,
      onYearChange,
      getChartCanvas,
    },
    ref
  ) {
    const { t } = useI18n();

    const dataMaxValue = getDataMaxValue(data);
    const effectiveScale = calculateScale(toScaleConfig(settings), dataMaxValue);
    const yAxisInterval = getYAxisInterval(settings.yAxisLabelMode);

    return (
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {groupConfig 
              ? `${t.chart.grouping} ${groupConfig.map((g) => g.label).join(', ')}`
              : title
            }
          </h2>
          <div className={styles.actions}>
            <ChartActionsMenu
              onExportSvg={onExportSvg}
              onFullscreen={onFullscreen}
              onGetEmbedCode={onGetEmbedCode}
            />
            <SettingsButton onClick={onOpenSettings} />
            {removable && onRemove && (
              <button
                className={styles.removeButton}
                onClick={onRemove}
                type="button"
                aria-label={t.common.remove}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
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
        </div>

        <PopulationPyramid
          ref={ref}
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

        {timeSeriesData && currentYear && onYearChange && (
          <YearSelector
            years={timeSeriesData.years}
            selectedYear={currentYear}
            onYearChange={onYearChange}
            compact
            chartTitle={settings.customTitle || data.title}
            getChartCanvas={getChartCanvas}
          />
        )}
      </div>
    );
  }
);
