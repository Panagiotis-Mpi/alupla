
import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../lib/api";

export default function ResetPassword() {
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
      setErr(e?.message ?? "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 520, margin: "48px auto" }}>
        <h2 style={{ marginTop: 0 }}>Reset κωδικού</h2>

        {!token ? (
          <p className="error">Λείπει token.</p>
        ) : (
          <form onSubmit={onSubmit} className="grid">
            <label>
              <span className="label">Νέος κωδικός (8+ με γράμμα/αριθμό/σύμβολο)</span>
              <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </label>

            {err && <div className="error">{err}</div>}
            {ok && <div style={{ color: "green", fontSize: 13 }}>Έγινε ✅ Πηγαίνεις στο login...</div>}

            <button className="btn primary" disabled={loading}>
              {loading ? "..." : "Reset"}
            </button>

            <div style={{ fontSize: 12, opacity: 0.85 }}>
              <Link to="/login">Login</Link> · <Link to="/forgot">Ξέχασα κωδικό</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
