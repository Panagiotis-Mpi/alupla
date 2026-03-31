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

const emptyFilters: LogFilters = {
  actor: "",
  action: "",
};

const wideCardStyle: React.CSSProperties = {
  width: "calc(100vw - 32px)",
  marginLeft: "calc(50% - 50vw + 16px)",
  marginRight: 0,
  boxSizing: "border-box",
};

const actionLabels = {
  gr: {
    login: "Σύνδεση",
    logout: "Αποσύνδεση",
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
    delete_graduate: "Διαγραφή αποφοίτου"
  },
  en: {
    login: "Login",
    logout: "Logout",
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
    delete_graduate: "Graduate deletion"
  }
};

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
  const actorForApi = filters.actor.trim();

  const fileTypes: FileSummaryFileType[] = ["excel", "csv", "pdf", "png"];
  const pageOrder: FileSummaryPage[] = ["graduates", "academicData", "regions", "statistics", "map", "logs"];

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
        actor: actorForApi || undefined,
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

  const distinctActions = React.useMemo(() => {
    const s = new Set<string>();
    for (const l of items) {
      const raw = String((l as any)?.action ?? "").trim();
      const label = toLocalizedAction(raw);
      if (label) s.add(label);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, "el"));
  }, [activeLang, items]);

  const distinctActors = React.useMemo(() => {
    const s = new Set<string>();
    for (const l of items) {
      const v = actorLabel(l);
      if (v) s.add(v);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [activeLang, items]);

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

      <div className="card logs-summary-card" style={wideCardStyle}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>{t("summary.title")}</h3>
          <div className="spacer" />
          <label className="label" style={{ margin: 0 }}>{t("summary.roleLabel")}</label>
          <select
            className="input"
            value={summaryRole}
            onChange={(e) => setSummaryRole(e.target.value as FileSummaryRole)}
            style={{ minWidth: 180 }}
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

      <div className="card logs-filters-card" style={wideCardStyle}>
        <div className="grid cols2" style={{ gap: 14 }}>
          <div>
            <label className="label">{t("filters.actor")}</label>
            <input
              className="input"
              list="logs-actors"
              value={filters.actor}
              onChange={(e) => setFilter("actor", e.target.value)}
              placeholder={t("filters.all")}
            />
            <datalist id="logs-actors">
              {distinctActors.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="label">{t("filters.action")}</label>
            <input
              className="input"
              list="logs-actions"
              value={filters.action}
              onChange={(e) => setFilter("action", e.target.value)}
              placeholder={t("filters.all")}
            />
            <datalist id="logs-actions">
              {distinctActions.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
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

      <div className="card logs-table-card" style={wideCardStyle}>
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
