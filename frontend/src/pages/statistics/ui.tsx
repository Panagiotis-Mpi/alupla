import React from "react";
import { Bar, Line, Pie } from "react-chartjs-2";

const cardInnerStyle = { minWidth: 0 };
const compactTopbarStyle = { marginBottom: 12 };
const metricValueStyle = { fontSize: 28, fontWeight: 800, marginTop: 4, lineHeight: 1.1 };
const metricCardStyle: React.CSSProperties = { minWidth: 0, minHeight: 124, padding: 18, display: "grid", alignContent: "space-between", gap: 8 };
const sectionHeaderStyle: React.CSSProperties = { display: "grid", gap: 4, marginTop: 2 };
const sectionTitleStyle: React.CSSProperties = { margin: 0, fontSize: 24, fontWeight: 800 };
const sectionTextStyle: React.CSSProperties = { margin: 0, color: "#64748b", fontSize: 14 };
const solidBlueFill = "rgba(37, 99, 235, 0.72)";
const chartGridColor = "rgba(148, 163, 184, 0.22)";
const chartTickColor = "#475569";

const piePalette = [
  "#2563eb",
  "#0ea5e9",
  "#14b8a6",
  "#22c55e",
  "#84cc16",
  "#eab308",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#6366f1",
  "#64748b",
  "#06b6d4",
  "#10b981",
  "#a855f7",
];

function pieColors(length: number) {
  return Array.from({ length }, (_, index) => piePalette[index % piePalette.length]);
}

function buildBarDataset(label: string, data: number[], color = "#2563eb", backgroundColor = solidBlueFill) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor,
    borderWidth: 1.5,
    borderRadius: 8,
    borderSkipped: false,
    barPercentage: 0.62,
    categoryPercentage: 0.72,
    maxBarThickness: 42,
  };
}

function buildBarChartOptions(options?: {
  horizontal?: boolean;
  stacked?: boolean;
  fullLabelTooltip?: boolean;
  labels?: string[];
  beginAtZero?: boolean;
  min?: number;
  max?: number;
  xTickRotation?: number;
  xTickFormatter?: (label: string) => string | string[];
}) {
  const labels = options?.labels ?? [];
  if (options?.horizontal) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: options?.fullLabelTooltip
          ? {
              callbacks: {
                title: (items: any[]) => String(items?.[0]?.label ?? ""),
              },
            }
          : undefined,
      },
      scales: {
        x: {
          beginAtZero: options?.beginAtZero ?? true,
          min: options?.min,
          max: options?.max,
          ticks: { precision: 0, color: chartTickColor },
          grid: { color: chartGridColor },
          border: { display: false },
        },
        y: {
          ticks: {
            autoSkip: false,
            color: "#334155",
            font: { size: 12, weight: "600" },
            callback: function (_: any, index: number) {
              const label = String(labels[index] ?? "");
              return label.length > 34 ? `${label.slice(0, 34)}…` : label;
            },
          },
          grid: { display: false },
          border: { display: false },
        },
      },
    } as any;
  }

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        stacked: !!options?.stacked,
        ticks: {
          autoSkip: false,
          maxRotation: options?.xTickRotation ?? 0,
          minRotation: options?.xTickRotation ?? 0,
          color: chartTickColor,
          font: { size: 13, weight: "600" },
          callback: function (_: any, index: number) {
            const label = String(labels[index] ?? "");
            return options?.xTickFormatter ? options.xTickFormatter(label) : label;
          },
        },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        beginAtZero: options?.beginAtZero ?? true,
        stacked: !!options?.stacked,
        min: options?.min,
        max: options?.max,
        ticks: { precision: 0, color: chartTickColor },
        grid: { color: chartGridColor },
        border: { display: false },
      },
    },
  } as any;
}

export function buildLineDataset(label: string, data: number[], color: string, background: string, fill = true) {
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

export function wrapAxisLabel(label: string, maxLineLength = 18, maxLines = 3) {
  const words = String(label ?? "").split(/\s+/).filter(Boolean);
  if (!words.length) return "";

  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxLineLength || !current) {
      current = next;
      return;
    }
    lines.push(current);
    current = word;
  });

  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;

  const visible = lines.slice(0, maxLines);
  const tail = lines.slice(maxLines - 1).join(" ");
  visible[maxLines - 1] = tail.length > maxLineLength ? `${tail.slice(0, maxLineLength - 1)}…` : tail;
  return visible;
}

function chartContentWidth(labels: string[], datasetCount = 1, minLabelWidth = 68, maxLabelWidth = 128) {
  const longest = labels.reduce((max, label) => Math.max(max, String(label ?? "").length), 0);
  const labelWidth = Math.max(minLabelWidth, Math.min(maxLabelWidth, longest * 5 + 20));
  return Math.max(640, labels.length * Math.max(labelWidth, 44 * Math.max(1, datasetCount)));
}

function useCompactStatisticsLayout() {
  const [isCompact, setIsCompact] = React.useState(() => typeof window !== "undefined" ? window.innerWidth <= 820 : false);

  React.useEffect(() => {
    const update = () => setIsCompact(window.innerWidth <= 820);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return isCompact;
}

export function ScrollableLineChart(props: {
  data: any;
  options: any;
  height?: number;
  labels: string[];
  datasetCount?: number;
  minLabelWidth?: number;
  maxLabelWidth?: number;
}) {
  const isCompact = useCompactStatisticsLayout();
  const contentWidth = chartContentWidth(props.labels, props.datasetCount ?? 1, props.minLabelWidth ?? 68, props.maxLabelWidth ?? 128);
  const shouldScroll = props.labels.length > 6 || (props.datasetCount ?? 1) > 1;
  const minWidth = shouldScroll ? Math.max(contentWidth, isCompact ? 560 : 640) : 0;

  return (
    <div style={{ width: "100%", maxWidth: "100%", overflowX: shouldScroll ? "auto" : "hidden", overflowY: "hidden", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
      <div style={{ minWidth: shouldScroll ? minWidth : "100%", width: shouldScroll ? "max-content" : "100%", height: props.height ?? 280 }}>
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
  forceScrollable?: boolean;
}) {
  const isCompact = useCompactStatisticsLayout();
  const contentWidth = chartContentWidth(props.labels, props.datasetCount ?? 1, props.minLabelWidth ?? 72, props.maxLabelWidth ?? 124);
  const shouldScroll = !!props.forceScrollable || props.labels.length > 7 || (props.datasetCount ?? 1) > 1;
  const minWidth = shouldScroll ? Math.max(contentWidth, isCompact ? 560 : 640) : 0;

  return (
    <div style={{ width: "100%", maxWidth: "100%", overflowX: shouldScroll ? "auto" : "hidden", overflowY: "hidden", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
      <div style={{ minWidth: shouldScroll ? minWidth : "100%", width: shouldScroll ? "max-content" : "100%", height: props.height ?? 280 }}>
        <Bar data={props.data} options={props.options} />
      </div>
    </div>
  );
}

function FixedBarChart(props: {
  data: any;
  options: any;
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height: props.height ?? 280 }}>
      <Bar data={props.data} options={props.options} />
    </div>
  );
}

export function SectionTitle(props: { title: string; subtitle?: string }) {
  return (
    <div style={sectionHeaderStyle}>
      <h3 style={sectionTitleStyle}>{props.title}</h3>
      {props.subtitle ? <p style={sectionTextStyle}>{props.subtitle}</p> : null}
    </div>
  );
}

export function MetricCard(props: { label: string; value: string | number }) {
  return (
    <div className="card" style={metricCardStyle}>
      <div className="muted" style={{ fontSize: 14, lineHeight: 1.3 }}>{props.label}</div>
      <div style={metricValueStyle}>{props.value}</div>
    </div>
  );
}

export function BarChartCard(props: {
  title: string;
  labels: string[];
  values: number[];
  datasetLabel?: string;
  height?: number;
  minLabelWidth?: number;
  maxLabelWidth?: number;
  horizontal?: boolean;
  fullLabelTooltip?: boolean;
  forceScrollable?: boolean;
  chartId?: string;
}) {
  const chartHeight = props.height ?? (props.horizontal ? Math.max(300, props.labels.length * 54) : 280);
  const chartData = {
    labels: props.labels,
    datasets: [buildBarDataset(props.datasetLabel ?? props.title, props.values)],
  };
  const chartOptions = buildBarChartOptions({
    horizontal: props.horizontal,
    fullLabelTooltip: props.fullLabelTooltip,
    labels: props.labels,
  });

  return (
    <div className="card" style={cardInnerStyle} data-stat-chart-card="true" data-export-chart-id={props.chartId}>
      <div className="topbar" style={compactTopbarStyle}>
        <h3 style={{ margin: 0 }}>{props.title}</h3>
      </div>
      {props.horizontal ? (
        <FixedBarChart height={chartHeight} data={chartData} options={chartOptions} />
      ) : (
        <ScrollableBarChart
          height={chartHeight}
          labels={props.labels}
          minLabelWidth={props.minLabelWidth}
          maxLabelWidth={props.maxLabelWidth}
          data={chartData}
          options={chartOptions}
          forceScrollable={props.forceScrollable}
        />
      )}
    </div>
  );
}

function ScrollablePieChart(props: {
  data: any;
  options: any;
  height?: number;
  labels: string[];
}) {
  const isCompact = useCompactStatisticsLayout();
  const shouldScroll = props.labels.length > 6;
  const minWidth = shouldScroll ? Math.max(560, props.labels.length * 72) : 0;

  return (
    <div style={{ width: "100%", maxWidth: "100%", overflowX: shouldScroll ? "auto" : "hidden", overflowY: "hidden", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
      <div style={{ minWidth: shouldScroll ? Math.max(minWidth, isCompact ? 560 : 640) : "100%", width: shouldScroll ? "max-content" : "100%", height: props.height ?? 340 }}>
        <Pie data={props.data} options={props.options} />
      </div>
    </div>
  );
}

export function PieChartCard(props: {
  title: string;
  labels: string[];
  values: number[];
  chartId?: string;
  height?: number;
  control?: React.ReactNode;
}) {
  const chartData = React.useMemo(() => ({
    labels: props.labels,
    datasets: [
      {
        data: props.values,
        backgroundColor: pieColors(props.labels.length),
        borderColor: "#ffffff",
        borderWidth: 2,
        hoverOffset: 10,
      },
    ],
  }), [props.labels, props.values]);

  return (
    <div className="card" style={cardInnerStyle} data-stat-chart-card="true" data-export-chart-id={props.chartId}>
      <div className="topbar" style={{ ...compactTopbarStyle, display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>{props.title}</h3>
        {props.control}
      </div>
      <ScrollablePieChart
        height={props.height ?? 340}
        labels={props.labels}
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                boxWidth: 12,
                boxHeight: 12,
                padding: 14,
                usePointStyle: true,
                pointStyle: "circle",
                font: { size: 12, weight: "600" },
              },
            },
            tooltip: {
              callbacks: {
                label: (context: any) => {
                  const label = String(context.label ?? "");
                  const value = Number(context.parsed ?? 0);
                  const total = (context.dataset.data ?? []).reduce((sum: number, current: number) => sum + Number(current ?? 0), 0);
                  const percent = total > 0 ? ` (${((value / total) * 100).toFixed(1)}%)` : "";
                  return `${label}: ${value}${percent}`;
                },
              },
            },
          },
        } as any}
      />
    </div>
  );
}

export function MultiPieChartRow(props: {
  title: string;
  pies: Array<{ title: string; labels: string[]; values: number[] }>;
  compact?: boolean;
  chartId?: string;
}) {
  return (
    <div className="card" style={cardInnerStyle} data-stat-chart-card="true" data-export-chart-id={props.chartId}>
      <div className="topbar" style={compactTopbarStyle}>
        <h3 style={{ margin: 0 }}>{props.title}</h3>
      </div>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: props.compact ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(240px, 1fr))" }}>
        {props.pies.map((pie) => (
          <PieChartCard key={pie.title} title={pie.title} labels={pie.labels} values={pie.values} height={props.compact ? 280 : 320} />
        ))}
      </div>
    </div>
  );
}

export function ChartCard(props: {
  title: string;
  labels: string[];
  values: number[];
  chartId?: string;
  height?: number;
  minLabelWidth?: number;
  maxLabelWidth?: number;
  forceScrollable?: boolean;
}) {
  return (
    <div className="card" style={cardInnerStyle} data-stat-chart-card="true" data-export-chart-id={props.chartId}>
      <div className="topbar" style={compactTopbarStyle}>
        <h3 style={{ margin: 0 }}>{props.title}</h3>
      </div>
      <ScrollableLineChart
        height={props.height ?? 320}
        labels={props.labels}
        minLabelWidth={props.minLabelWidth ?? 76}
        maxLabelWidth={props.maxLabelWidth ?? 96}
        data={{ labels: props.labels, datasets: [buildLineDataset(props.title, props.values, "#2563eb", "rgba(37, 99, 235, 0.28)")] }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { offset: false, ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 } },
            y: { beginAtZero: true, ticks: { precision: 0 } },
          },
          layout: { padding: { left: 0, right: 0 } },
        }}
      />
    </div>
  );
}

export function VerticalBarChartCard(props: {
  title: string;
  labels: string[];
  values: number[];
  minValue?: number;
  maxValue?: number;
  height?: number;
  chartId?: string;
  minLabelWidth?: number;
  maxLabelWidth?: number;
  forceScrollable?: boolean;
  xTickRotation?: number;
  xTickFormatter?: (label: string) => string | string[];
}) {
  return (
    <div className="card" style={cardInnerStyle} data-stat-chart-card="true" data-export-chart-id={props.chartId}>
      <div className="topbar" style={compactTopbarStyle}>
        <h3 style={{ margin: 0 }}>{props.title}</h3>
      </div>
      <ScrollableBarChart
        height={props.height ?? 320}
        labels={props.labels}
        minLabelWidth={props.minLabelWidth ?? 92}
        maxLabelWidth={props.maxLabelWidth ?? 152}
        forceScrollable={props.forceScrollable}
        data={{ labels: props.labels, datasets: [buildBarDataset(props.title, props.values)] }}
        options={buildBarChartOptions({
          labels: props.labels,
          beginAtZero: false,
          min: props.minValue ?? 0,
          max: props.maxValue,
          xTickRotation: props.xTickRotation,
          xTickFormatter: props.xTickFormatter,
        })}
      />
    </div>
  );
}
