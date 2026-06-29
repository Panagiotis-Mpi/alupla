// Κρατά πρόσφατα downloads για να μπορεί ο χρήστης να τα ξανακατεβάσει.
import type { Graduate, QueryParams } from "../../lib/api";
import { registerPrivateMemoryCleanup } from "../../lib/cache";
import { formatGreeceDateTime } from "../../lib/exportFilenames";
import type { GraduatesFiltersState } from "./shared";

export type RecentGraduateRequest = {
  params: QueryParams;
  ids?: number[];
  lang: "gr" | "en";
};

export type RecentGraduatePdfItem = Pick<
  Graduate,
  | "id"
  | "ad_code"
  | "student_number"
  | "last_name"
  | "first_name"
  | "father_name"
  | "gender"
  | "entry_year"
  | "birth_date"
  | "degree_grade"
  | "graduation_date"
  | "oath_date"
  | "study_program_id"
  | "origin_country"
  | "origin_country_region_id"
  | "origin_periphery_region_id"
  | "origin_country_name_en"
  | "origin_region_name_en"
  | "origin_nomos_name_en"
  | "origin_city_name_en"
  | "origin_region_id"
  | "origin_city_region_id"
  | "origin_municipality"
  | "origin_foreign_city"
>;

export type RecentGraduateDownload = {
  id: string;
  signature: string;
  format: "xlsx" | "csv" | "pdf";
  fileName: string;
  createdAt: string;
  lastDownloadedAt: string;
  count: number;
  totalItems: number;
  selectedItems: number;
  filtersLabel: string;
  request?: RecentGraduateRequest;
  pdfItems?: RecentGraduatePdfItem[];
};

export const MAX_RECENT_GRADUATE_DOWNLOADS = 8;
const RECENT_GRADUATE_DOWNLOADS_KEY = "alupla.graduates.recentDownloads";
export const recentGraduateSessionDownloads = new Map<string, { blob: Blob; fileName: string }>();
registerPrivateMemoryCleanup(() => recentGraduateSessionDownloads.clear());

function normalizeRecentGraduateDownload(item: any): RecentGraduateDownload | null {
  if (!item || typeof item !== "object") return null;
  const format = item.format === "csv" || item.format === "pdf" ? item.format : "xlsx";
  const fileName = typeof item.fileName === "string" && item.fileName.trim() ? item.fileName : "";
  if (!fileName) return null;

  const request = item.request && typeof item.request === "object"
    ? {
        params: item.request.params && typeof item.request.params === "object" ? item.request.params as QueryParams : {},
        ids: Array.isArray(item.request.ids) ? item.request.ids.map((value: unknown) => Number(value)).filter((value: number) => Number.isInteger(value) && value > 0) : undefined,
        lang: String(item.request.lang || "").toLowerCase().startsWith("en") ? "en" as const : "gr" as const,
      }
    : undefined;

  const pdfItems = Array.isArray(item.pdfItems)
    ? item.pdfItems
        .filter((entry: any) => entry && typeof entry === "object")
        .map((entry: any) => ({
          id: Number(entry.id) || 0,
          ad_code: String(entry.ad_code ?? ""),
          student_number: String(entry.student_number ?? ""),
          last_name: String(entry.last_name ?? ""),
          first_name: String(entry.first_name ?? ""),
          father_name: String(entry.father_name ?? ""),
          gender: String(entry.gender ?? "").toUpperCase() === "F" ? "F" : "M",
          entry_year: Number(entry.entry_year) || 0,
          birth_date: String(entry.birth_date ?? ""),
          degree_grade: Number(entry.degree_grade) || 0,
          graduation_date: String(entry.graduation_date ?? ""),
          oath_date: String(entry.oath_date ?? ""),
          study_program_id: Number(entry.study_program_id) || 0,
          origin_country: entry.origin_country == null ? null : String(entry.origin_country),
          origin_country_region_id: entry.origin_country_region_id == null || entry.origin_country_region_id === "" ? null : Number(entry.origin_country_region_id),
          origin_periphery_region_id: entry.origin_periphery_region_id == null || entry.origin_periphery_region_id === "" ? null : Number(entry.origin_periphery_region_id),
          origin_country_name_en: entry.origin_country_name_en == null ? null : String(entry.origin_country_name_en),
          origin_region_name_en: entry.origin_region_name_en == null ? null : String(entry.origin_region_name_en),
          origin_nomos_name_en: entry.origin_nomos_name_en == null ? null : String(entry.origin_nomos_name_en),
          origin_city_name_en: entry.origin_city_name_en == null ? null : String(entry.origin_city_name_en),
          origin_region_id: entry.origin_region_id == null || entry.origin_region_id === "" ? null : Number(entry.origin_region_id),
          origin_city_region_id: entry.origin_city_region_id == null || entry.origin_city_region_id === "" ? null : Number(entry.origin_city_region_id),
          origin_municipality: entry.origin_municipality == null ? null : String(entry.origin_municipality),
          origin_foreign_city: entry.origin_foreign_city == null ? null : String(entry.origin_foreign_city),
        }))
        .filter((entry: RecentGraduatePdfItem) => entry.id > 0)
    : undefined;

  return {
    id: typeof item.id === "string" && item.id.trim() ? item.id : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    signature: typeof item.signature === "string" && item.signature.trim() ? item.signature : `${format}:${fileName}`,
    format,
    fileName,
    createdAt: typeof item.createdAt === "string" && item.createdAt.trim() ? item.createdAt : new Date().toISOString(),
    lastDownloadedAt: typeof item.lastDownloadedAt === "string" && item.lastDownloadedAt.trim() ? item.lastDownloadedAt : new Date().toISOString(),
    count: Number(item.count) || 0,
    totalItems: Number(item.totalItems) || 0,
    selectedItems: Number(item.selectedItems) || 0,
    filtersLabel: typeof item.filtersLabel === "string" ? item.filtersLabel : "",
    request,
    pdfItems: pdfItems?.length ? pdfItems : undefined,
  };
}

export function safeReadRecentGraduateDownloads() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_GRADUATE_DOWNLOADS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeRecentGraduateDownload(item))
      .filter(Boolean) as RecentGraduateDownload[];
  } catch {
    return [];
  }
}

export function writeRecentGraduateDownloads(items: RecentGraduateDownload[]) {
  if (typeof window === "undefined") return;
  const normalized = items
    .map((item) => normalizeRecentGraduateDownload(item))
    .filter(Boolean) as RecentGraduateDownload[];

  for (let limit = Math.min(MAX_RECENT_GRADUATE_DOWNLOADS, normalized.length || MAX_RECENT_GRADUATE_DOWNLOADS); limit >= 1; limit -= 1) {
    try {
      window.localStorage.setItem(RECENT_GRADUATE_DOWNLOADS_KEY, JSON.stringify(normalized.slice(0, limit)));
      return;
    } catch {
    }
  }

  try {
    window.localStorage.removeItem(RECENT_GRADUATE_DOWNLOADS_KEY);
  } catch {
  }
}

export function formatRecentGraduateDownloadDate(value: string, lang: "gr" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatGreeceDateTime(date, lang === "en" ? "en-GB" : "el-GR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function buildRecentDownloadFiltersLabel(filters: GraduatesFiltersState, lang: "gr" | "en", selectedCount: number, totalCount: number) {
  const parts: string[] = [];

  const entryYears = [filters.entry_year_min, filters.entry_year_max].map((value) => String(value || "").trim()).filter(Boolean);
  if (entryYears.length) parts.push((lang === "en" ? "Entry year" : "Έτος εισαγωγής") + `: ${entryYears.join(" - ")}`);

  const graduationYears = [filters.graduation_date_from, filters.graduation_date_to].map((value) => String(value || "").slice(0, 4).trim()).filter(Boolean);
  if (graduationYears.length) parts.push((lang === "en" ? "Graduation" : "Αποφοίτηση") + `: ${graduationYears.join(" - ")}`);

  const studyProgram = String(filters.study_program_id || "").trim();
  if (studyProgram) parts.push((lang === "en" ? "Program" : "Πρόγραμμα") + `: ${studyProgram}`);

  const gender = String(filters.gender || "").trim();
  if (gender) parts.push((lang === "en" ? "Gender" : "Φύλο") + `: ${gender}`);

  const searchParts = [filters.ad_code_like, filters.student_number_like, filters.last_name_like, filters.first_name_like, filters.father_name_like]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  if (searchParts.length) parts.push((lang === "en" ? "Search" : "Αναζήτηση") + `: ${searchParts.join(", ")}`);

  const counts = lang === "en"
    ? `${selectedCount || totalCount} / ${totalCount} selected`
    : `${selectedCount || totalCount} / ${totalCount} επιλεγμένα`;

  return [...parts, counts].join(" • ");
}
