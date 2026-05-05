import type { PopulationAgeGroup } from '../types';

export interface PopulationSummaryMetrics {
  totalPopulation: number;
  malePopulation: number;
  femalePopulation: number;
  medianAge: number | null;
  youngShare: number | null;
  workingAgeShare: number | null;
  seniorShare: number | null;
  dependencyRatio: number | null;
  sexRatio: number | null;
}

export function calculatePopulationSummary(
  ageGroups: PopulationAgeGroup[],
  hasGenderData = true
): PopulationSummaryMetrics {
  let malePopulation = 0;
  let femalePopulation = 0;
  let youngPopulation = 0;
  let workingPopulation = 0;
  let seniorPopulation = 0;

  for (const group of ageGroups) {
    const total = group.male + group.female;

    malePopulation += group.male;
    femalePopulation += group.female;

    if (group.ageNumeric <= 14) {
      youngPopulation += total;
    } else if (group.ageNumeric <= 64) {
      workingPopulation += total;
    } else {
      seniorPopulation += total;
    }
  }

  const totalPopulation = malePopulation + femalePopulation;
  const toShare = (value: number): number | null => (
    totalPopulation > 0 ? (value / totalPopulation) * 100 : null
  );

  let medianAge: number | null = null;
  if (totalPopulation > 0) {
    const halfPopulation = totalPopulation / 2;
    let cumulative = 0;

    for (const group of ageGroups) {
      cumulative += group.male + group.female;
      if (cumulative >= halfPopulation) {
        medianAge = group.ageNumeric;
        break;
      }
    }
  }

  return {
    totalPopulation,
    malePopulation,
    femalePopulation,
    medianAge,
    youngShare: toShare(youngPopulation),
    workingAgeShare: toShare(workingPopulation),
    seniorShare: toShare(seniorPopulation),
    dependencyRatio: workingPopulation > 0
      ? ((youngPopulation + seniorPopulation) / workingPopulation) * 100
      : null,
    sexRatio: hasGenderData && femalePopulation > 0
      ? (malePopulation / femalePopulation) * 100
      : null,
  };
}
