// Helpers για export αποφοίτων από τη λίστα.
import type { Graduate } from "../../lib/api";
import type { RecentGraduateDownload, RecentGraduatePdfItem, RecentGraduateRequest } from "./recentDownloads";

export function buildGraduateExportFileName(format: "xlsx" | "csv" | "pdf") {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `alupla_graduates_export_${stamp}.${format}`;
}

export function createGraduatePdfItems(items: Graduate[]): RecentGraduatePdfItem[] {
  return items.map((item) => ({
    id: Number(item.id),
    ad_code: item.ad_code,
    student_number: item.student_number,
    last_name: item.last_name,
    first_name: item.first_name,
    father_name: item.father_name,
    gender: item.gender,
    entry_year: item.entry_year,
    birth_date: item.birth_date,
    degree_grade: item.degree_grade,
    graduation_date: item.graduation_date,
    oath_date: item.oath_date,
    study_program_id: item.study_program_id,
    origin_country_region_id: item.origin_country_region_id ?? null,
    origin_periphery_region_id: item.origin_periphery_region_id ?? null,
    origin_region_id: item.origin_region_id ?? null,
    origin_city_region_id: item.origin_city_region_id ?? null,
    origin_municipality: item.origin_municipality ?? null,
    origin_country: item.origin_country ?? null,
    origin_foreign_city: item.origin_foreign_city ?? null,
    origin_country_name_en: (item as any).origin_country_name_en ?? null,
    origin_region_name_en: (item as any).origin_region_name_en ?? null,
    origin_city_name_en: (item as any).origin_city_name_en ?? null,
  }));
}

export function createGraduateExportRequest(params: Record<string, unknown>, ids: number[] | undefined, lang: "gr" | "en"): RecentGraduateRequest {
  return {
    params: { ...params },
    ids,
    lang,
  };
}

export function upsertRecentGraduateDownload(args: {
  current: RecentGraduateDownload[];
  signature: string;
  fileName: string;
  format: "xlsx" | "csv" | "pdf";
  totalItems: number;
  selectedItems: number;
  filtersLabel: string;
  request?: RecentGraduateRequest;
  pdfItems?: RecentGraduatePdfItem[];
}) {
  const now = new Date().toISOString();
  const existing = args.current.find((item) => item.signature === args.signature);

  const nextItem: RecentGraduateDownload = existing
    ? {
        ...existing,
        fileName: args.fileName,
        totalItems: args.totalItems,
        selectedItems: args.selectedItems,
        filtersLabel: args.filtersLabel,
        lastDownloadedAt: now,
        count: existing.count + 1,
        request: args.request || existing.request,
        pdfItems: args.pdfItems || existing.pdfItems,
      }
    : {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        signature: args.signature,
        format: args.format,
        fileName: args.fileName,
        createdAt: now,
        lastDownloadedAt: now,
        count: 1,
        totalItems: args.totalItems,
        selectedItems: args.selectedItems,
        filtersLabel: args.filtersLabel,
        request: args.request,
        pdfItems: args.pdfItems,
      };

  return [nextItem, ...args.current.filter((item) => item.signature !== args.signature)].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return new Date(b.lastDownloadedAt).getTime() - new Date(a.lastDownloadedAt).getTime();
  });
}

export function touchRecentGraduateDownload(items: RecentGraduateDownload[], itemId: string) {
  return items
    .map((entry) => entry.id === itemId ? { ...entry, count: entry.count + 1, lastDownloadedAt: new Date().toISOString() } : entry)
    .sort((a, b) => (b.count - a.count) || (new Date(b.lastDownloadedAt).getTime() - new Date(a.lastDownloadedAt).getTime()));
}
