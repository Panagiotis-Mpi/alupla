import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  createGraduate,
  getGraduate,
  listRegions,
  listProgramDirections,
  listStudyPrograms,
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
  degree_grade: 0,

  birth_date: "2000-01-01",

  graduation_date: "",
  oath_date: "",

  origin_region_id: null,
  origin_municipality: null
};

export default function GraduateForm(props: { mode: Mode }) {
  const { t } = useTranslation("graduateForm");
  const nav = useNavigate();
  const { id } = useParams();

  const [programs, setPrograms] = useState<StudyProgram[]>([]);
  const [directions, setDirections] = useState<ProgramDirection[]>([]);
  const [regionQ, setRegionQ] = useState("");
  const [peripheries, setPeripheries] = useState<Region[]>([]);
  const [regionHits, setRegionHits] = useState<Region[]>([]);
  const [regionOpen, setRegionOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Graduate>>(empty);
  const isEdit = props.mode === "edit";

  const gradId = useMemo(() => (isEdit ? Number(id) : null), [id, isEdit]);

  useEffect(() => {
    (async () => {
      const sp = await listStudyPrograms();
      setPrograms(sp.items);

      if (!isEdit) {
        if (sp.items.length) setForm((f) => ({ ...f, study_program_id: sp.items[0].id }));
        return;
      }

      if (!gradId || !Number.isFinite(gradId)) return;
      const g = await getGraduate(gradId);
      setForm(g.item);

      const dirs = await listProgramDirections(g.item.study_program_id);
      setDirections(dirs.items);
    })();
  }, [gradId, isEdit]);

  useEffect(() => {
    const spid = Number(form.study_program_id);
    if (!Number.isFinite(spid)) return;
    (async () => {
      const dirs = await listProgramDirections(spid);
      setDirections(dirs.items);
      if (form.program_direction_id) {
        const ok = dirs.items.some(d => d.id === form.program_direction_id);
        if (!ok) setForm((f) => ({ ...f, program_direction_id: null }));
      }
    })();
  }, [form.study_program_id]);

  useEffect(() => {
    (async () => {
      try {
        const r = await listRegions({ parent_id: null, type: "PERIPHERY" });
        setPeripheries(r.items || []);
      } catch {
        setPeripheries([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!regionOpen) {
      setRegionHits([]);
      return;
    }
    const q = regionQ.trim().toLowerCase();
    const items = peripheries || [];
    if (!q) {
      setRegionHits(items);
      return;
    }
    setRegionHits(items.filter(r => (r.name || "").toLowerCase().includes(q)));
  }, [regionQ, peripheries, regionOpen]);

  const validateRequired = (): string | null => {
    if (isEdit) return null;
    const required: Array<[keyof Graduate | string, any, string]> = [
      ["ad_code", form.ad_code, t("labels.adCode")],
      ["last_name", form.last_name, t("labels.lastName")],
      ["first_name", form.first_name, t("labels.firstName")],
      ["father_name", form.father_name, t("labels.fatherName")],
      ["gender", form.gender, t("labels.gender")],
      ["student_number", form.student_number, t("labels.studentNumber")],
      ["entry_year", form.entry_year, t("labels.entryYearReq")],
      ["birth_date", (form as any).birth_date, t("labels.birthDate")],
      ["degree_grade", form.degree_grade, t("labels.degreeGrade")],
      ["graduation_date", form.graduation_date, t("labels.graduationDate")],
      ["oath_date", form.oath_date, t("labels.oathDate")],
      ["study_program_id", form.study_program_id, t("labels.studyProgram")],
      ["program_direction_id", form.program_direction_id, t("labels.direction")],
      ["origin_region_id", form.origin_region_id, t("labels.regionSearch")],
      ["origin_municipality", form.origin_municipality, t("labels.originText")],
    ];
    for (const [_k, v, label] of required) {
      if (v === null || v === undefined || String(v).trim() === "") {
        return label;
      }
    }
    return null;
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const missing = validateRequired();
      if (missing) {
        alert(`${t("error")}: ${t("labels.required")} ${missing}`);
        return;
      }

      if (isEdit && gradId) {
        await updateGraduate(gradId, form);
      } else {
        await createGraduate(form);
      }
      nav("/graduates");
    } catch (e: any) {
      alert(e?.response?.data?.error?.message ?? e?.message ?? t("error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>{isEdit ? t("titleEdit") : t("titleCreate")}</h2>
        <div className="spacer" />
        <Link className="btn" to="/graduates">{t("back")}</Link>
        <button className="btn primary" disabled={saving} onClick={onSave}>{saving ? t("saving") : t("save")}</button>
      </div>

      <div className="card">
        <div style={{ marginBottom: 12, fontWeight: 600 }}>
          {t("tip")}
        </div>
        <div className="grid cols2">
          <div>
            <label className="label">{t("labels.adCode")}</label>
            <input className="input" value={form.ad_code ?? ""} onChange={(e) => setForm((f) => ({ ...f, ad_code: e.target.value }))} required={!isEdit} />
          </div>

          <div>
            <label className="label">{t("labels.lastName")}</label>
            <input className="input" value={form.last_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">{t("labels.firstName")}</label>
            <input className="input" value={form.first_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
          </div>

          <div>
            <label className="label">{t("labels.fatherName")}</label>
            <input className="input" value={form.father_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, father_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">{t("labels.gender")}</label>
            <select className="input" value={form.gender ?? "M"} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as any }))}>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>

          <div>
            <label className="label">{t("labels.studentNumber")}</label>
            <input className="input" value={form.student_number ?? ""} onChange={(e) => setForm((f) => ({ ...f, student_number: e.target.value }))} />
          </div>

          <div>
            <label className="label">{t("labels.entryYearReq")}</label>
            <input className="input" value={form.entry_year ?? ""} onChange={(e) => setForm((f) => ({ ...f, entry_year: e.target.value ? Number(e.target.value) : ("" as any) }))} />
          </div>

          <div>
            <label className="label">{t("labels.birthDate")}</label>
            <input
              className="input"
              type="date"
              value={(form as any).birth_date ?? ""}
              onChange={(e) => setForm(f => ({...f, birth_date: e.target.value}))}
            />
          </div>

          <div>
            <label className="label">{t("labels.degreeGrade")}</label>
            <input className="input" value={form.degree_grade ?? ""} onChange={(e) => setForm(f => ({...f, degree_grade: e.target.value ? Number(e.target.value) : ("" as any)}))} />
          </div>

          <div>
            <label className="label">{t("labels.graduationDate")}</label>
            <input className="input" type="date" value={(form.graduation_date ?? "") as any} onChange={(e) => setForm(f => ({...f, graduation_date: e.target.value}))} />
          </div>

          <div>
            <label className="label">{t("labels.oathDate")}</label>
            <input className="input" type="date" value={(form.oath_date ?? "") as any} onChange={(e) => setForm(f => ({...f, oath_date: e.target.value}))} />
          </div>


          <div>
            <label className="label">{t("labels.studyProgram")}</label>
            <select className="input" value={String(form.study_program_id ?? "")} onChange={(e) => setForm(f => ({...f, study_program_id: Number(e.target.value)}))}>
              {programs.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name_el}</option>)}
            </select>
          </div>

          <div>
            <label className="label">{t("labels.direction")}</label>
            <select className="input" value={form.program_direction_id ?? ""} onChange={(e) => setForm(f => ({...f, program_direction_id: e.target.value ? Number(e.target.value) : null}))}>
              <option value="">{t("labels.directionNone")}</option>
              {directions.map(d => <option key={d.id} value={d.id}>{d.code} - {d.name_el}</option>)}
            </select>
          </div>
        </div>

        <hr />

        <div className="grid cols2">
          <div>
            <label className="label">{t("labels.regionSearch")}</label>
            <input
              className="input"
              value={regionQ}
              onFocus={() => setRegionOpen(true)}
              onBlur={() => setTimeout(() => setRegionOpen(false), 150)}
              onChange={(e) => {
                const v = e.target.value;
                setRegionQ(v);
                setRegionOpen(true);
                const hit = peripheries.find(p => (p.name || "") === v);
                setForm(f => ({ ...f, origin_region_id: hit ? hit.id : f.origin_region_id }));
              }}
              placeholder={t("labels.regionPlaceholder")}
            />
            {regionOpen && regionHits.length > 0 && (
              <div className="card" style={{ marginTop: 8 }}>
                <div className="muted">{t("labels.select")}</div>
                <div className="grid" style={{ gap: 6 }}>
                  {regionHits.map(r => (
                    <button
                      key={r.id}
                      className="btn"
                      onClick={() => {
                        setForm(f => ({ ...f, origin_region_id: r.id }));
                        setRegionQ(r.name);
                        setRegionOpen(false);
                      }}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="label">{t("labels.originText")}</label>
            <input
              className="input"
              value={form.origin_municipality ?? ""}
              onChange={(e) => setForm(f => ({ ...f, origin_municipality: e.target.value || null }))}
              placeholder={t("labels.originTextPlaceholder")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
