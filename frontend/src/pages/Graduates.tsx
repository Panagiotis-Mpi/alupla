import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  deleteGraduate,
  downloadGraduatesImportTemplate,
  exportGraduatesFile,
  importGraduatesFile,
  logGraduatesPdfExport,
  type Graduate,
  type StudyProgram,
} from "../lib/api";
import { GraduatesTable } from "./graduates/GraduatesTable";
import { exportGraduatesPdf } from "./graduates/pdfExport";
import {
  buildGraduatesParams,
  createNameMap,
  createRegionMap,
  EMPTY_GRADUATES_FILTERS,
  filterAndSortGraduates,
  GraduatesFilters,
  renderGenderValue,
  type GraduatesFiltersState,
  type SortDir,
  type SortKey,
} from "./graduates/shared";
import { loadGraduatesScreen, useMenuDismiss, useSyncedScrollbar } from "./graduates/hooks";
import { downloadBlob } from "../lib/download";
import { toggleMergedVisibleSelection, toggleSelectionValue } from "./shared/selection";



type RecentGraduateRequest = {
  params: Record<string, unknown>;
  ids?: number[];
  lang: "gr" | "en";
};

type RecentGraduatePdfItem = Pick<
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
  | "program_direction_id"
  | "origin_region_id"
  | "origin_municipality"
  | "origin_foreign_city"
>;

type RecentGraduateDownload = {
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

const RECENT_GRADUATE_DOWNLOADS_KEY = "alupla.graduates.recentDownloads";
const MAX_RECENT_GRADUATE_DOWNLOADS = 8;
const recentGraduateSessionDownloads = new Map<string, { blob: Blob; fileName: string }>();

function normalizeRecentGraduateDownload(item: any) {
  if (!item || typeof item !== "object") return null;
  const format = item.format === "csv" || item.format === "pdf" ? item.format : "xlsx";
  const fileName = typeof item.fileName === "string" && item.fileName.trim() ? item.fileName : "";
  if (!fileName) return null;

  const request = item.request && typeof item.request === "object"
    ? {
        params: item.request.params && typeof item.request.params === "object" ? item.request.params as Record<string, unknown> : {},
        ids: Array.isArray(item.request.ids) ? item.request.ids.map((value: unknown) => Number(value)).filter((value: number) => Number.isInteger(value) && value > 0) : undefined,
        lang: String(item.request.lang || "").toLowerCase().startsWith("en") ? "en" : "gr",
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
          program_direction_id: entry.program_direction_id == null || entry.program_direction_id === "" ? null : Number(entry.program_direction_id),
          origin_region_id: entry.origin_region_id == null || entry.origin_region_id === "" ? null : Number(entry.origin_region_id),
          origin_municipality: entry.origin_municipality == null ? null : String(entry.origin_municipality),
          origin_country: entry.origin_country == null ? null : String(entry.origin_country),
          origin_foreign_city: entry.origin_foreign_city == null ? null : String(entry.origin_foreign_city),
        }))
        .filter((entry: any) => entry.id > 0)
    : undefined;

  if (format === "pdf" && !pdfItems?.length) return null;
  if (format !== "pdf" && !request) return null;

  return {
    id: typeof item.id === "string" && item.id.trim() ? item.id : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    signature: typeof item.signature === "string" && item.signature.trim() ? item.signature : JSON.stringify({ format, fileName }),
    format,
    fileName,
    createdAt: typeof item.createdAt === "string" && item.createdAt ? item.createdAt : new Date().toISOString(),
    lastDownloadedAt: typeof item.lastDownloadedAt === "string" && item.lastDownloadedAt ? item.lastDownloadedAt : new Date().toISOString(),
    count: Math.max(1, Number(item.count) || 1),
    totalItems: Math.max(0, Number(item.totalItems) || 0),
    selectedItems: Math.max(0, Number(item.selectedItems) || 0),
    filtersLabel: typeof item.filtersLabel === "string" ? item.filtersLabel : "",
    request,
    pdfItems,
  } satisfies RecentGraduateDownload;
}

function safeReadRecentGraduateDownloads() {
  if (typeof window === "undefined") return [] as RecentGraduateDownload[];
  try {
    const raw = window.localStorage.getItem(RECENT_GRADUATE_DOWNLOADS_KEY);
    if (!raw) return [] as RecentGraduateDownload[];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as RecentGraduateDownload[];
    return parsed
      .map((item) => normalizeRecentGraduateDownload(item))
      .filter((item): item is RecentGraduateDownload => Boolean(item))
      .slice(0, MAX_RECENT_GRADUATE_DOWNLOADS);
  } catch {
    return [] as RecentGraduateDownload[];
  }
}

function writeRecentGraduateDownloads(items: RecentGraduateDownload[]) {
  if (typeof window === "undefined") return;
  const normalized = items
    .map((item) => normalizeRecentGraduateDownload(item))
    .filter((item): item is RecentGraduateDownload => Boolean(item));

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

function formatRecentGraduateDownloadDate(value: string, lang: "gr" | "en") {
  try {
    return new Intl.DateTimeFormat(lang === "gr" ? "el-GR" : "en-GB", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function buildRecentDownloadFiltersLabel(filters: GraduatesFiltersState, lang: "gr" | "en", selectedCount: number, totalCount: number) {
  const parts: string[] = [];
  if (filters.last_name_like) parts.push(`${lang === "gr" ? "Επώνυμο" : "Last name"}: ${filters.last_name_like}`);
  if (filters.first_name_like) parts.push(`${lang === "gr" ? "Όνομα" : "First name"}: ${filters.first_name_like}`);
  if (filters.gender) parts.push(`${lang === "gr" ? "Φύλο" : "Gender"}: ${filters.gender}`);
  if (filters.study_program_id) parts.push(`${lang === "gr" ? "Πρόγραμμα" : "Program"}: ${filters.study_program_id}`);
  if (filters.program_direction_id) parts.push(`${lang === "gr" ? "Κατεύθυνση" : "Direction"}: ${filters.program_direction_id}`);
  if (filters.origin_region_id) parts.push(`${lang === "gr" ? "Περιφέρεια" : "Region"}: ${filters.origin_region_id}`);
  if (filters.origin_country_like) parts.push(`${lang === "gr" ? "Χώρα" : "Country"}: ${filters.origin_country_like}`);
  if (filters.origin_foreign_city_like) parts.push(`${lang === "gr" ? "Πόλη εξωτερικού" : "Foreign city"}: ${filters.origin_foreign_city_like}`);
  if (filters.entry_year_from || filters.entry_year_to) parts.push(`${lang === "gr" ? "Έτος εισαγωγής" : "Entry year"}: ${filters.entry_year_from || "…"}-${filters.entry_year_to || "…"}`);
  if (selectedCount > 0) parts.push(lang === "gr" ? `Επιλεγμένοι: ${selectedCount}` : `Selected: ${selectedCount}`);
  if (!parts.length) parts.push(lang === "gr" ? `Όλο το αποτέλεσμα (${totalCount})` : `Full result (${totalCount})`);
  return parts.join(" · ");
}

type ImportReport = {
  summary?: {
    inserted?: number;
    updated?: number;
    skipped?: number;
  };
  errors?: Array<Record<string, unknown>>;
};

type ToastState = {
  type: "success" | "error";
  title: string;
  detail?: string;
};

type ImportIssueGroup = {
  key: string;
  column: string;
  rows: number[];
  reasons: string[];
};

function getImportColumnLabel(column: string, t: (key: string, options?: Record<string, unknown>) => string) {
  const labels: Record<string, string> = {
    student_number: t("table.am"),
    ad_code: t("table.ad"),
    last_name: t("table.lastName"),
    first_name: t("table.firstName"),
    father_name: t("table.fatherName"),
    gender: t("table.gender"),
    entry_year: t("table.entryYear"),
    birth_date: t("table.birthDate"),
    graduation_date: t("table.graduationDate"),
    oath_date: t("table.oathDate"),
    degree_grade: t("table.degreeGrade"),
    study_program: t("table.studyProgram"),
    origin_country: t("table.country"),
    origin_region: t("table.region"),
    origin_municipality: t("table.originMunicipality"),
    origin_country: t("table.country"),
    origin_foreign_city: t("filters.foreignCity"),
  };
  return labels[column] || column;
}

function getImportIssueHint(column: string, reasons: string[], t: (key: string, options?: Record<string, unknown>) => string) {
  const all = reasons.join(" ");

  if (column === "gender") {
    return t("toast.hintGender");
  }

  if (["graduation_date", "oath_date", "birth_date"].includes(column)) {
    return t("toast.hintDate");
  }

  if (column === "entry_year") {
    return t("toast.hintYear");
  }

  if (column === "degree_grade") {
    return t("toast.hintGrade");
  }

  if (column === "study_program") {
    return t("toast.hintStudyProgram");
  }

  if (column === "origin_region") {
    return t("toast.hintRegion");
  }

  if (["origin_country"].includes(column)) {
    return t("toast.hintForeignCountry");
  }

  if (["origin_municipality", "origin_foreign_city"].includes(column)) {
    return t("toast.hintForeignCity");
  }

  if (column === "student_number") {
    if (all.includes("Duplicate")) return t("toast.hintAmDuplicate");
    return t("toast.hintAm");
  }

  if (column === "ad_code") {
    if (all.includes("Duplicate")) return t("toast.hintAdDuplicate");
    return t("toast.hintAd");
  }

  if (["last_name", "first_name", "father_name"].includes(column)) {
    return t("toast.hintText");
  }

  return t("toast.hintGeneric");
}

function groupImportErrors(errors: Array<Record<string, unknown>> | undefined) {
  if (!Array.isArray(errors) || !errors.length) {
    return [] as ImportIssueGroup[];
  }

  const groups = new Map<string, ImportIssueGroup>();

  for (const error of errors) {
    const column = String(error?.column || "general");
    const key = column;
    const row = Number(error?.row);
    const message = String(error?.message || "").trim();
    const details = Array.isArray(error?.details) ? error.details.map((item) => String(item || "").trim()).filter(Boolean) : [];
    const reasons = [message, ...details].filter(Boolean);

    const current = groups.get(key);
    if (current) {
      if (Number.isFinite(row) && !current.rows.includes(row)) current.rows.push(row);
      for (const reason of reasons) {
        if (reason && !current.reasons.includes(reason)) current.reasons.push(reason);
      }
      continue;
    }

    groups.set(key, {
      key,
      column,
      rows: Number.isFinite(row) ? [row] : [],
      reasons,
    });
  }

  return Array.from(groups.values()).sort((a, b) => a.column.localeCompare(b.column));
}

function buildImportDetail(t: (key: string, options?: Record<string, unknown>) => string, inserted: number, updated: number, skipped: number) {
  return t("toast.importSummaryHuman", { inserted, updated, skipped });
}

function normalizeImportErrorMessage(message: string, t: (key: string, options?: Record<string, unknown>) => string) {
  const normalized = String(message || "").trim();
  if (!normalized) {
    return t("toast.somethingWentWrong");
  }
  if (normalized === "Column birth_year is no longer accepted. Use birth_date instead.") {
    return t("toast.birthYearRemoved");
  }
  if (normalized === "Invalid server response") {
    return t("toast.somethingWentWrong");
  }
  if (normalized === "Request failed" || normalized === "Failed to fetch" || normalized.startsWith("Import request failed (")) {
    return t("toast.somethingWentWrong");
  }
  return normalized;
}

function buildImportTitle(t: (key: string, options?: Record<string, unknown>) => string, inserted: number, updated: number, skipped: number) {
  if (inserted > 0 && updated > 0) {
    return t("toast.importCompletedMixed");
  }
  if (inserted > 0) {
    return t("toast.importCompletedInserted", { inserted });
  }
  if (updated > 0) {
    return t("toast.importCompletedUpdated", { updated });
  }
  if (skipped > 0) {
    return t("toast.importCompletedSkipped", { skipped });
  }
  return t("toast.importCompleted");
}


export default function Graduates() {
  const { t, i18n } = useTranslation("graduates");
  const [importBusy, setImportBusy] = useState(false);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showImportDetails, setShowImportDetails] = useState(false);
  const [programs, setPrograms] = useState<StudyProgram[]>([]);
  const [directions, setDirections] = useState<Array<Record<string, unknown>>>([]);
  const [regions, setRegions] = useState<Array<Record<string, unknown>>>([]);
  const [items, setItems] = useState<Graduate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sortState, setSortState] = useState<{ key: SortKey; dir: SortDir }>({ key: "ad_code", dir: "asc" });
  const [filters, setFilters] = useState<GraduatesFiltersState>(EMPTY_GRADUATES_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [recentDownloadsOpen, setRecentDownloadsOpen] = useState(false);
  const [recentDownloads, setRecentDownloads] = useState<RecentGraduateDownload[]>([]);

  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const importMenuRef = useRef<HTMLDivElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const templateMenuRef = useRef<HTMLDivElement | null>(null);
  const recentDownloadsRef = useRef<HTMLDivElement | null>(null);
  const floatingScrollbarRef = useRef<HTMLDivElement | null>(null);
  const floatingScrollbarInnerRef = useRef<HTMLDivElement | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const activeLang: "gr" | "en" = (i18n.resolvedLanguage || i18n.language || "gr").toLowerCase().startsWith("en") ? "en" : "gr";
  const params = useMemo(() => buildGraduatesParams(filters), [filters]);
  const programNameById = useMemo(() => createNameMap(programs as Array<Record<string, unknown>>, activeLang), [programs, activeLang]);
  const directionNameById = useMemo(() => createNameMap(directions, activeLang), [directions, activeLang]);
  const programDisplayNameById = useMemo(() => createNameMap(programs as Array<Record<string, unknown>>, "gr"), [programs]);
  const directionDisplayNameById = useMemo(() => createNameMap(directions, "gr"), [directions]);
  const regionNameById = useMemo(() => createRegionMap(regions), [regions]);
  const availableDirections = useMemo(() => {
    if (!filters.study_program_id) {
      return directions;
    }
    return directions.filter((item) => Number(item?.study_program_id) === Number(filters.study_program_id));
  }, [directions, filters.study_program_id]);
  const renderGender = (value: unknown) => renderGenderValue(value);

  const visibleItems = useMemo(() => filterAndSortGraduates({
    items,
    sortState,
    searchTerm,
    programNameById: programDisplayNameById,
    directionNameById: directionDisplayNameById,
    regionNameById,
    renderGender,
  }), [items, sortState, searchTerm, programDisplayNameById, directionDisplayNameById, regionNameById]);

  const visibleIds = useMemo(() => visibleItems.map((graduate) => Number(graduate.id)).filter((id) => Number.isFinite(id)), [visibleItems]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.includes(id));
  const groupedImportIssues = useMemo(() => groupImportErrors(importReport?.errors), [importReport]);

  function showToast(nextToast: ToastState) {
    setToast(nextToast);
    setShowImportDetails(false);
  }

  async function load() {
    setLoading(true);
    try {
      const response = await loadGraduatesScreen(params);
      setPrograms(response.programs);
      setRegions(response.regions);
      setItems(response.items);
      setTotal(response.total);
      setDirections(response.directions);
      setSelectedIds((current) => current.filter((id) => response.items.some((graduate) => Number(graduate.id) === id)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);


  useEffect(() => {
    if (filters.program_direction_id && !availableDirections.some((item) => Number(item.id) === Number(filters.program_direction_id))) {
      setFilters((current) => ({ ...current, program_direction_id: "" }));
    }
  }, [availableDirections, filters.program_direction_id]);

  useSyncedScrollbar(tableWrapRef, floatingScrollbarRef, floatingScrollbarInnerRef, [items, sortState, programs, directions, regions]);

  useMenuDismiss([importMenuRef, exportMenuRef, templateMenuRef, recentDownloadsRef], () => {
    setImportMenuOpen(false);
    setExportMenuOpen(false);
    setTemplateMenuOpen(false);
    setRecentDownloadsOpen(false);
  });

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = !allVisibleSelected && someVisibleSelected;
    }
  }, [allVisibleSelected, someVisibleSelected]);

  useEffect(() => {
    const stored = safeReadRecentGraduateDownloads();
    setRecentDownloads(stored);
    writeRecentGraduateDownloads(stored);
  }, []);

  async function rememberDownload(args: {
    blob: Blob;
    format: "xlsx" | "csv" | "pdf";
    fileName: string;
    ids?: number[];
    request?: RecentGraduateRequest;
    pdfItems?: RecentGraduatePdfItem[];
  }) {
    const filtersLabel = buildRecentDownloadFiltersLabel(filters, activeLang, args.ids?.length || 0, items.length);
    const signature = JSON.stringify({
      format: args.format,
      ids: args.ids || [],
      params: args.request?.params || {},
      count: args.pdfItems?.length || 0,
    });
    const now = new Date().toISOString();
    recentGraduateSessionDownloads.set(signature, { blob: args.blob, fileName: args.fileName });
    const current = safeReadRecentGraduateDownloads();
    const existing = current.find((item) => item.signature === signature);
    const nextItem: RecentGraduateDownload = existing ? {
      ...existing,
      fileName: args.fileName,
      totalItems: items.length,
      selectedItems: args.ids?.length || 0,
      filtersLabel,
      lastDownloadedAt: now,
      count: existing.count + 1,
      request: args.request || existing.request,
      pdfItems: args.pdfItems || existing.pdfItems,
    } : {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      signature,
      format: args.format,
      fileName: args.fileName,
      createdAt: now,
      lastDownloadedAt: now,
      count: 1,
      totalItems: items.length,
      selectedItems: args.ids?.length || 0,
      filtersLabel,
      request: args.request,
      pdfItems: args.pdfItems,
    };
    const rest = current.filter((item) => item.signature !== signature);
    const next = [nextItem, ...rest].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return new Date(b.lastDownloadedAt).getTime() - new Date(a.lastDownloadedAt).getTime();
    });
    writeRecentGraduateDownloads(next);
    setRecentDownloads(next.slice(0, MAX_RECENT_GRADUATE_DOWNLOADS));
  }

  async function downloadStoredExport(item: RecentGraduateDownload) {
    try {
      const cached = recentGraduateSessionDownloads.get(item.signature);
      if (cached) {
        downloadBlob(cached.blob, item.fileName);
      } else if (item.format === "pdf" && item.pdfItems?.length) {
        const blob = await exportGraduatesPdf({
          items: item.pdfItems as Graduate[],
          lang: activeLang,
          programNameById: programDisplayNameById,
          directionNameById: directionDisplayNameById,
          regionNameById,
        });
        recentGraduateSessionDownloads.set(item.signature, { blob, fileName: item.fileName });
        downloadBlob(blob, item.fileName);
      } else if (item.request) {
        const blob = await exportGraduatesFile(item.request.params, item.format, item.request.lang);
        recentGraduateSessionDownloads.set(item.signature, { blob, fileName: item.fileName });
        downloadBlob(blob, item.fileName);
      } else {
        throw new Error(t("export.failed"));
      }

      const current = safeReadRecentGraduateDownloads();
      const next = current
        .map((entry) => entry.id === item.id ? { ...entry, count: entry.count + 1, lastDownloadedAt: new Date().toISOString() } : entry)
        .sort((a, b) => (b.count - a.count) || (new Date(b.lastDownloadedAt).getTime() - new Date(a.lastDownloadedAt).getTime()));
      writeRecentGraduateDownloads(next);
      setRecentDownloads(next.slice(0, MAX_RECENT_GRADUATE_DOWNLOADS));
    } catch (error: any) {
      alert(error?.message ?? t("export.failed"));
    }
  }

  function removeStoredExport(itemId: string) {
    const next = safeReadRecentGraduateDownloads().filter((item) => item.id !== itemId);
    writeRecentGraduateDownloads(next);
    setRecentDownloads(next.slice(0, MAX_RECENT_GRADUATE_DOWNLOADS));
  }

  function toggleSort(key: SortKey) {
    setSortState((current) => (current.key === key ? { key, dir: current.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  function getSortIndicator(key: SortKey) {
    if (sortState.key !== key) {
      return "";
    }
    return sortState.dir === "asc" ? " ↑" : " ↓";
  }

  function closeMenus() {
    setImportMenuOpen(false);
    setExportMenuOpen(false);
    setTemplateMenuOpen(false);
    setRecentDownloadsOpen(false);
  }

  function toggleMenu(name: "import" | "export" | "template" | "recent") {
    setImportMenuOpen((current) => (name === "import" ? !current : false));
    setExportMenuOpen((current) => (name === "export" ? !current : false));
    setTemplateMenuOpen((current) => (name === "template" ? !current : false));
    setRecentDownloadsOpen((current) => (name === "recent" ? !current : false));
  }

  function toggleSelected(id: number) {
    setSelectedIds((current) => toggleSelectionValue(current, id));
  }

  function toggleAllVisible() {
    setSelectedIds((current) => toggleMergedVisibleSelection(current, visibleIds, allVisibleSelected));
  }

  async function onExport(format: "xlsx" | "csv" | "pdf", ids?: number[]) {
    const exportParams = { ...params } as Record<string, unknown>;
    delete exportParams.page;
    delete exportParams.pageSize;
    if (ids?.length) {
      exportParams.ids = ids;
    }
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      if (format === "pdf") {
        const exportItems = ids?.length
          ? items.filter((item) => ids.includes(Number(item.id)))
          : items;
        const blob = await exportGraduatesPdf({
          items: exportItems,
          lang: activeLang,
          programNameById: programDisplayNameById,
          directionNameById: directionDisplayNameById,
          regionNameById,
        });
        const fileName = `graduates-${timestamp}.pdf`;
        downloadBlob(blob, fileName);
        await rememberDownload({
          blob,
          format,
          fileName,
          ids,
          pdfItems: exportItems.map((item) => ({
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
            program_direction_id: item.program_direction_id ?? null,
            origin_region_id: item.origin_region_id ?? null,
            origin_municipality: item.origin_municipality ?? null,
            origin_country: item.origin_country ?? null,
            origin_foreign_city: item.origin_foreign_city ?? null,
          })),
        });
        await logGraduatesPdfExport(ids?.length ? { ...exportParams, ids } : exportParams);
        return;
      }
      const request = {
        params: { ...exportParams },
        ids,
        lang: activeLang,
      } satisfies RecentGraduateRequest;
      const blob = await exportGraduatesFile(exportParams, format, i18n.resolvedLanguage || i18n.language);
      const fileName = `graduates-${timestamp}.${format}`;
      downloadBlob(blob, fileName);
      await rememberDownload({ blob, format, fileName, ids, request });
    } catch (error: any) {
      alert(error?.message ?? t("export.failed"));
    }
  }

  async function onDownloadTemplate(format: "xlsx" | "csv") {
    try {
      const blob = await downloadGraduatesImportTemplate(format, i18n.resolvedLanguage || i18n.language);
      downloadBlob(blob, `graduates-import-template.${format}`);
    } catch (error: any) {
      alert(error?.message ?? t("export.failed"));
    }
  }

  async function onImportFile(file: File) {
    setImportReport(null);
    setImportBusy(true);
    try {
      const report = await importGraduatesFile(file, i18n.resolvedLanguage || i18n.language);
      setImportReport(report);
      const inserted = Number(report?.summary?.inserted ?? 0);
      const updated = Number(report?.summary?.updated ?? 0);
      const skipped = Number(report?.summary?.skipped ?? 0);
      const changesCount = inserted + updated;

      showToast({
        type: "success",
        title: buildImportTitle(t, inserted, updated, skipped),
        detail: buildImportDetail(t, inserted, updated, skipped),
      });

      if (changesCount > 0 || skipped > 0) {
        try {
          await load();
        } catch {}
      }
    } catch (error: any) {
      const reason = normalizeImportErrorMessage(error?.message ?? t("toast.somethingWentWrong"), t);
      showToast({
        type: "error",
        title: t("toast.importFailed"),
        detail: t("toast.importFailedReason", { reason }),
      });
    } finally {
      setImportBusy(false);
    }
  }

  async function onDeleteSelected() {
    if (!selectedIds.length) {
      return;
    }
    if (!confirm(t("confirm.deleteSelectedGraduates"))) {
      return;
    }
    try {
      await Promise.all(selectedIds.map((id) => deleteGraduate(id)));
      setSelectedIds([]);
      await load();
    } catch (error: any) {
      alert(error?.message ?? t("toast.somethingWentWrong"));
    }
  }

  async function onDeleteGraduate(graduate: Graduate) {
    if (!confirm(t("confirm.deleteGraduate", { id: graduate.id }))) {
      return;
    }
    await deleteGraduate(graduate.id);
    await load();
  }

  const importActions = [
    { key: "xlsx", label: t("topbar.importExcel"), onClick: () => { closeMenus(); importFileRef.current?.click(); } },
    { key: "csv", label: t("topbar.importCsv"), onClick: () => { closeMenus(); importFileRef.current?.click(); } },
  ];

  const templateActions = [
    { key: "xlsx", label: t("topbar.templateExcel"), onClick: () => { closeMenus(); void onDownloadTemplate("xlsx"); } },
    { key: "csv", label: t("topbar.templateCsv"), onClick: () => { closeMenus(); void onDownloadTemplate("csv"); } },
  ];

  const exportSelectionMessage = activeLang === "gr" ? "Δεν έχεις επιλέξει απόφοιτους." : "You have not selected graduates.";

  const exportActions = [
    { key: "xlsx", label: t("topbar.exportExcel"), onClick: () => {
      closeMenus();
      if (!selectedIds.length) {
        alert(exportSelectionMessage);
        return;
      }
      void onExport("xlsx", selectedIds);
    } },
    { key: "csv", label: t("topbar.exportCsv"), onClick: () => {
      closeMenus();
      if (!selectedIds.length) {
        alert(exportSelectionMessage);
        return;
      }
      void onExport("csv", selectedIds);
    } },
    { key: "pdf", label: t("topbar.exportPdf"), onClick: () => {
      closeMenus();
      if (!selectedIds.length) {
        alert(exportSelectionMessage);
        return;
      }
      void onExport("pdf", selectedIds);
    } },
  ];

  const wideCardStyle: React.CSSProperties = {
    width: "calc(100vw - 32px)",
    marginLeft: "calc(50% - 50vw + 16px)",
    marginRight: 0,
    boxSizing: "border-box",
    marginBottom: 48,
  };

  const headerButtonStyle: React.CSSProperties = {
    all: "unset",
    cursor: "pointer",
    fontWeight: 700,
    color: "inherit",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  };

  const topButtonStyle: React.CSSProperties = {
    minWidth: 136,
    height: 40,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    padding: "0 12px",
    fontSize: 14,
  };

  return (
    <div className="grid" style={{ gap: 14 }}>
      {toast ? (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, width: 360, maxWidth: "calc(100vw - 32px)", background: "#fff", border: "1px solid rgba(0,0,0,0.12)", borderLeft: `6px solid ${toast.type === "success" ? "#16a34a" : "#dc2626"}`, borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.12)", padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{toast.title}</div>
              {toast.detail ? <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{toast.detail}</div> : null}
            </div>
            <button className="btn" type="button" onClick={() => setToast(null)} style={{ padding: "6px 10px" }} aria-label="Close">
              ✕
            </button>
          </div>
          {importReport?.summary ? (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn" type="button" onClick={() => setShowImportDetails((current) => !current)}>
                  {showImportDetails ? t("toast.less") : t("toast.more")}
                </button>
              </div>
              {showImportDetails ? (
                <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: 10, background: "rgba(248,250,252,.9)", display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                    <div>{t("toast.detailsInserted", { inserted: Number(importReport.summary.inserted ?? 0) })}</div>
                    <div>{t("toast.detailsUpdated", { updated: Number(importReport.summary.updated ?? 0) })}</div>
                    <div>{t("toast.detailsSkipped", { skipped: Number(importReport.summary.skipped ?? 0) })}</div>
                    {groupedImportIssues.length > 0 ? (
                      <div style={{ marginTop: 2, opacity: 0.9 }}>{t("toast.detailsIssues", { count: groupedImportIssues.length })}</div>
                    ) : (
                      <div style={{ marginTop: 2, opacity: 0.9 }}>{t("toast.detailsNoIssues")}</div>
                    )}
                  </div>
                  {groupedImportIssues.length > 0 ? (
                    <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 10, display: "grid", gap: 8 }}>
                      {groupedImportIssues.map((issue, index) => {
                        const label = getImportColumnLabel(issue.column, t);
                        const hint = getImportIssueHint(issue.column, issue.reasons, t);
                        const rowsPreview = issue.rows.slice(0, 8).join(", ");
                        const hasMoreRows = issue.rows.length > 8;
                        return (
                          <div key={issue.key} style={{ borderBottom: index === groupedImportIssues.length - 1 ? "none" : "1px solid rgba(0,0,0,0.06)", paddingBottom: 8 }}>
                            <div style={{ fontWeight: 600 }}>
                              {t("toast.issueFieldTitle", { field: label, count: issue.rows.length })}
                            </div>
                            <div style={{ fontSize: 13, marginTop: 4 }}>{hint}</div>
                            {issue.rows.length ? (
                              <div style={{ fontSize: 12, opacity: 0.84, marginTop: 6 }}>
                                {t("toast.issueRows", { rows: hasMoreRows ? `${rowsPreview}…` : rowsPreview })}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>{t("pageTitle")}</h2>
              <span className="badge">{loading ? t("topbar.loading") : t("topbar.total", { total })}</span>
              <span className="badge">{activeLang === "gr" ? `Επιλεγμένοι: ${selectedIds.length}` : `Selected: ${selectedIds.length}`}</span>
            </div>

            <div style={{ display: "grid", gap: 10, width: "100%" }}>
              <input className="input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t("topbar.searchPlaceholder")} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, width: "100%", alignItems: "stretch" }}>
                <Link className="btn primary" to="/graduates/new" style={{ ...topButtonStyle, textDecoration: "none", width: "100%", justifyContent: "center" }}>
                  {t("topbar.newGraduate")}
                </Link>
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void onImportFile(file);
                    }
                    e.currentTarget.value = "";
                  }}
                />
                <div ref={importMenuRef} style={{ position: "relative" }}>
                  <button
                    className="btn"
                    type="button"
                    style={{ ...topButtonStyle, width: "100%", justifyContent: "center" }}
                    onClick={() => toggleMenu("import")}
                    disabled={importBusy}
                  >
                    {importBusy ? t("topbar.importing") : t("topbar.import")}
                  </button>
                  {importMenuOpen ? (
                    <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, minWidth: 170, width: "max-content", maxWidth: "calc(100vw - 32px)", background: "#fff", border: "1px solid rgba(15,23,42,.12)", borderRadius: 12, boxShadow: "0 12px 30px rgba(15,23,42,.12)", padding: 8, display: "grid", gap: 8, zIndex: 30 }}>
                      {importActions.map((action) => <button key={action.key} className="btn" type="button" onClick={action.onClick}>{action.label}</button>)}
                    </div>
                  ) : null}
                </div>
                <div ref={templateMenuRef} style={{ position: "relative" }}>
                  <button
                    className="btn"
                    type="button"
                    style={{ ...topButtonStyle, width: "100%", justifyContent: "center" }}
                    onClick={() => toggleMenu("template")}
                  >
                    {t("topbar.downloadTemplate")}
                  </button>
                  {templateMenuOpen ? (
                    <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, minWidth: 170, width: "max-content", maxWidth: "calc(100vw - 32px)", background: "#fff", border: "1px solid rgba(15,23,42,.12)", borderRadius: 12, boxShadow: "0 12px 30px rgba(15,23,42,.12)", padding: 8, display: "grid", gap: 8, zIndex: 30 }}>
                      {templateActions.map((action) => <button key={action.key} className="btn" type="button" onClick={action.onClick}>{action.label}</button>)}
                    </div>
                  ) : null}
                </div>
                <div ref={exportMenuRef} style={{ position: "relative" }}>
                  <button
                    className="btn"
                    type="button"
                    style={{ ...topButtonStyle, width: "100%", justifyContent: "center" }}
                    onClick={() => toggleMenu("export")}
                  >
                    {t("topbar.export")}
                  </button>
                  {exportMenuOpen ? (
                    <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, minWidth: 170, width: "max-content", maxWidth: "calc(100vw - 32px)", background: "#fff", border: "1px solid rgba(15,23,42,.12)", borderRadius: 12, boxShadow: "0 12px 30px rgba(15,23,42,.12)", padding: 8, display: "grid", gap: 8, zIndex: 30 }}>
                      {exportActions.map((action) => <button key={action.key} className="btn" type="button" onClick={action.onClick}>{action.label}</button>)}
                    </div>
                  ) : null}
                </div>
                <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "center", width: "100%" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, width: "100%", alignItems: "stretch" }}>
                    <div ref={recentDownloadsRef} style={{ position: "relative" }}>
                      <button className="btn" type="button" style={{ ...topButtonStyle, width: "100%", justifyContent: "center" }} onClick={() => toggleMenu("recent")}>
                        {t("topbar.myFrequentDownloads")}
                      </button>
                      {recentDownloadsOpen ? (
                        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, width: 380, maxWidth: "calc(100vw - 32px)", background: "#fff", border: "1px solid rgba(15,23,42,.12)", borderRadius: 12, boxShadow: "0 12px 30px rgba(15,23,42,.12)", padding: 10, display: "grid", gap: 10, zIndex: 30 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                            <div style={{ fontWeight: 700 }}>{t("topbar.myFrequentDownloads")}</div>
                            {recentDownloads.length ? (
                              <span className="badge">{recentDownloads.length}</span>
                            ) : null}
                          </div>
                          {recentDownloads.length ? (
                            <div style={{ display: "grid", gap: 8, maxHeight: 420, overflowY: "auto" }}>
                              {recentDownloads.map((item) => (
                                <div key={item.id} style={{ border: "1px solid rgba(15,23,42,.08)", borderRadius: 12, padding: 10, display: "grid", gap: 6 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                                    <div style={{ fontWeight: 700 }}>{item.format.toUpperCase()}</div>
                                    <span className="badge">{t("topbar.downloadCount", { count: item.count })}</span>
                                  </div>
                                  <div style={{ fontSize: 13, wordBreak: "break-word" }}>{item.fileName}</div>
                                  <div className="muted" style={{ fontSize: 12 }}>{item.filtersLabel}</div>
                                  <div className="muted" style={{ fontSize: 12 }}>{t("topbar.lastDownload", { date: formatRecentGraduateDownloadDate(item.lastDownloadedAt, activeLang) })}</div>
                                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    <button className="btn" type="button" onClick={() => downloadStoredExport(item)}>{t("topbar.downloadAgain")}</button>
                                    <button className="btn" type="button" onClick={() => removeStoredExport(item.id)}>{t("topbar.removeDownload")}</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="muted">{t("topbar.noDownloadsYet")}</div>
                          )}
                        </div>
                      ) : null}
                    </div>
                    <button className="btn" type="button" style={{ ...topButtonStyle, width: "100%", justifyContent: "center" }} onClick={() => setShowFilters((current) => !current)}>
                      {activeLang === "gr" ? "Φίλτρα" : "Filters"}
                    </button>
                    <button className="btn danger" type="button" style={{ ...topButtonStyle, width: "100%", justifyContent: "center" }} onClick={() => void onDeleteSelected()} disabled={!selectedIds.length}>
                      {t("topbar.delete")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {showFilters ? (
            <GraduatesFilters
              t={(key) => t(key)}
              filters={filters}
              programs={programs}
              directions={directions}
              regions={regions}
              programNameById={programNameById}
              directionNameById={directionNameById}
              availableDirections={availableDirections}
              setFilters={setFilters}
              onSearch={() => void load()}
              onReset={() => {
                setFilters(EMPTY_GRADUATES_FILTERS);
                setSelectedIds([]);
                setTimeout(() => void load(), 0);
              }}
            />
          ) : null}
        </div>
      </div>

      <GraduatesTable
        visibleItems={visibleItems}
        selectedIds={selectedIds}
        allVisibleSelected={allVisibleSelected}
        selectAllRef={selectAllRef}
        tableWrapRef={tableWrapRef}
        floatingScrollbarRef={floatingScrollbarRef}
        floatingScrollbarInnerRef={floatingScrollbarInnerRef}
        headerButtonStyle={headerButtonStyle}
        wideCardStyle={wideCardStyle}
        toggleAllVisible={toggleAllVisible}
        toggleSelected={toggleSelected}
        toggleSort={toggleSort}
        getSortIndicator={getSortIndicator}
        renderGender={renderGender}
        programNameById={programDisplayNameById}
        directionNameById={directionDisplayNameById}
        regionNameById={regionNameById}
        t={t}
        onDelete={onDeleteGraduate}
      />
    </div>
  );
}
