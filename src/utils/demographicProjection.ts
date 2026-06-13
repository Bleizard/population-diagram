import type { CountryDemographyProfile } from '../services/countryDataLoader';
import type { PopulationAgeGroup, TimeSeriesPopulationData } from '../types';

export type ProjectionTrend = 'stable' | 'rise' | 'fall' | 'manual';

export interface ProjectionMetricScenario {
  startValue: number;
  endValue: number;
  trend: ProjectionTrend;
}

export interface PopulationProjectionScenario {
  startYear: number;
  endYear: number;
  fertilityRate: ProjectionMetricScenario;
  deathRate: ProjectionMetricScenario;
}

export interface ProjectionMetricBaseline {
  value: number;
  year: number;
  rawValue?: number;
}

export interface ProjectionBaseline {
  population: number;
  startYear: number;
  fertilityRate: ProjectionMetricBaseline;
  birthRate: ProjectionMetricBaseline & { rawValue: number };
  deathRate: ProjectionMetricBaseline & { rawValue: number };
}

const MAX_AGE = 100;
const FEMALE_BIRTH_SHARE = 100 / 205;

const FERTILITY_WEIGHTS = buildFertilityWeights();

function buildFertilityWeights(): number[] {
  const weights: number[] = [];

  for (let age = 15; age <= 49; age += 1) {
    const primary = Math.exp(-((age - 29) ** 2) / (2 * 6.5 ** 2));
    const secondary = 0.45 * Math.exp(-((age - 24) ** 2) / (2 * 4.2 ** 2));
    weights.push(primary + secondary);
  }

  const total = weights.reduce((sum, value) => sum + value, 0) || 1;
  return weights.map((value) => value / total);
}

function sumPopulation(ageGroups: PopulationAgeGroup[]): number {
  return ageGroups.reduce((sum, group) => sum + group.male + group.female, 0);
}

function parseAgeBounds(group: PopulationAgeGroup): [number, number] {
  const trimmed = group.age.trim();

  if (/^\d+\+$/.test(trimmed)) {
    const start = Math.min(MAX_AGE, parseInt(trimmed, 10));
    return [start, MAX_AGE];
  }

  const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    const start = Math.min(MAX_AGE, parseInt(rangeMatch[1], 10));
    const end = Math.min(MAX_AGE, parseInt(rangeMatch[2], 10));
    return [Math.min(start, end), Math.max(start, end)];
  }

  const numeric = Number.isFinite(group.ageNumeric)
    ? Math.min(MAX_AGE, Math.max(0, Math.round(group.ageNumeric)))
    : 0;

  return [numeric, numeric];
}

function expandAgeGroups(ageGroups: PopulationAgeGroup[]) {
  const male = new Array<number>(MAX_AGE + 1).fill(0);
  const female = new Array<number>(MAX_AGE + 1).fill(0);

  for (const group of ageGroups) {
    const [from, to] = parseAgeBounds(group);
    const bucketSize = Math.max(1, to - from + 1);
    const maleShare = group.male / bucketSize;
    const femaleShare = group.female / bucketSize;

    for (let age = from; age <= to; age += 1) {
      male[age] += maleShare;
      female[age] += femaleShare;
    }
  }

  return { male, female };
}

function collapseAgeGroups(male: number[], female: number[]): PopulationAgeGroup[] {
  const result: PopulationAgeGroup[] = [];

  for (let age = 0; age <= MAX_AGE; age += 1) {
    const isOldest = age === MAX_AGE;
    result.push({
      age: isOldest ? `${age}+` : String(age),
      ageNumeric: age,
      male: Math.max(0, Math.round(male[age] ?? 0)),
      female: Math.max(0, Math.round(female[age] ?? 0)),
    });
  }

  return result;
}

function getPointForYear(
  series: Array<{ year: number; value: number }> | undefined,
  targetYear: number,
): { year: number; value: number } | null {
  if (!series || series.length === 0) return null;

  const exact = series.find((point) => point.year === targetYear);
  if (exact) return exact;

  const earlier = [...series]
    .filter((point) => point.year <= targetYear)
    .sort((a, b) => b.year - a.year)[0];

  if (earlier) return earlier;
  return series[series.length - 1] ?? null;
}

export function buildProjectionBaseline(
  profile: CountryDemographyProfile | null | undefined,
  ageGroups: PopulationAgeGroup[],
  startYear: number,
): ProjectionBaseline | null {
  if (!profile || ageGroups.length === 0) return null;

  const fertilityPoint = getPointForYear(profile.indicators.fertilityRate, startYear);
  const birthsPoint = getPointForYear(profile.indicators.liveBirths, startYear);
  const deathsPoint = getPointForYear(profile.indicators.deaths, startYear);

  if (!fertilityPoint || !birthsPoint || !deathsPoint) return null;

  const population = sumPopulation(ageGroups);
  if (!Number.isFinite(population) || population <= 0) return null;

  const birthRate = (birthsPoint.value / population) * 1000;
  const deathRate = (deathsPoint.value / population) * 1000;

  if (!Number.isFinite(birthRate) || !Number.isFinite(deathRate)) return null;

  return {
    population,
    startYear,
    fertilityRate: {
      value: fertilityPoint.value,
      year: fertilityPoint.year,
    },
    birthRate: {
      value: birthRate,
      year: birthsPoint.year,
      rawValue: birthsPoint.value,
    },
    deathRate: {
      value: deathRate,
      year: deathsPoint.year,
      rawValue: deathsPoint.value,
    },
  };
}

function interpolateMetric(metric: ProjectionMetricScenario, stepIndex: number, totalSteps: number): number {
  if (metric.trend === 'stable' || totalSteps <= 0) {
    return metric.startValue;
  }

  const progress = stepIndex / totalSteps;
  return metric.startValue + (metric.endValue - metric.startValue) * progress;
}

function mortalityWeight(age: number, sex: 'male' | 'female'): number {
  let weight: number;

  if (age === 0) {
    weight = 3.1;
  } else if (age <= 14) {
    weight = 0.22;
  } else if (age <= 39) {
    weight = 0.42 + (age - 15) * 0.018;
  } else if (age <= 59) {
    weight = 0.95 + (age - 40) * 0.07;
  } else if (age <= 74) {
    weight = 2.7 + (age - 60) * 0.22;
  } else if (age <= 89) {
    weight = 6.2 + (age - 75) * 0.62;
  } else {
    weight = 15.5 + (age - 90) * 1.35;
  }

  return weight * (sex === 'male' ? 1.1 : 0.92);
}

function createDeathProbabilities(male: number[], female: number[], targetDeaths: number) {
  const weights = new Array<{ male: number; female: number }>(MAX_AGE + 1);
  let weightedPopulation = 0;

  for (let age = 0; age <= MAX_AGE; age += 1) {
    const maleWeight = mortalityWeight(age, 'male');
    const femaleWeight = mortalityWeight(age, 'female');
    weights[age] = { male: maleWeight, female: femaleWeight };
    weightedPopulation += (male[age] ?? 0) * maleWeight + (female[age] ?? 0) * femaleWeight;
  }

  const scale = weightedPopulation > 0 ? targetDeaths / weightedPopulation : 0;

  return weights.map((weight, age) => {
    const cap = age >= 95 ? 0.78 : age >= 85 ? 0.52 : 0.32;
    return {
      male: Math.min(cap, Math.max(0, weight.male * scale)),
      female: Math.min(cap, Math.max(0, weight.female * scale)),
    };
  });
}

function calculateFertilityBirths(female: number[], tfr: number, calibration: number): number {
  let weightedFemalePopulation = 0;

  for (let age = 15; age <= 49; age += 1) {
    const femalePopulation = female[age] ?? 0;
    weightedFemalePopulation += femalePopulation * FERTILITY_WEIGHTS[age - 15];
  }

  return Math.max(0, weightedFemalePopulation * tfr * calibration);
}

function buildProjectionSource(title: string, scenario: PopulationProjectionScenario) {
  return `${title} projection scenario (${scenario.startYear}-${scenario.endYear}). `
    + `TFR ${scenario.fertilityRate.startValue.toFixed(2)}→${scenario.fertilityRate.endValue.toFixed(2)}, `
    + `deaths ${scenario.deathRate.startValue.toFixed(1)}→${scenario.deathRate.endValue.toFixed(1)} per 1,000; `
    + 'net migration ignored.';
}

export function buildProjectedTimeSeriesData(
  title: string,
  ageGroups: PopulationAgeGroup[],
  scenario: PopulationProjectionScenario,
  baseline: ProjectionBaseline,
): TimeSeriesPopulationData {
  const totalSteps = Math.max(0, scenario.endYear - scenario.startYear);
  const years: number[] = [];
  const dataByYear: Record<number, PopulationAgeGroup[]> = {};
  const { male: initialMale, female: initialFemale } = expandAgeGroups(ageGroups);

  let male = [...initialMale];
  let female = [...initialFemale];

  const baselineStructuralBirths = calculateFertilityBirths(
    initialFemale,
    baseline.fertilityRate.value,
    1,
  );
  const fertilityCalibration = baselineStructuralBirths > 0
    ? baseline.birthRate.rawValue / baselineStructuralBirths
    : 0;

  for (let year = scenario.startYear; year <= scenario.endYear; year += 1) {
    years.push(year);
    dataByYear[year] = collapseAgeGroups(male, female);

    if (year === scenario.endYear) {
      continue;
    }

    const stepIndex = year - scenario.startYear + 1;
    const targetTfr = Math.max(0, interpolateMetric(scenario.fertilityRate, stepIndex, totalSteps));
    const targetDeathRate = Math.max(0, interpolateMetric(scenario.deathRate, stepIndex, totalSteps));

    const totalPopulation = male.reduce((sum, value) => sum + value, 0)
      + female.reduce((sum, value) => sum + value, 0);

    const structuralBirths = calculateFertilityBirths(female, targetTfr, fertilityCalibration);
    const births = Math.max(0, structuralBirths);
    const targetDeaths = Math.max(0, totalPopulation * (targetDeathRate / 1000));

    const deathProbabilities = createDeathProbabilities(male, female, targetDeaths);
    const nextMale = new Array<number>(MAX_AGE + 1).fill(0);
    const nextFemale = new Array<number>(MAX_AGE + 1).fill(0);

    const maleBirths = births * (1 - FEMALE_BIRTH_SHARE);
    const femaleBirths = births * FEMALE_BIRTH_SHARE;
    nextMale[0] = maleBirths * (1 - deathProbabilities[0].male);
    nextFemale[0] = femaleBirths * (1 - deathProbabilities[0].female);

    for (let age = 1; age < MAX_AGE; age += 1) {
      nextMale[age] = (male[age - 1] ?? 0) * (1 - deathProbabilities[age - 1].male);
      nextFemale[age] = (female[age - 1] ?? 0) * (1 - deathProbabilities[age - 1].female);
    }

    nextMale[MAX_AGE] =
      (male[MAX_AGE - 1] ?? 0) * (1 - deathProbabilities[MAX_AGE - 1].male)
      + (male[MAX_AGE] ?? 0) * (1 - deathProbabilities[MAX_AGE].male);
    nextFemale[MAX_AGE] =
      (female[MAX_AGE - 1] ?? 0) * (1 - deathProbabilities[MAX_AGE - 1].female)
      + (female[MAX_AGE] ?? 0) * (1 - deathProbabilities[MAX_AGE].female);

    male = nextMale;
    female = nextFemale;
  }

  return {
    title,
    source: buildProjectionSource(title, scenario),
    years,
    dataByYear,
  };
}
