import React from "react";
import { useTranslation } from "react-i18next";
import { getPublicStats, logPublicExport } from "../lib/api";
import { exportStatisticsCsvFile, exportStatisticsWorkbookFile, type StatisticsChartId } from "./statisticsExport";
import { Bar, Line, Pie } from "react-chartjs-2";
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
  ArcElement,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, BarElement, ArcElement, Filler, Tooltip, Legend);

type NamedCountRow = {
  id?: number | null;
  study_program_id?: number | null;
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
const metricValueStyle = { fontSize: 28, fontWeight: 800, marginTop: 4, lineHeight: 1.1 };
const metricCardStyle: React.CSSProperties = { minWidth: 0, minHeight: 124, padding: 18, display: "grid", alignContent: "space-between", gap: 8 };
const metricGridStyle: React.CSSProperties = { display: "grid", gap: 12 };
const metricTopRowStyle: React.CSSProperties = { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" };
const metricBottomRowStyle: React.CSSProperties = { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" };
const yTicks = { precision: 0 as any };
const sectionWrapStyle: React.CSSProperties = { display: "grid", gap: 14 };
const sectionHeaderStyle: React.CSSProperties = { display: "grid", gap: 4, marginTop: 2 };
const sectionTitleStyle: React.CSSProperties = { margin: 0, fontSize: 24, fontWeight: 800 };
const sectionTextStyle: React.CSSProperties = { margin: 0, color: "#64748b", fontSize: 14 };
const sectionMenuStyle: React.CSSProperties = { display: "grid", gap: 12, width: "100%" };
const sectionButtonsStyle: React.CSSProperties = { display: "grid", gap: 12, width: "100%", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" };
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


function fileSlug(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "chart";
}
function copyComputedStyles(source: Element, target: Element) {
  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);
  const computed = window.getComputedStyle(source as HTMLElement);
  const styleText = Array.from(computed)
    .map((name) => `${name}:${computed.getPropertyValue(name)};`)
    .join("");

  target.setAttribute("style", styleText);

  for (let i = 0; i < sourceChildren.length; i += 1) {
    if (targetChildren[i]) copyComputedStyles(sourceChildren[i], targetChildren[i]);
  }
}

function replaceCanvasNodes(sourceRoot: HTMLElement, cloneRoot: HTMLElement) {
  const sourceCanvases = Array.from(sourceRoot.querySelectorAll("canvas"));
  const cloneCanvases = Array.from(cloneRoot.querySelectorAll("canvas"));

  sourceCanvases.forEach((sourceCanvas, index) => {
    const cloneCanvas = cloneCanvases[index];
    if (!cloneCanvas) return;

    const image = document.createElement("img");

    try {
      image.src = sourceCanvas.toDataURL("image/png");
    } catch {
      return;
    }

    const width = sourceCanvas.width || sourceCanvas.clientWidth || cloneCanvas.clientWidth;
    const height = sourceCanvas.height || sourceCanvas.clientHeight || cloneCanvas.clientHeight;

    image.width = width;
    image.height = height;
    image.style.width = `${cloneCanvas.clientWidth || sourceCanvas.clientWidth || width}px`;
    image.style.height = `${cloneCanvas.clientHeight || sourceCanvas.clientHeight || height}px`;
    image.style.display = window.getComputedStyle(sourceCanvas).display;
    image.style.maxWidth = "100%";
    image.style.objectFit = "contain";

    cloneCanvas.replaceWith(image);
  });
}

function expandSnapshotClone(sourceRoot: HTMLElement, cloneRoot: HTMLElement) {
  const sourceNodes = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll<HTMLElement>("*"))];
  const cloneNodes = [cloneRoot, ...Array.from(cloneRoot.querySelectorAll<HTMLElement>("*"))];

  sourceNodes.forEach((sourceNode, index) => {
    const cloneNode = cloneNodes[index];
    if (!cloneNode) return;

    const computed = window.getComputedStyle(sourceNode);
    const hasHorizontalOverflow = sourceNode.scrollWidth > sourceNode.clientWidth + 4;
    const hasVerticalOverflow = sourceNode.scrollHeight > sourceNode.clientHeight + 4;
    const overflowX = computed.overflowX;
    const overflowY = computed.overflowY;

    if (hasHorizontalOverflow && (overflowX === "auto" || overflowX === "scroll" || overflowX === "hidden")) {
      cloneNode.style.overflowX = "visible";
      cloneNode.style.width = `${Math.ceil(sourceNode.scrollWidth)}px`;
      cloneNode.style.maxWidth = "none";
      cloneNode.style.minWidth = `${Math.ceil(sourceNode.scrollWidth)}px`;
    }

    if (hasVerticalOverflow && (overflowY === "auto" || overflowY === "scroll" || overflowY === "hidden")) {
      cloneNode.style.overflowY = "visible";
      cloneNode.style.height = `${Math.ceil(sourceNode.scrollHeight)}px`;
      cloneNode.style.maxHeight = "none";
      cloneNode.style.minHeight = `${Math.ceil(sourceNode.scrollHeight)}px`;
    }
  });
}

async function renderElementSnapshot(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const width = Math.ceil(Math.max(rect.width, element.scrollWidth));
  const height = Math.ceil(Math.max(rect.height, element.scrollHeight));
  const clone = element.cloneNode(true) as HTMLElement;

  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  copyComputedStyles(element, clone);
  replaceCanvasNodes(element, clone);
  expandSnapshotClone(element, clone);
  clone.style.margin = "0";
  clone.style.width = `${width}px`;
  clone.style.maxWidth = "none";
  clone.style.minWidth = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.maxHeight = "none";

  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${height}px`;
  wrapper.style.background = "#ffffff";
  wrapper.style.overflow = "visible";
  wrapper.appendChild(clone);

  const serialized = new XMLSerializer().serializeToString(wrapper);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_error"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });

  return { image, width, height };
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


function wrapAxisLabel(label: string, maxLineLength = 18, maxLines = 3) {
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

function ScrollableLineChart(props: {
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
      <div className="muted" style={{ fontSize: 14, lineHeight: 1.3 }}>{props.label}</div>
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

function PieChartCard(props: {
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


function MultiPieChartRow(props: {
  title: string;
  pies: Array<{ title: string; labels: string[]; values: number[] }>;
  chartId?: string;
  compact?: boolean;
}) {
  const isCompact = useCompactStatisticsLayout();
  const useCompactLayout = props.compact;

  return (
    <div className="card" style={cardInnerStyle} data-stat-chart-card="true" data-export-chart-id={props.chartId}>
      <div className="topbar" style={compactTopbarStyle}>
        <h3 style={{ margin: 0 }}>{props.title}</h3>
      </div>
      {useCompactLayout ? (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))" }}>
          {props.pies.map((pie, index) => (
            <div key={`${pie.title}-${index}`} style={{ border: "1px solid rgba(148, 163, 184, 0.2)", borderRadius: 18, padding: 14, background: "rgba(248, 250, 252, 0.76)", display: "grid", gap: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>{pie.title}</div>
              <ScrollablePieChart
                height={300}
                labels={pie.labels}
                data={{
                  labels: pie.labels,
                  datasets: [{
                    data: pie.values,
                    backgroundColor: pieColors(pie.labels.length),
                    borderColor: "#ffffff",
                    borderWidth: 2,
                    hoverOffset: 8,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "bottom",
                      labels: { boxWidth: 10, boxHeight: 10, padding: 12, usePointStyle: true, pointStyle: "circle", font: { size: 11, weight: "600" } },
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
          ))}
        </div>
      ) : (
        <div style={{ width: "100%", overflowX: "auto", overflowY: "hidden", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
          <div style={{ display: "grid", gap: 12, gridAutoFlow: "column", gridAutoColumns: isCompact ? "minmax(360px, 88vw)" : "minmax(520px, calc((100% - 12px) / 2))", alignItems: "stretch" }}>
            {props.pies.map((pie, index) => (
              <div key={`${pie.title}-${index}`} style={{ border: "1px solid rgba(148, 163, 184, 0.2)", borderRadius: 18, padding: 14, background: "rgba(248, 250, 252, 0.76)", display: "grid", gap: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>{pie.title}</div>
                <ScrollablePieChart
                  height={340}
                  labels={pie.labels}
                  data={{
                    labels: pie.labels,
                    datasets: [{
                      data: pie.values,
                      backgroundColor: pieColors(pie.labels.length),
                      borderColor: "#ffffff",
                      borderWidth: 2,
                      hoverOffset: 8,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "bottom",
                        labels: { boxWidth: 10, boxHeight: 10, padding: 12, usePointStyle: true, pointStyle: "circle", font: { size: 11, weight: "600" } },
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
            ))}
          </div>
        </div>
      )}
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
  chartId?: string;
}) {
  return (
    <div className="card" style={cardInnerStyle} data-stat-chart-card="true" data-export-chart-id={props.chartId}>
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


function VerticalBarChartCard(props: {
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

export default function Statistics() {
  const { t, i18n } = useTranslation("statistics");

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any | null>(null);
  const [activeGroup, setActiveGroup] = React.useState<"demographics" | "academic" | "geography">("demographics");
  const [selectedDirectionProgramId] = React.useState<string>("all");
  const [selectedGenderProgramId, setSelectedGenderProgramId] = React.useState<string>("all");
  const [exportOpen, setExportOpen] = React.useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = React.useState<"xlsx" | "csv" | "png" | null>(null);
  const exportMenuRef = React.useRef<HTMLDivElement | null>(null);
  const exportModalBodyRef = React.useRef<HTMLDivElement | null>(null);
  const pageRef = React.useRef<HTMLDivElement | null>(null);
  const exportSurfaceRef = React.useRef<HTMLDivElement | null>(null);

  const activeLang = i18n.language?.toLowerCase().startsWith("en") ? "en" : "el";

  const chartGroups = React.useMemo(
    () => [
      {
        key: "demographics" as const,
        label: t("groups.demographics"),
        charts: [
          { id: "gender" as StatisticsChartId, label: t("sections.gender") },
          { id: "birthYear" as StatisticsChartId, label: t("sections.birthYear") },
          { id: "genderByProgram" as StatisticsChartId, label: t("sections.genderByProgram") },
        ],
      },
      {
        key: "academic" as const,
        label: t("groups.academic"),
        charts: [
          { id: "byYear" as StatisticsChartId, label: t("sections.byYear") },
          { id: "studyProgram" as StatisticsChartId, label: t("sections.studyProgram") },
          { id: "gradeByYear" as StatisticsChartId, label: t("sections.gradeByYear") },
          { id: "gradeDistribution" as StatisticsChartId, label: t("sections.gradeDistribution") },
          { id: "avgGradeByProgram" as StatisticsChartId, label: t("sections.avgGradeByProgram") },
          { id: "timeToDegreeByEntryYear" as StatisticsChartId, label: t("sections.timeToDegreeByEntryYear") },
          { id: "timeToDegreeDistribution" as StatisticsChartId, label: t("sections.timeToDegreeDistribution") },
          { id: "direction" as StatisticsChartId, label: t("sections.direction") },
        ],
      },
      {
        key: "geography" as const,
        label: t("groups.geography"),
        charts: [
          { id: "originRegion" as StatisticsChartId, label: t("sections.originRegion") },
          { id: "originMunicipality" as StatisticsChartId, label: t("sections.originMunicipality") },
        ],
      },
    ],
    [t]
  );

  const allChartIds = React.useMemo(
    () => chartGroups.flatMap((group) => group.charts.map((chart) => chart.id)),
    [chartGroups]
  );
  const [selectedChartIds, setSelectedChartIds] = React.useState<StatisticsChartId[]>([]);

  React.useEffect(() => {
    setSelectedChartIds((prev) => prev.filter((id) => allChartIds.includes(id)));
  }, [allChartIds]);

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
    function handleClickOutside(event: MouseEvent) {
      if (!exportMenuRef.current) return;
      if (!exportMenuRef.current.contains(event.target as Node)) setExportOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setExportOpen(false);
        setSelectedExportFormat(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
  const directionRows = React.useMemo(() => (Array.isArray(data?.direction_distribution) ? (data.direction_distribution as NamedCountRow[]) : []), [data]);
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

  const genderByProgramRows = React.useMemo(() => ((data?.gender_by_program ?? []) as NamedCountRow[]), [data]);

  const selectedGenderProgramRow = React.useMemo(() => {
    if (!genderByProgramRows.length) return null;
    if (selectedGenderProgramId === "all") return genderByProgramRows[0] ?? null;
    return genderByProgramRows.find((row) => String(row.study_program_id ?? row.id ?? "") === selectedGenderProgramId) ?? genderByProgramRows[0] ?? null;
  }, [genderByProgramRows, selectedGenderProgramId]);

  const genderByProgramPie = React.useMemo(() => ({
    labels: [t("table.male"), t("table.female")],
    values: [Number(selectedGenderProgramRow?.male ?? 0), Number(selectedGenderProgramRow?.female ?? 0)],
  }), [selectedGenderProgramRow, t]);

  const maxGraduationYears = yearsToDegreeDistributionRaw.labels.reduce<number | null>((current, label, index) => {
    const numericLabel = Number(label);
    const count = Number(yearsToDegreeDistributionRaw.values[index] ?? 0);
    if (!Number.isFinite(numericLabel) || count <= 0) return current;
    if (current === null || numericLabel > current) return numericLabel;
    return current;
  }, null);
  const longestStudyYears = maxGraduationYears === null ? "-" : maxGraduationYears;
  const busiestYearIndex = byYearRows.length ? byYearRows.findIndex((row) => row.value === Math.max(...byYearRows.map((item) => item.value))) : -1;
  const busiestYear = busiestYearIndex >= 0 ? byYearRows[busiestYearIndex].label : "-";
  const busiestCityIndex = municipalities.values.length ? municipalities.values.findIndex((value) => value === Math.max(...municipalities.values)) : -1;
  const busiestCity = busiestCityIndex >= 0 ? municipalities.labels[busiestCityIndex] : "-";

  const directionProgramOptions = React.useMemo(() => {
    const rows = Array.isArray(data?.study_program_distribution) ? (data.study_program_distribution as NamedCountRow[]) : [];
    return rows
      .filter((row) => row.id !== null && row.id !== undefined)
      .map((row) => ({
        value: String(row.id),
        label: String(activeLang === "en" ? row.name_en ?? row.name_el ?? row.name : row.name_el ?? row.name_en ?? row.name ?? "-"),
      }));
  }, [activeLang, data]);

  const directionPies = React.useMemo(() => {
    const labelByProgramId = new Map(directionProgramOptions.map((option) => [option.value, option.label]));
    const grouped = new Map<string, { title: string; labels: string[]; values: number[] }>();

    directionRows.forEach((row) => {
      const programId = String(row.study_program_id ?? "");
      if (!programId) return;
      const title = labelByProgramId.get(programId) ?? String(programId);
      const current = grouped.get(programId) ?? { title, labels: [], values: [] };
      const label = String(activeLang === "en" ? row.name_en ?? row.name_el ?? row.name : row.name_el ?? row.name_en ?? row.name ?? "-");
      current.labels.push(label);
      current.values.push(Number(row.count ?? 0));
      grouped.set(programId, current);
    });

    return Array.from(grouped.values()).filter((pie) => pie.labels.length);
  }, [activeLang, directionProgramOptions, directionRows]);
  React.useEffect(() => {
    if (!directionProgramOptions.length) return;
    if (selectedGenderProgramId === "all") {
      setSelectedGenderProgramId(directionProgramOptions[0]?.value ?? "all");
      return;
    }
    if (!directionProgramOptions.some((option) => option.value === selectedGenderProgramId)) {
      setSelectedGenderProgramId(directionProgramOptions[0]?.value ?? "all");
    }
  }, [directionProgramOptions, selectedGenderProgramId]);

  const topButtonStyle: React.CSSProperties = {
    minHeight: 48,
    width: "100%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    padding: "0 18px",
    fontSize: 14,
    whiteSpace: "normal",
    lineHeight: 1.3,
  };


  const selectStyle: React.CSSProperties = {
    minHeight: 40,
    borderRadius: 12,
    border: "1px solid rgba(148, 163, 184, 0.4)",
    padding: "0 14px",
    background: "#fff",
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 600,
    outline: "none",
  };

  const genderProgramSelect = directionProgramOptions.length ? (
    <select value={selectedGenderProgramId} onChange={(e) => setSelectedGenderProgramId(e.target.value)} style={selectStyle}>
      {directionProgramOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ) : null;

  const allChartsSelected = allChartIds.length > 0 && selectedChartIds.length === allChartIds.length;

  const selectionRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(148, 163, 184, 0.2)",
    background: "#fff",
    color: "#0f172a",
    cursor: "pointer",
    minHeight: 42,
    lineHeight: 1.3,
  };

  const selectionCheckboxStyle: React.CSSProperties = {
    width: 16,
    height: 16,
    margin: 0,
    flex: "0 0 auto",
    accentColor: "#2563eb",
  };

  function toggleAllCharts() {
    setSelectedChartIds((prev) => (prev.length === allChartIds.length ? [] : [...allChartIds]));
  }

  function toggleGroupCharts(chartIds: StatisticsChartId[]) {
    setSelectedChartIds((prev) => {
      const everySelected = chartIds.every((id) => prev.includes(id));
      if (everySelected) return prev.filter((id) => !chartIds.includes(id));
      return Array.from(new Set([...prev, ...chartIds]));
    });
  }

  function toggleSingleChart(chartId: StatisticsChartId) {
    setSelectedChartIds((prev) => (prev.includes(chartId) ? prev.filter((id) => id !== chartId) : [...prev, chartId]));
  }

  const exportFormatLabel = React.useMemo(() => {
    if (selectedExportFormat === "xlsx") return "Excel";
    if (selectedExportFormat === "csv") return "CSV";
    if (selectedExportFormat === "png") return "PNG";
    return "";
  }, [selectedExportFormat]);

  function openExportSelection(format: "xlsx" | "csv" | "png") {
    setSelectedChartIds([]);
    setSelectedExportFormat(format);
    setExportOpen(false);
  }

  function closeExportSelection() {
    setSelectedExportFormat(null);
  }

  const exportArgs = React.useMemo(() => ({
    data,
    t,
    activeLang,
    total,
    avgAge,
    avgGrade,
    longestStudyYears,
    busiestYear,
    busiestCity,
    selectedDirectionProgramId,
    selectedChartIds,
  }), [activeLang, avgAge, avgGrade, busiestCity, busiestYear, data, longestStudyYears, selectedChartIds, selectedDirectionProgramId, t, total]);

  async function exportSelectedChartsAsPng() {
    if (!selectedChartIds.length) return;

    const root = exportSurfaceRef.current;
    if (!root) return;

    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

    const selectedSet = new Set(selectedChartIds);
    const groupsForExport = chartGroups
      .map((group) => ({
        ...group,
        charts: group.charts.filter((chart) => selectedSet.has(chart.id)),
      }))
      .filter((group) => group.charts.length > 0);

    for (const group of groupsForExport) {
      const chunks = group.key === "academic" && group.charts.length > 4
        ? [group.charts.slice(0, 4), group.charts.slice(4)]
        : [group.charts];

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
        const charts = chunks[chunkIndex];
        const snapshots = [] as Array<{ image: HTMLImageElement; width: number; height: number }>;

        for (const chart of charts) {
          const card = root.querySelector<HTMLElement>(`[data-export-chart-id="${chart.id}"]`);
          if (!card) continue;
          snapshots.push(await renderElementSnapshot(card));
        }

        if (!snapshots.length) continue;

        const padding = 24;
        const gap = 20;
        const titleHeight = 52;
        const canvasWidth = Math.max(...snapshots.map((snapshot) => snapshot.width)) + padding * 2;
        const canvasHeight = titleHeight + padding + snapshots.reduce((total, snapshot) => total + snapshot.height, 0) + gap * Math.max(0, snapshots.length - 1) + padding;
        const out = document.createElement("canvas");

        out.width = canvasWidth * 2;
        out.height = canvasHeight * 2;

        const ctx = out.getContext("2d");
        if (!ctx) continue;

        ctx.scale(2, 2);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.fillStyle = "#0f172a";
        ctx.font = '700 24px Arial, sans-serif';
        ctx.fillText(group.label, padding, 34);

        let offsetY = titleHeight;
        snapshots.forEach((snapshot, snapshotIndex) => {
          ctx.drawImage(snapshot.image, padding, offsetY, snapshot.width, snapshot.height);
          offsetY += snapshot.height;
          if (snapshotIndex < snapshots.length - 1) offsetY += gap;
        });

        const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/png"));
        if (!blob) continue;

        const suffix = chunks.length > 1 ? `_${chunkIndex + 1}` : "";
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `alupla_statistics_${fileSlug(group.label)}${suffix}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    }
  }

  async function handleExportAction() {
    if (!selectedChartIds.length || !selectedExportFormat) return;

    if (selectedExportFormat === "xlsx") {
      exportStatisticsWorkbookFile(exportArgs);
    } else if (selectedExportFormat === "csv") {
      exportStatisticsCsvFile(exportArgs);
    } else {
      await exportSelectedChartsAsPng();
    }

    const exportType = selectedExportFormat;
    setSelectedExportFormat(null);
    setExportOpen(false);

    try {
      await logPublicExport("statistics_export", exportType);
    } catch {}
  }


  if (loading && !data) return <div className="card">{t("loading")}</div>;
  if (err && !data) return <div className="card">{err}</div>;

  return (
    <>
      <div className="page-stable-shell statistics-page" ref={pageRef}>
        <div className="card page-header-card" style={{ padding: 14 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gap: 14 }}>
              <h2 style={{ margin: 0 }}>{t("pageTitle")}</h2>

              <div style={sectionMenuStyle}>
                <div className="page-header-actions-grid" style={sectionButtonsStyle}>
                  {(["demographics", "academic", "geography"] as const).map((groupKey) => (
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
                  <div style={{ position: "relative" }} ref={exportMenuRef}>
                    <button className="btn" type="button" style={topButtonStyle} onClick={() => setExportOpen((open) => !open)}>
                      {t("actions.export", { defaultValue: "Εξαγωγή" })}
                    </button>
                    {exportOpen ? (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 8px)",
                          right: 0,
                          minWidth: 180,
                          borderRadius: 14,
                          border: "1px solid rgba(148, 163, 184, 0.28)",
                          background: "#fff",
                          boxShadow: "0 18px 40px rgba(15, 23, 42, 0.16)",
                          padding: 8,
                          zIndex: 20,
                          display: "grid",
                          gap: 6,
                        }}
                      >
                        <button className="btn" type="button" style={{ ...topButtonStyle, justifyContent: "flex-start" }} onClick={() => openExportSelection("xlsx")}>Excel</button>
                        <button className="btn" type="button" style={{ ...topButtonStyle, justifyContent: "flex-start" }} onClick={() => openExportSelection("csv")}>CSV</button>
                        <button className="btn" type="button" style={{ ...topButtonStyle, justifyContent: "flex-start" }} onClick={() => openExportSelection("png")}>PNG</button>
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
              <MetricCard label={t("cards.earliestYear")} value={longestStudyYears} />
              <MetricCard label={t("cards.topGraduationYear")} value={busiestYear} />
              <MetricCard label={t("cards.topCity")} value={busiestCity} />
            </div>
          </div>
        </div>

        {activeGroup === "demographics" ? (
          <div style={sectionWrapStyle}>
            <SectionTitle title={t("groups.demographics")} subtitle={t("groupText.demographics")} />
            <div className="grid cols1" style={{ gap: 14 }}>
              <div className="card" style={cardInnerStyle} data-stat-chart-card="true" data-export-chart-id="gender">
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
              <ChartCard chartId="birthYear" title={t("sections.birthYear")} labels={birthYears.labels} values={birthYears.values} height={320} />
              <PieChartCard chartId="genderByProgram" title={t("sections.genderByProgram")} labels={genderByProgramPie.labels} values={genderByProgramPie.values} height={360} control={genderProgramSelect} />
            </div>
          </div>
        ) : null}

        {activeGroup === "academic" ? (
          <div style={sectionWrapStyle}>
            <SectionTitle title={t("groups.academic")} subtitle={t("groupText.academic")} />
            <div className="grid cols1" style={{ gap: 14 }}>
              <div className="card" style={cardInnerStyle} data-stat-chart-card="true" data-export-chart-id="byYear">
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
              <PieChartCard chartId="studyProgram" title={t("sections.studyProgram")} labels={studyPrograms.labels} values={studyPrograms.values} height={360} />
              <BarChartCard chartId="gradeByYear" title={t("sections.gradeByYear")} labels={avgGradesByYear.labels} values={avgGradesByYear.values} height={320} minLabelWidth={76} maxLabelWidth={96} />
              <BarChartCard chartId="gradeDistribution" title={t("sections.gradeDistribution")} labels={gradeBins.labels} values={gradeBins.values} height={320} minLabelWidth={88} maxLabelWidth={128} />
              <VerticalBarChartCard chartId="avgGradeByProgram" title={t("sections.avgGradeByProgram")} labels={avgGradeByProgram.labels} values={avgGradeByProgram.values} minValue={5} maxValue={10} height={360} minLabelWidth={148} maxLabelWidth={200} forceScrollable xTickFormatter={(label) => wrapAxisLabel(label, 18, 3)} />
              <BarChartCard chartId="timeToDegreeByEntryYear" title={t("sections.timeToDegreeByEntryYear")} labels={yearsToDegree.labels} values={yearsToDegree.values} height={320} minLabelWidth={76} maxLabelWidth={96} />
              <BarChartCard chartId="timeToDegreeDistribution" title={t("sections.timeToDegreeDistribution")} labels={yearsToDegreeDistribution.labels} values={yearsToDegreeDistribution.values} height={320} minLabelWidth={64} maxLabelWidth={88} />
              <MultiPieChartRow chartId="direction" title={t("sections.direction")} pies={directionPies} />
            </div>
          </div>
        ) : null}

        {activeGroup === "geography" ? (
          <div style={sectionWrapStyle}>
            <SectionTitle title={t("groups.geography")} subtitle={t("groupText.geography")} />
            <div className="grid cols1" style={{ gap: 14 }}>
              <BarChartCard chartId="originRegion" title={t("sections.originRegion")} labels={regions.labels} values={regions.values} height={320} minLabelWidth={104} maxLabelWidth={156} />
              <BarChartCard chartId="originMunicipality" title={t("sections.originMunicipality")} labels={municipalities.labels} values={municipalities.values} height={320} minLabelWidth={104} maxLabelWidth={156} forceScrollable />
            </div>
          </div>
        ) : null}
      </div>
      {selectedExportFormat ? (
        <div
          onClick={closeExportSelection}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.34)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 60,
          }}
        >
          <div
            className="card"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(680px, 100%)",
              maxHeight: "min(78vh, 760px)",
              display: "grid",
              gridTemplateRows: "auto minmax(0, 1fr) auto",
              gap: 12,
              padding: 14,
              overflow: "hidden",
            }}
          >
            <div className="topbar" style={{ marginBottom: 0, gap: 10, alignItems: "flex-start" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>{t("actions.exportSelectionTitle", { defaultValue: "Επιλογή διαγραμμάτων" })}</h3>
                <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                  {t("actions.exportSelectionSubtitle", { defaultValue: "Επίλεξε ποια διαγράμματα θέλεις να κατεβάσεις" })} · {exportFormatLabel}
                </div>
              </div>
            </div>

            <div ref={exportModalBodyRef} style={{ display: "grid", gap: 10, overflowY: "auto", minHeight: 0, paddingRight: 4 }}>
              <label style={{ ...selectionRowStyle, fontWeight: 700 }}>
                <input type="checkbox" style={selectionCheckboxStyle} checked={allChartsSelected} onChange={toggleAllCharts} />
                <span>{t("actions.selectAll", { defaultValue: "Όλα" })}</span>
              </label>

              {chartGroups.map((group) => {
                const groupChartIds = group.charts.map((chart) => chart.id);
                const groupChecked = groupChartIds.every((id) => selectedChartIds.includes(id));

                return (
                  <div key={group.key} style={{ display: "grid", gap: 8, border: "1px solid rgba(148, 163, 184, 0.2)", borderRadius: 14, padding: 10, background: "rgba(248, 250, 252, 0.76)" }}>
                    <label style={{ ...selectionRowStyle, fontWeight: 700 }}>
                      <input type="checkbox" style={selectionCheckboxStyle} checked={groupChecked} onChange={() => toggleGroupCharts(groupChartIds)} />
                      <span>{group.label}</span>
                    </label>
                    <div style={{ display: "grid", gap: 6 }}>
                      {group.charts.map((chart) => (
                        <label key={chart.id} style={selectionRowStyle}>
                          <input type="checkbox" style={selectionCheckboxStyle} checked={selectedChartIds.includes(chart.id)} onChange={() => toggleSingleChart(chart.id)} />
                          <span>{chart.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", paddingTop: 2 }}>
              <button type="button" className="btn" style={{ minHeight: 40, padding: "0 14px" }} onClick={closeExportSelection}>
                {t("actions.cancel", { defaultValue: "Ακύρωση" })}
              </button>
              <button type="button" className="btn primary" disabled={!selectedChartIds.length} style={{ opacity: selectedChartIds.length ? 1 : 0.55 }} onClick={() => void handleExportAction()}>
                {t("actions.exportSelected", { defaultValue: "Εξαγωγή επιλεγμένων" })}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div
        ref={exportSurfaceRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          left: -20000,
          top: 0,
          width: 1200,
          padding: 24,
          pointerEvents: "none",
          opacity: 0,
          zIndex: -1,
          background: "#ffffff",
        }}
      >
        <div style={{ display: "grid", gap: 14 }}>
          <div className="card" style={cardInnerStyle} data-stat-chart-card="true" data-export-chart-id="gender">
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
          <ChartCard chartId="birthYear" title={t("sections.birthYear")} labels={birthYears.labels} values={birthYears.values} height={320} />
          <PieChartCard chartId="genderByProgram" title={t("sections.genderByProgram")} labels={genderByProgramPie.labels} values={genderByProgramPie.values} height={360} control={genderProgramSelect} />
          <div className="card" style={cardInnerStyle} data-stat-chart-card="true" data-export-chart-id="byYear">
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
          <PieChartCard chartId="studyProgram" title={t("sections.studyProgram")} labels={studyPrograms.labels} values={studyPrograms.values} height={360} />
          <BarChartCard chartId="gradeByYear" title={t("sections.gradeByYear")} labels={avgGradesByYear.labels} values={avgGradesByYear.values} height={320} minLabelWidth={76} maxLabelWidth={96} />
          <BarChartCard chartId="gradeDistribution" title={t("sections.gradeDistribution")} labels={gradeBins.labels} values={gradeBins.values} height={320} minLabelWidth={88} maxLabelWidth={128} />
          <VerticalBarChartCard chartId="avgGradeByProgram" title={t("sections.avgGradeByProgram")} labels={avgGradeByProgram.labels} values={avgGradeByProgram.values} minValue={5} maxValue={10} height={320} />
          <BarChartCard chartId="timeToDegreeByEntryYear" title={t("sections.timeToDegreeByEntryYear")} labels={yearsToDegree.labels} values={yearsToDegree.values} height={320} minLabelWidth={76} maxLabelWidth={96} />
          <BarChartCard chartId="timeToDegreeDistribution" title={t("sections.timeToDegreeDistribution")} labels={yearsToDegreeDistribution.labels} values={yearsToDegreeDistribution.values} height={320} minLabelWidth={64} maxLabelWidth={88} />
          <MultiPieChartRow chartId="direction" title={t("sections.direction")} pies={directionPies} compact />
          <BarChartCard chartId="originRegion" title={t("sections.originRegion")} labels={regions.labels} values={regions.values} height={320} minLabelWidth={104} maxLabelWidth={156} />
          <BarChartCard chartId="originMunicipality" title={t("sections.originMunicipality")} labels={municipalities.labels} values={municipalities.values} height={320} minLabelWidth={104} maxLabelWidth={156} forceScrollable />
        </div>
      </div>
    </>
  );
}
