import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deleteGraduate, listGraduates, listStudyPrograms, exportGraduatesXlsx, importGraduatesXlsx, type Graduate, type StudyProgram } from "../lib/api";

export default function Graduates() {
  const [importBusy, setImportBusy] = React.useState(false);
  const [importReport, setImportReport] = React.useState<any | null>(null);
  const [toast, setToast] = React.useState<{ type: "success" | "error"; title: string; detail?: string; action?: "download_errors" } | null>(null);




function showToast(t: { type: "success" | "error"; title: string; detail?: string; action?: "download_errors" }) {
  setToast(t);
  window.setTimeout(() => {
    setToast((cur) => (cur === t ? null : cur));
  }, 6000);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function onExportXlsx() {
  const p: any = { ...params };
  delete p.page;
  delete p.pageSize;
  try {
    const blob = await exportGraduatesXlsx(p);
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadBlob(blob, `graduates-${ts}.xlsx`);
  } catch (e: any) {
    alert(e?.message ?? "Export failed");
  }
}


  const [programs, setPrograms] = useState<StudyProgram[]>([]);
  const [items, setItems] = useState<Graduate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    q: "",
    last_name_like: "",
    first_name_like: "",
    gender: "",
    study_program_id: "",
    page: 1,
    pageSize: 20,
    sort: "id:asc"
  });

  const params = useMemo(() => {
    const p: any = { page: filters.page, pageSize: filters.pageSize, sort: filters.sort };
    if (filters.q.trim()) p.q = filters.q.trim();
    if (filters.last_name_like.trim()) p.last_name_like = filters.last_name_like.trim();
    if (filters.first_name_like.trim()) p.first_name_like = filters.first_name_like.trim();
    if (filters.gender) p.gender = filters.gender;
    if (filters.study_program_id) p.study_program_id = Number(filters.study_program_id);
    return p;
  }, [filters]);

  async function load() {
    setLoading(true);
    try {
      const [sp, gr] = await Promise.all([listStudyPrograms(), listGraduates(params)]);
      setPrograms(sp.items);
      setItems(gr.items);
      setTotal(gr.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [params.page, params.pageSize, params.sort]); // eslint-disable-line


async function onImportXlsx(file: File) {
  setImportReport(null);
  setImportBusy(true);
  try {
    const rep = await importGraduatesXlsx(file);
    setImportReport(rep);

    const inserted = Number(rep?.summary?.inserted ?? 0);
    const updated = Number(rep?.summary?.updated ?? 0);
    const skipped = Number(rep?.summary?.skipped ?? 0);
    const errCount = Array.isArray(rep?.errors) ? rep.errors.length : 0;

    if (errCount > 0) {
      showToast({
        type: "error",
        title: `Import ολοκληρώθηκε με ${errCount} σφάλματα`,
        detail: `inserted: ${inserted}, updated: ${updated}, skipped: ${skipped}`,
        action: "download_errors",
      });
    } else {
      showToast({
        type: "success",
        title: "Import completed",
        detail: `inserted: ${inserted}, updated: ${updated}, skipped: ${skipped}`,
      });
    }

    await load();
  } catch (e: any) {
    showToast({ type: "error", title: "Import failed", detail: e?.message ?? "Κάτι πήγε στραβά" });
  } finally {
    setImportBusy(false);
  }
}


function downloadErrorsCsv(errors: any[]) {
  const headers = ["row","column","message","value"];
  const esc = (v: any) => {
    const s = String(v ?? "");
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(","), ...(errors ?? []).map((e) => headers.map((h) => esc(e?.[h])).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  downloadBlob(blob, `import-errors-${ts}.csv`);
}



  return (
    <div className="grid" style={{ gap: 14 }}>
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 9999,
            width: 360,
            maxWidth: "calc(100vw - 32px)",
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.12)",
            borderLeft: `6px solid ${toast.type === "success" ? "#16a34a" : "#dc2626"}`,
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            padding: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{toast.title}</div>
              {toast.detail ? (
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{toast.detail}</div>
              ) : null}
            </div>
            <button
              className="btn"
              type="button"
              onClick={() => setToast(null)}
              style={{ padding: "6px 10px" }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {toast.action === "download_errors" && Array.isArray(importReport?.errors) ? (
            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
              <button className="btn" type="button" onClick={() => downloadErrorsCsv(importReport.errors)}>
                Download errors
              </button>
            </div>
          ) : null}
        </div>
      )}
      <div className="topbar">
        <h2 style={{ margin: 0 }}>Απόφοιτοι</h2>
        <span className="badge">{loading ? "loading..." : `${total} σύνολο`}</span>
        <div className="spacer" />
        <input
  id="import-xlsx"
  type="file"
  accept=".xlsx,.xls"
  style={{ display: "none" }}
  onChange={(e) => {
    const f = e.target.files?.[0];
    if (f) void onImportXlsx(f);
    e.currentTarget.value = "";
  }}
/>
<button className="btn" type="button" onClick={() => (document.getElementById("import-xlsx") as HTMLInputElement | null)?.click()} disabled={importBusy}>
  {importBusy ? "Import..." : "Import Excel"}
</button>
<button className="btn" type="button" onClick={() => void onExportXlsx()}>Export Excel</button>
        <Link className="btn primary" to="/graduates/new">+ Νέος Απόφοιτος</Link>
      
</div>

<div className="card"
>
        <div className="grid cols3">
          <div>
            <label className="label">Global αναζήτηση (q)</label>
            <input className="input" value={filters.q} onChange={(e) => setFilters(f => ({...f, q: e.target.value}))} placeholder="π.χ. Παπαδ..." />
          </div>
          <div>
            <label className="label">Επώνυμο (like)</label>
            <input className="input" value={filters.last_name_like} onChange={(e) => setFilters(f => ({...f, last_name_like: e.target.value}))} />
          </div>
          <div>
            <label className="label">Όνομα (like)</label>
            <input className="input" value={filters.first_name_like} onChange={(e) => setFilters(f => ({...f, first_name_like: e.target.value}))} />
          </div>

          <div>
            <label className="label">Φύλο</label>
            <select className="input" value={filters.gender} onChange={(e) => setFilters(f => ({...f, gender: e.target.value}))}>
              <option value="">Όλα</option>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>

          <div>
            <label className="label">Πρόγραμμα Σπουδών</label>
            <select className="input" value={filters.study_program_id} onChange={(e) => setFilters(f => ({...f, study_program_id: e.target.value}))}>
              <option value="">Όλα</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name_el}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Sort</label>
            <select className="input" value={filters.sort} onChange={(e) => setFilters(f => ({...f, sort: e.target.value}))}>
              <option value="id:asc">id ↑</option>
              <option value="id:desc">id ↓</option>
              <option value="last_name:asc">επώνυμο ↑</option>
              <option value="last_name:desc">επώνυμο ↓</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button className="btn" onClick={() => { setFilters(f => ({...f, page: 1})); void load(); }}>Αναζήτηση</button>
          <button className="btn" onClick={() => { setFilters({ q:"", last_name_like:"", first_name_like:"", gender:"", study_program_id:"", page:1, pageSize:20, sort:"id:asc" }); setTimeout(() => void load(), 0); }}>Reset</button>
          <div className="spacer" />
          <button className="btn" disabled={filters.page <= 1} onClick={() => setFilters(f => ({...f, page: f.page - 1}))}>◀</button>
          <span className="badge">page {filters.page}</span>
          <button className="btn" disabled={(filters.page * filters.pageSize) >= total} onClick={() => setFilters(f => ({...f, page: f.page + 1}))}>▶</button>
        </div>
      
</div>



<div className="card"
>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Α.Δ.</th><th>Επώνυμο</th>
              <th>Όνομα</th>
              <th>Φύλο</th>
              <th>Program ID</th>
              <th className="row-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(g => (
              <tr key={g.id}>
                <td>{g.id}</td>
                <td>{g.ad_code}</td>
                <td>{g.last_name}</td>
                <td>{g.first_name}</td>
                <td>{g.gender}</td>
                <td>{g.study_program_id}</td>
                <td>
                  <div className="row-actions">
                    <Link className="btn" to={`/graduates/${g.id}`}>Edit</Link>
                    <button className="btn danger" onClick={async () => {
                      if (!confirm(`Delete graduate #${g.id}?`)) return;
                      await deleteGraduate(g.id);
                      await load();
                    }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr><td colSpan={7} className="muted">Δεν υπάρχουν αποτελέσματα.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
