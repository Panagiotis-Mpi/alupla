import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { register as apiRegister } from "../lib/api";

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
const linksRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  fontSize: 13,
  color: "#1e3a8a",
  alignItems: "center",
  flexWrap: "wrap",
  marginTop: 4,
};

export default function Register() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
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
      if (res?.verification_token) {
        setToken(String(res.verification_token));
      }
    } catch (e: any) {
      setErr(e?.message ?? t("register.failed"));
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
            marginBottom: 18,
            fontSize: "1.9rem",
            fontWeight: 800,
            color: "#1e3a8a",
            letterSpacing: "-0.02em",
          }}
        >
          {t("register.title")}
        </h2>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: "1.05rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            <label style={labelStyle}>
              <span style={labelTextStyle}>{t("register.firstName")}</span>
              <input
                value={first}
                onChange={(e) => setFirst(e.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span style={labelTextStyle}>{t("register.lastName")}</span>
              <input
                value={last}
                onChange={(e) => setLast(e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>

          <label style={labelStyle}>
            <span style={labelTextStyle}>{t("register.email")}</span>
            <input
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("register.emailPlaceholder")}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span style={labelTextStyle}>{t("register.passwordHint")}</span>
            <input
              type="password"
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
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
            {loading ? t("common.loading") : t("register.button")}
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
                {t("register.tokenLabel")}
              </div>
              <code style={{ wordBreak: "break-all", color: "#0f172a" }}>{token}</code>
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => navigate(`/verify?token=${encodeURIComponent(token)}`)}
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
                  {t("register.verifyNow")}
                </button>
              </div>
            </div>
          )}

          <div style={linksRowStyle}>
            <span style={{ color: "#475569" }}>{t("register.haveAccount")}</span>
            <Link to="/login" style={{ color: "#1e3a8a", fontWeight: 700 }}>
              {t("register.login")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
