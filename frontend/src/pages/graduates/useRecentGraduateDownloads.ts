import { useEffect, useState } from "react";
import { exportGraduatesFile, type Graduate, type QueryParams } from "../../lib/api";
import { downloadBlob } from "../../lib/download";
import { exportGraduatesPdf } from "./pdfExport";
import {
  MAX_RECENT_GRADUATE_DOWNLOADS,
  buildRecentDownloadFiltersLabel,
  recentGraduateSessionDownloads,
  safeReadRecentGraduateDownloads,
  writeRecentGraduateDownloads,
  type RecentGraduateDownload,
  type RecentGraduatePdfItem,
  type RecentGraduateRequest,
} from "./recentDownloads";
import type { GraduatesFiltersState } from "./shared";

export function toRecentGraduatePdfItem(item: Graduate): RecentGraduatePdfItem {
  return {
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
    origin_region_id: item.origin_region_id ?? null,
    origin_municipality: item.origin_municipality ?? null,
    origin_country: item.origin_country ?? null,
    origin_country_region_id: item.origin_country_region_id ?? null,
    origin_periphery_region_id: item.origin_periphery_region_id ?? null,
    origin_foreign_city: item.origin_foreign_city ?? null,
    origin_country_name_en: item.origin_country_name_en ?? null,
    origin_region_name_en: item.origin_region_name_en ?? null,
    origin_nomos_name_en: item.origin_nomos_name_en ?? null,
    origin_city_name_en: item.origin_city_name_en ?? null,
  };
}

export function useRecentGraduateDownloads(args: {
  filters: GraduatesFiltersState;
  activeLang: "gr" | "en";
  items: Graduate[];
  programNameById: Map<number, string>;
  regionNameById: Map<number, string>;
  exportFailedMessage: string;
}) {
  const { filters, activeLang, items, programNameById, regionNameById, exportFailedMessage } = args;
  const [recentDownloads, setRecentDownloads] = useState<RecentGraduateDownload[]>([]);

  useEffect(() => {
    const stored = safeReadRecentGraduateDownloads();
    setRecentDownloads(stored);
    writeRecentGraduateDownloads(stored);
  }, []);

  async function rememberDownload(download: {
    blob: Blob;
    format: "xlsx" | "csv" | "pdf";
    fileName: string;
    ids?: number[];
    request?: RecentGraduateRequest;
    pdfItems?: RecentGraduatePdfItem[];
  }) {
    const filtersLabel = buildRecentDownloadFiltersLabel(filters, activeLang, download.ids?.length || 0, items.length);
    const signature = JSON.stringify({
      format: download.format,
      ids: download.ids || [],
      params: download.request?.params || {},
      count: download.pdfItems?.length || 0,
    });
    const now = new Date().toISOString();
    recentGraduateSessionDownloads.set(signature, { blob: download.blob, fileName: download.fileName });
    const current = safeReadRecentGraduateDownloads();
    const existing = current.find((item) => item.signature === signature);
    const nextItem: RecentGraduateDownload = existing
      ? {
          ...existing,
          fileName: download.fileName,
          totalItems: items.length,
          selectedItems: download.ids?.length || 0,
          filtersLabel,
          lastDownloadedAt: now,
          count: existing.count + 1,
          request: download.request || existing.request,
          pdfItems: download.pdfItems || existing.pdfItems,
        }
      : {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          signature,
          format: download.format,
          fileName: download.fileName,
          createdAt: now,
          lastDownloadedAt: now,
          count: 1,
          totalItems: items.length,
          selectedItems: download.ids?.length || 0,
          filtersLabel,
          request: download.request,
          pdfItems: download.pdfItems,
        };
    const next = [nextItem, ...current.filter((item) => item.signature !== signature)].sort((a, b) =>
      b.count - a.count || new Date(b.lastDownloadedAt).getTime() - new Date(a.lastDownloadedAt).getTime(),
    );
    writeRecentGraduateDownloads(next);
    setRecentDownloads(next.slice(0, MAX_RECENT_GRADUATE_DOWNLOADS));
  }

  async function downloadStoredExport(item: RecentGraduateDownload) {
    try {
      const cached = recentGraduateSessionDownloads.get(item.signature);
      if (cached) {
        downloadBlob(cached.blob, item.fileName);
      } else if (item.format === "pdf" && item.pdfItems?.length) {
        const blob = await exportGraduatesPdf({ items: item.pdfItems as Graduate[], lang: activeLang, programNameById, regionNameById });
        recentGraduateSessionDownloads.set(item.signature, { blob, fileName: item.fileName });
        downloadBlob(blob, item.fileName);
      } else if (item.request) {
        const blob = await exportGraduatesFile(item.request.params as QueryParams, item.format, item.request.lang);
        recentGraduateSessionDownloads.set(item.signature, { blob, fileName: item.fileName });
        downloadBlob(blob, item.fileName);
      } else {
        throw new Error(exportFailedMessage);
      }

      const next = safeReadRecentGraduateDownloads()
        .map((entry) => entry.id === item.id
          ? { ...entry, count: entry.count + 1, lastDownloadedAt: new Date().toISOString() }
          : entry)
        .sort((a, b) =>
          b.count - a.count || new Date(b.lastDownloadedAt).getTime() - new Date(a.lastDownloadedAt).getTime(),
        );
      writeRecentGraduateDownloads(next);
      setRecentDownloads(next.slice(0, MAX_RECENT_GRADUATE_DOWNLOADS));
    } catch (error: any) {
      alert(error?.message ?? exportFailedMessage);
    }
  }

  function removeStoredExport(itemId: string) {
    const next = safeReadRecentGraduateDownloads().filter((item) => item.id !== itemId);
    writeRecentGraduateDownloads(next);
    setRecentDownloads(next.slice(0, MAX_RECENT_GRADUATE_DOWNLOADS));
  }

  return { recentDownloads, rememberDownload, downloadStoredExport, removeStoredExport };
}
