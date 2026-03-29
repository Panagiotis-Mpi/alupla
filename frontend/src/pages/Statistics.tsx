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
const metricValueStyle = { fontSize: 28, fontWeight: 800, marginTop: 10, lineHeight: 1.1 };
const metricCardStyle: React.CSSProperties = { minWidth: 0, minHeight: 146, padding: 22, display: "grid", alignContent: "space-between" };
const metricGridStyle: React.CSSProperties = { display: "grid", gap: 14 };
const metricTopRowStyle: React.CSSProperties = { display: "grid", gap: 14, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" };
const metricBottomRowStyle: React.CSSProperties = { display: "grid", gap: 14, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" };
const yTicks = { precision: 0 as any };
const sectionWrapStyle: React.CSSProperties = { display: "grid", gap: 14 };
const sectionHeaderStyle: React.CSSProperties = { display: "grid", gap: 4, marginTop: 2 };
const sectionTitleStyle: React.CSSProperties = { margin: 0, fontSize: 24, fontWeight: 800 };
const sectionTextStyle: React.CSSProperties = { margin: 0, color: "#64748b", fontSize: 14 };
const sectionMenuStyle: React.CSSProperties = { display: "grid", gap: 12, width: "100%" };
const sectionButtonsStyle: React.CSSProperties = { display: "grid", gap: 12, width: "100%", gridTemplateColumns: "repeat(5, minmax(0, 1fr))" };
const solidBlueFill = "rgba(37, 99, 235, 0.72)";
const pinkFill = "rgba(219, 39, 119, 0.72)";

function buildBarDataset(label: string, data: number[], color = "#2563eb", backgroundColor = solidBlueFill) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor,
    borderWidth: 1.5,
    borderRadius: 8,
    barPercentage: 0.62,
    categoryPercentage: 0.72,
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
      <div style={{ minWidth: contentWidth, width: "100%", height: props.height ?? 280 }}>
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
      <div style={{ minWidth: useFullWidth ? "100%" : contentWidth, width: "100%", height: props.height ?? 280 }}>
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
    <div className="card" style={metricCardStyle}>
      <div className="muted" style={{ fontSize: 15 }}>{props.label}</div>
      <div style={metricValueStyle}>{props.value}</div>
    </div>
  );
}

function ProgramAverageCards(props: {
  title: string;
  labels: string[];
  values: number[];
  minValue?: number;
  maxValue?: number;
  decimals?: number;
}) {
  const safeValues = props.values.map((value) => Number(value ?? 0));
  const minValue = props.minValue ?? 0;
  const maxValue = props.maxValue ?? Math.max(...safeValues, 1);
  const range = Math.max(maxValue - minValue, 1);
  const decimals = props.decimals ?? 0;

  return (
    <div className="card" style={cardInnerStyle}>
      <div className="topbar" style={compactTopbarStyle}>
        <h3 style={{ margin: 0 }}>{props.title}</h3>
      </div>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: `repeat(${Math.max(props.labels.length, 1)}, minmax(0, 1fr))` }}>
        {props.labels.map((label, index) => {
          const value = safeValues[index] ?? 0;
          const progress = Math.max(0, Math.min(100, ((value - minValue) / range) * 100));
          const formattedValue = Number.isFinite(value)
            ? value.toFixed(decimals).replace(/0$/, "").replace(/\.$/, "")
            : "-";

          return (
            <div
              key={`${label}-${index}`}
              style={{
                minHeight: 208,
                border: "1px solid rgba(148, 163, 184, 0.25)",
                borderRadius: 18,
                padding: 22,
                display: "grid",
                gap: 18,
                alignContent: "space-between",
                background: "rgba(248, 250, 252, 0.78)",
              }}
            >
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ color: "#0f172a", fontSize: 16, fontWeight: 800, lineHeight: 1.35, wordBreak: "break-word" }}>{label}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{formattedValue}</div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#64748b" }}>
                  <span>{minValue.toFixed(decimals)}</span>
                  <span>{maxValue.toFixed(decimals)}</span>
                </div>
                <div style={{ height: 12, borderRadius: 999, background: "rgba(148, 163, 184, 0.18)", overflow: "hidden" }}>
                  <div style={{ width: `${progress}%`, height: "100%", borderRadius: 999, background: "#2563eb" }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
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
  horizontal?: boolean;
  fullLabelTooltip?: boolean;
}) {
  const chartHeight = props.height ?? (props.horizontal ? Math.max(300, props.labels.length * 56) : 280);

  return (
    <div className="card" style={cardInnerStyle}>
      <div className="topbar" style={compactTopbarStyle}>
        <h3 style={{ margin: 0 }}>{props.title}</h3>
      </div>
      <ScrollableBarChart
        height={chartHeight}
        labels={props.labels}
        minLabelWidth={props.minLabelWidth}
        maxLabelWidth={props.maxLabelWidth}
        data={{
          labels: props.labels,
          datasets: [buildBarDataset(props.datasetLabel ?? props.title, props.values)],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: props.horizontal ? "y" : "x",
          plugins: {
            legend: { display: false },
            tooltip: props.fullLabelTooltip
              ? {
                  callbacks: {
                    title: (items: any[]) => String(items?.[0]?.label ?? ""),
                  },
                }
              : undefined,
          },
          scales: props.horizontal
            ? {
                x: { beginAtZero: true, ticks: yTicks, grid: { color: "rgba(148, 163, 184, 0.22)" } },
                y: {
                  ticks: {
                    autoSkip: false,
                    color: "#334155",
                    font: { size: 12, weight: "600" },
                    callback: function (_: any, index: number) {
                      const label = String(props.labels[index] ?? "");
                      return label.length > 34 ? `${label.slice(0, 34)}…` : label;
                    },
                  },
                  grid: { display: false },
                },
              }
            : {
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
            x: { offset: false, ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 } },
            y: { beginAtZero: true, ticks: yTicks },
          },
          layout: { padding: { left: 0, right: 0 } },
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

  const activeLang = i18n.language?.toLowerCase().startsWith("en") ? "en" : "el";

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
          x: { offset: false, ticks: { autoSkip: false, maxRotation: 0 } },
          y: { beginAtZero: true, ticks: yTicks },
        },
        layout: { padding: { left: 0, right: 0 } },
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

  const genderChartOptions = React.useMemo(
    () =>
      ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" as const } },
        scales: {
          x: { offset: false, stacked: false, ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 } },
          y: { beginAtZero: true, ticks: yTicks },
        },
        layout: { padding: { left: 0, right: 0 } },
      }) as const,
    []
  );

  const birthYears = seriesFromRows(data?.birth_year_distribution, { labelKey: "year" });
  const avgGradesByYear = seriesFromRows(data?.avg_grade_by_year, { labelKey: "year", valueKey: "avg" });
  const avgGradeByProgram = seriesFromRows(data?.avg_grade_by_program, { labelKey: "name", valueKey: "avg" });
  const gradeBins = seriesFromRows(data?.degree_grade_bins);
  const studyPrograms = seriesFromRows(data?.study_program_distribution, { labelKey: "name" });
  const directions = seriesFromRows(data?.direction_distribution, { labelKey: "name" });
  const regions = seriesFromRows(data?.origin_region_distribution, { labelKey: "name" });
  const municipalities = seriesFromRows(data?.origin_municipality_distribution, { labelKey: "name" });
  const yearsToDegree = seriesFromRows(data?.avg_years_to_degree_by_entry_year, { labelKey: "entry_year", valueKey: "avg_years" });
  const yearsToDegreeDistributionRaw = seriesFromRows(data?.years_to_degree_distribution);

  const yearsToDegreeDistribution = React.useMemo(() => {
    const numericLabels = yearsToDegreeDistributionRaw.labels
      .map((label) => Number(label))
      .filter((value) => Number.isFinite(value));

    if (!numericLabels.length) return yearsToDegreeDistributionRaw;

    const minYear = Math.min(...numericLabels);
    const maxYear = Math.max(...numericLabels);
    const valueMap = new Map<string, number>();

    yearsToDegreeDistributionRaw.labels.forEach((label, index) => {
      valueMap.set(String(label), Number(yearsToDegreeDistributionRaw.values[index] ?? 0));
    });

    const labels: string[] = [];
    const values: number[] = [];

    for (let year = minYear; year <= maxYear; year += 1) {
      labels.push(String(year));
      values.push(Number(valueMap.get(String(year)) ?? 0));
    }

    return { labels, values };
  }, [yearsToDegreeDistributionRaw]);

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
  const busiestYearIndex = byYearRows.length ? byYearRows.findIndex((row) => row.value === Math.max(...byYearRows.map((item) => item.value))) : -1;
  const busiestYear = busiestYearIndex >= 0 ? byYearRows[busiestYearIndex].label : "-";
  const busiestCityIndex = municipalities.values.length ? municipalities.values.findIndex((value) => value === Math.max(...municipalities.values)) : -1;
  const busiestCity = busiestCityIndex >= 0 ? municipalities.labels[busiestCityIndex] : "-";

  const topButtonStyle: React.CSSProperties = {
    minHeight: 48,
    width: "100%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    padding: "0 18px",
    fontSize: 14,
    whiteSpace: "nowrap",
  };

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
    <>
      <div className="grid" style={{ gap: 18 }}>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gap: 14 }}>
              <h2 style={{ margin: 0 }}>{t("pageTitle")}</h2>

              <div style={sectionMenuStyle}>
                <div style={sectionButtonsStyle}>
                  {(["overview", "demographics", "academic", "geography"] as const).map((groupKey) => (
                    <button
                      key={groupKey}
                      type="button"
                      className={activeGroup === groupKey ? "btn primary" : "btn"}
                      style={topButtonStyle}
                      onClick={() => setActiveGroup(groupKey)}
                    >
                      {t(`groups.${groupKey}`)}
                    </button>
                  ))}
                  <button className="btn" type="button" style={topButtonStyle} onClick={downloadAnon}>
                    {t("actions.exportExcel", { defaultValue: "Export Excel" })}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={sectionWrapStyle}>
          <div style={metricGridStyle}>
            <div style={metricTopRowStyle}>
              <MetricCard label={t("cards.total")} value={total} />
              <MetricCard label={t("cards.avgAge")} value={avgAge} />
              <MetricCard label={t("cards.avgGrade")} value={avgGrade} />
            </div>
            <div style={metricBottomRowStyle}>
              <MetricCard label={t("cards.earliestYear")} value={earliestYear} />
              <MetricCard label={t("cards.topGraduationYear")} value={busiestYear} />
              <MetricCard label={t("cards.topCity")} value={busiestCity} />
            </div>
          </div>
        </div>

        {activeGroup === "overview" ? (
          <div style={sectionWrapStyle}>
            <SectionTitle title={t("groups.overview")} subtitle={t("groupText.overview")} />
            <div className="grid cols1" style={{ gap: 14 }}>
              <div className="card" style={cardInnerStyle}>
                <div className="topbar" style={compactTopbarStyle}>
                  <h3 style={{ margin: 0 }}>{t("sections.byYear")}</h3>
                </div>
                <ScrollableLineChart
                  height={320}
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
            <div className="grid cols1" style={{ gap: 14 }}>
              <div className="card" style={cardInnerStyle}>
                <div className="topbar" style={compactTopbarStyle}>
                  <h3 style={{ margin: 0 }}>{t("sections.gender")}</h3>
                </div>
                <ScrollableLineChart
                  height={320}
                  labels={(genderChartData as any).labels ?? []}
                  datasetCount={((genderChartData as any).datasets ?? []).length}
                  data={genderChartData as any}
                  options={genderChartOptions as any}
                />
              </div>
              <ChartCard title={t("sections.birthYear")} labels={birthYears.labels} values={birthYears.values} height={320} />
              <MultiBarChartCard
                title={t("sections.genderByProgram")}
                labels={genderByProgramData.labels}
                height={320}
                minLabelWidth={112}
                maxLabelWidth={176}
                datasets={[
                  buildBarDataset(t("table.male"), genderByProgramData.male, "#2563eb", solidBlueFill),
                  buildBarDataset(t("table.female"), genderByProgramData.female, "#db2777", pinkFill),
                ]}
              />
            </div>
          </div>
        ) : null}

        {activeGroup === "academic" ? (
          <div style={sectionWrapStyle}>
            <SectionTitle title={t("groups.academic")} subtitle={t("groupText.academic")} />
            <div className="grid cols1" style={{ gap: 14 }}>
              <ChartCard title={t("sections.gradeByYear")} labels={avgGradesByYear.labels} values={avgGradesByYear.values} height={320} />
              <BarChartCard title={t("sections.gradeDistribution")} labels={gradeBins.labels} values={gradeBins.values} height={320} minLabelWidth={88} maxLabelWidth={128} />
              <ProgramAverageCards title={t("sections.avgGradeByProgram")} labels={avgGradeByProgram.labels} values={avgGradeByProgram.values} minValue={5} maxValue={10} decimals={2} />
              <ProgramAverageCards title={t("sections.studyProgram")} labels={studyPrograms.labels} values={studyPrograms.values} minValue={0} maxValue={Math.max(...studyPrograms.values, 1)} decimals={0} />
              <ChartCard title={t("sections.timeToDegreeByEntryYear")} labels={yearsToDegree.labels} values={yearsToDegree.values} height={320} />
              <BarChartCard title={t("sections.timeToDegreeDistribution")} labels={yearsToDegreeDistribution.labels} values={yearsToDegreeDistribution.values} height={320} minLabelWidth={76} maxLabelWidth={96} />
              <BarChartCard title={t("sections.direction")} labels={directions.labels} values={directions.values} height={Math.max(360, directions.labels.length * 58)} horizontal fullLabelTooltip minLabelWidth={120} maxLabelWidth={180} />
            </div>
          </div>
        ) : null}

        {activeGroup === "geography" ? (
          <div style={sectionWrapStyle}>
            <SectionTitle title={t("groups.geography")} subtitle={t("groupText.geography")} />
            <div className="grid cols1" style={{ gap: 14 }}>
              <BarChartCard title={t("sections.originRegion")} labels={regions.labels} values={regions.values} height={320} minLabelWidth={104} maxLabelWidth={156} />
              <BarChartCard title={t("sections.originMunicipality")} labels={municipalities.labels} values={municipalities.values} height={320} minLabelWidth={104} maxLabelWidth={156} />
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
