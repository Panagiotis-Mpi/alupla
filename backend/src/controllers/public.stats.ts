import { QueryTypes } from "sequelize";
import XLSX from "xlsx";
import { sequelize } from "../config/sequelize";

export type PublicWhereContext = {
  sqlWhere: string;
  repl: Record<string, unknown>;
  birthExpr?: string;
  birthYearExpr?: string;
};

const termCaseSql = `CASE
  WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
  WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
  WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
  ELSE 'other'
END`;

const termOrderSql = `CASE
  WHEN ${termCaseSql} = 'winter' THEN 1
  WHEN ${termCaseSql} = 'spring' THEN 2
  WHEN ${termCaseSql} = 'september' THEN 3
  ELSE 99
END`;

export function termLabel(term: string) {
  if (term === "winter") return "Χειμερινό";
  if (term === "spring") return "Εαρινό";
  if (term === "september") return "Σεπτέμβριος";
  return term;
}

async function queryRows<T extends Record<string, unknown>>(sql: string, context: PublicWhereContext): Promise<T[]> {
  const rows = await sequelize.query(sql, {
    replacements: context.repl,
    type: QueryTypes.SELECT,
  });
  return rows as T[];
}

export async function loadPublicStatsBundle(context: PublicWhereContext) {
  const birthExpr = context.birthExpr ?? "g.birth_date";
  const birthYearExpr = context.birthYearExpr ?? "EXTRACT(YEAR FROM g.birth_date)::int";

  const [
    totalRow,
    avgRow,
    byYear,
    byTerm,
    genderRows,
    genderByYear,
    genderByTerm,
    birthYearRows,
    ageRows,
    avgGradeByYear,
    avgGradeByProgram,
    gradeDist,
    durationRows,
    studyProgramRows,
    originRows,
    cityRows,
  ] = await Promise.all([
    queryRows<{ total: number }>(`SELECT COUNT(*) as total FROM graduates g ${context.sqlWhere}`, context),
    queryRows<{ avg_age: number | null; avg_degree_grade: number | null }>(
      `SELECT AVG(EXTRACT(YEAR FROM age(g.graduation_date, ${birthExpr}))) as avg_age,
              AVG(g.degree_grade) as avg_degree_grade
       FROM graduates g ${context.sqlWhere}`,
      context,
    ),
    queryRows<{ year: number; count: number }>(
      `SELECT EXTRACT(YEAR FROM g.graduation_date)::int as year,
              COUNT(*)::int as count
       FROM graduates g ${context.sqlWhere}
       GROUP BY EXTRACT(YEAR FROM g.graduation_date)
       ORDER BY year ASC`,
      context,
    ),
    queryRows<{ year: number; term: string; count: number }>(
      `SELECT EXTRACT(YEAR FROM g.graduation_date)::int as year,
              ${termCaseSql} as term,
              COUNT(*)::int as count
       FROM graduates g ${context.sqlWhere}
       GROUP BY EXTRACT(YEAR FROM g.graduation_date), ${termCaseSql}
       ORDER BY year ASC, ${termOrderSql} ASC`,
      context,
    ),
    queryRows<{ gender: string; count: number }>(
      `SELECT g.gender as gender, COUNT(*)::int as count
       FROM graduates g ${context.sqlWhere}
       GROUP BY g.gender`,
      context,
    ),
    queryRows<{ year: number; male: number; female: number }>(
      `SELECT EXTRACT(YEAR FROM g.graduation_date)::int as year,
              SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END)::int as male,
              SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END)::int as female
       FROM graduates g ${context.sqlWhere}
       GROUP BY EXTRACT(YEAR FROM g.graduation_date)
       ORDER BY year ASC`,
      context,
    ),
    queryRows<{ year: number; term: string; male: number; female: number }>(
      `SELECT EXTRACT(YEAR FROM g.graduation_date)::int as year,
              ${termCaseSql} as term,
              SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END)::int as male,
              SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END)::int as female
       FROM graduates g ${context.sqlWhere}
       GROUP BY EXTRACT(YEAR FROM g.graduation_date), ${termCaseSql}
       ORDER BY year ASC, ${termOrderSql} ASC`,
      context,
    ),
    queryRows<{ year: number; count: number }>(
      `SELECT ${birthYearExpr} as year,
              COUNT(*)::int as count
       FROM graduates g ${context.sqlWhere}
       GROUP BY ${birthYearExpr}
       ORDER BY year ASC`,
      context,
    ),
    queryRows<{ label: string; count: number }>(
      `SELECT CASE
                WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 23 AND 26 THEN '23-26'
                WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 27 AND 30 THEN '27-30'
                WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) >= 31 THEN '31+'
                ELSE 'unknown'
              END as label,
              COUNT(*)::int as count
       FROM graduates g ${context.sqlWhere}
       GROUP BY CASE
                  WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 23 AND 26 THEN '23-26'
                  WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 27 AND 30 THEN '27-30'
                  WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) >= 31 THEN '31+'
                  ELSE 'unknown'
                END
       ORDER BY CASE
                  WHEN CASE
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 23 AND 26 THEN '23-26'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 27 AND 30 THEN '27-30'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) >= 31 THEN '31+'
                    ELSE 'unknown'
                  END = '23-26' THEN 1
                  WHEN CASE
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 23 AND 26 THEN '23-26'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 27 AND 30 THEN '27-30'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) >= 31 THEN '31+'
                    ELSE 'unknown'
                  END = '27-30' THEN 2
                  WHEN CASE
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 23 AND 26 THEN '23-26'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 27 AND 30 THEN '27-30'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) >= 31 THEN '31+'
                    ELSE 'unknown'
                  END = '31+' THEN 3
                  ELSE 99
                END`,
      context,
    ),
    queryRows<{ year: number; avg: number }>(
      `SELECT EXTRACT(YEAR FROM g.graduation_date)::int as year,
              ROUND(AVG(g.degree_grade)::numeric, 2) as avg
       FROM graduates g ${context.sqlWhere}
       GROUP BY EXTRACT(YEAR FROM g.graduation_date)
       ORDER BY year ASC`,
      context,
    ),
    queryRows<{ study_program_id: number | null; avg: number }>(
      `SELECT g.study_program_id,
              ROUND(AVG(g.degree_grade)::numeric, 2) as avg
       FROM graduates g ${context.sqlWhere}
       GROUP BY g.study_program_id
       ORDER BY g.study_program_id ASC`,
      context,
    ),
    queryRows<{ bucket: string; count: number }>(
      `SELECT CASE
                WHEN g.degree_grade < 5 THEN '<5'
                WHEN g.degree_grade >= 5 AND g.degree_grade < 6 THEN '5-5.99'
                WHEN g.degree_grade >= 6 AND g.degree_grade < 7 THEN '6-6.99'
                WHEN g.degree_grade >= 7 AND g.degree_grade < 8 THEN '7-7.99'
                WHEN g.degree_grade >= 8 THEN '8+'
                ELSE 'unknown'
              END as bucket,
              COUNT(*)::int as count
       FROM graduates g ${context.sqlWhere}
       GROUP BY bucket
       ORDER BY CASE bucket
         WHEN '<5' THEN 1
         WHEN '5-5.99' THEN 2
         WHEN '6-6.99' THEN 3
         WHEN '7-7.99' THEN 4
         WHEN '8+' THEN 5
         ELSE 99
       END`,
      context,
    ),
    queryRows<{ entry_year: number; avg_years: number }>(
      `SELECT g.entry_year,
              ROUND(AVG(EXTRACT(YEAR FROM age(g.graduation_date, make_date(g.entry_year, 1, 1))))::numeric, 2) as avg_years
       FROM graduates g ${context.sqlWhere}
       GROUP BY g.entry_year
       ORDER BY g.entry_year ASC`,
      context,
    ),
    queryRows<{ study_program_id: number | null; count: number }>(
      `SELECT g.study_program_id, COUNT(*)::int as count
       FROM graduates g ${context.sqlWhere}
       GROUP BY g.study_program_id
       ORDER BY count DESC, g.study_program_id ASC`,
      context,
    ),
    queryRows<{ place: string; count: number }>(
      `SELECT COALESCE(NULLIF(TRIM(g.origin_region), ''), NULLIF(TRIM(g.origin_municipality), ''), NULLIF(TRIM(g.origin_country), ''), 'Unknown') as place,
              COUNT(*)::int as count
       FROM graduates g ${context.sqlWhere}
       GROUP BY place
       ORDER BY count DESC, place ASC
       LIMIT 20`,
      context,
    ),
    queryRows<{ place: string; count: number }>(
      `SELECT COALESCE(NULLIF(TRIM(g.origin_municipality), ''), 'Unknown') as place,
              COUNT(*)::int as count
       FROM graduates g ${context.sqlWhere}
       GROUP BY place
       ORDER BY count DESC, place ASC
       LIMIT 20`,
      context,
    ),
  ]);

  const gender = { M: 0, F: 0 };
  for (const row of genderRows) {
    if (row.gender === "M") gender.M = Number(row.count);
    if (row.gender === "F") gender.F = Number(row.count);
  }

  return {
    total: Number(totalRow[0]?.total ?? 0),
    avg_age: avgRow[0]?.avg_age != null ? Number(avgRow[0].avg_age) : null,
    avg_degree_grade: avgRow[0]?.avg_degree_grade != null ? Number(avgRow[0].avg_degree_grade) : null,
    byYear,
    byTerm,
    gender,
    genderByYear,
    genderByTerm,
    birthYearRows,
    ageRows,
    avgGradeByYear,
    avgGradeByProgram,
    gradeDist,
    durationRows,
    studyProgramRows,
    originRows,
    cityRows,
  };
}

type PublicMapRow = {
  region_id: number | null;
  region_name: string;
  region_type: string | null;
  count: number;
  male: number;
  female: number;
};

export async function loadPublicMapRows(context: PublicWhereContext) {
  return queryRows<PublicMapRow>(
    `SELECT
        g.origin_region_id as region_id,
        COALESCE(r.name, 'Unknown') as region_name,
        r.type as region_type,
        COUNT(*) as count,
        SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END) as male,
        SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END) as female
     FROM graduates g
     LEFT JOIN regions r ON r.id = g.origin_region_id
     ${context.sqlWhere}
     GROUP BY g.origin_region_id, r.name, r.type
     ORDER BY count DESC, region_name ASC`,
    context,
  );
}

export async function buildAnonymousStatisticsWorkbook(context: PublicWhereContext, countsMode: "year" | "semester", genderMode: "year" | "semester") {
  const [byYear, byTerm, genderByYear, genderByTerm] = await Promise.all([
    queryRows<{ year: number; count: number }>(
      `SELECT EXTRACT(YEAR FROM g.graduation_date)::int as year,
              COUNT(*)::int as count
       FROM graduates g ${context.sqlWhere}
       GROUP BY EXTRACT(YEAR FROM g.graduation_date)
       ORDER BY year ASC`,
      context,
    ),
    queryRows<{ year: number; term: string; count: number }>(
      `SELECT EXTRACT(YEAR FROM g.graduation_date)::int as year,
              ${termCaseSql} as term,
              COUNT(*)::int as count
       FROM graduates g ${context.sqlWhere}
       GROUP BY EXTRACT(YEAR FROM g.graduation_date), ${termCaseSql}
       ORDER BY year ASC, ${termOrderSql} ASC`,
      context,
    ),
    queryRows<{ year: number; male: number; female: number }>(
      `SELECT EXTRACT(YEAR FROM g.graduation_date)::int as year,
              SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END)::int as male,
              SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END)::int as female
       FROM graduates g ${context.sqlWhere}
       GROUP BY EXTRACT(YEAR FROM g.graduation_date)
       ORDER BY year ASC`,
      context,
    ),
    queryRows<{ year: number; term: string; male: number; female: number }>(
      `SELECT EXTRACT(YEAR FROM g.graduation_date)::int as year,
              ${termCaseSql} as term,
              SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END)::int as male,
              SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END)::int as female
       FROM graduates g ${context.sqlWhere}
       GROUP BY EXTRACT(YEAR FROM g.graduation_date), ${termCaseSql}
       ORDER BY year ASC, ${termOrderSql} ASC`,
      context,
    ),
  ]);

  const countsRows = countsMode === "semester"
    ? byTerm.filter((row) => row.term !== "other").map((row) => ({
        "Έτος": Number(row.year),
        "Εξάμηνο": termLabel(String(row.term)),
        "Πλήθος αποφοίτων": Number(row.count) || 0,
      }))
    : byYear.map((row) => ({
        "Έτος": Number(row.year),
        "Πλήθος αποφοίτων": Number(row.count) || 0,
      }));

  const genderRows = genderMode === "semester"
    ? genderByTerm.filter((row) => row.term !== "other").map((row) => ({
        "Έτος": Number(row.year),
        "Εξάμηνο": termLabel(String(row.term)),
        "Άνδρες": Number(row.male) || 0,
        "Γυναίκες": Number(row.female) || 0,
      }))
    : genderByYear.map((row) => ({
        "Έτος": Number(row.year),
        "Άνδρες": Number(row.male) || 0,
        "Γυναίκες": Number(row.female) || 0,
      }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(countsRows), "Πλήθος αποφοίτων");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(genderRows), "Αναλογία φύλων");

  return {
    buffer: XLSX.write(workbook, { type: "buffer", bookType: "xls" }),
    rowCount: countsRows.length + genderRows.length,
  };
}
