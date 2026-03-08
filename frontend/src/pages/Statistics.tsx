import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getPublicStats, publicAnonExportUrl } from "../lib/api";
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

type ViewMode = "year" | "semester";

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
        className={props.value === "year" ? "btn primary" : "btn"}
        onClick={() => props.onChange("year")}
      >
        {props.yearLabel}
      </button>
      <button
        type="button"
        className={props.value === "semester" ? "btn primary" : "btn"}
        onClick={() => props.onChange("semester")}
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

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any | null>(null);
  const [countsMode, setCountsMode] = React.useState<ViewMode>("year");
  const [genderMode, setGenderMode] = React.useState<ViewMode>("year");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const st = await getPublicStats();
      setData(st);
    } catch (e: any) {
      setErr(e?.message ?? t("error"));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();

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
  const bySemesterRows = React.useMemo(
    () =>
      (data?.by_term ?? []).map((r: any) => ({
        year: String(r.year),
        term: String(r.term),
        label: `${String(r.year)} ${termLabel(String(r.term))}`,
        value: Number(r.count) || 0,
      })),
    [data, termLabel]
  );

  const countChartData = React.useMemo(() => {
    if (countsMode === "year") {
      return {
        labels: byYearRows.map((r) => r.label),
        datasets: [
          {
            label: t("sections.byYear", { defaultValue: "Πλήθος αποφοίτων ανά έτος" }),
            data: byYearRows.map((r) => r.value),
            backgroundColor: "#2563eb",
          },
        ],
      };
    }

    const labels = Array.from(new Set(bySemesterRows.map((r) => r.year)));
    const termOrder = ["winter", "spring", "september"] as const;
    const termColors: Record<string, string> = {
      winter: "#2563eb",
      spring: "#60a5fa",
      september: "#93c5fd",
    };

    return {
      labels,
      datasets: termOrder.map((term) => ({
        label: termLabel(term),
        data: labels.map((year) => bySemesterRows.find((r) => r.year === year && r.term === term)?.value ?? 0),
        backgroundColor: termColors[term],
      })),
    };
  }, [bySemesterRows, byYearRows, countsMode, t, termLabel]);

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

  const countChartOptions = React.useMemo(
    () =>
      ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend:
            countsMode === "semester"
              ? { display: true, position: "bottom" as const }
              : { display: false },
        },
        scales: {
          x: { ticks: { autoSkip: false, maxRotation: 0 } },
          y: { beginAtZero: true, ticks: { precision: 0 as any } },
        },
      }) as const,
    [countsMode]
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

  function downloadAnon() {
    const url = publicAnonExportUrl();
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
            <h3 style={{ margin: 0 }}>{"Πλήθος αποφοίτων"}</h3>
            <div className="spacer" />
            <ToggleButtons
              value={countsMode}
              onChange={setCountsMode}
              yearLabel={t("filters.byYear", { defaultValue: "Ανά έτος" })}
              semesterLabel={t("filters.bySemester", { defaultValue: "Ανά εξάμηνο" })}
            />
          </div>
          <div style={{ height: 260 }}>
            <Bar data={countChartData as any} options={countChartOptions as any} />
          </div>
        </div>

        <div className="card">
          <div className="topbar" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{"Αναλογία φύλων"}</h3>
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
        </div>
      </div>

    </div>
  );
}
