import React from "react";
import { useTranslation } from "react-i18next";
import { downloadBlob } from "../lib/download";
import { buildExportFilename } from "../lib/exportFilenames";
import Icon from "../components/Icon";
import fileSpreadsheetIcon from "../assets/icons/file-spreadsheet.svg";
import arrowLeftRightIcon from "../assets/icons/arrow-left-right.svg";
import historyIcon from "../assets/icons/history.svg";
import listFilterIcon from "../assets/icons/list-filter.svg";
import {
  listActivityLogs,
  exportActivityLogsFile,
  getActivityLogFileSummary,
  listUsers,
  listStudyPrograms,
  type ActivityLog,
  type StudyProgram,
  type User,
} from "../lib/api";
import {
  PAGE_SIZE,
  createLogsLocalizer,
  emptyFilters,
  getSummaryLayout,
  knownActionKeys,
  summaryCellValue,
  type ActivityLogListResponse,
  type FileSummaryItem,
  type FileSummaryPage,
  type FileSummaryRole,
  type LogFilters,
} from "./logs/shared";

const paginationButtonStyle = (size: number): React.CSSProperties => ({
  width: size,
  minWidth: size,
  height: 42,
  padding: 0,
  borderRadius: 12,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
  lineHeight: 1,
  fontWeight: 600,
  flex: "0 0 auto",
});

const desktopPaginationBadgeStyle: React.CSSProperties = {
  minWidth: 52,
  height: 42,
  padding: "0 14px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  borderRadius: 12,
  flex: "0 0 auto",
};

const mobilePaginationBadgeStyle: React.CSSProperties = {
  minWidth: 52,
  width: 52,
  maxWidth: 52,
  height: 42,
  padding: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  borderRadius: 12,
  flex: "0 0 auto",
};

type UserOption = { value: string; label: string };

function localeForLanguage(lang: string) {
  return lang === "gr" ? "el" : "en";
}

function userLabel(user: Partial<User> | null | undefined) {
  return `${String(user?.first_name ?? "").trim()} ${String(user?.last_name ?? "").trim()}`.trim() || String(user?.email ?? "").trim();
}

function buildUserOptions(users: User[], visitorLabel: string, locale: string): UserOption[] {
  const mapped = users
    .map((user) => ({ value: String(user.id), label: userLabel(user) }))
    .filter((option) => option.label)
    .sort((a, b) => a.label.localeCompare(b.label, locale));

  return [{ value: "visitor", label: visitorLabel }, ...mapped];
}

function actorLabel(log: any, visitorLabel: string) {
  return userLabel(log?.user as Partial<User> | undefined) || visitorLabel;
}

function emptySummaryRow(page: FileSummaryPage): FileSummaryItem {
  return {
    page,
    import: { excel: 0, csv: 0, pdf: 0, png: 0 },
    export: { excel: 0, csv: 0, pdf: 0, png: 0 },
  };
}

function apiFilters(filters: LogFilters) {
  const action = filters.action.trim();
  const selectedActor = filters.actor;
  const actorIsVisitor = selectedActor === "visitor";

  return {
    action: action || undefined,
    user_id: actorIsVisitor || !selectedActor ? undefined : selectedActor,
    role: actorIsVisitor ? "visitor" : undefined,
  };
}

export default function Logs() {
  const { t, i18n } = useTranslation("logs");
  const activeLang = (i18n.resolvedLanguage || i18n.language || "gr").toLowerCase().startsWith("en") ? "en" : "gr";

  const [isCompact, setIsCompact] = React.useState(() => typeof window !== "undefined" ? window.innerWidth <= 820 : false);
  const [items, setItems] = React.useState<ActivityLog[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [totalItems, setTotalItems] = React.useState(0);
  const [filters, setFilters] = React.useState<LogFilters>(emptyFilters);
  const [summaryRole, setSummaryRole] = React.useState<FileSummaryRole>("secretariat");
  const [fileSummary, setFileSummary] = React.useState<FileSummaryItem[]>([]);
  const [summaryLoading, setSummaryLoading] = React.useState(true);
  const [userOptions, setUserOptions] = React.useState<UserOption[]>([]);
  const [studyPrograms, setStudyPrograms] = React.useState<StudyProgram[]>([]);
  const [exportMenuOpen, setExportMenuOpen] = React.useState(false);
  const [activePanel, setActivePanel] = React.useState<"logs" | "summary">("logs");
  const exportMenuRef = React.useRef<HTMLDivElement | null>(null);
  const summaryRequestRef = React.useRef(0);


  React.useEffect(() => {
    const update = () => setIsCompact(window.innerWidth <= 820);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const logsText = React.useMemo(() => createLogsLocalizer({ activeLang, t, studyPrograms }), [activeLang, t, studyPrograms]);

  function setFilter<K extends keyof LogFilters>(key: K, value: LogFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  const { fileTypeLabel, formatDateTime, formatLogDetails, pageLabel, toLocalizedAction } = logsText;
  const requestFilters = React.useMemo(() => apiFilters(filters), [filters]);
  const locale = localeForLanguage(activeLang);
  const visitorLabel = t("summary.roles.visitor");
  const summaryLoadingStyle = { "--logs-summary-loading-label": JSON.stringify(t("table.loading")) } as React.CSSProperties;

  const summaryLayout = React.useMemo(() => getSummaryLayout(summaryRole), [summaryRole]);
  const visibleSummaryRows = React.useMemo(
    () => summaryLayout.pages.map((pageKey) => fileSummary.find((entry) => entry.page === pageKey) ?? emptySummaryRow(pageKey)),
    [fileSummary, summaryLayout.pages]
  );

  const actionOptions = React.useMemo(() => {
    const options = knownActionKeys.map((key) => ({ value: key, label: toLocalizedAction(key as any) }));
    return options.sort((a, b) => a.label.localeCompare(b.label, activeLang === "gr" ? "el" : "en"));
  }, [activeLang, toLocalizedAction]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      try {
        const data = await listUsers();
        if (cancelled) return;
        const users = Array.isArray(data?.items) ? data.items : [];
        setUserOptions(buildUserOptions(users, visitorLabel, locale));
      } catch {
        if (!cancelled) setUserOptions([{ value: "visitor", label: visitorLabel }]);
      }
    }

    void loadUsers();
    return () => {
      cancelled = true;
    };
  }, [locale, visitorLabel]);


  React.useEffect(() => {
    let cancelled = false;

    async function loadStudyPrograms() {
      try {
        const data = await listStudyPrograms();
        if (cancelled) return;
        setStudyPrograms(Array.isArray(data?.items) ? data.items : []);
      } catch {
        if (!cancelled) setStudyPrograms([]);
      }
    }

    void loadStudyPrograms();
    return () => {
      cancelled = true;
    };
  }, []);


  async function loadFileSummary(role: FileSummaryRole) {
    const requestId = summaryRequestRef.current + 1;
    summaryRequestRef.current = requestId;
    setSummaryLoading(true);
    setFileSummary([]);
    try {
      const data = await getActivityLogFileSummary({ role });
      if (summaryRequestRef.current === requestId) {
        setFileSummary((data.items ?? []) as FileSummaryItem[]);
      }
    } catch (e: any) {
      if (summaryRequestRef.current === requestId) {
        setErr((current) => current ?? e?.message ?? t("error"));
      }
    } finally {
      if (summaryRequestRef.current === requestId) {
        setSummaryLoading(false);
      }
    }
  }

  async function load(nextPage = page) {
    setLoading(true);
    setErr(null);
    try {
      const data = await listActivityLogs({
        page: nextPage,
        pageSize: PAGE_SIZE,
        ...requestFilters,
      }) as ActivityLogListResponse;
      setItems(data.items ?? []);
      setTotalItems(Number(data.total ?? 0));
      setPage(Number(data.page ?? nextPage));
    } catch (e: any) {
      setErr(e?.message ?? t("error"));
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  React.useEffect(() => {
    void load(1);
  }, []);

  React.useEffect(() => {
    void loadFileSummary(summaryRole);
  }, [summaryRole]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!exportMenuRef.current?.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function onExport(format: "csv" | "xlsx") {
    setErr(null);
    try {
      const blob = await exportActivityLogsFile(
        format,
        {
          ...requestFilters,
        },
        activeLang
      );
      const scope = Object.values(requestFilters).some((value) => value !== undefined && value !== null && value !== "") ? "filtered" : "all";
      await downloadBlob(blob, buildExportFilename("logs", [scope, totalItems, "records"], format));
    } catch (e: any) {
      setErr(e?.message ?? t("errorDefault", { ns: "common", defaultValue: "Κάτι πήγε στραβά" }));
    } finally {
      setExportMenuOpen(false);
    }
  }

  return (
    <div className="page-stable-shell">
      {err && (
        <div
          className="card"
          style={{ borderColor: "#b00020", color: "#b00020" }}
        >
          {err}
        </div>
      )}

      <div className="card page-header-card page-central-menu-card" style={{ padding: 14 }}>
        <div style={{ display: "grid", gap: 14 }}>
          <div className="mobile-summary-title-row page-central-menu-title-row" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>{t("title")}</h2>
          </div>
          <div
            className="page-header-actions-grid page-central-menu-actions page-central-menu-actions-odd"
            style={{
              display: "grid",
              gap: 12,
              width: "100%",
              gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
              alignItems: "stretch",
            }}
          >
            <button
              type="button"
              className={activePanel === "logs" ? "btn primary" : "btn"}
              style={{ minHeight: 46, height: "100%", justifyContent: "center" }}
              aria-current={activePanel === "logs" ? "page" : undefined}
              onClick={() => setActivePanel("logs")}
            >
              <Icon src={historyIcon} size={18} />
              <span>{t("title")}</span>
            </button>
            <button
              type="button"
              className={activePanel === "summary" ? "btn primary" : "btn"}
              style={{ minHeight: 46, height: "100%", justifyContent: "center" }}
              aria-current={activePanel === "summary" ? "page" : undefined}
              onClick={() => setActivePanel("summary")}
            >
              <Icon src={arrowLeftRightIcon} size={18} />
              <span>{t("summary.button")}</span>
            </button>
            <div ref={exportMenuRef} style={{ position: "relative", height: "100%" }}>
              <button
                type="button"
                className="btn dropdown-like"
                onClick={() => setExportMenuOpen((current) => !current)}
                style={{ minHeight: 46, height: "100%", justifyContent: "center", width: "100%" }}
              >
                <Icon src={fileSpreadsheetIcon} size={18} />
                <span>{t("actions.export")}</span>
                <span className="btn-dropdown-chevron" aria-hidden="true" />
              </button>
              {exportMenuOpen && (
                <div className="central-menu-dropdown central-menu-dropdown-compact central-menu-dropdown-align-right">
                  <button className="btn central-menu-dropdown-item" onClick={() => void onExport("xlsx")}>
                    <Icon src={fileSpreadsheetIcon} size={17} />
                    <span>{t("summary.fileTypes.excel")}</span>
                  </button>
                  <button className="btn central-menu-dropdown-item" onClick={() => void onExport("csv")}>
                    <Icon src={fileSpreadsheetIcon} size={17} />
                    <span>{t("summary.fileTypes.csv")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {activePanel === "summary" && (
        <div className="card logs-summary-card page-header-card mobile-table-card">
        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>{t("summary.title")}</h3>
          <select
            className="input"
            value={summaryRole}
            onChange={(e) => {
              setSummaryLoading(true);
              setFileSummary([]);
              setSummaryRole(e.target.value as FileSummaryRole);
            }}
            style={{ width: "100%", minWidth: 0, maxWidth: 280, flex: "1 1 220px" }}
          >
            <option value="secretariat">{t("summary.roles.secretariat")}</option>
            <option value="super_admin">{t("summary.roles.admin")}</option>
            <option value="visitor">{t("summary.roles.visitor")}</option>
          </select>
        </div>

        <div className={`table-wrap logs-summary-loading-region${summaryLoading ? " is-loading" : ""}`} style={summaryLoading ? summaryLoadingStyle : undefined}>
          <table className="table logs-summary-table" style={{ width: "100%", minWidth: 720, tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ width: "28%" }}>{t("summary.page")}</th>
                {summaryLayout.importTypes.length > 0 && <th colSpan={summaryLayout.importTypes.length}>{t("summary.imports")}</th>}
                {summaryLayout.exportTypes.length > 0 && <th colSpan={summaryLayout.exportTypes.length}>{t("summary.exports")}</th>}
              </tr>
              <tr>
                {summaryLayout.importTypes.map((fileType) => (
                  <th key={`import-${fileType}`}>{fileTypeLabel(fileType)}</th>
                ))}
                {summaryLayout.exportTypes.map((fileType) => (
                  <th key={`export-${fileType}`}>{fileTypeLabel(fileType)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleSummaryRows.map((row) => (
                <tr key={row.page}>
                  <td>{pageLabel(row.page)}</td>
                  {summaryLayout.importTypes.map((fileType) => (
                    <td key={`${row.page}-import-${fileType}`}>{summaryCellValue(row, "import", fileType)}</td>
                  ))}
                  {summaryLayout.exportTypes.map((fileType) => (
                    <td key={`${row.page}-export-${fileType}`}>{summaryCellValue(row, "export", fileType)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {activePanel === "logs" && (
        <>
          <div className="card logs-filters-card page-header-card">
        <div className="grid cols2" style={{ gap: 14 }}>
          <div>
            <label className="label">{t("filters.actor")}</label>
            <select
              className="input"
              value={filters.actor}
              onChange={(e) => setFilter("actor", e.target.value)}
            >
              <option value="">{t("filters.all")}</option>
              {userOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">{t("filters.action")}</label>
            <select
              className="input"
              value={filters.action}
              onChange={(e) => setFilter("action", e.target.value)}
            >
              <option value="">{t("filters.all")}</option>
              {actionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            marginTop: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              justifyContent: "flex-start",
              flexWrap: isCompact ? "wrap" : "nowrap",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "nowrap",
                width: isCompact ? "100%" : "auto",
              }}
            >
              <button className="btn" onClick={() => void load(1)} style={{ width: isCompact ? "calc(50% - 5px)" : "auto", flex: isCompact ? "1 1 0" : "0 0 auto" }}>
                <Icon src={listFilterIcon} size={17} />
                <span>{t("filters.search")}</span>
              </button>
              <button
                className="btn"
                style={{ width: isCompact ? "calc(50% - 5px)" : "auto", flex: isCompact ? "1 1 0" : "0 0 auto" }}
                onClick={() => {
                  setFilters(emptyFilters);
                  setTimeout(() => void load(1), 0);
                }}
              >
                <Icon src={historyIcon} size={17} />
                  <span>{t("filters.reset")}</span>
              </button>

              {!isCompact && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: 10,
                    flexWrap: "nowrap",
                    marginLeft: 12,
                  }}
                >
                  <button
                    className="btn"
                    style={paginationButtonStyle(42)}
                    disabled={page <= 1 || loading}
                    onClick={() => void load(Math.max(1, page - 1))}
                    aria-label={t("aria.previous", { ns: "common" })}
                  >
                    ‹
                  </button>
                  <span
                    className="badge"
                    style={desktopPaginationBadgeStyle}
                  >
                    {page}
                  </span>
                  <button
                    className="btn"
                    style={paginationButtonStyle(42)}
                    disabled={page >= totalPages || loading}
                    onClick={() => void load(Math.min(totalPages, page + 1))}
                    aria-label={t("aria.next", { ns: "common" })}
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>

          {isCompact && (
            <div className="logs-mobile-pagination">
              <button
                className="btn"
                style={paginationButtonStyle(52)}
                disabled={page <= 1 || loading}
                onClick={() => void load(Math.max(1, page - 1))}
                aria-label={t("aria.previous", { ns: "common" })}
              >
                ‹
              </button>
              <span
                className="badge"
                style={mobilePaginationBadgeStyle}
              >
                {page}
              </span>
              <button
                className="btn"
                style={paginationButtonStyle(52)}
                disabled={page >= totalPages || loading}
                onClick={() => void load(Math.min(totalPages, page + 1))}
                aria-label={t("aria.next", { ns: "common" })}
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

          <div className="card page-header-card mobile-table-card">
            <div className="table-wrap">
              <table className="table logs-list-table" style={{ width: "100%", minWidth: 860, tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th style={{ width: 42 }}>{t("table.id")}</th>
                <th style={{ width: 190 }}>{t("table.ts")}</th>
                <th style={{ width: 150 }}>{t("table.actor")}</th>
                <th style={{ width: 150 }}>{t("table.action")}</th>
                <th>{t("table.details")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id}>
                  <td>{l.id}</td>
                  <td>{formatDateTime(l.created_at)}</td>
                  <td>{actorLabel(l, visitorLabel)}</td>
                  <td>{toLocalizedAction(l.action, l)}</td>
                  <td style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                    {formatLogDetails(l)}
                  </td>
                </tr>
              ))}

              {!items.length && (
                <tr>
                  <td colSpan={5} className="muted">
                    {loading ? t("table.loading") : t("table.none")}
                  </td>
                </tr>
              )}
            </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
