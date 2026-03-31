import React from "react";
import { useTranslation } from "react-i18next";
import {
  listActivityLogs,
  activityLogsExportUrl,
  getActivityLogFileSummary,
  type ActivityLog,
} from "../lib/api";

const PAGE_SIZE = 20;

type LogFilters = {
  role: "" | FileSummaryRole;
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

const emptyFilters: LogFilters = {
  role: "",
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

  function setFilter<K extends keyof LogFilters>(key: K, value: LogFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function actorLabel(l: any): string {
    const fn = (l?.user?.first_name ?? "").trim();
    const ln = (l?.user?.last_name ?? "").trim();
    const full = `${fn} ${ln}`.trim();
    if (full) return full;
    return activeLang === "en" ? "System" : "Σύστημα";
  }

  function roleLabel(role: string) {
    if (role === "secretariat") return t("summary.roles.secretariat");
    if (role === "super_admin") return t("summary.roles.admin");
    if (role === "visitor") return t("summary.roles.visitor");
    return t("filters.all");
  }

  function toLocalizedAction(v: any): string {
    const key = String(v ?? "").trim();
    return actionLabels[activeLang][key as keyof (typeof actionLabels)["gr"]] ?? key.replace(/_/g, " ");
  }

  function toLocalizedDetails(v: any): string {
    if (v === null || v === undefined || v === "") return "";
    const raw = typeof v === "object" ? JSON.stringify(v) : String(v);
    return raw
      .replaceAll("admin_approved", activeLang === "en" ? "admin approval" : "έγκριση διαχειριστή")
      .replaceAll("email_verified", activeLang === "en" ? "email verification" : "επαλήθευση email")
      .replaceAll("is_active", activeLang === "en" ? "active" : "ενεργός")
      .replaceAll("first_name", activeLang === "en" ? "first name" : "όνομα")
      .replaceAll("last_name", activeLang === "en" ? "last name" : "επώνυμο")
      .replaceAll("role", activeLang === "en" ? "role" : "ρόλος");
  }

  const actionForApi = filters.action.trim();
  const roleForApi = filters.role;

  const fileTypes: FileSummaryFileType[] = ["excel", "csv", "pdf", "png"];
  const pageOrder: FileSummaryPage[] = ["graduates", "academicData", "regions", "statistics", "map", "logs"];

  const actionOptions = React.useMemo(() => {
    const options = knownActionKeys.map((key) => ({ value: key, label: toLocalizedAction(key) }));
    return options.sort((a, b) => a.label.localeCompare(b.label, activeLang === "gr" ? "el" : "en"));
  }, [activeLang]);

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

  function onExport() {
    const url = activityLogsExportUrl({
      action: actionForApi || undefined,
      role: roleForApi || undefined,
    });
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>{t("title")}</h2>
        <button className="btn" onClick={onExport}>
          {t("actions.exportCsv")}
        </button>
        <div className="spacer" />
      </div>

      {err && (
        <div
          className="card"
          style={{ borderColor: "#b00020", color: "#b00020" }}
        >
          {err}
        </div>
      )}

      <div className="card logs-summary-card">
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>{t("summary.title")}</h3>
          <select
            className="input"
            value={summaryRole}
            onChange={(e) => setSummaryRole(e.target.value as FileSummaryRole)}
            style={{ width: 220, minWidth: 220, maxWidth: "100%" }}
          >
            <option value="secretariat">{t("summary.roles.secretariat")}</option>
            <option value="super_admin">{t("summary.roles.admin")}</option>
            <option value="visitor">{t("summary.roles.visitor")}</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="table" style={{ minWidth: 1120 }}>
            <thead>
              <tr>
                <th rowSpan={2}>{t("summary.page")}</th>
                <th colSpan={fileTypes.length}>{t("summary.imports")}</th>
                <th colSpan={fileTypes.length}>{t("summary.exports")}</th>
              </tr>
              <tr>
                {fileTypes.map((fileType) => (
                  <th key={`import-${fileType}`}>{fileTypeLabel(fileType)}</th>
                ))}
                {fileTypes.map((fileType) => (
                  <th key={`export-${fileType}`}>{fileTypeLabel(fileType)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageOrder.map((pageKey) => {
                const row = fileSummary.find((entry) => entry.page === pageKey);
                return (
                  <tr key={pageKey}>
                    <td>{pageLabel(pageKey)}</td>
                    {fileTypes.map((fileType) => (
                      <td key={`${pageKey}-import-${fileType}`}>{row?.import?.[fileType] ?? 0}</td>
                    ))}
                    {fileTypes.map((fileType) => (
                      <td key={`${pageKey}-export-${fileType}`}>{row?.export?.[fileType] ?? 0}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card logs-filters-card">
        <div className="grid cols2" style={{ gap: 14 }}>
          <div>
            <label className="label">{t("filters.actor")}</label>
            <select
              className="input"
              value={filters.role}
              onChange={(e) => setFilter("role", e.target.value as LogFilters["role"])}
            >
              <option value="">{t("filters.all")}</option>
              <option value="secretariat">{roleLabel("secretariat")}</option>
              <option value="super_admin">{roleLabel("super_admin")}</option>
              <option value="visitor">{roleLabel("visitor")}</option>
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

      <div className="card logs-table-card">
        <div className="table-wrap">
          <table className="table" style={{ minWidth: 1080 }}>
            <thead>
              <tr>
                <th>{t("table.id")}</th>
                <th>{t("table.ts")}</th>
                <th>{t("table.actor")}</th>
                <th>{t("table.action")}</th>
                <th>{t("table.details")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id}>
                  <td>{l.id}</td>
                  <td style={{ fontFamily: "monospace" }}>{l.created_at}</td>
                  <td>{actorLabel(l)}</td>
                  <td>{toLocalizedAction(l.action)}</td>
                  <td
                    style={{
                      maxWidth: 620,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {toLocalizedDetails(l.details)}
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
