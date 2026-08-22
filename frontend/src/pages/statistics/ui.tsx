// Κοινά UI components για κάρτες, charts και legends στα στατιστικά.
import React from "react";
import { Bar, Line, Pie } from "react-chartjs-2";

const cardInnerStyle = { minWidth: 0 };
const compactTopbarStyle: React.CSSProperties = { marginBottom: 12, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 };
const metricCardStyle: React.CSSProperties = { minWidth: 0, minHeight: 118, padding: 16, display: "grid", alignContent: "space-between", gap: 8 };
const sectionHeaderStyle: React.CSSProperties = { display: "grid", gap: 4, marginTop: 2 };
const sectionTitleStyle: React.CSSProperties = { margin: 0, fontSize: 24, fontWeight: 800 };
const sectionTextStyle: React.CSSProperties = { margin: 0, color: "#64748b", fontSize: 14 };
const solidBlueFill = "rgba(37, 99, 235, 0.72)";
const chartGridColor = "rgba(148, 163, 184, 0.22)";
const chartTickColor = "#475569";
const exportChartWidth = 1120;
const contrastPiePalette = ["#ffd400", "#7fffd4", "#ffffff", "#ff8a00", "#66f2d5", "#ff5f5f", "#c4ff00", "#d6b4ff"];

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

function useHighContrastEnabled() {
  const [enabled, setEnabled] = React.useState(() => typeof document !== "undefined" && document.documentElement.classList.contains("accessibility-high-contrast"));

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const sync = () => setEnabled(root.classList.contains("accessibility-high-contrast"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return enabled;
}

function pieColors(length: number, highContrast = false) {
  const source = highContrast ? contrastPiePalette : piePalette;
  return Array.from({ length }, (_, index) => source[index % source.length]);
}

function buildBarDataset(label: string, data: number[], options?: { highContrast?: boolean; exportMode?: boolean }) {
  if (options?.highContrast) {
    return {
      label,
      data,
      borderColor: "#000000",
      backgroundColor: Array.from({ length: data.length }, (_, index) => (index % 2 === 0 ? "#ffd400" : "#7fffd4")),
      borderWidth: 2,
      borderRadius: 8,
      borderSkipped: false,
      barPercentage: 0.62,
      categoryPercentage: 0.72,
      maxBarThickness: 42,
      minBarLength: options?.exportMode ? 4 : undefined,
    };
  }

  return {
    label,
    data,
    borderColor: "#2563eb",
    backgroundColor: solidBlueFill,
    borderWidth: 1.5,
    borderRadius: 8,
    borderSkipped: false,
    barPercentage: 0.62,
    categoryPercentage: 0.72,
    maxBarThickness: 42,
    minBarLength: options?.exportMode ? 4 : undefined,
  } as React.CSSProperties;
}

function buildBarChartOptions(options?: {
  horizontal?: boolean;
  stacked?: boolean;
  fullLabelTooltip?: boolean;
  labels?: string[];
  beginAtZero?: boolean;
  min?: number;
  max?: number;
  suggestedMax?: number;
  xTickRotation?: number;
  xTickFormatter?: (label: string) => string | string[];
  yTickPrecision?: number;
  exportMode?: boolean;
}) {
  const labels = options?.labels ?? [];
  const yTickPrecision = options?.yTickPrecision;
  const yTickCallback = yTickPrecision === undefined ? undefined : (value: string | number) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue.toFixed(yTickPrecision) : String(value);
  };
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
          stacked: !!options?.stacked,
          min: options?.min,
          max: options?.max,
          suggestedMax: options?.suggestedMax,
          ticks: { precision: yTickPrecision ?? 0, color: chartTickColor, callback: yTickCallback },
          grid: { color: chartGridColor },
          border: { display: false },
        },
        y: {
          stacked: !!options?.stacked,
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
            if (options?.xTickFormatter) return options.xTickFormatter(label);
            return options?.exportMode ? exportAxisLabel(label, index, labels) : wrapAxisLabel(label, 18, 3);
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
        suggestedMax: options?.suggestedMax,
        ticks: { precision: yTickPrecision ?? 0, color: chartTickColor, callback: yTickCallback },
        grid: { color: chartGridColor },
        border: { display: false },
      },
    },
  } as any;
}

function applyAccessibleChartOptions(options: any, highContrast: boolean, overrides?: Record<string, any>) {
  const next = {
    ...options,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      ...(options?.plugins ?? {}),
      legend: {
        ...(options?.plugins?.legend ?? {}),
        labels: {
          color: highContrast ? "#7fffd4" : "#334155",
          ...(options?.plugins?.legend?.labels ?? {}),
        },
      },
      tooltip: {
        ...(options?.plugins?.tooltip ?? {}),
        titleColor: highContrast ? "#7fffd4" : "#0f172a",
        bodyColor: highContrast ? "#7fffd4" : "#0f172a",
        backgroundColor: highContrast ? "#000000" : "rgba(255,255,255,.97)",
        borderColor: highContrast ? "#14f5c8" : "rgba(148,163,184,.4)",
        borderWidth: 1,
      },
    },
    scales: options?.scales
      ? Object.fromEntries(
          Object.entries(options.scales).map(([axisKey, axisValue]: [string, any]) => [
            axisKey,
            {
              ...axisValue,
              ticks: {
                ...(axisValue?.ticks ?? {}),
                color: highContrast ? "#7fffd4" : axisValue?.ticks?.color ?? chartTickColor,
              },
              grid: {
                ...(axisValue?.grid ?? {}),
                color: highContrast ? "rgba(127,255,212,.28)" : axisValue?.grid?.color ?? chartGridColor,
              },
            },
          ]),
        )
      : undefined,
    ...overrides,
  };

  if (overrides?.plugins) {
    next.plugins = {
      ...(next.plugins ?? {}),
      ...overrides.plugins,
      legend: {
        ...(next.plugins?.legend ?? {}),
        ...(overrides.plugins.legend ?? {}),
        labels: {
          ...(next.plugins?.legend?.labels ?? {}),
          ...(overrides.plugins.legend?.labels ?? {}),
        },
      },
      tooltip: {
        ...(next.plugins?.tooltip ?? {}),
        ...(overrides.plugins.tooltip ?? {}),
      },
    };
  }

  if (overrides?.scales) {
    next.scales = {
      ...(next.scales ?? {}),
      ...Object.fromEntries(
        Object.entries(overrides.scales).map(([axisKey, axisValue]: [string, any]) => [
          axisKey,
          {
            ...(next.scales?.[axisKey] ?? {}),
            ...axisValue,
            ticks: {
              ...(next.scales?.[axisKey]?.ticks ?? {}),
              ...(axisValue?.ticks ?? {}),
            },
            grid: {
              ...(next.scales?.[axisKey]?.grid ?? {}),
              ...(axisValue?.grid ?? {}),
            },
          },
        ]),
      ),
    };
  }

  return next;
}

function normalizeLineDatasets(datasets: any[] = [], highContrast: boolean) {
  return datasets.map((dataset, index) => {
    if (!highContrast) return dataset;
    const monochrome = index % 2 === 0 ? "#ffd400" : "#7fffd4";
    return {
      ...dataset,
      borderColor: monochrome,
      backgroundColor: index % 2 === 0 ? "rgba(255,212,0,.12)" : "rgba(127,255,212,.12)",
      pointBackgroundColor: "#000000",
      pointBorderColor: monochrome,
      pointHoverBackgroundColor: "#000000",
      pointHoverBorderColor: monochrome,
      borderWidth: Math.max(3, Number(dataset.borderWidth ?? 3)),
      pointRadius: Math.max(4, Number(dataset.pointRadius ?? 3)),
      pointHoverRadius: Math.max(5, Number(dataset.pointHoverRadius ?? 4)),
      pointStyle: index % 2 === 0 ? "circle" : "rectRot",
      borderDash: index % 2 === 0 ? [] : [8, 4],
      fill: false,
    };
  });
}

function useChartAriaLabel(title: string, labels: string[], values: number[]) {
  return React.useMemo(() => {
    const preview = labels
      .slice(0, 5)
      .map((label, index) => `${label}: ${values[index] ?? 0}`)
      .join(", ");
    return preview ? `${title}. ${preview}` : title;
  }, [labels, title, values]);
}

type ChartLegendItem = { label: string; color: string; borderColor?: string; pointStyle?: "circle" | "square" | "diamond"; dashed?: boolean; value?: number | string; accent?: string };

function markerStyle(item: ChartLegendItem): React.CSSProperties {
  const shape = item.pointStyle === "diamond" ? "rotate(45deg)" : undefined;
  const radius = item.pointStyle === "square" ? 4 : 999;
  return {
    width: 12,
    height: 12,
    display: "inline-block",
    borderRadius: radius,
    border: `2px solid ${item.borderColor ?? item.color}`,
    background: item.color,
    "--chart-marker-color": item.color,
    "--chart-marker-border": item.borderColor ?? item.color,
    transform: shape,
    boxSizing: "border-box",
    position: "relative",
    overflow: "hidden",
  } as React.CSSProperties;
}

export function ChartFullscreenButton(props: { label?: string; title?: string }) {
  const [active, setActive] = React.useState(false);
  const fallbackLabel = typeof window !== "undefined" && window.localStorage.getItem("i18nextLng")?.toLowerCase().startsWith("en") ? "Fullscreen" : "Πλήρης οθόνη";

  React.useEffect(() => {
    const update = () => setActive(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", update);
    update();
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  function toggleFullscreen(event: React.MouseEvent<HTMLButtonElement>) {
    const card = event.currentTarget.closest("[data-stat-chart-card]") as HTMLElement | null;
    if (!card) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void card.requestFullscreen?.();
  }

  return (
    <button
      type="button"
      className="btn statistics-chart-fullscreen-btn"
      onClick={toggleFullscreen}
      title={props.title ?? props.label ?? fallbackLabel}
      aria-label={props.title ?? props.label ?? fallbackLabel}
    >
      <span className={active ? "statistics-fullscreen-icon is-active" : "statistics-fullscreen-icon"} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </span>
    </button>
  );
}

export function ChartLegendInset(props: { items: ChartLegendItem[] }) {
  const highContrast = useHighContrastEnabled();
  const items = React.useMemo(() => {
    if (!highContrast) return props.items;
    const palette = ["#ffd400", "#7fffd4", "#ffffff", "#ff8a00", "#66f2d5", "#ff5f5f", "#c4ff00", "#d6b4ff"];
    return props.items.map((item, index) => ({
      ...item,
      color: palette[index % palette.length],
      borderColor: index === 1 ? palette[index % palette.length] : "#000000",
    }));
  }, [highContrast, props.items]);

  if (!items.length) return null;

  return (
    <div
      aria-hidden="true"
      className="statistics-chart-legend"
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 8,
        maxWidth: "100%",
        margin: "0 0 0 auto",
        flex: "0 0 auto",
      }}
    >
      {items.map((item) => (
        <span
          key={`${item.label}-${item.value ?? ""}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            border: "1px solid rgba(37, 99, 235, 0.18)",
            background: "rgba(239, 246, 255, 0.88)",
            color: "#0f172a",
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span className="chart-marker-swatch" style={markerStyle(item)}>
              {item.dashed ? (
                <span
                  style={{
                    position: "absolute",
                    inset: 2,
                    borderTop: `2px dashed ${item.borderColor ?? item.color}`,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
              ) : null}
            </span>
            <span>{item.label}</span>
          </span>
          {item.value !== undefined ? <span style={{ fontWeight: 800 }}>{item.value}</span> : null}
        </span>
      ))}
    </div>
  );
}

function ChartDataSummary(props: { labels: string[]; values: number[]; colors: string[]; borderColors?: string[]; exportMode?: boolean }) {
  if (!props.labels.length) return <div className="chart-data-summary-empty">-</div>;

  const total = props.values.reduce((sum, value) => sum + Number(value ?? 0), 0);

  return (
    <div className="chart-data-summary" role="list" style={props.exportMode ? { justifySelf: "center", marginLeft: "auto", marginRight: "auto" } : undefined}>
      {props.labels.map((label, index) => {
        const value = Number(props.values[index] ?? 0);
        const percent = total > 0 ? `${((value / total) * 100).toFixed(1)}%` : "0%";
        return (
          <div className="chart-data-summary-row" role="listitem" key={`${label}-${index}`}>
            <span className="chart-data-summary-label-wrap">
              <span className="chart-marker-swatch" style={markerStyle({ label, color: props.colors[index] ?? props.colors[0] ?? "#2563eb", borderColor: props.borderColors?.[index] })} />
              <span className="chart-data-summary-label">{label}</span>
            </span>
            <span className="chart-data-summary-meta">
              <span className="chart-data-summary-value">{value}</span>
              <span className="chart-data-summary-percent">{percent}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function buildLineDataset(label: string, data: number[], color: string, background: string, fill = true, variant: "default" | "male" | "female" = "default") {
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
    pointStyle: variant === "female" ? "rectRot" : variant === "male" ? "circle" : "circle",
    borderDash: variant === "female" ? [8, 4] : [],
  };
}

function wrapAxisLabel(label: string, maxLineLength = 18, maxLines = 3) {
  const text = String(label ?? "").trim();
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return "";

  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const pieces = word.length > maxLineLength ? word.match(new RegExp(`.{1,${maxLineLength}}`, "g")) ?? [word] : [word];

    pieces.forEach((piece) => {
      const next = current ? `${current} ${piece}` : piece;
      if (next.length <= maxLineLength || !current) {
        current = next;
        return;
      }
      lines.push(current);
      current = piece;
    });
  });

  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines.length === 1 ? lines[0] : lines;

  const visible = lines.slice(0, maxLines);
  const tail = lines.slice(maxLines - 1).join(" ");
  visible[maxLines - 1] = tail.length > maxLineLength ? `${tail.slice(0, maxLineLength - 1)}…` : tail;
  return visible;
}

function axisLabelLineCount(label: string, maxLineLength = 18, maxLines = 3) {
  const wrapped = wrapAxisLabel(label, maxLineLength, maxLines);
  return Array.isArray(wrapped) ? wrapped.length : 1;
}

function chartContentWidth(labels: string[], datasetCount = 1, minLabelWidth = 68, maxLabelWidth = 128) {
  const longest = labels.reduce((max, label) => Math.max(max, String(label ?? "").length), 0);
  const longestWrapped = labels.reduce((max, label) => Math.max(max, axisLabelLineCount(String(label ?? ""), 18, 3)), 1);
  const labelWidth = Math.max(minLabelWidth, Math.min(maxLabelWidth, longest * 5 + 28));
  const readableLabelWidth = longestWrapped > 1 ? Math.max(labelWidth, Math.min(maxLabelWidth + 24, 132)) : labelWidth;
  return Math.max(640, labels.length * Math.max(readableLabelWidth, 44 * Math.max(1, datasetCount)));
}

function exportAxisLabelStep(labels: string[]) {
  if (labels.length <= 15) return 1;
  if (labels.length <= 30) return 2;
  if (labels.length <= 45) return 3;
  return 5;
}

function exportAxisLabel(label: string, index: number, labels: string[]) {
  const numericLabels = labels.every((item) => /^\d{4}$/.test(String(item ?? "")));
  if (numericLabels) {
    const step = exportAxisLabelStep(labels);
    const lastIndex = labels.length - 1;
    if (index !== 0 && index !== lastIndex && index % step !== 0) return "";
  }
  return wrapAxisLabel(label, 18, 3);
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
  exportMode?: boolean;
}) {
  const isCompact = useCompactStatisticsLayout();
  const highContrast = useHighContrastEnabled();
  const contentWidth = chartContentWidth(props.labels, props.datasetCount ?? 1, props.minLabelWidth ?? 68, props.maxLabelWidth ?? 128);
  const hasLongLabels = props.labels.some((label) => String(label ?? "").trim().length > 12);
  const shouldScroll = !props.exportMode && (props.labels.length > 6 || (props.datasetCount ?? 1) > 1 || (isCompact && (props.labels.length > 3 || hasLongLabels)));
  const exportWidth = props.exportMode ? exportChartWidth : 0;
  const minWidth = props.exportMode ? exportWidth : shouldScroll ? Math.max(contentWidth, isCompact ? 560 : 640) : 0;
  const normalizedData = React.useMemo(
    () => ({
      ...props.data,
      datasets: normalizeLineDatasets(props.data?.datasets ?? [], highContrast),
    }),
    [highContrast, props.data],
  );
  const normalizedOptions = React.useMemo(() => {
    const nextOptions = applyAccessibleChartOptions(props.options, highContrast, {
      scales: {
        x: {
          ticks: {
            font: { size: 13, weight: "600" },
          },
        },
      },
    });
    if (!props.exportMode) return nextOptions;
    const labels = props.labels;
    return applyAccessibleChartOptions(nextOptions, highContrast, {
      scales: {
        x: {
          ticks: {
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0,
            callback: function (_: any, index: number) {
              return exportAxisLabel(String(labels[index] ?? ""), index, labels);
            },
          },
        },
      },
    });
  }, [highContrast, props.exportMode, props.labels, props.options]);

  return (
    <div data-stat-chart-plot="true" style={{ width: props.exportMode ? minWidth || "100%" : "100%", maxWidth: props.exportMode ? "none" : "100%", overflowX: shouldScroll ? "auto" : props.exportMode ? "visible" : "hidden", overflowY: "hidden", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
      <div style={{ minWidth: props.exportMode ? minWidth : shouldScroll ? minWidth : "100%", width: props.exportMode || shouldScroll ? minWidth : "100%", height: props.height ?? 280 }}>
        <Line data={normalizedData} options={normalizedOptions} />
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
  scrollThreshold?: number;
  exportMode?: boolean;
}) {
  const isCompact = useCompactStatisticsLayout();
  const highContrast = useHighContrastEnabled();
  const contentWidth = chartContentWidth(props.labels, props.datasetCount ?? 1, props.minLabelWidth ?? 72, props.maxLabelWidth ?? 124);
  const hasLongLabels = props.labels.some((label) => String(label ?? "").trim().length > 12);
  const shouldScroll = !props.exportMode && (!!props.forceScrollable || props.labels.length > (props.scrollThreshold ?? 7) || (isCompact && (props.labels.length > 3 || hasLongLabels)));
  const exportWidth = props.exportMode ? exportChartWidth : 0;
  const minWidth = props.exportMode ? exportWidth : shouldScroll ? Math.max(contentWidth, isCompact ? 560 : 640) : 0;
  const normalizedOptions = React.useMemo(() => applyAccessibleChartOptions(props.options, highContrast), [highContrast, props.options]);

  return (
    <div data-stat-chart-plot="true" style={{ width: props.exportMode ? minWidth || "100%" : "100%", maxWidth: props.exportMode ? "none" : "100%", overflowX: shouldScroll ? "auto" : props.exportMode ? "visible" : "hidden", overflowY: "hidden", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
      <div style={{ minWidth: props.exportMode ? minWidth : shouldScroll ? minWidth : "100%", width: props.exportMode || shouldScroll ? minWidth : "100%", height: props.height ?? 280 }}>
        <Bar data={props.data} options={normalizedOptions} />
      </div>
    </div>
  );
}

function FixedBarChart(props: {
  data: any;
  options: any;
  height?: number;
}) {
  const highContrast = useHighContrastEnabled();
  const normalizedOptions = React.useMemo(() => applyAccessibleChartOptions(props.options, highContrast), [highContrast, props.options]);

  return (
    <div data-stat-chart-plot="true" style={{ width: "100%", height: props.height ?? 280 }}>
      <Bar data={props.data} options={normalizedOptions} />
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

export function MetricCard(props: { label: string; value: string | number; loading?: boolean; subItems?: { label: string; value: string | number }[]; detail?: string | number; detailsLabel?: string; hideDetailsLabel?: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const hasDetails = Boolean(props.subItems?.length || props.detail !== undefined);
  const detailsId = React.useId();
  const toggleLabel = expanded ? props.hideDetailsLabel ?? "Απόκρυψη" : props.detailsLabel ?? "Λεπτομέρειες";

  return (
    <div className="card statistics-metric-card" style={metricCardStyle}>
      <div className={`statistics-metric-main${props.loading ? " is-loading" : ""}`}>
        <div className="statistics-metric-label">{props.label}</div>
        <div className="statistics-metric-value">{props.loading ? "…" : props.value}</div>
      </div>
      {hasDetails ? (
        <button type="button" className="statistics-metric-toggle" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} aria-controls={detailsId} disabled={props.loading}>
          {toggleLabel}
          <span aria-hidden="true" className="statistics-metric-toggle-icon">{expanded ? "−" : "+"}</span>
        </button>
      ) : null}
      {hasDetails && expanded ? (
        <div id={detailsId} className={`statistics-metric-details-panel${props.loading ? " is-loading" : ""}`}>
          {props.detail !== undefined ? <div className="statistics-metric-detail">{props.loading ? "…" : props.detail}</div> : null}
          {props.subItems?.length ? (
            <div className="statistics-metric-sub-list">
              {props.subItems.map((item) => (
                <div className="statistics-metric-sub-row" key={item.label}>
                  <span className="statistics-metric-sub-label">{item.label}</span>
                  <span className="statistics-metric-sub-value">{props.loading ? "…" : item.value}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
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
  scrollThreshold?: number;
  chartId?: string;
  yTickPrecision?: number;
  suggestedMax?: number;
  exportMode?: boolean;
}) {
  const highContrast = useHighContrastEnabled();
  const chartHeight = props.height ?? (props.horizontal ? Math.max(300, props.labels.length * 54) : 280);
  const chartData = React.useMemo(
    () => ({
      labels: props.labels,
      datasets: [buildBarDataset(props.datasetLabel ?? props.title, props.values, { highContrast, exportMode: props.exportMode })],
    }),
    [highContrast, props.datasetLabel, props.exportMode, props.labels, props.title, props.values],
  );
  const chartOptions = React.useMemo(
    () =>
      buildBarChartOptions({
        horizontal: props.horizontal,
        fullLabelTooltip: props.fullLabelTooltip,
        labels: props.labels,
        yTickPrecision: props.yTickPrecision,
        suggestedMax: props.suggestedMax,
        exportMode: props.exportMode,
      }),
    [props.exportMode, props.fullLabelTooltip, props.horizontal, props.labels, props.suggestedMax, props.yTickPrecision],
  );
  const ariaLabel = useChartAriaLabel(props.title, props.labels, props.values);

  return (
    <div
      className="card"
      style={cardInnerStyle}
      data-stat-chart-card="true"
      data-export-chart-id={props.chartId}
    >
      <div className="topbar" style={compactTopbarStyle}>
        <h3 style={{ margin: 0, flex: "1 1 auto", minWidth: 0 }}>{props.title}</h3>
        {!props.exportMode ? <ChartFullscreenButton label="Fullscreen" title="Fullscreen" /> : null}
        <ChartLegendInset items={[{ label: props.datasetLabel ?? props.title, color: highContrast ? "#ffd400" : solidBlueFill, borderColor: highContrast ? "#000000" : "#2563eb" }]} />
      </div>
      <div className="chart-figure" role="img" aria-label={ariaLabel} style={{ position: "relative" }}>
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
            scrollThreshold={props.scrollThreshold}
            exportMode={props.exportMode}
          />
        )}
      </div>
    </div>
  );
}


export function MultiBarChartCard(props: {
  title: string;
  labels: string[];
  datasets: Array<{ label: string; values: number[]; color: string; borderColor?: string; dashed?: boolean; pointStyle?: "circle" | "square" | "diamond" }>;
  height?: number;
  minLabelWidth?: number;
  maxLabelWidth?: number;
  forceScrollable?: boolean;
  scrollThreshold?: number;
  chartId?: string;
  stacked?: boolean;
  horizontal?: boolean;
  yTickPrecision?: number;
  suggestedMax?: number;
  exportMode?: boolean;
}) {
  const highContrast = useHighContrastEnabled();
  const palette = highContrast ? ["#ffd400", "#7fffd4", "#ffffff", "#ff8a00"] : props.datasets.map((dataset) => dataset.color);
  const chartData = React.useMemo(
    () => ({
      labels: props.labels,
      datasets: props.datasets.map((dataset, index) => {
        const color = palette[index % palette.length] ?? dataset.color;
        return {
          label: dataset.label,
          data: dataset.values,
          borderColor: highContrast ? "#000000" : dataset.borderColor ?? color,
          backgroundColor: color,
          borderWidth: highContrast ? 2 : 1.5,
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.62,
          categoryPercentage: 0.72,
          maxBarThickness: 42,
          minBarLength: props.exportMode ? 4 : undefined,
        };
      }),
    }),
    [highContrast, palette, props.datasets, props.exportMode, props.labels],
  );
  const chartOptions = React.useMemo(
    () =>
      buildBarChartOptions({
        labels: props.labels,
        horizontal: props.horizontal,
        stacked: props.stacked,
        yTickPrecision: props.yTickPrecision,
        suggestedMax: props.suggestedMax,
        exportMode: props.exportMode,
      }),
    [props.exportMode, props.horizontal, props.labels, props.suggestedMax, props.stacked, props.yTickPrecision],
  );
  const ariaLabel = React.useMemo(() => {
    const preview = props.labels
      .slice(0, 5)
      .map((label, index) => `${label}: ${props.datasets.map((dataset) => `${dataset.label} ${dataset.values[index] ?? 0}`).join(", ")}`)
      .join("; ");
    return preview ? `${props.title}. ${preview}` : props.title;
  }, [props.datasets, props.labels, props.title]);

  return (
    <div
      className="card"
      style={cardInnerStyle}
      data-stat-chart-card="true"
      data-export-chart-id={props.chartId}
    >
      <div className="topbar" style={compactTopbarStyle}>
        <h3 style={{ margin: 0, flex: "1 1 auto", minWidth: 0 }}>{props.title}</h3>
        {!props.exportMode ? <ChartFullscreenButton label="Fullscreen" title="Fullscreen" /> : null}
        <ChartLegendInset items={props.datasets.map((dataset, index) => ({
          label: dataset.label,
          color: palette[index % palette.length] ?? dataset.color,
          borderColor: highContrast ? "#000000" : dataset.borderColor ?? dataset.color,
          dashed: dataset.dashed,
          pointStyle: dataset.pointStyle,
        }))} />
      </div>
      <div className="chart-figure" role="img" aria-label={ariaLabel} style={{ position: "relative" }}>
        {props.horizontal ? (
          <FixedBarChart height={props.height ?? Math.max(320, props.labels.length * 58)} data={chartData} options={chartOptions} />
        ) : (
          <ScrollableBarChart
            height={props.height ?? 320}
            labels={props.labels}
            datasetCount={props.datasets.length}
            minLabelWidth={props.minLabelWidth ?? 104}
            maxLabelWidth={props.maxLabelWidth ?? 156}
            data={chartData}
            options={chartOptions}
            forceScrollable={props.forceScrollable}
            scrollThreshold={props.scrollThreshold}
            exportMode={props.exportMode}
          />
        )}
      </div>
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
  const highContrast = useHighContrastEnabled();
  const shouldScroll = props.labels.length > 6;
  const minWidth = shouldScroll ? Math.max(560, props.labels.length * 72) : 0;
  const normalizedOptions = React.useMemo(() => applyAccessibleChartOptions(props.options, highContrast), [highContrast, props.options]);

  return (
    <div data-stat-chart-plot="true" style={{ width: "100%", maxWidth: "100%", overflowX: shouldScroll ? "auto" : "hidden", overflowY: "hidden", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
      <div style={{ minWidth: shouldScroll ? Math.max(minWidth, isCompact ? 560 : 640) : "100%", width: shouldScroll ? "max-content" : "100%", height: props.height ?? 340 }}>
        <Pie data={props.data} options={normalizedOptions} />
      </div>
    </div>
  );
}

function PieChartFigure(props: {
  title: string;
  labels: string[];
  values: number[];
  height?: number;
  colors?: string[];
  exportMode?: boolean;
}) {
  const highContrast = useHighContrastEnabled();
  const chartColors = React.useMemo(() => highContrast ? pieColors(props.labels.length, true) : props.colors?.length ? Array.from({ length: props.labels.length }, (_, index) => props.colors?.[index % props.colors.length] ?? pieColors(props.labels.length, false)[index]) : pieColors(props.labels.length, false), [highContrast, props.colors, props.labels.length]);
  const borderColors = React.useMemo(
    () => Array.from({ length: props.labels.length }, () => (highContrast ? "#000000" : "#ffffff")),
    [highContrast, props.labels.length],
  );
  const chartData = React.useMemo(() => ({
    labels: props.labels,
    datasets: [
      {
        data: props.values,
        backgroundColor: chartColors,
        borderColor: borderColors,
        borderWidth: highContrast ? 2.5 : 2,
        hoverOffset: 10,
      },
    ],
  }), [borderColors, chartColors, highContrast, props.labels, props.values]);
  const ariaLabel = useChartAriaLabel(props.title, props.labels, props.values);

  return (
    <div className="chart-figure" role="img" aria-label={ariaLabel} style={{ display: "grid", gap: 12, position: "relative" }}>
      <ScrollablePieChart
        height={props.height ?? 340}
        labels={props.labels}
        data={chartData}
        options={applyAccessibleChartOptions({
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
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
        }, highContrast)}
      />
      <ChartDataSummary labels={props.labels} values={props.values} colors={chartColors} borderColors={borderColors} exportMode={props.exportMode} />
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
  colors?: string[];
  exportMode?: boolean;
}) {
  return (
    <div className="card" style={cardInnerStyle} data-stat-chart-card="true" data-export-chart-id={props.chartId}>
      <div className="topbar" style={{ ...compactTopbarStyle, display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>{props.title}</h3>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          {!props.exportMode ? <ChartFullscreenButton label="Fullscreen" title="Fullscreen" /> : null}
          {props.control}
        </span>
      </div>
      <PieChartFigure title={props.title} labels={props.labels} values={props.values} height={props.height} colors={props.colors} exportMode={props.exportMode} />
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
  exportMode?: boolean;
}) {
  const highContrast = useHighContrastEnabled();
  const ariaLabel = useChartAriaLabel(props.title, props.labels, props.values);
  const legendItems = React.useMemo(() => [{ label: props.title, color: highContrast ? "#ffd400" : solidBlueFill, borderColor: highContrast ? "#000000" : "#2563eb" }], [highContrast, props.title]);

  return (
    <div className="card" style={cardInnerStyle} data-stat-chart-card="true" data-export-chart-id={props.chartId}>
      <div className="topbar" style={compactTopbarStyle}>
        <h3 style={{ margin: 0, flex: "1 1 auto", minWidth: 0 }}>{props.title}</h3>
        {!props.exportMode ? <ChartFullscreenButton label="Fullscreen" title="Fullscreen" /> : null}
        <ChartLegendInset items={legendItems} />
      </div>
      <div className="chart-figure" role="img" aria-label={ariaLabel} style={{ position: "relative" }}>
        <ScrollableLineChart
          height={props.height ?? 320}
          labels={props.labels}
          minLabelWidth={props.minLabelWidth ?? 76}
          maxLabelWidth={props.maxLabelWidth ?? 96}
          exportMode={props.exportMode}
          data={{ labels: props.labels, datasets: [buildLineDataset(props.title, props.values, "#2563eb", "rgba(37, 99, 235, 0.28)")] }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: {
                offset: false,
                ticks: {
                  autoSkip: false,
                  maxRotation: 0,
                  minRotation: 0,
                  callback: function (_: any, index: number) {
                    const label = String(props.labels[index] ?? "");
                    return props.exportMode ? exportAxisLabel(label, index, props.labels) : wrapAxisLabel(label, 18, 3);
                  },
                },
              },
              y: { beginAtZero: true, ticks: { precision: 0 } },
            },
            layout: { padding: { left: 0, right: 0 } },
          }}
        />
      </div>
    </div>
  );
}

