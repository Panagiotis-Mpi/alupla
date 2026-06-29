import type { TFunction } from "i18next";
import { downloadBlob } from "../lib/download";
import { sanitizeExportCell } from "../lib/exportSafety";
import { localizedCityRecordName, localizedCountryRecordName } from "./map/markers";

export type StatisticsChartId =
  | "byYear"
  | "countByEntryYear"
  | "gender"
  | "genderTotal"
  | "birthYear"
  | "gradeByYear"
  | "gradeDistribution"
  | "gradeDistributionByGender"
  | "genderByEntryYear"
  | "gradeByRegion"
  | "originRegion"
  | "genderByRegion"
  | "originMunicipality"
  | "genderByMunicipality"
  | "originCountry"
  | "abroadShare"
  | "abroadByYear"
  | "timeToDegreeByEntryYear"
  | "timeToDegreeDistribution"
  | "timeToDegreeByRegion"
  | "timeToDegreeByNomos"
  | "compare"
;

export type NamedCountRow = {
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
  greece?: number | null;
  abroad?: number | null;
};

export type StatisticsData = Partial<Record<
  | "by_year"
  | "count_by_entry_year"
  | "gender_by_year"
  | "birth_year_distribution"
  | "gender_by_birth_year"
  | "avg_grade_by_year"
  | "avg_grade_by_region"
  | "degree_grade_bins"
  | "degree_grade_bins_by_gender"
  | "gender_by_entry_year"
  | "origin_region_distribution"
  | "gender_by_region"
  | "origin_municipality_distribution"
  | "gender_by_municipality"
  | "origin_country_distribution"
  | "abroad_by_year"
  | "avg_years_to_degree_by_entry_year"
  | "avg_years_to_degree_by_region"
  | "avg_years_to_degree_by_nomos"
  | "years_to_degree_distribution",
  NamedCountRow[]
>> & {
  abroad_count?: number | string | null;
  abroad_pct?: number | string | null;
};

export type SheetRow = Record<string, string | number>;
export type ExportColumnKind = "text" | "year" | "count" | "percentage" | "average" | "duration";

export type StatisticsExportFormat = "xlsx" | "csv" | "png";
export type StatisticsExportGroupKey = "demographics" | "academic" | "geography" | "compare";
export type StatisticsExportRange = { from?: string | number | null; to?: string | number | null };

export type BuildArgs = {
  data: StatisticsData;
  t: TFunction;
  activeLang: "el" | "en";
  total: number;
  avgAge: string | number;
  avgGrade: string | number;
  earliestYear: string | number;
  busiestYear: string | number;
  busiestCity: string | number;
  selectedChartIds?: StatisticsChartId[];
  exportRanges?: Partial<Record<StatisticsExportGroupKey, StatisticsExportRange>>;
  compareFilenameRange?: string;
  compare?: {
    rangeALabel: string;
    rangeBLabel: string;
    changeLabel: string;
    section?: {
      name: string;
      rows: Array<{ metric: string; a: string | number; b: string | number; delta: string | number }>;
    };
  };
};

export type SheetBlock = {
  chartId: StatisticsChartId;
  chartIds?: StatisticsChartId[];
  name: string;
  rows: SheetRow[];
  columnKinds: Record<string, ExportColumnKind>;
};

export const statisticsChartOrder: StatisticsChartId[] = [
  "byYear",
  "countByEntryYear",
  "birthYear",
  "genderTotal",
  "gender",
  "gradeDistribution",
  "gradeDistributionByGender",
  "timeToDegreeDistribution",
  "gradeByYear",
  "gradeByRegion",
  "timeToDegreeByEntryYear",
  "timeToDegreeByRegion",
  "originRegion",
  "genderByRegion",
  "originMunicipality",
  "genderByMunicipality",
  "originCountry",
  "abroadShare",
  "abroadByYear",
  "timeToDegreeByNomos",
  "compare",
];

export function text(v: unknown) {
  return v === null || v === undefined ? "" : String(v);
}

export function num(v: unknown) {
  const value = Number(v ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export function rowsOf(rows: NamedCountRow[] | undefined) {
  return rows ?? [];
}

export function localizedName(row: NamedCountRow, activeLang: "el" | "en") {
  if (activeLang === "en") return text(row.name_en ?? row.name_el ?? row.name ?? row.label);
  return text(row.name_el ?? row.name_en ?? row.name ?? row.label);
}

export function localizedCityName(row: NamedCountRow, activeLang: "el" | "en") {
  const language = activeLang === "en" ? "en" : "gr";
  return localizedCityRecordName({ city_name: row.name, city_name_el: row.name_el, city_name_en: row.name_en }, language) || localizedName(row, activeLang);
}

export function localizedCountryName(row: NamedCountRow, activeLang: "el" | "en") {
  const language = activeLang === "en" ? "en" : "gr";
  return localizedCountryRecordName({ country_name: row.name, country_name_el: row.name_el, country_name_en: row.name_en }, language) || localizedName(row, activeLang);
}

export function csvCell(value: unknown) {
  const v = String(sanitizeExportCell(value) ?? "");
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

export function exportUtf16Csv(filename: string, textValue: string) {
  downloadBlob(utf16Blob(textValue), filename);
}

export function roundTo(value: unknown, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(num(value) * factor) / factor;
}

export function percentOf(value: unknown, total: unknown) {
  const denominator = num(total);
  if (denominator <= 0) return 0;
  return roundTo((num(value) / denominator) * 100, 2);
}

export function sumValues(rows: NamedCountRow[] | undefined, getter: (row: NamedCountRow) => unknown) {
  return rowsOf(rows).reduce((sum, row) => sum + num(getter(row)), 0);
}

export function exportLabels(activeLang: "el" | "en") {
  return activeLang === "en"
    ? {
        total: "Total",
        graduationYear: "Graduation Year",
        entryYear: "Entry Year",
        birthYear: "Birth Year",
        graduateCount: "Graduate Count",
        maleCount: "Male Count",
        femaleCount: "Female Count",
        malePercentage: "Male Percentage",
        femalePercentage: "Female Percentage",
        percentage: "Percentage of all graduates",
        abroadPercentageByYear: "Abroad percentage within graduation year",
        averageGraduationGrade: "Average Graduation Grade",
        graduationGradeRange: "Graduation Grade Range",
        regionOfOrigin: "Region of Origin",
        nomosOfOrigin: "Regional Unit of Origin",
        cityOfOrigin: "City of Origin",
        countryOfOrigin: "Country of Origin",
        category: "Category",
        abroad: "Abroad",
        greece: "Greece",
        averageStudyDuration: "Average Study Duration",
        studyDurationRange: "Study Duration Range",
      }
    : {
        total: "Σύνολο",
        graduationYear: "Έτος αποφοίτησης",
        entryYear: "Έτος εισαγωγής",
        birthYear: "Έτος γέννησης",
        graduateCount: "Πλήθος αποφοίτων",
        maleCount: "Πλήθος ανδρών",
        femaleCount: "Πλήθος γυναικών",
        malePercentage: "Ποσοστό ανδρών",
        femalePercentage: "Ποσοστό γυναικών",
        percentage: "Ποσοστό επί του συνολικού πλήθους αποφοίτων",
        abroadPercentageByYear: "Ποσοστό εξωτερικού μέσα στο έτος αποφοίτησης",
        averageGraduationGrade: "Μέση βαθμολογία αποφοίτησης",
        graduationGradeRange: "Εύρος βαθμολογίας αποφοίτησης",
        regionOfOrigin: "Περιφέρεια καταγωγής",
        nomosOfOrigin: "Νομός καταγωγής",
        cityOfOrigin: "Πόλη καταγωγής",
        countryOfOrigin: "Χώρα καταγωγής",
        category: "Κατηγορία",
        abroad: "Εξωτερικό",
        greece: "Ελλάδα",
        averageStudyDuration: "Μέση διάρκεια σπουδών",
        studyDurationRange: "Εύρος διάρκειας σπουδών",
      };
}

export function appendDistributionTotal(rows: SheetRow[], firstColumn: string, countColumn: string, percentageColumn: string, totalLabel: string) {
  if (!rows.length) return rows;
  const total = rows.reduce((sum, row) => sum + num(row[countColumn]), 0);
  const percentage = roundTo(rows.reduce((sum, row) => sum + num(row[percentageColumn]), 0), 2);
  return [
    ...rows,
    {
      [firstColumn]: totalLabel,
      [countColumn]: total,
      [percentageColumn]: percentage,
    },
  ];
}


export function blockChartIds(block: SheetBlock) {
  return block.chartIds ?? [block.chartId];
}

export function mergeBlocksByFirstColumn(name: string, chartId: StatisticsChartId, blocks: SheetBlock[]) {
  const firstBlock = blocks[0];
  const firstRow = firstBlock?.rows[0];
  const keyColumn = Object.keys(firstRow ?? {})[0];

  if (!firstBlock || !firstRow || !keyColumn) return null;

  const rowOrder: string[] = [];
  const rowsByKey = new Map<string, SheetRow>();
  const columnKinds: Record<string, ExportColumnKind> = {};

  blocks.forEach((block) => {
    const sourceKeyColumn = Object.keys(block.rows[0] ?? {})[0];
    if (!sourceKeyColumn) return;

    Object.entries(block.columnKinds).forEach(([column, kind]) => {
      columnKinds[column === sourceKeyColumn ? keyColumn : column] = kind;
    });

    block.rows.forEach((row) => {
      const sourceKeyValue = row[sourceKeyColumn];
      const sourceKey = String(sourceKeyValue);

      if (!rowsByKey.has(sourceKey)) {
        rowsByKey.set(sourceKey, { [keyColumn]: sourceKeyValue });
        rowOrder.push(sourceKey);
      }

      const target = rowsByKey.get(sourceKey);
      if (!target) return;

      Object.entries(row).forEach(([column, value]) => {
        target[column === sourceKeyColumn ? keyColumn : column] = value;
      });
    });
  });

  return {
    chartId,
    chartIds: blocks.flatMap(blockChartIds),
    name,
    rows: rowOrder.map((key) => rowsByKey.get(key)).filter((row): row is SheetRow => !!row),
    columnKinds,
  };
}

export function selectedBlocksFor(chartIds: StatisticsChartId[], sheets: Map<StatisticsChartId, SheetBlock>, selectedSet: Set<StatisticsChartId>) {
  return chartIds
    .filter((chartId) => !selectedSet.size || selectedSet.has(chartId))
    .map((chartId) => sheets.get(chartId))
    .filter((sheet): sheet is SheetBlock => !!sheet && sheet.rows.length > 0);
}
