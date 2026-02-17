import React from "react";
import { useTranslation } from "react-i18next";
import { me, changePassword } from "../lib/api";

export default function Profile() {
  const { t } = useTranslation("profile");

  const [user, setUser] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);

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

  return (
    <div className="grid" style={{ gap: 16 }}>
      <h2>{t("title")}</h2>

      <div className="card">
        <div><strong>{t("info.email")}:</strong> {user.email}</div>
        <div><strong>{t("info.name")}:</strong> {user.first_name} {user.last_name}</div>
        <div><strong>{t("info.role")}:</strong> {user.role}</div>
        <div>
          <strong>{t("info.status")}:</strong>{" "}
          {user.is_active ? t("info.active") : t("info.inactive")}
        </div>
      </div>

      <div className="card">
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

        <div style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={onChangePassword}>
            {t("changePassword.submit")}
          </button>
        </div>
      </div>

      {err && (
        <div className="card" style={{ borderColor: "#b00020", color: "#b00020" }}>
          {err}
        </div>
      )}
    </div>
  );
}
