import React from "react";
import { useTranslation } from "react-i18next";
import { getPublicStats, publicAnonExportUrl } from "../lib/api";
import { getUser } from "../lib/auth";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend);

type ViewMode = "year" | "semester";

type NamedCountRow = {
  id?: number | null;
  name?: string | null;
  name_el?: string | null;
  name_en?: string | null;
  label?: string | null;
  count?: number | null;
  avg?: number | null;
  avg_years?: number | null;
  year?: number | null;
  entry_year?: number | null;
};

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

function chartContentWidth(labels: string[], datasetCount = 1) {
  const longest = labels.reduce((max, label) => Math.max(max, String(label ?? "").length), 0);
  const labelWidth = Math.max(30, Math.min(64, longest * 4 + 8));
  return Math.max(320, labels.length * Math.max(labelWidth, 16 * Math.max(1, datasetCount)));
}

function ScrollableLineChart(props: {
  data: any;
  options: any;
  height?: number;
  labels: string[];
  datasetCount?: number;
}) {
  const contentWidth = chartContentWidth(props.labels, props.datasetCount ?? 1);

  return (
    <div style={{ width: "100%", maxWidth: "100%", overflowX: "auto", overflowY: "hidden", paddingBottom: 4 }}>
      <div style={{ minWidth: contentWidth, width: contentWidth, height: props.height ?? 280 }}>
        <Line data={props.data} options={props.options} />
      </div>
    </div>
  );
}

function ChartCard(props: {
  title: string;
  labels: string[];
  values: number[];
  datasetLabel?: string;
  height?: number;
  datasetCount?: number;
}) {
  return (
    <div className="card" style={{ minWidth: 0 }}>
      <div className="topbar" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>{props.title}</h3>
      </div>
      <ScrollableLineChart
        height={props.height ?? 280}
        labels={props.labels}
        datasetCount={props.datasetCount}
        data={{
          labels: props.labels,
          datasets: [
            {
              label: props.datasetLabel ?? props.title,
              data: props.values,
              borderColor: "#2563eb",
              backgroundColor: "rgba(37, 99, 235, 0.28)",
              fill: true,
              tension: 0.38,
              pointRadius: 3,
              pointHoverRadius: 4,
              borderWidth: 3,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 } },
            y: { beginAtZero: true, ticks: { precision: 0 as any } },
          },
        } as any}
      />
    </div>
  );
}

export default function Statistics() {
  const { t, i18n } = useTranslation("statistics");
  const user = getUser();

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any | null>(null);
  const [countsMode, setCountsMode] = React.useState<ViewMode>("year");
  const [genderMode, setGenderMode] = React.useState<ViewMode>("year");

  const activeLang = (i18n.resolvedLanguage || i18n.language || "gr").toLowerCase().startsWith("en") ? "en" : "gr";

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

  const seriesFromRows = React.useCallback(
    (
      rows: NamedCountRow[] | undefined,
      options?: {
        valueKey?: "count" | "avg" | "avg_years";
        labelKey?: "label" | "name" | "year" | "entry_year";
      }
    ) => {
      const valueKey = options?.valueKey ?? "count";
      const labelKey = options?.labelKey ?? "label";
      const safeRows = Array.isArray(rows) ? rows : [];
      return {
        labels: safeRows.map((row) => {
          if (labelKey === "year") return String(row.year ?? "-");
          if (labelKey === "entry_year") return String(row.entry_year ?? "-");
          if (labelKey === "name") {
            const value = activeLang === "en" ? row.name_en ?? row.name_el ?? row.name : row.name_el ?? row.name_en ?? row.name;
            return String(value ?? "-");
          }
          return String(row.label ?? row.name ?? row.name_el ?? row.name_en ?? row.year ?? row.entry_year ?? "-");
        }),
        values: safeRows.map((row) => Number(row[valueKey] ?? 0)),
      };
    },
    [activeLang]
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
            borderColor: "#2563eb",
            backgroundColor: "rgba(37, 99, 235, 0.28)",
            fill: true,
            tension: 0.38,
            pointRadius: 3,
            pointHoverRadius: 4,
            borderWidth: 3,
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
        borderColor: termColors[term],
        backgroundColor: `${termColors[term]}33`,
        fill: false,
        tension: 0.38,
        pointRadius: 3,
        pointHoverRadius: 4,
        borderWidth: 3,
      })),
    };
  }, [bySemesterRows, byYearRows, countsMode, t, termLabel]);

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

  const genderChartData = React.useMemo(() => {
    if (genderMode === "year") {
      const rows = (data?.gender_by_year ?? []).map((r: any) => ({
        label: String(r.year),
        male: Number(r.male) || 0,
        female: Number(r.female) || 0,
      }));

      return {
        labels: rows.map((r: any) => r.label),
        datasets: [
          {
            label: t("table.male", { defaultValue: "Άνδρες" }),
            data: rows.map((r: any) => r.male),
            borderColor: "#2563eb",
            backgroundColor: "rgba(37, 99, 235, 0.28)",
            fill: true,
            tension: 0.38,
            pointRadius: 3,
            pointHoverRadius: 4,
            borderWidth: 3,
          },
          {
            label: t("table.female", { defaultValue: "Γυναίκες" }),
            data: rows.map((r: any) => r.female),
            borderColor: "#60a5fa",
            backgroundColor: "rgba(96, 165, 250, 0.22)",
            fill: false,
            tension: 0.38,
            pointRadius: 3,
            pointHoverRadius: 4,
            borderWidth: 3,
          },
        ],
      };
    }

    const labels = Array.from(new Set((data?.gender_by_term ?? []).map((r: any) => String(r.year))));
    const termOrder = ["winter", "spring", "september"] as const;
    return {
      labels,
      datasets: termOrder.flatMap((term) => [
        {
          label: `${t("table.male", { defaultValue: "Άνδρες" })} ${termLabel(term)}`,
          data: labels.map(
            (year) =>
              (data?.gender_by_term ?? []).find((r: any) => String(r.year) === year && String(r.term) === term)?.male ?? 0
          ),
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.22)",
          fill: false,
          tension: 0.38,
          pointRadius: 3,
          pointHoverRadius: 4,
          borderWidth: 3,
        },
        {
          label: `${t("table.female", { defaultValue: "Γυναίκες" })} ${termLabel(term)}`,
          data: labels.map(
            (year) =>
              (data?.gender_by_term ?? []).find((r: any) => String(r.year) === year && String(r.term) === term)?.female ?? 0
          ),
          borderColor: "#60a5fa",
          backgroundColor: "rgba(96, 165, 250, 0.22)",
          fill: false,
          tension: 0.38,
          pointRadius: 3,
          pointHoverRadius: 4,
          borderWidth: 3,
        },
      ]),
    };
  }, [data, genderMode, t, termLabel]);

  const ageGroups = seriesFromRows(data?.age_groups);
  const birthYears = seriesFromRows(data?.birth_year_distribution, { labelKey: "year" });
  const avgGradesByYear = seriesFromRows(data?.avg_grade_by_year, { labelKey: "year", valueKey: "avg" });
  const gradeBins = seriesFromRows(data?.degree_grade_bins);
  const studyPrograms = seriesFromRows(data?.study_program_distribution, { labelKey: "name" });
  const directions = seriesFromRows(data?.direction_distribution, { labelKey: "name" });
  const regions = seriesFromRows(data?.origin_region_distribution, { labelKey: "name" });
  const municipalities = seriesFromRows(data?.origin_municipality_distribution, { labelKey: "name" });
  const oathYears = seriesFromRows(data?.oath_year_distribution, { labelKey: "year" });
  const yearsToDegree = seriesFromRows(data?.avg_years_to_degree_by_entry_year, { labelKey: "entry_year", valueKey: "avg_years" });

  function downloadAnon() {
    const url = publicAnonExportUrl({
      counts_mode: countsMode,
      gender_mode: genderMode,
    });
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.click();
  }

  if (loading && !data) {
    return <div className="card">{t("loading")}</div>;
  }

  if (err && !data) {
    return <div className="card">{err}</div>;
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>{t("pageTitle")}</h2>
        <div className="spacer" />
        <button className="btn" type="button" onClick={downloadAnon}>
          {t("actions.exportExcel", { defaultValue: "Export Excel" })}
        </button>
      </div>

      <div className="grid cols3" style={{ gap: 14 }}>
        <div className="card" style={{ minWidth: 0 }}>
          <div className="muted">{t("cards.total")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{total}</div>
        </div>
        <div className="card" style={{ minWidth: 0 }}>
          <div className="muted">{t("cards.avgAge")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{avgAge || "-"}</div>
        </div>
        <div className="card" style={{ minWidth: 0 }}>
          <div className="muted">{t("cards.avgGrade")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{avgGrade || "-"}</div>
        </div>
      </div>

      <div className="grid cols2" style={{ gap: 14 }}>
        <div className="card" style={{ minWidth: 0 }}>
          <div className="topbar" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{t("sections.byYear")}</h3>
            <div className="spacer" />
            <ToggleButtons
              value={countsMode}
              onChange={setCountsMode}
              yearLabel={t("filters.byYear", { defaultValue: "Ανά έτος" })}
              semesterLabel={t("filters.bySemester", { defaultValue: "Ανά εξάμηνο" })}
            />
          </div>
          <ScrollableLineChart height={260} labels={(countChartData as any).labels ?? []} datasetCount={((countChartData as any).datasets ?? []).length} data={countChartData as any} options={countChartOptions as any} />
        </div>

        <div className="card" style={{ minWidth: 0 }}>
          <div className="topbar" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{t("sections.gender")}</h3>
            <div className="spacer" />
            <ToggleButtons
              value={genderMode}
              onChange={setGenderMode}
              yearLabel={t("filters.byYear", { defaultValue: "Ανά έτος" })}
              semesterLabel={t("filters.bySemester", { defaultValue: "Ανά εξάμηνο" })}
            />
          </div>
          <ScrollableLineChart
            height={260}
            labels={(genderChartData as any).labels ?? []}
            datasetCount={((genderChartData as any).datasets ?? []).length}
            data={genderChartData as any}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: "bottom" as const } },
              scales: { x: { stacked: false, ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 } }, y: { beginAtZero: true, ticks: { precision: 0 as any } } },
            } as any}
          />
        </div>
      </div>

      <div className="grid cols2" style={{ gap: 14 }}>
        <ChartCard title={t("sections.age")} labels={ageGroups.labels} values={ageGroups.values} />
        <ChartCard title={t("sections.birthYear")} labels={birthYears.labels} values={birthYears.values} />
      </div>

      <div className="grid cols2" style={{ gap: 14 }}>
        <ChartCard title={t("sections.gradeByYear")} labels={avgGradesByYear.labels} values={avgGradesByYear.values} />
        <ChartCard title={t("sections.gradeDistribution")} labels={gradeBins.labels} values={gradeBins.values} />
      </div>

      <div className="grid cols2" style={{ gap: 14 }}>
        <ChartCard title={t("sections.studyProgram")} labels={studyPrograms.labels} values={studyPrograms.values} height={320} />
        <ChartCard title={t("sections.direction")} labels={directions.labels} values={directions.values} height={320} />
      </div>

      <div className="grid cols2" style={{ gap: 14 }}>
        <ChartCard title={t("sections.originRegion")} labels={regions.labels} values={regions.values} height={320} />
        <ChartCard title={t("sections.originMunicipality")} labels={municipalities.labels} values={municipalities.values} height={320} />
      </div>

      <div className="grid cols2" style={{ gap: 14 }}>
        <ChartCard title={t("sections.oathYear")} labels={oathYears.labels} values={oathYears.values} />
        <ChartCard title={t("sections.timeToDegreeByEntryYear")} labels={yearsToDegree.labels} values={yearsToDegree.values} />
      </div>
    </div>
  );
}
