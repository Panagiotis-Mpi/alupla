import React from "react";
import { useTranslation } from "react-i18next";
import { getPublicStats, logPublicExport } from "../lib/api";
import { exportStatisticsCsvFile, exportStatisticsWorkbookFile, type StatisticsChartId } from "./statisticsExport";
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
import { fileSlug, renderElementSnapshot } from "./statistics/snapshot";
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
  const [selectedGenderProgramId, setSelectedGenderProgramId] = React.useState<string>("all");
  const [exportOpen, setExportOpen] = React.useState(false);
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
  const abroadCount = Number(data?.abroad_count ?? 0);

  const studyProgramOptions = React.useMemo(() => {
    const rows = Array.isArray(data?.study_program_distribution) ? (data.study_program_distribution as NamedCountRow[]) : [];
    return rows
      .filter((row) => row.id !== null && row.id !== undefined)
      .map((row) => ({
        value: String(row.id),
        label: String(activeLang === "en" ? row.name_en ?? row.name_el ?? row.name : row.name_el ?? row.name_en ?? row.name ?? "-"),
      }));
  }, [activeLang, data]);

  React.useEffect(() => {
    if (!studyProgramOptions.length) return;
    if (selectedGenderProgramId === "all") {
      setSelectedGenderProgramId(studyProgramOptions[0]?.value ?? "all");
      return;
    }
    if (!studyProgramOptions.some((option) => option.value === selectedGenderProgramId)) {
      setSelectedGenderProgramId(studyProgramOptions[0]?.value ?? "all");
    }
  }, [studyProgramOptions, selectedGenderProgramId]);

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

  const genderProgramSelect = studyProgramOptions.length ? (
    <select value={selectedGenderProgramId} onChange={(e) => setSelectedGenderProgramId(e.target.value)} style={selectStyle}>
      {studyProgramOptions.map((option) => (
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
            </div>
          </div>
        </div>

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
        />

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
            genderByProgramPie={genderByProgramPie}
            genderProgramSelect={genderProgramSelect}
            studyPrograms={studyPrograms}
            avgGradesByYear={avgGradesByYear}
            gradeBins={gradeBins}
            avgGradeByProgram={avgGradeByProgram}
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
            genderByProgramPie={genderByProgramPie}
            genderProgramSelect={genderProgramSelect}
            studyPrograms={studyPrograms}
            avgGradesByYear={avgGradesByYear}
            gradeBins={gradeBins}
            avgGradeByProgram={avgGradeByProgram}
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
            genderByProgramPie={genderByProgramPie}
            genderProgramSelect={genderProgramSelect}
            studyPrograms={studyPrograms}
            avgGradesByYear={avgGradesByYear}
            gradeBins={gradeBins}
            avgGradeByProgram={avgGradeByProgram}
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
        <ExportChartsSurface
          t={t}
          cardInnerStyle={cardInnerStyle}
          compactTopbarStyle={compactTopbarStyle}
          genderChartData={genderChartData}
          genderChartOptions={genderChartOptions}
          countChartData={countChartData}
          countChartOptions={countChartOptions}
          birthYears={birthYears}
          genderByProgramPie={genderByProgramPie}
          genderProgramSelect={genderProgramSelect}
          studyPrograms={studyPrograms}
          avgGradesByYear={avgGradesByYear}
          gradeBins={gradeBins}
          avgGradeByProgram={avgGradeByProgram}
          yearsToDegree={yearsToDegree}
          yearsToDegreeDistribution={yearsToDegreeDistribution}
          regions={regions}
          municipalities={municipalities}
          countries={countries}
          total={total}
          abroadCount={abroadCount}
        />
      </div>
    </>
  );
}
