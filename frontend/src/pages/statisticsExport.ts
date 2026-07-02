import * as XLSX from "xlsx";
import { sanitizeExportRows } from "../lib/exportSafety";
import { exportWorkbook } from "./map/mapExport";
import { buildExportFilename, exportFilenamePart, exportTimestamp, yearRangeFilenamePart } from "../lib/exportFilenames";
import { buildSheets } from "./statisticsExportSheets";
import {
  csvCell,
  exportUtf16Csv,
  num,
  type BuildArgs,
  type ExportColumnKind,
  type SheetBlock,
  type StatisticsChartId,
  type StatisticsExportFormat,
  type StatisticsExportGroupKey,
  type StatisticsExportRange,
} from "./statisticsExportCore";

export type { StatisticsChartId } from "./statisticsExportCore";

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

function numberFormat(kind: ExportColumnKind, activeLang: "el" | "en") {
  if (kind === "year" || kind === "count") return "0";
  if (kind === "percentage") return '0.00"%"';
  if (kind === "average") return "0.00";
  if (kind === "duration") return activeLang === "en" ? '0.00" years"' : '0.00" έτη"';
  return null;
}

function formatDecimal(value: unknown, decimals: number) {
  return num(value).toFixed(decimals);
}

function csvValue(value: unknown, kind: ExportColumnKind | undefined, activeLang: "el" | "en") {
  if (typeof value === "string") return value;
  if (kind === "year" || kind === "count") return String(Math.round(num(value)));
  if (kind === "percentage") return `${formatDecimal(value, 2)}%`;
  if (kind === "average") return formatDecimal(value, 2);
  if (kind === "duration") return `${formatDecimal(value, 2)} ${activeLang === "en" ? "years" : "έτη"}`;
  return value;
}

function applyWorksheetFormats(ws: XLSX.WorkSheet, headers: string[], block: SheetBlock, activeLang: "el" | "en") {
  headers.forEach((header, columnIndex) => {
    const format = numberFormat(block.columnKinds[header] ?? "text", activeLang);
    if (!format) return;
    for (let rowIndex = 1; rowIndex <= block.rows.length; rowIndex += 1) {
      const cell = ws[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
      if (cell && typeof cell.v === "number") cell.z = format;
    }
  });
}

function csvLines(block: SheetBlock, activeLang: "el" | "en") {
  const lines: string[] = [block.name];
  const headers = Object.keys(block.rows[0] ?? {});
  if (headers.length) lines.push(headers.map(csvCell).join("\t"));
  block.rows.forEach((row) => {
    lines.push(headers.map((header) => csvCell(csvValue(row[header], block.columnKinds[header], activeLang))).join("\t"));
  });
  return lines;
}

function filenamePart(value: unknown) {
  return exportFilenamePart(value);
}

function rangeValue(range?: StatisticsExportRange) {
  return yearRangeFilenamePart(range?.from, range?.to);
}

function groupRangeParts(args: BuildArgs, groups: StatisticsExportGroupKey[]) {
  const labels: Record<StatisticsExportGroupKey, string> = {
    demographics: "count_gender",
    academic: "academic_data",
    geography: "geo_distribution",
    compare: "comparison",
  };
  const items = groups.map((group) => {
    const range = group === "compare" && args.compareFilenameRange ? args.compareFilenameRange : rangeValue(args.exportRanges?.[group]);
    return { group, range };
  });
  const sameRange = items.length > 0 && items.every((item) => item.range === items[0].range);
  if (sameRange && items[0]?.range) return [items[0].range];
  return items.map((item) => `${labels[item.group]}_${item.range}`);
}

function statisticsExportGroupForChart(chartId: StatisticsChartId): StatisticsExportGroupKey {
  if (["byYear", "countByEntryYear", "birthYear", "genderTotal", "genderByEntryYear", "gender"].includes(chartId)) return "demographics";
  if (["gradeDistribution", "gradeDistributionByGender", "timeToDegreeDistribution", "gradeByYear", "gradeByRegion", "timeToDegreeByEntryYear", "timeToDegreeByRegion"].includes(chartId)) return "academic";
  if (["originRegion", "genderByRegion", "originMunicipality", "genderByMunicipality", "originCountry", "abroadShare", "abroadByYear", "timeToDegreeByNomos"].includes(chartId)) return "geography";
  return "compare";
}

export function buildStatisticsExportFilename(args: BuildArgs, format: StatisticsExportFormat) {
  const selected = Array.isArray(args.selectedChartIds) ? args.selectedChartIds.filter(Boolean) : [];
  const chartCount = selected.length;
  const allChartIds = [
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
  ] as StatisticsChartId[];
  const selectedSet = new Set(selected);
  const groups = (["demographics", "academic", "geography", "compare"] as StatisticsExportGroupKey[])
    .filter((group) => selected.some((id) => statisticsExportGroupForChart(id) === group));
  const allSelected = chartCount === allChartIds.length && allChartIds.every((id) => selectedSet.has(id));
  const scope = allSelected ? "all_categories" : groups.length === 1 ? groups[0] : groups.length > 1 ? "mixed_categories" : "selected_charts";
  const selectionParts = allSelected ? ["all", "charts"] : ["selected", chartCount, "charts"];
  return buildExportFilename("statistics", [scope, ...selectionParts, ...groupRangeParts(args, groups.length ? groups : ["demographics", "academic", "geography", "compare"])], format);
}

export function buildStatisticsPngFilename(args: BuildArgs, chartId: StatisticsChartId | null, fallbackParts: Array<string | number | null | undefined>, groupKey?: StatisticsExportGroupKey) {
  const group = groupKey ?? (chartId ? statisticsExportGroupForChart(chartId) : null);
  const rangeParts = group ? groupRangeParts(args, [group]) : [];
  const parts = [...fallbackParts, group, chartId, ...rangeParts, exportTimestamp()].map(filenamePart).filter(Boolean);
  return `${parts.join("_") || `alupla_statistics_${exportTimestamp()}`}.png`;
}

function statisticsWorkbook(args: BuildArgs) {
  const workbook = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  for (const sheet of buildSheets(args)) {
    const safeRows = sanitizeExportRows(sheet.rows);
    const ws = XLSX.utils.json_to_sheet(safeRows);
    const headers = Object.keys(safeRows[0] ?? {});
    ws["!cols"] = headers.map((header) => {
      const kind = sheet.columnKinds[header] ?? "text";
      const maxValueLength = safeRows.reduce((max, row) => Math.max(max, String(csvValue(row[header], kind, args.activeLang)).length), String(header).length);
      return { wch: Math.min(42, Math.max(18, maxValueLength + 4)) };
    });
    applyWorksheetFormats(ws, headers, sheet, args.activeLang);
    XLSX.utils.book_append_sheet(workbook, ws, workbookSheetName(sheet.name, usedNames));
  }

  return workbook;
}

function statisticsCsvText(args: BuildArgs) {
  const blocks = buildSheets(args);
  const lines: string[] = [];

  blocks.forEach((block, index) => {
    lines.push(...csvLines(block, args.activeLang));

    if (index < blocks.length - 1) {
      lines.push("");
      lines.push("--------------------------------------------------");
      lines.push("");
    }
  });

  return lines.join("\r\n");
}

function utf16CsvBlob(textValue: string) {
  const output = new Uint8Array(2 + textValue.length * 2);
  output[0] = 0xff;
  output[1] = 0xfe;
  for (let index = 0; index < textValue.length; index += 1) {
    const code = textValue.charCodeAt(index);
    output[2 + index * 2] = code & 0xff;
    output[3 + index * 2] = code >> 8;
  }
  return new Blob([output], { type: "text/csv;charset=utf-16le" });
}

export function buildStatisticsWorkbookBlob(args: BuildArgs) {
  const output = XLSX.write(statisticsWorkbook(args), { bookType: "xlsx", type: "array", compression: true });
  return new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function buildStatisticsCsvBlob(args: BuildArgs) {
  return utf16CsvBlob(statisticsCsvText(args));
}

export function exportStatisticsWorkbookFile(args: BuildArgs, filename = buildStatisticsExportFilename(args, "xlsx")) {
  exportWorkbook(filename, statisticsWorkbook(args));
}

export function exportStatisticsCsvFile(args: BuildArgs, filename = buildStatisticsExportFilename(args, "csv")) {
  const textValue = statisticsCsvText(args);
  if (textValue) exportUtf16Csv(filename, textValue);
}
