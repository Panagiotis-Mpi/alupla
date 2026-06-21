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
  type ImportReport,
  type QueryParams,
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
  normalizeImportErrorMessage,
} from "./graduates/importFeedback";
import { downloadBlob } from "../lib/download";
import { buildExportFilename } from "../lib/exportFilenames";
import Icon from "../components/Icon";
import arrowDownIcon from "../assets/icons/arrow-down-to-line.svg";
import arrowUpIcon from "../assets/icons/arrow-up-to-line.svg";
import fileSpreadsheetIcon from "../assets/icons/file-spreadsheet.svg";
import listFilterIcon from "../assets/icons/list-filter.svg";
import graduatePersonIcon from "../assets/icons/graduate-person.svg";
import {
  toggleMergedVisibleSelection,
  toggleSelectionValue,
} from "./shared/selection";
import { sortIndicator } from "./shared/sorting";
import type { RecentGraduateRequest } from "./graduates/recentDownloads";
import { ActionDropdown } from "./graduates/ActionDropdown";
import { RecentDownloadsMenu } from "./graduates/RecentDownloadsMenu";
import {
  ImportResultToast,
  type GraduateToastState,
} from "./graduates/ImportResultToast";
import {
  toRecentGraduatePdfItem,
  useRecentGraduateDownloads,
} from "./graduates/useRecentGraduateDownloads";

type MenuName = "import" | "export" | "template" | "recent";

export default function Graduates() {
  const { t, i18n } = useTranslation("graduates");
  const [importBusy, setImportBusy] = useState(false);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [toast, setToast] = useState<GraduateToastState | null>(null);
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
  const [openMenu, setOpenMenu] = useState<MenuName | null>(null);

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
        programNameById,
        regionNameById,
        renderGender,
        activeLang,
      }),
    [
      items,
      sortState,
      searchTerm,
      programNameById,
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
  const {
    recentDownloads,
    rememberDownload,
    downloadStoredExport,
    removeStoredExport,
  } = useRecentGraduateDownloads({
    filters,
    activeLang,
    items,
    programNameById,
    regionNameById,
    exportFailedMessage: t("export.failed"),
  });

  function showToast(nextToast: GraduateToastState) {
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
    () => setOpenMenu(null),
  );

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        !allVisibleSelected && someVisibleSelected;
    }
  }, [allVisibleSelected, someVisibleSelected]);

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
    setOpenMenu(null);
  }

  function toggleMenu(name: MenuName) {
    setOpenMenu((current) => (current === name ? null : name));
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
    const exportParams: QueryParams = { ...params };
    delete exportParams.page;
    delete exportParams.pageSize;
    if (ids?.length) {
      exportParams.ids = ids;
    }
    try {
      const selectedCount = ids?.length ?? 0;
      const scopeParts = selectedCount
        ? ["selected", selectedCount, "records"]
        : Object.keys(exportParams).length
          ? ["filtered", total, "records"]
          : ["all", total, "records"];
      if (format === "pdf") {
        const exportItems = ids?.length
          ? items.filter((item) => ids.includes(Number(item.id)))
          : items;
        const blob = await exportGraduatesPdf({
          items: exportItems,
          lang: activeLang,
          programNameById,
          regionNameById,
        });
        const fileName = buildExportFilename("graduates", scopeParts, "pdf");
        downloadBlob(blob, fileName);
        await rememberDownload({
          blob,
          format,
          fileName,
          ids,
          pdfItems: exportItems.map(toRecentGraduatePdfItem),
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
      const fileName = buildExportFilename("graduates", scopeParts, format);
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
      downloadBlob(blob, buildExportFilename("graduates", ["import", "template"], format, { timestamp: false }));
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

  const openImportFile = () => {
    closeMenus();
    importFileRef.current?.click();
  };

  const importActions = [
    { key: "xlsx", label: t("topbar.importExcel") },
    { key: "csv", label: t("topbar.importCsv") },
  ].map((action) => ({ ...action, icon: arrowUpIcon, onClick: openImportFile }));

  const templateActions = (["xlsx", "csv"] as const).map((format) => ({
    key: format,
    label: t(format === "xlsx" ? "topbar.templateExcel" : "topbar.templateCsv"),
    icon: fileSpreadsheetIcon,
    onClick: () => {
      closeMenus();
      void onDownloadTemplate(format);
    },
  }));

  const exportActions = (["xlsx", "csv", "pdf"] as const).map((format) => ({
    key: format,
    label: t(
      format === "xlsx"
        ? "topbar.exportExcel"
        : format === "csv"
          ? "topbar.exportCsv"
          : "topbar.exportPdf",
    ),
    icon: fileSpreadsheetIcon,
    onClick: () => {
      closeMenus();
      if (!selectedIds.length) {
        alert(t("topbar.noSelection"));
        return;
      }
      void onExport(format, selectedIds);
    },
  }));

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
      <ImportResultToast
        toast={toast}
        report={importReport}
        showDetails={showImportDetails}
        onToggleDetails={() => setShowImportDetails((current) => !current)}
        onClose={() => setToast(null)}
        t={t}
      />

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
                  <Icon src={graduatePersonIcon} size={18} />
                  <span>{t("topbar.newGraduate")}</span>
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
                <ActionDropdown
                  containerRef={templateMenuRef}
                  open={openMenu === "template"}
                  onToggle={() => toggleMenu("template")}
                  buttonIcon={arrowDownIcon}
                  buttonLabel={t("topbar.downloadTemplate")}
                  buttonStyle={topButtonStyle}
                  actions={templateActions}
                />
                <ActionDropdown
                  containerRef={importMenuRef}
                  open={openMenu === "import"}
                  onToggle={() => toggleMenu("import")}
                  buttonIcon={arrowUpIcon}
                  buttonLabel={importBusy ? t("topbar.importing") : t("topbar.import")}
                  buttonStyle={topButtonStyle}
                  actions={importActions}
                  disabled={importBusy}
                />
                <ActionDropdown
                  containerRef={exportMenuRef}
                  open={openMenu === "export"}
                  onToggle={() => toggleMenu("export")}
                  buttonIcon={fileSpreadsheetIcon}
                  buttonLabel={t("topbar.export")}
                  buttonStyle={topButtonStyle}
                  actions={exportActions}
                />
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
                      <Icon src={listFilterIcon} size={18} />
                      <span>{t("topbar.filters")}</span>
                    </button>
                    <RecentDownloadsMenu
                      containerRef={recentDownloadsRef}
                      open={openMenu === "recent"}
                      onToggle={() => toggleMenu("recent")}
                      buttonStyle={topButtonStyle}
                      downloads={recentDownloads}
                      activeLang={activeLang}
                      t={t}
                      onDownload={(item) => void downloadStoredExport(item)}
                      onRemove={removeStoredExport}
                    />
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
              regionNameById={regionNameById}
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
        programNameById={programNameById}
        regionNameById={regionNameById}
        activeLang={activeLang}
        t={t}
        onDelete={onDeleteGraduate}
      />
    </div>
  );
}
