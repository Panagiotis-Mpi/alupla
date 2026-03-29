import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  createGraduate,
  getGraduate,
  listProgramDirections,
  listRegions,
  listStudyPrograms,
  updateGraduate,
  type Graduate,
  type ProgramDirection,
  type Region,
  type StudyProgram
} from "../lib/api";

type Mode = "create" | "edit";

function yearFromDate(value: unknown) {
  const year = Number(String(value ?? "").slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function getGraduateValidationIssue(form: Partial<Graduate>, t: (key: string, options?: any) => string) {
  const entryYear = Number(form.entry_year);
  const birthYear = yearFromDate((form as any).birth_date);
  const graduationYear = yearFromDate(form.graduation_date);

  if (birthYear && graduationYear && graduationYear - birthYear < 23) {
    return t("validation.minAge");
  }

  if (Number.isFinite(entryYear) && graduationYear && graduationYear - entryYear < 5) {
    return t("validation.minDuration");
  }

  return null;
}

const empty: Partial<Graduate> = {
  ad_code: "",
  last_name: "",
  first_name: "",
  father_name: "",
  student_number: "",
  gender: "" as any,
  study_program_id: 1,
  program_direction_id: null,
  entry_year: "" as any,
  degree_grade: "" as any,
  birth_date: "",
  graduation_date: "",
  oath_date: "",
  origin_region_id: null,
  origin_municipality: null
};

export default function GraduateForm(props: { mode: Mode }) {
  const { t, i18n } = useTranslation("graduateForm");
  const nav = useNavigate();
  const { id } = useParams();

  const [programs, setPrograms] = useState<StudyProgram[]>([]);
  const [directions, setDirections] = useState<ProgramDirection[]>([]);
  const [peripheries, setPeripheries] = useState<Region[]>([]);
  const [cities, setCities] = useState<Region[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Graduate>>(empty);
  const [highlightedMissing, setHighlightedMissing] = useState<string | null>(null);
  const isEdit = props.mode === "edit";
  const activeLang = (i18n.resolvedLanguage || i18n.language || "gr").toLowerCase().startsWith("en") ? "en" : "gr";

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
      setForm({
        ...g.item,
        gender: g.item.gender ?? "",
        entry_year: g.item.entry_year ?? "",
        degree_grade: g.item.degree_grade ?? "",
        birth_date: (g.item as any).birth_date ?? "",
        graduation_date: g.item.graduation_date ?? "",
        oath_date: g.item.oath_date ?? "",
        origin_region_id: g.item.origin_region_id ?? null,
        origin_municipality: g.item.origin_municipality ?? null,
        program_direction_id: g.item.program_direction_id ?? null,
      });

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
        const ok = dirs.items.some((d) => d.id === form.program_direction_id);
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
    const regionId = Number(form.origin_region_id);
    if (!Number.isFinite(regionId) || regionId <= 0) {
      setCities([]);
      setForm((current) => (current.origin_municipality ? { ...current, origin_municipality: null } : current));
      return;
    }

    (async () => {
      try {
        const response = await listRegions({ type: "CITY", parent_id: regionId });
        setCities(response.items || []);
      } catch {
        setCities([]);
      }
    })();
  }, [form.origin_region_id]);

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
        setHighlightedMissing(missing);
        alert(`${t("error")}: ${t("labels.required")} ${missing}`);
        return;
      }

      setHighlightedMissing(null);

      const validationIssue = getGraduateValidationIssue(form, t);
      if (validationIssue) {
        alert(validationIssue);
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

  const fieldStyle = (label: string): React.CSSProperties => ({
    border: highlightedMissing === label ? "1px solid rgba(220,38,38,.35)" : "1px solid rgba(148,163,184,.18)",
    borderRadius: 16,
    padding: 14,
    background: highlightedMissing === label ? "rgba(254,242,242,.7)" : "#fff"
  });

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 8,
    fontSize: 15,
    fontWeight: 800,
    color: "#475569"
  };


  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0 }}>{isEdit ? t("titleEdit") : t("titleCreate")}</h2>
          {!isEdit ? <div className="muted">{t("requiredNotice")}</div> : null}
        </div>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: "grid", gap: 16 }}>
          <div className="grid cols2">
            <div style={fieldStyle(t("labels.adCode"))}>
              <label style={labelStyle}>{t("labels.adCode")}</label>
              <input className="input" value={form.ad_code ?? ""} onChange={(e) => setForm((f) => ({ ...f, ad_code: e.target.value }))} required={!isEdit} />
            </div>
            <div style={fieldStyle(t("labels.studentNumber"))}>
              <label style={labelStyle}>{t("labels.studentNumber")}</label>
              <input className="input" value={form.student_number ?? ""} onChange={(e) => setForm((f) => ({ ...f, student_number: e.target.value }))} />
            </div>
            <div style={fieldStyle(t("labels.lastName"))}>
              <label style={labelStyle}>{t("labels.lastName")}</label>
              <input className="input" value={form.last_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
            </div>
            <div style={fieldStyle(t("labels.firstName"))}>
              <label style={labelStyle}>{t("labels.firstName")}</label>
              <input className="input" value={form.first_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
            </div>
            <div style={fieldStyle(t("labels.fatherName"))}>
              <label style={labelStyle}>{t("labels.fatherName")}</label>
              <input className="input" value={form.father_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, father_name: e.target.value }))} />
            </div>
            <div style={fieldStyle(t("labels.gender"))}>
              <label style={labelStyle}>{t("labels.gender")}</label>
              <select className="input" value={form.gender ?? ""} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as any }))}>
                <option value="">{t("labels.choice")}</option>
                <option value="M">{t("labels.genderMale")}</option>
                <option value="F">{t("labels.genderFemale")}</option>
              </select>
            </div>
            <div style={fieldStyle(t("labels.birthDate"))}>
              <label style={labelStyle}>{t("labels.birthDate")}</label>
              <input className="input" type="date" value={(form as any).birth_date ?? ""} onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))} />
            </div>
            <div style={fieldStyle(t("labels.entryYearReq"))}>
              <label style={labelStyle}>{t("labels.entryYearReq")}</label>
              <input className="input" inputMode="numeric" value={form.entry_year ?? ""} onChange={(e) => setForm((f) => ({ ...f, entry_year: e.target.value ? Number(e.target.value) : ("" as any) }))} placeholder="" />
            </div>
            <div style={fieldStyle(t("labels.degreeGrade"))}>
              <label style={labelStyle}>{t("labels.degreeGrade")}</label>
              <input className="input" inputMode="decimal" value={form.degree_grade ?? ""} onChange={(e) => setForm((f) => ({ ...f, degree_grade: e.target.value ? Number(e.target.value) : ("" as any) }))} placeholder="" />
            </div>
            <div style={fieldStyle(t("labels.graduationDate"))}>
              <label style={labelStyle}>{t("labels.graduationDate")}</label>
              <input className="input" type="date" value={(form.graduation_date ?? "") as any} onChange={(e) => setForm((f) => ({ ...f, graduation_date: e.target.value }))} />
            </div>
            <div style={fieldStyle(t("labels.oathDate"))}>
              <label style={labelStyle}>{t("labels.oathDate")}</label>
              <input className="input" type="date" value={(form.oath_date ?? "") as any} onChange={(e) => setForm((f) => ({ ...f, oath_date: e.target.value }))} />
            </div>
            <div style={fieldStyle(t("labels.studyProgram"))}>
              <label style={labelStyle}>{t("labels.studyProgram")}</label>
              <select className="input" value={String(form.study_program_id ?? "")} onChange={(e) => setForm((f) => ({ ...f, study_program_id: Number(e.target.value) }))}>
                {programs.map((p) => <option key={p.id} value={p.id}>{activeLang === "en" ? p.name_en || p.name_el : p.name_el || p.name_en}</option>)}
              </select>
            </div>
            <div style={fieldStyle(t("labels.direction"))}>
              <label style={labelStyle}>{t("labels.direction")}</label>
              <select className="input" value={form.program_direction_id ?? ""} onChange={(e) => setForm((f) => ({ ...f, program_direction_id: e.target.value ? Number(e.target.value) : null }))}>
                <option value="">{t("labels.choice")}</option>
                {directions.map((d) => <option key={d.id} value={d.id}>{activeLang === "en" ? d.name_en || d.name_el : d.name_el || d.name_en}</option>)}
              </select>
            </div>
            <div style={fieldStyle(t("labels.regionSearch"))}>
              <label style={labelStyle}>{t("labels.regionSearch")}</label>
              <select className="input" value={form.origin_region_id ?? ""} onChange={(e) => setForm((f) => ({ ...f, origin_region_id: e.target.value ? Number(e.target.value) : null, origin_municipality: null }))}>
                <option value="">{t("labels.choice")}</option>
                {peripheries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div style={fieldStyle(t("labels.originText"))}>
              <label style={labelStyle}>{t("labels.originText")}</label>
              <select
                className="input"
                value={form.origin_municipality ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, origin_municipality: e.target.value || null }))}
                disabled={!Number.isFinite(Number(form.origin_region_id))}
              >
                <option value="" hidden>{t("labels.choice")}</option>
                {cities.map((item) => <option key={`${item.id}-${item.name}`} value={item.name}>{item.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", paddingTop: 6 }}>
            <Link className="btn" to="/graduates" style={{ textDecoration: "none" }}>{t("back")}</Link>
            <button className="btn primary" disabled={saving} onClick={onSave}>{saving ? t("saving") : t("save")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
