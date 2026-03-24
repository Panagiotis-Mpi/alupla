import * as XLSX from "xlsx";
import { logPublicExport, type GraduatesMapItem, type ProgramDirection, type Region, type StudyProgram } from "../../lib/api";
import { excelCellValue, type MapFiltersState } from "./shared";

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function copyComputedStyles(source: Element, target: Element) {
  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);
  const computed = window.getComputedStyle(source as HTMLElement);
  const styleText = Array.from(computed)
    .map((name) => `${name}:${computed.getPropertyValue(name)};`)
    .join("");
  target.setAttribute("style", styleText);
  for (let index = 0; index < sourceChildren.length; index += 1) {
    if (targetChildren[index]) {
      copyComputedStyles(sourceChildren[index], targetChildren[index]);
    }
  }
}

export async function exportElementAsPng(element: HTMLElement, filename: string) {
  const rect = element.getBoundingClientRect();
  const clone = element.cloneNode(true) as HTMLElement;
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  copyComputedStyles(element, clone);
  clone.style.margin = "0";
  clone.style.width = `${Math.ceil(rect.width)}px`;
  clone.style.height = `${Math.ceil(rect.height)}px`;

  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.width = `${Math.ceil(rect.width)}px`;
  wrapper.style.height = `${Math.ceil(rect.height)}px`;
  wrapper.style.background = "#ffffff";
  wrapper.appendChild(clone);

  const serialized = new XMLSerializer().serializeToString(wrapper);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(rect.width)}" height="${Math.ceil(rect.height)}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;

  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(rect.width * 2);
    canvas.height = Math.ceil(rect.height * 2);
    const context = canvas.getContext("2d");
    if (!context) {
      reject(new Error("canvas_error"));
      return;
    }

    image.onload = () => {
      context.scale(2, 2);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, Math.ceil(rect.width), Math.ceil(rect.height));
      context.drawImage(image, 0, 0, Math.ceil(rect.width), Math.ceil(rect.height));
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("blob_error"));
          return;
        }
        downloadBlob(filename, blob);
        resolve();
      }, "image/png");
    };

    image.onerror = () => reject(new Error("image_error"));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

export function buildMapFilterRows(args: {
  t: (key: string, options?: Record<string, unknown>) => string;
  filters: MapFiltersState;
  activeLang: "gr" | "en";
  studyPrograms: StudyProgram[];
  programDirections: ProgramDirection[];
  regions: Region[];
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
    [t("graduates.filters.gender", { defaultValue: "Φύλο" }), filters.gender === "M" ? t("common.male", { defaultValue: "Άνδρας" }) : filters.gender === "F" ? t("common.female", { defaultValue: "Γυναίκα" }) : ""],
    [t("graduates.filters.entryYear", { defaultValue: "Έτος εισαγωγής" }), [filters.entry_year_min, filters.entry_year_max].filter(Boolean).join(" - ")],
    [t("graduates.filters.birthYear", { defaultValue: "Έτος γέννησης" }), [filters.birth_year_min, filters.birth_year_max].filter(Boolean).join(" - ")],
    [t("graduates.filters.degreeGrade", { defaultValue: "Βαθμός πτυχίου" }), [filters.degree_grade_min, filters.degree_grade_max].filter(Boolean).join(" - ")],
    [t("map.filters.year", { defaultValue: "Έτος αποφοίτησης" }), filters.graduation_year],
    [t("graduates.filters.graduationDate", { defaultValue: "Ημερομηνία αποφοίτησης" }), [filters.graduation_date_from, filters.graduation_date_to].filter(Boolean).join(" - ")],
    [t("graduates.filters.oathDate", { defaultValue: "Ημερομηνία ορκωμοσίας" }), [filters.oath_date_from, filters.oath_date_to].filter(Boolean).join(" - ")],
    [t("map.filters.studyProgram", { defaultValue: "Πρόγραμμα Σπουδών" }), program ? (activeLang === "en" ? program.name_en || program.name_el || program.code : program.name_el || program.name_en || program.code) : ""],
    [t("graduates.filters.direction", { defaultValue: "Κατεύθυνση" }), direction ? (activeLang === "en" ? direction.name_en || direction.name_el || direction.code : direction.name_el || direction.name_en || direction.code) : ""],
    [t("graduates.filters.region", { defaultValue: "Περιφέρεια" }), regionName],
    [t("graduates.filters.city", { defaultValue: "Πόλη" }), filters.origin_municipality_like],
    [t("map.filters.ageGroup", { defaultValue: "Ηλικιακή ομάδα" }), filters.age_group],
  ].filter((row) => row[1]);
}

function buildMapExportRows(items: GraduatesMapItem[], t: (key: string, options?: Record<string, unknown>) => string) {
  return items.map((item) => ({
    [t("map.export.periphery", { defaultValue: "Περιφέρεια" })]: excelCellValue(item.periphery_name ?? ""),
    [t("map.export.count", { defaultValue: "Απόφοιτοι" })]: excelCellValue(item.count ?? 0),
    [t("map.export.avgAge", { defaultValue: "Μέση Ηλικία" })]: excelCellValue(item.avg_age ?? ""),
    [t("map.export.malePct", { defaultValue: "% Άνδρες" })]: excelCellValue(item.male_pct ?? ""),
    [t("map.export.femalePct", { defaultValue: "% Γυναίκες" })]: excelCellValue(item.female_pct ?? ""),
  }));
}

export async function exportMapExcel(args: {
  items: GraduatesMapItem[];
  filtersRows: unknown[][];
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const workbook = XLSX.utils.book_new();
  const rows = buildMapExportRows(args.items, args.t);
  const mapSheet = XLSX.utils.json_to_sheet(rows);
  mapSheet["!cols"] = [{ wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(workbook, mapSheet, "Map");

  const filtersSheet = XLSX.utils.aoa_to_sheet([
    [args.t("graduates.filters.toggle", { defaultValue: "Φίλτρα" }), args.t("common.value", { defaultValue: "Τιμή" })],
    ...args.filtersRows,
  ]);
  filtersSheet["!cols"] = [{ wch: 28 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(workbook, filtersSheet, "Filters");

  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array", compression: true });
  downloadBlob("alupla_map_export.xlsx", new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));

  try {
    await logPublicExport("map_export", "xlsx");
  } catch {}
}

export async function exportMapCsv(args: {
  items: GraduatesMapItem[];
  filtersRows: unknown[][];
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const rows = buildMapExportRows(args.items, args.t);
  const headers = Object.keys(rows[0] || {
    [args.t("map.export.periphery", { defaultValue: "Περιφέρεια" })]: "",
    [args.t("map.export.count", { defaultValue: "Απόφοιτοι" })]: "",
    [args.t("map.export.avgAge", { defaultValue: "Μέση Ηλικία" })]: "",
    [args.t("map.export.malePct", { defaultValue: "% Άνδρες" })]: "",
    [args.t("map.export.femalePct", { defaultValue: "% Γυναίκες" })]: "",
  });
  const escapeCsv = (value: unknown) => {
    const text = String(value ?? "");
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };
  const lines = [
    `${escapeCsv(args.t("graduates.filters.toggle", { defaultValue: "Φίλτρα" }))},${escapeCsv(args.t("common.value", { defaultValue: "Τιμή" }))}`,
    ...args.filtersRows.map((row) => `${escapeCsv(row[0])},${escapeCsv(row[1])}`),
    "",
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv((row as Record<string, unknown>)[header])).join(",")),
  ];
  downloadBlob("alupla_map_export.csv", new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
  try {
    await logPublicExport("map_export", "csv");
  } catch {}
}
