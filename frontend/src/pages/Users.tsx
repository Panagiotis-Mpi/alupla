import React from "react";
import { useTranslation } from "react-i18next";
import { createUser, deactivateUser, listUsers, updateUser, type AdminUser } from "../lib/api";
import { compareSortValues, sortIndicator } from "./shared/sorting";
import Icon from "../components/Icon";
import userIcon from "../assets/icons/user.svg";
import shieldIcon from "../assets/icons/shield-half.svg";

type SortDir = "asc" | "desc";
type SortKey = "id" | "email" | "name" | "role" | "is_online";

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
  password: ""
};

const clickableHeaderStyle: React.CSSProperties = { cursor: "pointer", userSelect: "none", fontWeight: 500 };
const inlineSelectStyle: React.CSSProperties = { padding: 6, minWidth: 130 };
const monospaceBadgeStyle: React.CSSProperties = { fontFamily: "monospace" };
const passwordFieldStyle: React.CSSProperties = { gridColumn: "span 2" };
const passwordHintStyle: React.CSSProperties = { whiteSpace: "pre-line" };
const topSpacingStyle: React.CSSProperties = { marginTop: 12 };
const errorCardStyle: React.CSSProperties = { borderColor: "#b00020", color: "#b00020" };
const successCardStyle: React.CSSProperties = { borderColor: "#bfdbfe", color: "#1d4ed8" };

type SortState = { key: SortKey; dir: SortDir };

type RoleSelectProps = {
  value: AdminUser["role"];
  labelSecretariat: string;
  labelSuperAdmin: string;
  onChange: (value: AdminUser["role"]) => void | Promise<void>;
};

function userFullName(user: Pick<AdminUser, "first_name" | "last_name">) {
  return `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
}

function sortValue(user: AdminUser, key: SortKey) {
  return key === "name" ? userFullName(user) : user[key];
}

function nextSortState(state: SortState, key: SortKey): SortState {
  return state.key === key ? { key, dir: state.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" };
}

function RoleSelect({ value, labelSecretariat, labelSuperAdmin, onChange }: RoleSelectProps) {
  return (
    <select
      className="input"
      style={inlineSelectStyle}
      value={value}
      onChange={(event) => void onChange(event.target.value as AdminUser["role"])}
    >
      <option value="secretariat">{labelSecretariat}</option>
      <option value="super_admin">{labelSuperAdmin}</option>
    </select>
  );
}

export default function Users() {
  const { t, i18n } = useTranslation("users");

  const [items, setItems] = React.useState<AdminUser[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);
  const inFlight = React.useRef(false);
  const [sortState, setSortState] = React.useState<SortState>({ key: "id", dir: "asc" });
  const [form, setForm] = React.useState<UserFormState>(emptyForm);

  const roleLabels = React.useMemo(() => ({
    secretariat: t("roles.secretariat"),
    superAdmin: t("roles.superAdmin")
  }), [t]);

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
      setOk(null);
      const response = await createUser({ ...form, language: i18n.language });
      setOk(response.mail_sent ? t("messages.createdWithEmail") : t("messages.createdWithoutEmail"));
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

  async function onDeactivate(userId: number) {
    if (!confirm(t("confirm.deactivate", { id: userId }))) return;
    await deactivateUser(userId);
    await load();
  }

  const sortedItems = React.useMemo(() => {
    return [...items].sort((left, right) => compareSortValues(sortValue(left, sortState.key), sortValue(right, sortState.key), sortState.dir));
  }, [items, sortState]);

  function toggleSort(key: SortKey) {
    setSortState((state) => nextSortState(state, key));
  }

  function getSortArrow(key: SortKey) {
    return sortIndicator(sortState.key, key, sortState.dir);
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>{t("title")}</h2>
        <span className="badge">{loading ? t("badgeLoading") : t("badgeCount", { count: items.length })}</span>
      </div>

      {err && <div className="card" style={errorCardStyle}>{err}</div>}
      {ok && <div className="card" style={successCardStyle}>{ok}</div>}

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
              <option value="secretariat">{roleLabels.secretariat}</option>
              <option value="super_admin">{roleLabels.superAdmin}</option>
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
            <Icon src={userIcon} size={18} />
            <span>{t("actions.create")}</span>
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table" style={{ minWidth: 780 }}>
            <thead>
              <tr>
                <th style={clickableHeaderStyle} onClick={() => toggleSort("id")}>{t("table.id")}{getSortArrow("id")}</th>
                <th style={clickableHeaderStyle} onClick={() => toggleSort("email")}>{t("table.email")}{getSortArrow("email")}</th>
                <th style={clickableHeaderStyle} onClick={() => toggleSort("name")}>{t("table.name")}{getSortArrow("name")}</th>
                <th style={clickableHeaderStyle} onClick={() => toggleSort("role")}>{t("table.role")}{getSortArrow("role")}</th>
                <th style={clickableHeaderStyle} onClick={() => toggleSort("is_online")}>{t("table.online")}{getSortArrow("is_online")}</th>
                <th>{t("table.deactivate")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.email}</td>
                  <td>{userFullName(user)}</td>
                  <td>
                    <RoleSelect
                      value={user.role}
                      labelSecretariat={roleLabels.secretariat}
                      labelSuperAdmin={roleLabels.superAdmin}
                      onChange={(role) => onRoleChange(user.id, role)}
                    />
                  </td>
                  <td>
                    <span className="badge" title={user.last_seen_at ?? ""} style={monospaceBadgeStyle}>
                      {user.is_online ? t("status.online") : t("status.offline")}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn danger"
                      onClick={() => void onDeactivate(user.id)}
                    >
                      <Icon src={shieldIcon} size={17} />
                      <span>{t("actions.deactivate")}</span>
                    </button>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan={6} className="muted">
                    {loading ? t("table.loading") : t("table.none")}
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
