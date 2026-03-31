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
  level: string;
  actor: string;
  action: string;
  resource: string;
};

type FileSummaryRole = "secretariat" | "super_admin" | "visitor";
type FileSummaryFileType = "excel" | "csv" | "pdf" | "png";
type FileSummaryPage = "graduates" | "academicData" | "regions" | "statistics" | "map" | "logs";
type FileSummaryItem = {
  page: FileSummaryPage;
  import: Record<FileSummaryFileType, number>;
  export: Record<FileSummaryFileType, number>;
};

const emptyFilters: LogFilters = {
  level: "",
  actor: "",
  action: "",
  resource: "",
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

const resourceLabels = {
  gr: {
    user: "Χρήστης",
    users: "Χρήστες",
    graduate: "Απόφοιτος",
    graduates: "Απόφοιτοι",
    system: "Σύστημα",
    statistics: "Στατιστικά",
    map: "Χάρτης",
    logs: "Καταγραφές"
  },
  en: {
    user: "User",
    users: "Users",
    graduate: "Graduate",
    graduates: "Graduates",
    system: "System",
    statistics: "Statistics",
    map: "Map",
    logs: "Logs"
  }
};

export default function Logs() {
  const { t, i18n } = useTranslation("logs");
  const activeLang = (i18n.resolvedLanguage || i18n.language || "gr").toLowerCase().startsWith("en") ? "en" : "gr";

  const [items, setItems] = React.useState<ActivityLog[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
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

  function toLocalizedResource(v: any): string {
    const key = String(v ?? "").trim();
    return resourceLabels[activeLang][key as keyof (typeof resourceLabels)["gr"]] ?? key;
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

  const actionForApi = (filters.level || filters.action).trim();
  const resourceForApi = filters.resource.trim();

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

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await listActivityLogs({
        action: actionForApi || undefined,
        entity_type: resourceForApi || undefined,
      });
      setItems(data.items ?? data);
      setPage(1);
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

  const distinctResources = React.useMemo(() => {
    const s = new Set<string>();
    for (const l of items) {
      const v = String((l as any)?.entity_type ?? "").trim();
      if (v) s.add(v);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = React.useMemo(() => {
    const actorNeedle = filters.actor.trim().toLowerCase();
    const actionNeedle = filters.action.trim().toLowerCase();
    const levelNeedle = filters.level.trim().toLowerCase();
    const resourceNeedle = filters.resource.trim().toLowerCase();

    return items.filter((l: any) => {
      const actor = actorLabel(l).toLowerCase();
      const action = toLocalizedAction(l?.action ?? "").toLowerCase();
      const resource = toLocalizedResource(l?.entity_type ?? "").toLowerCase();

      if (actorNeedle && !actor.includes(actorNeedle)) return false;
      if (resourceNeedle && !resource.includes(resourceNeedle)) return false;
      if (levelNeedle && !action.includes(levelNeedle)) return false;
      if (actionNeedle && !action.includes(actionNeedle)) return false;

      return true;
    });
  }, [activeLang, items, filters.actor, filters.action, filters.level, filters.resource]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const startIdx = (pageSafe - 1) * PAGE_SIZE;
  const pagedItems = filteredItems.slice(startIdx, startIdx + PAGE_SIZE);

  React.useEffect(() => {
    if (page !== pageSafe) setPage(pageSafe);
  }, [filteredItems.length]);

  React.useEffect(() => {
    void load();
  }, []);

  React.useEffect(() => {
    void loadFileSummary(summaryRole);
  }, [summaryRole]);

  function onExport() {
    const url = activityLogsExportUrl({
      action: actionForApi || undefined,
      entity_type: resourceForApi || undefined,
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
        <span className="badge">
          {loading
            ? t("badgeLoading")
            : t("badgeCount", { count: filteredItems.length })}
        </span>
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

      <div className="grid cols2" style={{ gap: 14 }}>
        <div className="card" style={{ overflowX: "auto" }}>
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
          <table className="table" style={{ minWidth: 860 }}>
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

        <div className="card">
          <div className="grid cols2">
            <div>
              <label className="label">{t("filters.level")}</label>
              <input
                className="input"
                list="logs-levels"
                value={filters.level}
                onChange={(e) => setFilter("level", e.target.value)}
                placeholder={t("filters.all")}
              />
              <datalist id="logs-levels">
                {distinctActions.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>

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

            <div>
              <label className="label">{t("filters.resource")}</label>
              <input
                className="input"
                list="logs-resources"
                value={filters.resource}
                onChange={(e) => setFilter("resource", e.target.value)}
                placeholder={t("filters.all")}
              />
              <datalist id="logs-resources">
                {distinctResources.map((v) => (
                  <option key={v} value={toLocalizedResource(v)} />
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
            }}
          >
            <button className="btn" onClick={() => void load()}>
              {t("filters.search")}
            </button>
            <button
              className="btn"
              onClick={() => {
                setFilters(emptyFilters);
                setTimeout(() => void load(), 0);
              }}
            >
              {t("filters.reset")}
            </button>

            <div className="spacer" />
            <button
              className="btn"
              style={{ paddingLeft: 12, paddingRight: 12 }}
              disabled={pageSafe <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label={t("aria.previous", { ns: "common" })}
            >
              ◀
            </button>
            <span
              className="badge"
              style={{ minWidth: 44, textAlign: "center" }}
            >
              {pageSafe}
            </span>
            <button
              className="btn"
              style={{ paddingLeft: 12, paddingRight: 12 }}
              disabled={pageSafe >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label={t("aria.next", { ns: "common" })}
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      <div className="card logs-table-card" style={wideCardStyle}>
        <div className="table-wrap">
          <table className="table" style={{ minWidth: 1280 }}>
            <thead>
              <tr>
                <th>{t("table.id")}</th>
                <th>{t("table.ts")}</th>
                <th>{t("table.level")}</th>
                <th>{t("table.actor")}</th>
                <th>{t("table.action")}</th>
                <th>{t("table.resource")}</th>
                <th>{t("table.details")}</th>
              </tr>
            </thead>
            <tbody>
              {pagedItems.map((l) => (
                <tr key={l.id}>
                  <td>{l.id}</td>
                  <td style={{ fontFamily: "monospace" }}>{l.created_at}</td>
                  <td>{toLocalizedAction(l.action)}</td>
                  <td>{actorLabel(l)}</td>
                  <td>{toLocalizedAction(l.action)}</td>
                  <td>{toLocalizedResource(l.entity_type ?? "")}</td>
                  <td
                    style={{
                      maxWidth: 520,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {toLocalizedDetails(l.details)}
                  </td>
                </tr>
              ))}

              {!pagedItems.length && (
                <tr>
                  <td colSpan={7} className="muted">
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
