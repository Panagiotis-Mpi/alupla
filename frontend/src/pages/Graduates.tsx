// Κεντρική σελίδα αποφοίτων: λίστα, φίλτρα, επιλογές, import και export.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  deleteGraduate,
  deleteGraduates,
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
import {
  loadGraduatesScreen,
  useMenuDismiss,
  useSyncedScrollbar,
} from "./graduates/hooks";
import {
  buildImportDetail,
  buildImportTitle,
  getImportColumnLabel,
  getImportIssueHint,
  groupImportErrors,
  normalizeImportErrorMessage,
} from "./graduates/importFeedback";
import { downloadBlob } from "../lib/download";
import {
  toggleMergedVisibleSelection,
  toggleSelectionValue,
} from "./shared/selection";
import { sortIndicator } from "./shared/sorting";
import {
  MAX_RECENT_GRADUATE_DOWNLOADS,
  buildRecentDownloadFiltersLabel,
  formatRecentGraduateDownloadDate,
  recentGraduateSessionDownloads,
  safeReadRecentGraduateDownloads,
  writeRecentGraduateDownloads,
  type RecentGraduateDownload,
  type RecentGraduatePdfItem,
  type RecentGraduateRequest,
} from "./graduates/recentDownloads";

export default function Graduates() {
  const { t, i18n } = useTranslation("graduates");
  const [importBusy, setImportBusy] = useState(false);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showImportDetails, setShowImportDetails] = useState(false);
  const [programs, setPrograms] = useState<StudyProgram[]>([]);
  const [regions, setRegions] = useState<Array<Record<string, unknown>>>([]);
  const [items, setItems] = useState<Graduate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sortState, setSortState] = useState<{ key: SortKey; dir: SortDir }>({
    key: "ad_code",
    dir: "asc",
  });
  const [filters, setFilters] = useState<GraduatesFiltersState>(
    EMPTY_GRADUATES_FILTERS,
  );
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [recentDownloadsOpen, setRecentDownloadsOpen] = useState(false);
  const [recentDownloads, setRecentDownloads] = useState<
    RecentGraduateDownload[]
  >([]);

  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const importMenuRef = useRef<HTMLDivElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const templateMenuRef = useRef<HTMLDivElement | null>(null);
  const recentDownloadsRef = useRef<HTMLDivElement | null>(null);
  const floatingScrollbarRef = useRef<HTMLDivElement | null>(null);
  const floatingScrollbarInnerRef = useRef<HTMLDivElement | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const activeLang: "gr" | "en" = (
    i18n.resolvedLanguage ||
    i18n.language ||
    "gr"
  )
    .toLowerCase()
    .startsWith("en")
    ? "en"
    : "gr";
  const params = useMemo(() => buildGraduatesParams(filters), [filters]);
  const programNameById = useMemo(
    () => createNameMap(programs as Array<Record<string, unknown>>, activeLang),
    [programs, activeLang],
  );
  const programDisplayNameById = useMemo(
    () => createNameMap(programs as Array<Record<string, unknown>>, "gr"),
    [programs],
  );
  const regionNameById = useMemo(
    () => createRegionMap(regions, activeLang),
    [regions, activeLang],
  );
  const renderGender = (value: unknown) => renderGenderValue(value, activeLang);

  const visibleItems = useMemo(
    () =>
      filterAndSortGraduates({
        items,
        sortState,
        searchTerm,
        programNameById: programDisplayNameById,
        regionNameById,
        renderGender,
        activeLang,
      }),
    [
      items,
      sortState,
      searchTerm,
      programDisplayNameById,
      regionNameById,
      activeLang,
    ],
  );

  const visibleIds = useMemo(
    () =>
      visibleItems
        .map((graduate) => Number(graduate.id))
        .filter((id) => Number.isFinite(id)),
    [visibleItems],
  );
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIdSet.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIdSet.has(id));
  const groupedImportIssues = useMemo(
    () => groupImportErrors(importReport?.errors),
    [importReport],
  );

  function showToast(nextToast: ToastState) {
    setToast(nextToast);
    setShowImportDetails(false);
  }

  async function load() {
    setLoading(true);
    try {
      const response = await loadGraduatesScreen(params, activeLang);
      setPrograms(response.programs);
      setRegions(response.regions);
      setItems(response.items);
      setTotal(response.total);
      setSelectedIds((current) =>
        current.filter((id) =>
          response.items.some((graduate) => Number(graduate.id) === id),
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [activeLang]);

  useSyncedScrollbar(
    tableWrapRef,
    floatingScrollbarRef,
    floatingScrollbarInnerRef,
    [items, sortState, programs, regions],
  );

  useMenuDismiss(
    [importMenuRef, exportMenuRef, templateMenuRef, recentDownloadsRef],
    () => {
      setImportMenuOpen(false);
      setExportMenuOpen(false);
      setTemplateMenuOpen(false);
      setRecentDownloadsOpen(false);
    },
  );

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        !allVisibleSelected && someVisibleSelected;
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
    const filtersLabel = buildRecentDownloadFiltersLabel(
      filters,
      activeLang,
      args.ids?.length || 0,
      items.length,
    );
    const signature = JSON.stringify({
      format: args.format,
      ids: args.ids || [],
      params: args.request?.params || {},
      count: args.pdfItems?.length || 0,
    });
    const now = new Date().toISOString();
    recentGraduateSessionDownloads.set(signature, {
      blob: args.blob,
      fileName: args.fileName,
    });
    const current = safeReadRecentGraduateDownloads();
    const existing = current.find((item) => item.signature === signature);
    const nextItem: RecentGraduateDownload = existing
      ? {
          ...existing,
          fileName: args.fileName,
          totalItems: items.length,
          selectedItems: args.ids?.length || 0,
          filtersLabel,
          lastDownloadedAt: now,
          count: existing.count + 1,
          request: args.request || existing.request,
          pdfItems: args.pdfItems || existing.pdfItems,
        }
      : {
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
      return (
        new Date(b.lastDownloadedAt).getTime() -
        new Date(a.lastDownloadedAt).getTime()
      );
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
          regionNameById,
        });
        recentGraduateSessionDownloads.set(item.signature, {
          blob,
          fileName: item.fileName,
        });
        downloadBlob(blob, item.fileName);
      } else if (item.request) {
        const blob = await exportGraduatesFile(
          item.request.params,
          item.format,
          item.request.lang,
        );
        recentGraduateSessionDownloads.set(item.signature, {
          blob,
          fileName: item.fileName,
        });
        downloadBlob(blob, item.fileName);
      } else {
        throw new Error(t("export.failed"));
      }

      const current = safeReadRecentGraduateDownloads();
      const next = current
        .map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                count: entry.count + 1,
                lastDownloadedAt: new Date().toISOString(),
              }
            : entry,
        )
        .sort(
          (a, b) =>
            b.count - a.count ||
            new Date(b.lastDownloadedAt).getTime() -
              new Date(a.lastDownloadedAt).getTime(),
        );
      writeRecentGraduateDownloads(next);
      setRecentDownloads(next.slice(0, MAX_RECENT_GRADUATE_DOWNLOADS));
    } catch (error: any) {
      alert(error?.message ?? t("export.failed"));
    }
  }

  function removeStoredExport(itemId: string) {
    const next = safeReadRecentGraduateDownloads().filter(
      (item) => item.id !== itemId,
    );
    writeRecentGraduateDownloads(next);
    setRecentDownloads(next.slice(0, MAX_RECENT_GRADUATE_DOWNLOADS));
  }

  function toggleSort(key: SortKey) {
    setSortState((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  function getSortIndicator(key: SortKey) {
    return sortIndicator(sortState.key, key, sortState.dir);
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
    setSelectedIds((current) =>
      toggleMergedVisibleSelection(current, visibleIds, allVisibleSelected),
    );
  }

  async function onExport(format: "xlsx" | "csv" | "pdf", ids?: number[]) {
    const exportParams = { ...params } as Record<string, unknown>;
    delete exportParams.page;
    delete exportParams.pageSize;
    if (ids?.length) {
      exportParams.ids = ids;
    }
    try {
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-");
      if (format === "pdf") {
        const exportItems = ids?.length
          ? items.filter((item) => ids.includes(Number(item.id)))
          : items;
        const blob = await exportGraduatesPdf({
          items: exportItems,
          lang: activeLang,
          programNameById: programDisplayNameById,
          regionNameById,
        });
        const fileName = `alupla_graduates_export_${timestamp}.pdf`;
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
            origin_region_id: item.origin_region_id ?? null,
            origin_municipality: item.origin_municipality ?? null,
            origin_country: item.origin_country ?? null,
            origin_country_region_id: item.origin_country_region_id ?? null,
            origin_periphery_region_id: item.origin_periphery_region_id ?? null,
            origin_foreign_city: item.origin_foreign_city ?? null,
            origin_country_name_en:
              (item as any).origin_country_name_en ?? null,
            origin_region_name_en: (item as any).origin_region_name_en ?? null,
            origin_city_name_en: (item as any).origin_city_name_en ?? null,
          })),
        });
        await logGraduatesPdfExport(
          ids?.length ? { ...exportParams, ids } : exportParams,
        );
        return;
      }
      const request = {
        params: { ...exportParams },
        ids,
        lang: activeLang,
      } satisfies RecentGraduateRequest;
      const blob = await exportGraduatesFile(exportParams, format, activeLang);
      const fileName = `alupla_graduates_export_${timestamp}.${format}`;
      downloadBlob(blob, fileName);
      await rememberDownload({ blob, format, fileName, ids, request });
    } catch (error: any) {
      alert(error?.message ?? t("export.failed"));
    }
  }

  async function onDownloadTemplate(format: "xlsx" | "csv") {
    try {
      const blob = await downloadGraduatesImportTemplate(
        format,
        i18n.resolvedLanguage || i18n.language,
      );
      downloadBlob(blob, `alupla_graduates_import_template.${format}`);
    } catch (error: any) {
      alert(error?.message ?? t("export.failed"));
    }
  }

  async function onImportFile(file: File) {
    setImportReport(null);
    setImportBusy(true);
    try {
      const report = await importGraduatesFile(
        file,
        i18n.resolvedLanguage || i18n.language,
      );
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
      const reason = normalizeImportErrorMessage(
        error?.message ?? t("toast.somethingWentWrong"),
        t,
      );
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
      await deleteGraduates(selectedIds);
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
    {
      key: "xlsx",
      label: t("topbar.importExcel"),
      onClick: () => {
        closeMenus();
        importFileRef.current?.click();
      },
    },
    {
      key: "csv",
      label: t("topbar.importCsv"),
      onClick: () => {
        closeMenus();
        importFileRef.current?.click();
      },
    },
  ];

  const templateActions = [
    {
      key: "xlsx",
      label: t("topbar.templateExcel"),
      onClick: () => {
        closeMenus();
        void onDownloadTemplate("xlsx");
      },
    },
    {
      key: "csv",
      label: t("topbar.templateCsv"),
      onClick: () => {
        closeMenus();
        void onDownloadTemplate("csv");
      },
    },
  ];

  const exportSelectionMessage = t("topbar.noSelection");

  const exportActions = [
    {
      key: "xlsx",
      label: t("topbar.exportExcel"),
      onClick: () => {
        closeMenus();
        if (!selectedIds.length) {
          alert(exportSelectionMessage);
          return;
        }
        void onExport("xlsx", selectedIds);
      },
    },
    {
      key: "csv",
      label: t("topbar.exportCsv"),
      onClick: () => {
        closeMenus();
        if (!selectedIds.length) {
          alert(exportSelectionMessage);
          return;
        }
        void onExport("csv", selectedIds);
      },
    },
    {
      key: "pdf",
      label: t("topbar.exportPdf"),
      onClick: () => {
        closeMenus();
        if (!selectedIds.length) {
          alert(exportSelectionMessage);
          return;
        }
        void onExport("pdf", selectedIds);
      },
    },
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
    fontWeight: 500,
    color: "inherit",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    lineHeight: 1.25,
  };

  const topButtonStyle: React.CSSProperties = {
    minWidth: 136,
    minHeight: 48,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    padding: "0 18px",
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 1.25,
  };

  return (
    <div className="grid" style={{ gap: 14 }}>
      {toast ? (
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 9999,
            width: 360,
            maxWidth: "calc(100vw - 32px)",
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.12)",
            borderLeft: `6px solid ${toast.type === "success" ? "#16a34a" : "#dc2626"}`,
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            padding: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>{toast.title}</div>
              {toast.detail ? (
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                  {toast.detail}
                </div>
              ) : null}
            </div>
            <button
              className="btn"
              type="button"
              onClick={() => setToast(null)}
              style={{ padding: "6px 10px" }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          {importReport?.summary ? (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="btn"
                  type="button"
                  onClick={() => setShowImportDetails((current) => !current)}
                >
                  {showImportDetails ? t("toast.less") : t("toast.more")}
                </button>
              </div>
              {showImportDetails ? (
                <div
                  style={{
                    maxHeight: 260,
                    overflowY: "auto",
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: 10,
                    padding: 10,
                    background: "rgba(248,250,252,.9)",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                    <div>
                      {t("toast.detailsInserted", {
                        inserted: Number(importReport.summary.inserted ?? 0),
                      })}
                    </div>
                    <div>
                      {t("toast.detailsUpdated", {
                        updated: Number(importReport.summary.updated ?? 0),
                      })}
                    </div>
                    <div>
                      {t("toast.detailsSkipped", {
                        skipped: Number(importReport.summary.skipped ?? 0),
                      })}
                    </div>
                    {groupedImportIssues.length > 0 ? (
                      <div style={{ marginTop: 2, opacity: 0.9 }}>
                        {t("toast.detailsIssues", {
                          count: groupedImportIssues.length,
                        })}
                      </div>
                    ) : (
                      <div style={{ marginTop: 2, opacity: 0.9 }}>
                        {t("toast.detailsNoIssues")}
                      </div>
                    )}
                  </div>
                  {groupedImportIssues.length > 0 ? (
                    <div
                      style={{
                        borderTop: "1px solid rgba(0,0,0,0.06)",
                        paddingTop: 10,
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      {groupedImportIssues.map((issue, index) => {
                        const label = getImportColumnLabel(issue.column, t);
                        const hint = getImportIssueHint(
                          issue.column,
                          issue.reasons,
                          t,
                        );
                        const rowsPreview = issue.rows.slice(0, 8).join(", ");
                        const hasMoreRows = issue.rows.length > 8;
                        return (
                          <div
                            key={issue.key}
                            style={{
                              borderBottom:
                                index === groupedImportIssues.length - 1
                                  ? "none"
                                  : "1px solid rgba(0,0,0,0.06)",
                              paddingBottom: 8,
                            }}
                          >
                            <div style={{ fontWeight: 600 }}>
                              {t("toast.issueFieldTitle", {
                                field: label,
                                count: issue.rows.length,
                              })}
                            </div>
                            <div style={{ fontSize: 13, marginTop: 4 }}>
                              {hint}
                            </div>
                            {issue.rows.length ? (
                              <div
                                style={{
                                  fontSize: 12,
                                  opacity: 0.84,
                                  marginTop: 6,
                                }}
                              >
                                {t("toast.issueRows", {
                                  rows: hasMoreRows
                                    ? `${rowsPreview}…`
                                    : rowsPreview,
                                })}
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

      <div className="card graduates-top-card" style={{ padding: 14 }}>
        <div style={{ display: "grid", gap: 14 }}>
          <div
            className="graduates-top-layout"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div
              className="graduates-title-line"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <h2 style={{ margin: 0 }}>{t("pageTitle")}</h2>
              <span className="badge">
                {loading ? t("topbar.loading") : t("topbar.total", { total })}
              </span>
              <span className="badge">
                {t("topbar.selected", { count: selectedIds.length })}
              </span>
            </div>

            <div style={{ display: "grid", gap: 10, width: "100%" }}>
              <div
                className="graduates-actions-grid graduates-actions-grid-main"
                style={{ gap: 10, width: "100%", alignItems: "stretch" }}
              >
                <Link
                  className="btn primary"
                  to="/graduates/new"
                  style={{
                    ...topButtonStyle,
                    textDecoration: "none",
                    width: "100%",
                    justifyContent: "center",
                  }}
                >
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
                    className="btn dropdown-like"
                    type="button"
                    style={{
                      ...topButtonStyle,
                      width: "100%",
                      justifyContent: "center",
                    }}
                    onClick={() => toggleMenu("import")}
                    disabled={importBusy}
                  >
                    {importBusy ? t("topbar.importing") : t("topbar.import")}
                    <span className="btn-dropdown-chevron" aria-hidden="true" />
                  </button>
                  {importMenuOpen ? (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        left: 0,
                        minWidth: 170,
                        width: "max-content",
                        maxWidth: "calc(100vw - 32px)",
                        background: "#fff",
                        border: "1px solid rgba(15,23,42,.12)",
                        borderRadius: 12,
                        boxShadow: "0 12px 30px rgba(15,23,42,.12)",
                        padding: 8,
                        display: "grid",
                        gap: 8,
                        zIndex: 30,
                      }}
                    >
                      {importActions.map((action) => (
                        <button
                          key={action.key}
                          className="btn"
                          type="button"
                          onClick={action.onClick}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div ref={templateMenuRef} style={{ position: "relative" }}>
                  <button
                    className="btn dropdown-like"
                    type="button"
                    style={{
                      ...topButtonStyle,
                      width: "100%",
                      justifyContent: "center",
                    }}
                    onClick={() => toggleMenu("template")}
                  >
                    {t("topbar.downloadTemplate")}
                    <span className="btn-dropdown-chevron" aria-hidden="true" />
                  </button>
                  {templateMenuOpen ? (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        left: 0,
                        minWidth: 170,
                        width: "max-content",
                        maxWidth: "calc(100vw - 32px)",
                        background: "#fff",
                        border: "1px solid rgba(15,23,42,.12)",
                        borderRadius: 12,
                        boxShadow: "0 12px 30px rgba(15,23,42,.12)",
                        padding: 8,
                        display: "grid",
                        gap: 8,
                        zIndex: 30,
                      }}
                    >
                      {templateActions.map((action) => (
                        <button
                          key={action.key}
                          className="btn"
                          type="button"
                          onClick={action.onClick}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  className="btn"
                  type="button"
                  style={{
                    ...topButtonStyle,
                    width: "100%",
                    justifyContent: "center",
                  }}
                  onClick={() => setShowFilters((current) => !current)}
                >
                  {t("topbar.filters")}
                </button>
                <div
                  className="graduates-actions-secondary"
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    justifyContent: "center",
                    width: "100%",
                  }}
                >
                  <div
                    className="graduates-actions-grid"
                    style={{ gap: 10, width: "100%", alignItems: "stretch" }}
                  >
                    <div ref={exportMenuRef} style={{ position: "relative" }}>
                      <button
                        className="btn dropdown-like"
                        type="button"
                        style={{
                          ...topButtonStyle,
                          width: "100%",
                          justifyContent: "center",
                        }}
                        onClick={() => toggleMenu("export")}
                      >
                        {t("topbar.export")}
                        <span
                          className="btn-dropdown-chevron"
                          aria-hidden="true"
                        />
                      </button>
                      {exportMenuOpen ? (
                        <div
                          style={{
                            position: "absolute",
                            top: "calc(100% + 8px)",
                            left: 0,
                            minWidth: 170,
                            width: "max-content",
                            maxWidth: "calc(100vw - 32px)",
                            background: "#fff",
                            border: "1px solid rgba(15,23,42,.12)",
                            borderRadius: 12,
                            boxShadow: "0 12px 30px rgba(15,23,42,.12)",
                            padding: 8,
                            display: "grid",
                            gap: 8,
                            zIndex: 30,
                          }}
                        >
                          {exportActions.map((action) => (
                            <button
                              key={action.key}
                              className="btn"
                              type="button"
                              onClick={action.onClick}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div
                      ref={recentDownloadsRef}
                      style={{ position: "relative" }}
                    >
                      <button
                        className="btn dropdown-like"
                        type="button"
                        style={{
                          ...topButtonStyle,
                          width: "100%",
                          justifyContent: "center",
                        }}
                        onClick={() => toggleMenu("recent")}
                      >
                        {t("topbar.myFrequentDownloads")}
                        <span
                          className="btn-dropdown-chevron"
                          aria-hidden="true"
                        />
                      </button>
                      {recentDownloadsOpen ? (
                        <div
                          style={{
                            position: "absolute",
                            top: "calc(100% + 8px)",
                            left: 0,
                            width: 380,
                            maxWidth: "calc(100vw - 32px)",
                            background: "#fff",
                            border: "1px solid rgba(15,23,42,.12)",
                            borderRadius: 12,
                            boxShadow: "0 12px 30px rgba(15,23,42,.12)",
                            padding: 10,
                            display: "grid",
                            gap: 10,
                            zIndex: 30,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <div style={{ fontWeight: 700 }}>
                              {t("topbar.myFrequentDownloads")}
                            </div>
                            {recentDownloads.length ? (
                              <span className="badge">
                                {recentDownloads.length}
                              </span>
                            ) : null}
                          </div>
                          {recentDownloads.length ? (
                            <div
                              style={{
                                display: "grid",
                                gap: 8,
                                maxHeight: 420,
                                overflowY: "auto",
                              }}
                            >
                              {recentDownloads.map((item) => (
                                <div
                                  key={item.id}
                                  style={{
                                    border: "1px solid rgba(15,23,42,.08)",
                                    borderRadius: 12,
                                    padding: 10,
                                    display: "grid",
                                    gap: 6,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      gap: 10,
                                      alignItems: "center",
                                    }}
                                  >
                                    <div style={{ fontWeight: 700 }}>
                                      {item.format.toUpperCase()}
                                    </div>
                                    <span className="badge">
                                      {t("topbar.downloadCount", {
                                        count: item.count,
                                      })}
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 13,
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {item.fileName}
                                  </div>
                                  <div
                                    className="muted"
                                    style={{ fontSize: 12 }}
                                  >
                                    {item.filtersLabel}
                                  </div>
                                  <div
                                    className="muted"
                                    style={{ fontSize: 12 }}
                                  >
                                    {t("topbar.lastDownload", {
                                      date: formatRecentGraduateDownloadDate(
                                        item.lastDownloadedAt,
                                        activeLang,
                                      ),
                                    })}
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 8,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <button
                                      className="btn"
                                      type="button"
                                      onClick={() => downloadStoredExport(item)}
                                    >
                                      {t("topbar.downloadAgain")}
                                    </button>
                                    <button
                                      className="btn"
                                      type="button"
                                      onClick={() =>
                                        removeStoredExport(item.id)
                                      }
                                    >
                                      {t("topbar.removeDownload")}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="muted">
                              {t("topbar.noDownloadsYet")}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                    <button
                      className="btn"
                      type="button"
                      style={{
                        ...topButtonStyle,
                        width: "100%",
                        justifyContent: "center",
                      }}
                      onClick={() => void onDeleteSelected()}
                      disabled={!selectedIds.length}
                    >
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
              regions={regions}
              programNameById={programNameById}
              setFilters={setFilters}
              onSearch={() => void load()}
              onReset={() => {
                setFilters(EMPTY_GRADUATES_FILTERS);
                setSelectedIds([]);
                setTimeout(() => void load(), 0);
              }}
            />
          ) : null}
          <input
            className="input graduates-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("topbar.searchPlaceholder")}
          />
        </div>
      </div>

      <GraduatesTable
        visibleItems={visibleItems}
        loading={loading}
        selectedIds={selectedIds}
        selectedIdSet={selectedIdSet}
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
        regionNameById={regionNameById}
        activeLang={activeLang}
        t={t}
        onDelete={onDeleteGraduate}
      />
    </div>
  );
}
