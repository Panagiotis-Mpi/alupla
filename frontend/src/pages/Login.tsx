import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { login as apiLogin } from "../lib/api";
import { setSession } from "../lib/auth";

function Login() {
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
    <div
      style={{
        minHeight: "calc(100vh - 70px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.2rem 1.5rem",
        background: "linear-gradient(180deg, #eef4ff 0%, #ffffff 65%)",
        // leave space for the pinned footer on static pages
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
            fontSize: "2rem",
            fontWeight: 800,
            color: "#1e3a8a",
            letterSpacing: "-0.02em",
            marginBottom: "1.6rem",
          }}
        >
          ALUPLA
        </h2>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: "1.05rem" }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>
              {t("login.email")}
            </span>
            <input
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>
              {t("login.password")}
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? t("common.loading") : t("login.button")}
          </button>

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
            <Link to="/register" style={{ color: "#1e3a8a", fontWeight: 700 }}>
              {t("login.register")}
            </Link>
            <span style={{ opacity: 0.6 }}>·</span>
            <Link to="/forgot" style={{ color: "#1e3a8a", fontWeight: 700 }}>
              {t("login.forgot")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
