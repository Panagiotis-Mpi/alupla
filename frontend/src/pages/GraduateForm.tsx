// Φόρμα δημιουργίας ή επεξεργασίας αποφοίτου.
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  createGraduate,
  getGraduate,
  listRegions,
  listStudyPrograms,
  updateGraduate,
  type Graduate,
  type Region,
  type StudyProgram
} from "../lib/api";

type Mode = "create" | "edit";

function yearFromDate(value: unknown) {
  const year = Number(String(value ?? "").slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function isAtLeastAgeOnDate(birthDateValue: unknown, targetDateValue: unknown, minimumAge: number) {
  const birthDate = new Date(String(birthDateValue ?? ""));
  const targetDate = new Date(String(targetDateValue ?? ""));
  if (Number.isNaN(birthDate.getTime()) || Number.isNaN(targetDate.getTime())) return true;
  const ageLimitDate = new Date(birthDate);
  ageLimitDate.setFullYear(ageLimitDate.getFullYear() + minimumAge);
  return targetDate >= ageLimitDate;
}

function getGraduateValidationIssue(form: Partial<Graduate>, t: (key: string, options?: any) => string) {
  const entryYear = Number(form.entry_year);
  const birthYear = yearFromDate((form as any).birth_date);
  const degreeGrade = Number(form.degree_grade);

  if (Number.isFinite(entryYear) && birthYear && entryYear - birthYear < 18) return t("validation.entryAge");
  if (!Number.isFinite(degreeGrade) || degreeGrade < 5 || degreeGrade > 10) return t("validation.degreeGradeRange");
  if (!isAtLeastAgeOnDate((form as any).birth_date, form.graduation_date, 23)) return t("validation.graduationAge");
  if (!isAtLeastAgeOnDate((form as any).birth_date, form.oath_date, 23)) return t("validation.oathAge");
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
  entry_year: "" as any,
  degree_grade: "" as any,
  birth_date: "",
  graduation_date: "",
  oath_date: "",
  origin_foreign_city: null,
  origin_country_region_id: null,
  origin_periphery_region_id: null,
  origin_region_id: null,
  origin_city_region_id: null,
  origin_municipality: null
};

function getGreeceCountry(countries: Region[]) {
  return countries.find((item) => String(item.name || "").trim().toLowerCase() === "ελλάδα") ?? null;
}

function normalizeLookupText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getResolvedCountryId(form: Partial<Graduate>, countries: Region[], greeceCountry: Region | null) {
  const explicitCountry = String(form.origin_country ?? "").trim();
  const selectedId = Number(form.origin_country_region_id ?? 0);
  const selectedCountry = selectedId ? countries.find((item) => Number(item.id) === selectedId) ?? null : null;
  const matchedCountry = explicitCountry
    ? countries.find((item) => normalizeLookupText(item.name) === normalizeLookupText(explicitCountry)) ?? null
    : null;
  const selectedIsGreece = normalizeLookupText(selectedCountry?.name) === normalizeLookupText(greeceCountry?.name);
  const matchedIsGreece = normalizeLookupText(matchedCountry?.name) === normalizeLookupText(greeceCountry?.name);

  if (matchedCountry) {
    if (!selectedCountry) return Number(matchedCountry.id);
    if (selectedIsGreece !== matchedIsGreece) return Number(matchedCountry.id);
    if (!selectedIsGreece && Number(selectedCountry.id) !== Number(matchedCountry.id)) return Number(matchedCountry.id);
  }

  if (selectedCountry) return Number(selectedCountry.id);
  return greeceCountry ? Number(greeceCountry.id) : null;
}

function getRegionDisplayName(item: Region, lang: string) {
  return lang === "en" ? item.name_en || item.name_el || item.name : item.name_el || item.name;
}

async function loadRegionChildren(type: Region["type"], parentId: number) {
  if (!Number.isFinite(parentId) || parentId <= 0) return [];
  const response = await listRegions({ type, parent_id: parentId });
  return response.items || [];
}

export default function GraduateForm(props: { mode: Mode }) {
  const { t, i18n } = useTranslation("graduateForm");
  const nav = useNavigate();
  const { id } = useParams();

  const [programs, setPrograms] = useState<StudyProgram[]>([]);
  const [countries, setCountries] = useState<Region[]>([]);
  const [peripheries, setPeripheries] = useState<Region[]>([]);
  const [nomoi, setNomoi] = useState<Region[]>([]);
  const [cities, setCities] = useState<Region[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(props.mode === "edit");
  const [form, setForm] = useState<Partial<Graduate>>(empty);
  const [highlightedMissing, setHighlightedMissing] = useState<string | null>(null);
  const isEdit = props.mode === "edit";
  const activeLang = (i18n.resolvedLanguage || i18n.language || "gr").toLowerCase().startsWith("en") ? "en" : "gr";

  const gradId = useMemo(() => (isEdit ? Number(id) : null), [id, isEdit]);
  const greeceCountry = useMemo(() => getGreeceCountry(countries), [countries]);
  const selectedCountryId = getResolvedCountryId(form, countries, greeceCountry);
  const greeceSelected = Number.isFinite(selectedCountryId) && selectedCountryId === Number(greeceCountry?.id ?? null);

    // Όταν υπάρχει id, φορτώνει τα στοιχεία για edit.
useEffect(() => {
    setLoading(isEdit);
    (async () => {
      const [sp, countriesResponse] = await Promise.all([
        listStudyPrograms(),
        listRegions({ parent_id: null, type: "COUNTRY" })
      ]);
      setPrograms(sp.items);
      setCountries(countriesResponse.items || []);

      if (!isEdit) {
        setLoading(false);
        const defaultCountry = (countriesResponse.items || []).find((item: Region) => String(item.name || "").trim().toLowerCase() === "ελλάδα");
        setForm((f) => ({
          ...f,
                  study_program_id: sp.items[0]?.id ?? f.study_program_id,
          origin_country_region_id: defaultCountry?.id ?? f.origin_country_region_id ?? null,
                  origin_foreign_city: null,
        }));
        return;
      }

      if (!gradId || !Number.isFinite(gradId)) {
        setLoading(false);
        return;
      }
      const g = await getGraduate(gradId);
      setForm({
        ...g.item,
        gender: g.item.gender ?? "",
        entry_year: g.item.entry_year ?? "",
        degree_grade: g.item.degree_grade ?? "",
        birth_date: (g.item as any).birth_date ?? "",
        graduation_date: g.item.graduation_date ?? "",
        oath_date: g.item.oath_date ?? "",
        origin_foreign_city: g.item.origin_foreign_city ?? null,
        origin_country_region_id: getResolvedCountryId(g.item, countriesResponse.items || [], (countriesResponse.items || []).find((item: Region) => String(item.name || "").trim().toLowerCase() === "ελλάδα") ?? null),
        origin_periphery_region_id: g.item.origin_periphery_region_id ?? null,
        origin_region_id: g.item.origin_region_id ?? null,
        origin_city_region_id: g.item.origin_city_region_id ?? null,
        origin_municipality: g.item.origin_municipality ?? null,
      });
      setLoading(false);

    })();
  }, [gradId, isEdit]);


  useEffect(() => {
    if (!greeceSelected) {
      setPeripheries([]);
      setNomoi([]);
      setCities([]);
      setForm((current) => {
        if (
          current.origin_periphery_region_id == null &&
          current.origin_region_id == null &&
          current.origin_region_id == null &&
          current.origin_city_region_id == null &&
          current.origin_municipality == null
        ) {
          return current;
        }
        return {
          ...current,
          origin_periphery_region_id: null,
          origin_region_id: null,
          origin_city_region_id: null,
          origin_municipality: null,
        };
      });
      return;
    }

    const greeceId = Number(form.origin_country_region_id ?? greeceCountry?.id ?? null);
    if (!Number.isFinite(greeceId)) {
      setPeripheries([]);
      setNomoi([]);
      setCities([]);
      return;
    }

    if (form.origin_country_region_id !== greeceId) {
      setForm((current) => ({ ...current, origin_country_region_id: greeceId }));
    }

    (async () => {
      try {
        const r = await listRegions({ parent_id: greeceId, type: "PERIPHERY" });
        setPeripheries(r.items || []);
      } catch {
        setPeripheries([]);
      }
    })();
  }, [form.origin_country_region_id, greeceCountry?.id, greeceSelected]);

  useEffect(() => {
    if (!greeceSelected) return;
    const peripheryId = Number(form.origin_periphery_region_id);
    if (!Number.isFinite(peripheryId) || peripheryId <= 0) {
      setNomoi([]);
      setCities([]);
      setForm((current) => ({ ...current, origin_region_id: null, origin_city_region_id: null, origin_municipality: null }));
      return;
    }

    (async () => {
      try {
        const items = await loadRegionChildren("NOMOS", peripheryId);
        setNomoi(items);
      } catch {
        setNomoi([]);
      }
    })();
  }, [form.origin_periphery_region_id, greeceSelected]);

  useEffect(() => {
    if (!greeceSelected) return;
    const peripheryId = Number(form.origin_periphery_region_id);
    const nomosId = Number(form.origin_region_id);
    if (!Number.isFinite(peripheryId) || peripheryId <= 0) {
      setCities([]);
      return;
    }

    (async () => {
      try {
        const parentIds = Number.isFinite(nomosId) && nomosId > 0 ? [nomosId, peripheryId] : [peripheryId];
        for (const parentId of parentIds) {
          const dimoi = await loadRegionChildren("DIMOS", parentId);
          if (dimoi.length) {
            setCities(dimoi);
            return;
          }
          const cityItems = await loadRegionChildren("CITY", parentId);
          if (cityItems.length) {
            setCities(cityItems);
            return;
          }
        }
        setCities([]);
      } catch {
        setCities([]);
      }
    })();
  }, [form.origin_periphery_region_id, form.origin_region_id, greeceSelected]);

  const validateRequired = (): string | null => {
    if (isEdit) return null;
    const required: Array<[string, any, string]> = [
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
      ["origin_country_region_id", form.origin_country_region_id, t("labels.country")],
    ];
    if (greeceSelected) {
      required.push(["origin_periphery_region_id", form.origin_periphery_region_id, t("labels.regionSearch")]);
      if (nomoi.length) required.push(["origin_region_id", form.origin_region_id, t("labels.nomos")]);
      required.push(["origin_city_region_id", form.origin_city_region_id, t("labels.originText")]);
    } else {
      required.push(["origin_country_region_id", form.origin_country_region_id, t("labels.country")]);
      required.push(["origin_foreign_city", form.origin_foreign_city, t("labels.originText")]);
    }

    for (const [_k, v, label] of required) {
      if (v === null || v === undefined || String(v).trim() === "") return label;
    }

    const degreeGrade = Number(form.degree_grade);
    if (!Number.isFinite(degreeGrade) || degreeGrade < 5 || degreeGrade > 10) return t("validation.degreeGradeRange");

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

      const payload = {
        ...form,
        origin_country_region_id: form.origin_country_region_id ?? null,
        origin_periphery_region_id: greeceSelected ? form.origin_periphery_region_id ?? null : null,
        origin_region_id: greeceSelected ? form.origin_region_id ?? null : null,
        origin_city_region_id: greeceSelected ? form.origin_city_region_id ?? null : null,
        origin_municipality: greeceSelected ? form.origin_municipality ?? null : null,
        origin_country: greeceSelected ? "Ελλάδα" : (countries.find((item) => Number(item.id) === Number(form.origin_country_region_id))?.name ?? form.origin_country ?? null),
        origin_foreign_city: greeceSelected ? null : form.origin_foreign_city ?? null,
      };

      if (isEdit && gradId) await updateGraduate(gradId, payload);
      else await createGraduate(payload);
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
        {loading ? (
          <div className="muted" style={{ fontWeight: 800 }}>{t("loading")}</div>
        ) : (
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
              <input className="input" inputMode="numeric" value={form.entry_year ?? ""} onChange={(e) => setForm((f) => ({ ...f, entry_year: e.target.value ? Number(e.target.value) : ("" as any) }))} />
            </div>
            <div style={fieldStyle(t("labels.degreeGrade"))}>
              <label style={labelStyle}>{t("labels.degreeGrade")}</label>
              <input className="input" type="number" min="5" max="10" step="0.01" value={form.degree_grade ?? ""} onChange={(e) => setForm((f) => ({ ...f, degree_grade: e.target.value ? Number(e.target.value) : ("" as any) }))} />
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
            <div style={fieldStyle(t("labels.country"))}>
              <label style={labelStyle}>{t("labels.country")}</label>
              <select className="input" value={form.origin_country_region_id ?? ""} onChange={(e) => {
                const nextCountryId = e.target.value ? Number(e.target.value) : null;
                const nextIsGreece = nextCountryId != null && nextCountryId === Number(greeceCountry?.id ?? null);
                const nextCountry = countries.find((item) => Number(item.id) === Number(nextCountryId));
                setForm((f) => ({
                  ...f,
                  origin_country_region_id: nextCountryId,
                  origin_periphery_region_id: nextIsGreece ? f.origin_periphery_region_id ?? null : null,
                  origin_region_id: nextIsGreece ? f.origin_region_id ?? null : null,
                  origin_city_region_id: nextIsGreece ? f.origin_city_region_id ?? null : null,
                  origin_municipality: nextIsGreece ? f.origin_municipality ?? null : null,
                  origin_country: nextIsGreece ? "Ελλάδα" : nextCountry?.name ?? null,
                  origin_foreign_city: nextIsGreece ? null : f.origin_foreign_city ?? null,
                }));
              }}>
                <option value="">{t("labels.choice")}</option>
                {countries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            {greeceSelected ? (
              <>
                <div style={fieldStyle(t("labels.regionSearch"))}>
                  <label style={labelStyle}>{t("labels.regionSearch")}</label>
                  <select className="input" value={form.origin_periphery_region_id ?? ""} onChange={(e) => setForm((f) => ({ ...f, origin_periphery_region_id: e.target.value ? Number(e.target.value) : null, origin_region_id: null, origin_city_region_id: null, origin_municipality: null }))}>
                    <option value="">{t("labels.choice")}</option>
                    {peripheries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div style={fieldStyle(t("labels.nomos"))}>
                  <label style={labelStyle}>{t("labels.nomos")}</label>
                  <select className="input" value={form.origin_region_id ?? ""} onChange={(e) => setForm((f) => ({ ...f, origin_region_id: e.target.value ? Number(e.target.value) : null, origin_city_region_id: null, origin_municipality: null }))} disabled={!Number.isFinite(Number(form.origin_periphery_region_id)) || nomoi.length === 0}>
                    <option value="">{t("labels.choice")}</option>
                    {nomoi.map((item) => <option key={item.id} value={item.id}>{getRegionDisplayName(item, activeLang)}</option>)}
                  </select>
                </div>
                <div style={fieldStyle(t("labels.originText"))}>
                  <label style={labelStyle}>{t("labels.originText")}</label>
                  <select
                    className="input"
                    value={form.origin_city_region_id ?? ""}
                    onChange={(e) => {
                      const cityId = e.target.value ? Number(e.target.value) : null;
                      const matchedCity = cities.find((item) => Number(item.id) === Number(cityId));
                      setForm((f) => ({
                        ...f,
                        origin_city_region_id: cityId,
                        origin_municipality: matchedCity ? String(matchedCity.name ?? "").trim() : null,
                      }));
                    }}
                    disabled={!Number.isFinite(Number(form.origin_periphery_region_id))}
                  >
                    <option value="">{t("labels.choice")}</option>
                    {cities.map((item) => <option key={item.id} value={item.id}>{getRegionDisplayName(item, activeLang)}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div style={fieldStyle(t("labels.originText"))}>
                  <label style={labelStyle}>{t("labels.originText")}</label>
                  <input className="input" value={form.origin_foreign_city ?? ""} onChange={(e) => setForm((f) => ({ ...f, origin_foreign_city: e.target.value }))} />
                </div>
              </>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", paddingTop: 6 }}>
            <Link className="btn" to="/graduates" style={{ textDecoration: "none" }}>{t("back")}</Link>
            <button className="btn primary" disabled={saving} onClick={onSave}>{saving ? t("saving") : t("save")}</button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
