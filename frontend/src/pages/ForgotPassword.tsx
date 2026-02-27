import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { requestPasswordReset } from "../lib/api";

export default function ForgotPassword() {
  const { t } = useTranslation("auth");
  const nav = useNavigate();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [token, setToken] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setToken(null);
    setLoading(true);
    try {
      const res = await requestPasswordReset(email.trim());
      if (res?.reset_token) setToken(String(res.reset_token));
    } catch (e: any) {
      setErr(e?.message ?? t("forgot.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 70px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.2rem 1.5rem",
        background: "linear-gradient(180deg, #eef4ff 0%, #ffffff 65%)",
        paddingBottom: "4rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "white",
          borderRadius: 18,
          border: "1px solid #e5edff",
          boxShadow: "0 10px 30px rgba(59,130,246,0.08)",
          padding: "2.2rem 2.4rem",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "1.9rem",
            fontWeight: 800,
            color: "#1e3a8a",
            letterSpacing: "-0.02em",
            marginBottom: 18,
          }}
        >
          {t("forgot.title")}
        </h2>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: "1.05rem" }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>
              {t("forgot.email")}
            </span>
            <input
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("forgot.emailPlaceholder")}
              style={{
                height: 44,
                borderRadius: 12,
                border: "1px solid #dbeafe",
                background: "#ffffff",
                padding: "0 12px",
                outline: "none",
              }}
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
            {loading ? t("common.loading") : t("forgot.button")}
          </button>

          {token && (
            <div
              style={{
                borderRadius: 14,
                border: "1px solid #e5edff",
                background: "#f8fbff",
                padding: "1rem 1rem",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  marginBottom: 6,
                  opacity: 0.85,
                  color: "#334155",
                }}
              >
                {t("forgot.tokenLabel")}
              </div>
              <code style={{ wordBreak: "break-all", color: "#0f172a" }}>
                {token}
              </code>
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() =>
                    nav(`/reset?token=${encodeURIComponent(token)}`)
                  }
                  style={{
                    height: 40,
                    padding: "0 14px",
                    borderRadius: 12,
                    border: "1px solid #93c5fd",
                    background: "#f0f6ff",
                    color: "#1e3a8a",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {t("forgot.resetNow")}
                </button>
              </div>
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 10,
              fontSize: 13,
              color: "#1e3a8a",
              alignItems: "center",
              flexWrap: "wrap",
              marginTop: 4,
            }}
          >
            <Link to="/login" style={{ color: "#1e3a8a", fontWeight: 700 }}>
              {t("forgot.backToLogin")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}