import type { TFunction } from "i18next";
import * as XLSX from "xlsx";
import type { GraduatesMapItem, StudyProgram } from "../../lib/api";
import { excelCellValue, exportCsvText, exportWorkbook } from "./mapExport";
import type { AgeGroup, FiltersState } from "./types";

type DirectionLike = Record<string, unknown>;
type RegionLike = Record<string, unknown>;

export function mapFilterRows(args: {
  t: TFunction;
  filters: FiltersState;
  activeLang: "gr" | "en";
  studyPrograms: StudyProgram[];
  programDirections: DirectionLike[];
  regions: RegionLike[];
}) {
  const { t, filters, activeLang, studyPrograms, programDirections, regions } = args;
  const regionName = regions.find((item) => String(item.id) === filters.origin_region_id)?.name || "";
  const program = studyPrograms.find((item) => String(item.id) === filters.study_program_id);
  const direction = programDirections.find((item) => String(item.id) === filters.program_direction_id);

  return [
    [t("graduates.filters.adCode", { defaultValue: "Α.Δ." }), filters.ad_code_like],
    [t("graduates.filters.studentNumber", { defaultValue: "Α.Μ." }), filters.student_number_like],
    [t("graduates.filters.lastName", { defaultValue: "Επώνυμο" }), filters.last_name_like],
    [t("graduates.filters.firstName", { defaultValue: "Όνομα" }), filters.first_name_like],
    [t("graduates.filters.fatherName", { defaultValue: "Πατρώνυμο" }), filters.father_name_like],
    [t("graduates.filters.gender", { defaultValue: "Φύλο" }), genderLabel(filters.gender, t)],
    [t("graduates.filters.entryYear", { defaultValue: "Έτος εισαγωγής" }), joinRange(filters.entry_year_min, filters.entry_year_max)],
    [t("graduates.filters.birthYear", { defaultValue: "Έτος γέννησης" }), joinRange(filters.birth_year_min, filters.birth_year_max)],
    [t("graduates.filters.degreeGrade", { defaultValue: "Βαθμός πτυχίου" }), joinRange(filters.degree_grade_min, filters.degree_grade_max)],
    [t("map.filters.year", { defaultValue: "Έτος αποφοίτησης" }), filters.graduation_year],
    [t("graduates.filters.graduationDate", { defaultValue: "Ημερομηνία αποφοίτησης" }), joinRange(filters.graduation_date_from, filters.graduation_date_to)],
    [t("graduates.filters.oathDate", { defaultValue: "Ημερομηνία ορκωμοσίας" }), joinRange(filters.oath_date_from, filters.oath_date_to)],
    [t("map.filters.studyProgram", { defaultValue: "Πρόγραμμα Σπουδών" }), localizedProgramName(program, activeLang)],
    [t("graduates.filters.direction", { defaultValue: "Κατεύθυνση" }), localizedDirectionName(direction, activeLang)],
    [t("graduates.filters.region", { defaultValue: "Περιφέρεια" }), regionName],
    [t("graduates.filters.city", { defaultValue: "Πόλη" }), filters.origin_municipality_like],
    [t("map.filters.ageGroup", { defaultValue: "Ηλικιακή ομάδα" }), ageGroupLabel(filters.age_group, t)],
  ].filter((row) => row[1]);
}

export function mapExportRows(items: GraduatesMapItem[], t: TFunction) {
  return items.map((item: any) => ({
    [t("map.export.periphery", { defaultValue: "Περιφέρεια" })]: excelCellValue(item.periphery_name ?? ""),
    [t("map.export.count", { defaultValue: "Απόφοιτοι" })]: excelCellValue(item.count ?? 0),
    [t("map.export.avgAge", { defaultValue: "Μέση Ηλικία" })]: excelCellValue(item.avg_age ?? ""),
    [t("map.export.malePct", { defaultValue: "% Άνδρες" })]: excelCellValue(item.male_pct ?? ""),
    [t("map.export.femalePct", { defaultValue: "% Γυναίκες" })]: excelCellValue(item.female_pct ?? ""),
  }));
}

export function exportMapWorkbookFile(rows: Record<string, unknown>[], filterRows: Array<[string, unknown]>, t: TFunction) {
  const workbook = XLSX.utils.book_new();
  const mapSheet = XLSX.utils.json_to_sheet(rows);
  mapSheet["!cols"] = [{ wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(workbook, mapSheet, "Map");

  const filtersSheet = XLSX.utils.aoa_to_sheet([
    [t("graduates.filters.toggle", { defaultValue: "Φίλτρα" }), t("common.value", { defaultValue: "Τιμή" })],
    ...filterRows,
  ]);
  filtersSheet["!cols"] = [{ wch: 28 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(workbook, filtersSheet, "Filters");

  exportWorkbook("alupla_map_export.xlsx", workbook);
}

export function exportMapCsvFile(rows: Record<string, unknown>[], filterRows: Array<[string, unknown]>, t: TFunction) {
  const headers = Object.keys(rows[0] || {
    [t("map.export.periphery", { defaultValue: "Περιφέρεια" })]: "",
    [t("map.export.count", { defaultValue: "Απόφοιτοι" })]: "",
    [t("map.export.avgAge", { defaultValue: "Μέση Ηλικία" })]: "",
    [t("map.export.malePct", { defaultValue: "% Άνδρες" })]: "",
    [t("map.export.femalePct", { defaultValue: "% Γυναίκες" })]: "",
  });

  const lines = [
    `${csvCell(t("graduates.filters.toggle", { defaultValue: "Φίλτρα" }))},${csvCell(t("common.value", { defaultValue: "Τιμή" }))}`,
    ...filterRows.map((row) => `${csvCell(row[0])},${csvCell(row[1])}`),
    "",
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ];

  exportCsvText("alupla_map_export.csv", lines.join("\n"));
}

function joinRange(fromValue: string, toValue: string) {
  return [fromValue, toValue].filter(Boolean).join(" - ");
}

function genderLabel(value: string, t: TFunction) {
  if (value === "M") return t("common.male", { defaultValue: "Άνδρας" });
  if (value === "F") return t("common.female", { defaultValue: "Γυναίκα" });
  return "";
}

function ageGroupLabel(value: AgeGroup, t: TFunction) {
  if (!value) return "";
  return t(`map.ageGroupOptions.${value}`, { defaultValue: value });
}

function localizedProgramName(program: StudyProgram | undefined, activeLang: "gr" | "en") {
  if (!program) return "";
  return activeLang === "en" ? program.name_en || program.name_el || program.code : program.name_el || program.name_en || program.code;
}

function localizedDirectionName(direction: DirectionLike | undefined, activeLang: "gr" | "en") {
  if (!direction) return "";
  return activeLang === "en"
    ? String(direction.name_en ?? direction.name_el ?? direction.code ?? "")
    : String(direction.name_el ?? direction.name_en ?? direction.code ?? "");
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
