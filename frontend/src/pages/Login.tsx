// Σελίδα σύνδεσης χρήστη στην πλατφόρμα.
import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { login as apiLogin } from "../lib/api";
import { setSession, type Role } from "../lib/auth";
import aluplaLogo from "../assets/logo_black.svg";
import Icon from "../components/Icon";
import lockIcon from "../assets/icons/lock.svg";
import mailIcon from "../assets/icons/mail.svg";
import eyeIcon from "../assets/icons/eye.svg";
import logInIcon from "../assets/icons/log-in.svg";

const labelStyle: React.CSSProperties = { display: "grid", gap: 8 };
const labelTextStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#334155",
};
const inputStyle: React.CSSProperties = {
  height: 44,
  borderRadius: 12,
  border: "1px solid #dbeafe",
  background: "#ffffff",
  padding: "0 12px",
  outline: "none",
};

const ROLE_OPTIONS: Role[] = ["secretariat", "super_admin"];

function Login() {
  const { t } = useTranslation(["auth", "users"]);
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState<Role>("secretariat");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await apiLogin(email.trim(), password);
      if (!res?.token || !res?.user) throw new Error("Bad login response");
      if (res.user.role !== selectedRole) {
        throw new Error(t(`login.roleMismatch.${selectedRole}`));
      }
      setSession(res.token, res.user);
      navigate("/graduates");
    } catch (e: any) {
      const message = e?.message;
      if (message === "Account pending admin approval") {
        setErr(t("login.pendingApproval"));
      } else {
        setErr(message ?? t("login.failed"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page-shell">
      <div className="auth-form-card auth-form-card-login">
        <div className="auth-form-heading auth-form-heading-login">
          <div className="auth-logo-lockup">
            <img src={aluplaLogo} alt="" className="auth-logo-mark" aria-hidden="true" />
            <span>ALUPLA</span>
          </div>
        </div>

        <form onSubmit={onSubmit} className="auth-form-grid">
          <label style={labelStyle}>
            <div className="auth-role-options">
              {ROLE_OPTIONS.map((role) => {
                const active = selectedRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    aria-pressed={active}
                    className={`auth-role-button ${active ? "is-active" : ""}`}
                    onClick={() => setSelectedRole(role)}
                    style={{
                      height: 44,
                      borderRadius: 12,
                      border: active ? "1px solid #3b82f6" : "1px solid #bfdbfe",
                      background: active ? "#3b82f6" : "#eff6ff",
                      color: active ? "#ffffff" : "#1d4ed8",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {t(`login.roles.${role}`)}
                  </button>
                );
              })}
            </div>
          </label>

          <label style={labelStyle}>
            <span className="auth-form-label" style={labelTextStyle}>{t("login.email")}</span>
            <span className="auth-input-shell">
              <Icon src={mailIcon} size={18} className="auth-input-icon" />
              <input
                autoComplete="email"
                className="input auth-form-input auth-form-input-with-icon"
                placeholder="name@ac.upatras.gr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </span>
          </label>

          <label style={labelStyle}>
            <span className="auth-form-label" style={labelTextStyle}>{t("login.password")}</span>
            <span className="auth-input-shell auth-input-shell-password">
              <Icon src={lockIcon} size={18} className="auth-input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="input auth-form-input auth-form-input-with-icon auth-form-input-with-action"
                placeholder={t("login.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
              <button
                type="button"
                className="auth-password-visibility"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? t("login.hidePassword", { defaultValue: "Hide password" }) : t("login.showPassword", { defaultValue: "Show password" })}
              >
                <Icon src={eyeIcon} size={20} />
              </button>
            </span>
          </label>

          <button
            type="button"
            className="auth-forgot-password-button"
            onClick={() => navigate("/forgot-password")}
          >
            {t("login.forgotPassword")}
          </button>

          {err && (
            <div
              style={{
                borderRadius: 12,
                border: "1px solid rgba(239,68,68,0.25)",
                background: "rgba(239,68,68,0.06)",
                padding: "10px 12px",
                color: "#991b1b",
              }}
            >
              {err}
            </div>
          )}

          <button
            disabled={loading}
            type="submit"
            className="auth-form-submit"
            style={{
              height: 46,
              borderRadius: 12,
              border: "none",
              backgroundColor: "#2563eb",
              color: "white",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 800,
              fontSize: "1.02rem",
              boxShadow: "0 10px 22px rgba(37,99,235,0.22)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {!loading && <Icon src={logInIcon} size={18} />}
            <span>{loading ? t("common.loading") : t("login.button")}</span>
          </button>

          <button
            type="button"
            className="auth-back-home-button"
            onClick={() => navigate("/")}
          >
            {t("login.backHome")}
          </button>

        </form>
      </div>
    </div>
  );
}

export default Login;
