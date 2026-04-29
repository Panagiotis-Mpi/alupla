import React from "react";
import { useTranslation } from "react-i18next";
import { changePassword, me } from "../lib/api";

const profileCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  padding: 18,
};

const topStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const rowsStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 16,
  overflow: "hidden",
  background: "#fff",
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(120px, 180px) minmax(0, 1fr)",
  gap: 14,
  alignItems: "center",
  padding: "14px 16px",
  borderBottom: "1px solid #eef2f7",
};

const lastRowStyle: React.CSSProperties = {
  ...rowStyle,
  borderBottom: "none",
};

const valueStyle: React.CSSProperties = {
  fontWeight: 700,
  overflowWrap: "anywhere",
  wordBreak: "normal",
};

const passwordBoxStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 14,
  display: "grid",
  gap: 12,
  background: "#f8fafc",
};

const actionStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
};

export default function Profile() {
  const { t } = useTranslation("profile");

  const [user, setUser] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");

  async function load() {
    try {
      const data = await me();
      setUser(data.user ?? data);
    } catch (e: any) {
      setErr(e?.message ?? t("error"));
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  function cancelPasswordChange() {
    setCurrentPassword("");
    setNewPassword("");
    setShowPassword(false);
  }

  async function onSavePassword() {
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setShowPassword(false);
      alert(t("changePassword.success"));
    } catch (e: any) {
      alert(e?.message ?? t("error"));
    }
  }

  if (!user) return null;

  const roleLabel = t(`roles.${user.role}`, { defaultValue: user.role });
  const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "-";

  return (
    <div className="page-stable-shell">
      {err && (
        <div className="card page-header-card" style={{ borderColor: "#b00020", color: "#b00020" }}>
          {err}
        </div>
      )}

      <div className="card page-header-card" style={profileCardStyle}>
        <div style={topStyle}>
          <div style={{ display: "grid", gap: 4 }}>
            <h2 style={{ margin: 0 }}>{t("title")}</h2>
            <div className="muted">{t("subtitle")}</div>
          </div>

          {!showPassword ? (
            <button className="btn primary" onClick={() => setShowPassword(true)} style={{ width: "auto" }}>
              {t("changePassword.show")}
            </button>
          ) : (
            <div style={actionStyle}>
              <button className="btn" onClick={cancelPasswordChange} style={{ width: "auto" }}>
                {t("changePassword.cancel")}
              </button>
              <button className="btn primary" onClick={onSavePassword} style={{ width: "auto" }}>
                {t("changePassword.save")}
              </button>
            </div>
          )}
        </div>

        <div style={rowsStyle}>
          <div style={rowStyle}>
            <div className="label">{t("info.name")}</div>
            <div style={valueStyle}>{fullName}</div>
          </div>

          <div style={rowStyle}>
            <div className="label">{t("info.email")}</div>
            <div style={valueStyle}>{user.email}</div>
          </div>

          <div style={lastRowStyle}>
            <div className="label">{t("info.role")}</div>
            <div>
              <span className="badge">{roleLabel}</span>
            </div>
          </div>
        </div>

        {showPassword && (
          <div style={passwordBoxStyle}>
            <h3 style={{ margin: 0 }}>{t("changePassword.title")}</h3>

            <div className="grid cols2" style={{ gap: 10 }}>
              <div>
                <label className="label">{t("changePassword.current")}</label>
                <input
                  type="password"
                  className="input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="label">{t("changePassword.new")}</label>
                <input
                  type="password"
                  className="input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="muted" style={{ whiteSpace: "pre-line", fontSize: 13 }}>
              {t("changePassword.hint")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
