import type { TFunction } from "i18next";
import * as XLSX from "xlsx";
import { exportCsvText, exportWorkbook } from "./map/mapExport";

export type StatisticsChartId =
  | "byYear"
  | "gender"
  | "birthYear"
  | "studyProgram"
  | "gradeByYear"
  | "avgGradeByProgram"
  | "gradeDistribution"
  | "genderByProgram"
  | "direction"
  | "originRegion"
  | "originMunicipality"
  | "timeToDegreeByEntryYear"
  | "timeToDegreeDistribution";

type NamedCountRow = {
  id?: number | null;
  study_program_id?: number | null;
  name?: string | null;
  name_el?: string | null;
  name_en?: string | null;
  label?: string | null;
  count?: number | null;
  avg?: number | null;
  avg_years?: number | null;
  year?: number | null;
  entry_year?: number | null;
  male?: number | null;
  female?: number | null;
};

type SheetRow = Record<string, string | number>;

type BuildArgs = {
  data: any;
  t: TFunction;
  activeLang: "el" | "en";
  total: number;
  avgAge: string | number;
  avgGrade: string | number;
  earliestYear: string | number;
  busiestYear: string | number;
  busiestCity: string | number;
  selectedDirectionProgramId: string;
  selectedChartIds?: StatisticsChartId[];
};

function text(v: unknown) {
  return v === null || v === undefined ? "" : String(v);
}

function num(v: unknown) {
  const value = Number(v ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function localizedName(row: NamedCountRow, activeLang: "el" | "en") {
  if (activeLang === "en") return text(row.name_en ?? row.name_el ?? row.name ?? row.label);
  return text(row.name_el ?? row.name_en ?? row.name ?? row.label);
}

function csvCell(value: unknown) {
  const v = String(value ?? "");
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function buildSheets(args: BuildArgs) {
  const { data, t, activeLang, selectedDirectionProgramId } = args;
  const sheets = new Map<StatisticsChartId, { name: string; rows: SheetRow[] }>();

  sheets.set("byYear", {
    name: activeLang === "en" ? "By Year" : "Ανά έτος",
    rows: (data?.by_year ?? []).map((row: any) => ({
      [t("table.year")]: num(row.year),
      [t("table.count")]: num(row.count),
    })),
  });

  sheets.set("gender", {
    name: activeLang === "en" ? "Gender By Year" : "Φύλο ανά έτος",
    rows: (data?.gender_by_year ?? []).map((row: any) => ({
      [t("table.year")]: num(row.year),
      [t("table.male")]: num(row.male),
      [t("table.female")]: num(row.female),
    })),
  });

  sheets.set("birthYear", {
    name: activeLang === "en" ? "Birth Years" : "Έτη γέννησης",
    rows: (data?.birth_year_distribution ?? []).map((row: NamedCountRow) => ({
      [t("table.year")]: num(row.year),
      [t("table.count")]: num(row.count),
    })),
  });

  sheets.set("studyProgram", {
    name: activeLang === "en" ? "Programs" : "Προγράμματα",
    rows: (data?.study_program_distribution ?? []).map((row: NamedCountRow) => ({
      [t("filters.studyProgram")]: localizedName(row, activeLang),
      [t("table.count")]: num(row.count),
    })),
  });

  sheets.set("gradeByYear", {
    name: activeLang === "en" ? "Avg Grade By Year" : "ΜΟ βαθμού ανά έτος",
    rows: (data?.avg_grade_by_year ?? []).map((row: NamedCountRow) => ({
      [t("table.year")]: num(row.year),
      [t("table.avg")]: num(row.avg),
    })),
  });

  sheets.set("avgGradeByProgram", {
    name: activeLang === "en" ? "Avg Grade By Program" : "ΜΟ βαθμού ανά πρόγραμμα",
    rows: (data?.avg_grade_by_program ?? []).map((row: NamedCountRow) => ({
      [t("filters.studyProgram")]: localizedName(row, activeLang),
      [t("table.avg")]: num(row.avg),
    })),
  });

  sheets.set("gradeDistribution", {
    name: activeLang === "en" ? "Grade Distribution" : "Κατανομή βαθμού",
    rows: (data?.degree_grade_bins ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "Grade Range" : "Εύρος βαθμού"]: text(row.label),
      [t("table.count")]: num(row.count),
    })),
  });

  sheets.set("genderByProgram", {
    name: activeLang === "en" ? "Gender By Program" : "Φύλο ανά πρόγραμμα",
    rows: (data?.gender_by_program ?? []).map((row: NamedCountRow) => ({
      [t("filters.studyProgram")]: localizedName(row, activeLang),
      [t("table.male")]: num(row.male),
      [t("table.female")]: num(row.female),
    })),
  });

  const directionRows = (Array.isArray(data?.direction_distribution) ? data.direction_distribution : []) as NamedCountRow[];
  const visibleDirectionRows = selectedDirectionProgramId === "all"
    ? directionRows
    : directionRows.filter((row) => String(row.study_program_id ?? "") === selectedDirectionProgramId);

  sheets.set("direction", {
    name: activeLang === "en" ? "Directions" : "Κατευθύνσεις",
    rows: visibleDirectionRows.map((row) => ({
      [t("filters.studyProgram")]: text(
        activeLang === "en"
          ? row.name_en ?? row.name_el ?? row.name ?? ""
          : row.name_el ?? row.name_en ?? row.name ?? ""
      ),
      [t("table.count")]: num(row.count),
    })),
  });

  sheets.set("originRegion", {
    name: activeLang === "en" ? "Origin Regions" : "Περιφέρειες καταγωγής",
    rows: (data?.origin_region_distribution ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "Region" : "Περιφέρεια"]: localizedName(row, activeLang),
      [t("table.count")]: num(row.count),
    })),
  });

  sheets.set("originMunicipality", {
    name: activeLang === "en" ? "Origin Cities" : "Πόλεις καταγωγής",
    rows: (data?.origin_municipality_distribution ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "City" : "Πόλη"]: text(row.name),
      [t("table.count")]: num(row.count),
    })),
  });

  sheets.set("timeToDegreeByEntryYear", {
    name: activeLang === "en" ? "Years To Degree" : "Χρόνια σπουδών",
    rows: (data?.avg_years_to_degree_by_entry_year ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "Entry Year" : "Έτος εισαγωγής"]: num(row.entry_year),
      [t("table.avgYears")]: num(row.avg_years),
    })),
  });

  sheets.set("timeToDegreeDistribution", {
    name: activeLang === "en" ? "Years To Degree Dist" : "Κατανομή χρόνων σπουδών",
    rows: (data?.years_to_degree_distribution ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "Years" : "Χρόνια"]: text(row.label),
      [t("table.count")]: num(row.count),
    })),
  });

  const selectedIds = Array.isArray(args.selectedChartIds) && args.selectedChartIds.length
    ? args.selectedChartIds
    : Array.from(sheets.keys());

  return selectedIds
    .map((chartId) => sheets.get(chartId))
    .filter((sheet): sheet is { name: string; rows: SheetRow[] } => !!sheet && sheet.rows.length > 0);
}

export function exportStatisticsWorkbookFile(args: BuildArgs) {
  const workbook = XLSX.utils.book_new();
  for (const sheet of buildSheets(args)) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    const headers = Object.keys(sheet.rows[0] ?? {});
    ws["!cols"] = headers.map((header) => ({ wch: Math.max(14, String(header).length + 4) }));
    XLSX.utils.book_append_sheet(workbook, ws, sheet.name.slice(0, 31));
  }
  exportWorkbook("alupla_statistics_export.xlsx", workbook);
}

export function exportStatisticsCsvFile(args: BuildArgs) {
  const blocks = buildSheets(args);
  const lines: string[] = [];

  blocks.forEach((block, index) => {
    lines.push(csvCell(block.name));
    const headers = Object.keys(block.rows[0] ?? {});
    lines.push(headers.map(csvCell).join(","));
    block.rows.forEach((row) => {
      lines.push(headers.map((header) => csvCell(row[header])).join(","));
    });
    if (index < blocks.length - 1) lines.push("");
  });

  exportCsvText("alupla_statistics_export.csv", lines.join("\n"));
}
