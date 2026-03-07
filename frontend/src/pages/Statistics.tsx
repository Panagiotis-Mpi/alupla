import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  getPublicStats,
  getPublicStudyPrograms,
  publicAnonExportUrl,
  type StudyProgram,
} from "../lib/api";
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

type Filters = {
  graduation_year: string;
  study_program_id: string;
  gender: "" | "M" | "F";
  age_group: "" | "18-22" | "23-27" | "28-32" | "33-40" | "41+";
};

type ViewMode = "year" | "semester";

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
            <div
              key={r.label}
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr 70px",
                gap: 10,
                alignItems: "center",
              }}
            >
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

function ToggleButtons(props: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  yearLabel: string;
  semesterLabel: string;
}) {
  return (
    <div style={{ display: "inline-flex", gap: 8 }}>
      <button
        type="button"
        className="btn"
        onClick={() => props.onChange("year")}
        style={props.value === "year" ? { background: "#2563eb", color: "#fff", borderColor: "#2563eb" } : undefined}
      >
        {props.yearLabel}
      </button>
      <button
        type="button"
        className="btn"
        onClick={() => props.onChange("semester")}
        style={props.value === "semester" ? { background: "#2563eb", color: "#fff", borderColor: "#2563eb" } : undefined}
      >
        {props.semesterLabel}
      </button>
    </div>
  );
}

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
  const [data, setData] = React.useState<any | null>(null);
  const [countsMode, setCountsMode] = React.useState<ViewMode>("year");
  const [genderMode, setGenderMode] = React.useState<ViewMode>("year");
  const [avgGradeMode, setAvgGradeMode] = React.useState<ViewMode>("year");
  const [directionMode, setDirectionMode] = React.useState<ViewMode>("year");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [sp, st] = await Promise.all([
        getPublicStudyPrograms().catch(() => ({ items: [] })),
        getPublicStats(filters as any),
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
  const avgGrade =
    data?.avg_degree_grade === null || data?.avg_degree_grade === undefined ? "" : Number(data.avg_degree_grade).toFixed(2);

  const termLabel = React.useCallback(
    (term: string) => {
      if (term === "winter") return t("table.winter", { defaultValue: "Χειμερινό" });
      if (term === "spring") return t("table.spring", { defaultValue: "Εαρινό" });
      if (term === "september") return t("table.september", { defaultValue: "Σεπτέμβριος" });
      return term;
    },
    [t]
  );

  const byYearRows = React.useMemo(
    () => (data?.by_year ?? []).map((r: any) => ({ label: String(r.year), value: Number(r.count) || 0 })),
    [data]
  );
  const bySemesterRows = React.useMemo(() => {
    let winter = 0;
    let spring = 0;
    let september = 0;
    for (const r of data?.by_term ?? []) {
      const term = String(r.term);
      const c = Number(r.count) || 0;
      if (term === "winter") winter += c;
      else if (term === "spring") spring += c;
      else if (term === "september") september += c;
    }
    return [
      { label: termLabel("winter"), value: winter },
      { label: termLabel("spring"), value: spring },
      { label: termLabel("september"), value: september },
    ];
  }, [data, termLabel]);

  const ageRows = React.useMemo(
    () => (data?.age_groups ?? []).map((r: any) => ({ label: String(r.label), value: Number(r.count) || 0 })),
    [data]
  );

  const gradeBinsRows = React.useMemo(
    () => (data?.degree_grade_bins ?? []).map((r: any) => ({ label: String(r.label), value: Number(r.count) || 0 })),
    [data]
  );

  const timeToDegreeRows = React.useMemo(
    () =>
      (data?.avg_years_to_degree_by_entry_year ?? []).map((r: any) => ({
        label: String(r.entry_year),
        value: Number(r.avg_years) || 0,
      })),
    [data]
  );

  const countRows = countsMode === "year" ? byYearRows : bySemesterRows;
  const countChartData = React.useMemo(
    () => ({
      labels: countRows.map((r) => r.label),
      datasets: [
        {
          label:
            countsMode === "year"
              ? t("sections.byYear", { defaultValue: "Πλήθος αποφοίτων ανά έτος" })
              : t("sections.bySemester", { defaultValue: "Πλήθος αποφοίτων ανά εξάμηνο" }),
          data: countRows.map((r) => r.value),
          backgroundColor: "#2563eb",
        },
      ],
    }),
    [countRows, countsMode, t]
  );

  const baseBarOptions = React.useMemo(
    () =>
      ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { autoSkip: false, maxRotation: 0 } },
          y: { beginAtZero: true, ticks: { precision: 0 as any } },
        },
      }) as const,
    []
  );

  const genderChartRows = React.useMemo(() => {
    if (genderMode === "year") {
      return (data?.gender_by_year ?? []).map((r: any) => ({
        label: String(r.year),
        male: Number(r.male) || 0,
        female: Number(r.female) || 0,
      }));
    }
    return (data?.gender_by_term ?? []).map((r: any) => ({
      label: termLabel(String(r.term)),
      male: Number(r.male) || 0,
      female: Number(r.female) || 0,
    }));
  }, [data, genderMode, termLabel]);

  const genderChartData = React.useMemo(
    () => ({
      labels: genderChartRows.map((r: any) => r.label),
      datasets: [
        { label: "M", data: genderChartRows.map((r: any) => r.male), backgroundColor: "#2563eb" },
        { label: "F", data: genderChartRows.map((r: any) => r.female), backgroundColor: "#60a5fa" },
      ],
    }),
    [genderChartRows]
  );

  const genderTotals = React.useMemo(() => {
    const male = Number(data?.gender?.M ?? 0);
    const female = Number(data?.gender?.F ?? 0);
    const total = Math.max(1, male + female);
    return {
      male,
      female,
      malePct: Math.round((male / total) * 100),
      femalePct: Math.round((female / total) * 100),
    };
  }, [data]);

  const avgGradeRows = React.useMemo(() => {
    if (avgGradeMode === "year") {
      return (data?.avg_grade_by_year ?? []).map((r: any) => ({ label: String(r.year), value: Number(r.avg) || 0 }));
    }
    return (data?.avg_grade_by_term ?? []).map((r: any) => ({ label: termLabel(String(r.term)), value: Number(r.avg) || 0 }));
  }, [data, avgGradeMode, termLabel]);

  const avgGradeChartData = React.useMemo(
    () => ({
      labels: avgGradeRows.map((r) => r.label),
      datasets: [
        {
          label:
            avgGradeMode === "year"
              ? t("sections.gradeByYear", { defaultValue: "Μέσος όρος βαθμού ανά έτος" })
              : t("sections.gradeBySemester", { defaultValue: "Μέσος όρος βαθμού ανά εξάμηνο" }),
          data: avgGradeRows.map((r) => Number(r.value.toFixed(2))),
          backgroundColor: "#2563eb",
        },
      ],
    }),
    [avgGradeRows, avgGradeMode, t]
  );

  const avgGradeChartOptions = React.useMemo(
    () =>
      ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { autoSkip: false, maxRotation: 0 } },
          y: { beginAtZero: true, suggestedMax: 10 },
        },
      }) as const,
    []
  );

  const directionSeries = React.useMemo(() => {
    const rows = directionMode === "year" ? data?.direction_by_year ?? [] : data?.direction_by_term ?? [];
    const labels = Array.from(
      new Set(
        rows.map((r: any) => (directionMode === "year" ? String(r.year) : termLabel(String(r.term))))
      )
    );
    const directions = Array.from(new Set(rows.map((r: any) => String(r.direction || "Χωρίς κατεύθυνση"))));
    const palette = ["#2563eb", "#60a5fa", "#93c5fd", "#1d4ed8", "#3b82f6", "#1e40af", "#bfdbfe", "#0f172a"];
    const datasets = directions.map((direction: string, index: number) => ({
      label: direction,
      data: labels.map((label) => {
        const row = rows.find((r: any) => {
          const rowLabel = directionMode === "year" ? String(r.year) : termLabel(String(r.term));
          return rowLabel === label && String(r.direction || "Χωρίς κατεύθυνση") === direction;
        });
        return Number(row?.count) || 0;
      }),
      backgroundColor: palette[index % palette.length],
      stack: "directions",
    }));
    return { labels, datasets };
  }, [data, directionMode, termLabel]);

  const directionChartOptions = React.useMemo(
    () =>
      ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" as const } },
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true, ticks: { precision: 0 as any } },
        },
      }) as const,
    []
  );

  const gradeBinsChartData = React.useMemo(
    () => ({
      labels: gradeBinsRows.map((r) => r.label),
      datasets: [
        {
          label: t("sections.gradeDistribution", { defaultValue: "Κατανομή βαθμού" }),
          data: gradeBinsRows.map((r) => r.value),
          backgroundColor: "#2563eb",
        },
      ],
    }),
    [gradeBinsRows, t]
  );

  const timeToDegreeChartData = React.useMemo(
    () => ({
      labels: timeToDegreeRows.map((r) => r.label),
      datasets: [
        {
          label: t("sections.timeToDegreeByEntryYear", { defaultValue: "Μ.Ο. χρόνια για πτυχίο ανά έτος εισαγωγής" }),
          data: timeToDegreeRows.map((r) => Number(r.value.toFixed(2))),
          backgroundColor: "#2563eb",
        },
      ],
    }),
    [timeToDegreeRows, t]
  );

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
            <select className="input" value={filters.study_program_id} onChange={(e) => setFilters((f) => ({ ...f, study_program_id: e.target.value }))}>
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
          {err ? (
            <span className="muted" style={{ color: "#b91c1c" }}>
              {err}
            </span>
          ) : null}
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
          <div className="topbar" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{t("sections.byYear", { defaultValue: "Πλήθος αποφοίτων" })}</h3>
            <div className="spacer" />
            <ToggleButtons
              value={countsMode}
              onChange={setCountsMode}
              yearLabel={t("filters.byYear", { defaultValue: "Ανά έτος" })}
              semesterLabel={t("filters.bySemester", { defaultValue: "Ανά εξάμηνο" })}
            />
          </div>
          <div style={{ height: 260 }}>
            <Bar data={countChartData as any} options={baseBarOptions as any} />
          </div>
        </div>

        <div className="card">
          <div className="topbar" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{t("sections.gender", { defaultValue: "Αναλογία M / F" })}</h3>
            <div className="spacer" />
            <ToggleButtons
              value={genderMode}
              onChange={setGenderMode}
              yearLabel={t("filters.byYear", { defaultValue: "Ανά έτος" })}
              semesterLabel={t("filters.bySemester", { defaultValue: "Ανά εξάμηνο" })}
            />
          </div>

          <div style={{ height: 260 }}>
            <Bar
              data={genderChartData as any}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom" as const } },
                scales: { x: { stacked: false }, y: { beginAtZero: true, ticks: { precision: 0 as any } } },
              } as any}
            />
          </div>
          <div className="muted" style={{ marginTop: 8 }}>
            M: {genderTotals.male} ({genderTotals.malePct}%) | F: {genderTotals.female} ({genderTotals.femalePct}%)
          </div>
        </div>
      </div>

      <div className="grid cols2" style={{ gap: 14 }}>
        <div className="card">
          <div className="topbar" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{t("sections.gradeByYear", { defaultValue: "Μέσος όρος βαθμού" })}</h3>
            <div className="spacer" />
            <ToggleButtons
              value={avgGradeMode}
              onChange={setAvgGradeMode}
              yearLabel={t("filters.byYear", { defaultValue: "Ανά έτος" })}
              semesterLabel={t("filters.bySemester", { defaultValue: "Ανά εξάμηνο" })}
            />
          </div>
          <div style={{ height: 260 }}>
            <Bar data={avgGradeChartData as any} options={avgGradeChartOptions as any} />
          </div>
        </div>

        <div className="card">
          <div className="topbar" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{t("sections.directionCounts", { defaultValue: "Αριθμός ατόμων ανά κατεύθυνση" })}</h3>
            <div className="spacer" />
            <ToggleButtons
              value={directionMode}
              onChange={setDirectionMode}
              yearLabel={t("filters.byYear", { defaultValue: "Ανά έτος" })}
              semesterLabel={t("filters.bySemester", { defaultValue: "Ανά εξάμηνο" })}
            />
          </div>
          {directionSeries.datasets.length === 0 ? (
            <div className="muted">-</div>
          ) : (
            <div style={{ height: 320 }}>
              <Bar data={directionSeries as any} options={directionChartOptions as any} />
            </div>
          )}
        </div>
      </div>

      <div className="grid cols2" style={{ gap: 14 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t("sections.age", { defaultValue: "Κατανομή ηλικιών" })}</h3>
          <BarList title={t("charts.ageGroups", { defaultValue: "Ραβδόγραμμα" })} rows={ageRows} />
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t("sections.gradeDistribution", { defaultValue: "Κατανομή βαθμού" })}</h3>
          {gradeBinsRows.length === 0 ? (
            <div className="muted">-</div>
          ) : (
            <div style={{ height: 260 }}>
              <Bar data={gradeBinsChartData as any} options={baseBarOptions as any} />
            </div>
          )}
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
            <Bar data={timeToDegreeChartData as any} options={avgGradeChartOptions as any} />
          </div>
        )}
      </div>
    </div>
  );
}
