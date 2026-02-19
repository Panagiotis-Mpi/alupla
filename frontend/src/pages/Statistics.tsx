import React from "react";
import { useTranslation } from "react-i18next";
import { getPublicStats, getPublicStudyPrograms, publicAnonExportUrl, type StudyProgram } from "../lib/api";

type Filters = {
  graduation_year: string;
  study_program_id: string;
  gender: "" | "M" | "F";
  age_group: "" | "18-22" | "23-27" | "28-32" | "33-40" | "41+";
};

export default function Statistics() {
  const { t } = useTranslation("statistics");

  const [programs, setPrograms] = React.useState<StudyProgram[]>([]);
  const [filters, setFilters] = React.useState<Filters>({ graduation_year: "", study_program_id: "", gender: "", age_group: "" });
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [sp, st] = await Promise.all([
        getPublicStudyPrograms().catch(() => ({ items: [] })),
        getPublicStats(filters as any)
      ]);
      setPrograms(sp.items ?? []);
      setData(st);
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

  const total = Number(data?.total ?? 0);
  const avgAge = data?.avg_age === null || data?.avg_age === undefined ? "" : Number(data.avg_age).toFixed(1);
  const avgGrade = data?.avg_degree_grade === null || data?.avg_degree_grade === undefined ? "" : Number(data.avg_degree_grade).toFixed(2);

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

      <div className="grid cols3" style={{ gap: 14 }}>
        <div className="card">
          <div className="muted">{t("cards.total")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{total}</div>
        </div>
        <div className="card">
          <div className="muted">{t("cards.avgAge")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{avgAge || "-"}</div>
        </div>
        <div className="card">
          <div className="muted">{t("cards.avgGrade")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{avgGrade || "-"}</div>
        </div>
      </div>

      <div className="grid cols2" style={{ gap: 14 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t("sections.byYear")}</h3>
          <table className="table">
            <thead>
              <tr>
                <th>{t("table.year")}</th>
                <th>{t("table.count")}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.by_year ?? []).map((r: any) => (
                <tr key={r.year}>
                  <td>{r.year}</td>
                  <td>{r.count}</td>
                </tr>
              ))}
              {(!data?.by_year || data.by_year.length === 0) && (
                <tr>
                  <td colSpan={2} className="muted">-</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t("sections.gender")}</h3>
          <table className="table">
            <thead>
              <tr>
                <th>{t("table.male")}</th>
                <th>{t("table.female")}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{Number(data?.gender?.M ?? 0)}</td>
                <td>{Number(data?.gender?.F ?? 0)}</td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ marginTop: 18 }}>{t("sections.age")}</h3>
          <table className="table">
            <thead>
              <tr>
                <th>{t("table.ageGroup")}</th>
                <th>{t("table.count")}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.age_groups ?? []).map((r: any) => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  <td>{r.count}</td>
                </tr>
              ))}
              {(!data?.age_groups || data.age_groups.length === 0) && (
                <tr>
                  <td colSpan={2} className="muted">-</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t("sections.gradeByYear")}</h3>
        <table className="table">
          <thead>
            <tr>
              <th>{t("table.year")}</th>
              <th>{t("table.avg")}</th>
            </tr>
          </thead>
          <tbody>
            {(data?.avg_grade_by_year ?? []).map((r: any) => (
              <tr key={r.year}>
                <td>{r.year}</td>
                <td>{Number(r.avg).toFixed(2)}</td>
              </tr>
            ))}
            {(!data?.avg_grade_by_year || data.avg_grade_by_year.length === 0) && (
              <tr>
                <td colSpan={2} className="muted">-</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
