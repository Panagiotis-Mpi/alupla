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
    q: "",
    level: ""
  });

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await listActivityLogs(filters);
      setItems(data.items ?? data); // συμβατό αν backend επιστρέφει items ή array
      setPage(1);
    } catch (e: any) {
      setErr(e?.message ?? t("error"));
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const startIdx = (pageSafe - 1) * PAGE_SIZE;
  const pagedItems = items.slice(startIdx, startIdx + PAGE_SIZE);

  React.useEffect(() => {
    // clamp page if data size changes
    if (page !== pageSafe) setPage(pageSafe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onExport() {
    const url = activityLogsExportUrl(filters);
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
          {loading ? t("badgeLoading") : t("badgeCount", { count: items.length })}
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

      <div className="card">
        <div className="grid cols2">
          <div>
            <label className="label">{t("filters.q")}</label>
            <input
              className="input"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder={t("filters.qPlaceholder")}
            />
          </div>

          <div>
            <label className="label">{t("filters.level")}</label>
            <select
              className="input"
              value={filters.level}
              onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))}
            >
              <option value="">{t("filters.all")}</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
          <button className="btn" onClick={() => void load()}>
            {t("filters.search")}
          </button>
          <button
            className="btn"
            onClick={() => {
              setFilters({ q: "", level: "" });
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
                <td>{l.user_email ?? ""}</td>
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
