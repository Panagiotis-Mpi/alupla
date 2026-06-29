export const PUBLIC_MIN_GROUP_SIZE = 5;

type DataRow = Record<string, any>;

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function isSmallPositive(value: unknown) {
  const count = numberValue(value);
  return count > 0 && count < PUBLIC_MIN_GROUP_SIZE;
}

export function hasPublishablePublicGroup(value: unknown) {
  return numberValue(value) >= PUBLIC_MIN_GROUP_SIZE;
}

export function arePublicBinaryCountsSafe(left: unknown, right: unknown) {
  return !isSmallPositive(left) && !isSmallPositive(right);
}

function binaryCounts(row: DataRow) {
  if ("male" in row || "female" in row) return [numberValue(row.male), numberValue(row.female)] as const;
  if ("M" in row || "F" in row) return [numberValue(row.M), numberValue(row.F)] as const;
  if ("greece" in row || "abroad" in row) return [numberValue(row.greece), numberValue(row.abroad)] as const;
  return null;
}

function rowCount(row: DataRow) {
  if (row.count !== undefined && row.count !== null && row.count !== "") return numberValue(row.count);
  const pair = binaryCounts(row);
  return pair ? pair[0] + pair[1] : null;
}

function protectRows(rows: unknown[]) {
  let suppressed = false;
  const items = rows.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [item];
    const row = item as DataRow;
    const count = rowCount(row);
    const pair = binaryCounts(row);
    if ((count !== null && isSmallPositive(count)) || (pair && !arePublicBinaryCountsSafe(pair[0], pair[1]))) {
      suppressed = true;
      return [];
    }
    return [row];
  });
  return { items, suppressed };
}

function suppressedStatisticsBody(body: DataRow) {
  const result: DataRow = { ...body };
  for (const [key, value] of Object.entries(result)) {
    if (key === "ok") continue;
    if (Array.isArray(value)) {
      result[key] = [];
      continue;
    }
    if (key === "gender") {
      result[key] = { M: 0, F: 0 };
      continue;
    }
    if (key === "total" || key === "abroad_count" || key === "abroad_pct") {
      result[key] = 0;
      continue;
    }
    if (typeof value === "number" && (key.startsWith("avg_") || key.startsWith("min_") || key.startsWith("max_"))) {
      result[key] = null;
    }
  }
  result.privacy_suppressed = true;
  result.minimum_group_size = PUBLIC_MIN_GROUP_SIZE;
  return result;
}

export function protectPublicStatisticsBody<T extends DataRow>(body: T): T {
  const total = numberValue(body.total);
  if (isSmallPositive(total)) return suppressedStatisticsBody(body) as T;

  const result: DataRow = { ...body };
  let suppressed = false;

  for (const [key, value] of Object.entries(result)) {
    if (!Array.isArray(value)) continue;
    const protectedRows = protectRows(value);
    result[key] = protectedRows.items;
    suppressed = suppressed || protectedRows.suppressed;
  }

  if (result.gender && typeof result.gender === "object") {
    const male = numberValue(result.gender.M);
    const female = numberValue(result.gender.F);
    if (!arePublicBinaryCountsSafe(male, female)) {
      result.gender = { M: 0, F: 0 };
      suppressed = true;
    }
  }

  if (result.abroad_count !== undefined && total > 0) {
    const abroad = numberValue(result.abroad_count);
    const greece = Math.max(0, total - abroad);
    if (!arePublicBinaryCountsSafe(greece, abroad)) {
      result.abroad_count = 0;
      result.abroad_pct = 0;
      suppressed = true;
    }
  }

  if (suppressed) {
    result.privacy_suppressed = true;
    result.minimum_group_size = PUBLIC_MIN_GROUP_SIZE;
  }

  return result as T;
}

export function protectPublicMapMetrics<T extends DataRow>(value: T): T {
  const count = numberValue(value.count);
  if (isSmallPositive(count)) {
    return {
      ...value,
      count: 0,
      male_count: 0,
      female_count: 0,
      male_pct: 0,
      female_pct: 0,
      avg_age: null,
      min_age: null,
      max_age: null,
      avg_grade: null,
      avg_graduation_years: null,
      dominant_gender: null,
      dominant_study_program: null,
      privacy_suppressed: true,
      minimum_group_size: PUBLIC_MIN_GROUP_SIZE,
    } as T;
  }

  const male = numberValue(value.male_count);
  const female = numberValue(value.female_count);
  if (!arePublicBinaryCountsSafe(male, female)) {
    return {
      ...value,
      male_count: 0,
      female_count: 0,
      male_pct: 0,
      female_pct: 0,
      dominant_gender: null,
      privacy_suppressed: true,
      minimum_group_size: PUBLIC_MIN_GROUP_SIZE,
    } as T;
  }

  return value;
}
