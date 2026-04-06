import * as XLSX from "xlsx";
import type L from "leaflet";
import type { RefObject } from "react";
import type { GraduatesMapItem } from "../../lib/api";
import { excelCellValue } from "./mapExport";

export type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

export function buildBaseExportRows(items: GraduatesMapItem[], mt: TranslateFn) {
  return items.map((item) => ({
    [mt("export.periphery", { defaultValue: "Περιφέρεια" })]: excelCellValue(item.periphery_name),
    [mt("export.countDetailed", { defaultValue: "Πλήθος αποφοίτων περιφέρειας" })]: excelCellValue(item.count),
    [mt("maleCount", { defaultValue: "Άνδρες" })]: excelCellValue(item.male_count ?? 0),
    [mt("femaleCount", { defaultValue: "Γυναίκες" })]: excelCellValue(item.female_count ?? 0),
    [mt("dominantDirection", { defaultValue: "Κυρίαρχη κατεύθυνση" })]: excelCellValue(item.dominant_recent_direction ?? ""),
  }));
}

function groupCitiesByPeriphery(exportCities: any[]) {
  const cityMap = new Map<string, any[]>();
  exportCities.forEach((city) => {
    const key = String(city.periphery_id || "");
    const current = cityMap.get(key) || [];
    current.push(city);
    cityMap.set(key, current);
  });
  return cityMap;
}

function sortedPeripheryCities(cityMap: Map<string, any[]>, peripheryId: number | null | undefined) {
  return [...(cityMap.get(String(peripheryId || "")) || [])].sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return String(left.city_name || "").localeCompare(String(right.city_name || ""), "el");
  });
}

export function buildCountSheetRows(exportItems: GraduatesMapItem[], exportCities: any[], mt: TranslateFn) {
  const cityMap = groupCitiesByPeriphery(exportCities);
  const rows: Record<string, any>[] = [];

  exportItems.forEach((item) => {
    rows.push({
      [mt("export.periphery", { defaultValue: "Περιφέρεια" })]: excelCellValue(item.periphery_name),
      [mt("export.countDetailed", { defaultValue: "Πλήθος αποφοίτων περιφέρειας" })]: excelCellValue(item.count),
      [mt("citiesTitle", { defaultValue: "Πόλεις" })]: "",
      [mt("export.cityCount", { defaultValue: "Πλήθος αποφοίτων πόλης" })]: "",
    });

    sortedPeripheryCities(cityMap, item.periphery_id).forEach((city) => {
      rows.push({
        [mt("export.periphery", { defaultValue: "Περιφέρεια" })]: excelCellValue(item.periphery_name),
        [mt("export.countDetailed", { defaultValue: "Πλήθος αποφοίτων περιφέρειας" })]: "",
        [mt("citiesTitle", { defaultValue: "Πόλεις" })]: excelCellValue(city.city_name),
        [mt("export.cityCount", { defaultValue: "Πλήθος αποφοίτων πόλης" })]: excelCellValue(city.count),
      });
    });
  });

  return rows;
}

export function buildGenderSheetRows(exportItems: GraduatesMapItem[], exportCities: any[], mt: TranslateFn) {
  const cityMap = groupCitiesByPeriphery(exportCities);
  const rows: Record<string, any>[] = [];

  exportItems.forEach((item) => {
    rows.push({
      [mt("export.periphery", { defaultValue: "Περιφέρεια" })]: excelCellValue(item.periphery_name),
      [mt("maleCount", { defaultValue: "Άνδρες" })]: excelCellValue(item.male_count ?? 0),
      [mt("femaleCount", { defaultValue: "Γυναίκες" })]: excelCellValue(item.female_count ?? 0),
      [mt("malePct", { defaultValue: "% Άνδρες" })]: excelCellValue(item.male_pct ?? 0),
      [mt("femalePct", { defaultValue: "% Γυναίκες" })]: excelCellValue(item.female_pct ?? 0),
      [mt("citiesTitle", { defaultValue: "Πόλεις" })]: "",
      [mt("export.cityCount", { defaultValue: "Πλήθος αποφοίτων πόλης" })]: "",
    });

    sortedPeripheryCities(cityMap, item.periphery_id).forEach((city) => {
      rows.push({
        [mt("export.periphery", { defaultValue: "Περιφέρεια" })]: excelCellValue(item.periphery_name),
        [mt("maleCount", { defaultValue: "Άνδρες" })]: "",
        [mt("femaleCount", { defaultValue: "Γυναίκες" })]: "",
        [mt("malePct", { defaultValue: "% Άνδρες" })]: "",
        [mt("femalePct", { defaultValue: "% Γυναίκες" })]: "",
        [mt("citiesTitle", { defaultValue: "Πόλεις" })]: excelCellValue(city.city_name),
        [mt("export.cityCount", { defaultValue: "Πλήθος αποφοίτων πόλης" })]: excelCellValue(city.count),
      });
    });
  });

  return rows;
}

export function buildDirectionSheetRows(exportItems: GraduatesMapItem[], exportCities: any[], mt: TranslateFn) {
  const cityMap = groupCitiesByPeriphery(exportCities);
  const rows: Record<string, any>[] = [];

  exportItems.forEach((item) => {
    rows.push({
      [mt("export.periphery", { defaultValue: "Περιφέρεια" })]: excelCellValue(item.periphery_name),
      [mt("legendLabels.dominantDirection", { defaultValue: "Κυρίαρχη κατεύθυνση" })]: excelCellValue(item.dominant_recent_direction ?? ""),
      [mt("directionCount", { defaultValue: "Απόφοιτοι κατεύθυνσης" })]: excelCellValue(item.dominant_recent_direction_count ?? 0),
      [mt("citiesTitle", { defaultValue: "Πόλεις" })]: "",
      [mt("export.cityCount", { defaultValue: "Πλήθος αποφοίτων πόλης" })]: "",
    });

    sortedPeripheryCities(cityMap, item.periphery_id).forEach((city) => {
      rows.push({
        [mt("export.periphery", { defaultValue: "Περιφέρεια" })]: excelCellValue(item.periphery_name),
        [mt("legendLabels.dominantDirection", { defaultValue: "Κυρίαρχη κατεύθυνση" })]: "",
        [mt("directionCount", { defaultValue: "Απόφοιτοι κατεύθυνσης" })]: "",
        [mt("citiesTitle", { defaultValue: "Πόλεις" })]: excelCellValue(city.city_name),
        [mt("export.cityCount", { defaultValue: "Πλήθος αποφοίτων πόλης" })]: excelCellValue(city.count),
      });
    });
  });

  return rows;
}

export function workbookSheetName(name: string, used: Set<string>) {
  let next = String(name || "Sheet").replace(/[\/?*\[\]:]/g, " ").trim() || "Sheet";
  next = next.slice(0, 31);
  if (!used.has(next)) {
    used.add(next);
    return next;
  }
  let index = 2;
  while (true) {
    const suffix = `_${index}`;
    const candidate = `${next.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
    index += 1;
  }
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function buildCsvRows(categoryLabel: string, rows: Record<string, any>[], mt: TranslateFn, programLabel = "") {
  return rows.map((row) => ({
    [mt("export.categoryColumn", { defaultValue: "Κατηγορία" })]: categoryLabel,
    [mt("filters.studyProgram", { defaultValue: "Πρόγραμμα σπουδών" })]: programLabel,
    ...row,
  }));
}

export function buildCsvText(rows: Record<string, any>[]) {
  const headers = Object.keys(rows[0] || {});
  if (!headers.length) return "";
  const lines = [headers.map(escapeCsv).join(",")];
  rows.forEach((row) => lines.push(headers.map((header) => escapeCsv((row as any)[header])).join(",")));
  return lines.join("\r\n");
}

export function applySheetLayout(sheet: XLSX.WorkSheet, rows: Record<string, any>[]) {
  const headers = Object.keys(rows[0] || {});
  if (!headers.length) return;
  sheet["!cols"] = headers.map((header) => {
    const values = rows.map((row) => String((row as any)[header] ?? ""));
    const maxLength = Math.max(header.length, ...values.map((value) => value.length));
    return { wch: Math.min(42, Math.max(14, maxLength + 4)) };
  });
  sheet["!autofilter"] = { ref: sheet["!ref"] || `A1:${String.fromCharCode(64 + headers.length)}1` };
}

export async function waitForMapFrame(mapRef: RefObject<L.Map | null>) {
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => window.setTimeout(resolve, 240));
  mapRef.current?.invalidateSize();
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

export async function renderMapSnapshot(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(rect.height);
  const clone = element.cloneNode(true) as HTMLElement;
  const sourceNodes = [element, ...Array.from(element.querySelectorAll<HTMLElement>("*"))];
  const cloneNodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];

  sourceNodes.forEach((sourceNode, index) => {
    const cloneNode = cloneNodes[index];
    if (!cloneNode) return;
    const computed = window.getComputedStyle(sourceNode);
    cloneNode.setAttribute("style", Array.from(computed).map((name) => `${name}:${computed.getPropertyValue(name)};`).join(""));
  });

  Array.from(element.querySelectorAll("canvas")).forEach((sourceCanvas, index) => {
    const cloneCanvas = clone.querySelectorAll("canvas")[index];
    if (!cloneCanvas) return;
    const image = document.createElement("img");
    try {
      image.src = (sourceCanvas as HTMLCanvasElement).toDataURL("image/png");
    } catch {
      return;
    }
    image.style.width = `${cloneCanvas.clientWidth || (sourceCanvas as HTMLCanvasElement).clientWidth}px`;
    image.style.height = `${cloneCanvas.clientHeight || (sourceCanvas as HTMLCanvasElement).clientHeight}px`;
    cloneCanvas.replaceWith(image);
  });

  clone.style.margin = "0";
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${height}px`;
  wrapper.style.background = "#ffffff";
  wrapper.appendChild(clone);
  const serialized = new XMLSerializer().serializeToString(wrapper);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_error"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
  return { image, width, height };
}

export async function exportCombinedSnapshots(filename: string, title: string, snapshots: Array<{ image: HTMLImageElement; width: number; height: number; caption?: string }>) {
  if (!snapshots.length) return;
  const padding = 20;
  const gap = 18;
  const titleHeight = 42;
  const captionHeight = 28;
  const width = Math.max(...snapshots.map((snapshot) => snapshot.width)) + padding * 2;
  const height = titleHeight + padding + snapshots.reduce((sum, snapshot) => sum + snapshot.height + (snapshot.caption ? captionHeight : 0), 0) + gap * Math.max(0, snapshots.length - 1) + padding;
  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(2, 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#0f172a";
  ctx.font = '700 22px Arial, sans-serif';
  ctx.fillText(title, padding, 30);
  let offsetY = titleHeight;

  snapshots.forEach((snapshot, index) => {
    if (snapshot.caption) {
      ctx.fillStyle = "#334155";
      ctx.font = '700 16px Arial, sans-serif';
      ctx.fillText(snapshot.caption, padding, offsetY + 18);
      offsetY += captionHeight;
    }
    ctx.drawImage(snapshot.image, padding, offsetY, snapshot.width, snapshot.height);
    offsetY += snapshot.height;
    if (index < snapshots.length - 1) offsetY += gap;
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function toggleExportCategorySelection(current: string[], category: string) {
  return current.includes(category) ? current.filter((item) => item !== category) : [...current, category];
}

export function toggleAllExportCategorySelection(current: string[], allCategories: string[]) {
  return current.length === allCategories.length ? [] : [...allCategories];
}

export function syncDirectionSelection(currentPrograms: string[], allPrograms: string[]) {
  if (!allPrograms.length) return [];
  const hasAll = allPrograms.every((programId) => currentPrograms.includes(programId));
  return hasAll ? currentPrograms : [...allPrograms];
}

export function toggleStudyProgramSelection(currentCategories: string[], currentPrograms: string[], programId: string) {
  const nextPrograms = currentPrograms.includes(programId)
    ? currentPrograms.filter((item) => item !== programId)
    : [...currentPrograms, programId];
  const nextCategories = nextPrograms.length
    ? currentCategories.includes("dominant_direction") ? currentCategories : [...currentCategories, "dominant_direction"]
    : currentCategories.filter((item) => item !== "dominant_direction");
  return { nextCategories, nextPrograms };
}
