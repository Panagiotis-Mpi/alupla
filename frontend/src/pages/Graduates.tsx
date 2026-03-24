import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  deleteGraduate,
  downloadGraduatesImportTemplateXlsx,
  exportGraduatesXlsx,
  importGraduatesXlsx,
  listGraduates,
  listProgramDirections,
  listRegions,
  listStudyPrograms,
  type Graduate,
  type StudyProgram,
} from "../lib/api";
import { GraduatesTable } from "./graduates/GraduatesTable";
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
  action?: "download_errors";
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function downloadErrorsCsv(errors: Array<Record<string, unknown>>) {
  const headers = ["row", "column", "message", "value"];
  const escapeCsv = (value: unknown) => {
    const text = String(value ?? "");
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };
  const lines = [headers.join(","), ...(errors ?? []).map((error) => headers.map((header) => escapeCsv(error?.[header])).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  downloadBlob(blob, `import-errors-${timestamp}.csv`);
}

export default function Graduates() {
  const { t, i18n } = useTranslation("graduates");
  const [importBusy, setImportBusy] = useState(false);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
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

  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const floatingScrollbarRef = useRef<HTMLDivElement | null>(null);
  const floatingScrollbarInnerRef = useRef<HTMLDivElement | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const activeLang: "gr" | "en" = (i18n.resolvedLanguage || i18n.language || "gr").toLowerCase().startsWith("en") ? "en" : "gr";
  const params = useMemo(() => buildGraduatesParams(filters), [filters]);
  const programNameById = useMemo(() => createNameMap(programs as Array<Record<string, unknown>>, activeLang), [programs, activeLang]);
  const directionNameById = useMemo(() => createNameMap(directions, activeLang), [directions, activeLang]);
  const regionNameById = useMemo(() => createRegionMap(regions), [regions]);
  const availableDirections = useMemo(() => {
    if (!filters.study_program_id) {
      return directions;
    }
    return directions.filter((item) => Number(item?.study_program_id) === Number(filters.study_program_id));
  }, [directions, filters.study_program_id]);
  const renderGender = (value: unknown) => renderGenderValue(value, (key) => t(key));

  const visibleItems = useMemo(() => filterAndSortGraduates({
    items,
    sortState,
    searchTerm,
    programNameById,
    directionNameById,
    regionNameById,
    renderGender,
  }), [items, sortState, searchTerm, programNameById, directionNameById, regionNameById]);

  const visibleIds = useMemo(() => visibleItems.map((graduate) => Number(graduate.id)).filter((id) => Number.isFinite(id)), [visibleItems]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.includes(id));

  function showToast(nextToast: ToastState) {
    setToast(nextToast);
    window.setTimeout(() => {
      setToast((current) => (current === nextToast ? null : current));
    }, 6000);
  }

  async function load() {
    setLoading(true);
    try {
      const [studyProgramsResponse, regionsResponse, graduatesResponse] = await Promise.all([
        listStudyPrograms(),
        listRegions({ type: "PERIPHERY" }),
        listGraduates(params),
      ]);

      setPrograms(studyProgramsResponse.items ?? []);
      setRegions(regionsResponse.items ?? []);
      setItems(graduatesResponse.items ?? []);
      setTotal(graduatesResponse.total ?? 0);

      const directionsResults = await Promise.all(
        (studyProgramsResponse.items ?? []).map(async (program: any) => {
          try {
            return await listProgramDirections(Number(program?.id));
          } catch {
            return { items: [] as any[] };
          }
        })
      );

      const mergedDirections = directionsResults.flatMap((result: any) => result?.items ?? []);
      setDirections(mergedDirections);
      setSelectedIds((current) => current.filter((id) => (graduatesResponse.items ?? []).some((graduate: any) => Number(graduate.id) === id)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const wrap = tableWrapRef.current;
    const bar = floatingScrollbarRef.current;
    const inner = floatingScrollbarInnerRef.current;
    if (!wrap || !bar || !inner) {
      return;
    }

    let syncing = false;

    const update = () => {
      inner.style.width = `${wrap.scrollWidth}px`;
      bar.style.display = wrap.scrollWidth > wrap.clientWidth ? "block" : "none";
      bar.scrollLeft = wrap.scrollLeft;
    };

    const onWrapScroll = () => {
      if (syncing) {
        return;
      }
      syncing = true;
      bar.scrollLeft = wrap.scrollLeft;
      syncing = false;
    };

    const onBarScroll = () => {
      if (syncing) {
        return;
      }
      syncing = true;
      wrap.scrollLeft = bar.scrollLeft;
      syncing = false;
    };

    update();
    wrap.addEventListener("scroll", onWrapScroll);
    bar.addEventListener("scroll", onBarScroll);
    window.addEventListener("resize", update);

    return () => {
      wrap.removeEventListener("scroll", onWrapScroll);
      bar.removeEventListener("scroll", onBarScroll);
      window.removeEventListener("resize", update);
    };
  }, [items, sortState, programs, directions, regions]);

  useEffect(() => {
    if (filters.program_direction_id && !availableDirections.some((item) => Number(item.id) === Number(filters.program_direction_id))) {
      setFilters((current) => ({ ...current, program_direction_id: "" }));
    }
  }, [availableDirections, filters.program_direction_id]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = !allVisibleSelected && someVisibleSelected;
    }
  }, [allVisibleSelected, someVisibleSelected]);

  function toggleSort(key: SortKey) {
    setSortState((current) => (current.key === key ? { key, dir: current.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  function getSortIndicator(key: SortKey) {
    if (sortState.key !== key) {
      return "";
    }
    return sortState.dir === "asc" ? " ↑" : " ↓";
  }

  function toggleSelected(id: number) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  }

  function toggleAllVisible() {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }
      return Array.from(new Set([...current, ...visibleIds]));
    });
  }

  async function onExportXlsx(ids?: number[]) {
    const exportParams = { ...params } as Record<string, unknown>;
    delete exportParams.page;
    delete exportParams.pageSize;
    if (ids?.length) {
      exportParams.ids = ids;
    }
    try {
      const blob = await exportGraduatesXlsx(exportParams, i18n.resolvedLanguage || i18n.language);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      downloadBlob(blob, `graduates-${timestamp}.xlsx`);
    } catch (error: any) {
      alert(error?.message ?? t("export.failed"));
    }
  }

  async function onDownloadTemplate() {
    try {
      const blob = await downloadGraduatesImportTemplateXlsx(i18n.resolvedLanguage || i18n.language);
      downloadBlob(blob, "graduates-import-template.xlsx");
    } catch (error: any) {
      alert(error?.message ?? t("export.failed"));
    }
  }

  async function onImportXlsx(file: File) {
    setImportReport(null);
    setImportBusy(true);
    try {
      const report = await importGraduatesXlsx(file, i18n.resolvedLanguage || i18n.language);
      setImportReport(report);
      const inserted = Number(report?.summary?.inserted ?? 0);
      const updated = Number(report?.summary?.updated ?? 0);
      const skipped = Number(report?.summary?.skipped ?? 0);
      const errors = Array.isArray(report?.errors) ? report.errors : [];
      if (errors.length > 0) {
        showToast({
          type: "error",
          title: t("toast.importWithErrors", { count: errors.length }),
          detail: `inserted: ${inserted}, updated: ${updated}, skipped: ${skipped}`,
          action: "download_errors",
        });
      } else {
        showToast({
          type: "success",
          title: t("toast.importCompleted"),
          detail: `inserted: ${inserted}, updated: ${updated}, skipped: ${skipped}`,
        });
      }
      await load();
    } catch (error: any) {
      showToast({
        type: "error",
        title: t("toast.importFailed"),
        detail: error?.message ?? t("toast.somethingWentWrong"),
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
          {toast.action === "download_errors" && Array.isArray(importReport?.errors) ? (
            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
              <button className="btn" type="button" onClick={() => downloadErrorsCsv(importReport.errors as Array<Record<string, unknown>>)}>
                {t("toast.downloadErrors")}
              </button>
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", width: "100%" }}>
                <Link className="btn primary" to="/graduates/new" style={topButtonStyle}>
                  {t("topbar.newGraduate")}
                </Link>
                <input
                  id="import-xlsx"
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void onImportXlsx(file);
                    }
                    e.currentTarget.value = "";
                  }}
                />
                <button className="btn" type="button" style={topButtonStyle} onClick={() => (document.getElementById("import-xlsx") as HTMLInputElement | null)?.click()} disabled={importBusy}>
                  {importBusy ? t("topbar.importing") : t("topbar.importExcel")}
                </button>
                <button className="btn" type="button" style={topButtonStyle} onClick={() => void onDownloadTemplate()}>
                  {t("topbar.downloadTemplate")}
                </button>
                <button className="btn" type="button" style={topButtonStyle} onClick={() => void onExportXlsx(selectedIds.length ? selectedIds : undefined)}>
                  {t("topbar.exportExcel")}
                </button>
                <button className="btn" type="button" style={topButtonStyle} onClick={() => setShowFilters((current) => !current)}>
                  {activeLang === "gr" ? "Φίλτρα" : "Filters"}
                </button>
                <button className="btn danger" type="button" style={topButtonStyle} onClick={() => void onDeleteSelected()} disabled={!selectedIds.length}>
                  {t("topbar.delete")}
                </button>
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
        programNameById={programNameById}
        directionNameById={directionNameById}
        regionNameById={regionNameById}
        t={t}
        onDelete={onDeleteGraduate}
      />
    </div>
  );
}
