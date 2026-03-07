import React from "react";
import { useTranslation } from "react-i18next";
import { approveUser, createUser, deactivateUser, listUsers, rejectUser, updateUser, type AdminUser } from "../lib/api";

export default function Users() {
  const { t } = useTranslation("users");

  const [items, setItems] = React.useState<AdminUser[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // Avoid overlapping refreshes (auto-refresh + manual refresh after actions)
  const inFlight = React.useRef(false);

  const [form, setForm] = React.useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "secretariat" as AdminUser["role"],
    password: ""
  });

  async function load() {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setErr(null);
    try {
      const data = await listUsers();
      setItems(data.items);
    } catch (e: any) {
      setErr(e?.message ?? t("error"));
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  // Auto-refresh so super_admin can see who is active in near real-time.
  React.useEffect(() => {
    const id = window.setInterval(() => {
      void load();
    }, 10_000);
    return () => window.clearInterval(id);
  }, []);

  async function onCreate() {
    try {
      await createUser(form);
      setForm({ first_name: "", last_name: "", email: "", role: "secretariat", password: "" });
      await load();
    } catch (e: any) {
      alert(e?.message ?? t("error"));
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>{t("title")}</h2>
        <span className="badge">{loading ? t("badgeLoading") : t("badgeCount", { count: items.length })}</span>
      </div>

      {err && (
        <div className="card" style={{ borderColor: "#b00020", color: "#b00020" }}>
          {err}
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t("newUser")}</h3>
        <div className="grid cols3">
          <div>
            <label className="label">{t("labels.firstName")}</label>
            <input className="input" value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">{t("labels.lastName")}</label>
            <input className="input" value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">{t("labels.email")}</label>
            <input className="input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">{t("labels.role")}</label>
            <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as any }))}>
              <option value="secretariat">secretariat</option>
              <option value="super_admin">super_admin</option>
            </select>
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label className="label">{t("labels.passwordStrong")}</label>
            <input className="input" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            <div className="muted">{t("labels.passwordHint")}</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={onCreate}>
            {t("actions.create")}
          </button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>{t("table.id")}</th>
              <th>{t("table.email")}</th>
              <th>{t("table.name")}</th>
              <th>{t("table.role")}</th>
              <th>{t("table.online")}</th>
              <th>{t("table.active")}</th>
              <th>{t("table.verified")}</th>
              <th>{t("table.approved")}</th>
              <th>{t("table.actions")}</th>
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
                    {u.is_online ? t("status.online") : t("status.offline")}
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
                <td>{u.admin_approved ? t("status.yes") : t("status.no")}</td>
                <td className="row-actions">
                  {!u.admin_approved && (
                    <button
                      className="btn primary"
                      onClick={async () => {
                        await approveUser(u.id);
                        await load();
                      }}
                    >
                      {t("actions.approve")}
                    </button>
                  )}
                  <button
                    className="btn"
                    onClick={async () => {
                      if (!confirm(t("confirm.reject", { id: u.id }))) return;
                      await rejectUser(u.id);
                      await load();
                    }}
                  >
                    {t("actions.reject")}
                  </button>
                  <button
                    className="btn danger"
                    onClick={async () => {
                      if (!confirm(t("confirm.deactivate", { id: u.id }))) return;
                      await deactivateUser(u.id);
                      await load();
                    }}
                  >
                    {t("actions.deactivate")}
                  </button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={9} className="muted">
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
