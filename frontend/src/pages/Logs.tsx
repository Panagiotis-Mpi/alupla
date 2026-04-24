import React from "react";
import { useTranslation } from "react-i18next";
import { downloadBlob } from "../lib/download";
import {
  listActivityLogs,
  exportActivityLogsFile,
  getActivityLogFileSummary,
  listUsers,
  type ActivityLog,
  type User,
} from "../lib/api";
import {
  PAGE_SIZE,
  createLogsLocalizer,
  emptyFilters,
  getSummaryLayout,
  isSummaryCellSupported,
  knownActionKeys,
  summaryCellValue,
  type ActivityLogListResponse,
  type FileSummaryItem,
  type FileSummaryFileType,
  type FileSummaryPage,
  type FileSummaryRole,
  type LogFilters,
} from "./logs/shared";

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
  const [userOptions, setUserOptions] = React.useState<Array<{ value: string; label: string }>>([]);
  const [exportMenuOpen, setExportMenuOpen] = React.useState(false);
  const exportMenuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const update = () => setIsCompact(window.innerWidth <= 820);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const logsText = React.useMemo(() => createLogsLocalizer({ activeLang, t }), [activeLang, t]);

  function setFilter<K extends keyof LogFilters>(key: K, value: LogFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function actorLabel(l: any): string {
    const fn = (l?.user?.first_name ?? "").trim();
    const ln = (l?.user?.last_name ?? "").trim();
    const full = `${fn} ${ln}`.trim();
    if (full) return full;
    return t("summary.roles.visitor");
  }

  const { fileTypeLabel, formatDateTime, formatLogDetails, pageLabel, toLocalizedAction } = logsText;

  const actionForApi = filters.action.trim();

  const selectedActor = filters.actor;
  const actorIsVisitor = selectedActor === "visitor";
  const actorIdForApi = actorIsVisitor || !selectedActor ? undefined : selectedActor;
  const roleForApi = actorIsVisitor ? "visitor" : undefined;

  const summaryLayout = React.useMemo(() => getSummaryLayout(summaryRole), [summaryRole]);
  const visibleSummaryRows = React.useMemo(
    () => summaryLayout.pages.map((pageKey) => fileSummary.find((entry) => entry.page === pageKey)).filter(Boolean) as FileSummaryItem[],
    [fileSummary, summaryLayout.pages]
  );

  const actionOptions = React.useMemo(() => {
    const options = knownActionKeys.map((key) => ({ value: key, label: toLocalizedAction(key as any) }));
    return options.sort((a, b) => a.label.localeCompare(b.label, activeLang === "gr" ? "el" : "en"));
  }, [activeLang]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      try {
        const data = await listUsers();
        if (cancelled) return;
        const users = Array.isArray(data?.items) ? data.items : [];
        const mapped = users
          .map((user: User) => ({
            value: String(user.id),
            label: `${String(user.first_name ?? "").trim()} ${String(user.last_name ?? "").trim()}`.trim() || String(user.email ?? "").trim(),
          }))
          .filter((user: { value: string; label: string }) => user.label)
          .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, activeLang === "gr" ? "el" : "en"));

        setUserOptions([{ value: "visitor", label: t("summary.roles.visitor") }, ...mapped]);
      } catch {
        if (!cancelled) setUserOptions([{ value: "visitor", label: t("summary.roles.visitor") }]);
      }
    }

    void loadUsers();
    return () => {
      cancelled = true;
    };
  }, [activeLang, t]);


  async function loadFileSummary(role: FileSummaryRole) {
    try {
      const data = await getActivityLogFileSummary({ role });
      setFileSummary(data.items ?? []);
    } catch (e: any) {
      setErr((current) => current ?? e?.message ?? t("error"));
    }
  }

  async function load(nextPage = page) {
    setLoading(true);
    setErr(null);
    try {
      const data = await listActivityLogs({
        page: nextPage,
        pageSize: PAGE_SIZE,
        action: actionForApi || undefined,
        user_id: actorIdForApi,
        role: roleForApi || undefined,
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
          action: actionForApi || undefined,
          user_id: actorIdForApi,
          role: roleForApi || undefined,
        },
        activeLang
      );
      await downloadBlob(blob, `alupla_system_logs_export_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${format}`);
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

      <div className="card logs-summary-card page-header-card mobile-table-card">
        <div className="topbar" style={{ alignItems: "center", justifyContent: "space-between", marginBottom: 12, width: "100%" }}>
          <h2 style={{ margin: 0 }}>{t("title")}</h2>
          <div ref={exportMenuRef} style={{ position: "relative", marginLeft: "auto" }}>
            <button className="btn" onClick={() => setExportMenuOpen((current) => !current)} style={{ minWidth: 0, width: "100%", maxWidth: 220 }}>
              {t("actions.export")}
            </button>
            {exportMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: 170,
                  background: "#fff",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  boxShadow: "0 18px 40px rgba(15,23,42,.16)",
                  padding: 8,
                  zIndex: 50,
                  display: "grid",
                  gap: 6,
                }}
              >
                <button className="btn" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => void onExport("xlsx")}>
                  {t("summary.fileTypes.excel")}
                </button>
                <button className="btn" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => void onExport("csv")}>
                  {t("summary.fileTypes.csv")}
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>{t("summary.title")}</h3>
          <select
            className="input"
            value={summaryRole}
            onChange={(e) => setSummaryRole(e.target.value as FileSummaryRole)}
            style={{ width: "100%", minWidth: 0, maxWidth: 280, flex: "1 1 220px" }}
          >
            <option value="secretariat">{t("summary.roles.secretariat")}</option>
            <option value="super_admin">{t("summary.roles.admin")}</option>
            <option value="visitor">{t("summary.roles.visitor")}</option>
          </select>
        </div>

        <div className="table-wrap">
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
                flexWrap: isCompact ? "wrap" : "nowrap",
                width: isCompact ? "100%" : "auto",
              }}
            >
              <button className="btn" onClick={() => void load(1)} style={{ width: isCompact ? "100%" : "auto" }}>
                {t("filters.search")}
              </button>
              <button
                className="btn"
                style={{ width: isCompact ? "100%" : "auto" }}
                onClick={() => {
                  setFilters(emptyFilters);
                  setTimeout(() => void load(1), 0);
                }}
              >
                {t("filters.reset")}
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
                    style={{
                      width: 42,
                      minWidth: 42,
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
                    }}
                    disabled={page <= 1 || loading}
                    onClick={() => void load(Math.max(1, page - 1))}
                    aria-label={t("aria.previous", { ns: "common" })}
                  >
                    ‹
                  </button>
                  <span
                    className="badge"
                    style={{
                      minWidth: 52,
                      height: 42,
                      padding: "0 14px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      borderRadius: 12,
                      flex: "0 0 auto",
                    }}
                  >
                    {page}
                  </span>
                  <button
                    className="btn"
                    style={{
                      width: 42,
                      minWidth: 42,
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
                    }}
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                flexWrap: "nowrap",
                width: "100%",
              }}
            >
              <button
                className="btn"
                style={{
                  width: 42,
                  minWidth: 42,
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
                }}
                disabled={page <= 1 || loading}
                onClick={() => void load(Math.max(1, page - 1))}
                aria-label={t("aria.previous", { ns: "common" })}
              >
                ‹
              </button>
              <span
                className="badge"
                style={{
                  minWidth: 52,
                  height: 42,
                  padding: "0 14px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  borderRadius: 12,
                  flex: "0 0 auto",
                }}
              >
                {page}
              </span>
              <button
                className="btn"
                style={{
                  width: 42,
                  minWidth: 42,
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
                }}
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

      <div className="card logs-table-card page-header-card mobile-table-card">
        <div className="table-wrap">
          <table className="table" style={{ width: "100%", minWidth: 860, tableLayout: "fixed" }}>
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
                  <td>{actorLabel(l)}</td>
                  <td>{toLocalizedAction(l.action, l)}</td>
                  <td style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                    {formatLogDetails(l)}
                  </td>
                </tr>
              ))}

              {!items.length && (
                <tr>
                  <td colSpan={5} className="muted">
                    {t("table.none")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
