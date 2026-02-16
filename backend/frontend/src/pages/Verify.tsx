
import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEmail, resendVerification } from "../lib/api";

export default function Verify() {
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
        setMsg("Λείπει token.");
        return;
      }
      try {
        await verifyEmail(token);
        if (!alive) return;
        setStatus("ok");
        setMsg("Το email επιβεβαιώθηκε ✅ Μπορείς να κάνεις login.");
      } catch (e: any) {
        if (!alive) return;
        setStatus("err");
        setMsg(e?.message ?? "Απέτυχε η επιβεβαίωση. Ίσως το token έληξε.");
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [token]);

  async function onResend() {
    setResendErr(null);
    setResendInfo(null);
    setNewToken(null);

    if (!email.trim()) {
      setResendErr("Βάλε το email του λογαριασμού.");
      return;
    }

    setResendLoading(true);
    try {
      const res = await resendVerification(email.trim());
      if (res?.already_verified) {
        setResendInfo("Το email είναι ήδη verified.");
      } else if (res?.verification_token) {
        setNewToken(String(res.verification_token));
        setResendInfo("Βγήκε νέο token (dev). Πάτα Verify τώρα.");
      } else {
        setResendInfo("Αν υπάρχει ο χρήστης, στάλθηκε νέο verification.");
      }
    } catch (e: any) {
      setResendErr(e?.message ?? "Απέτυχε η αποστολή.");
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 560, margin: "48px auto" }}>
        <h2 style={{ marginTop: 0 }}>Επιβεβαίωση Email</h2>

        <p style={{ opacity: 0.85 }}>
          {status === "idle" && "Γίνεται επιβεβαίωση..."}
          {status !== "idle" && msg}
        </p>

        {status === "err" && (
          <div className="card" style={{ background: "#fafafa" }}>
            <div style={{ fontSize: 13, marginBottom: 8, opacity: 0.9 }}>
              Αν το token έληξε/απέτυχε, ζήτα νέο verification:
            </div>

            <label>
              <span className="label">Email</span>
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@..." />
            </label>

            <div style={{ marginTop: 10 }}>
              <button className="btn" type="button" onClick={onResend} disabled={resendLoading}>
                {resendLoading ? "..." : "Στείλε ξανά verification"}
              </button>
            </div>

            {resendErr && <div className="error" style={{ marginTop: 10 }}>{resendErr}</div>}
            {resendInfo && <div style={{ fontSize: 12, opacity: 0.85, marginTop: 10 }}>{resendInfo}</div>}

            {newToken && (
              <div className="card" style={{ background: "#fff", marginTop: 10 }}>
                <div style={{ fontSize: 12, marginBottom: 6, opacity: 0.85 }}>Νέο verification token (dev):</div>
                <code style={{ wordBreak: "break-all" }}>{newToken}</code>
                <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                  <a className="btn primary" href={`/verify?token=${encodeURIComponent(newToken)}`}>
                    Verify τώρα
                  </a>
                  <Link className="btn" to="/login">
                    Login
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <Link className="btn primary" to="/login">
            Πήγαινε στο Login
          </Link>
          <Link className="btn" to="/register">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
