import React from "react";
import { useTranslation } from "react-i18next";
import { changePassword, getToken, me, updateProfile } from "../lib/api";
import { setSession } from "../lib/auth";

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
      const data = await updateProfile({
        first_name: firstName,
        last_name: lastName,
        email,
      });
      const nextUser = data.user ?? data;
      setUser(nextUser);
      const token = getToken();
      if (token) setSession(token, nextUser);
      setIsEditing(false);
      alert(t("editProfile.success"));
    } catch (e: any) {
      alert(e?.message ?? t("error"));
    }
  }

  async function onChangePassword() {
    try {
      await changePassword(currentPassword, newPassword);
      alert(t("changePassword.success"));
      setCurrentPassword("");
      setNewPassword("");
    } catch (e: any) {
      alert(e?.message ?? t("error"));
    }
  }

  if (!user) return null;

  const roleLabel = t(`roles.${user.role}`, { defaultValue: user.role });

  return (
    <div className="grid" style={{ gap: 16 }}>
      <h2>{t("title")}</h2>

      <div className="card">
        <div><strong>{t("info.email")}:</strong> {user.email}</div>
        <div><strong>{t("info.name")}:</strong> {user.first_name} {user.last_name}</div>
        <div><strong>{t("info.role")}:</strong> {roleLabel}</div>

        <div style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={() => setIsEditing((v) => !v)}>
            {t("editProfile.button")}
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="card">
          <h3>{t("editProfile.title")}</h3>

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

          <div style={{ marginTop: 12 }}>
            <label className="label">{t("editProfile.email")}</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div style={{ marginTop: 20 }}>
            <h3>{t("changePassword.title")}</h3>

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
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn primary" onClick={onSaveProfile}>
              {t("editProfile.save")}
            </button>
            <button className="btn primary" onClick={onChangePassword}>
              {t("changePassword.submit")}
            </button>
            <button className="btn" onClick={() => setIsEditing(false)}>
              {t("editProfile.cancel")}
            </button>
          </div>
        </div>
      )}

      {err && (
        <div className="card" style={{ borderColor: "#b00020", color: "#b00020" }}>
          {err}
        </div>
      )}
    </div>
  );
}
