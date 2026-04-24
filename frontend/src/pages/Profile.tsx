import React from "react";
import { useTranslation } from "react-i18next";
import { changePassword, getToken, me, updateProfile } from "../lib/api";
import { setSession } from "../lib/auth";

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
  gridTemplateColumns: "180px 1fr",
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
  const [isEditing, setIsEditing] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");

  function fillForm(currentUser: any) {
    setFirstName(currentUser.first_name ?? "");
    setLastName(currentUser.last_name ?? "");
    setEmail(currentUser.email ?? "");
  }

  async function load() {
    try {
      const data = await me();
      const currentUser = data.user ?? data;
      setUser(currentUser);
      fillForm(currentUser);
    } catch (e: any) {
      setErr(e?.message ?? t("error"));
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  function cancelEdit() {
    if (user) fillForm(user);
    setCurrentPassword("");
    setNewPassword("");
    setShowPassword(false);
    setIsEditing(false);
  }

  async function onSaveProfile() {
    try {
      if (!user) return;

      const normalizedFirstName = firstName.trim();
      const normalizedLastName = lastName.trim();
      const normalizedEmail = email.trim().toLowerCase();

      const profileChanged =
        normalizedFirstName !== String(user.first_name ?? "").trim() ||
        normalizedLastName !== String(user.last_name ?? "").trim() ||
        normalizedEmail !== String(user.email ?? "").trim().toLowerCase();

      const passwordChanged = Boolean(currentPassword.trim() || newPassword.trim());

      if (!profileChanged && !passwordChanged) {
        setIsEditing(false);
        setShowPassword(false);
        return;
      }

      let nextUser = user;

      if (profileChanged) {
        const data = await updateProfile({
          first_name: normalizedFirstName,
          last_name: normalizedLastName,
          email: normalizedEmail,
        });
        nextUser = data.user ?? data;
        setUser(nextUser);
        fillForm(nextUser);
        const token = getToken();
        if (token) setSession(token, nextUser);
      }

      if (passwordChanged) {
        await changePassword(currentPassword, newPassword);
        setCurrentPassword("");
        setNewPassword("");
      }

      setIsEditing(false);
      setShowPassword(false);
      alert(t("editProfile.success"));
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

          {!isEditing ? (
            <button className="btn primary" onClick={() => setIsEditing(true)} style={{ width: "auto" }}>
              {t("editProfile.button")}
            </button>
          ) : (
            <div style={actionStyle}>
              <button className="btn" onClick={cancelEdit} style={{ width: "auto" }}>
                {t("editProfile.cancel")}
              </button>
              <button className="btn primary" onClick={onSaveProfile} style={{ width: "auto" }}>
                {t("editProfile.save")}
              </button>
            </div>
          )}
        </div>

        <div style={rowsStyle}>
          <div style={rowStyle}>
            <div className="label">{t("info.name")}</div>
            {!isEditing ? (
              <div style={valueStyle}>{fullName}</div>
            ) : (
              <div className="grid cols2" style={{ gap: 10 }}>
                <input
                  type="text"
                  className="input"
                  aria-label={t("editProfile.firstName")}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <input
                  type="text"
                  className="input"
                  aria-label={t("editProfile.lastName")}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            )}
          </div>

          <div style={rowStyle}>
            <div className="label">{t("info.email")}</div>
            {!isEditing ? (
              <div style={valueStyle}>{user.email}</div>
            ) : (
              <input
                type="email"
                className="input"
                aria-label={t("editProfile.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </div>

          <div style={lastRowStyle}>
            <div className="label">{t("info.role")}</div>
            <div>
              <span className="badge">{roleLabel}</span>
            </div>
          </div>
        </div>

        {isEditing && (
          <div style={{ display: "grid", gap: 10 }}>
            <button className="btn" onClick={() => setShowPassword((open) => !open)} style={{ width: "fit-content" }}>
              {showPassword ? t("changePassword.hide") : t("changePassword.show")}
            </button>

            {showPassword && (
              <div style={passwordBoxStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0 }}>{t("changePassword.title")}</h3>
                  <span className="muted" style={{ fontSize: 13 }}>{t("changePassword.optional")}</span>
                </div>

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
        )}
      </div>
    </div>
  );
}
