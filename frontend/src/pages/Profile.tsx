import React from "react";
import { changePassword } from "../lib/api";
import { getUser, logout } from "../lib/auth";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const u = getUser();
  const nav = useNavigate();
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      await changePassword(current, next);
      setMsg("OK: άλλαξε ο κωδικός. Κάνε login ξανά.");
      logout();
      nav("/login");
    } catch (e: any) {
      setErr(e?.response?.data?.error?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>Προφίλ</h2>
      </div>

      <div className="card">
        <div className="muted">Συνδεδεμένος ως:</div>
        <div style={{ marginTop: 6 }}>
          <strong>
            {u?.first_name} {u?.last_name}
          </strong>{" "}
          <span className="badge">{u?.role}</span>
          <div className="muted">{u?.email}</div>
        </div>

        <hr />

        <h3 style={{ marginTop: 0 }}>Αλλαγή κωδικού</h3>
        <form onSubmit={onSubmit} className="grid cols2">
          <div>
            <label className="label">Τρέχων κωδικός</label>
            <input className="input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div>
            <label className="label">Νέος κωδικός</label>
            <input className="input" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
            <div className="muted">Policy: 8+ chars, letter + number + symbol</div>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            {err && (
              <div className="card" style={{ borderColor: "#b00020", color: "#b00020" }}>
                {err}
              </div>
            )}
            {msg && (
              <div className="card" style={{ borderColor: "#2e7d32", color: "#2e7d32" }}>
                {msg}
              </div>
            )}
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <button className="btn primary" disabled={loading}>
              {loading ? "..." : "Αλλαγή"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
