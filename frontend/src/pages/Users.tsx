import React from "react";
import { createUser, deactivateUser, listUsers, updateUser, type AdminUser } from "../lib/api";

export default function Users() {
  const [items, setItems] = React.useState<AdminUser[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "secretariat" as AdminUser["role"],
    password: ""
  });

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await listUsers();
      setItems(data.items);
    } catch (e: any) {
      setErr(e?.response?.data?.error?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();

    // refresh list every 5s so Online status is "live"
    const t = window.setInterval(() => {
      load().catch(() => {});
    }, 5000);

    return () => window.clearInterval(t);
  }, []);

  async function onCreate() {
    try {
      await createUser(form);
      setForm({ first_name: "", last_name: "", email: "", role: "secretariat", password: "" });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error?.message ?? "Error");
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>Χρήστες</h2>
        <span className="badge">{loading ? "loading..." : `${items.length} χρήστες`}</span>
      </div>

      {err && (
        <div className="card" style={{ borderColor: "#b00020", color: "#b00020" }}>
          {err}
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Νέος χρήστης</h3>
        <div className="grid cols3">
          <div>
            <label className="label">Όνομα</label>
            <input className="input" value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Επώνυμο</label>
            <input className="input" value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">Ρόλος</label>
            <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as any }))}>
              <option value="secretariat">secretariat</option>
              <option value="super_admin">super_admin</option>
            </select>
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label className="label">Password (strong)</label>
            <input className="input" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            <div className="muted">8+ chars, letter + number + symbol</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={onCreate}>
            Create
          </button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Όνομα</th>
              <th>Ρόλος</th>
              <th>Online</th>
              <th>Active</th>
              <th>Verified</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.email}</td>
                <td>
                  {u.first_name} {u.last_name}
                </td>
                <td>
                  <select
                    className="input"
                    style={{ padding: 6 }}
                    value={u.role}
                    onChange={async (e) => {
                      const role = e.target.value as AdminUser["role"];
                      await updateUser(u.id, { role });
                      await load();
                    }}
                  >
                    <option value="secretariat">secretariat</option>
                    <option value="super_admin">super_admin</option>
                  </select>
                </td>
                <td>
                  <span className="badge" title={u.last_seen_at ?? ""} style={{ fontFamily: "monospace" }}>
                    {u.is_online ? "● online" : "○ offline"}
                  </span>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={u.is_active}
                    onChange={async (e) => {
                      await updateUser(u.id, { is_active: e.target.checked });
                      await load();
                    }}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={u.email_verified}
                    onChange={async (e) => {
                      await updateUser(u.id, { email_verified: e.target.checked });
                      await load();
                    }}
                  />
                </td>
                <td className="row-actions">
                  <button
                    className="btn danger"
                    onClick={async () => {
                      if (!confirm(`Deactivate user #${u.id}?`)) return;
                      await deactivateUser(u.id);
                      await load();
                    }}
                  >
                    Deactivate
                  </button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={8} className="muted">
                  Δεν υπάρχουν χρήστες.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
