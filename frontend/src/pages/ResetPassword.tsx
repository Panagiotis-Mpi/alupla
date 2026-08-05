import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPasswordResetAccount, resetPassword, type PasswordResetAccount } from "../lib/api";
import aluplaLogo from "../assets/Logo_alupla.svg";
import Icon from "../components/Icon";
import lockIcon from "../assets/icons/lock.svg";
import mailIcon from "../assets/icons/mail.svg";
import userIcon from "../assets/icons/user.svg";
import eyeIcon from "../assets/icons/eye.svg";

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
const readonlyInputStyle: React.CSSProperties = {
  ...inputStyle,
  background: "#f8fafc",
  color: "#475569",
  cursor: "default",
};
const passwordHintStyle: React.CSSProperties = { whiteSpace: "pre-line" };

function messageStyle(kind: "success" | "error"): React.CSSProperties {
  return {
    borderRadius: 12,
    border: kind === "success" ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(239,68,68,0.25)",
    background: kind === "success" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.06)",
    padding: "10px 12px",
    color: kind === "success" ? "#166534" : "#991b1b",
  };
}

export default function ResetPassword() {
  const { t } = useTranslation(["auth", "users"]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = React.useMemo(() => searchParams.get("token")?.trim() || "", [searchParams]);
  const [account, setAccount] = React.useState<PasswordResetAccount | null>(null);
  const [accountLoading, setAccountLoading] = React.useState(Boolean(token));
  const [newPassword, setNewPassword] = React.useState("");
  const [repeatNewPassword, setRepeatNewPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(token ? null : t("reset.missingToken"));

  React.useEffect(() => {
    let active = true;

    if (!token) {
      setAccountLoading(false);
      setAccount(null);
      setErr(t("reset.missingToken"));
      return () => {
        active = false;
      };
    }

    setAccountLoading(true);
    setErr(null);

    getPasswordResetAccount(token)
      .then((response) => {
        if (!active) return;
        setAccount(response.account);
      })
      .catch(() => {
        if (!active) return;
        setAccount(null);
        setErr(t("reset.missingToken"));
      })
      .finally(() => {
        if (active) setAccountLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, t]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSuccess(false);

    if (!token || !account) {
      setErr(t("reset.missingToken"));
      return;
    }

    if (newPassword !== repeatNewPassword) {
      setErr(t("reset.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ token, newPassword, repeatNewPassword });
      setSuccess(true);
      setNewPassword("");
      setRepeatNewPassword("");
    } catch (error) {
      setErr(error instanceof Error && error.message ? error.message : t("reset.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page-shell">
      <div className="auth-form-card auth-form-card-login">
        <div className="auth-form-heading auth-form-heading-login">
          <div className="auth-logo-lockup">
            <img src={aluplaLogo} alt="" className="auth-logo-mark" aria-hidden="true" />
            <span>ALUPLA</span>
          </div>
          <div className="auth-form-title-block">
            <h2>{t("reset.title")}</h2>
            <p>{t("reset.subtitle")}</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="auth-form-grid">
          {accountLoading && <div className="muted">{t("common.loading")}</div>}

          {account && (
            <>
              <label style={labelStyle}>
                <span className="auth-form-label" style={labelTextStyle}>{t("users:labels.firstName")}</span>
                <span className="auth-input-shell">
                  <Icon src={userIcon} size={18} className="auth-input-icon" />
                  <input
                    readOnly
                    aria-readonly="true"
                    className="input auth-form-input auth-form-input-with-icon auth-form-input-readonly"
                    value={account.first_name}
                    style={readonlyInputStyle}
                  />
                </span>
              </label>

              <label style={labelStyle}>
                <span className="auth-form-label" style={labelTextStyle}>{t("users:labels.lastName")}</span>
                <span className="auth-input-shell">
                  <Icon src={userIcon} size={18} className="auth-input-icon" />
                  <input
                    readOnly
                    aria-readonly="true"
                    className="input auth-form-input auth-form-input-with-icon auth-form-input-readonly"
                    value={account.last_name}
                    style={readonlyInputStyle}
                  />
                </span>
              </label>

              <label style={labelStyle}>
                <span className="auth-form-label" style={labelTextStyle}>{t("reset.email")}</span>
                <span className="auth-input-shell">
                  <Icon src={mailIcon} size={18} className="auth-input-icon" />
                  <input
                    readOnly
                    aria-readonly="true"
                    autoComplete="email"
                    className="input auth-form-input auth-form-input-with-icon auth-form-input-readonly"
                    value={account.email}
                    style={readonlyInputStyle}
                  />
                </span>
              </label>

              <label style={labelStyle}>
                <span className="auth-form-label" style={labelTextStyle}>{t("reset.newPassword")}</span>
                <span className="auth-input-shell auth-input-shell-password">
                  <Icon src={lockIcon} size={18} className="auth-input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="input auth-form-input auth-form-input-with-icon auth-form-input-with-action"
                    placeholder={t("reset.newPassword")}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    className="auth-password-visibility"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? t("login.hidePassword", { defaultValue: "Hide password" }) : t("login.showPassword", { defaultValue: "Show password" })}
                  >
                    <Icon src={eyeIcon} size={20} />
                  </button>
                </span>
              </label>

              <label style={labelStyle}>
                <span className="auth-form-label" style={labelTextStyle}>{t("reset.repeatNewPassword")}</span>
                <span className="auth-input-shell auth-input-shell-password">
                  <Icon src={lockIcon} size={18} className="auth-input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="input auth-form-input auth-form-input-with-icon"
                    placeholder={t("reset.repeatNewPassword")}
                    value={repeatNewPassword}
                    onChange={(e) => setRepeatNewPassword(e.target.value)}
                    style={inputStyle}
                  />
                </span>
              </label>

              <div className="muted" style={{ ...passwordHintStyle, fontSize: 13 }}>
                {t("users:labels.passwordHint")}
              </div>
            </>
          )}

          {success && <div style={messageStyle("success")}>{t("reset.success")}</div>}
          {err && <div style={messageStyle("error")}>{err}</div>}

          {account && (
            <button
              disabled={loading || success}
              type="submit"
              className="auth-form-submit"
              style={{
                height: 46,
                borderRadius: 12,
                border: "none",
                backgroundColor: "#2563eb",
                color: "white",
                cursor: loading || success ? "not-allowed" : "pointer",
                fontWeight: 800,
                fontSize: "1.02rem",
                boxShadow: "0 10px 22px rgba(37,99,235,0.22)",
              }}
            >
              {loading ? t("common.loading") : t("reset.button")}
            </button>
          )}

          <button type="button" className="auth-back-home-button" onClick={() => navigate("/login")}>
            {t("reset.backLogin")}
          </button>
        </form>
      </div>
    </div>
  );
}
