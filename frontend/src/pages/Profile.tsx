import React from "react";
import { useTranslation } from "react-i18next";
import { changePassword, getToken, me, updateProfile } from "../lib/api";
import { setSession } from "../lib/auth";

const shellStyle: React.CSSProperties = {
  display: "grid",
  gap: 14,
};

const profileCardStyle: React.CSSProperties = {
  padding: 16,
  display: "grid",
  gap: 16,
};

const profileHeadStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  gap: 14,
  alignItems: "center",
  padding: 14,
  border: "1px solid #eef2f7",
  borderRadius: 16,
  background: "linear-gradient(180deg,#ffffff 0%,#f8fafc 100%)",
};

const avatarStyle: React.CSSProperties = {
  width: 58,
  height: 58,
  borderRadius: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  fontWeight: 800,
  color: "#1d4ed8",
  background: "#eff6ff",
  border: "1px solid #dbeafe",
};

const detailGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
};

const detailItemStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "10px 12px",
  background: "#fff",
  minWidth: 0,
};

const valueStyle: React.CSSProperties = {
  fontWeight: 700,
  overflowWrap: "anywhere",
};

const formWrapStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 16,
  overflow: "hidden",
  background: "#fff",
};

const formBodyStyle: React.CSSProperties = {
  padding: 14,
  display: "grid",
  gap: 14,
};

const sectionStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 14,
  border: "1px solid #eef2f7",
  borderRadius: 14,
  background: "#fbfdff",
};

const sectionHeadStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
};

const passwordRulesStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  color: "#52627a",
  fontSize: 13,
  lineHeight: 1.45,
};

const actionBarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  padding: 14,
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

  function resetForm() {
    if (!user) return;
    setFirstName(user.first_name ?? "");
    setLastName(user.last_name ?? "");
    setEmail(user.email ?? "");
    setCurrentPassword("");
    setNewPassword("");
  }

  function closeEditor() {
    resetForm();
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
  const initials = `${String(user.first_name ?? "").charAt(0)}${String(user.last_name ?? "").charAt(0)}`.trim().toUpperCase() || "A";

  return (
    <div className="page-stable-shell" style={shellStyle}>
      {err && (
        <div className="card page-header-card" style={{ borderColor: "#b00020", color: "#b00020" }}>
          {err}
        </div>
      )}

      <div className="card page-header-card" style={profileCardStyle}>
        <div className="page-title-row">
          <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
            <h2 style={{ margin: 0 }}>{t("title")}</h2>
            <div className="muted">{t("subtitle")}</div>
          </div>

          <button className="btn primary" onClick={isEditing ? closeEditor : () => setIsEditing(true)} style={{ width: "auto" }}>
            {isEditing ? t("editProfile.close") : t("editProfile.button")}
          </button>
        </div>

        <div style={profileHeadStyle}>
          <div style={avatarStyle}>{initials}</div>
          <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, overflowWrap: "anywhere" }}>{fullName || "-"}</div>
            <div className="muted" style={{ overflowWrap: "anywhere" }}>{user.email}</div>
          </div>
          <span className="badge">{roleLabel}</span>
        </div>

        <div style={detailGridStyle}>
          <div style={detailItemStyle}>
            <div className="label">{t("info.name")}</div>
            <div style={valueStyle}>{fullName || "-"}</div>
          </div>
          <div style={detailItemStyle}>
            <div className="label">{t("info.email")}</div>
            <div style={valueStyle}>{user.email}</div>
          </div>
          <div style={detailItemStyle}>
            <div className="label">{t("info.role")}</div>
            <div style={valueStyle}>{roleLabel}</div>
          </div>
        </div>

        {isEditing && (
          <form
            style={formWrapStyle}
            onSubmit={(event) => {
              event.preventDefault();
              void onSaveProfile();
            }}
          >
            <div style={formBodyStyle}>
              <div className="page-title-row">
                <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                  <h3 style={{ margin: 0 }}>{t("editProfile.title")}</h3>
                  <div className="muted">{t("editProfile.note")}</div>
                </div>
                <span className="badge">{t("changePassword.optional")}</span>
              </div>

              <div className="grid cols2">
                <section style={sectionStyle}>
                  <div style={sectionHeadStyle}>
                    <h3 style={{ margin: 0 }}>{t("editProfile.accountTitle")}</h3>
                    <span className="muted">{t("editProfile.accountNote")}</span>
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
                </section>

                <section style={sectionStyle}>
                  <div style={sectionHeadStyle}>
                    <h3 style={{ margin: 0 }}>{t("changePassword.title")}</h3>
                    <span className="muted">{t("changePassword.note")}</span>
                  </div>

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

                  <ul style={passwordRulesStyle}>
                    {(t("changePassword.rules", { returnObjects: true }) as string[]).map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>

            <div style={actionBarStyle}>
              <button type="button" className="btn" onClick={closeEditor}>
                {t("editProfile.cancel")}
              </button>
              <button type="submit" className="btn primary">
                {t("editProfile.save")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
