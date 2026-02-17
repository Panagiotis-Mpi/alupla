import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { verifyEmail, resendVerification } from "../lib/api";

export default function Verify() {
  const { t } = useTranslation("auth");
  const [sp] = useSearchParams();
  const token = sp.get("token") || "";
  const [status, setStatus] = React.useState<"idle" | "ok" | "err">("idle");
  const [msg, setMsg] = React.useState<string>("");

  const [email, setEmail] = React.useState("");
  const [resendLoading, setResendLoading] = React.useState(false);
  const [resendErr, setResendErr] = React.useState<string | null>(null);
  const [resendInfo, setResendInfo] = React.useState<string | null>(null);
  const [newToken, setNewToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    async function run() {
      setNewToken(null);
      setResendErr(null);
      setResendInfo(null);

      if (!token) {
        setStatus("err");
        setMsg(t("verify.missingToken"));
        return;
      }
      try {
        await verifyEmail(token);
        if (!alive) return;
        setStatus("ok");
        setMsg(t("verify.ok"));
      } catch (e: any) {
        if (!alive) return;
        setStatus("err");
        setMsg(e?.message ?? t("verify.failed"));
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [token, t]);

  async function onResend() {
    setResendErr(null);
    setResendInfo(null);
    setNewToken(null);

    if (!email.trim()) {
      setResendErr(t("verify.needEmail"));
      return;
    }

    setResendLoading(true);
    try {
      const res = await resendVerification(email.trim());
      if (res?.already_verified) {
        setResendInfo(t("verify.alreadyVerified"));
      } else if (res?.verification_token) {
        setNewToken(String(res.verification_token));
        setResendInfo(t("verify.newTokenInfo"));
      } else {
        setResendInfo(t("verify.sentInfo"));
      }
    } catch (e: any) {
      setResendErr(e?.message ?? t("verify.resendFailed"));
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 560, margin: "48px auto" }}>
        <h2 style={{ marginTop: 0 }}>{t("verify.title")}</h2>

        <p style={{ opacity: 0.85 }}>
          {status === "idle" && t("verify.verifying")}
          {status !== "idle" && msg}
        </p>

        {status === "err" && (
          <div className="card" style={{ background: "#fafafa" }}>
            <div style={{ fontSize: 13, marginBottom: 8, opacity: 0.9 }}>{t("verify.resendHint")}</div>

            <label>
              <span className="label">{t("verify.email")}</span>
              <input
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("verify.emailPlaceholder")}
              />
            </label>

            <div style={{ marginTop: 10 }}>
              <button className="btn" type="button" onClick={onResend} disabled={resendLoading}>
                {resendLoading ? t("common.loading") : t("verify.resendButton")}
              </button>
            </div>

            {resendErr && (
              <div className="error" style={{ marginTop: 10 }}>
                {resendErr}
              </div>
            )}
            {resendInfo && <div style={{ fontSize: 12, opacity: 0.85, marginTop: 10 }}>{resendInfo}</div>}

            {newToken && (
              <div className="card" style={{ background: "#fff", marginTop: 10 }}>
                <div style={{ fontSize: 12, marginBottom: 6, opacity: 0.85 }}>{t("verify.newTokenLabel")}</div>
                <code style={{ wordBreak: "break-all" }}>{newToken}</code>
                <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                  <a className="btn primary" href={`/verify?token=${encodeURIComponent(newToken)}`}>
                    {t("verify.verifyNow")}
                  </a>
                  <Link className="btn" to="/login">
                    {t("reset.login")}
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <Link className="btn primary" to="/login">
            {t("verify.goLogin")}
          </Link>
          <Link className="btn" to="/register">
            {t("verify.register")}
          </Link>
        </div>
      </div>
    </div>
  );
}
