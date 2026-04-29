import React from "react";
import { useTranslation } from "react-i18next";
import { getPublicStats, logPublicExport } from "../lib/api";
import { buildStatisticsExportFilename, exportStatisticsCsvFile, exportStatisticsWorkbookFile, type StatisticsChartId } from "./statisticsExport";
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
import { downloadCanvasAsPng, downloadCombinedSnapshotsAsPng, fileSlug, renderSegmentedElementSnapshots } from "./statistics/snapshot";
import { waitForRenderableImages } from "../lib/domSnapshot";
import { buildLineDataset } from "./statistics/ui";
import {
  AcademicCharts,
  DemographicsCharts,
  ExportChartsSurface,
  GeographyCharts,
  StatisticsGroupMenu,
  StatisticsSummaryCards,
} from "./statistics/sections";
import { StatisticsExportMenu, StatisticsExportSelectionModal, toggleAllChartsSelection, toggleChartGroupSelection, toggleChartSelection } from "./statistics/exportSelection";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, BarElement, ArcElement, Filler, Tooltip, Legend);

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

const yTicks = { precision: 0 as any };
const sectionWrapStyle: React.CSSProperties = { display: "grid", gap: 14 };
const metricGridStyle: React.CSSProperties = { display: "grid", gap: 12 };
const metricTopRowStyle: React.CSSProperties = { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" };
const metricBottomRowStyle: React.CSSProperties = { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" };
const sectionMenuStyle: React.CSSProperties = { display: "grid", gap: 12, width: "100%" };
const sectionButtonsStyle: React.CSSProperties = { display: "grid", gap: 12, width: "100%", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" };
const cardInnerStyle = { minWidth: 0 };
const compactTopbarStyle = { marginBottom: 12 };

export default function Statistics() {
  const { t, i18n } = useTranslation("statistics");

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any | null>(null);
  const [activeGroup, setActiveGroup] = React.useState<"demographics" | "academic" | "geography">("demographics");
  const [selectedGenderEntryYearLeft, setSelectedGenderEntryYearLeft] = React.useState<string>("all");
  const [selectedGenderEntryYearRight, setSelectedGenderEntryYearRight] = React.useState<string>("all");
  const [exportOpen, setExportOpen] = React.useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = React.useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = React.useState<"xlsx" | "csv" | "png" | null>(null);
  const exportMenuRef = React.useRef<HTMLDivElement | null>(null);
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
          { id: "genderByEntryYear" as StatisticsChartId, label: t("sections.genderByEntryYear") },
        ],
      },
      {
        key: "academic" as const,
        label: t("groups.academic"),
        charts: [
          { id: "byYear" as StatisticsChartId, label: t("sections.byYear") },
          { id: "gradeByYear" as StatisticsChartId, label: t("sections.gradeByYear") },
          { id: "gradeDistribution" as StatisticsChartId, label: t("sections.gradeDistribution") },
          { id: "timeToDegreeByEntryYear" as StatisticsChartId, label: t("sections.timeToDegreeByEntryYear") },
          { id: "timeToDegreeDistribution" as StatisticsChartId, label: t("sections.timeToDegreeDistribution") },
        ],
      },
      {
        key: "geography" as const,
        label: t("groups.geography"),
        charts: [
          { id: "originRegion" as StatisticsChartId, label: t("sections.originRegion") },
          { id: "originMunicipality" as StatisticsChartId, label: t("sections.originMunicipality") },
          { id: "originCountry" as StatisticsChartId, label: t("sections.originCountry") },
          { id: "abroadShare" as StatisticsChartId, label: t("sections.abroadShare") },
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
        buildLineDataset(t("table.male", { defaultValue: "Άνδρες" }), rows.map((r: any) => r.male), "#3b82f6", "rgba(59, 130, 246, 0.22)", true, "male"),
        buildLineDataset(t("table.female", { defaultValue: "Γυναίκες" }), rows.map((r: any) => r.female), "#db2777", "rgba(219, 39, 119, 0.22)", true, "female"),
      ],
    };
  }, [data, t]);

  const genderChartOptions = React.useMemo(
    () =>
      ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
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
  const gradeBins = seriesFromRows(data?.degree_grade_bins);
  const regions = seriesFromRows(data?.origin_region_distribution, { labelKey: "name" });
  const municipalities = seriesFromRows(data?.origin_municipality_distribution, { labelKey: "name" });
  const countries = seriesFromRows(data?.origin_country_distribution, { labelKey: "name" });
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

  const genderByEntryYearRows = React.useMemo(() => ((data?.gender_by_entry_year ?? []) as NamedCountRow[]), [data]);

  const genderByEntryYearByValue = React.useMemo(() => {
    const map = new Map<string, NamedCountRow>();
    genderByEntryYearRows.forEach((row) => {
      const value = String(row.entry_year ?? row.year ?? "");
      if (value) map.set(value, row);
    });
    return map;
  }, [genderByEntryYearRows]);

  const makeGenderByEntryYearPie = React.useCallback((selectedYear: string) => {
    const row = genderByEntryYearByValue.get(selectedYear) ?? genderByEntryYearRows[0] ?? null;
    return {
      labels: [t("table.male"), t("table.female")],
      values: [Number(row?.male ?? 0), Number(row?.female ?? 0)],
    };
  }, [genderByEntryYearByValue, genderByEntryYearRows, t]);

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
  const abroadCount = Number(data?.abroad_count ?? 0);

  const entryYearOptions = React.useMemo(() => {
    return genderByEntryYearRows
      .filter((row) => row.entry_year !== null && row.entry_year !== undefined)
      .map((row) => ({
        value: String(row.entry_year),
        label: String(row.entry_year),
      }));
  }, [genderByEntryYearRows]);

  React.useEffect(() => {
    if (!entryYearOptions.length) return;
    const first = entryYearOptions[0]?.value ?? "all";
    const second = entryYearOptions[1]?.value ?? first;
    setSelectedGenderEntryYearLeft((current) => current === "all" || !entryYearOptions.some((option) => option.value === current) ? first : current);
    setSelectedGenderEntryYearRight((current) => current === "all" || !entryYearOptions.some((option) => option.value === current) ? second : current);
  }, [entryYearOptions]);

  const topButtonStyle: React.CSSProperties = {
    minHeight: 48,
    width: "100%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    padding: "0 18px",
    fontSize: 16,
    fontWeight: 700,
    whiteSpace: "normal",
    lineHeight: 1.25,
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

  const makeGenderEntryYearSelect = React.useCallback((value: string, onChange: (value: string) => void) => entryYearOptions.length ? (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
      {entryYearOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ) : null, [entryYearOptions, selectStyle]);

  const genderByEntryYearPies = React.useMemo(() => [
    {
      key: "left",
      title: selectedGenderEntryYearLeft === "all" ? "-" : selectedGenderEntryYearLeft,
      ...makeGenderByEntryYearPie(selectedGenderEntryYearLeft),
      control: makeGenderEntryYearSelect(selectedGenderEntryYearLeft, setSelectedGenderEntryYearLeft),
    },
    {
      key: "right",
      title: selectedGenderEntryYearRight === "all" ? "-" : selectedGenderEntryYearRight,
      ...makeGenderByEntryYearPie(selectedGenderEntryYearRight),
      control: makeGenderEntryYearSelect(selectedGenderEntryYearRight, setSelectedGenderEntryYearRight),
    },
  ], [makeGenderByEntryYearPie, makeGenderEntryYearSelect, selectedGenderEntryYearLeft, selectedGenderEntryYearRight]);

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
    setSelectedChartIds((prev) => toggleAllChartsSelection(prev, allChartIds));
  }

  function toggleGroupCharts(chartIds: StatisticsChartId[]) {
    setSelectedChartIds((prev) => toggleChartGroupSelection(prev, chartIds));
  }

  function toggleSingleChart(chartId: StatisticsChartId) {
    setSelectedChartIds((prev) => toggleChartSelection(prev, chartId));
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
    selectedChartIds,
  }), [activeLang, avgAge, avgGrade, busiestCity, busiestYear, data, longestStudyYears, selectedChartIds, t, total]);

  async function exportSelectedChartsAsPng() {
    if (!selectedChartIds.length) return;

    const exportRoot = exportSurfaceRef.current;
    const visibleRoot = pageRef.current;
    if (!exportRoot && !visibleRoot) return;

    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => window.setTimeout(resolve, 260));

    const chartMeta = new Map(
      chartGroups.flatMap((group) => group.charts.map((chart) => [chart.id, { groupKey: group.key, groupLabel: group.label, chartLabel: chart.label }] as const))
    );

    const orderedGroupSelections = chartGroups
      .map((group) => ({
        key: group.key,
        label: group.label,
        chartIds: group.charts.map((chart) => chart.id).filter((chartId) => selectedChartIds.includes(chartId)),
      }))
      .filter((group) => group.chartIds.length > 0);

    const findChartCard = (chartId: StatisticsChartId) => {
      const selector = `[data-export-chart-id="${chartId}"]`;
      return exportRoot?.querySelector<HTMLElement>(selector) ?? visibleRoot?.querySelector<HTMLElement>(selector) ?? null;
    };

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const downloaded: string[] = [];
    const maxChartsPerPage = 4;

    for (const group of orderedGroupSelections) {
      const snapshots: Array<{ chartId: StatisticsChartId; image: HTMLImageElement; width: number; height: number; caption?: string }> = [];

      for (const chartId of group.chartIds) {
        const card = findChartCard(chartId);
        if (!card) continue;

        await waitForRenderableImages(card);

        try {
          const renderedSnapshots = await renderSegmentedElementSnapshots(card);
          const meta = chartMeta.get(chartId);
          const segmentCount = renderedSnapshots.length;

          renderedSnapshots.forEach((snapshot, snapshotIndex) => {
            const showCaption = group.chartIds.length > 1 || segmentCount > 1;
            const baseCaption = meta?.chartLabel ?? chartId;
            const caption = showCaption
              ? segmentCount > 1
                ? `${baseCaption} ${snapshotIndex + 1}/${segmentCount}`
                : baseCaption
              : undefined;

            snapshots.push({
              chartId,
              image: snapshot.image,
              width: snapshot.width,
              height: snapshot.height,
              caption,
            });
          });
        } catch {}
      }

      if (!snapshots.length) continue;

      if (snapshots.length === 1) {
        const snapshot = snapshots[0];
        const out = document.createElement("canvas");
        const padding = 18;
        const width = snapshot.width + padding * 2;
        const height = snapshot.height + padding * 2;

        out.width = width * 2;
        out.height = height * 2;

        const ctx = out.getContext("2d");
        if (!ctx) continue;

        ctx.scale(2, 2);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(snapshot.image, padding, padding, snapshot.width, snapshot.height);

        const meta = chartMeta.get(snapshot.chartId);
        const baseName = ["alupla", "statistics", meta?.groupLabel ?? group.label, meta?.chartLabel ?? snapshot.chartId, stamp]
          .map((part) => fileSlug(String(part)))
          .filter(Boolean)
          .join("_");
        const filename = `${baseName || `alupla_statistics_${snapshot.chartId}_${stamp}`}.png`;
        const didDownload = await downloadCanvasAsPng(out, filename);
        if (!didDownload) continue;
        downloaded.push(filename);
        await new Promise<void>((resolve) => window.setTimeout(resolve, 220));
        continue;
      }

      for (let pageIndex = 0; pageIndex < snapshots.length; pageIndex += maxChartsPerPage) {
        const pageSnapshots = snapshots.slice(pageIndex, pageIndex + maxChartsPerPage);
        const pageNumber = Math.floor(pageIndex / maxChartsPerPage) + 1;
        const totalPages = Math.ceil(snapshots.length / maxChartsPerPage);
        const title = totalPages > 1 ? `${group.label} ${pageNumber}/${totalPages}` : group.label;
        const baseName = ["alupla", "statistics", group.label, totalPages > 1 ? `page_${pageNumber}` : null, stamp]
          .filter(Boolean)
          .map((part) => fileSlug(String(part)))
          .filter(Boolean)
          .join("_");
        const filename = `${baseName || `alupla_statistics_${group.key}_${pageNumber}_${stamp}`}.png`;
        const didDownload = await downloadCombinedSnapshotsAsPng(filename, title, pageSnapshots);
        if (!didDownload) continue;
        downloaded.push(filename);
        await new Promise<void>((resolve) => window.setTimeout(resolve, 220));
      }
    }

    if (!downloaded.length) throw new Error("png_export_failed");
  }

  async function handleExportAction() {
    if (!selectedChartIds.length || !selectedExportFormat) return;

    try {
      if (selectedExportFormat === "xlsx") {
        exportStatisticsWorkbookFile(exportArgs, buildStatisticsExportFilename(exportArgs, "xlsx"));
      } else if (selectedExportFormat === "csv") {
        exportStatisticsCsvFile(exportArgs, buildStatisticsExportFilename(exportArgs, "csv"));
      } else {
        await exportSelectedChartsAsPng();
      }
    } finally {
      const exportType = selectedExportFormat;
      setSelectedExportFormat(null);
      setExportOpen(false);

      try {
        await logPublicExport("statistics_export", exportType);
      } catch {}
    }
  }


  if (err && !data) return <div className="card">{err}</div>;

  const loadingLabel = t("loading");
  const loadingLabelStyle = { "--statistics-loading-label": JSON.stringify(loadingLabel) } as React.CSSProperties;

  return (
    <>
      <style>{`
        .statistics-chart-loading-region [data-stat-chart-plot] { position: relative; }
        .statistics-chart-loading-region [data-stat-chart-plot] > * { filter: blur(3px); opacity: .72; pointer-events: none; user-select: none; transition: filter .18s ease, opacity .18s ease; }
        .statistics-chart-loading-region [data-stat-chart-plot]::after { content: var(--statistics-loading-label); position: absolute; inset: 0; border-radius: 14px; display: grid; place-items: center; font-size: 18px; font-weight: 800; color: #0f172a; background: rgba(255,255,255,.08); backdrop-filter: blur(2px); pointer-events: none; z-index: 5; }
        html.accessibility-high-contrast .statistics-chart-loading-region [data-stat-chart-plot]::after { background: #fff; color: #000; border: 2px solid #000; }
      `}</style>
      <div className="page-stable-shell statistics-page" ref={pageRef}>
        <div className="card page-header-card" style={{ padding: 14 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gap: 14 }}>
              <div className="mobile-summary-title-row">
                <h2 style={{ margin: 0 }}>{t("pageTitle")}</h2>
              </div>
              <StatisticsGroupMenu
                t={t}
                activeGroup={activeGroup}
                setActiveGroup={setActiveGroup}
                topButtonStyle={topButtonStyle}
                sectionMenuStyle={sectionMenuStyle}
                sectionButtonsStyle={sectionButtonsStyle}
                exportButton={(
                  <div ref={exportMenuRef}>
                    <StatisticsExportMenu
                      t={t}
                      open={exportOpen}
                      topButtonStyle={topButtonStyle}
                      onToggle={() => setExportOpen((open) => !open)}
                      onPick={openExportSelection}
                    />
                  </div>
                )}
              />
              <div className="mobile-submenu-toggle-row">
                <button
                  type="button"
                  className="btn mobile-summary-toggle"
                  onClick={() => setMobileSummaryOpen((open) => !open)}
                >
                  {mobileSummaryOpen
                    ? t("summary.hide", { defaultValue: i18n.language?.startsWith("en") ? "Hide summary" : "Απόκρυψη" })
                    : t("summary.show", { defaultValue: i18n.language?.startsWith("en") ? "Brief info" : "Σύντομες πληροφορίες" })}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={`mobile-summary-panel${mobileSummaryOpen ? " open" : ""}`}>
          <StatisticsSummaryCards
            t={t}
            total={total}
            avgAge={avgAge}
            avgGrade={avgGrade}
            longestStudyYears={longestStudyYears}
            busiestYear={busiestYear}
            busiestCity={busiestCity}
            sectionWrapStyle={sectionWrapStyle}
            metricGridStyle={metricGridStyle}
            metricTopRowStyle={metricTopRowStyle}
            metricBottomRowStyle={metricBottomRowStyle}
            loading={loading}
          />
        </div>

        <div className={loading ? "statistics-chart-loading-region" : undefined} style={loading ? loadingLabelStyle : undefined}>
          {activeGroup === "demographics" ? (
          <DemographicsCharts
            t={t}
            cardInnerStyle={cardInnerStyle}
            compactTopbarStyle={compactTopbarStyle}
            genderChartData={genderChartData}
            genderChartOptions={genderChartOptions}
            countChartData={countChartData}
            countChartOptions={countChartOptions}
            birthYears={birthYears}
            genderByEntryYearPies={genderByEntryYearPies}
            avgGradesByYear={avgGradesByYear}
            gradeBins={gradeBins}
            yearsToDegree={yearsToDegree}
            yearsToDegreeDistribution={yearsToDegreeDistribution}
            regions={regions}
            municipalities={municipalities}
            countries={countries}
            total={total}
            abroadCount={abroadCount}
          />
        ) : null}

          {activeGroup === "academic" ? (
          <AcademicCharts
            t={t}
            cardInnerStyle={cardInnerStyle}
            compactTopbarStyle={compactTopbarStyle}
            genderChartData={genderChartData}
            genderChartOptions={genderChartOptions}
            countChartData={countChartData}
            countChartOptions={countChartOptions}
            birthYears={birthYears}
            genderByEntryYearPies={genderByEntryYearPies}
            avgGradesByYear={avgGradesByYear}
            gradeBins={gradeBins}
            yearsToDegree={yearsToDegree}
            yearsToDegreeDistribution={yearsToDegreeDistribution}
            regions={regions}
            municipalities={municipalities}
            countries={countries}
            total={total}
            abroadCount={abroadCount}
          />
        ) : null}

          {activeGroup === "geography" ? (
          <GeographyCharts
            t={t}
            cardInnerStyle={cardInnerStyle}
            compactTopbarStyle={compactTopbarStyle}
            genderChartData={genderChartData}
            genderChartOptions={genderChartOptions}
            countChartData={countChartData}
            countChartOptions={countChartOptions}
            birthYears={birthYears}
            genderByEntryYearPies={genderByEntryYearPies}
            avgGradesByYear={avgGradesByYear}
            gradeBins={gradeBins}
            yearsToDegree={yearsToDegree}
            yearsToDegreeDistribution={yearsToDegreeDistribution}
            regions={regions}
            municipalities={municipalities}
            countries={countries}
            total={total}
            abroadCount={abroadCount}
          />
          ) : null}
        </div>
      </div>

      {selectedExportFormat ? (
        <StatisticsExportSelectionModal
          t={t}
          exportFormatLabel={exportFormatLabel}
          chartGroups={chartGroups}
          selectedChartIds={selectedChartIds}
          allChartsSelected={allChartsSelected}
          selectionRowStyle={selectionRowStyle}
          selectionCheckboxStyle={selectionCheckboxStyle}
          onClose={closeExportSelection}
          onToggleAll={toggleAllCharts}
          onToggleGroup={toggleGroupCharts}
          onToggleChart={toggleSingleChart}
          onConfirm={() => void handleExportAction()}
        />
      ) : null}

      {selectedExportFormat === "png" ? (
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
          opacity: 1,
          zIndex: 0,
          background: "#ffffff",
        }}
        >
        <ExportChartsSurface
          t={t}
          cardInnerStyle={cardInnerStyle}
          compactTopbarStyle={compactTopbarStyle}
          genderChartData={genderChartData}
          genderChartOptions={genderChartOptions}
          countChartData={countChartData}
          countChartOptions={countChartOptions}
          birthYears={birthYears}
          genderByEntryYearPies={genderByEntryYearPies}
          avgGradesByYear={avgGradesByYear}
          gradeBins={gradeBins}
          yearsToDegree={yearsToDegree}
          yearsToDegreeDistribution={yearsToDegreeDistribution}
          regions={regions}
          municipalities={municipalities}
          countries={countries}
          total={total}
          abroadCount={abroadCount}
        />
        </div>
      ) : null}
    </>
  );
}
