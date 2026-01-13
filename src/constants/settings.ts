import type { ChartSettings } from '../types';

/** ID для оригинального графика */
export const ORIGINAL_CHART_ID = 'original';

/** Настройки графика по умолчанию */
export const DEFAULT_CHART_SETTINGS: ChartSettings = {
  customTitle: '',
  viewMode: 'split',
  scaleMode: 'auto',
  yAxisLabelMode: 'all',
  showTotal: false,
  xAxisSplitCount: 5,
  showBarLabels: false,
  colorProfile: 'pale',
  showMedianLine: false,
  showAsPercentage: false,
};
