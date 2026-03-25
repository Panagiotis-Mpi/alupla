import type React from "react";
import { useTranslation } from "react-i18next";
import type { Region } from "../../lib/api";

export type RegionFormState = {
  id: number | null;
  name: string;
  parent_id: string;
  latitude: string;
  longitude: string;
};

export type PeripheryFormState = {
  id: number | null;
  name: string;
  latitude: string;
  longitude: string;
};

export type UnmatchedCityItem = {
  name: string;
  count: number;
  periphery_id: number | null;
  periphery_name: string | null;
};

export type SortDirection = "asc" | "desc";
export type RegionSection = "peripheries" | "cities" | "unmatched";

export type UnmatchedSortKey = "number" | "name" | "count" | "periphery";
export type PeripherySortKey = "number" | "name" | "latitude" | "longitude";
export type CitySortKey = "number" | "name" | "periphery" | "latitude" | "longitude";

export type ImportSummary = {
  inserted?: number;
  updated?: number;
  skipped?: number;
};

export const emptyForm: RegionFormState = {
  id: null,
  name: "",
  parent_id: "",
  latitude: "",
  longitude: "",
};

export const emptyPeripheryForm: PeripheryFormState = {
  id: null,
  name: "",
  latitude: "",
  longitude: "",
};

export const pageGapStyle: React.CSSProperties = { gap: 14 };
export const zeroMarginStyle: React.CSSProperties = { margin: 0 };
export const formGridStyle: React.CSSProperties = { marginTop: 12, gap: 10 };
export const fieldLabelStyle: React.CSSProperties = { marginBottom: 6 };
export const dualGridStyle: React.CSSProperties = { gap: 10 };
export const searchInputStyle: React.CSSProperties = { maxWidth: 280 };
export const tableWrapStyle: React.CSSProperties = { overflowX: "auto", marginTop: 12 };
export const errorStyle: React.CSSProperties = { color: "#b91c1c" };
export const successStyle: React.CSSProperties = { color: "#166534" };
export const sortableHeaderStyle: React.CSSProperties = { cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" };
export const countTextStyle: React.CSSProperties = { fontSize: 13, color: "#334155" };
export const countBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid #e2e8f0",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 13,
  color: "#334155",
  background: "#fff",
};
export const topButtonStyle: React.CSSProperties = {
  minWidth: 136,
  height: 40,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
  padding: "0 12px",
  fontSize: 14,
};
export const menuWrapStyle: React.CSSProperties = { position: "relative", display: "inline-flex" };
export const menuStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  minWidth: 220,
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  boxShadow: "0 12px 32px rgba(15,23,42,.12)",
  padding: 8,
  display: "grid",
  gap: 8,
  zIndex: 40,
};

export function toFormState(city: Region): RegionFormState {
  return {
    id: city.id,
    name: city.name,
    parent_id: city.parent_id != null ? String(city.parent_id) : "",
    latitude: city.latitude != null ? String(city.latitude) : "",
    longitude: city.longitude != null ? String(city.longitude) : "",
  };
}

export function toPeripheryFormState(item: Region): PeripheryFormState {
  return {
    id: item.id,
    name: item.name,
    latitude: item.latitude != null ? String(item.latitude) : "",
    longitude: item.longitude != null ? String(item.longitude) : "",
  };
}

export function compareText(a: string, b: string) {
  return a.localeCompare(b, "el");
}

export function compareNullableNumber(a: number | null | undefined, b: number | null | undefined) {
  const left = a ?? Number.NEGATIVE_INFINITY;
  const right = b ?? Number.NEGATIVE_INFINITY;
  return left - right;
}

export function applyDirection(value: number, direction: SortDirection) {
  return direction === "asc" ? value : -value;
}

export function nextDirection(currentKey: string, activeKey: string, currentDirection: SortDirection): SortDirection {
  if (currentKey !== activeKey) return "asc";
  return currentDirection === "asc" ? "desc" : "asc";
}

export function sortIndicator(active: boolean, direction: SortDirection) {
  if (!active) return "";
  return direction === "asc" ? " ▲" : " ▼";
}

export function sectionLabel(section: RegionSection, t: ReturnType<typeof useTranslation>["t"]) {
  if (section === "peripheries") return t("sections.peripheries");
  if (section === "cities") return t("sections.cities");
  return t("sections.unmatched");
}

export function formatImportSummary(summary: ImportSummary | undefined, t: ReturnType<typeof useTranslation>["t"]) {
  const inserted = Number(summary?.inserted ?? 0);
  const updated = Number(summary?.updated ?? 0);
  const skipped = Number(summary?.skipped ?? 0);
  return t("messages.importDone", { inserted, updated, skipped });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function normalizeKey(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function unmatchedStorageKey(name: string, peripheryId: number | null) {
  return `${normalizeKey(name)}::${peripheryId ?? "none"}`;
}

export function readIgnoredUnmatched() {
  try {
    const raw = localStorage.getItem("alupla_regions_hidden_unmatched");
    if (!raw) return [] as string[];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((value) => String(value)) : [];
  } catch {
    return [];
  }
}

export function writeIgnoredUnmatched(keys: string[]) {
  try {
    localStorage.setItem("alupla_regions_hidden_unmatched", JSON.stringify(Array.from(new Set(keys))));
  } catch {
  }
}

export function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
