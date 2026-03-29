import type { TFunction } from "i18next";
import * as XLSX from "xlsx";
import { downloadBlob } from "../lib/download";
import { exportWorkbook } from "./map/mapExport";

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
  | "timeToDegreeDistribution"
  | "topOriginRegionsShare"
  | "topOriginCitiesShare";

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

type SheetBlock = {
  chartId: StatisticsChartId;
  name: string;
  rows: SheetRow[];
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
  if (/["\n\r\t,;]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function utf16Blob(textValue: string) {
  const out = new Uint8Array(2 + textValue.length * 2);
  out[0] = 0xff;
  out[1] = 0xfe;
  for (let i = 0; i < textValue.length; i += 1) {
    const code = textValue.charCodeAt(i);
    out[2 + i * 2] = code & 0xff;
    out[3 + i * 2] = code >> 8;
  }
  return new Blob([out], { type: "text/csv;charset=utf-16le" });
}

function exportUtf16Csv(filename: string, textValue: string) {
  downloadBlob(utf16Blob(textValue), filename);
}


function buildTopShareRows(rows: NamedCountRow[], activeLang: "el" | "en", limit: number, mode: "region" | "city") {
  const sorted = rows
    .map((row) => ({
      label: mode === "region" ? localizedName(row, activeLang) : text(row.name ?? row.name_el ?? row.name_en),
      count: num(row.count),
    }))
    .filter((row) => row.label && row.count > 0)
    .sort((a, b) => b.count - a.count);

  const topRows = sorted.slice(0, limit);
  const restCount = sorted.slice(limit).reduce((sum, row) => sum + row.count, 0);
  const restLabel = activeLang === "en"
    ? mode === "region" ? "Other regions" : "Other cities"
    : mode === "region" ? "Λοιπές περιοχές" : "Λοιπές πόλεις";

  if (restCount > 0) topRows.push({ label: restLabel, count: restCount });

  return topRows.map((row, index) => ({
    [activeLang === "en" ? "Rank" : "Κατάταξη"]: index + 1,
    [activeLang === "en" ? (mode === "region" ? "Region of Origin / Group" : "City of Origin / Group") : (mode === "region" ? "Περιφέρεια καταγωγής / Ομάδα" : "Πόλη καταγωγής / Ομάδα")]: row.label,
    [activeLang === "en" ? "Graduate Count" : "Πλήθος αποφοίτων"]: row.count,
  }));
}

function buildSheets(args: BuildArgs) {
  const { data, t, activeLang, selectedDirectionProgramId } = args;
  const sheets = new Map<StatisticsChartId, SheetBlock>();

  sheets.set("byYear", {
    chartId: "byYear",
    name: activeLang === "en" ? "Graduate Count by Graduation Year" : "Πλήθος αποφοίτων ανά έτος αποφοίτησης",
    rows: (data?.by_year ?? []).map((row: any) => ({
      [activeLang === "en" ? "Graduation Year" : "Έτος αποφοίτησης"]: num(row.year),
      [activeLang === "en" ? "Graduate Count" : "Πλήθος αποφοίτων"]: num(row.count),
    })),
  });

  sheets.set("gender", {
    chartId: "gender",
    name: activeLang === "en" ? "Male and Female Ratio by Graduation Year" : "Αναλογία ανδρών και γυναικών ανά έτος αποφοίτησης",
    rows: (data?.gender_by_year ?? []).map((row: any) => ({
      [activeLang === "en" ? "Graduation Year" : "Έτος αποφοίτησης"]: num(row.year),
      [activeLang === "en" ? "Male Graduate Count" : "Πλήθος ανδρών αποφοίτων"]: num(row.male),
      [activeLang === "en" ? "Female Graduate Count" : "Πλήθος γυναικών αποφοίτων"]: num(row.female),
    })),
  });

  sheets.set("birthYear", {
    chartId: "birthYear",
    name: activeLang === "en" ? "Graduate Distribution by Birth Year" : "Κατανομή αποφοίτων ανά έτος γέννησης",
    rows: (data?.birth_year_distribution ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "Birth Year" : "Έτος γέννησης"]: num(row.year),
      [activeLang === "en" ? "Graduate Count" : "Πλήθος αποφοίτων"]: num(row.count),
    })),
  });

  sheets.set("studyProgram", {
    chartId: "studyProgram",
    name: activeLang === "en" ? "Graduate Count by Study Program" : "Πλήθος αποφοίτων ανά πρόγραμμα σπουδών",
    rows: (data?.study_program_distribution ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "Study Program" : "Πρόγραμμα σπουδών"]: localizedName(row, activeLang),
      [activeLang === "en" ? "Graduate Count" : "Πλήθος αποφοίτων"]: num(row.count),
    })),
  });

  sheets.set("gradeByYear", {
    chartId: "gradeByYear",
    name: activeLang === "en" ? "Average Degree Grade by Graduation Year" : "Μέσος όρος βαθμού πτυχίου ανά έτος αποφοίτησης",
    rows: (data?.avg_grade_by_year ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "Graduation Year" : "Έτος αποφοίτησης"]: num(row.year),
      [activeLang === "en" ? "Average Degree Grade" : "Μέσος όρος βαθμού πτυχίου"]: num(row.avg),
    })),
  });

  sheets.set("avgGradeByProgram", {
    chartId: "avgGradeByProgram",
    name: activeLang === "en" ? "Average Degree Grade by Study Program" : "Μέσος όρος βαθμού πτυχίου ανά πρόγραμμα σπουδών",
    rows: (data?.avg_grade_by_program ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "Study Program" : "Πρόγραμμα σπουδών"]: localizedName(row, activeLang),
      [activeLang === "en" ? "Average Degree Grade" : "Μέσος όρος βαθμού πτυχίου"]: num(row.avg),
    })),
  });

  sheets.set("gradeDistribution", {
    chartId: "gradeDistribution",
    name: activeLang === "en" ? "Graduate Distribution by Degree Grade Range" : "Κατανομή αποφοίτων ανά εύρος βαθμού πτυχίου",
    rows: (data?.degree_grade_bins ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "Degree Grade Range" : "Εύρος βαθμού πτυχίου"]: text(row.label),
      [activeLang === "en" ? "Graduate Count" : "Πλήθος αποφοίτων"]: num(row.count),
    })),
  });

  sheets.set("genderByProgram", {
    chartId: "genderByProgram",
    name: activeLang === "en" ? "Male and Female Ratio by Study Program" : "Αναλογία ανδρών και γυναικών ανά πρόγραμμα σπουδών",
    rows: (data?.gender_by_program ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "Study Program" : "Πρόγραμμα σπουδών"]: localizedName(row, activeLang),
      [activeLang === "en" ? "Male Graduate Count" : "Πλήθος ανδρών αποφοίτων"]: num(row.male),
      [activeLang === "en" ? "Female Graduate Count" : "Πλήθος γυναικών αποφοίτων"]: num(row.female),
    })),
  });

  const directionRows = (Array.isArray(data?.direction_distribution) ? data.direction_distribution : []) as NamedCountRow[];
  const visibleDirectionRows = selectedDirectionProgramId === "all"
    ? directionRows
    : directionRows.filter((row) => String(row.study_program_id ?? "") === selectedDirectionProgramId);

  sheets.set("direction", {
    chartId: "direction",
    name: activeLang === "en" ? "Graduate Count by New Curriculum Direction" : "Πλήθος αποφοίτων ανά κατεύθυνση νέου προγράμματος σπουδών",
    rows: visibleDirectionRows.map((row) => ({
      [activeLang === "en" ? "Direction / Program Name" : "Ονομασία κατεύθυνσης / προγράμματος"]: text(
        activeLang === "en"
          ? row.name_en ?? row.name_el ?? row.name ?? ""
          : row.name_el ?? row.name_en ?? row.name ?? ""
      ),
      [activeLang === "en" ? "Graduate Count" : "Πλήθος αποφοίτων"]: num(row.count),
    })),
  });

  sheets.set("originRegion", {
    chartId: "originRegion",
    name: activeLang === "en" ? "Graduate Count by Region of Origin" : "Πλήθος αποφοίτων ανά περιφέρεια καταγωγής",
    rows: (data?.origin_region_distribution ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "Region of Origin" : "Περιφέρεια καταγωγής"]: localizedName(row, activeLang),
      [activeLang === "en" ? "Graduate Count" : "Πλήθος αποφοίτων"]: num(row.count),
    })),
  });

  sheets.set("originMunicipality", {
    chartId: "originMunicipality",
    name: activeLang === "en" ? "Graduate Count by City of Origin" : "Πλήθος αποφοίτων ανά πόλη καταγωγής",
    rows: (data?.origin_municipality_distribution ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "City of Origin" : "Πόλη καταγωγής"]: text(row.name),
      [activeLang === "en" ? "Graduate Count" : "Πλήθος αποφοίτων"]: num(row.count),
    })),
  });

  sheets.set("timeToDegreeByEntryYear", {
    chartId: "timeToDegreeByEntryYear",
    name: activeLang === "en" ? "Average Study Duration by Entry Year" : "Μέσος χρόνος ολοκλήρωσης σπουδών ανά έτος εισαγωγής",
    rows: (data?.avg_years_to_degree_by_entry_year ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "Entry Year" : "Έτος εισαγωγής"]: num(row.entry_year),
      [activeLang === "en" ? "Average Study Duration (Years)" : "Μέσος χρόνος ολοκλήρωσης σπουδών (έτη)"]: num(row.avg_years),
    })),
  });


  sheets.set("topOriginRegionsShare", {
    chartId: "topOriginRegionsShare",
    name: activeLang === "en" ? "Top Graduate Origin Regions Share" : "Μερίδιο αποφοίτων στις κυριότερες περιφέρειες καταγωγής",
    rows: buildTopShareRows((data?.origin_region_distribution ?? []) as NamedCountRow[], activeLang, 5, "region"),
  });

  sheets.set("topOriginCitiesShare", {
    chartId: "topOriginCitiesShare",
    name: activeLang === "en" ? "Top Graduate Origin Cities Share" : "Μερίδιο αποφοίτων στις κυριότερες πόλεις καταγωγής",
    rows: buildTopShareRows((data?.origin_municipality_distribution ?? []) as NamedCountRow[], activeLang, 8, "city"),
  });

  sheets.set("timeToDegreeDistribution", {
    chartId: "timeToDegreeDistribution",
    name: activeLang === "en" ? "Graduate Distribution by Study Duration" : "Κατανομή αποφοίτων ανά χρόνο ολοκλήρωσης σπουδών",
    rows: (data?.years_to_degree_distribution ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "Study Duration (Years)" : "Χρόνος ολοκλήρωσης σπουδών (έτη)"]: text(row.label),
      [activeLang === "en" ? "Graduate Count" : "Πλήθος αποφοίτων"]: num(row.count),
    })),
  });

  const selectedIds = Array.isArray(args.selectedChartIds) && args.selectedChartIds.length
    ? args.selectedChartIds
    : Array.from(sheets.keys());

  return selectedIds
    .map((chartId) => sheets.get(chartId))
    .filter((sheet): sheet is SheetBlock => !!sheet && sheet.rows.length > 0);
}

export function exportStatisticsWorkbookFile(args: BuildArgs) {
  const workbook = XLSX.utils.book_new();
  for (const sheet of buildSheets(args)) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    const headers = Object.keys(sheet.rows[0] ?? {});
    ws["!cols"] = headers.map((header) => ({ wch: Math.max(18, String(header).length + 4) }));
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
    lines.push(headers.map(csvCell).join("\t"));
    block.rows.forEach((row) => {
      lines.push(headers.map((header) => csvCell(row[header])).join("\t"));
    });
    if (index < blocks.length - 1) lines.push("");
  });

  exportUtf16Csv("alupla_statistics_export.csv", lines.join("\r\n"));
}
