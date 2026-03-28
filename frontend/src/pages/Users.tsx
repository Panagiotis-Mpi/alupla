import React from "react";
import { useTranslation } from "react-i18next";
import { createUser, deactivateUser, listUsers, updateUser, type AdminUser } from "../lib/api";

type SortDir = "asc" | "desc";
type SortKey = "id" | "email" | "name" | "role" | "is_online" | "email_verified" | "admin_approved";

type UserFormState = {
  first_name: string;
  last_name: string;
  email: string;
  role: AdminUser["role"];
  password: string;
};

const emptyForm: UserFormState = {
  first_name: "",
  last_name: "",
  email: "",
  role: "secretariat",
  password: "",
};

const clickableHeaderStyle: React.CSSProperties = { cursor: "pointer" };
const inlineSelectStyle: React.CSSProperties = { padding: 6 };
const monospaceBadgeStyle: React.CSSProperties = { fontFamily: "monospace" };
const wrappedRowActionsStyle: React.CSSProperties = { flexWrap: "wrap", gap: 8 };
const passwordFieldStyle: React.CSSProperties = { gridColumn: "span 2" };
const passwordHintStyle: React.CSSProperties = { whiteSpace: "pre-line" };
const topSpacingStyle: React.CSSProperties = { marginTop: 12 };
const errorCardStyle: React.CSSProperties = { borderColor: "#b00020", color: "#b00020" };

function fullNameOf(user: AdminUser) {
  return `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
}

function sortValueOf(user: AdminUser, key: SortKey) {
  if (key === "name") return fullNameOf(user);
  return user[key];
}

export default function Users() {
  const { t } = useTranslation("users");

  const [items, setItems] = React.useState<AdminUser[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [pendingRejectId, setPendingRejectId] = React.useState<number | null>(null);
  const inFlight = React.useRef(false);
  const [sortState, setSortState] = React.useState<{ key: SortKey; dir: SortDir }>({ key: "id", dir: "asc" });
  const [form, setForm] = React.useState<UserFormState>(emptyForm);

  const setFormValue = <K extends keyof UserFormState>(key: K, value: UserFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

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
      setForm(emptyForm);
      await load();
    } catch (e: any) {
      alert(e?.message ?? t("error"));
    }
  }

  async function onRoleChange(userId: number, role: AdminUser["role"]) {
    await updateUser(userId, { role });
    await load();
  }

  async function onApprove(userId: number) {
    await updateUser(userId, { admin_approved: true });
    await load();
  }

  async function onReject(userId: number) {
    await deactivateUser(userId);
    setPendingRejectId(null);
    await load();
  }

  async function onDeactivate(userId: number) {
    if (!confirm(t("confirm.deactivate", { id: userId }))) return;
    await deactivateUser(userId);
    await load();
  }

  const sortedItems = React.useMemo(() => {
    const nextItems = [...items];
    nextItems.sort((a, b) => {
      const av = sortValueOf(a, sortState.key);
      const bv = sortValueOf(b, sortState.key);

      if (av == null && bv == null) return 0;
      if (av == null) return -1;
      if (bv == null) return 1;

      if (typeof av === "string" || typeof bv === "string") {
        const result = String(av).localeCompare(String(bv), "el", { sensitivity: "base" });
        return sortState.dir === "asc" ? result : -result;
      }

      if (av < bv) return sortState.dir === "asc" ? -1 : 1;
      if (av > bv) return sortState.dir === "asc" ? 1 : -1;
      return 0;
    });
    return nextItems;
  }, [items, sortState]);

  function toggleSort(key: SortKey) {
    setSortState((state) => (state.key === key ? { key, dir: state.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  function getSortArrow(key: SortKey) {
    if (sortState.key !== key) return "";
    return sortState.dir === "asc" ? " ↑" : " ↓";
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>{t("title")}</h2>
        <span className="badge">{loading ? t("badgeLoading") : t("badgeCount", { count: items.length })}</span>
      </div>

      {err && <div className="card" style={errorCardStyle}>{err}</div>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t("newUser")}</h3>
        <div className="grid cols3">
          <div>
            <label className="label">{t("labels.firstName")}</label>
            <input className="input" value={form.first_name} onChange={(e) => setFormValue("first_name", e.target.value)} />
          </div>
          <div>
            <label className="label">{t("labels.lastName")}</label>
            <input className="input" value={form.last_name} onChange={(e) => setFormValue("last_name", e.target.value)} />
          </div>
          <div>
            <label className="label">{t("labels.email")}</label>
            <input className="input" value={form.email} onChange={(e) => setFormValue("email", e.target.value)} />
          </div>
          <div>
            <label className="label">{t("labels.role")}</label>
            <select className="input" value={form.role} onChange={(e) => setFormValue("role", e.target.value as AdminUser["role"])}>
              <option value="secretariat">{t("roles.secretariat")}</option>
              <option value="super_admin">{t("roles.superAdmin")}</option>
            </select>
          </div>
          <div className="users-password-field" style={passwordFieldStyle}>
            <label className="label">{t("labels.passwordStrong")}</label>
            <input className="input" type="password" value={form.password} onChange={(e) => setFormValue("password", e.target.value)} />
            <div className="muted" style={passwordHintStyle}>{t("labels.passwordHint")}</div>
          </div>
        </div>
        <div style={topSpacingStyle}>
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
                <th style={clickableHeaderStyle} onClick={() => toggleSort("id")}>{t("table.id")}{getSortArrow("id")}</th>
                <th style={clickableHeaderStyle} onClick={() => toggleSort("email")}>{t("table.email")}{getSortArrow("email")}</th>
                <th style={clickableHeaderStyle} onClick={() => toggleSort("name")}>{t("table.name")}{getSortArrow("name")}</th>
                <th style={clickableHeaderStyle} onClick={() => toggleSort("role")}>{t("table.role")}{getSortArrow("role")}</th>
                <th style={clickableHeaderStyle} onClick={() => toggleSort("is_online")}>{t("table.online")}{getSortArrow("is_online")}</th>
                <th style={clickableHeaderStyle} onClick={() => toggleSort("email_verified")}>{t("table.verified")}{getSortArrow("email_verified")}</th>
                <th style={clickableHeaderStyle} onClick={() => toggleSort("admin_approved")}>{t("table.approved")}{getSortArrow("admin_approved")}</th>
                <th>{t("table.deactivate")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.email}</td>
                  <td>{fullNameOf(user)}</td>
                  <td>
                    <select
                      className="input"
                      style={inlineSelectStyle}
                      value={user.role}
                      onChange={async (e) => {
                        await onRoleChange(user.id, e.target.value as AdminUser["role"]);
                      }}
                    >
                      <option value="secretariat">{t("roles.secretariat")}</option>
                      <option value="super_admin">{t("roles.superAdmin")}</option>
                    </select>
                  </td>
                  <td>
                    <span className="badge" title={user.last_seen_at ?? ""} style={monospaceBadgeStyle}>
                      {user.is_online ? t("status.online") : t("status.offline")}
                    </span>
                  </td>
                  <td>
                    <span>{user.email_verified ? t("status.yes") : t("status.no")}</span>
                  </td>
                  <td>
                    {user.admin_approved ? (
                      <span>{t("status.yes")}</span>
                    ) : pendingRejectId === user.id ? (
                      <div className="row-actions" style={wrappedRowActionsStyle}>
                        <span className="muted">{t("confirm.rejectPrompt")}</span>
                        <button
                          className="btn"
                          onClick={async () => {
                            await onReject(user.id);
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
                            await onApprove(user.id);
                          }}
                        >
                          {t("status.yes")}
                        </button>
                        <button className="btn" onClick={() => setPendingRejectId(user.id)}>
                          {t("status.no")}
                        </button>
                      </div>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn danger"
                      onClick={async () => {
                        await onDeactivate(user.id);
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
