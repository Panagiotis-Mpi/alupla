import React from "react";
import { buildLineDataset } from "./ui";

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

const yTicks = { precision: 0 as any };

export function useStatisticsChartData({ data, t, activeLang, statisticsPlaceName }: any) {
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
        placeKind?: "city" | "country";
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
            if (options?.placeKind) return statisticsPlaceName(row, options.placeKind);
            const value = activeLang === "en" ? row.name_en ?? row.name_el ?? row.name : row.name_el ?? row.name_en ?? row.name;
            return String(value ?? "-");
          }
          return String(row.label ?? row.name ?? row.name_el ?? row.name_en ?? row.year ?? row.entry_year ?? "-");
        }),
        values: safeRows.map((row) => Number(row[valueKey] ?? 0)),
      };
    },
    [activeLang, statisticsPlaceName]
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

  const reorderRegionMetricSeries = React.useCallback((series: { labels: string[]; values: number[] }) => {
    const sorted = series.labels
      .map((label, index) => ({ label, value: Number(series.values[index] ?? 0), index }))
      .sort((a, b) => b.value - a.value || a.index - b.index);
    const lowStart = Math.ceil(sorted.length / 2);
    const lowOrder: number[] = [];
    let middle = lowStart;
    let end = sorted.length - 1;
    while (middle <= end) {
      lowOrder.push(middle);
      if (end !== middle) lowOrder.push(end);
      middle += 1;
      end -= 1;
    }
    const order: number[] = [];
    for (let index = 0; index < lowStart; index += 1) {
      order.push(index);
      const lowIndex = lowOrder[index];
      if (lowIndex !== undefined) order.push(lowIndex);
    }
    return order.reduce((acc, index) => {
      const item = sorted[index];
      if (item) {
        acc.labels.push(item.label);
        acc.values.push(item.value);
      }
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

  const byYearRows = React.useMemo<Array<{ label: string; value: number }>>(
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
  const avgGradesByRegion = React.useMemo(() => reorderRegionMetricSeries(seriesFromRows(data?.avg_grade_by_region, { labelKey: "name", valueKey: "avg" })), [data, reorderRegionMetricSeries, seriesFromRows]);
  const gradeBins = seriesFromRows(data?.degree_grade_bins);
  const regions = React.useMemo(() => sortSeriesDescending(seriesFromRows(data?.origin_region_distribution, { labelKey: "name" })), [data, seriesFromRows, sortSeriesDescending]);
  const municipalities = React.useMemo(() => sortSeriesDescending(seriesFromRows(data?.origin_municipality_distribution, { labelKey: "name", placeKind: "city" })), [data, seriesFromRows, sortSeriesDescending]);
  const countries = React.useMemo(() => sortSeriesDescending(seriesFromRows(data?.origin_country_distribution, { labelKey: "name", placeKind: "country" })), [data, seriesFromRows, sortSeriesDescending]);
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
  const yearsToDegreeByRegion = React.useMemo(() => reorderRegionMetricSeries(seriesFromRows(data?.avg_years_to_degree_by_region, { labelKey: "name", valueKey: "avg_years" })), [data, reorderRegionMetricSeries, seriesFromRows]);
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
      labels: safeRows.map((row) => statisticsPlaceName(row, "city")),
      male: safeRows.map((row) => Number(row.male ?? 0)),
      female: safeRows.map((row) => Number(row.female ?? 0)),
    });
  }, [data, sortGenderByRegionDescending, statisticsPlaceName]);

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

  return { total, numberValue, seriesFromRows, sortSeriesDescending, reorderRegionMetricSeries, sortGenderByRegionDescending, byYearRows, countChartData, countChartOptions, genderChartData, genderChartOptions, gradeBinsByGender, entryYears, birthYears, avgGradesByYear, avgGradesByRegion, gradeBins, regions, municipalities, countries, abroadByYear, yearsToDegreeByNomos, yearsToDegree, yearsToDegreeByRegion, yearsToDegreeDistribution, genderByRegion, genderByMunicipality, genderByEntryYearRows, makeGenderDistributionPie, busiestYear, quietestYear, busiestCity, busiestCityCount, abroadCount, avgAge, minAge, maxAge, avgGrade, minGrade, maxGrade, avgStudyYears, minStudyYears, maxStudyYears, maleCount, femaleCount };
}
