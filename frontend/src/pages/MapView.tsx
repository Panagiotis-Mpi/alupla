import React from "react";
import { useTranslation } from "react-i18next";
import { getPublicMap, getPublicStudyPrograms, publicAnonExportUrl, type StudyProgram } from "../lib/api";

type Filters = {
  graduation_year: string;
  study_program_id: string;
  gender: "" | "M" | "F";
  age_group: "" | "18-22" | "23-27" | "28-32" | "33-40" | "41+";
};

export default function MapView() {
  const { t } = useTranslation("map");

  const [programs, setPrograms] = React.useState<StudyProgram[]>([]);
  const [filters, setFilters] = React.useState<Filters>({ graduation_year: "", study_program_id: "", gender: "", age_group: "" });
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [sp, mp] = await Promise.all([
        getPublicStudyPrograms().catch(() => ({ items: [] })),
        getPublicMap(filters as any)
      ]);
      setPrograms(sp.items ?? []);
      setRows(mp.rows ?? []);
    } catch (e: any) {
      setErr(e?.message ?? t("error"));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function downloadAnon() {
    const url = publicAnonExportUrl(filters as any);
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.click();
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>{t("pageTitle")}</h2>
        <span className="muted" style={{ marginLeft: 10 }}>{t("note")}</span>
        <div className="spacer" />
        <button className="btn" type="button" onClick={downloadAnon}>
          {t("filters.exportCsv")}
        </button>
      </div>

      <div className="card">
        <div className="grid cols4">
          <div>
            <label className="label">{t("filters.graduationYear")}</label>
            <input
              className="input"
              inputMode="numeric"
              placeholder="YYYY"
              value={filters.graduation_year}
              onChange={(e) => setFilters((f) => ({ ...f, graduation_year: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">{t("filters.studyProgram")}</label>
            <select
              className="input"
              value={filters.study_program_id}
              onChange={(e) => setFilters((f) => ({ ...f, study_program_id: e.target.value }))}
            >
              <option value="">{t("filters.all")}</option>
              {programs.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name_en || p.name_el}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">{t("filters.gender")}</label>
            <select className="input" value={filters.gender} onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value as any }))}>
              <option value="">{t("filters.all")}</option>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>

          <div>
            <label className="label">{t("filters.ageGroup")}</label>
            <select className="input" value={filters.age_group} onChange={(e) => setFilters((f) => ({ ...f, age_group: e.target.value as any }))}>
              <option value="">{t("filters.all")}</option>
              <option value="18-22">18-22</option>
              <option value="23-27">23-27</option>
              <option value="28-32">28-32</option>
              <option value="33-40">33-40</option>
              <option value="41+">41+</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button className="btn" type="button" onClick={() => void load()} disabled={loading}>
            {t("filters.apply")}
          </button>
          <div className="spacer" />
          {loading ? <span className="muted">{t("loading")}</span> : null}
          {err ? <span className="muted" style={{ color: "#b91c1c" }}>{err}</span> : null}
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>{t("table.region")}</th>
              <th>{t("table.type")}</th>
              <th>{t("table.count")}</th>
              <th>{t("table.male")}</th>
              <th>{t("table.female")}</th>
              <th>{t("table.ratio")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any, idx: number) => {
              const m = Number(r.male ?? 0);
              const f = Number(r.female ?? 0);
              const ratio = f === 0 ? (m === 0 ? "0" : "∞") : (m / f).toFixed(2);
              return (
                <tr key={`${r.region_id ?? "null"}-${idx}`}>
                  <td>{r.region_name}</td>
                  <td>{r.region_type ?? ""}</td>
                  <td>{r.count}</td>
                  <td>{m}</td>
                  <td>{f}</td>
                  <td>{ratio}</td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td className="muted" colSpan={6}>-</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
