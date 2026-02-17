import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { register as apiRegister } from "../lib/api";

export default function Register() {
  const { t } = useTranslation("auth");
  const nav = useNavigate();
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [token, setToken] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    setToken(null);
    try {
      const res = await apiRegister(first.trim(), last.trim(), email.trim(), pw);
      // backend (dev) επιστρέφει verification_token
      if (res?.verification_token) setToken(String(res.verification_token));
    } catch (e: any) {
      setErr(e?.message ?? t("register.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 520, margin: "48px auto" }}>
        <h2 style={{ marginTop: 0 }}>{t("register.title")}</h2>
        <p style={{ marginTop: -8, opacity: 0.8 }}>{t("register.devHint")}</p>

        <form onSubmit={onSubmit} className="grid">
          <div className="grid cols2">
            <label>
              <span className="label">{t("register.firstName")}</span>
              <input className="input" value={first} onChange={(e) => setFirst(e.target.value)} />
            </label>
            <label>
              <span className="label">{t("register.lastName")}</span>
              <input className="input" value={last} onChange={(e) => setLast(e.target.value)} />
            </label>
          </div>

          <label>
            <span className="label">{t("register.email")}</span>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("register.emailPlaceholder")}
            />
          </label>

          <label>
            <span className="label">{t("register.passwordHint")}</span>
            <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>

          {err && <div className="error">{err}</div>}

          <button className="btn primary" disabled={loading}>
            {loading ? t("common.loading") : t("register.button")}
          </button>

          {token && (
            <div className="card" style={{ background: "#fafafa" }}>
              <div style={{ fontSize: 12, marginBottom: 6, opacity: 0.85 }}>{t("register.tokenLabel")}</div>
              <code style={{ wordBreak: "break-all" }}>{token}</code>
              <div style={{ marginTop: 10 }}>
                <button className="btn" type="button" onClick={() => nav(`/verify?token=${encodeURIComponent(token)}`)}>
                  {t("register.verifyNow")}
                </button>
              </div>
            </div>
          )}

          <div style={{ fontSize: 12, opacity: 0.85 }}>
            {t("register.haveAccount")} <Link to="/login">{t("register.login")}</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
