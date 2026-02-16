import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deleteGraduate, listGraduates, listStudyPrograms, type Graduate, type StudyProgram } from "../lib/api";

export default function Graduates() {
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

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>Απόφοιτοι</h2>
        <span className="badge">{loading ? "loading..." : `${total} σύνολο`}</span>
        <div className="spacer" />
        <Link className="btn primary" to="/graduates/new">+ Νέος Απόφοιτος</Link>
      </div>

      <div className="card">
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

      <div className="card">
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
