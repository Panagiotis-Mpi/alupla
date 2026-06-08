import React from "react";
import { useTranslation } from "react-i18next";
import { createUser, deactivateUser, exportUsersFile, listUsers, updateUser, type AdminUser } from "../lib/api";
import { compareSortValues, sortIndicator } from "./shared/sorting";
import Icon from "../components/Icon";
import { downloadBlob } from "../lib/download";
import userIcon from "../assets/icons/user.svg";
import shieldIcon from "../assets/icons/shield-half.svg";
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
const usersMenuButtonStyle: React.CSSProperties = { minHeight: 46, justifyContent: "center" };
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
  gap: 6
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
  return state.key === key ? { key, dir: state.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" };
}

function RoleSelect({ value, labelSecretariat, labelSuperAdmin, onChange }: RoleSelectProps) {
  return (
    <div className="page-stable-shell users-page">
      <div className="topbar" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>{t("title")}</h2>
        <span className="badge">{loading ? t("badgeLoading") : t("badgeCount", { count: items.length })}</span>
      </div>

      <div className="card page-header-card" style={{ padding: 14 }}>
        <div style={{ display: "grid", gap: 14 }}>
          <div className="mobile-summary-title-row">
            <h3 style={{ margin: 0 }}>{t("menu.title")}</h3>
          </div>
          <div className="page-header-actions-grid users-actions-grid" style={{ display: "grid", gap: 12, width: "100%", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <button
              type="button"
              className={showCreateForm ? "btn primary" : "btn"}
              style={usersMenuButtonStyle}
              onClick={() => setShowCreateForm((current) => !current)}
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
                <span>{t("actions.export")}</span><span className="btn-dropdown-chevron" aria-hidden="true" />
              </button>
              {exportMenuOpen && (
                <div style={exportDropdownStyle}>
                  <button className="btn" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => void onExport("xlsx")}>
                    <Icon src={fileSpreadsheetIcon} size={17} />
                    <span>{t("actions.excel")}</span>
                  </button>
                  <button className="btn" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => void onExport("csv")}>
                    <Icon src={fileSpreadsheetIcon} size={17} />
                    <span>{t("actions.csv")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {err && <div className="card page-header-card" style={errorCardStyle}>{err}</div>}
      {ok && <div className="card page-header-card" style={successCardStyle}>{ok}</div>}

      {showCreateForm && (
        <div className="card page-header-card">
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
          <div className="row-actions" style={topSpacingStyle}>
            <button className="btn primary" onClick={onCreate}>
              <Icon src={userIcon} size={18} />
              <span>{t("actions.create")}</span>
            </button>
            <button className="btn" onClick={() => setShowCreateForm(false)}>
              {t("actions.cancel")}
            </button>
          </div>
        </div>
      )}

      <div className="card page-header-card mobile-table-card">
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
