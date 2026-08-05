import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { requestPasswordReset } from "../lib/api";
import aluplaLogo from "../assets/logo.png";
import Icon from "../components/Icon";
import mailIcon from "../assets/icons/mail.svg";

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

function messageStyle(kind: "success" | "error"): React.CSSProperties {
  return {
    borderRadius: 12,
    border: kind === "success" ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(239,68,68,0.25)",
    background: kind === "success" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.06)",
    padding: "10px 12px",
    color: kind === "success" ? "#166534" : "#991b1b",
  };
}

export default function ForgotPassword() {
  const { t, i18n } = useTranslation("auth");
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSuccess(false);
    setLoading(true);
    try {
      const response = await requestPasswordReset(email.trim(), i18n.language?.startsWith("en") ? "en" : "gr");
      if (response.mail_sent === false) {
        throw new Error(t("forgot.failed"));
      }
      setSuccess(true);
    } catch (error) {
      setErr(error instanceof Error && error.message ? error.message : t("forgot.failed"));
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
          <div className="auth-form-title-block">
            <h2>{t("forgot.title")}</h2>
            <p>{t("forgot.subtitle")}</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="auth-form-grid">
          <label style={labelStyle}>
            <span className="auth-form-label" style={labelTextStyle}>{t("forgot.email")}</span>
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

          {success && <div style={messageStyle("success")}>{t("forgot.success")}</div>}
          {err && <div style={messageStyle("error")}>{err}</div>}

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
            }}
          >
            {loading ? t("common.loading") : t("forgot.button")}
          </button>

          <button type="button" className="auth-back-home-button" onClick={() => navigate("/login")}>
            {t("forgot.backLogin")}
          </button>
        </form>
      </div>
    </div>
  );
}
