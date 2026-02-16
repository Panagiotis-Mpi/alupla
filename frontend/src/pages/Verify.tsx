
import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEmail } from "../lib/api";

export default function Verify() {
  const [sp] = useSearchParams();
  const token = sp.get("token") || "";
  const [status, setStatus] = React.useState<"idle"|"ok"|"err">("idle");
  const [msg, setMsg] = React.useState<string>("");

  React.useEffect(() => {
    let alive = true;
    async function run() {
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
        setMsg(e?.message ?? "Verify failed");
      }
    }
    run();
    return () => { alive = false; };
  }, [token]);

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 520, margin: "48px auto" }}>
        <h2 style={{ marginTop: 0 }}>Επιβεβαίωση Email</h2>
        <p style={{ opacity: 0.85 }}>
          {status === "idle" && "Γίνεται επιβεβαίωση..."}
          {status !== "idle" && msg}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <Link className="btn primary" to="/login">Πήγαινε στο Login</Link>
          <Link className="btn" to="/register">Register</Link>
        </div>
      </div>
    </div>
  );
}
