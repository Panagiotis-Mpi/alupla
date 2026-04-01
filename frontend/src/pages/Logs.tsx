import React from "react";
import { useTranslation } from "react-i18next";
import {
  listActivityLogs,
  activityLogsExportUrl,
  getActivityLogFileSummary,
  listUsers,
  type ActivityLog,
  type User,
} from "../lib/api";

const PAGE_SIZE = 200;

type LogFilters = {
  actor: string;
  action: string;
};

type FileSummaryRole = "secretariat" | "super_admin" | "visitor";
type FileSummaryFileType = "excel" | "csv" | "pdf" | "png";
type FileSummaryPage = "graduates" | "academicData" | "regions" | "statistics" | "map" | "logs";
type FileSummaryItem = {
  page: FileSummaryPage;
  import: Record<FileSummaryFileType, number>;
  export: Record<FileSummaryFileType, number>;
};

type ActivityLogListResponse = {
  items?: ActivityLog[];
  total?: number;
  page?: number;
  pageSize?: number;
};

type SummaryLayout = {
  pages: FileSummaryPage[];
  importTypes: FileSummaryFileType[];
  exportTypes: FileSummaryFileType[];
};

const emptyFilters: LogFilters = {
  actor: "",
  action: "",
};

const actionLabels = {
  gr: {
    login: "Σύνδεση",
    logout: "Αποσύνδεση",
    register: "Εγγραφή",
    request_password_reset: "Αίτημα αλλαγής κωδικού",
    reset_password: "Επαναφορά κωδικού",
    change_password: "Αλλαγή κωδικού",
    update_profile: "Ενημέρωση προφίλ",
    upload: "Μεταφόρτωση αρχείου",
    import_graduates: "Εισαγωγή αποφοίτων",
    export_graduates: "Εξαγωγή αποφοίτων",
    export_csv: "Εξαγωγή CSV",
    export_xlsx: "Εξαγωγή Excel",
    export_pdf: "Εξαγωγή PDF",
    map_export: "Εξαγωγή χάρτη",
    statistics_export: "Εξαγωγή στατιστικών",
    create_user: "Δημιουργία χρήστη",
    update_user: "Ενημέρωση χρήστη",
    reject_user: "Απόρριψη χρήστη",
    approve_user: "Αποδοχή χρήστη",
    deactivate_user: "Διαγραφή χρήστη",
    delete_user: "Διαγραφή χρήστη",
    "διαγραφή χρήστη": "Διαγραφή χρήστη",
    create_graduate: "Δημιουργία αποφοίτου",
    update_graduate: "Ενημέρωση αποφοίτου",
    delete_graduate: "Διαγραφή αποφοίτου",
    create_study_program: "Δημιουργία προγράμματος σπουδών",
    update_study_program: "Ενημέρωση προγράμματος σπουδών",
    delete_study_program: "Διαγραφή προγράμματος σπουδών",
    import_study_programs: "Εισαγωγή προγραμμάτων σπουδών",
    create_program_direction: "Δημιουργία κατεύθυνσης",
    update_program_direction: "Ενημέρωση κατεύθυνσης",
    delete_program_direction: "Διαγραφή κατεύθυνσης",
    import_program_directions: "Εισαγωγή κατευθύνσεων",
    create_region_periphery: "Δημιουργία περιφέρειας",
    update_region_periphery: "Ενημέρωση περιφέρειας",
    delete_region_periphery: "Διαγραφή περιφέρειας",
    import_region_peripheries: "Εισαγωγή περιφερειών",
    create_region_city: "Δημιουργία πόλης",
    update_region_city: "Ενημέρωση πόλης",
    delete_region_city: "Διαγραφή πόλης",
    import_region_cities: "Εισαγωγή πόλεων"
  },
  en: {
    login: "Login",
    logout: "Logout",
    register: "Registration",
    request_password_reset: "Password reset request",
    reset_password: "Password reset",
    change_password: "Password change",
    update_profile: "Profile update",
    upload: "File upload",
    import_graduates: "Graduate import",
    export_graduates: "Graduate export",
    export_csv: "CSV export",
    export_xlsx: "Excel export",
    export_pdf: "PDF export",
    map_export: "Map export",
    statistics_export: "Statistics export",
    create_user: "User creation",
    update_user: "User update",
    reject_user: "User rejection",
    approve_user: "User approval",
    deactivate_user: "User deletion",
    delete_user: "User deletion",
    "διαγραφή χρήστη": "User deletion",
    create_graduate: "Graduate creation",
    update_graduate: "Graduate update",
    delete_graduate: "Graduate deletion",
    create_study_program: "Study program creation",
    update_study_program: "Study program update",
    delete_study_program: "Study program deletion",
    import_study_programs: "Study program import",
    create_program_direction: "Direction creation",
    update_program_direction: "Direction update",
    delete_program_direction: "Direction deletion",
    import_program_directions: "Direction import",
    create_region_periphery: "Periphery creation",
    update_region_periphery: "Periphery update",
    delete_region_periphery: "Periphery deletion",
    import_region_peripheries: "Periphery import",
    create_region_city: "City creation",
    update_region_city: "City update",
    delete_region_city: "City deletion",
    import_region_cities: "City import"
  }
};

const knownActionKeys = [
  "login",
  "logout",
  "register",
  "request_password_reset",
  "reset_password",
  "change_password",
  "update_profile",
  "create_user",
  "update_user",
  "reject_user",
  "approve_user",
  "deactivate_user",
  "delete_user",
  "διαγραφή χρήστη",
  "create_graduate",
  "update_graduate",
  "delete_graduate",
  "import_graduates",
  "export_graduates",
  "create_study_program",
  "update_study_program",
  "delete_study_program",
  "import_study_programs",
  "create_program_direction",
  "update_program_direction",
  "delete_program_direction",
  "import_program_directions",
  "create_region_periphery",
  "update_region_periphery",
  "delete_region_periphery",
  "import_region_peripheries",
  "create_region_city",
  "update_region_city",
  "delete_region_city",
  "import_region_cities",
  "upload",
  "export_xlsx",
  "export_csv",
  "export_pdf",
  "statistics_export",
  "map_export"
] as const;

const detailFreeActions = new Set([
  "login",
  "logout",
  "register",
  "request_password_reset",
  "reset_password",
  "change_password"
]);

function getSummaryLayout(role: FileSummaryRole): SummaryLayout {
  if (role === "visitor") {
    return {
      pages: ["statistics", "map"],
      importTypes: [],
      exportTypes: ["excel", "csv", "png"]
    };
  }

  if (role === "secretariat") {
    return {
      pages: ["graduates", "academicData", "regions", "statistics", "map"],
      importTypes: ["excel"],
      exportTypes: ["excel", "csv", "pdf", "png"]
    };
  }

  return {
    pages: ["graduates", "academicData", "regions", "statistics", "map", "logs"],
    importTypes: ["excel"],
    exportTypes: ["excel", "csv", "pdf", "png"]
  };
}

function upperFileType(value: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "xlsx" || normalized === "xls") return "Excel";
  if (normalized === "csv") return "CSV";
  if (normalized === "pdf") return "PDF";
  if (normalized === "png") return "PNG";
  return value;
}

export default function Logs() {
  const { t, i18n } = useTranslation("logs");
  const activeLang = (i18n.resolvedLanguage || i18n.language || "gr").toLowerCase().startsWith("en") ? "en" : "gr";

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

  function toLocalizedAction(v: any): string {
    const key = String(v ?? "").trim();
    return actionLabels[activeLang][key as keyof (typeof actionLabels)["gr"]] ?? key.replace(/_/g, " ");
  }

  function localDetailLabel(key: string) {
    const labels = activeLang === "en"
      ? {
          file: "File",
          format: "Type",
          count: "Rows",
          total_rows: "Total rows",
          inserted: "New",
          updated: "Updated",
          skipped: "Skipped",
          deleted: "Deleted",
          exported: "Exported",
          page: "Page",
          years: "Years",
          role: "Role",
          status: "Status",
          study_program: "Study program",
          direction: "Direction",
          reason: "Reason"
        }
      : {
          file: "Αρχείο",
          format: "Τύπος",
          count: "Γραμμές",
          total_rows: "Σύνολο γραμμών",
          inserted: "Νέες",
          updated: "Ενημερωμένες",
          skipped: "Παραλείφθηκαν",
          deleted: "Διαγράφηκαν",
          exported: "Εξήχθησαν",
          page: "Σελίδα",
          years: "Έτη",
          role: "Ρόλος",
          status: "Κατάσταση",
          study_program: "Πρόγραμμα σπουδών",
          direction: "Κατεύθυνση",
          reason: "Λόγος"
        };

    return labels[key as keyof typeof labels] ?? key;
  }

  function localValue(value: string) {
    const normalized = String(value ?? "").trim();
    if (!normalized) return "";
    if (normalized === "visitor") return t("summary.roles.visitor");
    if (normalized === "secretariat") return t("summary.roles.secretariat");
    if (normalized === "super_admin") return t("summary.roles.admin");
    if (normalized === "graduates") return t("summary.pages.graduates");
    if (normalized === "academicData") return t("summary.pages.academicData");
    if (normalized === "regions") return t("summary.pages.regions");
    if (normalized === "statistics") return t("summary.pages.statistics");
    if (normalized === "map") return t("summary.pages.map");
    if (normalized === "logs") return t("summary.pages.logs");
    if (normalized === "xls" || normalized === "xlsx" || normalized === "excel" || normalized === "csv" || normalized === "pdf" || normalized === "png") {
      return upperFileType(normalized);
    }
    return toLocalizedAction(normalized) || normalized;
  }

  function parseDetails(value: any) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "object") return value;
    const raw = String(value).trim();
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  function formatLogDetails(log: ActivityLog) {
    if (detailFreeActions.has(String(log.action || "").trim())) {
      return "";
    }

    const details = parseDetails(log.details);
    if (!details) {
      return "";
    }

    if (typeof details === "string") {
      return details;
    }

    const rawFile = String(details.file ?? details.filename ?? "").trim();
    const format = String(details.format ?? "").trim();
    const parts: string[] = [];

    if (rawFile) parts.push(`${localDetailLabel("file")}: ${rawFile}`);
    if (format) parts.push(`${localDetailLabel("format")}: ${upperFileType(format)}`);

    const counters: Array<[string, any]> = [
      ["count", details.count],
      ["total_rows", details.total_rows],
      ["inserted", details.inserted],
      ["updated", details.updated],
      ["skipped", details.skipped],
      ["deleted", details.deleted],
      ["exported", details.exported]
    ];

    for (const [key, value] of counters) {
      if (value === null || value === undefined || value === "") continue;
      parts.push(`${localDetailLabel(key)}: ${value}`);
    }

    const plainFields: Array<[string, any]> = [
      ["page", details.page],
      ["role", details.role],
      ["status", details.status],
      ["study_program", details.study_program],
      ["direction", details.direction],
      ["reason", details.reason]
    ];

    for (const [key, value] of plainFields) {
      if (value === null || value === undefined || value === "") continue;
      parts.push(`${localDetailLabel(key)}: ${localValue(String(value))}`);
    }

    if (parts.length) {
      return parts.join(" • ");
    }

    const fallbackEntries = Object.entries(details)
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .slice(0, 5)
      .map(([key, value]) => `${localDetailLabel(key)}: ${typeof value === "string" ? localValue(value) : String(value)}`);

    return fallbackEntries.join(" • ");
  }

  function formatDateTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const locale = activeLang === "en" ? "en-GB" : "el-GR";
    const time = new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(date);
    const day = new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(date);
    return `${time}, ${day}`;
  }

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
    const options = knownActionKeys.map((key) => ({ value: key, label: toLocalizedAction(key) }));
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

  function pageLabel(pageKey: FileSummaryPage) {
    if (pageKey === "graduates") return t("summary.pages.graduates");
    if (pageKey === "academicData") return t("summary.pages.academicData");
    if (pageKey === "regions") return t("summary.pages.regions");
    if (pageKey === "statistics") return t("summary.pages.statistics");
    if (pageKey === "map") return t("summary.pages.map");
    return t("summary.pages.logs");
  }

  function fileTypeLabel(fileType: FileSummaryFileType) {
    if (fileType === "excel") return t("summary.fileTypes.excel");
    if (fileType === "csv") return t("summary.fileTypes.csv");
    if (fileType === "pdf") return t("summary.fileTypes.pdf");
    return t("summary.fileTypes.png");
  }

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

  function onExport(format: "csv" | "xlsx") {
    const url = activityLogsExportUrl(
      format,
      {
        action: actionForApi || undefined,
        user_id: actorIdForApi,
        role: roleForApi || undefined,
      },
      activeLang
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setExportMenuOpen(false);
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      {err && (
        <div
          className="card"
          style={{ borderColor: "#b00020", color: "#b00020" }}
        >
          {err}
        </div>
      )}

      <div className="card logs-summary-card" style={{ maxWidth: 1120, width: "100%", margin: "0 auto" }}>
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
                <button className="btn" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => onExport("xlsx")}>
                  {t("summary.fileTypes.excel")}
                </button>
                <button className="btn" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => onExport("csv")}>
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

        <div>
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
                    <td key={`${row.page}-import-${fileType}`}>{row.import?.[fileType] ?? 0}</td>
                  ))}
                  {summaryLayout.exportTypes.map((fileType) => (
                    <td key={`${row.page}-export-${fileType}`}>{row.export?.[fileType] ?? 0}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card logs-filters-card" style={{ maxWidth: 1120, width: "100%", margin: "0 auto" }}>
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
            display: "flex",
            gap: 10,
            marginTop: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button className="btn" onClick={() => void load(1)}>
            {t("filters.search")}
          </button>
          <button
            className="btn"
            onClick={() => {
              setFilters(emptyFilters);
              setTimeout(() => void load(1), 0);
            }}
          >
            {t("filters.reset")}
          </button>

          <div className="spacer" />
          <button
            className="btn"
            style={{ paddingLeft: 12, paddingRight: 12 }}
            disabled={page <= 1 || loading}
            onClick={() => void load(Math.max(1, page - 1))}
            aria-label={t("aria.previous", { ns: "common" })}
          >
            ◀
          </button>
          <span className="badge" style={{ minWidth: 44, textAlign: "center" }}>
            {page}
          </span>
          <button
            className="btn"
            style={{ paddingLeft: 12, paddingRight: 12 }}
            disabled={page >= totalPages || loading}
            onClick={() => void load(Math.min(totalPages, page + 1))}
            aria-label={t("aria.next", { ns: "common" })}
          >
            ▶
          </button>
        </div>
      </div>

      <div className="card logs-table-card" style={{ maxWidth: 1120, width: "100%", margin: "0 auto" }}>
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
                  <td>{toLocalizedAction(l.action)}</td>
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
