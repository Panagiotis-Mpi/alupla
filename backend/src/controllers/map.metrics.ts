type MapMetricsBucket = Record<string, any> & {
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

type AggregateContribution = {
  count: number;
  male: number;
  female: number;
  studyProgramId: number;
  ageSum: number;
  ageCount: number;
  minAge: number | null;
  maxAge: number | null;
  gradeSum: number;
  gradeCount: number;
  graduationDurationSum: number;
  graduationDurationCount: number;
};

function numberOrZero(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function aggregateContribution(row: any): AggregateContribution {
  return {
    count: numberOrZero(row.count),
    male: numberOrZero(row.male),
    female: numberOrZero(row.female),
    studyProgramId: numberOrZero(row.study_program_id),
    ageSum: numberOrZero(row.age_sum),
    ageCount: numberOrZero(row.age_count),
    minAge: numberOrNull(row.min_age),
    maxAge: numberOrNull(row.max_age),
    gradeSum: numberOrZero(row.grade_sum),
    gradeCount: numberOrZero(row.grade_count),
    graduationDurationSum: numberOrZero(row.graduation_duration_sum),
    graduationDurationCount: numberOrZero(row.graduation_duration_count)
  };
}

function applyContribution(bucket: MapMetricsBucket, value: AggregateContribution) {
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

export const applyAggregateMetrics = (bucket: MapMetricsBucket, row: any) => applyContribution(bucket, aggregateContribution(row));

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
    dominant_gender: !bucket.count ? null : bucket.male > bucket.female ? "M" : bucket.female > bucket.male ? "F" : "balanced"
  };
}
