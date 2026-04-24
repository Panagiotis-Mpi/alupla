import React from "react";
import { useTranslation } from "react-i18next";
import { changePassword, getToken, me, updateProfile } from "../lib/api";
import { setSession } from "../lib/auth";

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 10,
};

const summaryItemStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "12px 14px",
  background: "#f8fafc",
  minWidth: 0,
};

const valueStyle: React.CSSProperties = {
  fontWeight: 700,
  overflowWrap: "anywhere",
};

const editPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 14,
};

const editShellStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 16,
  overflow: "hidden",
  background: "#fff",
};

const editBlockStyle: React.CSSProperties = {
  padding: 14,
  display: "grid",
  gap: 12,
};

const editBlockHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  borderBottom: "1px solid #eef2f7",
  paddingBottom: 10,
};

const passwordHintStyle: React.CSSProperties = {
  color: "#52627a",
  fontSize: 13,
  lineHeight: 1.45,
  whiteSpace: "pre-line",
};

const actionBarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  padding: "12px 14px",
  borderTop: "1px solid #eef2f7",
  background: "#f8fafc",
};

export default function Profile() {
  const { t } = useTranslation("profile");

  const [user, setUser] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");

  async function load() {
    try {
      const data = await me();
      const currentUser = data.user ?? data;
      setUser(currentUser);
      setFirstName(currentUser.first_name ?? "");
      setLastName(currentUser.last_name ?? "");
      setEmail(currentUser.email ?? "");
    } catch (e: any) {
      setErr(e?.message ?? t("error"));
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

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

      if (!profileChanged && !passwordChanged) return;

      let nextUser = user;

      if (profileChanged) {
        const data = await updateProfile({
          first_name: normalizedFirstName,
          last_name: normalizedLastName,
          email: normalizedEmail,
        });
        nextUser = data.user ?? data;
        setUser(nextUser);
        const token = getToken();
        if (token) setSession(token, nextUser);
      }

      if (passwordChanged) {
        await changePassword(currentPassword, newPassword);
        setCurrentPassword("");
        setNewPassword("");
      }

      setIsEditing(false);
      alert(t("editProfile.success"));
    } catch (e: any) {
      alert(e?.message ?? t("error"));
    }
  }

  if (!user) return null;

  const roleLabel = t(`roles.${user.role}`, { defaultValue: user.role });
  const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  const toggleEditing = () => setIsEditing((open) => !open);

  return (
    <div className="page-stable-shell">
      {err && (
        <div className="card page-header-card" style={{ borderColor: "#b00020", color: "#b00020" }}>
          {err}
        </div>
      )}

      <div className="card page-header-card" style={{ padding: 14 }}>
        <div className="page-title-row">
          <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
            <h2 style={{ margin: 0 }}>{t("title")}</h2>
            <div className="muted">{t("subtitle")}</div>
          </div>

          <button className="btn primary" onClick={toggleEditing} style={{ width: "auto" }}>
            {isEditing ? t("editProfile.close") : t("editProfile.button")}
          </button>
        </div>

        <div style={{ ...summaryGridStyle, marginTop: 14 }}>
          <div style={summaryItemStyle}>
            <div className="label">{t("info.name")}</div>
            <div style={valueStyle}>{fullName || "-"}</div>
          </div>
          <div style={summaryItemStyle}>
            <div className="label">{t("info.email")}</div>
            <div style={valueStyle}>{user.email}</div>
          </div>
          <div style={summaryItemStyle}>
            <div className="label">{t("info.role")}</div>
            <span className="badge">{roleLabel}</span>
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="card page-header-card" style={{ padding: 14 }}>
          <div style={editPanelStyle}>
            <div className="page-title-row">
              <div style={{ display: "grid", gap: 4 }}>
                <h3 style={{ margin: 0 }}>{t("editProfile.title")}</h3>
                <div className="muted">{t("editProfile.note")}</div>
              </div>
            </div>

            <div style={editShellStyle}>
              <div className="grid cols2" style={{ gap: 0 }}>
                <div style={{ ...editBlockStyle, borderRight: "1px solid #eef2f7" }}>
                  <div style={editBlockHeaderStyle}>
                    <h3 style={{ margin: 0 }}>{t("editProfile.accountTitle")}</h3>
                    <span className="badge">{roleLabel}</span>
                  </div>

                  <div className="grid cols2">
                    <div>
                      <label className="label">{t("editProfile.firstName")}</label>
                      <input
                        type="text"
                        className="input"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="label">{t("editProfile.lastName")}</label>
                      <input
                        type="text"
                        className="input"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">{t("editProfile.email")}</label>
                    <input
                      type="email"
                      className="input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div style={editBlockStyle}>
                  <div style={editBlockHeaderStyle}>
                    <h3 style={{ margin: 0 }}>{t("changePassword.title")}</h3>
                    <span className="muted" style={{ fontSize: 13 }}>{t("changePassword.optional")}</span>
                  </div>

                  <div className="grid cols2">
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

                  <div style={passwordHintStyle}>{t("changePassword.hint")}</div>
                </div>
              </div>

              <div style={actionBarStyle}>
                <button className="btn" onClick={() => setIsEditing(false)}>
                  {t("editProfile.cancel")}
                </button>
                <button className="btn primary" onClick={onSaveProfile}>
                  {t("editProfile.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
