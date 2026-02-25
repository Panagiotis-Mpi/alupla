import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getPublicStats, getPublicStudyPrograms, publicAnonExportUrl, type StudyProgram } from "../lib/api";
import { getUser } from "../lib/auth";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function BarList(props: {
  title: string;
  rows: Array<{ label: string; value: number }>;
  valueFormatter?: (n: number) => string;
}) {
  const max = React.useMemo(() => Math.max(1, ...props.rows.map((r) => Number(r.value) || 0)), [props.rows]);
  const fmt = props.valueFormatter ?? ((n: number) => String(n));

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{props.title}</div>
      <div style={{ display: "grid", gap: 8 }}>
        {props.rows.map((r) => {
          const pct = Math.max(0, Math.min(100, (Number(r.value) / max) * 100));
          return (
            <div key={r.label} style={{ display: "grid", gridTemplateColumns: "120px 1fr 70px", gap: 10, alignItems: "center" }}>
              <div className="muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.label}>
                {r.label}
              </div>
              <div style={{ height: 10, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
                <div
                  style={{
                    width: pct + "%",
                    height: "100%",
                    background: "#2563eb",
                    borderRadius: 999,
                  }}
                />
              </div>
              <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(Number(r.value) || 0)}</div>
            </div>
          );
        })}
        {props.rows.length === 0 ? <div className="muted">-</div> : null}
      </div>
    </div>
  );
}

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

  const byYearRows = React.useMemo(
    () => (data?.by_year ?? []).map((r: any) => ({ label: String(r.year), value: Number(r.count) || 0 })),
    [data]
  );
  const ageRows = React.useMemo(
    () => (data?.age_groups ?? []).map((r: any) => ({ label: String(r.label), value: Number(r.count) || 0 })),
    [data]
  );
  const avgGradeRows = React.useMemo(
    () => (data?.avg_grade_by_year ?? []).map((r: any) => ({ label: String(r.year), value: Number(r.avg) || 0 })),
    [data]
  );


const timeToDegreeRows = React.useMemo(
  () => (data?.avg_years_to_degree_by_entry_year ?? []).map((r: any) => ({ label: String(r.entry_year), value: Number(r.avg_years) || 0 })),
  [data]
);

const byYearChartData = React.useMemo(() => {
  const labels = byYearRows.map((r) => r.label);
  return {
    labels,
    datasets: [
      {
        label: t("sections.byYear"),
        data: byYearRows.map((r) => r.value),
        backgroundColor: "#2563eb",
      },
    ],
  };
}, [byYearRows, t]);

const byYearChartOptions = React.useMemo(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { autoSkip: false, maxRotation: 0 } },
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
  } as const;
}, []);

const avgGradeChartData = React.useMemo(() => {
  const labels = avgGradeRows.map((r) => r.label);
  return {
    labels,
    datasets: [
      {
        label: t("sections.gradeByYear"),
        data: avgGradeRows.map((r) => Number(r.value.toFixed(2))),
        backgroundColor: "#2563eb",
      },
    ],
  };
}, [avgGradeRows, t]);

const avgGradeChartOptions = React.useMemo(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { autoSkip: false, maxRotation: 0 } },
      y: { beginAtZero: true, suggestedMax: 10 },
    },
  } as const;
}, []);

const timeToDegreeChartData = React.useMemo(() => {
  const labels = timeToDegreeRows.map((r) => r.label);
  return {
    labels,
    datasets: [
      {
        label: t("sections.timeToDegreeByEntryYear", { defaultValue: "Μ.Ο. χρόνια για πτυχίο ανά έτος εισαγωγής" }),
        data: timeToDegreeRows.map((r) => Number(r.value.toFixed(2))),
        backgroundColor: "#2563eb",
      },
    ],
  };
}, [timeToDegreeRows, t]);

const timeToDegreeChartOptions = React.useMemo(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { autoSkip: false, maxRotation: 0 } },
      y: { beginAtZero: true },
    },
  } as const;
}, []);


  const termByYear = React.useMemo(() => {
    const rows: Array<any> = data?.by_term ?? [];
    const map = new Map<number, { year: number; winter: number; spring: number; september: number }>();
    for (const r of rows) {
      const y = Number(r.year);
      if (!Number.isFinite(y)) continue;
      const cur = map.get(y) ?? { year: y, winter: 0, spring: 0, september: 0 };
      const term = String(r.term);
      const c = Number(r.count) || 0;
      if (term === "winter") cur.winter += c;
      else if (term === "spring") cur.spring += c;
      else if (term === "september") cur.september += c;
      map.set(y, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.year - b.year);
  }, [data]);

  const termTotalsRows = React.useMemo(() => {
    let winter = 0, spring = 0, september = 0;
    for (const r of (data?.by_term ?? [])) {
      const term = String(r.term);
      const c = Number(r.count) || 0;
      if (term === "winter") winter += c;
      else if (term === "spring") spring += c;
      else if (term === "september") september += c;
    }
    return [
      { label: t("table.winter", { defaultValue: "Χειμερινό" }), value: winter },
      { label: t("table.spring", { defaultValue: "Εαρινό" }), value: spring },
      { label: t("table.september", { defaultValue: "Σεπτέμβρης" }), value: september },
    ];
  }, [data, t]);

  const male = Number(data?.gender?.M ?? 0);
  const female = Number(data?.gender?.F ?? 0);
  const genderTotal = Math.max(1, male + female);
  const malePct = Math.round((male / genderTotal) * 100);
  const femalePct = 100 - malePct;

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

          <div style={{ height: 260 }}>
            <Bar data={byYearChartData as any} options={byYearChartOptions as any} />
          </div>

          </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t("sections.gender")}</h3>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{t("charts.gender", { defaultValue: "Αναλογία" })}</div>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 70px", gap: 10, alignItems: "center" }}>
              <div className="muted">M</div>
              <div style={{ height: 10, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
                <div style={{ width: malePct + "%", height: "100%", background: "#2563eb" }} />
              </div>
              <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{male} ({malePct}%)</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 70px", gap: 10, alignItems: "center", marginTop: 8 }}>
              <div className="muted">F</div>
              <div style={{ height: 10, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
                <div style={{ width: femalePct + "%", height: "100%", background: "#60a5fa" }} />
              </div>
              <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{female} ({femalePct}%)</div>
            </div>
          </div>

          <h3 style={{ marginTop: 18 }}>{t("sections.age")}</h3>

          <BarList title={t("charts.ageGroups", { defaultValue: "Ραβδόγραμμα" })} rows={ageRows} />

          </div>
      </div>


      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t("sections.byTerm", { defaultValue: "Απόφοιτοι ανά εξεταστική" })}</h3>

        <BarList title={t("charts.byTerm", { defaultValue: "Ραβδόγραμμα" })} rows={termTotalsRows} />

        </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t("sections.gradeByYear")}</h3>

        <div style={{ height: 260 }}>
          <Bar data={avgGradeChartData as any} options={avgGradeChartOptions as any} />
        </div>

        </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>
          {t("sections.timeToDegreeByEntryYear", { defaultValue: "Μ.Ο. χρόνια για πτυχίο ανά έτος εισαγωγής" })}
        </h3>

        {timeToDegreeRows.length === 0 ? (
          <div className="muted">-</div>
        ) : (
          <div style={{ height: 260 }}>
            <Bar data={timeToDegreeChartData as any} options={timeToDegreeChartOptions as any} />
          </div>
        )}
      </div>

    </div>
  );
}
