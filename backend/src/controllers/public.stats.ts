// Υπολογίζει τα ανώνυμα στατιστικά που εμφανίζονται στη σελίδα Στατιστικά.
import XLSX from "xlsx";
import { sanitizeExportRows } from "../utils/exportSafety";
import {
  AnalyticsWhereContext,
  ExportLang,
  getAgeGroups,
  getAverageGradeByGraduationYear,
  getCityRows,
  getCountByBirthYear,
  getCountByGraduationTerm,
  getCountByGraduationYear,
  getGenderByGraduationTerm,
  getGenderByGraduationYear,
  getGenderCounts,
  getOriginRows,
  getOverviewSummary,
  getTotalGraduates,
  genderRowsToCounts,
  queryAnalyticsRows,
  termLabel,
} from "../services/analyticsAggregations.service";

export type PublicWhereContext = AnalyticsWhereContext;
type PublicExportLang = ExportLang;

// Φορτώνει όλα τα aggregated data για τη σελίδα Στατιστικά.
export async function loadPublicStatsBundle(context: PublicWhereContext) {
  const birthExpr = context.birthExpr ?? "g.birth_date";
  const birthYearExpr = context.birthYearExpr ?? "CAST(EXTRACT(YEAR FROM g.birth_date) AS INTEGER)";

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
    gradeDist,
    durationRows,
    originRows,
    cityRows,
  ] = await Promise.all([
    getTotalGraduates(context),
    getOverviewSummary(context),
    getCountByGraduationYear(context),
    getCountByGraduationTerm(context),
    getGenderCounts(context),
    getGenderByGraduationYear(context),
    getGenderByGraduationTerm(context),
    getCountByBirthYear(context, birthYearExpr),
    getAgeGroups(context),
    getAverageGradeByGraduationYear(context),
    queryAnalyticsRows<{ bucket: string; count: number }>(
      `SELECT CASE
                WHEN g.degree_grade < 5 THEN '<5'
                WHEN g.degree_grade >= 5 AND g.degree_grade < 6 THEN '5-5.99'
                WHEN g.degree_grade >= 6 AND g.degree_grade < 7 THEN '6-6.99'
                WHEN g.degree_grade >= 7 AND g.degree_grade < 8 THEN '7-7.99'
                WHEN g.degree_grade >= 8 THEN '8+'
                ELSE 'unknown'
              END as bucket,
              CAST(COUNT(*) AS INTEGER) as count
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
    queryAnalyticsRows<{ entry_year: number; avg_years: number }>(
      `SELECT g.entry_year,
              ROUND(CAST(AVG(EXTRACT(YEAR FROM age(g.graduation_date, make_date(g.entry_year, 1, 1)))) AS NUMERIC), 2) as avg_years
       FROM graduates g ${context.sqlWhere}
       GROUP BY g.entry_year
       ORDER BY g.entry_year ASC`,
      context,
    ),
    getOriginRows(context),
    getCityRows(context),
  ]);

  const gender = genderRowsToCounts(genderRows);

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
    gradeDist,
    durationRows,
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

// Φορτώνει γραμμές για τον χάρτη με τα ίδια φίλτρα στατιστικών.
export async function loadPublicMapRows(context: PublicWhereContext) {
  return queryAnalyticsRows<PublicMapRow>(
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

// Φτιάχνει Excel workbook με ανώνυμα στατιστικά.
export async function buildAnonymousStatisticsWorkbook(context: PublicWhereContext, countsMode: "year" | "semester", genderMode: "year" | "semester", lang: PublicExportLang = "gr") {
  const [byYear, byTerm, genderByYear, genderByTerm] = await Promise.all([
    getCountByGraduationYear(context),
    getCountByGraduationTerm(context),
    getGenderByGraduationYear(context),
    getGenderByGraduationTerm(context),
  ]);

  const labels = lang === "en"
    ? { year: "Year", semester: "Semester", count: "Graduate count", male: "Men", female: "Women", countsSheet: "Graduate count", genderSheet: "Gender ratio" }
    : { year: "Έτος", semester: "Εξάμηνο", count: "Πλήθος αποφοίτων", male: "Άνδρες", female: "Γυναίκες", countsSheet: "Πλήθος αποφοίτων", genderSheet: "Αναλογία φύλων" };

  const countsRows = countsMode === "semester"
    ? byTerm.filter((row) => row.term !== "other").map((row) => ({
        [labels.year]: Number(row.year),
        [labels.semester]: termLabel(String(row.term), lang),
        [labels.count]: Number(row.count) || 0,
      }))
    : byYear.map((row) => ({
        [labels.year]: Number(row.year),
        [labels.count]: Number(row.count) || 0,
      }));

  const genderRows = genderMode === "semester"
    ? genderByTerm.filter((row) => row.term !== "other").map((row) => ({
        [labels.year]: Number(row.year),
        [labels.semester]: termLabel(String(row.term), lang),
        [labels.male]: Number(row.male) || 0,
        [labels.female]: Number(row.female) || 0,
      }))
    : genderByYear.map((row) => ({
        [labels.year]: Number(row.year),
        [labels.male]: Number(row.male) || 0,
        [labels.female]: Number(row.female) || 0,
      }));

  const safeCountsRows = sanitizeExportRows(countsRows);
  const safeGenderRows = sanitizeExportRows(genderRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(safeCountsRows), labels.countsSheet);
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(safeGenderRows), labels.genderSheet);

  return {
    buffer: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    rowCount: safeCountsRows.length + safeGenderRows.length,
  };
}
