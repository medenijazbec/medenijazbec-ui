// src/types/fitnessFunFacts.ts
export type TopDayDto = {
  day: string;           // ISO date
  steps: number;
  distanceKm: number | null;
  caloriesOut: number | null;
  isSynthetic: boolean;
};

export type WeekdayAvgDto = {
  weekday: number;       // 1=Mon..7=Sun
  avgSteps: number;
  avgKm: number;
};

export type MonthSumDto = {
  year: number;
  month: number;
  stepsSum: number;
  kmSum: number;
  days: number;
};

export type StreakDto = {
  threshold: number;
  length: number;
  start: string | null;
  end: string | null;
};

export type FunFactsResponse = {
  totalDays: number;
  daysWithData: number;
  totalSteps: number;
  totalKm: number;
  totalCaloriesOut: number | null;
  avgSteps: number;
  avgKm: number;
  daysStepsGte10k: number;
  daysStepsGte15k: number;
  daysKmGte5: number;
  daysKmGte10: number;
  bestStreakGte8k: StreakDto;
  bestStreakGte10k: StreakDto;
  weekdayAverages: WeekdayAvgDto[];
  bestMonthBySteps: MonthSumDto;
  bestMonthByKm: MonthSumDto;
  top10BySteps: TopDayDto[];
  top10ByKm: TopDayDto[];
  top10ByCaloriesOut: TopDayDto[];
};
