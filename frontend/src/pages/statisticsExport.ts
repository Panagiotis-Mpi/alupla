import type { TFunction } from "i18next";
import * as XLSX from "xlsx";
import { exportCsvText, exportWorkbook } from "./map/mapExport";

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
  const { data, t, activeLang, total, avgAge, avgGrade, earliestYear, busiestYear, busiestCity, selectedDirectionProgramId } = args;
  const sheets: Array<{ name: string; rows: SheetRow[] }> = [];

  sheets.push({
    name: activeLang === "en" ? "Overview" : "Σύνοψη",
    rows: [
      { [activeLang === "en" ? "Metric" : "Μετρική"]: t("cards.total"), [activeLang === "en" ? "Value" : "Τιμή"]: total },
      { [activeLang === "en" ? "Metric" : "Μετρική"]: t("cards.avgAge"), [activeLang === "en" ? "Value" : "Τιμή"]: avgAge },
      { [activeLang === "en" ? "Metric" : "Μετρική"]: t("cards.avgGrade"), [activeLang === "en" ? "Value" : "Τιμή"]: avgGrade },
      { [activeLang === "en" ? "Metric" : "Μετρική"]: t("cards.earliestYear"), [activeLang === "en" ? "Value" : "Τιμή"]: earliestYear },
      { [activeLang === "en" ? "Metric" : "Μετρική"]: t("cards.topGraduationYear"), [activeLang === "en" ? "Value" : "Τιμή"]: busiestYear },
      { [activeLang === "en" ? "Metric" : "Μετρική"]: t("cards.topCity"), [activeLang === "en" ? "Value" : "Τιμή"]: busiestCity },
    ],
  });

  sheets.push({
    name: activeLang === "en" ? "By Year" : "Ανά έτος",
    rows: (data?.by_year ?? []).map((row: any) => ({
      [t("table.year")]: num(row.year),
      [t("table.count")]: num(row.count),
    })),
  });

  sheets.push({
    name: activeLang === "en" ? "Gender By Year" : "Φύλο ανά έτος",
    rows: (data?.gender_by_year ?? []).map((row: any) => ({
      [t("table.year")]: num(row.year),
      [t("table.male")]: num(row.male),
      [t("table.female")]: num(row.female),
    })),
  });

  sheets.push({
    name: activeLang === "en" ? "Birth Years" : "Έτη γέννησης",
    rows: (data?.birth_year_distribution ?? []).map((row: NamedCountRow) => ({
      [t("table.year")]: num(row.year),
      [t("table.count")]: num(row.count),
    })),
  });

  sheets.push({
    name: activeLang === "en" ? "Programs" : "Προγράμματα",
    rows: (data?.study_program_distribution ?? []).map((row: NamedCountRow) => ({
      [t("filters.studyProgram")]: localizedName(row, activeLang),
      [t("table.count")]: num(row.count),
    })),
  });

  sheets.push({
    name: activeLang === "en" ? "Avg Grade By Year" : "ΜΟ βαθμού ανά έτος",
    rows: (data?.avg_grade_by_year ?? []).map((row: NamedCountRow) => ({
      [t("table.year")]: num(row.year),
      [t("table.avg")]: num(row.avg),
    })),
  });

  sheets.push({
    name: activeLang === "en" ? "Avg Grade By Program" : "ΜΟ βαθμού ανά πρόγραμμα",
    rows: (data?.avg_grade_by_program ?? []).map((row: NamedCountRow) => ({
      [t("filters.studyProgram")]: localizedName(row, activeLang),
      [t("table.avg")]: num(row.avg),
    })),
  });

  sheets.push({
    name: activeLang === "en" ? "Grade Distribution" : "Κατανομή βαθμού",
    rows: (data?.degree_grade_bins ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "Grade Range" : "Εύρος βαθμού"]: text(row.label),
      [t("table.count")]: num(row.count),
    })),
  });

  sheets.push({
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

  sheets.push({
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

  sheets.push({
    name: activeLang === "en" ? "Origin Regions" : "Περιφέρειες καταγωγής",
    rows: (data?.origin_region_distribution ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "Region" : "Περιφέρεια"]: localizedName(row, activeLang),
      [t("table.count")]: num(row.count),
    })),
  });

  sheets.push({
    name: activeLang === "en" ? "Origin Cities" : "Πόλεις καταγωγής",
    rows: (data?.origin_municipality_distribution ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "City" : "Πόλη"]: text(row.name),
      [t("table.count")]: num(row.count),
    })),
  });

  sheets.push({
    name: activeLang === "en" ? "Years To Degree" : "Χρόνια σπουδών",
    rows: (data?.avg_years_to_degree_by_entry_year ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "Entry Year" : "Έτος εισαγωγής"]: num(row.entry_year),
      [t("table.avgYears")]: num(row.avg_years),
    })),
  });

  sheets.push({
    name: activeLang === "en" ? "Years To Degree Dist" : "Κατανομή χρόνων σπουδών",
    rows: (data?.years_to_degree_distribution ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "Years" : "Χρόνια"]: text(row.label),
      [t("table.count")]: num(row.count),
    })),
  });

  return sheets.filter((sheet) => sheet.rows.length > 0);
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
