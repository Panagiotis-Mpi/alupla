import React from "react";
import { useTranslation } from "react-i18next";
import { getPublicStats, publicAnonExportUrl } from "../lib/api";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
  BarElement,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, BarElement, Filler, Tooltip, Legend);

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
  male?: number | null;
  female?: number | null;
};

const cardInnerStyle = { minWidth: 0 };
const compactTopbarStyle = { marginBottom: 12 };
const metricValueStyle = { fontSize: 28, fontWeight: 800, marginTop: 6 };
const yTicks = { precision: 0 as any };
const sectionWrapStyle: React.CSSProperties = { display: "grid", gap: 14 };
const sectionHeaderStyle: React.CSSProperties = { display: "grid", gap: 4, marginTop: 2 };
const sectionTitleStyle: React.CSSProperties = { margin: 0, fontSize: 24, fontWeight: 800 };
const sectionTextStyle: React.CSSProperties = { margin: 0, color: "#64748b", fontSize: 14 };
const sectionMenuStyle: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" };
const solidBlueFill = "rgba(37, 99, 235, 0.72)";

function buildBarDataset(label: string, data: number[], color = "#2563eb", backgroundColor = solidBlueFill) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor,
    borderWidth: 1.5,
    borderRadius: 0,
    barPercentage: 0.42,
    categoryPercentage: 0.56,
    maxBarThickness: 42,
  };
}

function buildLineDataset(label: string, data: number[], color: string, background: string, fill = true) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: background,
    fill,
    tension: 0.38,
    pointRadius: 3,
    pointHoverRadius: 4,
    borderWidth: 3,
  };
}

function chartContentWidth(labels: string[], datasetCount = 1, minLabelWidth = 68, maxLabelWidth = 128) {
  const longest = labels.reduce((max, label) => Math.max(max, String(label ?? "").length), 0);
  const labelWidth = Math.max(minLabelWidth, Math.min(maxLabelWidth, longest * 5 + 20));
  return Math.max(640, labels.length * Math.max(labelWidth, 44 * Math.max(1, datasetCount)));
}

function ScrollableLineChart(props: {
  data: any;
  options: any;
  height?: number;
  labels: string[];
  datasetCount?: number;
  minLabelWidth?: number;
  maxLabelWidth?: number;
}) {
  const contentWidth = chartContentWidth(props.labels, props.datasetCount ?? 1, props.minLabelWidth ?? 68, props.maxLabelWidth ?? 128);

  return (
    <div style={{ width: "100%", maxWidth: "100%", overflowX: "auto", overflowY: "hidden", paddingBottom: 4 }}>
      <div style={{ minWidth: contentWidth, width: contentWidth, height: props.height ?? 280 }}>
        <Line data={props.data} options={props.options} />
      </div>
    </div>
  );
}

function ScrollableBarChart(props: {
  data: any;
  options: any;
  height?: number;
  labels: string[];
  datasetCount?: number;
  minLabelWidth?: number;
  maxLabelWidth?: number;
}) {
  const contentWidth = chartContentWidth(props.labels, props.datasetCount ?? 1, props.minLabelWidth ?? 72, props.maxLabelWidth ?? 124);
  const useFullWidth = props.labels.length <= 7;

  return (
    <div style={{ width: "100%", maxWidth: "100%", overflowX: "auto", overflowY: "hidden", paddingBottom: 4 }}>
      <div style={{ minWidth: useFullWidth ? "100%" : contentWidth, width: useFullWidth ? "100%" : contentWidth, height: props.height ?? 280 }}>
        <Bar data={props.data} options={props.options} />
      </div>
    </div>
  );
}

function SectionTitle(props: { title: string; subtitle?: string }) {
  return (
    <div style={sectionHeaderStyle}>
      <h3 style={sectionTitleStyle}>{props.title}</h3>
      {props.subtitle ? <p style={sectionTextStyle}>{props.subtitle}</p> : null}
    </div>
  );
}

function MetricCard(props: { label: string; value: string | number }) {
  return (
    <div className="card" style={cardInnerStyle}>
      <div className="muted">{props.label}</div>
      <div style={metricValueStyle}>{props.value}</div>
    </div>
  );
}

function BarChartCard(props: {
  title: string;
  labels: string[];
  values: number[];
  datasetLabel?: string;
  height?: number;
  minLabelWidth?: number;
  maxLabelWidth?: number;
}) {
  return (
    <div className="card" style={cardInnerStyle}>
      <div className="topbar" style={compactTopbarStyle}>
        <h3 style={{ margin: 0 }}>{props.title}</h3>
      </div>
      <ScrollableBarChart
        height={props.height ?? 280}
        labels={props.labels}
        minLabelWidth={props.minLabelWidth}
        maxLabelWidth={props.maxLabelWidth}
        data={{
          labels: props.labels,
          datasets: [
buildBarDataset(props.datasetLabel ?? props.title, props.values),
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 }, grid: { display: false } },
            y: { beginAtZero: true, ticks: yTicks },
          },
        } as any}
      />
    </div>
  );
}

function MultiBarChartCard(props: {
  title: string;
  labels: string[];
  datasets: any[];
  height?: number;
  minLabelWidth?: number;
  maxLabelWidth?: number;
  stacked?: boolean;
}) {
  return (
    <div className="card" style={cardInnerStyle}>
      <div className="topbar" style={compactTopbarStyle}>
        <h3 style={{ margin: 0 }}>{props.title}</h3>
      </div>
      <ScrollableBarChart
        height={props.height ?? 320}
        labels={props.labels}
        datasetCount={props.datasets.length}
        minLabelWidth={props.minLabelWidth}
        maxLabelWidth={props.maxLabelWidth}
        data={{ labels: props.labels, datasets: props.datasets }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom" as const } },
          scales: {
            x: {
              stacked: !!props.stacked,
              ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 },
              grid: { display: false },
            },
            y: {
              beginAtZero: true,
              stacked: !!props.stacked,
              ticks: yTicks,
            },
          },
        } as any}
      />
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
  minLabelWidth?: number;
  maxLabelWidth?: number;
}) {
  return (
    <div className="card" style={cardInnerStyle}>
      <div className="topbar" style={compactTopbarStyle}>
        <h3 style={{ margin: 0 }}>{props.title}</h3>
      </div>
      <ScrollableLineChart
        height={props.height ?? 280}
        labels={props.labels}
        datasetCount={props.datasetCount}
        minLabelWidth={props.minLabelWidth}
        maxLabelWidth={props.maxLabelWidth}
        data={{
          labels: props.labels,
          datasets: [buildLineDataset(props.datasetLabel ?? props.title, props.values, "#2563eb", "rgba(37, 99, 235, 0.28)")],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 } },
            y: { beginAtZero: true, ticks: yTicks },
          },
        } as any}
      />
    </div>
  );
}

export default function Statistics() {
  const { t, i18n } = useTranslation("statistics");

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any | null>(null);
  const [activeGroup, setActiveGroup] = React.useState<"overview" | "demographics" | "academic" | "geography">("overview");
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
  const avgAge = data?.avg_age === null || data?.avg_age === undefined ? "-" : Number(data.avg_age).toFixed(1);
  const avgGrade = data?.avg_degree_grade === null || data?.avg_degree_grade === undefined ? "-" : Number(data.avg_degree_grade).toFixed(2);

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

  const countChartData = React.useMemo(
    () => ({
      labels: byYearRows.map((r) => r.label),
      datasets: [
        buildLineDataset(
          t("sections.byYear", { defaultValue: "Πλήθος αποφοίτων ανά έτος" }),
          byYearRows.map((r) => r.value),
          "#2563eb",
          "rgba(37, 99, 235, 0.28)"
        ),
      ],
    }),
    [byYearRows, t]
  );

  const countChartOptions = React.useMemo(
    () =>
      ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { autoSkip: false, maxRotation: 0 } },
          y: { beginAtZero: true, ticks: yTicks },
        },
      }) as const,
    []
  );

  const genderChartData = React.useMemo(() => {
    const rows = (data?.gender_by_year ?? []).map((r: any) => ({
      label: String(r.year),
      male: Number(r.male) || 0,
      female: Number(r.female) || 0,
    }));

    return {
      labels: rows.map((r: any) => r.label),
      datasets: [
        buildLineDataset(t("table.male", { defaultValue: "Άνδρες" }), rows.map((r: any) => r.male), "#2563eb", "rgba(37, 99, 235, 0.22)"),
        buildLineDataset(t("table.female", { defaultValue: "Γυναίκες" }), rows.map((r: any) => r.female), "#db2777", "rgba(219, 39, 119, 0.22)"),
      ],
    };
  }, [data, t]);

  const ageGroups = seriesFromRows(data?.age_groups);
  const birthYears = seriesFromRows(data?.birth_year_distribution, { labelKey: "year" });
  const avgGradesByYear = seriesFromRows(data?.avg_grade_by_year, { labelKey: "year", valueKey: "avg" });
  const avgGradeByProgram = seriesFromRows(data?.avg_grade_by_program, { labelKey: "name", valueKey: "avg" });
  const gradeBins = seriesFromRows(data?.degree_grade_bins);
  const studyPrograms = seriesFromRows(data?.study_program_distribution, { labelKey: "name" });
  const directions = seriesFromRows(data?.direction_distribution, { labelKey: "name" });
  const regions = seriesFromRows(data?.origin_region_distribution, { labelKey: "name" });
  const municipalities = seriesFromRows(data?.origin_municipality_distribution, { labelKey: "name" });
  const yearsToDegree = seriesFromRows(data?.avg_years_to_degree_by_entry_year, { labelKey: "entry_year", valueKey: "avg_years" });
  const yearsToDegreeDistribution = seriesFromRows(data?.years_to_degree_distribution);

  const genderByProgramData = React.useMemo(() => {
    const rows = (data?.gender_by_program ?? []) as NamedCountRow[];
    return {
      labels: rows.map((row) => String(activeLang === "en" ? row.name_en ?? row.name_el ?? row.name : row.name_el ?? row.name_en ?? row.name ?? "-")),
      male: rows.map((row) => Number(row.male ?? 0)),
      female: rows.map((row) => Number(row.female ?? 0)),
    };
  }, [activeLang, data]);

  const graduationYears = byYearRows.map((row) => Number(row.label)).filter((value) => Number.isFinite(value));
  const earliestYear = graduationYears.length ? Math.min(...graduationYears) : "-";
  const latestYear = graduationYears.length ? Math.max(...graduationYears) : "-";
  const topAgeIndex = ageGroups.values.length ? ageGroups.values.indexOf(Math.max(...ageGroups.values)) : -1;
  const topAgeGroup = topAgeIndex >= 0 ? ageGroups.labels[topAgeIndex] : "-";

  function downloadAnon() {
    const url = publicAnonExportUrl({});
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.click();
  }

  if (loading && !data) return <div className="card">{t("loading")}</div>;
  if (err && !data) return <div className="card">{err}</div>;

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>{t("pageTitle")}</h2>
        <div className="spacer" />
        <button className="btn" type="button" onClick={downloadAnon}>
          {t("actions.exportExcel", { defaultValue: "Export Excel" })}
        </button>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={sectionMenuStyle}>
          {(["overview", "demographics", "academic", "geography"] as const).map((groupKey) => (
            <button
              key={groupKey}
              type="button"
              className={activeGroup === groupKey ? "btn primary" : "btn"}
              onClick={() => setActiveGroup(groupKey)}
            >
              {t(`groups.${groupKey}`)}
            </button>
          ))}
        </div>
      </div>

      {activeGroup === "overview" ? (
        <div style={sectionWrapStyle}>
          <SectionTitle title={t("groups.overview")} subtitle={t("groupText.overview")} />
          <div className="grid cols4" style={{ gap: 14 }}>
            <MetricCard label={t("cards.total")} value={total} />
            <MetricCard label={t("cards.avgAge")} value={avgAge} />
            <MetricCard label={t("cards.avgGrade")} value={avgGrade} />
            <MetricCard label={t("cards.topAgeGroup")} value={topAgeGroup} />
          </div>
          <div className="grid cols2" style={{ gap: 14 }}>
            <MetricCard label={t("cards.earliestYear")} value={earliestYear} />
            <MetricCard label={t("cards.latestYear")} value={latestYear} />
          </div>
          <div className="grid cols1" style={{ gap: 14 }}>
            <div className="card" style={cardInnerStyle}>
              <div className="topbar" style={compactTopbarStyle}>
                <h3 style={{ margin: 0 }}>{t("sections.byYear")}</h3>
              </div>
              <ScrollableLineChart
                height={260}
                labels={(countChartData as any).labels ?? []}
                datasetCount={((countChartData as any).datasets ?? []).length}
                data={countChartData as any}
                options={countChartOptions as any}
              />
            </div>
          </div>
        </div>
      ) : null}

      {activeGroup === "demographics" ? (
        <div style={sectionWrapStyle}>
          <SectionTitle title={t("groups.demographics")} subtitle={t("groupText.demographics")} />
          <div className="grid cols2" style={{ gap: 14 }}>
            <div className="card" style={cardInnerStyle}>
              <div className="topbar" style={compactTopbarStyle}>
                <h3 style={{ margin: 0 }}>{t("sections.gender")}</h3>
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
                  scales: {
                    x: { stacked: false, ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 } },
                    y: { beginAtZero: true, ticks: yTicks },
                  },
                } as any}
              />
            </div>
            <BarChartCard title={t("sections.age")} labels={ageGroups.labels} values={ageGroups.values} height={320} minLabelWidth={92} maxLabelWidth={136} />
          </div>
          <div className="grid cols2" style={{ gap: 14 }}>
            <ChartCard title={t("sections.birthYear")} labels={birthYears.labels} values={birthYears.values} />
            <MultiBarChartCard
              title={t("sections.genderByProgram")}
              labels={genderByProgramData.labels}
              minLabelWidth={112}
              maxLabelWidth={176}
              datasets={[
                buildBarDataset(t("table.male"), genderByProgramData.male, "#2563eb", solidBlueFill),
                buildBarDataset(t("table.female"), genderByProgramData.female, "#db2777", "rgba(219, 39, 119, 0.72)"),
              ]}
            />
          </div>
        </div>
      ) : null}

      {activeGroup === "academic" ? (
        <div style={sectionWrapStyle}>
          <SectionTitle title={t("groups.academic")} subtitle={t("groupText.academic")} />
          <div className="grid cols2" style={{ gap: 14 }}>
            <ChartCard title={t("sections.gradeByYear")} labels={avgGradesByYear.labels} values={avgGradesByYear.values} />
            <BarChartCard title={t("sections.gradeDistribution")} labels={gradeBins.labels} values={gradeBins.values} height={320} minLabelWidth={88} maxLabelWidth={128} />
          </div>
          <div className="grid cols2" style={{ gap: 14 }}>
            <BarChartCard title={t("sections.avgGradeByProgram")} labels={avgGradeByProgram.labels} values={avgGradeByProgram.values} height={320} minLabelWidth={112} maxLabelWidth={176} />
            <BarChartCard title={t("sections.studyProgram")} labels={studyPrograms.labels} values={studyPrograms.values} height={320} minLabelWidth={112} maxLabelWidth={176} />
          </div>
          <div className="grid cols2" style={{ gap: 14 }}>
            <ChartCard title={t("sections.timeToDegreeByEntryYear")} labels={yearsToDegree.labels} values={yearsToDegree.values} />
            <BarChartCard title={t("sections.timeToDegreeDistribution")} labels={yearsToDegreeDistribution.labels} values={yearsToDegreeDistribution.values} height={320} minLabelWidth={80} maxLabelWidth={112} />
          </div>
          <div className="grid cols2" style={{ gap: 14 }}>
            <ChartCard title={t("sections.direction")} labels={directions.labels} values={directions.values} height={320} minLabelWidth={112} maxLabelWidth={176} />
          </div>
        </div>
      ) : null}

      {activeGroup === "geography" ? (
        <div style={sectionWrapStyle}>
          <SectionTitle title={t("groups.geography")} subtitle={t("groupText.geography")} />
          <div className="grid cols2" style={{ gap: 14 }}>
            <BarChartCard title={t("sections.originRegion")} labels={regions.labels} values={regions.values} height={320} minLabelWidth={104} maxLabelWidth={156} />
            <BarChartCard title={t("sections.originMunicipality")} labels={municipalities.labels} values={municipalities.values} height={320} minLabelWidth={104} maxLabelWidth={156} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
