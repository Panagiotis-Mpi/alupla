import { calculateAgeAtDate } from "./map.helpers";

export type AggregatedMapMetricsRow = {
  gender: "M" | "F" | null;
  study_program_id: number | null;
  graduate_count: number | string | null;
  grade_sum: number | string | null;
  grade_count: number | string | null;
  age_sum: number | string | null;
  age_count: number | string | null;
  min_age: number | string | null;
  max_age: number | string | null;
  graduation_duration_sum: number | string | null;
  graduation_duration_count: number | string | null;
};

export type MapMetricsBucket = Record<string, any> & {
  count: number;
  male: number;
  female: number;
  ageSum: number;
  ageCount: number;
  minAge: number | null;
  maxAge: number | null;
  gradeSum: number;
  gradeCount: number;
  graduationDurationSum: number;
  graduationDurationCount: number;
  programCounts: Map<number, number>;
};

type MetricContribution = Omit<MapMetricsBucket, "programCounts"> & { studyProgramId: number };

function numberOrZero(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function graduateContribution(graduate: any): MetricContribution {
  const age = calculateAgeAtDate(graduate.birth_date, graduate.graduation_date);
  const grade = Number(graduate.degree_grade);
  const entryYear = Number(graduate.entry_year);
  const graduationYear = Number(String(graduate.graduation_date ?? "").slice(0, 4));
  const validDuration = Number.isFinite(entryYear) && Number.isFinite(graduationYear) && entryYear > 1900 && graduationYear >= entryYear;
  const validGrade = Number.isFinite(grade) && grade >= 0;
  return {
    count: 1,
    male: graduate.gender === "M" ? 1 : 0,
    female: graduate.gender === "F" ? 1 : 0,
    studyProgramId: Number(graduate.study_program_id) || 0,
    ageSum: age ?? 0,
    ageCount: age === null ? 0 : 1,
    minAge: age,
    maxAge: age,
    gradeSum: validGrade ? grade : 0,
    gradeCount: validGrade ? 1 : 0,
    graduationDurationSum: validDuration ? graduationYear - entryYear : 0,
    graduationDurationCount: validDuration ? 1 : 0,
  };
}

function aggregatedContribution(row: AggregatedMapMetricsRow): MetricContribution {
  const count = numberOrZero(row.graduate_count);
  const minAge = Number(row.min_age);
  const maxAge = Number(row.max_age);
  return {
    count,
    male: row.gender === "M" ? count : 0,
    female: row.gender === "F" ? count : 0,
    studyProgramId: Number(row.study_program_id) || 0,
    ageSum: numberOrZero(row.age_sum),
    ageCount: numberOrZero(row.age_count),
    minAge: Number.isFinite(minAge) ? minAge : null,
    maxAge: Number.isFinite(maxAge) ? maxAge : null,
    gradeSum: numberOrZero(row.grade_sum),
    gradeCount: numberOrZero(row.grade_count),
    graduationDurationSum: numberOrZero(row.graduation_duration_sum),
    graduationDurationCount: numberOrZero(row.graduation_duration_count),
  };
}

function applyContribution(bucket: MapMetricsBucket, value: MetricContribution) {
  if (value.count <= 0) return false;
  bucket.count += value.count;
  bucket.male += value.male;
  bucket.female += value.female;
  if (value.studyProgramId > 0) bucket.programCounts.set(value.studyProgramId, (bucket.programCounts.get(value.studyProgramId) || 0) + value.count);
  bucket.ageSum += value.ageSum;
  bucket.ageCount += value.ageCount;
  if (value.minAge !== null) bucket.minAge = bucket.minAge === null ? value.minAge : Math.min(bucket.minAge, value.minAge);
  if (value.maxAge !== null) bucket.maxAge = bucket.maxAge === null ? value.maxAge : Math.max(bucket.maxAge, value.maxAge);
  bucket.gradeSum += value.gradeSum;
  bucket.gradeCount += value.gradeCount;
  bucket.graduationDurationSum += value.graduationDurationSum;
  bucket.graduationDurationCount += value.graduationDurationCount;
  return true;
}

export function createMetricsBucket(seed: Record<string, unknown>): MapMetricsBucket {
  return { ...seed, count: 0, male: 0, female: 0, ageSum: 0, ageCount: 0, minAge: null, maxAge: null, gradeSum: 0, gradeCount: 0, graduationDurationSum: 0, graduationDurationCount: 0, programCounts: new Map<number, number>() };
}

export const applyGraduateMetrics = (bucket: MapMetricsBucket, graduate: any) => applyContribution(bucket, graduateContribution(graduate));
export const applyAggregatedMetrics = (bucket: MapMetricsBucket, row: AggregatedMapMetricsRow) => applyContribution(bucket, aggregatedContribution(row));

export function serializeMapMetrics(bucket: MapMetricsBucket) {
  return {
    count: bucket.count,
    male_count: bucket.male,
    female_count: bucket.female,
    male_pct: bucket.count ? Math.round((bucket.male / bucket.count) * 1000) / 10 : 0,
    female_pct: bucket.count ? Math.round((bucket.female / bucket.count) * 1000) / 10 : 0,
    avg_age: bucket.ageCount ? Math.round((bucket.ageSum / bucket.ageCount) * 10) / 10 : null,
    min_age: bucket.minAge === null ? null : Math.round(bucket.minAge * 10) / 10,
    max_age: bucket.maxAge === null ? null : Math.round(bucket.maxAge * 10) / 10,
    avg_grade: bucket.gradeCount ? Math.round((bucket.gradeSum / bucket.gradeCount) * 100) / 100 : null,
    avg_graduation_years: bucket.graduationDurationCount ? Math.round((bucket.graduationDurationSum / bucket.graduationDurationCount) * 10) / 10 : null,
    dominant_gender: !bucket.count ? null : bucket.male > bucket.female ? "M" : bucket.female > bucket.male ? "F" : "balanced",
  };
}
