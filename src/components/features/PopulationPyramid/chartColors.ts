import type { ColorProfile } from '../../../types';
import type { Theme } from '../../../hooks';

/**
 * Цвета профиля для столбиков диаграммы
 */
export interface ProfileColors {
  male: string;
  maleSurplus: string;
  female: string;
  femaleSurplus: string;
  total: string;
  totalGradientStart: string;
  totalGradientEnd: string;
}

/**
 * Цвета темы (не зависящие от профиля)
 */
export interface ThemeColors {
  text: string;
  textSecondary: string;
  grid: string;
  centerLine: string;
  background: string;
  tooltipBg: string;
  tooltipBorder: string;
  medianLine: string;
}

/**
 * Полный набор цветов для диаграммы
 */
export type ChartColors = ProfileColors & ThemeColors;

/**
 * Цветовые профили для диаграммы
 */
export const COLOR_PROFILES: Record<ColorProfile, Record<Theme, ProfileColors>> = {
  pale: {
    light: {
      male: '#93c5fd',
      maleSurplus: '#3b82f6',
      female: '#fda4af',
      femaleSurplus: '#f43f5e',
      total: '#3b82f6',
      totalGradientStart: '#60a5fa',
      totalGradientEnd: '#2563eb',
    },
    dark: {
      male: '#7dd3fc',
      maleSurplus: '#38bdf8',
      female: '#fda4af',
      femaleSurplus: '#fb7185',
      total: '#60a5fa',
      totalGradientStart: '#93c5fd',
      totalGradientEnd: '#3b82f6',
    },
  },
  contrast: {
    light: {
      male: '#60a5fa',
      maleSurplus: '#1d4ed8',
      female: '#f87171',
      femaleSurplus: '#991b1b',
      total: '#2563eb',
      totalGradientStart: '#3b82f6',
      totalGradientEnd: '#1e40af',
    },
    dark: {
      male: '#3b82f6',
      maleSurplus: '#1e40af',
      female: '#ef4444',
      femaleSurplus: '#7f1d1d',
      total: '#3b82f6',
      totalGradientStart: '#60a5fa',
      totalGradientEnd: '#1d4ed8',
    },
  },
};

/**
 * Цвета темы (не зависящие от профиля)
 */
export const THEME_COLORS: Record<Theme, ThemeColors> = {
  light: {
    text: '#374151',
    textSecondary: '#6b7280',
    grid: '#e5e7eb',
    centerLine: '#9ca3af',
    background: '#ffffff',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e5e7eb',
    medianLine: '#059669',
  },
  dark: {
    text: '#e2e8f0',
    textSecondary: '#94a3b8',
    grid: '#334155',
    centerLine: '#64748b',
    background: '#1e293b',
    tooltipBg: '#1e293b',
    tooltipBorder: '#475569',
    medianLine: '#34d399',
  },
};

/**
 * Получить полный набор цветов для диаграммы
 */
export function getChartColors(
  colorProfile: ColorProfile,
  theme: Theme
): ChartColors {
  const profileColors = COLOR_PROFILES[colorProfile][theme];
  const themeColors = THEME_COLORS[theme];
  return { ...profileColors, ...themeColors };
}

