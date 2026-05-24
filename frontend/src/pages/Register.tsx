// Σελίδα εγγραφής νέου χρήστη.
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { register as apiRegister } from "../lib/api";
import aluplaLogo from "../assets/logo_black.svg";

const labelStyle: React.CSSProperties = { display: "grid", gap: 8 };

function isValidEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!email || email.length > 254 || email.includes("..")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isAllowedRegistrationEmail(value: string) {
  const email = value.trim().toLowerCase();
  return email.endsWith("@ceid.upatras.gr") || email.endsWith("@ac.upatras.gr");
}

export default function Register() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setErr(t("register.invalidEmail", "Βάλε έγκυρο email"));
      return;
    }

    if (!isAllowedRegistrationEmail(normalizedEmail)) {
      setErr(t("register.institutionalEmailRequired"));
      return;
    }

    setLoading(true);
    try {
      await apiRegister(first.trim(), last.trim(), normalizedEmail, pw);
      setOk(t("register.okRedirect", "Ο λογαριασμός δημιουργήθηκε επιτυχώς. Τώρα θα ανακατευθυνθείς στην αρχική σελίδα για να συνδεθείς."));
      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1800);
    } catch (e: any) {
      setErr(e?.message ?? t("register.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page-shell">
      <div className="auth-form-card">
        <div className="auth-form-heading">
          <div className="auth-logo-lockup">
            <img src={aluplaLogo} alt="" className="auth-logo-mark" aria-hidden="true" />
            <span>ALUPLA</span>
          </div>
        </div>

        <form onSubmit={onSubmit} className="auth-form-grid">
          <div className="auth-form-two-col">
            <label style={labelStyle}>
              <span className="auth-form-label">{t("register.firstName")}</span>
              <input value={first} onChange={(e) => setFirst(e.target.value)} className="input auth-form-input" />
            </label>

            <label style={labelStyle}>
              <span className="auth-form-label">{t("register.lastName")}</span>
              <input value={last} onChange={(e) => setLast(e.target.value)} className="input auth-form-input" />
            </label>
          </div>

          <label style={labelStyle}>
            <span className="auth-form-label">{t("register.email")}</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("register.emailPlaceholder")}
              className="input auth-form-input"
            />
          </label>

          <label style={labelStyle}>
            <span className="auth-form-label">{t("register.passwordHint")}</span>
            <input
              type="password"
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="input auth-form-input"
            />
          </label>

          {err && <div className="auth-form-message auth-form-message-error">{err}</div>}

          {ok && <div className="auth-form-message auth-form-message-success">{ok}</div>}

          <button disabled={loading} type="submit" className="btn primary auth-form-submit">
            {loading ? t("common.loading") : t("register.button")}
          </button>

          <div className="auth-form-links">
            <span>{t("register.haveAccount")}</span>
            <Link to="/login" className="auth-form-link">
              {t("register.login")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
