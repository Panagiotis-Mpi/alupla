import React from "react";
import { useNavigate } from "react-router-dom";
import { login as apiLogin, setToken } from "../lib/api";
import { setSession } from "../lib/auth";

export default function Login() {
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
      const data = await apiLogin(email.trim(), password);

      if (!data?.token || !data?.user) {
        throw new Error("Login failed: missing token");
      }

      // IMPORTANT: api.ts reads token from localStorage key "alupla_token".
      // setSession stores user/role, but may not store the token. Ensure token is saved.
      setToken(data.token);
      setSession(data.token, data.user);

      nav("/graduates");
    } catch (e: any) {
      // Our fetch-based api helper throws Error(message), not axios errors.
      setErr(e?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 460, margin: "48px auto" }}>
        <h2 style={{ marginTop: 0 }}>ALUPLA</h2>
        <p style={{ marginTop: -8, opacity: 0.8 }}>Σύνδεση</p>

        <form onSubmit={onSubmit} className="grid">
          <label>
            Email
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@..." />
          </label>

          <label>
            Κωδικός
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          {err && <div className="error">{err}</div>}

          <button disabled={loading} className="btn">
            {loading ? "..." : "Σύνδεση"}
          </button>

          <div style={{ display: "flex", gap: 10, fontSize: 12, opacity: 0.9 }}>
            <a href="/register">Register</a>
            <span>·</span>
            <a href="/forgot">Ξέχασα κωδικό</a>
          </div>
        </form>
      </div>
    </div>
  );
}
