import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { login as apiLogin } from "../lib/api";
import { setSession } from "../lib/auth";

export default function Login() {
  const { t } = useTranslation("auth");
  const nav = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await apiLogin(email.trim(), password);
      // expected shape: { ok: true, token: string, user: {..} }
      if (!res?.token || !res?.user) throw new Error("Bad login response");
      setSession(res.token, res.user);
      nav("/graduates");
    } catch (e: any) {
      setErr(e?.message ?? t("login.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 460, margin: "48px auto" }}>
        <h2 style={{ marginTop: 0 }}>ALUPLA</h2>

        <form onSubmit={onSubmit} className="grid">
          <label>
            <span className="label">{t("login.email")}</span>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label>
            <span className="label">{t("login.password")}</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {err && <div className="error">{err}</div>}

          <button className="btn primary" disabled={loading} type="submit">
            {loading ? t("common.loading") : t("login.button")}
          </button>

          <div style={{ display: "flex", gap: 10, fontSize: 12, opacity: 0.9 }}>
            <Link to="/register">{t("login.register")}</Link>
            <span>·</span>
            <Link to="/forgot">{t("login.forgot")}</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
