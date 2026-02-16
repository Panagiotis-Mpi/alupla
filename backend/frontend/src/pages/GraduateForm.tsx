import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createGraduate,
  getGraduate,
  listProgramDirections,
  listStudyPrograms,
  searchRegions,
  updateGraduate,
  type Graduate,
  type ProgramDirection,
  type Region,
  type StudyProgram
} from "../lib/api";

type Mode = "create" | "edit";

const empty: Partial<Graduate> = {
  ad_code: "",
  last_name: "",
  first_name: "",
  father_name: "",
  student_number: "",
  gender: "M",
  study_program_id: 1,
  program_direction_id: null,

  entry_year: new Date().getFullYear(),
  birth_year: 2000,
  degree_grade: 0,

  graduation_date: "",
  oath_date: "",

  origin_region_id: null,
  origin_municipality: null
};

export default function GraduateForm(props: { mode: Mode }) {
  const nav = useNavigate();
  const { id } = useParams();

  const [programs, setPrograms] = useState<StudyProgram[]>([]);
  const [directions, setDirections] = useState<ProgramDirection[]>([]);
  const [regionQ, setRegionQ] = useState("");
  const [regionHits, setRegionHits] = useState<Region[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Graduate>>(empty);
  const isEdit = props.mode === "edit";

  const gradId = useMemo(() => (isEdit ? Number(id) : null), [id, isEdit]);

  useEffect(() => {
    (async () => {
      const sp = await listStudyPrograms();
      setPrograms(sp.items);

      if (!isEdit) {
        // set default program id if exists
        if (sp.items.length) setForm(f => ({ ...f, study_program_id: sp.items[0].id }));
        return;
      }

      if (!gradId || !Number.isFinite(gradId)) return;
      const g = await getGraduate(gradId);
      setForm(g.item);

      const dirs = await listProgramDirections(g.item.study_program_id);
      setDirections(dirs.items);
    })();
  }, [gradId, isEdit]);

  // when study_program changes, reload directions
  useEffect(() => {
    const spid = Number(form.study_program_id);
    if (!Number.isFinite(spid)) return;
    (async () => {
      const dirs = await listProgramDirections(spid);
      setDirections(dirs.items);
      // if current direction doesn't belong, reset
      if (form.program_direction_id) {
        const ok = dirs.items.some(d => d.id === form.program_direction_id);
        if (!ok) setForm(f => ({ ...f, program_direction_id: null }));
      }
    })();
  }, [form.study_program_id]);

  // region search
  useEffect(() => {
    const q = regionQ.trim();
    if (q.length < 2) { setRegionHits([]); return; }
    const t = setTimeout(async () => {
      const r = await searchRegions(q);
      setRegionHits(r.items);
    }, 250);
    return () => clearTimeout(t);
  }, [regionQ]);

  const onSave = async () => {
    setSaving(true);
    try {
      if (isEdit && gradId) {
        await updateGraduate(gradId, form);
      } else {
        await createGraduate(form);
      }
      nav("/graduates");
    } catch (e: any) {
      alert(e?.response?.data?.error?.message ?? e?.message ?? "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>{isEdit ? "Επεξεργασία Αποφοίτου" : "Νέος Απόφοιτος"}</h2>
        <div className="spacer" />
        <Link className="btn" to="/graduates">← πίσω</Link>
        <button className="btn primary" disabled={saving} onClick={onSave}>{saving ? "Saving..." : "Αποθήκευση"}</button>
      </div>

      <div className="card">
        <div className="grid cols2">
          <div>
            <label className="label">Επώνυμο *</label>
            <input className="input" value={form.last_name ?? ""} onChange={(e) => setForm(f => ({...f, last_name: e.target.value}))} />
          </div>
          <div>
            <label className="label">Όνομα *</label>
            <input className="input" value={form.first_name ?? ""} onChange={(e) => setForm(f => ({...f, first_name: e.target.value}))} />
          </div>

          <div>
            <label className="label">Πατρώνυμο</label>
            <input className="input" value={form.father_name ?? ""} onChange={(e) => setForm(f => ({...f, father_name: e.target.value}))} />
          </div>
          <div>
            <label className="label">Φύλο *</label>
            <select className="input" value={form.gender ?? "M"} onChange={(e) => setForm(f => ({...f, gender: e.target.value as any}))}>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>
          <div>
            <label className="label">Α.Δ. *</label>
            <input className="input" value={form.ad_code ?? ""} onChange={(e) => setForm(f => ({...f, ad_code: e.target.value}))} />
          </div>

          <div>
            <label className="label">ΑΜ *</label>
            <input className="input" value={form.student_number ?? ""} onChange={(e) => setForm(f => ({...f, student_number: e.target.value}))} />
          </div>

          <div>
            <label className="label">Έτος Εγγραφής *</label>
            <input className="input" value={form.entry_year ?? ""} onChange={(e) => setForm(f => ({...f, entry_year: e.target.value ? Number(e.target.value) : ("" as any)}))} />
          </div>

          <div>
            <label className="label">Έτος Γέννησης *</label>
            <input className="input" value={form.birth_year ?? ""} onChange={(e) => setForm(f => ({...f, birth_year: e.target.value ? Number(e.target.value) : ("" as any)}))} />
          </div>

          <div>
            <label className="label">Βαθμός Διπλώματος *</label>
            <input className="input" value={form.degree_grade ?? ""} onChange={(e) => setForm(f => ({...f, degree_grade: e.target.value ? Number(e.target.value) : ("" as any)}))} />
          </div>

          <div>
            <label className="label">Ημ/νία Λήψης Διπλώματος *</label>
            <input className="input" type="date" value={(form.graduation_date ?? "") as any} onChange={(e) => setForm(f => ({...f, graduation_date: e.target.value}))} />
          </div>

          <div>
            <label className="label">Ημ/νία Ορκωμοσίας *</label>
            <input className="input" type="date" value={(form.oath_date ?? "") as any} onChange={(e) => setForm(f => ({...f, oath_date: e.target.value}))} />
          </div>


          <div>
            <label className="label">Πρόγραμμα Σπουδών *</label>
            <select className="input" value={String(form.study_program_id ?? "")} onChange={(e) => setForm(f => ({...f, study_program_id: Number(e.target.value)}))}>
              {programs.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name_el}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Κατεύθυνση</label>
            <select className="input" value={form.program_direction_id ?? ""} onChange={(e) => setForm(f => ({...f, program_direction_id: e.target.value ? Number(e.target.value) : null}))}>
              <option value="">(καμία)</option>
              {directions.map(d => <option key={d.id} value={d.id}>{d.code} - {d.name_el}</option>)}
            </select>
            <div className="muted">Γεμίζει δυναμικά από το πρόγραμμα.</div>
          </div>

          <div>
            <label className="label">ΑΜ</label>
            <input className="input" value={form.student_number ?? ""} onChange={(e) => setForm(f => ({...f, student_number: e.target.value}))} />
          </div>

          <div>
            <label className="label">Έτος Εγγραφής</label>
            <input className="input" value={form.entry_year ?? ""} onChange={(e) => setForm(f => ({...f, entry_year: e.target.value ? Number(e.target.value) : null}))} />
          </div>
        </div>

        <hr />

        <div className="grid cols2">
          <div>
            <label className="label">Αναζήτηση Περιοχής (regions)</label>
            <input className="input" value={regionQ} onChange={(e) => setRegionQ(e.target.value)} placeholder="π.χ. Πάτρ" />
            {regionHits.length > 0 && (
              <div className="card" style={{ marginTop: 8 }}>
                <div className="muted">Επιλογή:</div>
                <div className="grid" style={{ gap: 6 }}>
                  {regionHits.map(r => (
                    <button key={r.id} className="btn" onClick={() => { setForm(f => ({...f, origin_region_id: r.id})); setRegionQ(r.name); setRegionHits([]); }}>
                      #{r.id} • {r.type} • {r.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="muted">origin_region_id: {form.origin_region_id ?? "(null)"}</div>
          </div>

          <div>
            <label className="label">Origin (text)</label>
            <input
              className="input"
              value={form.origin_municipality ?? ""}
              onChange={(e) => setForm(f => ({ ...f, origin_municipality: e.target.value || null }))}
              placeholder="Δήμος/Πόλη (προαιρετικό)"
            />
          </div>
        </div>
      </div>

      <div className="muted">
        Tip: στην edit σελίδα, αν αλλάξεις πρόγραμμα, οι κατευθύνσεις ξαναφορτώνουν αυτόματα.
      </div>
    </div>
  );
}
