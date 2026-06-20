import { QueryTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export type AnalyticsWhereContext = {
  sqlWhere: string;
  repl: Record<string, unknown>;
  birthExpr?: string;
  birthYearExpr?: string;
};

export type ExportLang = "gr" | "en";

export const termCaseSql = `CASE
  WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
  WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
  WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
  ELSE 'other'
END`;

export const termOrderSql = `CASE
  WHEN ${termCaseSql} = 'winter' THEN 1
  WHEN ${termCaseSql} = 'spring' THEN 2
  WHEN ${termCaseSql} = 'september' THEN 3
  ELSE 99
END`;

const gradeBucketSql = `CASE
  WHEN g.degree_grade < 5 THEN '<5'
  WHEN g.degree_grade < 6 THEN '5-5.99'
  WHEN g.degree_grade < 7 THEN '6-6.99'
  WHEN g.degree_grade < 8 THEN '7-7.99'
  WHEN g.degree_grade < 9 THEN '8-8.99'
  ELSE '9-10'
END`;

const gradeBucketOrderSql = `CASE
  WHEN ${gradeBucketSql} = '<5' THEN 1
  WHEN ${gradeBucketSql} = '5-5.99' THEN 2
  WHEN ${gradeBucketSql} = '6-6.99' THEN 3
  WHEN ${gradeBucketSql} = '7-7.99' THEN 4
  WHEN ${gradeBucketSql} = '8-8.99' THEN 5
  ELSE 6
END`;

export async function queryAnalyticsRows<T extends Record<string, unknown>>(sql: string, context?: AnalyticsWhereContext): Promise<T[]> {
  const rows = await sequelize.query(sql, {
    replacements: context?.repl ?? {},
    type: QueryTypes.SELECT,
  });
  return rows as T[];
}

export function termLabel(term: string, lang: ExportLang = "gr") {
  if (lang === "en") {
    if (term === "winter") return "Winter";
    if (term === "spring") return "Spring";
    if (term === "september") return "September";
    return term;
  }
  if (term === "winter") return "Χειμερινό";
  if (term === "spring") return "Εαρινό";
  if (term === "september") return "Σεπτέμβριος";
  return term;
}

export async function getGraduationYears() {
  const rows = await queryAnalyticsRows<{ year: number | null }>(
    `SELECT DISTINCT DATE_PART('year', graduation_date)::INTEGER AS year
     FROM graduates
     WHERE graduation_date IS NOT NULL
     ORDER BY year ASC`,
  );
  return rows
    .map((row) => Number(row.year))
    .filter((year) => Number.isFinite(year) && year > 1900)
    .sort((left, right) => left - right);
}

export async function getTotalGraduates(context: AnalyticsWhereContext) {
  return queryAnalyticsRows<{ total: number }>(`SELECT COUNT(*) as total FROM graduates g ${context.sqlWhere}`, context);
}

export async function getOverviewSummary(context: AnalyticsWhereContext) {
  const birthExpr = context.birthExpr ?? "g.birth_date";
  return queryAnalyticsRows<{
    avg_age: number | null;
    min_age: number | null;
    max_age: number | null;
    avg_degree_grade: number | null;
    min_degree_grade: number | null;
    max_degree_grade: number | null;
    avg_years_to_degree: number | null;
    min_years_to_degree: number | null;
    max_years_to_degree: number | null;
  }>(
    `SELECT AVG(EXTRACT(YEAR FROM age(g.graduation_date, ${birthExpr}))) as avg_age,
            MIN(EXTRACT(YEAR FROM age(g.graduation_date, ${birthExpr}))) as min_age,
            MAX(EXTRACT(YEAR FROM age(g.graduation_date, ${birthExpr}))) as max_age,
            AVG(g.degree_grade) as avg_degree_grade,
            MIN(g.degree_grade) as min_degree_grade,
            MAX(g.degree_grade) as max_degree_grade,
            AVG(CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) - g.entry_year) as avg_years_to_degree,
            MIN(CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) - g.entry_year) as min_years_to_degree,
            MAX(CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) - g.entry_year) as max_years_to_degree
     FROM graduates g ${context.sqlWhere}`,
    context,
  );
}

export async function getCountByGraduationYear(context: AnalyticsWhereContext) {
  return queryAnalyticsRows<{ year: number; count: number }>(
    `SELECT CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) as year,
            CAST(COUNT(*) AS INTEGER) as count
     FROM graduates g ${context.sqlWhere}
     GROUP BY EXTRACT(YEAR FROM g.graduation_date)
     ORDER BY year ASC`,
    context,
  );
}

export async function getCountByGraduationTerm(context: AnalyticsWhereContext) {
  return queryAnalyticsRows<{ year: number; term: string; count: number }>(
    `SELECT CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) as year,
            ${termCaseSql} as term,
            CAST(COUNT(*) AS INTEGER) as count
     FROM graduates g ${context.sqlWhere}
     GROUP BY EXTRACT(YEAR FROM g.graduation_date), ${termCaseSql}
     ORDER BY year ASC, ${termOrderSql} ASC`,
    context,
  );
}

export async function getGenderCounts(context: AnalyticsWhereContext) {
  return queryAnalyticsRows<{ gender: string; count: number }>(
    `SELECT g.gender as gender, CAST(COUNT(*) AS INTEGER) as count
     FROM graduates g ${context.sqlWhere}
     GROUP BY g.gender`,
    context,
  );
}

export function genderRowsToCounts(rows: { gender: string; count: number }[]) {
  const gender = { M: 0, F: 0 };
  for (const row of rows) {
    if (row.gender === "M") gender.M = Number(row.count);
    if (row.gender === "F") gender.F = Number(row.count);
  }
  return gender;
}

export async function getGenderByGraduationYear(context: AnalyticsWhereContext) {
  return queryAnalyticsRows<{ year: number; male: number; female: number }>(
    `SELECT CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) as year,
            CAST(SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END) AS INTEGER) as male,
            CAST(SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END) AS INTEGER) as female
     FROM graduates g ${context.sqlWhere}
     GROUP BY EXTRACT(YEAR FROM g.graduation_date)
     ORDER BY year ASC`,
    context,
  );
}

export async function getGenderByGraduationTerm(context: AnalyticsWhereContext) {
  return queryAnalyticsRows<{ year: number; term: string; male: number; female: number }>(
    `SELECT CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) as year,
            ${termCaseSql} as term,
            CAST(SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END) AS INTEGER) as male,
            CAST(SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END) AS INTEGER) as female
     FROM graduates g ${context.sqlWhere}
     GROUP BY EXTRACT(YEAR FROM g.graduation_date), ${termCaseSql}
     ORDER BY year ASC, ${termOrderSql} ASC`,
    context,
  );
}

export async function getCountByBirthYear(context: AnalyticsWhereContext, birthYearExpr?: string) {
  const expr = birthYearExpr ?? context.birthYearExpr ?? "CAST(EXTRACT(YEAR FROM g.birth_date) AS INTEGER)";
  return queryAnalyticsRows<{ year: number; count: number }>(
    `SELECT ${expr} as year,
            CAST(COUNT(*) AS INTEGER) as count
     FROM graduates g ${context.sqlWhere}
     GROUP BY ${expr}
     ORDER BY year ASC`,
    context,
  );
}

export async function getGenderByBirthYear(context: AnalyticsWhereContext, birthYearExpr?: string) {
  const expr = birthYearExpr ?? context.birthYearExpr ?? "CAST(EXTRACT(YEAR FROM g.birth_date) AS INTEGER)";
  return queryAnalyticsRows<{ year: number; male: number; female: number }>(
    `SELECT ${expr} as year,
            CAST(SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END) AS INTEGER) as male,
            CAST(SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END) AS INTEGER) as female
     FROM graduates g ${context.sqlWhere}
     GROUP BY ${expr}
     ORDER BY year ASC`,
    context,
  );
}

export async function getAgeGroups(context: AnalyticsWhereContext) {
  const birthExpr = context.birthExpr ?? "g.birth_date";
  return queryAnalyticsRows<{ label: string; count: number }>(
    `SELECT CASE
              WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 23 AND 26 THEN '23-26'
              WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 27 AND 30 THEN '27-30'
              WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) >= 31 THEN '31+'
              ELSE 'unknown'
            END as label,
            CAST(COUNT(*) AS INTEGER) as count
     FROM graduates g ${context.sqlWhere}
     GROUP BY label
     ORDER BY CASE label WHEN '23-26' THEN 1 WHEN '27-30' THEN 2 WHEN '31+' THEN 3 ELSE 99 END`,
    context,
  );
}

export async function getCountByEntryYear(context: AnalyticsWhereContext) {
  return queryAnalyticsRows<{ entry_year: number; count: number }>(
    `SELECT CAST(g.entry_year AS INTEGER) as entry_year,
            CAST(COUNT(*) AS INTEGER) as count
     FROM graduates g ${context.sqlWhere}
     GROUP BY g.entry_year
     ORDER BY g.entry_year ASC`,
    context,
  );
}

export async function getGenderByEntryYear(context: AnalyticsWhereContext) {
  return queryAnalyticsRows<{ entry_year: number; male: number; female: number }>(
    `SELECT CAST(g.entry_year AS INTEGER) as entry_year,
            CAST(SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END) AS INTEGER) as male,
            CAST(SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END) AS INTEGER) as female
     FROM graduates g ${context.sqlWhere}
     GROUP BY g.entry_year
     ORDER BY g.entry_year ASC`,
    context,
  );
}

export async function getAverageGradeByGraduationYear(context: AnalyticsWhereContext) {
  return queryAnalyticsRows<{ year: number; avg: number }>(
    `SELECT CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) as year,
            ROUND(CAST(AVG(g.degree_grade) AS NUMERIC), 2) as avg
     FROM graduates g ${context.sqlWhere}
     GROUP BY EXTRACT(YEAR FROM g.graduation_date)
     ORDER BY year ASC`,
    context,
  );
}

export async function getAverageAgeByGraduationYear(context: AnalyticsWhereContext) {
  const birthExpr = context.birthExpr ?? "g.birth_date";
  return queryAnalyticsRows<{ year: number; count: number; avg_age: number }>(
    `SELECT CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) as year,
            CAST(COUNT(*) AS INTEGER) as count,
            ROUND(CAST(AVG(EXTRACT(YEAR FROM age(g.graduation_date, ${birthExpr}))) AS NUMERIC), 2) as avg_age
     FROM graduates g ${context.sqlWhere}
     GROUP BY EXTRACT(YEAR FROM g.graduation_date)
     ORDER BY year ASC`,
    context,
  );
}

export async function getAverageYearsToDegreeByGraduationYear(context: AnalyticsWhereContext) {
  return queryAnalyticsRows<{ year: number; count: number; avg_years: number }>(
    `SELECT CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) as year,
            CAST(COUNT(*) AS INTEGER) as count,
            ROUND(CAST(AVG(EXTRACT(YEAR FROM g.graduation_date) - g.entry_year) AS NUMERIC), 2) as avg_years
     FROM graduates g ${context.sqlWhere}
     GROUP BY EXTRACT(YEAR FROM g.graduation_date)
     ORDER BY year ASC`,
    context,
  );
}

export async function getDegreeGradeBins(context: AnalyticsWhereContext) {
  return queryAnalyticsRows<{ label: string; count: number }>(
    `SELECT ${gradeBucketSql} as label,
            CAST(COUNT(*) AS INTEGER) as count
     FROM graduates g ${context.sqlWhere}
     GROUP BY ${gradeBucketSql}
     ORDER BY ${gradeBucketOrderSql} ASC`,
    context,
  );
}

export async function getDegreeGradeBinsByGender(context: AnalyticsWhereContext) {
  return queryAnalyticsRows<{ label: string; male: number; female: number }>(
    `SELECT ${gradeBucketSql} as label,
            CAST(SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END) AS INTEGER) as male,
            CAST(SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END) AS INTEGER) as female
     FROM graduates g ${context.sqlWhere}
     GROUP BY ${gradeBucketSql}
     ORDER BY ${gradeBucketOrderSql} ASC`,
    context,
  );
}

export async function getAverageYearsToDegreeByEntryYear(context: AnalyticsWhereContext) {
  return queryAnalyticsRows<{ entry_year: number; avg_years: number }>(
    `SELECT CAST(g.entry_year AS INTEGER) as entry_year,
            ROUND(CAST(AVG(EXTRACT(YEAR FROM g.graduation_date) - g.entry_year) AS NUMERIC), 2) as avg_years
     FROM graduates g ${context.sqlWhere}
     GROUP BY g.entry_year
     ORDER BY entry_year ASC`,
    context,
  );
}

export async function getYearsToDegreeDistribution(context: AnalyticsWhereContext) {
  const scopedWhere = context.sqlWhere ? `${context.sqlWhere} AND g.graduation_date IS NOT NULL` : "WHERE g.graduation_date IS NOT NULL";
  return queryAnalyticsRows<{ label: string; count: number }>(
    `SELECT CAST((CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) - g.entry_year) AS TEXT) as label,
            CAST(COUNT(*) AS INTEGER) as count
     FROM graduates g ${scopedWhere}
     GROUP BY (CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) - g.entry_year)
     ORDER BY (CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) - g.entry_year) ASC`,
    context,
  );
}

export async function getOriginRows(context: AnalyticsWhereContext) {
  return queryAnalyticsRows<{ place: string; count: number }>(
    `SELECT COALESCE(NULLIF(TRIM(r.name), ''), NULLIF(TRIM(g.origin_municipality), ''), NULLIF(TRIM(g.origin_country), ''), 'Unknown') as place,
            CAST(COUNT(*) AS INTEGER) as count
     FROM graduates g
     LEFT JOIN regions r ON r.id = g.origin_region_id
     ${context.sqlWhere}
     GROUP BY place
     ORDER BY count DESC, place ASC
     LIMIT 20`,
    context,
  );
}

export async function getCityRows(context: AnalyticsWhereContext) {
  return queryAnalyticsRows<{ place: string; count: number }>(
    `SELECT COALESCE(NULLIF(TRIM(g.origin_municipality), ''), 'Unknown') as place,
            CAST(COUNT(*) AS INTEGER) as count
     FROM graduates g ${context.sqlWhere}
     GROUP BY place
     ORDER BY count DESC, place ASC
     LIMIT 20`,
    context,
  );
}
