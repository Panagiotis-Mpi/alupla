// Υπολογίζει τα ανώνυμα στατιστικά που εμφανίζονται στη σελίδα Στατιστικά.
import XLSX from "xlsx";
import { sanitizeExportRows } from "../utils/exportSafety";
import {
  AnalyticsWhereContext,
  ExportLang,
  getCountByGraduationTerm,
  getCountByGraduationYear,
  getGenderByGraduationTerm,
  getGenderByGraduationYear,
  getTotalGraduates,
  queryAnalyticsRows,
  termLabel,
} from "../services/analyticsAggregations.service";
import { arePublicBinaryCountsSafe, hasPublishablePublicGroup } from "../services/publicPrivacy.service";

type PublicWhereContext = AnalyticsWhereContext;
type PublicExportLang = ExportLang;

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
     FROM graduate_details g
     LEFT JOIN regions r ON r.id = g.origin_region_id
     ${context.sqlWhere}
     GROUP BY g.origin_region_id, r.name, r.type
     ORDER BY count DESC, region_name ASC`,
    context,
  );
}

// Φτιάχνει Excel workbook με ανώνυμα στατιστικά.
export async function buildAnonymousStatisticsWorkbook(context: PublicWhereContext, countsMode: "year" | "semester", genderMode: "year" | "semester", lang: PublicExportLang = "gr") {
  const [totalRows, byYear, byTerm, genderByYear, genderByTerm] = await Promise.all([
    getTotalGraduates(context),
    getCountByGraduationYear(context),
    getCountByGraduationTerm(context),
    getGenderByGraduationYear(context),
    getGenderByGraduationTerm(context),
  ]);
  const total = Number(totalRows?.[0]?.total ?? 0);
  const publishable = total === 0 || hasPublishablePublicGroup(total);

  const labels = lang === "en"
    ? { year: "Year", semester: "Semester", count: "Graduate count", male: "Men", female: "Women", countsSheet: "Graduate count", genderSheet: "Gender ratio" }
    : { year: "Έτος", semester: "Εξάμηνο", count: "Πλήθος αποφοίτων", male: "Άνδρες", female: "Γυναίκες", countsSheet: "Πλήθος αποφοίτων", genderSheet: "Αναλογία φύλων" };

  const countsRows = !publishable ? [] : countsMode === "semester"
    ? byTerm.filter((row) => row.term !== "other" && hasPublishablePublicGroup(row.count)).map((row) => ({
        [labels.year]: Number(row.year),
        [labels.semester]: termLabel(String(row.term), lang),
        [labels.count]: Number(row.count) || 0,
      }))
    : byYear.filter((row) => hasPublishablePublicGroup(row.count)).map((row) => ({
        [labels.year]: Number(row.year),
        [labels.count]: Number(row.count) || 0,
      }));

  const genderRows = !publishable ? [] : genderMode === "semester"
    ? genderByTerm.filter((row) => row.term !== "other" && hasPublishablePublicGroup(Number(row.male) + Number(row.female)) && arePublicBinaryCountsSafe(row.male, row.female)).map((row) => ({
        [labels.year]: Number(row.year),
        [labels.semester]: termLabel(String(row.term), lang),
        [labels.male]: Number(row.male) || 0,
        [labels.female]: Number(row.female) || 0,
      }))
    : genderByYear.filter((row) => hasPublishablePublicGroup(Number(row.male) + Number(row.female)) && arePublicBinaryCountsSafe(row.male, row.female)).map((row) => ({
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
