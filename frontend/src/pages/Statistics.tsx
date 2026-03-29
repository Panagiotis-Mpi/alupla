import React from "react";
import { useTranslation } from "react-i18next";
import { getPublicStats } from "../lib/api";
import { utils as XLSXUtils, writeFile as writeXlsxFile } from "xlsx";
import { jsPDF } from "jspdf";
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

type ExportFormat = "xlsx" | "csv" | "pdf";
type ExportItem = {
  key: string;
  title: string;
  kind: "summary" | "line" | "bar" | "multibar";
  rows: Array<Record<string, string | number>>;
  chartData?: any;
  chartOptions?: any;
  width?: number;
  height?: number;
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
}) {
  const safeValues = props.values.map((value) => Number(value ?? 0));
  const overall = safeValues.length ? safeValues.reduce((sum, value) => sum + value, 0) / safeValues.length : 0;

  return (
    <div className="card" style={cardInnerStyle}>
      <div className="topbar" style={compactTopbarStyle}>
        <h3 style={{ margin: 0 }}>{props.title}</h3>
      </div>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: `repeat(${Math.max(props.labels.length, 1)}, minmax(0, 1fr))` }}>
        {props.labels.map((label, index) => {
          const value = safeValues[index] ?? 0;
          const progress = Math.max(0, Math.min(100, ((value - 5) / 5) * 100));
          const diff = Number((value - overall).toFixed(2));
          const diffText = diff === 0 ? "•" : diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);

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
                  <div style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{Number.isFinite(value) ? value.toFixed(2).replace(/0$/, "").replace(/\.$/, "") : "-"}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>{diffText}</div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#64748b" }}>
                  <span>5.0</span>
                  <span>10.0</span>
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
          datasets: [buildBarDataset(props.datasetLabel ?? props.title, props.values)],
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
            x: { offset: false, ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 } },
            y: { beginAtZero: true, ticks: yTicks },
          },
          layout: { padding: { left: 0, right: 0 } },
        } as any}
      />
    </div>
  );
}

function ExportDialog(props: {
  open: boolean;
  title: string;
  items: Array<{ key: string; title: string }>;
  selectedKeys: string[];
  onClose: () => void;
  onToggle: (key: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onConfirm: () => void;
}) {
  if (!props.open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.28)",
        display: "grid",
        placeItems: "center",
        padding: 20,
        zIndex: 90,
      }}
      onClick={props.onClose}
    >
      <div className="card" style={{ width: "min(680px, 100%)", padding: 22 }} onClick={(event) => event.stopPropagation()}>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ display: "grid", gap: 4 }}>
              <h3 style={{ margin: 0 }}>{props.title}</h3>
            </div>
            <button type="button" className="btn" onClick={props.onClose}>
              ×
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={props.onSelectAll}>
              Όλα
            </button>
            <button type="button" className="btn" onClick={props.onClearAll}>
              Κανένα
            </button>
          </div>

          <div style={{ display: "grid", gap: 10, maxHeight: "52vh", overflowY: "auto" }}>
            {props.items.map((item) => {
              const checked = props.selectedKeys.includes(item.key);
              return (
                <label
                  key={item.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    borderRadius: 14,
                    border: checked ? "1px solid rgba(37, 99, 235, 0.35)" : "1px solid rgba(148, 163, 184, 0.22)",
                    background: checked ? "rgba(239, 246, 255, 0.82)" : "rgba(248, 250, 252, 0.7)",
                    cursor: "pointer",
                  }}
                >
                  <input type="checkbox" checked={checked} onChange={() => props.onToggle(item.key)} />
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>{item.title}</span>
                </label>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={props.onClose}>
              Ακύρωση
            </button>
            <button type="button" className="btn primary" onClick={props.onConfirm} disabled={!props.selectedKeys.length}>
              Εξαγωγή
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-άέήίόύώϊϋΐΰα-ω]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 31) || "sheet";
}

function prepareCsv(rows: Array<Record<string, string | number>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header] ?? "")).join(","))].join("\n");
}

async function renderChartImage(item: ExportItem) {
  if (!item.chartData || !item.chartOptions || !item.chartData.labels?.length) return null;
  const canvas = document.createElement("canvas");
  canvas.width = item.width ?? 1200;
  canvas.height = item.height ?? 700;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const chart = new ChartJS(canvas, {
    type: item.kind === "line" ? "line" : "bar",
    data: item.chartData,
    options: {
      ...item.chartOptions,
      responsive: false,
      animation: false,
      maintainAspectRatio: false,
      plugins: {
        ...(item.chartOptions?.plugins ?? {}),
        legend: item.chartOptions?.plugins?.legend ?? { display: item.kind === "multibar" },
      },
    },
  });

  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  const image = chart.toBase64Image("image/png", 1);
  chart.destroy();
  return image;
}

export default function Statistics() {
  const { t, i18n } = useTranslation("statistics");

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any | null>(null);
  const [activeGroup, setActiveGroup] = React.useState<"overview" | "demographics" | "academic" | "geography">("overview");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [exportFormat, setExportFormat] = React.useState<ExportFormat>("xlsx");
  const [selectedExportKeys, setSelectedExportKeys] = React.useState<string[]>([]);
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

  React.useEffect(() => {
    function closeMenu() {
      setMenuOpen(false);
    }
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
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

  const dropdownItemStyle: React.CSSProperties = {
    width: "100%",
    textAlign: "left",
    padding: "10px 12px",
    background: "transparent",
    border: 0,
    borderRadius: 10,
    cursor: "pointer",
    color: "#0f172a",
    fontWeight: 600,
  };

  const exportItems = React.useMemo<ExportItem[]>(() => {
    const singleDatasetRows = (labels: string[], values: number[], label: string) => labels.map((entry, index) => ({ [t("table.year")]: entry, [label]: Number(values[index] ?? 0) }));
    const pairRows = (labels: string[], leftLabel: string, leftValues: number[], rightLabel: string, rightValues: number[]) =>
      labels.map((entry, index) => ({
        [t("table.year")]: entry,
        [leftLabel]: Number(leftValues[index] ?? 0),
        [rightLabel]: Number(rightValues[index] ?? 0),
      }));

    return [
      {
        key: "summary",
        title: t("sections.summary"),
        kind: "summary",
        rows: [
          { [t("cards.total")]: total },
          { [t("cards.avgAge")]: avgAge },
          { [t("cards.avgGrade")]: avgGrade },
          { [t("cards.earliestYear")]: earliestYear },
          { [t("cards.topGraduationYear")]: busiestYear },
          { [t("cards.topCity")]: busiestCity },
        ],
      },
      {
        key: "byYear",
        title: t("sections.byYear"),
        kind: "line",
        rows: singleDatasetRows(byYearRows.map((row) => row.label), byYearRows.map((row) => row.value), t("table.count")),
        chartData: countChartData,
        chartOptions: countChartOptions,
      },
      {
        key: "gender",
        title: t("sections.gender"),
        kind: "line",
        rows: pairRows(genderByProgramData.labels.length ? (genderChartData.labels as string[]) : (genderChartData.labels as string[]), t("table.male"), (genderChartData.datasets?.[0]?.data as number[]) ?? [], t("table.female"), (genderChartData.datasets?.[1]?.data as number[]) ?? []),
        chartData: genderChartData,
        chartOptions: genderChartOptions,
      },
      {
        key: "birthYear",
        title: t("sections.birthYear"),
        kind: "line",
        rows: singleDatasetRows(birthYears.labels, birthYears.values, t("table.count")),
        chartData: {
          labels: birthYears.labels,
          datasets: [buildLineDataset(t("sections.birthYear"), birthYears.values, "#2563eb", "rgba(37, 99, 235, 0.28)")],
        },
        chartOptions: countChartOptions,
      },
      {
        key: "genderByProgram",
        title: t("sections.genderByProgram"),
        kind: "multibar",
        rows: pairRows(genderByProgramData.labels, t("table.male"), genderByProgramData.male, t("table.female"), genderByProgramData.female),
        chartData: {
          labels: genderByProgramData.labels,
          datasets: [
            buildBarDataset(t("table.male"), genderByProgramData.male, "#2563eb", solidBlueFill),
            buildBarDataset(t("table.female"), genderByProgramData.female, "#db2777", pinkFill),
          ],
        },
        chartOptions: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom" as const } },
          scales: {
            x: { ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 }, grid: { display: false } },
            y: { beginAtZero: true, ticks: yTicks },
          },
        },
      },
      {
        key: "gradeByYear",
        title: t("sections.gradeByYear"),
        kind: "line",
        rows: singleDatasetRows(avgGradesByYear.labels, avgGradesByYear.values, t("table.avg")),
        chartData: {
          labels: avgGradesByYear.labels,
          datasets: [buildLineDataset(t("sections.gradeByYear"), avgGradesByYear.values, "#2563eb", "rgba(37, 99, 235, 0.28)")],
        },
        chartOptions: countChartOptions,
      },
      {
        key: "gradeDistribution",
        title: t("sections.gradeDistribution"),
        kind: "bar",
        rows: singleDatasetRows(gradeBins.labels, gradeBins.values, t("table.count")),
        chartData: {
          labels: gradeBins.labels,
          datasets: [buildBarDataset(t("sections.gradeDistribution"), gradeBins.values)],
        },
        chartOptions: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: yTicks } },
        },
      },
      {
        key: "avgGradeByProgram",
        title: t("sections.avgGradeByProgram"),
        kind: "bar",
        rows: singleDatasetRows(avgGradeByProgram.labels, avgGradeByProgram.values, t("table.avg")),
        chartData: {
          labels: avgGradeByProgram.labels,
          datasets: [buildBarDataset(t("sections.avgGradeByProgram"), avgGradeByProgram.values)],
        },
        chartOptions: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (value: number) => value.toFixed?.(1) ?? value } } },
        },
      },
      {
        key: "studyProgram",
        title: t("sections.studyProgram"),
        kind: "bar",
        rows: singleDatasetRows(studyPrograms.labels, studyPrograms.values, t("table.count")),
        chartData: {
          labels: studyPrograms.labels,
          datasets: [buildBarDataset(t("sections.studyProgram"), studyPrograms.values)],
        },
        chartOptions: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: yTicks } },
        },
      },
      {
        key: "timeToDegreeByEntryYear",
        title: t("sections.timeToDegreeByEntryYear"),
        kind: "line",
        rows: singleDatasetRows(yearsToDegree.labels, yearsToDegree.values, t("table.avgYears")),
        chartData: {
          labels: yearsToDegree.labels,
          datasets: [buildLineDataset(t("sections.timeToDegreeByEntryYear"), yearsToDegree.values, "#2563eb", "rgba(37, 99, 235, 0.28)")],
        },
        chartOptions: countChartOptions,
      },
      {
        key: "timeToDegreeDistribution",
        title: t("sections.timeToDegreeDistribution"),
        kind: "bar",
        rows: singleDatasetRows(yearsToDegreeDistribution.labels, yearsToDegreeDistribution.values, t("table.count")),
        chartData: {
          labels: yearsToDegreeDistribution.labels,
          datasets: [buildBarDataset(t("sections.timeToDegreeDistribution"), yearsToDegreeDistribution.values)],
        },
        chartOptions: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: yTicks } },
        },
      },
      {
        key: "direction",
        title: t("sections.direction"),
        kind: "bar",
        rows: singleDatasetRows(directions.labels, directions.values, t("table.count")),
        chartData: {
          labels: directions.labels,
          datasets: [buildBarDataset(t("sections.direction"), directions.values)],
        },
        chartOptions: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: yTicks } },
        },
      },
      {
        key: "originRegion",
        title: t("sections.originRegion"),
        kind: "bar",
        rows: singleDatasetRows(regions.labels, regions.values, t("table.count")),
        chartData: {
          labels: regions.labels,
          datasets: [buildBarDataset(t("sections.originRegion"), regions.values)],
        },
        chartOptions: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: yTicks } },
        },
      },
      {
        key: "originMunicipality",
        title: t("sections.originMunicipality"),
        kind: "bar",
        rows: singleDatasetRows(municipalities.labels, municipalities.values, t("table.count")),
        chartData: {
          labels: municipalities.labels,
          datasets: [buildBarDataset(t("sections.originMunicipality"), municipalities.values)],
        },
        chartOptions: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: yTicks } },
        },
      },
    ];
  }, [
    avgAge,
    avgGrade,
    avgGradeByProgram.labels,
    avgGradeByProgram.values,
    avgGradesByYear.labels,
    avgGradesByYear.values,
    birthYears.labels,
    birthYears.values,
    busiestCity,
    busiestYear,
    countChartData,
    countChartOptions,
    directions.labels,
    directions.values,
    earliestYear,
    genderByProgramData.female,
    genderByProgramData.labels,
    genderByProgramData.male,
    genderChartData,
    genderChartOptions,
    gradeBins.labels,
    gradeBins.values,
    municipalities.labels,
    municipalities.values,
    regions.labels,
    regions.values,
    studyPrograms.labels,
    studyPrograms.values,
    t,
    total,
    yearsToDegree.labels,
    yearsToDegree.values,
    yearsToDegreeDistribution.labels,
    yearsToDegreeDistribution.values,
    byYearRows,
  ]);

  const exportChoices = React.useMemo(() => exportItems.map((item) => ({ key: item.key, title: item.title })), [exportItems]);

  function openExportDialog(format: ExportFormat) {
    setMenuOpen(false);
    setExportFormat(format);
    setSelectedExportKeys(exportItems.map((item) => item.key));
    setExportDialogOpen(true);
  }

  function toggleExportKey(key: string) {
    setSelectedExportKeys((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  async function handleExport() {
    const chosen = exportItems.filter((item) => selectedExportKeys.includes(item.key));
    if (!chosen.length) return;

    if (exportFormat === "xlsx") {
      const workbook = XLSXUtils.book_new();
      chosen.forEach((item) => {
        const sheet = XLSXUtils.json_to_sheet(item.rows.length ? item.rows : [{ [item.title]: "-" }]);
        XLSXUtils.book_append_sheet(workbook, sheet, slugify(item.title));
      });
      writeXlsxFile(workbook, `statistics-export-${activeLang}.xlsx`);
    }

    if (exportFormat === "csv") {
      const parts = chosen
        .map((item) => {
          const body = prepareCsv(item.rows);
          return `# ${item.title}\n${body}`;
        })
        .join("\n\n");
      const blob = new Blob(["\ufeff" + parts], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `statistics-export-${activeLang}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }

    if (exportFormat === "pdf") {
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 34;
      let y = margin;

      const addPageIfNeeded = (blockHeight: number) => {
        if (y + blockHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(t("pageTitle"), margin, y);
      y += 26;

      for (const item of chosen) {
        if (item.kind === "summary") {
          addPageIfNeeded(140);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(15);
          doc.text(item.title, margin, y);
          y += 18;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(11);
          item.rows.forEach((row) => {
            const [label, value] = Object.entries(row)[0] ?? ["", ""];
            addPageIfNeeded(18);
            doc.text(`${label}: ${value}`, margin, y);
            y += 16;
          });
          y += 10;
          continue;
        }

        const image = await renderChartImage(item);
        if (!image) continue;
        const imageWidth = pageWidth - margin * 2;
        const imageHeight = Math.min(360, item.kind === "multibar" ? 320 : 300);
        addPageIfNeeded(30 + imageHeight + 10);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text(item.title, margin, y);
        y += 14;
        doc.addImage(image, "PNG", margin, y, imageWidth, imageHeight);
        y += imageHeight + 20;
      }

      doc.save(`statistics-export-${activeLang}.pdf`);
    }

    setExportDialogOpen(false);
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
                  <div style={{ position: "relative" }} onClick={(event) => event.stopPropagation()}>
                    <button className="btn" type="button" style={topButtonStyle} onClick={() => setMenuOpen((current) => !current)}>
                      {t("actions.exportStatistics")}
                    </button>
                    {menuOpen ? (
                      <div
                        className="card"
                        style={{
                          position: "absolute",
                          right: 0,
                          top: "calc(100% + 8px)",
                          minWidth: 220,
                          padding: 8,
                          zIndex: 30,
                          display: "grid",
                          gap: 4,
                        }}
                      >
                        <button type="button" style={dropdownItemStyle} onClick={() => openExportDialog("xlsx")}>
                          Excel
                        </button>
                        <button type="button" style={dropdownItemStyle} onClick={() => openExportDialog("csv")}>
                          CSV
                        </button>
                        <button type="button" style={dropdownItemStyle} onClick={() => openExportDialog("pdf")}>
                          PDF
                        </button>
                      </div>
                    ) : null}
                  </div>
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
              <ProgramAverageCards title={t("sections.avgGradeByProgram")} labels={avgGradeByProgram.labels} values={avgGradeByProgram.values} />
              <BarChartCard title={t("sections.studyProgram")} labels={studyPrograms.labels} values={studyPrograms.values} height={320} minLabelWidth={112} maxLabelWidth={176} />
              <ChartCard title={t("sections.timeToDegreeByEntryYear")} labels={yearsToDegree.labels} values={yearsToDegree.values} height={320} />
              <BarChartCard title={t("sections.timeToDegreeDistribution")} labels={yearsToDegreeDistribution.labels} values={yearsToDegreeDistribution.values} height={320} minLabelWidth={80} maxLabelWidth={112} />
              <BarChartCard title={t("sections.direction")} labels={directions.labels} values={directions.values} height={320} minLabelWidth={112} maxLabelWidth={176} />
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

      <ExportDialog
        open={exportDialogOpen}
        title={t("actions.chooseStatistics")}
        items={exportChoices}
        selectedKeys={selectedExportKeys}
        onClose={() => setExportDialogOpen(false)}
        onToggle={toggleExportKey}
        onSelectAll={() => setSelectedExportKeys(exportChoices.map((item) => item.key))}
        onClearAll={() => setSelectedExportKeys([])}
        onConfirm={() => {
          void handleExport();
        }}
      />
    </>
  );
}
