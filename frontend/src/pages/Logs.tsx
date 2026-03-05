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
    return "system";
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
      setItems(data.items ?? data); // συμβατό αν backend επιστρέφει items ή array
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

    // Note: action/resource may already be filtered server-side via actionForApi/resourceForApi.
    return items.filter((l: any) => {
      const actor = actorLabel(l).toLowerCase();
      const action = String(l?.action ?? "").toLowerCase();
      const resource = String(l?.entity_type ?? "").toLowerCase();

      if (actorNeedle && !actor.includes(actorNeedle)) return false;
      if (resourceNeedle && !resource.includes(resourceNeedle)) return false;

      // Allow both "Level" and "Action" boxes to constrain the same underlying action field.
      if (levelNeedle && !action.includes(levelNeedle)) return false;
      if (actionNeedle && !action.includes(actionNeedle)) return false;

      return true;
    });
  }, [items, filters.actor, filters.action, filters.level, filters.resource]);

  
  const summary = React.useMemo(() => {
    const s = {
      uploads_auth:0, uploads_anon:0,
      downloads_auth:0, downloads_anon:0,
      map_auth:0, map_anon:0,
      stats_auth:0, stats_anon:0
    };
    for(const l of items){
      const action=String((l as any)?.action ?? "");
      const isAnon=!l?.user;
      if(action==="import_graduates" || action==="upload"){
        if(isAnon) s.uploads_anon++; else s.uploads_auth++;
      }
      if(action.includes("export")){
        if(isAnon) s.downloads_anon++; else s.downloads_auth++;
      }
      if(action==="map_export"){
        if(isAnon) s.map_anon++; else s.map_auth++;
      }
      if(action==="statistics_export"){
        if(isAnon) s.stats_anon++; else s.stats_auth++;
      }
    }
    return s;
  },[items]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const startIdx = (pageSafe - 1) * PAGE_SIZE;
  const pagedItems = filteredItems.slice(startIdx, startIdx + PAGE_SIZE);

  React.useEffect(() => {
    // clamp page if data size changes
    if (page !== pageSafe) setPage(pageSafe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredItems.length]);

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onExport() {
    // Export respects server-side filters only (action/entity_type). Actor is client-only.
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

      
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
  <div className="card">
    <h3 style={{marginTop:0}}>Activity Summary</h3>
    <table className="table">
      <thead>
        <tr><th>Activity</th><th>Authenticated</th><th>Anonymous</th></tr>
      </thead>
      <tbody>
        <tr><td>File uploads</td><td>{summary.uploads_auth}</td><td>{summary.uploads_anon}</td></tr>
        <tr><td>File downloads</td><td>{summary.downloads_auth}</td><td>{summary.downloads_anon}</td></tr>
        <tr><td>Map downloads</td><td>{summary.map_auth}</td><td>{summary.map_anon}</td></tr>
        <tr><td>Statistics downloads</td><td>{summary.stats_auth}</td><td>{summary.stats_anon}</td></tr>
      </tbody>
    </table>
  </div>

  <div className="card">
        <div className="grid cols2">

          <div>
            <label className="label">Level</label>
            <input
              className="input"
              list="logs-levels"
              value={filters.level}
              onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))}
              placeholder={t("filters.all")}
            />
            <datalist id="logs-levels">
              {distinctActions.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="label">Actor</label>
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
            <label className="label">Action</label>
            <input
              className="input"
              list="logs-actions"
              value={filters.action}
              onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
              placeholder={t("filters.all")}
            />
            <datalist id="logs-actions">
              {distinctActions.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="label">Resource</label>
            <input
              className="input"
              list="logs-resources"
              value={filters.resource}
              onChange={(e) => setFilters((f) => ({ ...f, resource: e.target.value }))}
              placeholder={t("filters.all")}
            />
            <datalist id="logs-resources">
              {distinctResources.map((v) => (
                <option key={v} value={v} />
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
                <td>{l.action}</td>
                <td>{actorLabel(l)}</td>
                <td>{l.action}</td>
                <td>{l.entity_type ?? ""}</td>
                <td style={{ maxWidth: 520, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {typeof l.details === "object" ? JSON.stringify(l.details) : l.details}
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
