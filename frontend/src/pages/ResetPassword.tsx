import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { resetPassword } from "../lib/api";

export default function ResetPassword() {
  const { t } = useTranslation("auth");
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const token = sp.get("token") || "";
  const [pw, setPw] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(false);
    setLoading(true);
    try {
      await resetPassword(token, pw);
      setOk(true);
      setTimeout(() => nav("/login"), 400);
    } catch (e: any) {
      setErr(e?.message ?? t("reset.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 520, margin: "48px auto" }}>
        <h2 style={{ marginTop: 0 }}>{t("reset.title")}</h2>

        {!token ? (
          <p className="error">{t("reset.missingToken")}</p>
        ) : (
          <form onSubmit={onSubmit} className="grid">
            <label>
              <span className="label">{t("reset.newPasswordHint")}</span>
              <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </label>

            {err && <div className="error">{err}</div>}
            {ok && <div style={{ color: "green", fontSize: 13 }}>{t("reset.okRedirect")}</div>}

            <button className="btn primary" disabled={loading}>
              {loading ? t("common.loading") : t("reset.button")}
            </button>

            <div style={{ fontSize: 12, opacity: 0.85 }}>
              <Link to="/login">{t("reset.login")}</Link> · <Link to="/forgot">{t("reset.forgot")}</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
