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
import { toggleAllChartsSelection, toggleChartGroupSelection, toggleChartSelection } from "./statistics/exportSelection";
import { localizedCityRecordName, localizedCountryRecordName } from "./map/markers";
import { StatisticsPageView } from "./statistics/StatisticsPageView";
import { useStatisticsChartData } from "./statistics/useStatisticsChartData";

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
  avg_age?: number | null;
  year?: number | null;
  entry_year?: number | null;
  male?: number | null;
  female?: number | null;
};

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
type ExportCompareRanges = { a: ExportGroupRange; b: ExportGroupRange };
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

  const statisticsPlaceName = React.useCallback((row: NamedCountRow, placeKind: "city" | "country") => {
    const language = activeLang === "en" ? "en" : "gr";
    if (placeKind === "city") {
      return localizedCityRecordName({ city_name: row.name, city_name_el: row.name_el, city_name_en: row.name_en }, language) || "-";
    }
    return localizedCountryRecordName({ country_name: row.name, country_name_el: row.name_el, country_name_en: row.name_en }, language) || "-";
  }, [activeLang]);

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
  const [exportCompareRanges, setExportCompareRanges] = React.useState<ExportCompareRanges>({
    a: { from: "", to: "" },
    b: { from: "", to: "" },
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

  const {
    total, numberValue, seriesFromRows, sortSeriesDescending, reorderRegionMetricSeries,
    sortGenderByRegionDescending, byYearRows, countChartData, countChartOptions, genderChartData,
    genderChartOptions, gradeBinsByGender, entryYears, birthYears, avgGradesByYear, avgGradesByRegion,
    gradeBins, regions, municipalities, countries, abroadByYear, yearsToDegreeByNomos, yearsToDegree,
    yearsToDegreeByRegion, yearsToDegreeDistribution, genderByRegion, genderByMunicipality,
    genderByEntryYearRows, makeGenderDistributionPie, busiestYear, quietestYear, busiestCity,
    busiestCityCount, abroadCount, avgAge, minAge, maxAge, avgGrade, minGrade, maxGrade, avgStudyYears,
    minStudyYears, maxStudyYears, maleCount, femaleCount,
  } = useStatisticsChartData({ data, t, activeLang, statisticsPlaceName });

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

  const compareStatsFromData = React.useCallback((sourceData: any, startValue: string, endValue: string) => {
    const start = Number(startValue);
    const end = Number(endValue);
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    const sourceByYearRows = ((sourceData?.by_year ?? []) as NamedCountRow[]).map((row) => ({ label: String(row.year ?? "-"), value: Number(row.count ?? 0) }));
    const yearRows = sourceByYearRows.filter((row) => {
      const year = Number(row.label);
      return Number.isFinite(year) && year >= min && year <= max;
    });
    const totalValue = yearRows.reduce((sum, row) => sum + Number(row.value ?? 0), 0);
    const yearSet = new Set(yearRows.map((row) => row.label));
    const genderRows = ((sourceData?.gender_by_year ?? []) as NamedCountRow[]).filter((row) => yearSet.has(String(row.year ?? "")));
    const maleValue = genderRows.reduce((sum, row) => sum + Number(row.male ?? 0), 0);
    const femaleValue = genderRows.reduce((sum, row) => sum + Number(row.female ?? 0), 0);
    const abroadRows = ((sourceData?.abroad_by_year ?? []) as any[]).filter((row) => yearSet.has(String(row.year ?? "")));
    const abroadValue = abroadRows.reduce((sum, row) => sum + Number(row.abroad ?? 0), 0);
    const avgGradeRows = ((sourceData?.avg_grade_by_year ?? []) as NamedCountRow[]).filter((row) => yearSet.has(String(row.year ?? "")));
    const avgGradeWeighted = avgGradeRows.reduce((sum, row) => {
      const count = Number(yearRows.find((item) => item.label === String(row.year ?? ""))?.value ?? 0);
      return sum + Number(row.avg ?? 0) * count;
    }, 0);
    const avgGradeCount = avgGradeRows.reduce((sum, row) => sum + Number(yearRows.find((item) => item.label === String(row.year ?? ""))?.value ?? 0), 0);
    const weightedAverage = (rows: NamedCountRow[], valueKey: "avg_age" | "avg_years", digits: number) => {
      const filteredRows = rows.filter((row) => yearSet.has(String(row.year ?? "")));
      const weight = filteredRows.reduce((sum, row) => sum + Number(row.count ?? 0), 0);
      if (weight <= 0) return "-";
      const totalValue = filteredRows.reduce((sum, row) => sum + Number(row[valueKey] ?? 0) * Number(row.count ?? 0), 0);
      return (totalValue / weight).toFixed(digits);
    };
    const avgAgeByYearRows = (sourceData?.avg_age_by_year ?? []) as NamedCountRow[];
    const avgStudyYearsByYearRows = (sourceData?.avg_years_to_degree_by_graduation_year ?? []) as NamedCountRow[];
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
      avgStudyYears: weightedAverage(avgStudyYearsByYearRows, "avg_years", 1),
      avgGraduationAge: weightedAverage(avgAgeByYearRows, "avg_age", 1),
      topYear: topYear?.label ?? "-",
      topYearCount: topYear ? Number(topYear.value ?? 0) : 0,
      topYearDisplay: topYear ? `${topYear.label} (${Number(topYear.value ?? 0)})` : "-",
      yearsCount,
      annualAverage: yearsCount > 0 ? (totalValue / yearsCount).toFixed(1) : "-",
      maleShare: share(maleValue),
      femaleShare: share(femaleValue),
      abroadShare: share(abroadValue),
    };
  }, []);

  const compareStats = React.useCallback((startValue: string, endValue: string) => compareStatsFromData(data, startValue, endValue), [compareStatsFromData, data]);

  const compareA = React.useMemo(() => compareStats(compareAStart, compareAEnd), [compareAEnd, compareAStart, compareStats]);
  const compareB = React.useMemo(() => compareStats(compareBStart, compareBEnd), [compareBEnd, compareBStart, compareStats]);

  const buildCompareRows = React.useCallback((firstRange: any, secondRange: any) => {
    const percent = (value: number, base: number) => base > 0 ? `${(((value - base) / base) * 100).toFixed(1)}%` : "-";
    const plainDelta = (nextValue: number | string, previousValue: number | string, digits = 1) => {
      const nextNumber = Number(nextValue);
      const previousNumber = Number(previousValue);
      if (!Number.isFinite(nextNumber) || !Number.isFinite(previousNumber)) return { value: "-", amount: 0 };
      const difference = nextNumber - previousNumber;
      return { value: `${difference >= 0 ? "+" : ""}${difference.toFixed(digits)}`, amount: difference };
    };
    const genderPercent = (value: number, totalValue: number) => totalValue > 0 ? (value / totalValue) * 100 : 0;
    const maleShareDifference = genderPercent(secondRange.male, secondRange.total) - genderPercent(firstRange.male, firstRange.total);
    const femaleShareDifference = genderPercent(secondRange.female, secondRange.total) - genderPercent(firstRange.female, firstRange.total);
    const abroadShareDifference = genderPercent(secondRange.abroad, secondRange.total) - genderPercent(firstRange.abroad, firstRange.total);
    const delta = {
      total: secondRange.total - firstRange.total,
      totalPercent: percent(secondRange.total, firstRange.total),
      annualAverage: plainDelta(secondRange.annualAverage, firstRange.annualAverage),
      avgGrade: plainDelta(secondRange.avgGrade, firstRange.avgGrade, 2),
      avgStudyYears: plainDelta(secondRange.avgStudyYears, firstRange.avgStudyYears),
      avgGraduationAge: plainDelta(secondRange.avgGraduationAge, firstRange.avgGraduationAge),
      topYearCount: plainDelta(secondRange.topYearCount, firstRange.topYearCount, 0),
      greece: `${secondRange.greece - firstRange.greece >= 0 ? "+" : ""}${secondRange.greece - firstRange.greece} (${percent(secondRange.greece, firstRange.greece)})`,
      greeceAmount: secondRange.greece - firstRange.greece,
      male: `${maleShareDifference >= 0 ? "+" : ""}${maleShareDifference.toFixed(1)}%`,
      maleAmount: maleShareDifference,
      female: `${femaleShareDifference >= 0 ? "+" : ""}${femaleShareDifference.toFixed(1)}%`,
      femaleAmount: femaleShareDifference,
      abroad: `${abroadShareDifference >= 0 ? "+" : ""}${abroadShareDifference.toFixed(1)}%`,
      abroadAmount: abroadShareDifference,
    };

    return [
      { key: "total", label: t("compare.total"), a: String(firstRange.total), b: String(secondRange.total), aValue: firstRange.total, bValue: secondRange.total, deltaLabel: t("compare.totalChange"), delta: `${delta.total >= 0 ? "+" : ""}${delta.total} (${delta.totalPercent})`, deltaValue: `${delta.total >= 0 ? "+" : ""}${delta.total}`, deltaPercent: delta.totalPercent, direction: delta.total },
      { key: "annualAverage", label: t("compare.annualAverage"), a: String(firstRange.annualAverage), b: String(secondRange.annualAverage), aValue: Number(firstRange.annualAverage), bValue: Number(secondRange.annualAverage), deltaLabel: t("compare.annualAverageChange"), delta: delta.annualAverage.value, deltaValue: delta.annualAverage.value, deltaPercent: percent(Number(secondRange.annualAverage), Number(firstRange.annualAverage)), direction: delta.annualAverage.amount },
      { key: "avgStudyYears", label: t("compare.avgStudyYears"), a: String(firstRange.avgStudyYears), b: String(secondRange.avgStudyYears), aValue: Number(firstRange.avgStudyYears), bValue: Number(secondRange.avgStudyYears), deltaLabel: t("compare.avgStudyYearsChange"), delta: delta.avgStudyYears.value, deltaValue: delta.avgStudyYears.value, deltaPercent: percent(Number(secondRange.avgStudyYears), Number(firstRange.avgStudyYears)), direction: delta.avgStudyYears.amount },
      { key: "avgGraduationAge", label: t("compare.avgGraduationAge"), a: String(firstRange.avgGraduationAge), b: String(secondRange.avgGraduationAge), aValue: Number(firstRange.avgGraduationAge), bValue: Number(secondRange.avgGraduationAge), deltaLabel: t("compare.avgGraduationAgeChange"), delta: delta.avgGraduationAge.value, deltaValue: delta.avgGraduationAge.value, deltaPercent: percent(Number(secondRange.avgGraduationAge), Number(firstRange.avgGraduationAge)), direction: delta.avgGraduationAge.amount },
      { key: "avgGrade", label: t("compare.avgGrade"), a: String(firstRange.avgGrade), b: String(secondRange.avgGrade), aValue: Number(firstRange.avgGrade), bValue: Number(secondRange.avgGrade), deltaLabel: t("compare.avgGradeChange"), delta: delta.avgGrade.value, deltaValue: delta.avgGrade.value, deltaPercent: percent(Number(secondRange.avgGrade), Number(firstRange.avgGrade)), direction: delta.avgGrade.amount },
      { key: "topYear", label: t("compare.topYear"), a: firstRange.topYearDisplay, b: secondRange.topYearDisplay, aValue: firstRange.topYearCount, bValue: secondRange.topYearCount, deltaLabel: t("compare.topYearChange"), delta: delta.topYearCount.value, deltaValue: delta.topYearCount.value, deltaPercent: percent(secondRange.topYearCount, firstRange.topYearCount), direction: delta.topYearCount.amount },
      { key: "male", label: t("compare.male"), a: String(firstRange.male), b: String(secondRange.male), aValue: firstRange.male, bValue: secondRange.male, deltaLabel: t("compare.maleChange"), delta: `${secondRange.male - firstRange.male >= 0 ? "+" : ""}${secondRange.male - firstRange.male}`, deltaValue: `${secondRange.male - firstRange.male >= 0 ? "+" : ""}${secondRange.male - firstRange.male}`, deltaPercent: percent(secondRange.male, firstRange.male), direction: secondRange.male - firstRange.male },
      { key: "female", label: t("compare.female"), a: String(firstRange.female), b: String(secondRange.female), aValue: firstRange.female, bValue: secondRange.female, deltaLabel: t("compare.femaleChange"), delta: `${secondRange.female - firstRange.female >= 0 ? "+" : ""}${secondRange.female - firstRange.female}`, deltaValue: `${secondRange.female - firstRange.female >= 0 ? "+" : ""}${secondRange.female - firstRange.female}`, deltaPercent: percent(secondRange.female, firstRange.female), direction: secondRange.female - firstRange.female },
      { key: "maleShare", label: t("compare.maleShare"), a: firstRange.maleShare, b: secondRange.maleShare, aValue: Number(String(firstRange.maleShare).replace("%", "")), bValue: Number(String(secondRange.maleShare).replace("%", "")), deltaLabel: t("compare.maleShareChange"), delta: delta.male, deltaValue: delta.male, direction: delta.maleAmount },
      { key: "femaleShare", label: t("compare.femaleShare"), a: firstRange.femaleShare, b: secondRange.femaleShare, aValue: Number(String(firstRange.femaleShare).replace("%", "")), bValue: Number(String(secondRange.femaleShare).replace("%", "")), deltaLabel: t("compare.femaleShareChange"), delta: delta.female, deltaValue: delta.female, direction: delta.femaleAmount },
      { key: "greece", label: t("compare.greece"), a: String(firstRange.greece), b: String(secondRange.greece), aValue: firstRange.greece, bValue: secondRange.greece, deltaLabel: t("compare.greeceChange"), delta: delta.greece, deltaValue: `${delta.greeceAmount >= 0 ? "+" : ""}${delta.greeceAmount}`, deltaPercent: percent(secondRange.greece, firstRange.greece), direction: delta.greeceAmount },
      { key: "abroad", label: t("compare.abroad"), a: `${firstRange.abroad} (${firstRange.abroadShare})`, b: `${secondRange.abroad} (${secondRange.abroadShare})`, aValue: firstRange.abroad, bValue: secondRange.abroad, deltaLabel: t("compare.abroadShareChange"), delta: delta.abroad, deltaValue: delta.abroad, direction: delta.abroadAmount },
    ];
  }, [t]);

  const compareRows = React.useMemo(() => buildCompareRows(compareA, compareB), [buildCompareRows, compareA, compareB]);
  const exportCompareA = React.useMemo(() => compareStats(exportCompareRanges.a.from, exportCompareRanges.a.to), [compareStats, exportCompareRanges.a.from, exportCompareRanges.a.to]);
  const exportCompareB = React.useMemo(() => compareStats(exportCompareRanges.b.from, exportCompareRanges.b.to), [compareStats, exportCompareRanges.b.from, exportCompareRanges.b.to]);
  const exportCompareRows = React.useMemo(() => buildCompareRows(exportCompareA, exportCompareB), [buildCompareRows, exportCompareA, exportCompareB]);

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

  const defaultExportCompareRanges = React.useCallback((): ExportCompareRanges => {
    const first = compareYearOptions[0] ?? "";
    const last = compareYearOptions[compareYearOptions.length - 1] ?? first;
    const middleIndex = Math.max(0, Math.floor((compareYearOptions.length - 1) / 2));
    const middle = compareYearOptions[middleIndex] ?? first;
    const afterMiddle = compareYearOptions[Math.min(compareYearOptions.length - 1, middleIndex + 1)] ?? middle;
    return {
      a: { from: first, to: middle },
      b: { from: afterMiddle, to: last },
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
    setExportCompareRanges((current) => {
      const defaults = defaultExportCompareRanges();
      const valid = new Set(compareYearOptions);
      return {
        a: {
          from: valid.has(current.a.from) ? current.a.from : defaults.a.from,
          to: valid.has(current.a.to) ? current.a.to : defaults.a.to,
        },
        b: {
          from: valid.has(current.b.from) ? current.b.from : defaults.b.from,
          to: valid.has(current.b.to) ? current.b.to : defaults.b.to,
        },
      };
    });
  }, [compareYearOptions, defaultExportCompareRanges, defaultExportRanges]);

  function changeExportGroupRange(groupKey: StatisticsGroupKey, field: keyof ExportGroupRange, value: string) {
    setExportGroupRanges((current) => ({
      ...current,
      [groupKey]: {
        ...current[groupKey],
        [field]: value,
      },
    }));
  }

  function changeExportCompareRange(period: keyof ExportCompareRanges, field: keyof ExportGroupRange, value: string) {
    setExportCompareRanges((current) => ({
      ...current,
      [period]: {
        ...current[period],
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

  function compareFileRange(firstRange = exportCompareA, secondRange = exportCompareB) {
    const left = String(firstRange.range || "").replace(/\s+/g, "");
    const right = String(secondRange.range || "").replace(/\s+/g, "");
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
    setExportCompareRanges(defaultExportCompareRanges());
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
    const sourceMunicipalities = sortSeriesDescending(seriesFromRows(sourceData?.origin_municipality_distribution, { labelKey: "name", placeKind: "city" }));
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
      compareFilenameRange: compareFileRange(compareStatsFromData(sourceData, exportCompareRanges.a.from, exportCompareRanges.a.to), compareStatsFromData(sourceData, exportCompareRanges.b.from, exportCompareRanges.b.to)),
      compare: (() => {
        const sourceCompareA = compareStatsFromData(sourceData, exportCompareRanges.a.from, exportCompareRanges.a.to);
        const sourceCompareB = compareStatsFromData(sourceData, exportCompareRanges.b.from, exportCompareRanges.b.to);
        const sourceCompareRows = buildCompareRows(sourceCompareA, sourceCompareB);
        return {
          rangeALabel: t("compare.periodRange", { range: sourceCompareA.range }),
          rangeBLabel: t("compare.periodRange", { range: sourceCompareB.range }),
          changeLabel: activeLang === "en" ? "Change" : "Μεταβολή",
          section: {
            name: compareExportLabel,
            rows: sourceCompareRows.map((row) => ({ metric: row.label, a: row.a, b: row.b, delta: row.delta })),
          },
        };
      })(),
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
      labels: sourceGenderByMunicipalityRows.map((row) => statisticsPlaceName(row, "city")),
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
      avgGradesByRegion: reorderRegionMetricSeries(seriesFromRows(sourceData?.avg_grade_by_region, { labelKey: "name", valueKey: "avg" })),
      gradeBins: seriesFromRows(sourceData?.degree_grade_bins),
      yearsToDegree: seriesFromRows(sourceData?.avg_years_to_degree_by_entry_year, { labelKey: "entry_year", valueKey: "avg_years" }),
      yearsToDegreeDistribution: sourceYearsToDegreeDistribution,
      yearsToDegreeByRegion: reorderRegionMetricSeries(seriesFromRows(sourceData?.avg_years_to_degree_by_region, { labelKey: "name", valueKey: "avg_years" })),
      regions: sortSeriesDescending(seriesFromRows(sourceData?.origin_region_distribution, { labelKey: "name" })),
      genderByRegion: sourceGenderByRegion,
      genderByMunicipality: sourceGenderByMunicipality,
      municipalities: sortSeriesDescending(seriesFromRows(sourceData?.origin_municipality_distribution, { labelKey: "name", placeKind: "city" })),
      countries: sortSeriesDescending(seriesFromRows(sourceData?.origin_country_distribution, { labelKey: "name", placeKind: "country" })),
      total: Number(sourceData?.total ?? 0),
      abroadCount: Number(sourceData?.abroad_count ?? 0),
    };
  }, [activeLang, data, exportPreviewData, reorderRegionMetricSeries, selectedExportGenderEntryYears, selectedGenderDistributionYear, seriesFromRows, sortGenderByRegionDescending, sortSeriesDescending, statisticsPlaceName, t]);

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

    const exportedChartIds = [...selectedChartIds];
    const exportedGroupKeys = chartGroups
      .filter((group) => group.charts.some((chart) => exportedChartIds.includes(chart.id)))
      .map((group) => group.key);

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
        await logPublicExport("statistics_export", exportType, {
          statistics_groups: exportedGroupKeys,
        });
      } catch {}
    }
  }


  const viewProps = {
    abroadByYear, abroadCount, activeGroup, allChartsSelected, avgAge, avgGrade, avgGradesByRegion,
    avgGradesByYear, avgStudyYears, birthYears, busiestCity, busiestCityCount, busiestYear, cardInnerStyle,
    changeExportCompareRange, changeExportGroupRange, chartGroups, closeExportSelection, compactTopbarStyle,
    compareA, compareAEnd, compareAStart, compareB, compareBEnd, compareBStart, compareExportLabel,
    compareRows, compareSelect, compareYearOptions, countChartData, countChartOptions, countries, data,
    entryYearOptions, entryYears, err, exportCompareA, exportCompareB, exportCompareRanges, exportCompareRows,
    exportFormatLabel, exportGroupRanges, exportMenuRef, exportOpen, exportSurfaceRef, exportViewData, femaleCount,
    genderByMunicipality, genderByRegion, genderChartData, genderChartOptions, genderDistributionPie, gradeBins,
    gradeBinsByGender, handleExportAction, i18n, loadedGroups, loading, maleCount, maxAge, maxGrade, maxStudyYears,
    metricBottomRowStyle, metricGridStyle, metricTopRowStyle, minAge, minGrade, minStudyYears, mobileSummaryOpen,
    municipalities, openExportSelection, pageRef, quietestYear, regions, sectionButtonsStyle, sectionMenuStyle,
    sectionWrapStyle, selectedChartIds, selectedExportFormat, selectedExportGenderEntryYears, selectionCheckboxStyle,
    selectionRowStyle, setActiveGroup, setCompareAEnd, setCompareAStart, setCompareBEnd, setCompareBStart,
    setExportOpen, setMobileSummaryOpen, t, toggleAllCharts, toggleAllExportGenderEntryYears,
    toggleExportGenderEntryYear, toggleGroupCharts, toggleSingleChart, topButtonStyle, total, yearsToDegree,
    yearsToDegreeByNomos, yearsToDegreeByRegion, yearsToDegreeDistribution,
  };

  return <StatisticsPageView {...viewProps} />;
}
