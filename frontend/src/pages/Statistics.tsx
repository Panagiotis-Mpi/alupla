import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";
import { getPublicStats, getPublicStudyPrograms, publicAnonExportUrl, type StudyProgram } from "../lib/api";
import { getUser } from "../lib/auth";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Filters = {
  graduation_year: string;
  study_program_id: string;
  gender: "" | "M" | "F";
  age_group: "" | "18-22" | "23-27" | "28-32" | "33-40" | "41+";
};

export default function Statistics() {
  const { t } = useTranslation("statistics");
  const nav = useNavigate();
  const user = getUser();

  const [programs, setPrograms] = React.useState<StudyProgram[]>([]);
  const [filters, setFilters] = React.useState<Filters>({
    graduation_year: "",
    study_program_id: "",
    gender: "",
    age_group: "",
  });
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [programRes, statsRes] = await Promise.all([
        getPublicStudyPrograms().catch(() => ({ items: [] })),
        getPublicStats(filters),
      ]);
      setPrograms(programRes.items ?? []);
      setData(statsRes);
    } catch (e: any) {
      setErr(e?.message ?? t("error"));
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const total = Number(data?.total ?? 0);
  const avgAge = data?.avg_age == null ? "-" : Number(data.avg_age).toFixed(1);
  const byYearRows = React.useMemo(
    () => (Array.isArray(data?.by_year) ? data.by_year : []).map((r: any) => ({ label: String(r.year), value: Number(r.count) || 0 })),
    [data]
  );

  const male = Number(data?.gender?.M ?? 0);
  const female = Number(data?.gender?.F ?? 0);
  const genderTotal = male + female;
  const malePct = genderTotal > 0 ? Math.round((male / genderTotal) * 100) : 0;
  const femalePct = genderTotal > 0 ? 100 - malePct : 0;

  const byYearChartData = React.useMemo(() => ({
    labels: byYearRows.map((r) => r.label),
    datasets: [{ label: t("sections.byYear"), data: byYearRows.map((r) => r.value), backgroundColor: "#2563eb" }],
  }), [byYearRows, t]);

  const byYearChartOptions = React.useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { ticks: { autoSkip: false, maxRotation: 0 } }, y: { beginAtZero: true, ticks: { precision: 0 } } },
  } as const), []);

  function downloadAnon() {
    const a = document.createElement("a");
    a.href = publicAnonExportUrl(filters);
    a.target = "_blank";
    a.rel = "noreferrer";
    a.click();
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>{t("pageTitle")}</h2>
        <div className="spacer" />
        {!user && (
          <button className="btn" type="button" onClick={() => nav("/login")}>
            {t("login", { defaultValue: "Σύνδεση" })}
          </button>
        )}
        <button className="btn" type="button" onClick={downloadAnon}>
          {t("filters.exportCsv")}
        </button>
      </div>

      <div className="card">
        <div className="grid cols4">
          <div>
            <label className="label">{t("filters.graduationYear")}</label>
            <input className="input" inputMode="numeric" placeholder="YYYY" value={filters.graduation_year} onChange={(e) => setFilters((f) => ({ ...f, graduation_year: e.target.value }))} />
          </div>
          <div>
            <label className="label">{t("filters.studyProgram")}</label>
            <select className="input" value={filters.study_program_id} onChange={(e) => setFilters((f) => ({ ...f, study_program_id: e.target.value }))}>
              <option value="">{t("filters.all")}</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.code} - {p.name_en || p.name_el}</option>
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
          <button className="btn" type="button" onClick={() => void load()} disabled={loading}>{t("filters.apply")}</button>
          {loading ? <span className="muted">{t("loading")}</span> : null}
          {err ? <span className="muted" style={{ color: "#b91c1c" }}>{err}</span> : null}
        </div>
      </div>

      <div className="grid cols2" style={{ gap: 14 }}>
        <div className="card">
          <div className="muted">{t("cards.total")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{total}</div>
        </div>
        <div className="card">
          <div className="muted">{t("cards.avgAge")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{avgAge}</div>
        </div>
      </div>

      <div className="grid cols2" style={{ gap: 14 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t("sections.byYear")}</h3>
          {byYearRows.length === 0 ? <div className="muted">-</div> : <div style={{ height: 280 }}><Bar data={byYearChartData as any} options={byYearChartOptions as any} /></div>}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t("sections.gender")}</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 80px", gap: 10, alignItems: "center" }}>
              <div className="muted">M</div>
              <div style={{ height: 10, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}><div style={{ width: `${malePct}%`, height: "100%", background: "#2563eb" }} /></div>
              <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{male} ({malePct}%)</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 80px", gap: 10, alignItems: "center" }}>
              <div className="muted">F</div>
              <div style={{ height: 10, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}><div style={{ width: `${femalePct}%`, height: "100%", background: "#60a5fa" }} /></div>
              <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{female} ({femalePct}%)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
