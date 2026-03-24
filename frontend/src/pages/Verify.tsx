import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { resendVerification, verifyEmail } from "../lib/api";

function readErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return fallback;
}

export default function Verify() {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = React.useState<"idle" | "ok" | "err">("idle");
  const [message, setMessage] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [resending, setResending] = React.useState(false);
  const [resendError, setResendError] = React.useState<string | null>(null);
  const [resendInfo, setResendInfo] = React.useState<string | null>(null);
  const [replacementToken, setReplacementToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    async function runVerification() {
      setReplacementToken(null);
      setResendError(null);
      setResendInfo(null);

      if (!token) {
        setStatus("err");
        setMessage(t("verify.missingToken"));
        return;
      }

      try {
        await verifyEmail(token);
        if (!active) {
          return;
        }
        setStatus("ok");
        setMessage(t("verify.ok"));
      } catch (err) {
        if (!active) {
          return;
        }
        setStatus("err");
        setMessage(readErrorMessage(err, t("verify.failed")));
      }
    }

    runVerification();

    return () => {
      active = false;
    };
  }, [t, token]);

  async function handleResend() {
    setResendError(null);
    setResendInfo(null);
    setReplacementToken(null);

    const value = email.trim();
    if (!value) {
      setResendError(t("verify.needEmail"));
      return;
    }

    setResending(true);
    try {
      const result = await resendVerification(value);
      if (result?.already_verified) {
        setResendInfo(t("verify.alreadyVerified"));
      } else if (result?.verification_token) {
        setReplacementToken(String(result.verification_token));
        setResendInfo(t("verify.newTokenInfo"));
      } else {
        setResendInfo(t("verify.sentInfo"));
      }
    } catch (err) {
      setResendError(readErrorMessage(err, t("verify.resendFailed")));
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="container">
      <div className="card auth-panel auth-panel-md">
        <h2 className="auth-panel-title">{t("verify.title")}</h2>

        <p className="auth-panel-text">
          {status === "idle" ? t("verify.verifying") : message}
        </p>

        {status === "err" && (
          <div className="card auth-subcard auth-subcard-muted">
            <div className="auth-note auth-note-spaced">{t("verify.resendHint")}</div>

            <label>
              <span className="label">{t("verify.email")}</span>
              <input
                className="input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("verify.emailPlaceholder")}
              />
            </label>

            <div className="auth-button-row">
              <button className="btn" type="button" onClick={handleResend} disabled={resending}>
                {resending ? t("common.loading") : t("verify.resendButton")}
              </button>
            </div>

            {resendError && <div className="error auth-stack-gap">{resendError}</div>}
            {resendInfo && <div className="auth-note auth-stack-gap">{resendInfo}</div>}

            {replacementToken && (
              <div className="card auth-subcard auth-subcard-white auth-stack-gap">
                <div className="auth-note auth-note-spaced">{t("verify.newTokenLabel")}</div>
                <code className="auth-code">{replacementToken}</code>
                <div className="auth-action-row auth-stack-gap">
                  <a className="btn primary" href={`/verify?token=${encodeURIComponent(replacementToken)}`}>
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

        <div className="auth-action-row auth-stack-gap">
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
