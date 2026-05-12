// Σελίδα σύνδεσης χρήστη στην πλατφόρμα.
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { login as apiLogin } from "../lib/api";
import { setSession, type Role } from "../lib/auth";

const pageStyle: React.CSSProperties = {
  minHeight: "calc(100vh - 70px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1.2rem 1.5rem",
  paddingBottom: "4rem",
  background: "linear-gradient(180deg, #eef4ff 0%, #ffffff 65%)",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  background: "white",
  borderRadius: 18,
  border: "1px solid #e5edff",
  boxShadow: "0 10px 30px rgba(59,130,246,0.08)",
  padding: "2.2rem 2.4rem",
};

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
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState<Role>("secretariat");
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
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h2
          style={{
            margin: 0,
            marginBottom: "1.6rem",
            fontSize: "2rem",
            fontWeight: 800,
            color: "#1e3a8a",
            letterSpacing: "-0.02em",
          }}
        >
          ALUPLA
        </h2>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: "1.05rem" }}>
          <label style={labelStyle}>
            <span style={labelTextStyle}>{t("login.role")}</span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
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
            <span style={labelTextStyle}>{t("login.email")}</span>
            <input
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span style={labelTextStyle}>{t("login.password")}</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </label>

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
            }}
          >
            {loading ? t("common.loading") : t("login.button")}
          </button>

          <div className="auth-form-links">
            <Link to="/register" className="auth-form-link">
              {t("login.register")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
