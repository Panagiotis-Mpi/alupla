import type { TFunction } from "i18next";
import * as XLSX from "xlsx";
import { downloadBlob } from "../lib/download";
import { exportWorkbook } from "./map/mapExport";

export type StatisticsChartId =
  | "byYear"
  | "gender"
  | "birthYear"
  | "gradeByYear"
  | "gradeDistribution"
  | "genderByEntryYear"
  | "originRegion"
  | "originMunicipality"
  | "originCountry"
  | "abroadShare"
  | "timeToDegreeByEntryYear"
  | "timeToDegreeDistribution"
;

type NamedCountRow = {
  id?: number | null;
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

export type StatisticsExportFormat = "xlsx" | "csv" | "png";

export type BuildArgs = {
  data: any;
  t: TFunction;
  activeLang: "el" | "en";
  total: number;
  avgAge: string | number;
  avgGrade: string | number;
  earliestYear: string | number;
  busiestYear: string | number;
  busiestCity: string | number;
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
  if (/["\n\r\t]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
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


function buildSheets(args: BuildArgs) {
  const { data, activeLang } = args;
  const sheets = new Map<StatisticsChartId, SheetBlock>();

  sheets.set("byYear", {
    chartId: "byYear",
    name: activeLang === "en" ? "Graduates by Graduation Year" : "Απόφοιτοι ανά έτος αποφοίτησης",
    rows: (data?.by_year ?? []).map((row: any) => ({
      [activeLang === "en" ? "Graduation Year" : "Έτος αποφοίτησης"]: num(row.year),
      [activeLang === "en" ? "Graduate Count" : "Πλήθος αποφοίτων"]: num(row.count),
    })),
  });

  sheets.set("gender", {
    chartId: "gender",
    name: activeLang === "en" ? "Gender Distribution by Graduation Year" : "Κατανομή φύλου ανά έτος αποφοίτησης",
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
  sheets.set("gradeByYear", {
    chartId: "gradeByYear",
    name: activeLang === "en" ? "Average Graduation Grade by Year" : "Μέση βαθμολογία αποφοίτησης ανά έτος",
    rows: (data?.avg_grade_by_year ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "Graduation Year" : "Έτος αποφοίτησης"]: num(row.year),
      [activeLang === "en" ? "Average Graduation Grade" : "Μέση βαθμολογία αποφοίτησης"]: num(row.avg),
    })),
  });

  sheets.set("gradeDistribution", {
    chartId: "gradeDistribution",
    name: activeLang === "en" ? "Graduation Grade Distribution" : "Κατανομή βαθμολογίας αποφοίτησης",
    rows: (data?.degree_grade_bins ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "Degree Grade Range" : "Εύρος βαθμού πτυχίου"]: text(row.label),
      [activeLang === "en" ? "Graduate Count" : "Πλήθος αποφοίτων"]: num(row.count),
    })),
  });

  sheets.set("genderByEntryYear", {
    chartId: "genderByEntryYear",
    name: activeLang === "en" ? "Gender Distribution by Entry Year" : "Κατανομή φύλου ανά έτος εισαγωγής",
    rows: (data?.gender_by_entry_year ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "Entry Year" : "Έτος εισαγωγής"]: num(row.entry_year),
      [activeLang === "en" ? "Male Graduate Count" : "Πλήθος ανδρών αποφοίτων"]: num(row.male),
      [activeLang === "en" ? "Female Graduate Count" : "Πλήθος γυναικών αποφοίτων"]: num(row.female),
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

  sheets.set("originCountry", {
    chartId: "originCountry",
    name: activeLang === "en" ? "Graduate Count by Country of Origin" : "Πλήθος αποφοίτων ανά χώρα καταγωγής",
    rows: (data?.origin_country_distribution ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "Country of Origin" : "Χώρα καταγωγής"]: localizedName(row, activeLang),
      [activeLang === "en" ? "Graduate Count" : "Πλήθος αποφοίτων"]: num(row.count),
    })),
  });

  sheets.set("abroadShare", {
    chartId: "abroadShare",
    name: activeLang === "en" ? "Greece and Abroad Graduate Distribution" : "Κατανομή αποφοίτων Ελλάδας και εξωτερικού",
    rows: [
      {
        [activeLang === "en" ? "Category" : "Κατηγορία"]: activeLang === "en" ? "Abroad" : "Εξωτερικό",
        [activeLang === "en" ? "Graduate Count" : "Πλήθος αποφοίτων"]: num(data?.abroad_count),
        [activeLang === "en" ? "Percentage" : "Ποσοστό"]: num(data?.abroad_pct),
      },
      {
        [activeLang === "en" ? "Category" : "Κατηγορία"]: activeLang === "en" ? "Greece" : "Ελλάδα",
        [activeLang === "en" ? "Graduate Count" : "Πλήθος αποφοίτων"]: Math.max(0, num(args.total) - num(data?.abroad_count)),
        [activeLang === "en" ? "Percentage" : "Ποσοστό"]: Math.max(0, 100 - num(data?.abroad_pct)),
      },
    ],
  });

  sheets.set("timeToDegreeByEntryYear", {
    chartId: "timeToDegreeByEntryYear",
    name: activeLang === "en" ? "Average Study Duration by Entry Year" : "Μέση διάρκεια σπουδών ανά έτος εισαγωγής",
    rows: (data?.avg_years_to_degree_by_entry_year ?? []).map((row: NamedCountRow) => ({
      [activeLang === "en" ? "Entry Year" : "Έτος εισαγωγής"]: num(row.entry_year),
      [activeLang === "en" ? "Average Study Duration (Years)" : "Μέσος χρόνος ολοκλήρωσης σπουδών (έτη)"]: num(row.avg_years),
    })),
  });


  sheets.set("timeToDegreeDistribution", {
    chartId: "timeToDegreeDistribution",
    name: activeLang === "en" ? "Study Duration Distribution" : "Κατανομή διάρκειας σπουδών",
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

function workbookSheetName(name: string, usedNames: Set<string>) {
  const base = name.slice(0, 31) || "Sheet";
  let candidate = base;
  let counter = 2;

  while (usedNames.has(candidate)) {
    const suffix = `_${counter}`;
    candidate = `${base.slice(0, Math.max(0, 31 - suffix.length))}${suffix}`;
    counter += 1;
  }

  usedNames.add(candidate);
  return candidate;
}

function csvLines(block: SheetBlock) {
  const lines: string[] = [block.name];
  const headers = Object.keys(block.rows[0] ?? {});
  if (headers.length) lines.push(headers.map(csvCell).join("\t"));
  block.rows.forEach((row) => {
    lines.push(headers.map((header) => csvCell(row[header])).join("\t"));
  });
  return lines;
}

export function buildStatisticsExportFilename(args: BuildArgs, format: StatisticsExportFormat) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const selected = Array.isArray(args.selectedChartIds) ? args.selectedChartIds.filter(Boolean) : [];
  const chartCount = selected.length;
  const allSelected = chartCount === 0;
  const groupChartIds = {
    demographics: ["gender", "birthYear", "genderByEntryYear"],
    academic: ["byYear", "gradeByYear", "gradeDistribution", "timeToDegreeByEntryYear", "timeToDegreeDistribution"],
    geography: ["originRegion", "originMunicipality", "originCountry", "abroadShare"],
  } as const;

  const selectedSet = new Set(selected);
  const matchingGroups = Object.entries(groupChartIds).filter(([, ids]) => ids.some((id) => selectedSet.has(id as StatisticsChartId))).map(([key]) => key);
  const scope = allSelected
    ? "all-charts"
    : matchingGroups.length === 1
      ? matchingGroups[0]
      : matchingGroups.length > 1
        ? "mixed-groups"
        : "selected-charts";
  const selection = allSelected ? "full-export" : `${chartCount}-charts`;
  return `alupla_statistics_${scope}_${selection}_${stamp}.${format}`;
}

export function exportStatisticsWorkbookFile(args: BuildArgs, filename = buildStatisticsExportFilename(args, "xlsx")) {
  const workbook = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  for (const sheet of buildSheets(args)) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    const headers = Object.keys(sheet.rows[0] ?? {});
    ws["!cols"] = headers.map((header) => ({ wch: Math.max(18, String(header).length + 4) }));
    XLSX.utils.book_append_sheet(workbook, ws, workbookSheetName(sheet.name, usedNames));
  }

  exportWorkbook(filename, workbook);
}

export function exportStatisticsCsvFile(args: BuildArgs, filename = buildStatisticsExportFilename(args, "csv")) {
  const blocks = buildSheets(args);
  const groupOrder: Array<{ key: string; name: string; chartIds: StatisticsChartId[] }> = [
    {
      key: "demographics",
      name: args.activeLang === "en" ? "Demographic Data" : "Δημογραφικά στοιχεία",
      chartIds: ["gender", "birthYear", "genderByEntryYear"],
    },
    {
      key: "academic",
      name: args.activeLang === "en" ? "Academic Data" : "Ακαδημαϊκά στοιχεία",
      chartIds: ["byYear", "gradeByYear", "gradeDistribution", "timeToDegreeByEntryYear", "timeToDegreeDistribution"],
    },
    {
      key: "geography",
      name: args.activeLang === "en" ? "Geographic Distribution" : "Γεωγραφική κατανομή",
      chartIds: ["originRegion", "originMunicipality"],
    },
  ];

  const lines: string[] = [];
  let exportedBlocks = 0;

  groupOrder.forEach((group) => {
    const groupBlocks = blocks.filter((block) => group.chartIds.includes(block.chartId));
    if (!groupBlocks.length) return;

    if (lines.length) {
      lines.push("");
      lines.push("");
    }

    lines.push(group.name);
    lines.push("==================================================");
    lines.push("");

    groupBlocks.forEach((block, index) => {
      lines.push(...csvLines(block));
      exportedBlocks += 1;

      if (index < groupBlocks.length - 1) {
        lines.push("");
        lines.push("--------------------------------------------------");
        lines.push("");
      }
    });
  });

  if (!exportedBlocks && blocks.length) {
    blocks.forEach((block, index) => {
      lines.push(...csvLines(block));
      if (index < blocks.length - 1) {
        lines.push("");
        lines.push("--------------------------------------------------");
        lines.push("");
      }
    });
  }

  if (lines.length) exportUtf16Csv(buildStatisticsExportFilename(args, "csv"), lines.join("\r\n"));
}
