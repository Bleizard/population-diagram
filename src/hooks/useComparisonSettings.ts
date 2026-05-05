import { useState, useCallback } from 'react';
import { DEFAULT_CHART_SETTINGS } from '../constants/settings';
import type { ChartSettings } from '../types';
import type { YAxisLabelMode } from '../components/common';

export interface OverlayColors {
  leftMaleColor: string;
  leftFemaleColor: string;
  rightMaleColor: string;
  rightFemaleColor: string;
}

const DEFAULT_OVERLAY_COLORS: OverlayColors = {
  leftMaleColor: 'rgba(59, 130, 246, 0.5)',
  leftFemaleColor: 'rgba(251, 113, 133, 0.5)',
  rightMaleColor: '#f97316',
  rightFemaleColor: '#14b8a6',
};

export interface OverlaySettings {
  colors: OverlayColors;
  yAxisLabelMode: YAxisLabelMode;
  xAxisSplitCount: number;
}

type SettingsOpenFor = 'left' | 'right' | 'overlay' | null;

interface UseComparisonSettingsReturn {
  left: ChartSettings;
  right: ChartSettings;
  overlay: OverlaySettings;
  updateLeft: (updates: Partial<ChartSettings>) => void;
  updateRight: (updates: Partial<ChartSettings>) => void;
  updateOverlayColors: (colors: Partial<OverlayColors>) => void;
  updateOverlay: (updates: Partial<Omit<OverlaySettings, 'colors'>>) => void;
  settingsOpenFor: SettingsOpenFor;
  openSettings: (panel: 'left' | 'right' | 'overlay') => void;
  closeSettings: () => void;
}

export function useComparisonSettings(): UseComparisonSettingsReturn {
  const [leftSettings, setLeftSettings] = useState<ChartSettings>({ ...DEFAULT_CHART_SETTINGS });
  const [rightSettings, setRightSettings] = useState<ChartSettings>({ ...DEFAULT_CHART_SETTINGS });
  const [overlaySettings, setOverlaySettings] = useState<OverlaySettings>({
    colors: { ...DEFAULT_OVERLAY_COLORS },
    yAxisLabelMode: 'all',
    xAxisSplitCount: 5,
  });
  const [settingsOpenFor, setSettingsOpenFor] = useState<SettingsOpenFor>(null);

  const updateLeft = useCallback((updates: Partial<ChartSettings>) => {
    setLeftSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const updateRight = useCallback((updates: Partial<ChartSettings>) => {
    setRightSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const updateOverlayColors = useCallback((colors: Partial<OverlayColors>) => {
    setOverlaySettings(prev => ({
      ...prev,
      colors: { ...prev.colors, ...colors },
    }));
  }, []);

  const updateOverlay = useCallback((updates: Partial<Omit<OverlaySettings, 'colors'>>) => {
    setOverlaySettings(prev => ({ ...prev, ...updates }));
  }, []);

  const openSettings = useCallback((panel: 'left' | 'right' | 'overlay') => {
    setSettingsOpenFor(panel);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpenFor(null);
  }, []);

  return {
    left: leftSettings,
    right: rightSettings,
    overlay: overlaySettings,
    updateLeft,
    updateRight,
    updateOverlayColors,
    updateOverlay,
    settingsOpenFor,
    openSettings,
    closeSettings,
  };
}
