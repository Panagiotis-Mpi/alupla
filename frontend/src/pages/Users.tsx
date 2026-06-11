import React from "react";
import { useTranslation } from "react-i18next";
import {
  createUser,
  deactivateUser,
  exportUsersFile,
  listUsers,
  updateUser,
  type AdminUser,
} from "../lib/api";
import { compareSortValues, sortIndicator } from "./shared/sorting";
import Icon from "../components/Icon";
import { downloadBlob } from "../lib/download";
import { buildExportFilename } from "../lib/exportFilenames";
import userIcon from "../assets/icons/user.svg";
import usersIcon from "../assets/icons/users.svg";
import fileSpreadsheetIcon from "../assets/icons/file-spreadsheet.svg";

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
  password: "",
};

const clickableHeaderStyle: React.CSSProperties = {
  cursor: "pointer",
  userSelect: "none",
  fontWeight: 500,
};
const inlineSelectStyle: React.CSSProperties = { padding: 6, minWidth: 130 };
const monospaceBadgeStyle: React.CSSProperties = { fontFamily: "monospace" };
const passwordFieldStyle: React.CSSProperties = { gridColumn: "span 2" };
const passwordHintStyle: React.CSSProperties = { whiteSpace: "pre-line" };
const topSpacingStyle: React.CSSProperties = { marginTop: 12 };
const errorCardStyle: React.CSSProperties = {
  borderColor: "#b00020",
  color: "#b00020",
};
const successCardStyle: React.CSSProperties = {
  borderColor: "#bfdbfe",
  color: "#1d4ed8",
};
const usersMenuButtonStyle: React.CSSProperties = {
  minHeight: 46,
  justifyContent: "center",
};
const exportDropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  right: 0,
  width: 170,
  background: "#fff",
  border: "1px solid var(--border)",
  borderRadius: 14,
  boxShadow: "0 18px 40px rgba(15,23,42,.16)",
  padding: 8,
  zIndex: 50,
  display: "grid",
  gap: 6,
};

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
  return state.key === key
    ? { key, dir: state.dir === "asc" ? "desc" : "asc" }
    : { key, dir: "asc" };
}

function RoleSelect({
  value,
  labelSecretariat,
  labelSuperAdmin,
  onChange,
}: RoleSelectProps) {
  return (
    <select
      className="input"
      style={inlineSelectStyle}
      value={value}
      onChange={(event) =>
        void onChange(event.target.value as AdminUser["role"])
      }
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
  const [sortState, setSortState] = React.useState<SortState>({
    key: "id",
    dir: "asc",
  });
  const [form, setForm] = React.useState<UserFormState>(emptyForm);
  const [exportMenuOpen, setExportMenuOpen] = React.useState(false);
  const [activePanel, setActivePanel] = React.useState<"list" | "create">(
    "list",
  );
  const exportMenuRef = React.useRef<HTMLDivElement | null>(null);

  const roleLabels = React.useMemo(
    () => ({
      secretariat: t("roles.secretariat"),
      superAdmin: t("roles.superAdmin"),
    }),
    [t],
  );

  const setFormValue = <K extends keyof UserFormState>(
    key: K,
    value: UserFormState[K],
  ) => {
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

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!exportMenuRef.current?.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function onCreate() {
    try {
      setOk(null);
      const response = await createUser({ ...form, language: i18n.language });
      setOk(
        response.mail_sent
          ? t("messages.createdWithEmail")
          : t("messages.createdWithoutEmail"),
      );
      setForm(emptyForm);
      setActivePanel("list");
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

  async function onExport(format: "csv" | "xlsx") {
    setErr(null);
    try {
      const lang = (i18n.resolvedLanguage || i18n.language || "gr")
        .toLowerCase()
        .startsWith("en")
        ? "en"
        : "gr";
      const blob = await exportUsersFile(format, lang);
      await downloadBlob(
        blob,
        buildExportFilename("users", ["all", items.length, "records"], format),
      );
    } catch (e: any) {
      setErr(e?.message ?? t("error"));
    } finally {
      setExportMenuOpen(false);
    }
  }

  const sortedItems = React.useMemo(() => {
    return [...items].sort((left, right) =>
      compareSortValues(
        sortValue(left, sortState.key),
        sortValue(right, sortState.key),
        sortState.dir,
      ),
    );
  }, [items, sortState]);

  function toggleSort(key: SortKey) {
    setSortState((state) => nextSortState(state, key));
  }

  function getSortArrow(key: SortKey) {
    return sortIndicator(sortState.key, key, sortState.dir);
  }

  return (
    <div className="page-stable-shell users-page">
      <div className="card page-header-card" style={{ padding: 14 }}>
        <div style={{ display: "grid", gap: 14 }}>
          <div
            className="mobile-summary-title-row"
            style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}
          >
            <h2 style={{ margin: 0 }}>{t("title")}</h2>
            <span className="badge">
              {loading
                ? t("badgeLoading")
                : t("badgeCount", { count: items.length })}
            </span>
          </div>
          <div
            className="page-header-actions-grid users-actions-grid"
            style={{
              display: "grid",
              gap: 12,
              width: "100%",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            <button
              type="button"
              className={activePanel === "list" ? "btn primary" : "btn"}
              style={usersMenuButtonStyle}
              onClick={() => setActivePanel("list")}
            >
              <Icon src={usersIcon} size={18} />
              <span>{t("title")}</span>
            </button>
            <button
              type="button"
              className={activePanel === "create" ? "btn primary" : "btn"}
              style={usersMenuButtonStyle}
              onClick={() => setActivePanel("create")}
            >
              <Icon src={userIcon} size={18} />
              <span>{t("newUser")}</span>
            </button>
            <div ref={exportMenuRef} style={{ position: "relative" }}>
              <button
                type="button"
                className="btn dropdown-like"
                style={{ ...usersMenuButtonStyle, width: "100%" }}
                onClick={() => setExportMenuOpen((current) => !current)}
              >
                <Icon src={fileSpreadsheetIcon} size={18} />
                <span>{t("actions.export")}</span>
                <span className="btn-dropdown-chevron" aria-hidden="true" />
              </button>
              {exportMenuOpen && (
                <div style={exportDropdownStyle}>
                  <button
                    className="btn"
                    style={{ width: "100%", justifyContent: "flex-start" }}
                    onClick={() => void onExport("xlsx")}
                  >
                    <Icon src={fileSpreadsheetIcon} size={17} />
                    <span>{t("actions.excel")}</span>
                  </button>
                  <button
                    className="btn"
                    style={{ width: "100%", justifyContent: "flex-start" }}
                    onClick={() => void onExport("csv")}
                  >
                    <Icon src={fileSpreadsheetIcon} size={17} />
                    <span>{t("actions.csv")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {err && (
        <div className="card page-header-card" style={errorCardStyle}>
          {err}
        </div>
      )}
      {ok && (
        <div className="card page-header-card" style={successCardStyle}>
          {ok}
        </div>
      )}

      {activePanel === "create" && (
        <div className="card page-header-card">
          <h3 style={{ marginTop: 0 }}>{t("newUser")}</h3>
          <div className="grid cols3">
            <div>
              <label className="label">{t("labels.firstName")}</label>
              <input
                className="input"
                value={form.first_name}
                onChange={(e) => setFormValue("first_name", e.target.value)}
              />
            </div>
            <div>
              <label className="label">{t("labels.lastName")}</label>
              <input
                className="input"
                value={form.last_name}
                onChange={(e) => setFormValue("last_name", e.target.value)}
              />
            </div>
            <div>
              <label className="label">{t("labels.email")}</label>
              <input
                className="input"
                value={form.email}
                onChange={(e) => setFormValue("email", e.target.value)}
              />
            </div>
            <div>
              <label className="label">{t("labels.role")}</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) =>
                  setFormValue("role", e.target.value as AdminUser["role"])
                }
              >
                <option value="secretariat">{roleLabels.secretariat}</option>
                <option value="super_admin">{roleLabels.superAdmin}</option>
              </select>
            </div>
            <div className="users-password-field" style={passwordFieldStyle}>
              <label className="label">{t("labels.passwordStrong")}</label>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={(e) => setFormValue("password", e.target.value)}
              />
              <div className="muted" style={passwordHintStyle}>
                {t("labels.passwordHint")}
              </div>
            </div>
          </div>
          <div className="row-actions" style={topSpacingStyle}>
            <button className="btn primary" onClick={onCreate}>
              <Icon src={userIcon} size={18} />
              <span>{t("actions.create")}</span>
            </button>
          </div>
        </div>
      )}

      {activePanel === "list" && (
        <div className="card page-header-card mobile-table-card">
          <div className="table-wrap">
            <table className="table" style={{ minWidth: 780 }}>
              <thead>
                <tr>
                  <th
                    style={clickableHeaderStyle}
                    onClick={() => toggleSort("id")}
                  >
                    {t("table.id")}
                    {getSortArrow("id")}
                  </th>
                  <th
                    style={clickableHeaderStyle}
                    onClick={() => toggleSort("email")}
                  >
                    {t("table.email")}
                    {getSortArrow("email")}
                  </th>
                  <th
                    style={clickableHeaderStyle}
                    onClick={() => toggleSort("name")}
                  >
                    {t("table.name")}
                    {getSortArrow("name")}
                  </th>
                  <th
                    style={clickableHeaderStyle}
                    onClick={() => toggleSort("role")}
                  >
                    {t("table.role")}
                    {getSortArrow("role")}
                  </th>
                  <th
                    style={clickableHeaderStyle}
                    onClick={() => toggleSort("is_online")}
                  >
                    {t("table.online")}
                    {getSortArrow("is_online")}
                  </th>
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
                      <span
                        className="badge"
                        title={user.last_seen_at ?? ""}
                        style={monospaceBadgeStyle}
                      >
                        {user.is_online
                          ? t("status.online")
                          : t("status.offline")}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn danger"
                        onClick={() => void onDeactivate(user.id)}
                      >
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
      )}
    </div>
  );
}
