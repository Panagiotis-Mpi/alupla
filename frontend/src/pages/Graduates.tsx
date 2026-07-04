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
import { GraduatesTable, graduateSortColumns } from "./graduates/GraduatesTable";
import { exportGraduatesPdf } from "./graduates/pdfExport";
import {
  buildGraduatesParams,
  createNameMap,
  createRegionMap,
  EMPTY_GRADUATES_FILTERS,
  filterAndSortGraduates,
  formatDateValue,
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
import xIcon from "../assets/icons/x.svg";
import {
  toggleMergedVisibleSelection,
  toggleSelectionValue,
} from "./shared/selection";
import { sortIndicator } from "./shared/sorting";
import type { RecentGraduateRequest } from "./graduates/recentDownloads";
import { RecentDownloadsMenu } from "./graduates/RecentDownloadsMenu";
import {
  ImportResultToast,
  type GraduateToastState,
} from "./graduates/ImportResultToast";
import {
  toRecentGraduatePdfItem,
  useRecentGraduateDownloads,
} from "./graduates/useRecentGraduateDownloads";
import { GraduateDataActionsMenu } from "./graduates/GraduateDataActionsMenu";

type MenuName = "data" | "recent";
type FilterChip = { id: string; label: string; onRemove: () => void };

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
  const [filters, setFilters] = useState<GraduatesFiltersState>(EMPTY_GRADUATES_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<GraduatesFiltersState>(EMPTY_GRADUATES_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [openMenu, setOpenMenu] = useState<MenuName | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const dataMenuRef = useRef<HTMLDivElement | null>(null);
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
  const params = useMemo(() => buildGraduatesParams(appliedFilters), [appliedFilters]);
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

  const resultCount = visibleItems.length;
  const pageCount = Math.max(1, Math.ceil(resultCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const firstResult = resultCount ? (safeCurrentPage - 1) * pageSize + 1 : 0;
  const lastResult = Math.min(safeCurrentPage * pageSize, resultCount);
  const pagedVisibleItems = useMemo(
    () => visibleItems.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize),
    [visibleItems, safeCurrentPage, pageSize],
  );
  const visibleIds = useMemo(
    () =>
      pagedVisibleItems
        .map((graduate) => Number(graduate.id))
        .filter((id) => Number.isFinite(id)),
    [pagedVisibleItems],
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
    filters: appliedFilters,
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

  async function load(nextFilters: GraduatesFiltersState = appliedFilters) {
    setLoading(true);
    try {
      const response = await loadGraduatesScreen(buildGraduatesParams(nextFilters), activeLang);
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
    void load(appliedFilters);
  }, [activeLang]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortState.key, sortState.dir, pageSize, appliedFilters]);

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  useSyncedScrollbar(
    tableWrapRef,
    floatingScrollbarRef,
    floatingScrollbarInnerRef,
    [pagedVisibleItems, sortState, programs, regions],
  );

  useMenuDismiss(
    [dataMenuRef, recentDownloadsRef],
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
      downloadBlob(
        blob,
        buildExportFilename("graduates", ["import", "template"], format, { timestamp: false }),
      );
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

  function applyFilters() {
    setAppliedFilters(filters);
    setSelectedIds([]);
    setCurrentPage(1);
    void load(filters);
  }

  function resetFilters() {
    setFilters(EMPTY_GRADUATES_FILTERS);
    setAppliedFilters(EMPTY_GRADUATES_FILTERS);
    setSelectedIds([]);
    setCurrentPage(1);
    void load(EMPTY_GRADUATES_FILTERS);
  }

  function clearAppliedFilter(keys: Array<keyof GraduatesFiltersState>) {
    const nextApplied = { ...appliedFilters };
    keys.forEach((key) => {
      nextApplied[key] = "";
    });
    setAppliedFilters(nextApplied);
    setFilters((current) => {
      const next = { ...current };
      keys.forEach((key) => {
        next[key] = "";
      });
      return next;
    });
    setSelectedIds([]);
    setCurrentPage(1);
    void load(nextApplied);
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
    icon: arrowDownIcon,
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
    disabled: !selectedIds.length,
    onClick: () => {
      closeMenus();
      if (selectedIds.length) {
        void onExport(format, selectedIds);
      }
    },
  }));

  const dataActionGroups = [
    {
      key: "import",
      label: t("topbar.import"),
      actions: importActions.map((action) => ({ ...action, disabled: importBusy })),
      hint: importBusy ? t("topbar.importing") : undefined,
    },
    {
      key: "template",
      label: t("topbar.downloadTemplate"),
      actions: templateActions,
    },
    {
      key: "export",
      label: t("bulk.exportSelected"),
      actions: exportActions,
      hint: selectedIds.length ? undefined : t("topbar.noSelection"),
    },
  ];

  const activeFilterChips: FilterChip[] = [];
  const addChip = (id: string, label: string, keys: Array<keyof GraduatesFiltersState>) => {
    if (label.trim()) {
      activeFilterChips.push({ id, label, onRemove: () => clearAppliedFilter(keys) });
    }
  };
  const rangeText = (from: string, to: string, isDate = false) => {
    const fromValue = isDate ? formatDateValue(from) : from;
    const toValue = isDate ? formatDateValue(to) : to;
    if (fromValue && toValue) return `${fromValue} – ${toValue}`;
    if (fromValue) return `${t("filters.from")}: ${fromValue}`;
    if (toValue) return `${t("filters.to")}: ${toValue}`;
    return "";
  };

  addChip("ad", appliedFilters.ad_code_like ? `${t("table.ad")}: ${appliedFilters.ad_code_like}` : "", ["ad_code_like"]);
  addChip("am", appliedFilters.student_number_like ? `${t("table.am")}: ${appliedFilters.student_number_like}` : "", ["student_number_like"]);
  addChip("last-name", appliedFilters.last_name_like ? `${t("table.lastName")}: ${appliedFilters.last_name_like}` : "", ["last_name_like"]);
  addChip("first-name", appliedFilters.first_name_like ? `${t("table.firstName")}: ${appliedFilters.first_name_like}` : "", ["first_name_like"]);
  addChip("father-name", appliedFilters.father_name_like ? `${t("table.fatherName")}: ${appliedFilters.father_name_like}` : "", ["father_name_like"]);
  addChip("gender", appliedFilters.gender ? `${t("table.gender")}: ${appliedFilters.gender === "M" ? t("filters.male") : t("filters.female")}` : "", ["gender"]);
  addChip("entry-year", rangeText(appliedFilters.entry_year_min, appliedFilters.entry_year_max) ? `${t("table.entryYear")}: ${rangeText(appliedFilters.entry_year_min, appliedFilters.entry_year_max)}` : "", ["entry_year_min", "entry_year_max"]);
  addChip("birth-date", rangeText(appliedFilters.birth_date_from, appliedFilters.birth_date_to, true) ? `${t("table.birthDate")}: ${rangeText(appliedFilters.birth_date_from, appliedFilters.birth_date_to, true)}` : "", ["birth_date_from", "birth_date_to"]);
  addChip("grade", rangeText(appliedFilters.degree_grade_min, appliedFilters.degree_grade_max) ? `${t("table.degreeGrade")}: ${rangeText(appliedFilters.degree_grade_min, appliedFilters.degree_grade_max)}` : "", ["degree_grade_min", "degree_grade_max"]);
  addChip("graduation-date", rangeText(appliedFilters.graduation_date_from, appliedFilters.graduation_date_to, true) ? `${t("table.graduationDate")}: ${rangeText(appliedFilters.graduation_date_from, appliedFilters.graduation_date_to, true)}` : "", ["graduation_date_from", "graduation_date_to"]);
  addChip("oath-date", rangeText(appliedFilters.oath_date_from, appliedFilters.oath_date_to, true) ? `${t("table.oathDate")}: ${rangeText(appliedFilters.oath_date_from, appliedFilters.oath_date_to, true)}` : "", ["oath_date_from", "oath_date_to"]);
  addChip("program", appliedFilters.study_program_id ? `${t("table.studyProgram")}: ${programNameById.get(Number(appliedFilters.study_program_id)) ?? appliedFilters.study_program_id}` : "", ["study_program_id"]);
  addChip("region", appliedFilters.origin_region_id ? `${t("table.region")}: ${regionNameById.get(Number(appliedFilters.origin_region_id)) ?? appliedFilters.origin_region_id}` : "", ["origin_region_id"]);
  addChip("nomos", appliedFilters.origin_nomos_region_id ? `${t("table.nomos")}: ${regionNameById.get(Number(appliedFilters.origin_nomos_region_id)) ?? appliedFilters.origin_nomos_region_id}` : "", ["origin_nomos_region_id"]);
  addChip("city", appliedFilters.origin_municipality_like ? `${t("table.originMunicipality")}: ${appliedFilters.origin_municipality_like}` : "", ["origin_municipality_like"]);
  addChip("country", appliedFilters.origin_country_like ? `${t("table.country")}: ${appliedFilters.origin_country_like}` : "", ["origin_country_like"]);
  addChip("foreign-city", appliedFilters.origin_foreign_city_like ? `${t("filters.foreignCity")}: ${appliedFilters.origin_foreign_city_like}` : "", ["origin_foreign_city_like"]);
  if (searchTerm.trim()) {
    activeFilterChips.unshift({
      id: "search",
      label: `${t("toolbar.search")}: ${searchTerm.trim()}`,
      onRemove: () => setSearchTerm(""),
    });
  }

  const filterCount = activeFilterChips.filter((chip) => chip.id !== "search").length;
  const emptyMessage = activeFilterChips.length ? t("table.emptyFiltered") : t("table.empty");
  const toolbarButtonStyle: React.CSSProperties = {
    minHeight: 44,
    padding: "0 14px",
    fontSize: 14,
    fontWeight: 700,
  };

  return (
    <div className="graduates-page">
      <ImportResultToast
        toast={toast}
        report={importReport}
        showDetails={showImportDetails}
        onToggleDetails={() => setShowImportDetails((current) => !current)}
        onClose={() => setToast(null)}
        t={t}
      />

      <input
        ref={importFileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void onImportFile(file);
          }
          event.currentTarget.value = "";
        }}
      />

      <header className="card graduates-page-header">
        <div className="graduates-page-heading">
          <div className="graduates-page-title-row">
            <h1>{t("pageTitle")}</h1>
            <span className="badge">
              {loading ? t("topbar.loading") : t("topbar.total", { total })}
            </span>
          </div>
          <p>{t("pageSubtitle")}</p>
        </div>
        <div className="graduates-page-actions">
          <Link className="btn primary graduates-primary-action" to="/graduates/new">
            <Icon src={graduatePersonIcon} size={18} />
            <span>{t("topbar.newGraduate")}</span>
          </Link>
          <GraduateDataActionsMenu
            containerRef={dataMenuRef}
            open={openMenu === "data"}
            onToggle={() => toggleMenu("data")}
            buttonLabel={t("topbar.dataActions")}
            groups={dataActionGroups}
          />
        </div>
      </header>

      <section className="card graduates-toolbar">
        <div className="graduates-toolbar-main">
          <label className="graduates-search-field">
            <span className="sr-only">{t("toolbar.search")}</span>
            <input
              className="input"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t("topbar.searchPlaceholder")}
            />
          </label>
          <button
            className={`btn graduates-toolbar-button${showFilters ? " is-active" : ""}`}
            type="button"
            onClick={() => setShowFilters((current) => !current)}
            aria-expanded={showFilters}
          >
            <Icon src={listFilterIcon} size={18} />
            <span>{t("topbar.filters")}</span>
            {filterCount ? <span className="graduates-filter-count">{filterCount}</span> : null}
          </button>
          <label className="graduates-sort-field">
            <span>{t("toolbar.sortBy")}</span>
            <select
              className="input"
              value={sortState.key}
              onChange={(event) => setSortState((current) => ({ ...current, key: event.target.value as SortKey }))}
            >
              {graduateSortColumns.map((column) => (
                <option key={column.sortKey} value={column.sortKey}>{t(column.labelKey)}</option>
              ))}
            </select>
          </label>
          <label className="graduates-sort-direction">
            <span className="sr-only">{t("toolbar.sortDirection")}</span>
            <select
              className="input"
              value={sortState.dir}
              onChange={(event) => setSortState((current) => ({ ...current, dir: event.target.value as SortDir }))}
            >
              <option value="asc">{t("toolbar.ascending")}</option>
              <option value="desc">{t("toolbar.descending")}</option>
            </select>
          </label>
          <RecentDownloadsMenu
            containerRef={recentDownloadsRef}
            open={openMenu === "recent"}
            onToggle={() => toggleMenu("recent")}
            buttonStyle={toolbarButtonStyle}
            downloads={recentDownloads}
            activeLang={activeLang}
            t={t}
            onDownload={(item) => void downloadStoredExport(item)}
            onRemove={removeStoredExport}
          />
        </div>
        <div className="graduates-results-count">
          {t("toolbar.resultsCount", { count: resultCount })}
        </div>
      </section>

      {showFilters ? (
        <section className="card graduates-filter-panel">
          <div className="graduates-filter-panel-head">
            <div>
              <h2>{t("topbar.filters")}</h2>
              <p>{t("filters.description")}</p>
            </div>
            <button className="graduates-panel-close" type="button" onClick={() => setShowFilters(false)} aria-label={t("filters.close")}>
              <Icon src={xIcon} size={18} />
            </button>
          </div>
          <GraduatesFilters
            t={(key) => t(key)}
            filters={filters}
            programs={programs}
            regions={regions}
            programNameById={programNameById}
            regionNameById={regionNameById}
            setFilters={setFilters}
            onSearch={applyFilters}
            onReset={resetFilters}
          />
        </section>
      ) : null}

      {activeFilterChips.length ? (
        <section className="graduates-active-filters" aria-label={t("toolbar.activeFilters")}>
          <span className="graduates-active-filters-label">{t("toolbar.activeFilters")}</span>
          <div className="graduates-filter-chips">
            {activeFilterChips.map((chip) => (
              <button key={chip.id} className="graduates-filter-chip" type="button" onClick={chip.onRemove}>
                <span>{chip.label}</span>
                <Icon src={xIcon} size={14} />
              </button>
            ))}
          </div>
          <button
            className="graduates-clear-filters"
            type="button"
            onClick={() => {
              setSearchTerm("");
              resetFilters();
            }}
          >
            {t("toolbar.clearAll")}
          </button>
        </section>
      ) : null}

      {selectedIds.length ? (
        <section className="graduates-bulk-bar">
          <div className="graduates-bulk-summary">
            <strong>{t("bulk.selectedCount", { count: selectedIds.length })}</strong>
            <button type="button" onClick={() => setSelectedIds([])}>{t("bulk.clearSelection")}</button>
          </div>
          <div className="graduates-bulk-actions">
            <span>{t("bulk.exportSelected")}</span>
            {(["xlsx", "csv", "pdf"] as const).map((format) => (
              <button key={format} className="btn graduates-bulk-export" type="button" onClick={() => void onExport(format, selectedIds)}>
                {format.toUpperCase()}
              </button>
            ))}
            <button className="btn danger" type="button" onClick={() => void onDeleteSelected()}>
              {t("bulk.deleteSelected")}
            </button>
          </div>
        </section>
      ) : null}

      <GraduatesTable
        visibleItems={pagedVisibleItems}
        loading={loading}
        emptyMessage={emptyMessage}
        selectedIdSet={selectedIdSet}
        allVisibleSelected={allVisibleSelected}
        selectAllRef={selectAllRef}
        tableWrapRef={tableWrapRef}
        floatingScrollbarRef={floatingScrollbarRef}
        floatingScrollbarInnerRef={floatingScrollbarInnerRef}
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
        page={safeCurrentPage}
        pageCount={pageCount}
        pageSize={pageSize}
        resultCount={resultCount}
        firstResult={firstResult}
        lastResult={lastResult}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
