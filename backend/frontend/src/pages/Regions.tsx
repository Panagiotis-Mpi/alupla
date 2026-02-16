import React, { useEffect, useState } from "react";
import { listRegions, type Region } from "../lib/api";

export default function Regions() {
  const [parentId, setParentId] = useState<number | null>(null);
  const [items, setItems] = useState<Region[]>([]);
  const [stack, setStack] = useState<Array<{ id: number | null; label: string }>>([{ id: null, label: "Ρίζα" }]);

  async function load(pid: number | null) {
    const r = await listRegions(pid);
    setItems(r.items);
  }

  useEffect(() => { void load(parentId); }, [parentId]);

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>Περιοχές (hierarchy)</h2>
        <div className="spacer" />
        <span className="badge">parent_id: {parentId ?? "null"}</span>
      </div>

      <div className="card">
        <div className="muted">Breadcrumb:</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          {stack.map((s, idx) => (
            <button key={idx} className="btn" onClick={() => {
              setParentId(s.id);
              setStack(stack.slice(0, idx + 1));
            }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr><th>ID</th><th>Type</th><th>Name</th><th>Go</th></tr>
          </thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.type}</td>
                <td>{r.name}</td>
                <td>
                  <button className="btn" onClick={() => {
                    setParentId(r.id);
                    setStack([...stack, { id: r.id, label: r.name }]);
                  }}>Children</button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr><td colSpan={4} className="muted">Δεν υπάρχουν παιδιά σε αυτό το επίπεδο.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
