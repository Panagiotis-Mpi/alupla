
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { register as apiRegister } from "../lib/api";

export default function Register() {
  const nav = useNavigate();
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
      // backend (dev) επιστρέφει verification_token
      if (res?.verification_token) setToken(String(res.verification_token));
    } catch (e: any) {
      setErr(e?.message ?? "Register failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 520, margin: "48px auto" }}>
        <h2 style={{ marginTop: 0 }}>Δημιουργία Λογαριασμού</h2>
        <p style={{ marginTop: -8, opacity: 0.8 }}>
          Για ανάπτυξη: θα πάρεις token επιβεβαίωσης και θα κάνεις verify.
        </p>

        <form onSubmit={onSubmit} className="grid">
          <div className="grid cols2">
            <label>
              <span className="label">Όνομα</span>
              <input className="input" value={first} onChange={(e) => setFirst(e.target.value)} />
            </label>
            <label>
              <span className="label">Επώνυμο</span>
              <input className="input" value={last} onChange={(e) => setLast(e.target.value)} />
            </label>
          </div>

          <label>
            <span className="label">Email</span>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@..." />
          </label>

          <label>
            <span className="label">Κωδικός (8+ με γράμμα/αριθμό/σύμβολο)</span>
            <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>

          {err && <div className="error">{err}</div>}

          <button className="btn primary" disabled={loading}>
            {loading ? "..." : "Register"}
          </button>

          {token && (
            <div className="card" style={{ background: "#fafafa" }}>
              <div style={{ fontSize: 12, marginBottom: 6, opacity: 0.85 }}>Verification token (dev):</div>
              <code style={{ wordBreak: "break-all" }}>{token}</code>
              <div style={{ marginTop: 10 }}>
                <button className="btn" type="button" onClick={() => nav(`/verify?token=${encodeURIComponent(token)}`)}>
                  Verify τώρα
                </button>
              </div>
            </div>
          )}

          <div style={{ fontSize: 12, opacity: 0.85 }}>
            Έχεις ήδη λογαριασμό; <Link to="/login">Σύνδεση</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
