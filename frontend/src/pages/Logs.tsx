import React from "react";
import { useTranslation } from "react-i18next";
import { listActivityLogs, activityLogsExportUrl, type ActivityLog } from "../lib/api";

export default function Logs() {
  const { t } = useTranslation("logs");

  const [items, setItems] = React.useState<ActivityLog[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const PAGE_SIZE = 20;
  const [page, setPage] = React.useState(1);

  const [filters, setFilters] = React.useState({
    level: "",
    actor: "",
    action: "",
    resource: ""
  });

  function actorLabel(l: any): string {
    const fn = (l?.user?.first_name ?? "").trim();
    const ln = (l?.user?.last_name ?? "").trim();
    const full = `${fn} ${ln}`.trim();
    if (full) return full;
    return "Σύστημα";
  }

  function toGreekAction(v: any): string {
    const key = String(v ?? "").trim();
    const map: Record<string, string> = {
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
    };
    return map[key] ?? key.replace(/_/g, " ");
  }

  function toGreekResource(v: any): string {
    const key = String(v ?? "").trim();
    const map: Record<string, string> = {
      user: "Χρήστης",
      users: "Χρήστες",
      graduate: "Απόφοιτος",
      graduates: "Απόφοιτοι",
      system: "Σύστημα",
      statistics: "Στατιστικά",
      map: "Χάρτης",
      logs: "Logs"
    };
    return map[key] ?? key;
  }

  function toGreekDetailKey(key: string): string {
    const map: Record<string, string> = {
      file: "Αρχείο",
      total_rows: "Σύνολο γραμμών",
      inserted: "Εισήχθησαν",
      updated: "Ενημερώθηκαν",
      skipped: "Παραλείφθηκαν",
      errors: "Σφάλματα",
      changed: "Αλλαγμένα πεδία",
      admin_approved: "Έγκριση διαχειριστή",
      email_verified: "Επαλήθευση email",
      is_active: "Ενεργός",
      first_name: "Όνομα",
      last_name: "Επώνυμο",
      role: "Ρόλος",
      email: "Email",
      user_id: "ID χρήστη",
      graduate_id: "ID αποφοίτου",
      id: "ID",
      reason: "Αιτία",
      token: "Token",
      entity_type: "Αντικείμενο",
      action: "Ενέργεια",
      count: "Πλήθος"
    };
    return map[key] ?? key.replaceAll("_", " ");
  }

  function toGreekRoleValue(value: string): string {
    const map: Record<string, string> = {
      super_admin: "Super Admin",
      secretariat: "Γραμματεία"
    };
    return map[value] ?? value;
  }

  function toGreekSimpleValue(value: any): string {
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "boolean") return value ? "Ναι" : "Όχι";
    if (typeof value === "number") return String(value);
    const raw = String(value).trim();

    if (raw === "true") return "Ναι";
    if (raw === "false") return "Όχι";
    if (raw === "super_admin" || raw === "secretariat") return toGreekRoleValue(raw);
    if (["user","users","graduate","graduates","system","statistics","map","logs"].includes(raw)) {
      return toGreekResource(raw);
    }
    if ([
      "login","logout","upload","import_graduates","export_graduates","export_csv","export_xlsx","export_pdf",
      "map_export","statistics_export","create_user","update_user","reject_user","approve_user",
      "deactivate_user","delete_user","διαγραφή χρήστη","create_graduate","update_graduate","delete_graduate"
    ].includes(raw)) {
      return toGreekAction(raw);
    }

    return raw;
  }

  function toGreekDetails(v: any): string {
    if (v === null || v === undefined || v === "") return "";

    let parsed = v;
    if (typeof v === "string") {
      const raw = v.trim();
      if (!raw) return "";
      if ((raw.startsWith("{") && raw.endsWith("}")) || (raw.startsWith("[") && raw.endsWith("]"))) {
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
      } else {
        parsed = raw;
      }
    }

    if (Array.isArray(parsed)) {
      return parsed.map((item) => toGreekSimpleValue(item)).filter(Boolean).join(", ");
    }

    if (typeof parsed !== "object") {
      return toGreekSimpleValue(parsed);
    }

    const obj = parsed as Record<string, any>;

    if (Array.isArray(obj.changed)) {
      return `${toGreekDetailKey("changed")}: ${obj.changed.map((k: string) => toGreekDetailKey(String(k))).join(", ")}`;
    }

    const orderedKeys = [
      "file",
      "total_rows",
      "inserted",
      "updated",
      "skipped",
      "errors",
      "email",
      "role",
      "reason",
      "count",
      "user_id",
      "graduate_id",
      "id"
    ];

    const parts: string[] = [];

    for (const key of orderedKeys) {
      if (!(key in obj)) continue;
      const value = obj[key];
      if (value === null || value === undefined || value === "") continue;

      if (Array.isArray(value)) {
        const formattedArray = value.map((item) => toGreekSimpleValue(item)).filter(Boolean).join(", ");
        if (formattedArray) parts.push(`${toGreekDetailKey(key)}: ${formattedArray}`);
        continue;
      }

      if (typeof value === "object") {
        const nested = Object.entries(value)
          .map(([nestedKey, nestedValue]) => `${toGreekDetailKey(nestedKey)}: ${toGreekSimpleValue(nestedValue)}`)
          .join(", ");
        if (nested) parts.push(`${toGreekDetailKey(key)}: ${nested}`);
        continue;
      }

      parts.push(`${toGreekDetailKey(key)}: ${toGreekSimpleValue(value)}`);
    }

    for (const [key, value] of Object.entries(obj)) {
      if (orderedKeys.includes(key)) continue;
      if (key === "changed" && Array.isArray(value)) continue;
      if (value === null || value === undefined || value === "") continue;

      if (Array.isArray(value)) {
        const formattedArray = value.map((item) => toGreekSimpleValue(item)).filter(Boolean).join(", ");
        if (formattedArray) parts.push(`${toGreekDetailKey(key)}: ${formattedArray}`);
        continue;
      }

      if (typeof value === "object") {
        const nested = Object.entries(value)
          .map(([nestedKey, nestedValue]) => `${toGreekDetailKey(nestedKey)}: ${toGreekSimpleValue(nestedValue)}`)
          .join(", ");
        if (nested) parts.push(`${toGreekDetailKey(key)}: ${nested}`);
        continue;
      }

      parts.push(`${toGreekDetailKey(key)}: ${toGreekSimpleValue(value)}`);
    }

    return parts.join(" • ");
  }

  const actionForApi = (filters.level || filters.action).trim();
  const resourceForApi = filters.resource.trim();

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await listActivityLogs({
        action: actionForApi || undefined,
        entity_type: resourceForApi || undefined
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
      const v = String((l as any)?.action ?? "").trim();
      if (v) s.add(v);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const distinctActors = React.useMemo(() => {
    const s = new Set<string>();
    for (const l of items) {
      const v = actorLabel(l);
      if (v) s.add(v);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items]);

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
      const action = toGreekAction(l?.action ?? "").toLowerCase();
      const resource = toGreekResource(l?.entity_type ?? "").toLowerCase();

      if (actorNeedle && !actor.includes(actorNeedle)) return false;
      if (resourceNeedle && !resource.includes(resourceNeedle)) return false;
      if (levelNeedle && !action.includes(levelNeedle)) return false;
      if (actionNeedle && !action.includes(actionNeedle)) return false;

      return true;
    });
  }, [items, filters.actor, filters.action, filters.level, filters.resource]);

  const summary = React.useMemo(() => {
    const s = {
      uploads_auth: 0, uploads_anon: 0,
      downloads_auth: 0, downloads_anon: 0,
      map_auth: 0, map_anon: 0,
      stats_auth: 0, stats_anon: 0
    };
    for (const l of items) {
      const action = String((l as any)?.action ?? "");
      const isAnon = !l?.user;
      if (action === "import_graduates" || action === "upload") {
        if (isAnon) s.uploads_anon++; else s.uploads_auth++;
      }
      if (action.includes("export")) {
        if (isAnon) s.downloads_anon++; else s.downloads_auth++;
      }
      if (action === "map_export") {
        if (isAnon) s.map_anon++; else s.map_auth++;
      }
      if (action === "statistics_export") {
        if (isAnon) s.stats_anon++; else s.stats_auth++;
      }
    }
    return s;
  }, [items]);

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

  function onExport() {
    const url = activityLogsExportUrl({
      action: actionForApi || undefined,
      entity_type: resourceForApi || undefined
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
          {loading ? t("badgeLoading") : t("badgeCount", { count: filteredItems.length })}
        </span>
        <button className="btn" onClick={onExport}>
          {t("actions.exportCsv")}
        </button>
        <div className="spacer" />
      </div>

      {err && (
        <div className="card" style={{ borderColor: "#b00020", color: "#b00020" }}>
          {err}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t("summary.title")}</h3>
          <table className="table">
            <thead>
              <tr><th>{t("summary.activity")}</th><th>{t("summary.authenticated")}</th><th>{t("summary.anonymous")}</th></tr>
            </thead>
            <tbody>
              <tr><td>{t("summary.fileUploads")}</td><td>{summary.uploads_auth}</td><td>{summary.uploads_anon}</td></tr>
              <tr><td>{t("summary.fileDownloads")}</td><td>{summary.downloads_auth}</td><td>{summary.downloads_anon}</td></tr>
              <tr><td>{t("summary.mapDownloads")}</td><td>{summary.map_auth}</td><td>{summary.map_anon}</td></tr>
              <tr><td>{t("summary.statisticsDownloads")}</td><td>{summary.stats_auth}</td><td>{summary.stats_anon}</td></tr>
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
                onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))}
                placeholder={t("filters.all")}
              />
              <datalist id="logs-levels">
                {distinctActions.map((v) => (
                  <option key={v} value={toGreekAction(v)} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="label">{t("filters.actor")}</label>
              <input
                className="input"
                list="logs-actors"
                value={filters.actor}
                onChange={(e) => setFilters((f) => ({ ...f, actor: e.target.value }))}
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
                onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
                placeholder={t("filters.all")}
              />
              <datalist id="logs-actions">
                {distinctActions.map((v) => (
                  <option key={v} value={toGreekAction(v)} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="label">{t("filters.resource")}</label>
              <input
                className="input"
                list="logs-resources"
                value={filters.resource}
                onChange={(e) => setFilters((f) => ({ ...f, resource: e.target.value }))}
                placeholder={t("filters.all")}
              />
              <datalist id="logs-resources">
                {distinctResources.map((v) => (
                  <option key={v} value={toGreekResource(v)} />
                ))}
              </datalist>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
            <button className="btn" onClick={() => void load()}>
              {t("filters.search")}
            </button>
            <button
              className="btn"
              onClick={() => {
                setFilters({ level: "", actor: "", action: "", resource: "" });
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
              aria-label="Previous"
            >
              ◀
            </button>
            <span className="badge" style={{ minWidth: 44, textAlign: "center" }}>
              {pageSafe}
            </span>
            <button
              className="btn"
              style={{ paddingLeft: 12, paddingRight: 12 }}
              disabled={pageSafe >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next"
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <table className="table">
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
                <td>{toGreekAction(l.action)}</td>
                <td>{actorLabel(l)}</td>
                <td>{toGreekAction(l.action)}</td>
                <td>{toGreekResource(l.entity_type ?? "")}</td>
                <td style={{ maxWidth: 520, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {toGreekDetails(l.details)}
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
  );
}
