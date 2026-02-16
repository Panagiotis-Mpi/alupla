import React from "react";
import { activityLogsExportUrl, listActivityLogs, type ActivityLog } from "../lib/api";

export default function Logs() {
  const [items, setItems] = React.useState<ActivityLog[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const [filters, setFilters] = React.useState({
    q: "",
    user_id: "",
    action: "",
    entity_type: "",
    page: 1,
    pageSize: 50
  });

  async function load() {
    setLoading(true);
    try {
      const params: any = { page: filters.page, pageSize: filters.pageSize };
      if (filters.q.trim()) params.q = filters.q.trim();
      if (filters.user_id) params.user_id = Number(filters.user_id);
      if (filters.action.trim()) params.action = filters.action.trim();
      if (filters.entity_type.trim()) params.entity_type = filters.entity_type.trim();

      const data = await listActivityLogs(params);
      setItems(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, [filters.page, filters.pageSize]);

  const exportUrl = activityLogsExportUrl({
    q: filters.q.trim() || undefined,
    user_id: filters.user_id || undefined,
    action: filters.action.trim() || undefined,
    entity_type: filters.entity_type.trim() || undefined
  });

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>Logs</h2>
        <span className="badge">{loading ? "loading..." : `${total} σύνολο`}</span>
        <div className="spacer" />
        <a className="btn" href={exportUrl}>
          Export CSV
        </a>
      </div>

      <div className="card">
        <div className="grid cols3">
          <div>
            <label className="label">Search (q)</label>
            <input className="input" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
          </div>
          <div>
            <label className="label">user_id</label>
            <input className="input" value={filters.user_id} onChange={(e) => setFilters((f) => ({ ...f, user_id: e.target.value }))} />
          </div>
          <div>
            <label className="label">action</label>
            <input className="input" value={filters.action} onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))} />
          </div>
          <div>
            <label className="label">entity_type</label>
            <input className="input" value={filters.entity_type} onChange={(e) => setFilters((f) => ({ ...f, entity_type: e.target.value }))} />
          </div>
          <div>
            <label className="label">pageSize</label>
            <select className="input" value={filters.pageSize} onChange={(e) => setFilters((f) => ({ ...f, pageSize: Number(e.target.value), page: 1 }))}>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "end", gap: 10 }}>
            <button
              className="btn"
              onClick={() => {
                setFilters((f) => ({ ...f, page: 1 }));
                void load();
              }}
            >
              Apply
            </button>
            <button
              className="btn"
              onClick={() => {
                setFilters({ q: "", user_id: "", action: "", entity_type: "", page: 1, pageSize: 50 });
                setTimeout(() => void load(), 0);
              }}
            >
              Reset
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button className="btn" disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>
            ◀
          </button>
          <span className="badge">page {filters.page}</span>
          <button
            className="btn"
            disabled={filters.page * filters.pageSize >= total}
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
          >
            ▶
          </button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>time</th>
              <th>user</th>
              <th>action</th>
              <th>entity</th>
              <th>details</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id}>
                <td>{String(l.created_at).replace("T", " ").slice(0, 19)}</td>
                <td>{l.user_id ?? ""}</td>
                <td>{l.action}</td>
                <td>
                  {l.entity_type ?? ""} #{l.entity_id ?? ""}
                </td>
                <td>
                  <code style={{ fontSize: 12 }}>{JSON.stringify(l.details ?? null)}</code>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={5} className="muted">
                  Δεν υπάρχουν logs.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
