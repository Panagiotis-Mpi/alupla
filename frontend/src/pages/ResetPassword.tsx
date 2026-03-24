import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { resetPassword } from "../lib/api";

function readErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return fallback;
}

export default function ResetPassword() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setDone(false);
    setLoading(true);

    try {
      await resetPassword(token, password);
      setDone(true);
      window.setTimeout(() => navigate("/login"), 400);
    } catch (err) {
      setError(readErrorMessage(err, t("reset.failed")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card auth-panel auth-panel-sm">
        <h2 className="auth-panel-title">{t("reset.title")}</h2>

        {!token ? (
          <p className="error">{t("reset.missingToken")}</p>
        ) : (
          <form onSubmit={handleSubmit} className="grid">
            <label>
              <span className="label">{t("reset.newPasswordHint")}</span>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {error && <div className="error">{error}</div>}
            {done && <div className="auth-note auth-note-success">{t("reset.okRedirect")}</div>}

            <button className="btn primary" disabled={loading}>
              {loading ? t("common.loading") : t("reset.button")}
            </button>

            <div className="auth-links-row">
              <Link to="/login">{t("reset.login")}</Link> · <Link to="/forgot">{t("reset.forgot")}</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
