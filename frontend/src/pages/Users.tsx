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
import { buildExportFilename, formatGreeceDateTime } from "../lib/exportFilenames";
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
};

const emptyForm: UserFormState = {
  first_name: "",
  last_name: "",
  email: "",
  role: "secretariat",
};

const clickableHeaderStyle: React.CSSProperties = {
  cursor: "pointer",
  userSelect: "none",
  fontWeight: 500,
};
const inlineSelectStyle: React.CSSProperties = { padding: 6, minWidth: 130 };
const monospaceBadgeStyle: React.CSSProperties = { fontFamily: "monospace" };
const topSpacingStyle: React.CSSProperties = { marginTop: 12 };
const errorCardStyle: React.CSSProperties = {
  borderColor: "#b00020",
  color: "#b00020",
};
const usersMenuButtonStyle: React.CSSProperties = {
  minHeight: 46,
  justifyContent: "center",
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
  if (key === "name") {
    return `${user.last_name ?? ""} ${user.first_name ?? ""}`.trim();
  }
  return user[key];
}

function nextSortState(state: SortState, key: SortKey): SortState {
  return state.key === key
    ? { key, dir: state.dir === "asc" ? "desc" : "asc" }
    : { key, dir: "asc" };
}

function UserSuccessToast({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  if (!message) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 9999,
        width: 360,
        maxWidth: "calc(100vw - 32px)",
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.12)",
        borderLeft: "6px solid #16a34a",
        borderRadius: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
        padding: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 700 }}>{message}</div>
        <button
          className="btn"
          type="button"
          onClick={onClose}
          style={{ padding: "6px 10px" }}
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
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

  const activeLocale = (i18n.resolvedLanguage || i18n.language || "gr").toLowerCase().startsWith("en") ? "en-GB" : "el-GR";
  const [items, setItems] = React.useState<AdminUser[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);
  const loadRequestId = React.useRef(0);
  const [sortState, setSortState] = React.useState<SortState>({
    key: "id",
    dir: "asc",
  });
  const [form, setForm] = React.useState<UserFormState>(emptyForm);
  const [exportMenuOpen, setExportMenuOpen] = React.useState(false);
  const [activePanel, setActivePanel] = React.useState<"list" | "create">(
    "list",
  );
  const [pendingDeactivation, setPendingDeactivation] = React.useState<AdminUser | null>(null);
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
    const requestId = ++loadRequestId.current;
    setLoading(true);
    setErr(null);
    try {
      const data = await listUsers({ fresh: true });
      if (requestId !== loadRequestId.current) return;
      setItems(data.items);
    } catch (e: any) {
      if (requestId !== loadRequestId.current) return;
      setErr(e?.message ?? t("error"));
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
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
      const createdUserName = userFullName(response.item);
      setOk(
        response.mail_sent
          ? t("messages.createdWithEmail", { name: createdUserName })
          : t("messages.createdWithoutEmail", { name: createdUserName }),
      );
      setForm(emptyForm);
      setActivePanel("list");
      await load();
    } catch (e: any) {
      alert(e?.message ?? t("error"));
    }
  }

  async function onRoleChange(userId: number, role: AdminUser["role"]) {
    setErr(null);
    setOk(null);
    try {
      await updateUser(userId, { role }, i18n.language);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? t("error"));
    }
  }

  function onDeactivate(user: AdminUser) {
    setPendingDeactivation(user);
  }

  async function onConfirmDeactivate() {
    if (!pendingDeactivation) return;
    const userId = pendingDeactivation.id;
    setErr(null);
    setOk(null);
    try {
      await deactivateUser(userId, i18n.language);
      setPendingDeactivation(null);
      setItems((current) => current.filter((user) => user.id !== userId));
      await load();
    } catch (e: any) {
      setErr(e?.message ?? t("error"));
    }
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
    <div className="page-stable-shell">
      <div className="card page-header-card page-central-menu-card" style={{ padding: 14 }}>
        <div style={{ display: "grid", gap: 14 }}>
          <div
            className="mobile-summary-title-row page-central-menu-title-row users-central-menu-title"
            style={{ alignItems: "center", justifyContent: "flex-start", gap: 12, flexWrap: "wrap" }}
          >
            <h2 style={{ margin: 0 }}>{t("title")}</h2>
            <span className="badge">
              {loading
                ? t("badgeLoading")
                : t("badgeCount", { count: items.length })}
            </span>
          </div>
          <div
            className="page-header-actions-grid page-central-menu-actions page-central-menu-actions-odd"
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
                <div className="central-menu-dropdown central-menu-dropdown-compact central-menu-dropdown-align-right">
                  <button
                    className="btn central-menu-dropdown-item"
                    onClick={() => void onExport("xlsx")}
                  >
                    <Icon src={fileSpreadsheetIcon} size={17} />
                    <span>{t("actions.excel")}</span>
                  </button>
                  <button
                    className="btn central-menu-dropdown-item"
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
      <UserSuccessToast message={ok} onClose={() => setOk(null)} />

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
          </div>
          <div className="row-actions" style={topSpacingStyle}>
            <button className="btn primary" onClick={onCreate}>
              <Icon src={userIcon} size={18} />
              <span>{t("actions.create")}</span>
            </button>
          </div>
        </div>
      )}

      {pendingDeactivation && (
        <div
          className="export-selection-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.34)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 60,
          }}
        >
          <div
            className="card export-selection-card"
            role="dialog"
            aria-modal="true"
            style={{
              width: "min(420px, calc(100vw - 32px))",
              display: "grid",
              gap: 16,
              padding: 18,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 17 }}>
              {t("confirm.deactivate", { name: userFullName(pendingDeactivation) })}
            </h3>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="btn primary" onClick={() => void onConfirmDeactivate()}>
                <span>{t("actions.confirm")}</span>
              </button>
              <button type="button" className="btn" onClick={() => setPendingDeactivation(null)}>
                <span>{t("actions.cancel")}</span>
              </button>
            </div>
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
                    <td>{`${user.last_name ?? ""} ${user.first_name ?? ""}`.trim()}</td>
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
                        title={user.last_seen_at ? formatGreeceDateTime(user.last_seen_at, activeLocale) : ""}
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
                        onClick={() => onDeactivate(user)}
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
