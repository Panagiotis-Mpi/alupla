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
  birth_year: 2000,
  degree_grade: 0,

  graduation_date: "",
  oath_date: "",

  origin_region_id: null,
  origin_municipality: ""
};

export default function GraduateForm(props: { mode: Mode }) {
  const { t } = useTranslation("graduateForm");
  const nav = useNavigate();
  const { id } = useParams();

  const [programs, setPrograms] = useState<StudyProgram[]>([]);
  const [directions, setDirections] = useState<ProgramDirection[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Graduate>>(empty);
  const isEdit = props.mode === "edit";

  const gradId = useMemo(() => (isEdit ? Number(id) : null), [id, isEdit]);

  useEffect(() => {
    (async () => {
      const sp = await listStudyPrograms();
      setPrograms(sp.items);

      const rs = await listRegions();
      setRegions(rs.items);

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

  const validate = (): string[] => {
    const missing: string[] = [];
    const req = (cond: any, label: string) => { if (!cond) missing.push(label); };

    req((form.last_name ?? "").trim(), t("labels.lastName"));
    req((form.first_name ?? "").trim(), t("labels.firstName"));
    req((form.father_name ?? "").trim(), t("labels.fatherName"));
    req((form.ad_code ?? "").trim(), t("labels.adCode"));
    req((form.student_number ?? "").trim(), t("labels.studentNumber"));

    req(Number.isFinite(Number(form.entry_year)), t("labels.entryYearReq"));
    req(Number.isFinite(Number((form as any).birth_year)), t("labels.birthYear"));
    req(Number.isFinite(Number(form.degree_grade)), t("labels.degreeGrade"));
    req((form.graduation_date ?? "").trim(), t("labels.graduationDate"));
    req((form.oath_date ?? "").trim(), t("labels.oathDate"));

    req(Number.isFinite(Number(form.study_program_id)), t("labels.studyProgram"));
    req(Number.isFinite(Number(form.program_direction_id)), t("labels.direction"));

    req(Number.isFinite(Number(form.origin_region_id)), t("labels.originRegion"));
    req((form.origin_municipality ?? "").trim(), t("labels.originMunicipality"));

    return missing;
  };

  const onSave = async () => {
    const missing = validate();
    if (missing.length) {
      alert(t("error") + ": " + missing.join(", "));
      return;
    }
    setSaving(true);
    try {
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
        <div className="grid cols2">
          <div>
            <label className="label">{t("labels.lastName")}</label>
            <input className="input" value={form.last_name ?? ""} onChange={(e) => setForm(f => ({...f, last_name: e.target.value}))} />
          </div>
          <div>
            <label className="label">{t("labels.firstName")}</label>
            <input className="input" value={form.first_name ?? ""} onChange={(e) => setForm(f => ({...f, first_name: e.target.value}))} />
          </div>

          <div>
            <label className="label">{t("labels.fatherName")}</label>
            <input className="input" required value={form.father_name ?? ""} onChange={(e) => setForm(f => ({...f, father_name: e.target.value}))} />
          </div>
          <div>
            <label className="label">{t("labels.gender")}</label>
            <select className="input" value={form.gender ?? "M"} onChange={(e) => setForm(f => ({...f, gender: e.target.value as any}))}>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>
          <div>
            <label className="label">{t("labels.adCode")}</label>
            <input className="input" required value={form.ad_code ?? ""} onChange={(e) => setForm(f => ({...f, ad_code: e.target.value}))} />
          </div>

          <div>
            <label className="label">{t("labels.studentNumber")}</label>
            <input className="input" required value={form.student_number ?? ""} onChange={(e) => setForm(f => ({...f, student_number: e.target.value}))} />
          </div>

          <div>
            <label className="label">{t("labels.entryYearReq")}</label>
            <input className="input" required type="number" value={form.entry_year ?? ""} onChange={(e) => setForm(f => ({...f, entry_year: e.target.value ? Number(e.target.value) : ("" as any)}))} />
          </div>

          <div>
            <label className="label">{t("labels.birthYear")}</label>
            <input className="input" required type="number" value={(form as any).birth_year ?? ""} onChange={(e) => setForm(f => ({...f, birth_year: e.target.value ? Number(e.target.value) : ("" as any)}))} />
          </div>

          <div>
            <label className="label">{t("labels.degreeGrade")}</label>
            <input className="input" required type="number" step="0.01" value={form.degree_grade ?? ""} onChange={(e) => setForm(f => ({...f, degree_grade: e.target.value ? Number(e.target.value) : ("" as any)}))} />
          </div>

          <div>
            <label className="label">{t("labels.graduationDate")}</label>
            <input className="input" required type="date" value={(form.graduation_date ?? "") as any} onChange={(e) => setForm(f => ({...f, graduation_date: e.target.value}))} />
          </div>

          <div>
            <label className="label">{t("labels.oathDate")}</label>
            <input className="input" required type="date" value={(form.oath_date ?? "") as any} onChange={(e) => setForm(f => ({...f, oath_date: e.target.value}))} />
          </div>


          <div>
            <label className="label">{t("labels.studyProgram")}</label>
            <select className="input" required value={String(form.study_program_id ?? "")} onChange={(e) => setForm(f => ({...f, study_program_id: Number(e.target.value)}))}>
              {programs.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name_el}</option>)}
            </select>
          </div>

          <div>
            <label className="label">{t("labels.direction")}</label>
            <select className="input" required value={form.program_direction_id ?? ""} onChange={(e) => setForm(f => ({...f, program_direction_id: e.target.value ? Number(e.target.value) : null}))}>
              <option value="" disabled>{t("labels.directionSelect")}</option>
              {directions.map(d => <option key={d.id} value={d.id}>{d.code} - {d.name_el}</option>)}
            </select>
            <div className="muted">{t("labels.directionHint")}</div>
          </div>
        </div>

        <hr />

        <div className="grid cols2">
          <div>
            <label className="label">{t("labels.originRegion")}</label>
            <select
              className="input"
              required
              value={form.origin_region_id ?? ""}
              onChange={(e) => setForm(f => ({ ...f, origin_region_id: e.target.value ? Number(e.target.value) : null }))}
            >
              <option value="" disabled>{t("labels.originRegionSelect")}</option>
              {regions.map(r => (
                <option key={r.id} value={r.id}>
                  {r.type} • {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">{t("labels.originMunicipality")}</label>
            <input
              className="input"
              required
              value={form.origin_municipality ?? ""}
              onChange={(e) => setForm(f => ({ ...f, origin_municipality: e.target.value }))}
              placeholder={t("labels.originMunicipalityPlaceholder")}
            />
          </div>
        </div>
      </div>

      <div className="muted">
        {t("tip")}
      </div>
    </div>
  );
}
