import React from "react";
import { useTranslation } from "react-i18next";
import { createUser, deactivateUser, listUsers, updateUser, type AdminUser } from "../lib/api";

type SortDir = "asc" | "desc";
type SortKey = "id" | "email" | "name" | "role" | "is_online" | "email_verified" | "admin_approved";

export default function Users() {
  const { t } = useTranslation("users");

  const [items, setItems] = React.useState<AdminUser[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [pendingRejectId, setPendingRejectId] = React.useState<number | null>(null);
  const inFlight = React.useRef(false);
  const [sortState, setSortState] = React.useState<{ key: SortKey; dir: SortDir }>({ key: "id", dir: "asc" });

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

  const sortedItems = React.useMemo(() => {
    const arr = [...items];

    arr.sort((a, b) => {
      const valueFor = (user: AdminUser) => {
        if (sortState.key === "name") {
          return `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim().toLocaleLowerCase("el-GR");
        }

        const value = user[sortState.key];

        if (typeof value === "string") return value.toLocaleLowerCase("el-GR");
        if (typeof value === "boolean") return Number(value);
        return value ?? "";
      };

      const av = valueFor(a);
      const bv = valueFor(b);

      if (av < bv) return sortState.dir === "asc" ? -1 : 1;
      if (av > bv) return sortState.dir === "asc" ? 1 : -1;
      return 0;
    });

    return arr;
  }, [items, sortState]);

  function toggleSort(key: SortKey) {
    setSortState((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
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
            <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AdminUser["role"] }))}>
              <option value="secretariat">secretariat</option>
              <option value="super_admin">super_admin</option>
            </select>
          </div>
          <div className="users-password-field" style={{ gridColumn: "span 2" }}>
            <label className="label">{t("labels.passwordStrong")}</label>
            <input className="input" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            <div className="muted" style={{ whiteSpace: "pre-line" }}>{t("labels.passwordHint")}</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={onCreate}>
            {t("actions.create")}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("id")}>{t("table.id")}</th>
                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("email")}>{t("table.email")}</th>
                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("name")}>{t("table.name")}</th>
                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("role")}>{t("table.role")}</th>
                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("is_online")}>{t("table.online")}</th>
                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("email_verified")}>{t("table.verified")}</th>
                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("admin_approved")}>{t("table.approved")}</th>
                <th>{t("table.deactivate")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((u) => (
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
                    <span>{u.email_verified ? t("status.yes") : t("status.no")}</span>
                  </td>
                  <td>
                    {u.admin_approved ? (
                      <span>{t("status.yes")}</span>
                    ) : pendingRejectId === u.id ? (
                      <div className="row-actions" style={{ flexWrap: "wrap", gap: 8 }}>
                        <span className="muted">{t("confirm.rejectPrompt")}</span>
                        <button
                          className="btn"
                          onClick={async () => {
                            await deactivateUser(u.id);
                            setPendingRejectId(null);
                            await load();
                          }}
                        >
                          {t("status.yes")}
                        </button>
                        <button className="btn primary" onClick={() => setPendingRejectId(null)}>
                          {t("status.no")}
                        </button>
                      </div>
                    ) : (
                      <div className="row-actions">
                        <button
                          className="btn primary"
                          onClick={async () => {
                            await updateUser(u.id, { admin_approved: true });
                            await load();
                          }}
                        >
                          {t("status.yes")}
                        </button>
                        <button className="btn" onClick={() => setPendingRejectId(u.id)}>
                          {t("status.no")}
                        </button>
                      </div>
                    )}
                  </td>
                  <td>
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
                  <td colSpan={8} className="muted">
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
