// Σελίδα στατιστικών με KPIs, διαγράμματα, φίλτρα και exports.
import React from "react";
import { useTranslation } from "react-i18next";
import { getPublicStats, logPublicExport } from "../lib/api";
import { buildStatisticsExportFilename, buildStatisticsPngFilename, exportStatisticsCsvFile, exportStatisticsWorkbookFile, type StatisticsChartId } from "./statisticsExport";
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
import { downloadCanvasAsPng, downloadCombinedSnapshotsAsPng, renderSegmentedElementSnapshots } from "./statistics/snapshot";
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
type StatisticsDataGroupKey = "demographics" | "academic" | "geography";
type StatisticsGroupKey = StatisticsDataGroupKey | "compare";
type ExportGroupRange = { from: string; to: string };
type ExportGroupRanges = Record<StatisticsGroupKey, ExportGroupRange>;
const compactTopbarStyle: React.CSSProperties = { marginBottom: 12, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 };

export default function Statistics() {
  const { t, i18n } = useTranslation("statistics");

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any | null>(null);
  const [activeGroup, setActiveGroup] = React.useState<StatisticsGroupKey>("demographics");
  const [loadedGroups, setLoadedGroups] = React.useState<Record<StatisticsDataGroupKey, boolean>>({ demographics: false, academic: false, geography: false });
  const [selectedGenderDistributionYear, setSelectedGenderDistributionYear] = React.useState<string>("all");
  const [exportOpen, setExportOpen] = React.useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = React.useState(false);
    const [compareAStart, setCompareAStart] = React.useState<string>("");
  const [compareAEnd, setCompareAEnd] = React.useState<string>("");
  const [compareBStart, setCompareBStart] = React.useState<string>("");
  const [compareBEnd, setCompareBEnd] = React.useState<string>("");
  const [selectedExportFormat, setSelectedExportFormat] = React.useState<"xlsx" | "csv" | "png" | null>(null);
  const exportMenuRef = React.useRef<HTMLDivElement | null>(null);
  const pageRef = React.useRef<HTMLDivElement | null>(null);
  const exportSurfaceRef = React.useRef<HTMLDivElement | null>(null);
  const statsRequestsRef = React.useRef<Partial<Record<StatisticsDataGroupKey, Promise<any>>>>({});

  const activeLang: "el" | "en" = i18n.language?.toLowerCase().startsWith("en") ? "en" : "el";

  const compareExportLabel = React.useMemo(
    () => t("compare.title", { defaultValue: activeLang === "en" ? "Time range comparison" : "Σύγκριση χρονικών διαστημάτων" }),
    [activeLang, t]
  );

  const chartGroups = React.useMemo(
    () => [
      {
        key: "demographics" as const,
        label: t("groups.demographics"),
        charts: [
          { id: "byYear" as StatisticsChartId, label: t("sections.byYear") },
          { id: "countByEntryYear" as StatisticsChartId, label: t("sections.countByEntryYear") },
          { id: "birthYear" as StatisticsChartId, label: t("sections.birthYear") },
          { id: "genderTotal" as StatisticsChartId, label: t("sections.genderTotal") },
          { id: "gender" as StatisticsChartId, label: t("sections.gender") },
        ],
      },
      {
        key: "academic" as const,
        label: t("groups.academic"),
        charts: [
          { id: "gradeDistribution" as StatisticsChartId, label: t("sections.gradeDistribution") },
          { id: "gradeDistributionByGender" as StatisticsChartId, label: t("sections.gradeDistributionByGender") },
          { id: "timeToDegreeDistribution" as StatisticsChartId, label: t("sections.timeToDegreeDistribution") },
          { id: "gradeByYear" as StatisticsChartId, label: t("sections.gradeByYear") },
          { id: "gradeByRegion" as StatisticsChartId, label: t("sections.gradeByRegion") },
          { id: "timeToDegreeByEntryYear" as StatisticsChartId, label: t("sections.timeToDegreeByEntryYear") },
          { id: "timeToDegreeByRegion" as StatisticsChartId, label: t("sections.timeToDegreeByRegion") },
        ],
      },
      {
        key: "geography" as const,
        label: t("groups.geography"),
        charts: [
          { id: "originRegion" as StatisticsChartId, label: t("sections.originRegion") },
          { id: "genderByRegion" as StatisticsChartId, label: t("sections.genderByRegion") },
          { id: "originMunicipality" as StatisticsChartId, label: t("sections.originMunicipality") },
          { id: "genderByMunicipality" as StatisticsChartId, label: t("sections.genderByMunicipality") },
          { id: "originCountry" as StatisticsChartId, label: t("sections.originCountry") },
          { id: "abroadShare" as StatisticsChartId, label: t("sections.abroadShare") },
          { id: "abroadByYear" as StatisticsChartId, label: t("sections.abroadByYear") },
          { id: "timeToDegreeByNomos" as StatisticsChartId, label: t("sections.timeToDegreeByNomos") },
        ],
      },
      {
        key: "compare" as const,
        label: t("groups.compare"),
        charts: [
          { id: "compare" as StatisticsChartId, label: compareExportLabel },
        ],
      },
    ],
    [compareExportLabel, t]
  );

  const allChartIds = React.useMemo(
    () => chartGroups.flatMap((group) => group.charts.map((chart) => chart.id)),
    [chartGroups]
  );
  const [selectedChartIds, setSelectedChartIds] = React.useState<StatisticsChartId[]>([]);
  const [selectedExportGenderEntryYears, setSelectedExportGenderEntryYears] = React.useState<string[]>([]);
  const [exportGroupRanges, setExportGroupRanges] = React.useState<ExportGroupRanges>({
    demographics: { from: "", to: "" },
    academic: { from: "", to: "" },
    geography: { from: "", to: "" },
    compare: { from: "", to: "" },
  });
  const [exportPreviewData, setExportPreviewData] = React.useState<any | null>(null);

  React.useEffect(() => {
    setSelectedChartIds((prev) => prev.filter((id) => allChartIds.includes(id)));
  }, [allChartIds]);

  const mergeStatsData = React.useCallback((stats: any) => {
    setData((current: any | null) => ({ ...(current || {}), ...(stats || {}) }));
  }, []);

  const loadStatsGroup = React.useCallback((group: StatisticsDataGroupKey) => {
    if (statsRequestsRef.current[group]) return statsRequestsRef.current[group] as Promise<any>;
    const request = getPublicStats({ section: group })
      .then((stats) => {
        mergeStatsData(stats);
        setLoadedGroups((current) => ({ ...current, [group]: true }));
        return stats;
      })
      .finally(() => {
        delete statsRequestsRef.current[group];
      });
    statsRequestsRef.current[group] = request;
    return request;
  }, [mergeStatsData]);

  async function load() {
    setLoading(true);
    setErr(null);
    setData(null);
    setLoadedGroups({ demographics: false, academic: false, geography: false });
    statsRequestsRef.current = {};
    try {
      await loadStatsGroup("demographics");
      window.setTimeout(() => {
        void loadStatsGroup("academic").catch(() => {});
        void loadStatsGroup("geography").catch(() => {});
      }, 80);
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
    if (activeGroup === "compare") {
      void loadStatsGroup("academic").catch((e: any) => setErr(e?.message ?? t("error")));
      void loadStatsGroup("geography").catch((e: any) => setErr(e?.message ?? t("error")));
      return;
    }
    if (activeGroup === "demographics" || loadedGroups[activeGroup]) return;
    void loadStatsGroup(activeGroup).catch((e: any) => setErr(e?.message ?? t("error")));
  }, [activeGroup, loadStatsGroup, loadedGroups, t]);

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
        setExportPreviewData(null);
        setSelectedExportFormat(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const total = Number(data?.total ?? 0);
  const numberValue = React.useCallback((value: unknown, digits = 1) => {
    if (value === null || value === undefined) return "-";
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "-";
    return numeric.toFixed(digits);
  }, []);
  const integerValue = React.useCallback((value: unknown) => {
    if (value === null || value === undefined) return "-";
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "-";
    return String(Math.round(numeric));
  }, []);
  const avgAge = numberValue(data?.avg_age, 1);
  const minAge = integerValue(data?.min_age);
  const maxAge = integerValue(data?.max_age);
  const avgGrade = numberValue(data?.avg_degree_grade, 2);
  const minGrade = numberValue(data?.min_degree_grade, 2);
  const maxGrade = numberValue(data?.max_degree_grade, 2);
  const avgStudyYears = numberValue(data?.avg_years_to_degree, 1);
  const minStudyYears = integerValue(data?.min_years_to_degree);
  const maxStudyYears = integerValue(data?.max_years_to_degree);
  const maleCount = Number(data?.gender?.M ?? 0);
  const femaleCount = Number(data?.gender?.F ?? 0);

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


  const sortSeriesDescending = React.useCallback((series: { labels: string[]; values: number[] }) => {
    return series.labels
      .map((label, index) => ({ label, value: Number(series.values[index] ?? 0), index }))
      .sort((a, b) => b.value - a.value || a.index - b.index)
      .reduce((acc, item) => {
        acc.labels.push(item.label);
        acc.values.push(item.value);
        return acc;
      }, { labels: [] as string[], values: [] as number[] });
  }, []);

  const sortGenderByRegionDescending = React.useCallback((series: { labels: string[]; male: number[]; female: number[] }) => {
    return series.labels
      .map((label, index) => ({
        label,
        male: Number(series.male[index] ?? 0),
        female: Number(series.female[index] ?? 0),
        index,
      }))
      .sort((a, b) => (b.male + b.female) - (a.male + a.female) || a.index - b.index)
      .reduce((acc, item) => {
        acc.labels.push(item.label);
        acc.male.push(item.male);
        acc.female.push(item.female);
        return acc;
      }, { labels: [] as string[], male: [] as number[], female: [] as number[] });
  }, []);

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


  const gradeBinsByGender = React.useMemo(() => {
    const safeRows = Array.isArray(data?.degree_grade_bins_by_gender) ? data.degree_grade_bins_by_gender as NamedCountRow[] : [];
    return {
      labels: safeRows.map((row) => String(row.label ?? "-")),
      male: safeRows.map((row) => Number(row.male ?? 0)),
      female: safeRows.map((row) => Number(row.female ?? 0)),
    };
  }, [data]);

  const entryYears = seriesFromRows(data?.count_by_entry_year, { labelKey: "entry_year" });
  const birthYears = seriesFromRows(data?.birth_year_distribution, { labelKey: "year" });
  const avgGradesByYear = seriesFromRows(data?.avg_grade_by_year, { labelKey: "year", valueKey: "avg" });
  const avgGradesByRegion = React.useMemo(() => sortSeriesDescending(seriesFromRows(data?.avg_grade_by_region, { labelKey: "name", valueKey: "avg" })), [data, seriesFromRows, sortSeriesDescending]);
  const gradeBins = seriesFromRows(data?.degree_grade_bins);
  const regions = React.useMemo(() => sortSeriesDescending(seriesFromRows(data?.origin_region_distribution, { labelKey: "name" })), [data, seriesFromRows, sortSeriesDescending]);
  const municipalities = React.useMemo(() => sortSeriesDescending(seriesFromRows(data?.origin_municipality_distribution, { labelKey: "name" })), [data, seriesFromRows, sortSeriesDescending]);
  const countries = React.useMemo(() => sortSeriesDescending(seriesFromRows(data?.origin_country_distribution, { labelKey: "name" })), [data, seriesFromRows, sortSeriesDescending]);
  const abroadByYear = React.useMemo(() => {
    const safeRows = Array.isArray(data?.abroad_by_year) ? data.abroad_by_year as NamedCountRow[] : [];
    return {
      labels: safeRows.map((row) => String(row.year ?? "-")),
      greece: safeRows.map((row: any) => Number(row.greece ?? 0)),
      abroad: safeRows.map((row: any) => Number(row.abroad ?? 0)),
    };
  }, [data]);
  const yearsToDegreeByNomos = React.useMemo(() => sortSeriesDescending(seriesFromRows(data?.avg_years_to_degree_by_nomos, { labelKey: "name", valueKey: "avg_years" })), [data, seriesFromRows, sortSeriesDescending]);

  const yearsToDegree = seriesFromRows(data?.avg_years_to_degree_by_entry_year, { labelKey: "entry_year", valueKey: "avg_years" });
  const yearsToDegreeByRegion = React.useMemo(() => sortSeriesDescending(seriesFromRows(data?.avg_years_to_degree_by_region, { labelKey: "name", valueKey: "avg_years" })), [data, seriesFromRows, sortSeriesDescending]);
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

  const genderByRegion = React.useMemo(() => {
    const safeRows = Array.isArray(data?.gender_by_region) ? data.gender_by_region as NamedCountRow[] : [];
    return sortGenderByRegionDescending({
      labels: safeRows.map((row) => {
        const value = activeLang === "en" ? row.name_en ?? row.name_el ?? row.name : row.name_el ?? row.name_en ?? row.name;
        return String(value ?? "-");
      }),
      male: safeRows.map((row) => Number(row.male ?? 0)),
      female: safeRows.map((row) => Number(row.female ?? 0)),
    });
  }, [activeLang, data, sortGenderByRegionDescending]);

  const genderByMunicipality = React.useMemo(() => {
    const safeRows = Array.isArray(data?.gender_by_municipality) ? data.gender_by_municipality as NamedCountRow[] : [];
    return sortGenderByRegionDescending({
      labels: safeRows.map((row) => {
        const value = activeLang === "en" ? row.name_en ?? row.name_el ?? row.name : row.name_el ?? row.name_en ?? row.name;
        return String(value ?? "-");
      }),
      male: safeRows.map((row) => Number(row.male ?? 0)),
      female: safeRows.map((row) => Number(row.female ?? 0)),
    });
  }, [activeLang, data, sortGenderByRegionDescending]);

  const genderByEntryYearRows = React.useMemo(() => ((data?.gender_by_entry_year ?? []) as NamedCountRow[]), [data]);

  const genderByEntryYearByValue = React.useMemo(() => {
    const map = new Map<string, NamedCountRow>();
    genderByEntryYearRows.forEach((row) => {
      const value = String(row.entry_year ?? row.year ?? "");
      if (value) map.set(value, row);
    });
    return map;
  }, [genderByEntryYearRows]);

  const makeGenderDistributionPie = React.useCallback((selectedYear: string) => {
    if (selectedYear === "all") {
      return {
        labels: [t("table.male"), t("table.female")],
        values: [Number(data?.gender?.M ?? 0), Number(data?.gender?.F ?? 0)],
      };
    }

    const row = genderByEntryYearByValue.get(selectedYear) ?? null;
    return {
      labels: [t("table.male"), t("table.female")],
      values: [Number(row?.male ?? 0), Number(row?.female ?? 0)],
    };
  }, [data, genderByEntryYearByValue, t]);

  const busiestYearIndex = byYearRows.length ? byYearRows.findIndex((row) => row.value === Math.max(...byYearRows.map((item) => item.value))) : -1;
  const busiestYear = busiestYearIndex >= 0 ? byYearRows[busiestYearIndex].label : "-";
  const quietestYearIndex = byYearRows.length ? byYearRows.findIndex((row) => row.value === Math.min(...byYearRows.map((item) => item.value))) : -1;
  const quietestYear = quietestYearIndex >= 0 ? byYearRows[quietestYearIndex].label : "-";
  const busiestCityIndex = municipalities.values.length ? municipalities.values.findIndex((value) => value === Math.max(...municipalities.values)) : -1;
  const busiestCity = busiestCityIndex >= 0 ? municipalities.labels[busiestCityIndex] : "-";
  const busiestCityCount = busiestCityIndex >= 0 ? integerValue(municipalities.values[busiestCityIndex]) : "-";
  const abroadCount = Number(data?.abroad_count ?? 0);

  const compareYearOptions = React.useMemo(() => {
    return byYearRows
      .map((row) => Number(row.label))
      .filter((year) => Number.isFinite(year))
      .sort((a, b) => a - b)
      .map((year) => String(year));
  }, [byYearRows]);

  React.useEffect(() => {
    if (!compareYearOptions.length) return;
    const first = compareYearOptions[0];
    const last = compareYearOptions[compareYearOptions.length - 1];
    const middleIndex = Math.max(0, Math.floor((compareYearOptions.length - 1) / 2));
    const middle = compareYearOptions[middleIndex];
    const afterMiddle = compareYearOptions[Math.min(compareYearOptions.length - 1, middleIndex + 1)] ?? middle;

    setCompareAStart((current) => compareYearOptions.includes(current) ? current : first);
    setCompareAEnd((current) => compareYearOptions.includes(current) ? current : middle);
    setCompareBStart((current) => compareYearOptions.includes(current) ? current : afterMiddle);
    setCompareBEnd((current) => compareYearOptions.includes(current) ? current : last);
  }, [compareYearOptions]);

  const compareStats = React.useCallback((startValue: string, endValue: string) => {
    const start = Number(startValue);
    const end = Number(endValue);
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    const yearRows = byYearRows.filter((row) => {
      const year = Number(row.label);
      return Number.isFinite(year) && year >= min && year <= max;
    });
    const totalValue = yearRows.reduce((sum, row) => sum + Number(row.value ?? 0), 0);
    const yearSet = new Set(yearRows.map((row) => row.label));
    const genderRows = ((data?.gender_by_year ?? []) as NamedCountRow[]).filter((row) => yearSet.has(String(row.year ?? "")));
    const maleValue = genderRows.reduce((sum, row) => sum + Number(row.male ?? 0), 0);
    const femaleValue = genderRows.reduce((sum, row) => sum + Number(row.female ?? 0), 0);
    const abroadRows = ((data?.abroad_by_year ?? []) as any[]).filter((row) => yearSet.has(String(row.year ?? "")));
    const abroadValue = abroadRows.reduce((sum, row) => sum + Number(row.abroad ?? 0), 0);
    const avgGradeRows = ((data?.avg_grade_by_year ?? []) as NamedCountRow[]).filter((row) => yearSet.has(String(row.year ?? "")));
    const avgGradeWeighted = avgGradeRows.reduce((sum, row) => {
      const count = Number(yearRows.find((item) => item.label === String(row.year ?? ""))?.value ?? 0);
      return sum + Number(row.avg ?? 0) * count;
    }, 0);
    const avgGradeCount = avgGradeRows.reduce((sum, row) => sum + Number(yearRows.find((item) => item.label === String(row.year ?? ""))?.value ?? 0), 0);
    const topYear = yearRows.length ? yearRows.reduce((best, row) => Number(row.value) > Number(best.value) ? row : best, yearRows[0]) : null;
    const yearsCount = Number.isFinite(min) && Number.isFinite(max) ? Math.max(0, max - min + 1) : 0;
    const share = (value: number) => totalValue > 0 ? `${((value / totalValue) * 100).toFixed(1)}%` : "-";
    return {
      range: Number.isFinite(min) && Number.isFinite(max) ? `${min}–${max}` : "-",
      total: totalValue,
      male: maleValue,
      female: femaleValue,
      abroad: abroadValue,
      greece: Math.max(0, totalValue - abroadValue),
      avgGrade: avgGradeCount > 0 ? (avgGradeWeighted / avgGradeCount).toFixed(2) : "-",
      topYear: topYear?.label ?? "-",
      topYearCount: topYear ? Number(topYear.value ?? 0) : 0,
      yearsCount,
      annualAverage: yearsCount > 0 ? (totalValue / yearsCount).toFixed(1) : "-",
      maleShare: share(maleValue),
      femaleShare: share(femaleValue),
      abroadShare: share(abroadValue),
    };
  }, [byYearRows, data]);

  const compareA = React.useMemo(() => compareStats(compareAStart, compareAEnd), [compareAEnd, compareAStart, compareStats]);
  const compareB = React.useMemo(() => compareStats(compareBStart, compareBEnd), [compareBEnd, compareBStart, compareStats]);
  const compareDelta = React.useMemo(() => {
    const percent = (value: number, base: number) => base > 0 ? `${(((value - base) / base) * 100).toFixed(1)}%` : "-";
    const plainDelta = (nextValue: number | string, previousValue: number | string, digits = 1) => {
      const nextNumber = Number(nextValue);
      const previousNumber = Number(previousValue);
      if (!Number.isFinite(nextNumber) || !Number.isFinite(previousNumber)) return { value: "-", amount: 0 };
      const difference = nextNumber - previousNumber;
      return { value: `${difference >= 0 ? "+" : ""}${difference.toFixed(digits)}`, amount: difference };
    };
    const genderPercent = (value: number, totalValue: number) => totalValue > 0 ? (value / totalValue) * 100 : 0;
    const maleShareDifference = genderPercent(compareB.male, compareB.total) - genderPercent(compareA.male, compareA.total);
    const femaleShareDifference = genderPercent(compareB.female, compareB.total) - genderPercent(compareA.female, compareA.total);
    const abroadShareDifference = genderPercent(compareB.abroad, compareB.total) - genderPercent(compareA.abroad, compareA.total);
    return {
      total: compareB.total - compareA.total,
      totalPercent: percent(compareB.total, compareA.total),
      annualAverage: plainDelta(compareB.annualAverage, compareA.annualAverage),
      avgGrade: plainDelta(compareB.avgGrade, compareA.avgGrade, 2),
      gender: `${compareB.male - compareA.male >= 0 ? "+" : ""}${compareB.male - compareA.male} / ${compareB.female - compareA.female >= 0 ? "+" : ""}${compareB.female - compareA.female}`,
      genderAmount: compareB.total - compareA.total,
      greece: `${compareB.greece - compareA.greece >= 0 ? "+" : ""}${compareB.greece - compareA.greece} (${percent(compareB.greece, compareA.greece)})`,
      greeceAmount: compareB.greece - compareA.greece,
      male: `${maleShareDifference >= 0 ? "+" : ""}${maleShareDifference.toFixed(1)}%`,
      maleAmount: maleShareDifference,
      female: `${femaleShareDifference >= 0 ? "+" : ""}${femaleShareDifference.toFixed(1)}%`,
      femaleAmount: femaleShareDifference,
      abroad: `${abroadShareDifference >= 0 ? "+" : ""}${abroadShareDifference.toFixed(1)}%`,
      abroadAmount: abroadShareDifference,
      topYear: plainDelta(compareB.topYear, compareA.topYear, 0),
      yearsCount: plainDelta(compareB.yearsCount, compareA.yearsCount, 0),
    };
  }, [compareA, compareB]);

  const compareRows = React.useMemo(() => [
    { key: "total", label: t("compare.total"), a: String(compareA.total), b: String(compareB.total), aValue: compareA.total, bValue: compareB.total, deltaLabel: t("compare.totalChange"), delta: `${compareDelta.total >= 0 ? "+" : ""}${compareDelta.total} (${compareDelta.totalPercent})`, direction: compareDelta.total },
    { key: "annualAverage", label: t("compare.annualAverage"), a: String(compareA.annualAverage), b: String(compareB.annualAverage), aValue: Number(compareA.annualAverage), bValue: Number(compareB.annualAverage), deltaLabel: t("compare.annualAverageChange"), delta: compareDelta.annualAverage.value, direction: compareDelta.annualAverage.amount },
    { key: "avgGrade", label: t("compare.avgGrade"), a: String(compareA.avgGrade), b: String(compareB.avgGrade), aValue: Number(compareA.avgGrade), bValue: Number(compareB.avgGrade), deltaLabel: t("compare.avgGradeChange"), delta: compareDelta.avgGrade.value, direction: compareDelta.avgGrade.amount },
    { key: "male", label: t("compare.male"), a: String(compareA.male), b: String(compareB.male), aValue: compareA.male, bValue: compareB.male, deltaLabel: t("compare.maleChange"), delta: `${compareB.male - compareA.male >= 0 ? "+" : ""}${compareB.male - compareA.male}`, direction: compareB.male - compareA.male },
    { key: "female", label: t("compare.female"), a: String(compareA.female), b: String(compareB.female), aValue: compareA.female, bValue: compareB.female, deltaLabel: t("compare.femaleChange"), delta: `${compareB.female - compareA.female >= 0 ? "+" : ""}${compareB.female - compareA.female}`, direction: compareB.female - compareA.female },
    { key: "maleShare", label: t("compare.maleShare"), a: compareA.maleShare, b: compareB.maleShare, aValue: Number(String(compareA.maleShare).replace("%", "")), bValue: Number(String(compareB.maleShare).replace("%", "")), deltaLabel: t("compare.maleShareChange"), delta: compareDelta.male, direction: compareDelta.maleAmount },
    { key: "femaleShare", label: t("compare.femaleShare"), a: compareA.femaleShare, b: compareB.femaleShare, aValue: Number(String(compareA.femaleShare).replace("%", "")), bValue: Number(String(compareB.femaleShare).replace("%", "")), deltaLabel: t("compare.femaleShareChange"), delta: compareDelta.female, direction: compareDelta.femaleAmount },
    { key: "greece", label: t("compare.greece"), a: String(compareA.greece), b: String(compareB.greece), aValue: compareA.greece, bValue: compareB.greece, deltaLabel: t("compare.greeceChange"), delta: compareDelta.greece, direction: compareDelta.greeceAmount },
    { key: "abroad", label: t("compare.abroad"), a: `${compareA.abroad} (${compareA.abroadShare})`, b: `${compareB.abroad} (${compareB.abroadShare})`, aValue: compareA.abroad, bValue: compareB.abroad, deltaLabel: t("compare.abroadShareChange"), delta: compareDelta.abroad, direction: compareDelta.abroadAmount },
  ], [compareA, compareB, compareDelta, t]);

  const compareSelect = React.useCallback((value: string, onChange: (value: string) => void) => (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {compareYearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
    </select>
  ), [compareYearOptions]);

  const entryYearOptions = React.useMemo(() => {
    const yearOptions = genderByEntryYearRows
      .filter((row) => row.entry_year !== null && row.entry_year !== undefined)
      .map((row) => ({
        value: String(row.entry_year),
        label: String(row.entry_year),
      }));

    return [{ value: "all", label: t("actions.selectAllYears", { defaultValue: activeLang === "en" ? "All years" : "Όλα τα έτη" }) }, ...yearOptions];
  }, [activeLang, genderByEntryYearRows, t]);

  React.useEffect(() => {
    if (!entryYearOptions.length) return;
    setSelectedGenderDistributionYear((current) => entryYearOptions.some((option) => option.value === current) ? current : "all");
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

  const genderDistributionPie = React.useMemo(() => ({
    ...makeGenderDistributionPie(selectedGenderDistributionYear),
    control: makeGenderEntryYearSelect(selectedGenderDistributionYear, setSelectedGenderDistributionYear),
  }), [makeGenderDistributionPie, makeGenderEntryYearSelect, selectedGenderDistributionYear]);

  React.useEffect(() => {
    setSelectedExportGenderEntryYears((prev) => prev.filter((year) => entryYearOptions.some((option) => option.value === year)));
  }, [entryYearOptions]);

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

  function toggleExportGenderEntryYear(year: string) {
    setSelectedExportGenderEntryYears((prev) => prev.includes(year) ? prev.filter((item) => item !== year) : [...prev, year]);
  }

  function toggleAllExportGenderEntryYears() {
    setSelectedExportGenderEntryYears((prev) => prev.length === entryYearOptions.length ? [] : entryYearOptions.map((option) => option.value));
  }

  const exportFormatLabel = React.useMemo(() => {
    if (selectedExportFormat === "xlsx") return "Excel";
    if (selectedExportFormat === "csv") return "CSV";
    if (selectedExportFormat === "png") return "PNG";
    return "";
  }, [selectedExportFormat]);

  const defaultExportRanges = React.useCallback((): ExportGroupRanges => {
    const first = compareYearOptions[0] ?? "";
    const last = compareYearOptions[compareYearOptions.length - 1] ?? first;
    return {
      demographics: { from: first, to: last },
      academic: { from: first, to: last },
      geography: { from: first, to: last },
      compare: { from: first, to: last },
    };
  }, [compareYearOptions]);

  React.useEffect(() => {
    if (!compareYearOptions.length) return;
    setExportGroupRanges((current) => {
      const defaults = defaultExportRanges();
      const valid = new Set(compareYearOptions);
      const next = { ...current };
      (Object.keys(defaults) as StatisticsGroupKey[]).forEach((key) => {
        const range = next[key];
        next[key] = {
          from: valid.has(range.from) ? range.from : defaults[key].from,
          to: valid.has(range.to) ? range.to : defaults[key].to,
        };
      });
      return next;
    });
  }, [compareYearOptions, defaultExportRanges]);

  function changeExportGroupRange(groupKey: StatisticsGroupKey, field: keyof ExportGroupRange, value: string) {
    setExportGroupRanges((current) => ({
      ...current,
      [groupKey]: {
        ...current[groupKey],
        [field]: value,
      },
    }));
  }

  function normalizedExportRange(groupKey: StatisticsGroupKey) {
    const range = exportGroupRanges[groupKey] ?? defaultExportRanges()[groupKey];
    const from = Number(range.from);
    const to = Number(range.to);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return { from: range.from, to: range.to };
    return { from: String(Math.min(from, to)), to: String(Math.max(from, to)) };
  }

  function selectedExportRanges() {
    return {
      demographics: normalizedExportRange("demographics"),
      academic: normalizedExportRange("academic"),
      geography: normalizedExportRange("geography"),
      compare: normalizedExportRange("compare"),
    };
  }

  function compareFileRange() {
    const left = String(compareA.range || "").replace(/\s+/g, "");
    const right = String(compareB.range || "").replace(/\s+/g, "");
    return left && right ? `${left}_vs_${right}` : left || right || undefined;
  }

  function openExportSelection(format: "xlsx" | "csv" | "png") {
    void loadStatsGroup("academic").catch(() => {});
    void loadStatsGroup("geography").catch(() => {});
    const visibleYears = selectedGenderDistributionYear === "all" ? [] : [selectedGenderDistributionYear];
    setSelectedExportGenderEntryYears(format === "png" ? visibleYears : []);
    setSelectedChartIds([]);
    setExportPreviewData(null);
    setExportGroupRanges(defaultExportRanges());
    setSelectedExportFormat(format);
    setExportOpen(false);
  }

  function closeExportSelection() {
    setExportPreviewData(null);
    setSelectedExportFormat(null);
  }

  function buildStatisticsExportArgs(sourceData: any) {
    const sourceTotal = Number(sourceData?.total ?? total ?? 0);
    const sourceByYearRows = ((sourceData?.by_year ?? []) as any[]).map((row) => ({ label: String(row.year ?? "-"), value: Number(row.count ?? 0) }));
    const sourceBusiestYearIndex = sourceByYearRows.length ? sourceByYearRows.findIndex((row) => row.value === Math.max(...sourceByYearRows.map((item) => item.value))) : -1;
    const sourceBusiestYear = sourceBusiestYearIndex >= 0 ? sourceByYearRows[sourceBusiestYearIndex].label : busiestYear;
    const sourceMunicipalities = sortSeriesDescending(seriesFromRows(sourceData?.origin_municipality_distribution, { labelKey: "name" }));
    const sourceBusiestCityIndex = sourceMunicipalities.values.length ? sourceMunicipalities.values.findIndex((value) => value === Math.max(...sourceMunicipalities.values)) : -1;
    const sourceBusiestCity = sourceBusiestCityIndex >= 0 ? sourceMunicipalities.labels[sourceBusiestCityIndex] : busiestCity;

    return {
      data: sourceData,
      t,
      activeLang,
      total: sourceTotal,
      avgAge: numberValue(sourceData?.avg_age, 1),
      avgGrade: numberValue(sourceData?.avg_degree_grade, 2),
      earliestYear: numberValue(sourceData?.avg_years_to_degree, 1),
      busiestYear: sourceBusiestYear,
      busiestCity: sourceBusiestCity,
      selectedChartIds,
      exportRanges: selectedExportRanges(),
      compareFilenameRange: compareFileRange(),
      compare: {
        rangeALabel: t("compare.periodRange", { range: compareA.range }),
        rangeBLabel: t("compare.periodRange", { range: compareB.range }),
        changeLabel: activeLang === "en" ? "Change" : "Μεταβολή",
        sections: {
          compare: {
            name: compareExportLabel,
            rows: compareRows.map((row) => ({ metric: row.label, a: row.a, b: row.b, delta: row.delta })),
          },
        },
      },
    };
  }

  async function buildRangedExportSourceData() {
    const selectedGroups = chartGroups.filter((group) => group.charts.some((chart) => selectedChartIds.includes(chart.id)));
    const defaults = defaultExportRanges();
    let mergedData = { ...(data ?? {}) };

    for (const group of selectedGroups) {
      if (group.key === "compare") continue;
      const range = normalizedExportRange(group.key);
      const defaultRange = defaults[group.key];
      const usesDefaultRange = range.from === defaultRange.from && range.to === defaultRange.to;
      const groupData = usesDefaultRange
        ? data
        : await getPublicStats({ section: group.key, graduation_year_from: range.from, graduation_year_to: range.to });
      mergedData = { ...mergedData, ...(groupData ?? {}) };
    }

    return mergedData;
  }

  async function preparePngExportPreview(sourceData: any) {
    setExportPreviewData(sourceData);
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => window.setTimeout(resolve, 120));
  }

  const exportViewData = React.useMemo(() => {
    const sourceData = exportPreviewData ?? data;
    const sourceByYearRows = ((sourceData?.by_year ?? []) as any[]).map((r) => ({ label: String(r.year), value: Number(r.count) || 0 }));
    const sourceCountChartData = {
      labels: sourceByYearRows.map((r) => r.label),
      datasets: [
        buildLineDataset(
          t("sections.byYear", { defaultValue: "Πλήθος αποφοίτων ανά έτος" }),
          sourceByYearRows.map((r) => r.value),
          "#2563eb",
          "rgba(37, 99, 235, 0.28)"
        ),
      ],
    };
    const sourceGenderRows = ((sourceData?.gender_by_year ?? []) as any[]).map((r) => ({
      label: String(r.year),
      male: Number(r.male) || 0,
      female: Number(r.female) || 0,
    }));
    const sourceGenderChartData = {
      labels: sourceGenderRows.map((r) => r.label),
      datasets: [
        buildLineDataset(t("table.male", { defaultValue: "Άνδρες" }), sourceGenderRows.map((r) => r.male), "#3b82f6", "rgba(59, 130, 246, 0.22)", true, "male"),
        buildLineDataset(t("table.female", { defaultValue: "Γυναίκες" }), sourceGenderRows.map((r) => r.female), "#db2777", "rgba(219, 39, 119, 0.22)", true, "female"),
      ],
    };
    const sourceGenderEntryRows = ((sourceData?.gender_by_entry_year ?? []) as NamedCountRow[]);
    const sourceGenderEntryMap = new Map<string, NamedCountRow>();
    sourceGenderEntryRows.forEach((row) => {
      const value = String(row.entry_year ?? row.year ?? "");
      if (value) sourceGenderEntryMap.set(value, row);
    });
    const sourceGenderDistributionYear = selectedExportGenderEntryYears[0] ?? selectedGenderDistributionYear;
    const sourceGenderDistributionRow = sourceGenderDistributionYear === "all" ? null : sourceGenderEntryMap.get(sourceGenderDistributionYear) ?? null;
    const sourceGenderDistributionValues = sourceGenderDistributionRow
      ? [Number(sourceGenderDistributionRow.male ?? 0), Number(sourceGenderDistributionRow.female ?? 0)]
      : [Number(sourceData?.gender?.M ?? 0), Number(sourceData?.gender?.F ?? 0)];
    const rawYearsToDegreeDistribution = seriesFromRows(sourceData?.years_to_degree_distribution);
    const numericDurationLabels = rawYearsToDegreeDistribution.labels.map((label) => Number(label)).filter((value) => Number.isFinite(value));
    const sourceYearsToDegreeDistribution = numericDurationLabels.length
      ? (() => {
          const minYear = Math.min(...numericDurationLabels);
          const maxYear = Math.max(...numericDurationLabels);
          const valueMap = new Map<string, number>();
          rawYearsToDegreeDistribution.labels.forEach((label, index) => {
            valueMap.set(String(label), Number(rawYearsToDegreeDistribution.values[index] ?? 0));
          });
          const labels: string[] = [];
          const values: number[] = [];
          for (let year = minYear; year <= maxYear; year += 1) {
            labels.push(String(year));
            values.push(Number(valueMap.get(String(year)) ?? 0));
          }
          return { labels, values };
        })()
      : rawYearsToDegreeDistribution;
    const sourceGenderByRegionRows = Array.isArray(sourceData?.gender_by_region) ? sourceData.gender_by_region as NamedCountRow[] : [];
    const sourceGenderByMunicipalityRows = Array.isArray(sourceData?.gender_by_municipality) ? sourceData.gender_by_municipality as NamedCountRow[] : [];
    const sourceGenderByRegion = sortGenderByRegionDescending({
      labels: sourceGenderByRegionRows.map((row) => String(activeLang === "en" ? row.name_en ?? row.name_el ?? row.name : row.name_el ?? row.name_en ?? row.name ?? "-")),
      male: sourceGenderByRegionRows.map((row) => Number(row.male ?? 0)),
      female: sourceGenderByRegionRows.map((row) => Number(row.female ?? 0)),
    });
    const sourceGenderByMunicipality = sortGenderByRegionDescending({
      labels: sourceGenderByMunicipalityRows.map((row) => String(activeLang === "en" ? row.name_en ?? row.name_el ?? row.name : row.name_el ?? row.name_en ?? row.name ?? "-")),
      male: sourceGenderByMunicipalityRows.map((row) => Number(row.male ?? 0)),
      female: sourceGenderByMunicipalityRows.map((row) => Number(row.female ?? 0)),
    });
    const sourceAbroadByYearRows = Array.isArray(sourceData?.abroad_by_year) ? sourceData.abroad_by_year as NamedCountRow[] : [];
    return {
      countChartData: sourceCountChartData,
      genderChartData: sourceGenderChartData,
      entryYears: seriesFromRows(sourceData?.count_by_entry_year, { labelKey: "entry_year" }),
      birthYears: seriesFromRows(sourceData?.birth_year_distribution, { labelKey: "year" }),
      genderDistributionPie: {
        labels: [t("table.male"), t("table.female")],
        values: sourceGenderDistributionValues,
        control: null,
      },
      gradeBinsByGender: {
        labels: (Array.isArray(sourceData?.degree_grade_bins_by_gender) ? sourceData.degree_grade_bins_by_gender as NamedCountRow[] : []).map((row) => String(row.label ?? "-")),
        male: (Array.isArray(sourceData?.degree_grade_bins_by_gender) ? sourceData.degree_grade_bins_by_gender as NamedCountRow[] : []).map((row) => Number(row.male ?? 0)),
        female: (Array.isArray(sourceData?.degree_grade_bins_by_gender) ? sourceData.degree_grade_bins_by_gender as NamedCountRow[] : []).map((row) => Number(row.female ?? 0)),
      },
      abroadByYear: {
        labels: sourceAbroadByYearRows.map((row) => String(row.year ?? "-")),
        greece: sourceAbroadByYearRows.map((row: any) => Number(row.greece ?? 0)),
        abroad: sourceAbroadByYearRows.map((row: any) => Number(row.abroad ?? 0)),
      },
      yearsToDegreeByNomos: sortSeriesDescending(seriesFromRows(sourceData?.avg_years_to_degree_by_nomos, { labelKey: "name", valueKey: "avg_years" })),
      avgGradesByYear: seriesFromRows(sourceData?.avg_grade_by_year, { labelKey: "year", valueKey: "avg" }),
      avgGradesByRegion: sortSeriesDescending(seriesFromRows(sourceData?.avg_grade_by_region, { labelKey: "name", valueKey: "avg" })),
      gradeBins: seriesFromRows(sourceData?.degree_grade_bins),
      yearsToDegree: seriesFromRows(sourceData?.avg_years_to_degree_by_entry_year, { labelKey: "entry_year", valueKey: "avg_years" }),
      yearsToDegreeDistribution: sourceYearsToDegreeDistribution,
      yearsToDegreeByRegion: sortSeriesDescending(seriesFromRows(sourceData?.avg_years_to_degree_by_region, { labelKey: "name", valueKey: "avg_years" })),
      regions: sortSeriesDescending(seriesFromRows(sourceData?.origin_region_distribution, { labelKey: "name" })),
      genderByRegion: sourceGenderByRegion,
      genderByMunicipality: sourceGenderByMunicipality,
      municipalities: sortSeriesDescending(seriesFromRows(sourceData?.origin_municipality_distribution, { labelKey: "name" })),
      countries: sortSeriesDescending(seriesFromRows(sourceData?.origin_country_distribution, { labelKey: "name" })),
      total: Number(sourceData?.total ?? 0),
      abroadCount: Number(sourceData?.abroad_count ?? 0),
    };
  }, [activeLang, data, exportPreviewData, selectedExportGenderEntryYears, selectedGenderDistributionYear, seriesFromRows, sortGenderByRegionDescending, sortSeriesDescending, t]);

  async function exportSelectedChartsAsPng() {
    if (!selectedChartIds.length) return;

    const exportRoot = exportSurfaceRef.current;
    const visibleRoot = pageRef.current;
    if (!exportRoot && !visibleRoot) return;

    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => window.setTimeout(resolve, 260));

    const chartMeta = new Map<StatisticsChartId, { groupKey: StatisticsGroupKey; groupLabel: string; chartLabel: string }>(
      chartGroups.flatMap((group) => group.charts.map((chart) => [chart.id, { groupKey: group.key, groupLabel: group.label, chartLabel: chart.label }] as [StatisticsChartId, { groupKey: StatisticsGroupKey; groupLabel: string; chartLabel: string }]))
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
        const filename = buildStatisticsPngFilename(
          buildStatisticsExportArgs(exportPreviewData ?? data),
          snapshot.chartId,
          ["alupla", "statistics", meta?.groupLabel ?? group.label, meta?.chartLabel ?? snapshot.chartId],
          group.key,
        );
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
        const filename = buildStatisticsPngFilename(
          buildStatisticsExportArgs(exportPreviewData ?? data),
          null,
          ["alupla", "statistics", group.label, totalPages > 1 ? `page_${pageNumber}` : null],
          group.key,
        );
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
      await Promise.all([loadStatsGroup("academic"), loadStatsGroup("geography")]);
      const rangedSourceData = await buildRangedExportSourceData();
      const rangedExportArgs = buildStatisticsExportArgs(rangedSourceData);

      if (selectedExportFormat === "xlsx") {
        exportStatisticsWorkbookFile(rangedExportArgs, buildStatisticsExportFilename(rangedExportArgs, "xlsx"));
      } else if (selectedExportFormat === "csv") {
        exportStatisticsCsvFile(rangedExportArgs, buildStatisticsExportFilename(rangedExportArgs, "csv"));
      } else {
        await preparePngExportPreview(rangedSourceData);
        await exportSelectedChartsAsPng();
      }
    } finally {
      const exportType = selectedExportFormat;
      setExportPreviewData(null);
      setSelectedExportFormat(null);
      setExportOpen(false);

      try {
        await logPublicExport("statistics_export", exportType);
      } catch {}
    }
  }


  const renderCompareExportCard = (chartId: StatisticsChartId, title: string, rows: typeof compareRows) => (
    <div className="card statistics-compare-card" data-stat-chart-card="true" data-export-chart-id={chartId}>
      <div className="statistics-compare-head">
        <div className="statistics-compare-title">
          <h3>{title}</h3>
          <p>{t("compare.periodRange", { range: compareA.range })} · {t("compare.periodRange", { range: compareB.range })}</p>
        </div>
      </div>
      <div className="statistics-compare-rows">
        {rows.map((row) => (
          <div className="statistics-compare-row" key={row.key}>
            <div className="statistics-compare-metric statistics-compare-row-metric">
              <strong>{row.a}</strong>
              <span>{row.label}</span>
            </div>
            <div className="statistics-compare-arrow" aria-hidden="true">→</div>
            <div className="statistics-compare-metric statistics-compare-row-metric">
              <strong>{row.b}</strong>
              <span>{row.label}</span>
            </div>
            <div className={`statistics-compare-change ${row.direction > 0 ? "is-up" : row.direction < 0 ? "is-down" : "is-neutral"}`}>
              <strong><span className="statistics-compare-change-arrow" aria-hidden="true">{row.direction > 0 ? "↑" : row.direction < 0 ? "↓" : "–"}</span>{row.delta}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (err && !data) return <div className="card">{err}</div>;

  const loadingLabel = t("loading");
  const loadingLabelStyle = { "--statistics-loading-label": JSON.stringify(loadingLabel) } as React.CSSProperties;
  const activeGroupLoading = loading || (activeGroup === "compare" ? !loadedGroups.academic || !loadedGroups.geography : activeGroup !== "demographics" && !loadedGroups[activeGroup]);

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

        {activeGroup === "compare" ? (
          <div className="card statistics-compare-card">
            <div className="statistics-compare-head">
              <div className="statistics-compare-title">
                <h3>{t("compare.title")}</h3>
                <p>{t("compare.subtitle")}</p>
              </div>
            </div>
            <div className="statistics-compare-ranges">
              <div className="statistics-compare-range-control">
                <span className="statistics-compare-panel-title">{t("compare.periodA")}</span>
                <span className="statistics-compare-selects">
                  {compareSelect(compareAStart, setCompareAStart)}
                  <span>–</span>
                  {compareSelect(compareAEnd, setCompareAEnd)}
                </span>
              </div>
              <div className="statistics-compare-range-control">
                <span className="statistics-compare-panel-title">{t("compare.periodB")}</span>
                <span className="statistics-compare-selects">
                  {compareSelect(compareBStart, setCompareBStart)}
                  <span>–</span>
                  {compareSelect(compareBEnd, setCompareBEnd)}
                </span>
              </div>
            </div>
            <div className="statistics-compare-rows">
              {compareRows.map((row) => (
                <div className="statistics-compare-row" key={row.key}>
                  <div className="statistics-compare-metric statistics-compare-row-metric">
                    <strong>{row.a}</strong>
                    <span>{row.label}</span>
                  </div>
                  <div className="statistics-compare-arrow" aria-hidden="true">→</div>
                  <div className="statistics-compare-metric statistics-compare-row-metric">
                    <strong>{row.b}</strong>
                    <span>{row.label}</span>
                  </div>
                  <div className={`statistics-compare-change ${row.direction > 0 ? "is-up" : row.direction < 0 ? "is-down" : "is-neutral"}`}>
                    <strong><span className="statistics-compare-change-arrow" aria-hidden="true">{row.direction > 0 ? "↑" : row.direction < 0 ? "↓" : "–"}</span>{row.delta}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {activeGroup !== "compare" ? (
        <div className={`mobile-summary-panel${mobileSummaryOpen ? " open" : ""}`}>
          <StatisticsSummaryCards
            t={t}
            total={total}
            maleCount={maleCount}
            femaleCount={femaleCount}
            avgAge={avgAge}
            minAge={minAge}
            maxAge={maxAge}
            avgGrade={avgGrade}
            minGrade={minGrade}
            maxGrade={maxGrade}
            avgStudyYears={avgStudyYears}
            minStudyYears={minStudyYears}
            maxStudyYears={maxStudyYears}
            busiestYear={busiestYear}
            quietestYear={quietestYear}
            busiestCity={busiestCity}
            busiestCityCount={busiestCityCount}
            sectionWrapStyle={sectionWrapStyle}
            metricGridStyle={metricGridStyle}
            metricTopRowStyle={metricTopRowStyle}
            metricBottomRowStyle={metricBottomRowStyle}
            loading={activeGroupLoading}
          />
        </div>
        ) : null}

        {activeGroup !== "compare" ? (
        <div className={activeGroupLoading ? "statistics-chart-loading-region" : undefined} style={activeGroupLoading ? loadingLabelStyle : undefined}>
          {activeGroup === "demographics" ? (
          <DemographicsCharts
            t={t}
            cardInnerStyle={cardInnerStyle}
            compactTopbarStyle={compactTopbarStyle}
            genderChartData={genderChartData}
            genderChartOptions={genderChartOptions}
            countChartData={countChartData}
            countChartOptions={countChartOptions}
            entryYears={entryYears}
            birthYears={birthYears}
            genderDistributionPie={genderDistributionPie}
            gradeBinsByGender={gradeBinsByGender}
            abroadByYear={abroadByYear}
            yearsToDegreeByNomos={yearsToDegreeByNomos}
            avgGradesByYear={avgGradesByYear}
            avgGradesByRegion={avgGradesByRegion}
            gradeBins={gradeBins}
            yearsToDegree={yearsToDegree}
            yearsToDegreeDistribution={yearsToDegreeDistribution}
            yearsToDegreeByRegion={yearsToDegreeByRegion}
            regions={regions}
            genderByRegion={genderByRegion}
            genderByMunicipality={genderByMunicipality}
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
            entryYears={entryYears}
            birthYears={birthYears}
            genderDistributionPie={genderDistributionPie}
            gradeBinsByGender={gradeBinsByGender}
            abroadByYear={abroadByYear}
            yearsToDegreeByNomos={yearsToDegreeByNomos}
            avgGradesByYear={avgGradesByYear}
            avgGradesByRegion={avgGradesByRegion}
            gradeBins={gradeBins}
            yearsToDegree={yearsToDegree}
            yearsToDegreeDistribution={yearsToDegreeDistribution}
            yearsToDegreeByRegion={yearsToDegreeByRegion}
            regions={regions}
            genderByRegion={genderByRegion}
            genderByMunicipality={genderByMunicipality}
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
            entryYears={entryYears}
            birthYears={birthYears}
            genderDistributionPie={genderDistributionPie}
            gradeBinsByGender={gradeBinsByGender}
            abroadByYear={abroadByYear}
            yearsToDegreeByNomos={yearsToDegreeByNomos}
            avgGradesByYear={avgGradesByYear}
            avgGradesByRegion={avgGradesByRegion}
            gradeBins={gradeBins}
            yearsToDegree={yearsToDegree}
            yearsToDegreeDistribution={yearsToDegreeDistribution}
            yearsToDegreeByRegion={yearsToDegreeByRegion}
            regions={regions}
            genderByRegion={genderByRegion}
            genderByMunicipality={genderByMunicipality}
            municipalities={municipalities}
            countries={countries}
            total={total}
            abroadCount={abroadCount}
          />
          ) : null}
        </div>
        ) : null}
      </div>

      {selectedExportFormat ? (
        <StatisticsExportSelectionModal
          t={t}
          exportFormatLabel={exportFormatLabel}
          chartGroups={chartGroups}
          selectedChartIds={selectedChartIds}
          allChartsSelected={allChartsSelected}
          yearOptions={compareYearOptions}
          groupRanges={exportGroupRanges}
          selectionRowStyle={selectionRowStyle}
          selectionCheckboxStyle={selectionCheckboxStyle}
          onClose={closeExportSelection}
          onToggleAll={toggleAllCharts}
          onToggleGroup={toggleGroupCharts}
          onToggleChart={toggleSingleChart}
          onChangeGroupRange={changeExportGroupRange}
          onConfirm={() => void handleExportAction()}
          isPngExport={selectedExportFormat === "png"}
          genderEntryYearOptions={entryYearOptions}
          selectedGenderEntryYears={selectedExportGenderEntryYears}
          onToggleGenderEntryYear={toggleExportGenderEntryYear}
          onToggleAllGenderEntryYears={toggleAllExportGenderEntryYears}
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
          genderChartData={exportViewData.genderChartData}
          genderChartOptions={genderChartOptions}
          countChartData={exportViewData.countChartData}
          countChartOptions={countChartOptions}
          entryYears={exportViewData.entryYears}
          birthYears={exportViewData.birthYears}
          genderDistributionPie={exportViewData.genderDistributionPie}
          gradeBinsByGender={exportViewData.gradeBinsByGender}
          abroadByYear={exportViewData.abroadByYear}
          yearsToDegreeByNomos={exportViewData.yearsToDegreeByNomos}
          avgGradesByYear={exportViewData.avgGradesByYear}
          avgGradesByRegion={exportViewData.avgGradesByRegion}
          gradeBins={exportViewData.gradeBins}
          yearsToDegree={exportViewData.yearsToDegree}
          yearsToDegreeDistribution={exportViewData.yearsToDegreeDistribution}
          yearsToDegreeByRegion={exportViewData.yearsToDegreeByRegion}
          regions={exportViewData.regions}
          genderByRegion={exportViewData.genderByRegion}
          genderByMunicipality={exportViewData.genderByMunicipality}
          municipalities={exportViewData.municipalities}
          countries={exportViewData.countries}
          total={exportViewData.total}
          abroadCount={exportViewData.abroadCount}
          exportMode
        />
        {renderCompareExportCard("compare", compareExportLabel, compareRows)}
        </div>
      ) : null}
    </>
  );
}
