
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { requestPasswordReset } from "../lib/api";

export default function ForgotPassword() {
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
      if (res?.reset_token) setToken(String(res.reset_token)); // dev mode
    } catch (e: any) {
      setErr(e?.message ?? "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 520, margin: "48px auto" }}>
        <h2 style={{ marginTop: 0 }}>Ξέχασα κωδικό</h2>
        <p style={{ marginTop: -8, opacity: 0.8 }}>
          Στο production θα έστελνε email. Σε dev θα πάρεις token εδώ.
        </p>

        <form onSubmit={onSubmit} className="grid">
          <label>
            <span className="label">Email</span>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@..." />
          </label>

          {err && <div className="error">{err}</div>}

          <button className="btn primary" disabled={loading}>
            {loading ? "..." : "Ζήτα reset token"}
          </button>

          {token && (
            <div className="card" style={{ background: "#fafafa" }}>
              <div style={{ fontSize: 12, marginBottom: 6, opacity: 0.85 }}>Reset token (dev):</div>
              <code style={{ wordBreak: "break-all" }}>{token}</code>
              <div style={{ marginTop: 10 }}>
                <button className="btn" type="button" onClick={() => nav(`/reset?token=${encodeURIComponent(token)}`)}>
                  Reset τώρα
                </button>
              </div>
            </div>
          )}

          <div style={{ fontSize: 12, opacity: 0.85 }}>
            <Link to="/login">Πίσω στο Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
