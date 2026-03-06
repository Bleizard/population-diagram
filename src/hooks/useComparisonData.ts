import { useState, useCallback, useEffect, useMemo } from 'react';
import { fetchCountryData } from '../services/countryDataLoader';
import type { TimeSeriesPopulationData, PopulationData } from '../types';

export interface ComparisonSide {
  /** Country code or null (null = custom uploaded data) */
  code: string | null;
  /** Custom label for uploaded files */
  customLabel: string | null;
  data: TimeSeriesPopulationData | null;
  year: number;
  loading: boolean;
  error: string | null;
}

interface UseComparisonDataReturn {
  left: ComparisonSide;
  right: ComparisonSide;
  setLeftCode: (code: string | null) => void;
  setRightCode: (code: string | null) => void;
  setLeftCustomData: (data: TimeSeriesPopulationData | PopulationData) => void;
  setRightCustomData: (data: TimeSeriesPopulationData | PopulationData) => void;
  setLeftYear: (year: number) => void;
  setRightYear: (year: number) => void;
  syncYears: boolean;
  setSyncYears: (v: boolean) => void;
  matchScale: boolean;
  setMatchScale: (v: boolean) => void;
  commonYears: number[];
  leftPopulationData: PopulationData | null;
  rightPopulationData: PopulationData | null;
  sharedMaxScale: number | undefined;
}

function buildPopulationData(
  tsData: TimeSeriesPopulationData | null,
  year: number,
): PopulationData | null {
  if (!tsData) return null;
  const ageGroups = tsData.dataByYear[year];
  if (!ageGroups) return null;
  return {
    title: tsData.title,
    source: tsData.source,
    ageGroups,
    hasGenderData: tsData.hasGenderData,
  };
}

function computeMaxValue(data: PopulationData | null): number {
  if (!data) return 0;
  let max = 0;
  for (const g of data.ageGroups) {
    if (g.male > max) max = g.male;
    if (g.female > max) max = g.female;
  }
  return max;
}

/** Wrap single-year PopulationData into TimeSeriesPopulationData */
function wrapAsTimeSeries(data: PopulationData | TimeSeriesPopulationData): TimeSeriesPopulationData {
  if ('years' in data && 'dataByYear' in data) {
    return data as TimeSeriesPopulationData;
  }
  const pd = data as PopulationData;
  const year = pd.date ? parseInt(pd.date, 10) || 2024 : 2024;
  return {
    title: pd.title,
    source: pd.source,
    years: [year],
    dataByYear: { [year]: pd.ageGroups },
    hasGenderData: pd.hasGenderData,
  };
}

export function useComparisonData(): UseComparisonDataReturn {
  const [leftCode, setLeftCodeRaw] = useState<string | null>(null);
  const [rightCode, setRightCodeRaw] = useState<string | null>(null);
  const [leftCustomLabel, setLeftCustomLabel] = useState<string | null>(null);
  const [rightCustomLabel, setRightCustomLabel] = useState<string | null>(null);
  const [leftData, setLeftData] = useState<TimeSeriesPopulationData | null>(null);
  const [rightData, setRightData] = useState<TimeSeriesPopulationData | null>(null);
  const [leftYear, setLeftYearRaw] = useState(0);
  const [rightYear, setRightYearRaw] = useState(0);
  const [leftLoading, setLeftLoading] = useState(false);
  const [rightLoading, setRightLoading] = useState(false);
  const [leftError, setLeftError] = useState<string | null>(null);
  const [rightError, setRightError] = useState<string | null>(null);
  const [syncYears, setSyncYears] = useState(false);
  const [matchScale, setMatchScale] = useState(false);

  // Load left country
  const setLeftCode = useCallback((code: string | null) => {
    setLeftCodeRaw(code);
    setLeftCustomLabel(null);
    if (!code) {
      setLeftData(null);
      setLeftError(null);
      return;
    }
    setLeftLoading(true);
    setLeftError(null);
    fetchCountryData(code)
      .then(data => {
        setLeftData(data);
        const latestYear = data.years[data.years.length - 1];
        setLeftYearRaw(latestYear);
      })
      .catch(err => setLeftError(err.message))
      .finally(() => setLeftLoading(false));
  }, []);

  // Load right country
  const setRightCode = useCallback((code: string | null) => {
    setRightCodeRaw(code);
    setRightCustomLabel(null);
    if (!code) {
      setRightData(null);
      setRightError(null);
      return;
    }
    setRightLoading(true);
    setRightError(null);
    fetchCountryData(code)
      .then(data => {
        setRightData(data);
        const latestYear = data.years[data.years.length - 1];
        setRightYearRaw(latestYear);
      })
      .catch(err => setRightError(err.message))
      .finally(() => setRightLoading(false));
  }, []);

  // Set custom uploaded data (left)
  const setLeftCustomData = useCallback((raw: TimeSeriesPopulationData | PopulationData) => {
    const tsData = wrapAsTimeSeries(raw);
    setLeftCodeRaw(null);
    setLeftCustomLabel(tsData.title || 'Custom');
    setLeftData(tsData);
    setLeftError(null);
    const latestYear = tsData.years[tsData.years.length - 1];
    setLeftYearRaw(latestYear);
  }, []);

  // Set custom uploaded data (right)
  const setRightCustomData = useCallback((raw: TimeSeriesPopulationData | PopulationData) => {
    const tsData = wrapAsTimeSeries(raw);
    setRightCodeRaw(null);
    setRightCustomLabel(tsData.title || 'Custom');
    setRightData(tsData);
    setRightError(null);
    const latestYear = tsData.years[tsData.years.length - 1];
    setRightYearRaw(latestYear);
  }, []);

  // Common years (intersection)
  const commonYears = useMemo(() => {
    if (!leftData || !rightData) return [];
    const rightSet = new Set(rightData.years);
    return leftData.years.filter(y => rightSet.has(y));
  }, [leftData, rightData]);

  // When sync is turned on, snap both to the latest common year
  useEffect(() => {
    if (syncYears && commonYears.length > 0) {
      const latest = commonYears[commonYears.length - 1];
      setLeftYearRaw(latest);
      setRightYearRaw(latest);
    }
  }, [syncYears, commonYears]);

  // Year setters that respect sync
  const setLeftYear = useCallback((year: number) => {
    setLeftYearRaw(year);
    if (syncYears) setRightYearRaw(year);
  }, [syncYears]);

  const setRightYear = useCallback((year: number) => {
    setRightYearRaw(year);
    if (syncYears) setLeftYearRaw(year);
  }, [syncYears]);

  // Derived population data
  const leftPopulationData = useMemo(
    () => buildPopulationData(leftData, leftYear),
    [leftData, leftYear],
  );
  const rightPopulationData = useMemo(
    () => buildPopulationData(rightData, rightYear),
    [rightData, rightYear],
  );

  // Shared max scale for match-scale mode
  const sharedMaxScale = useMemo(() => {
    if (!matchScale) return undefined;
    const lMax = computeMaxValue(leftPopulationData);
    const rMax = computeMaxValue(rightPopulationData);
    const raw = Math.max(lMax, rMax);
    if (raw === 0) return undefined;
    // Round up to a nice number
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    return Math.ceil(raw / magnitude) * magnitude;
  }, [matchScale, leftPopulationData, rightPopulationData]);

  return {
    left: { code: leftCode, customLabel: leftCustomLabel, data: leftData, year: leftYear, loading: leftLoading, error: leftError },
    right: { code: rightCode, customLabel: rightCustomLabel, data: rightData, year: rightYear, loading: rightLoading, error: rightError },
    setLeftCode,
    setRightCode,
    setLeftCustomData,
    setRightCustomData,
    setLeftYear,
    setRightYear,
    syncYears,
    setSyncYears,
    matchScale,
    setMatchScale,
    commonYears,
    leftPopulationData,
    rightPopulationData,
    sharedMaxScale,
  };
}
