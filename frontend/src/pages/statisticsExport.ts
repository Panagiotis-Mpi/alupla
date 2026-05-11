// Φτιάχνει αρχεία export για τα στατιστικά.
import type { TFunction } from "i18next";
import * as XLSX from "xlsx";
import { downloadBlob } from "../lib/download";
import { sanitizeExportCell, sanitizeExportRows } from "../lib/exportSafety";
import { exportWorkbook } from "./map/mapExport";

export type StatisticsChartId =
  | "byYear"
  | "countByEntryYear"
  | "gender"
  | "birthYear"
  | "gradeByYear"
  | "gradeDistribution"
  | "genderByEntryYear"
  | "gradeByRegion"
  | "originRegion"
  | "genderByRegion"
  | "originMunicipality"
  | "originCountry"
  | "abroadShare"
  | "timeToDegreeByEntryYear"
  | "timeToDegreeDistribution"
  | "timeToDegreeByRegion"
;

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

type StatisticsData = Partial<Record<
  | "by_year"
  | "count_by_entry_year"
  | "gender_by_year"
  | "birth_year_distribution"
  | "avg_grade_by_year"
  | "avg_grade_by_region"
  | "degree_grade_bins"
  | "gender_by_entry_year"
  | "origin_region_distribution"
  | "gender_by_region"
  | "origin_municipality_distribution"
  | "origin_country_distribution"
  | "avg_years_to_degree_by_entry_year"
  | "avg_years_to_degree_by_region"
  | "years_to_degree_distribution",
  NamedCountRow[]
>> & {
  abroad_count?: number | string | null;
  abroad_pct?: number | string | null;
};

type SheetRow = Record<string, string | number>;
type ExportColumnKind = "text" | "year" | "count" | "percentage" | "average" | "duration";

export type StatisticsExportFormat = "xlsx" | "csv" | "png";

export type BuildArgs = {
  data: StatisticsData;
  t: TFunction;
  activeLang: "el" | "en";
  total: number;
  avgAge: string | number;
  avgGrade: string | number;
  earliestYear: string | number;
  busiestYear: string | number;
  busiestCity: string | number;
  selectedChartIds?: StatisticsChartId[];
};

type SheetBlock = {
  chartId: StatisticsChartId;
  chartIds?: StatisticsChartId[];
  name: string;
  rows: SheetRow[];
  columnKinds: Record<string, ExportColumnKind>;
};

const statisticsChartOrder: StatisticsChartId[] = [
  "byYear",
  "countByEntryYear",
  "birthYear",
  "genderByEntryYear",
  "gender",
  "gradeDistribution",
  "gradeByYear",
  "gradeByRegion",
  "timeToDegreeByEntryYear",
  "timeToDegreeDistribution",
  "timeToDegreeByRegion",
  "originRegion",
  "genderByRegion",
  "originMunicipality",
  "originCountry",
  "abroadShare",
];

function text(v: unknown) {
  return v === null || v === undefined ? "" : String(v);
}

function num(v: unknown) {
  const value = Number(v ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function rowsOf(rows: NamedCountRow[] | undefined) {
  return rows ?? [];
}

function localizedName(row: NamedCountRow, activeLang: "el" | "en") {
  if (activeLang === "en") return text(row.name_en ?? row.name_el ?? row.name ?? row.label);
  return text(row.name_el ?? row.name_en ?? row.name ?? row.label);
}

function csvCell(value: unknown) {
  const v = String(sanitizeExportCell(value) ?? "");
  if (/["\n\r\t]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function utf16Blob(textValue: string) {
  const out = new Uint8Array(2 + textValue.length * 2);
  out[0] = 0xff;
  out[1] = 0xfe;
  for (let i = 0; i < textValue.length; i += 1) {
    const code = textValue.charCodeAt(i);
    out[2 + i * 2] = code & 0xff;
    out[3 + i * 2] = code >> 8;
  }
  return new Blob([out], { type: "text/csv;charset=utf-16le" });
}

function exportUtf16Csv(filename: string, textValue: string) {
  downloadBlob(utf16Blob(textValue), filename);
}

function roundTo(value: unknown, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(num(value) * factor) / factor;
}

function percentOf(value: unknown, total: unknown) {
  const denominator = num(total);
  if (denominator <= 0) return 0;
  return roundTo((num(value) / denominator) * 100, 2);
}

function sumValues(rows: NamedCountRow[] | undefined, getter: (row: NamedCountRow) => unknown) {
  return rowsOf(rows).reduce((sum, row) => sum + num(getter(row)), 0);
}

function exportLabels(activeLang: "el" | "en") {
  return activeLang === "en"
    ? {
        total: "Total",
        graduationYear: "Graduation Year",
        entryYear: "Entry Year",
        birthYear: "Birth Year",
        graduateCount: "Graduate Count",
        maleCount: "Male Count",
        femaleCount: "Female Count",
        malePercentage: "Male Percentage",
        femalePercentage: "Female Percentage",
        percentage: "Percentage of Total",
        averageGraduationGrade: "Average Graduation Grade",
        graduationGradeRange: "Graduation Grade Range",
        regionOfOrigin: "Region of Origin",
        cityOfOrigin: "City of Origin",
        countryOfOrigin: "Country of Origin",
        category: "Category",
        abroad: "Abroad",
        greece: "Greece",
        averageStudyDuration: "Average Study Duration",
        studyDurationRange: "Study Duration Range",
      }
    : {
        total: "Σύνολο",
        graduationYear: "Έτος αποφοίτησης",
        entryYear: "Έτος εισαγωγής",
        birthYear: "Έτος γέννησης",
        graduateCount: "Πλήθος αποφοίτων",
        maleCount: "Πλήθος ανδρών",
        femaleCount: "Πλήθος γυναικών",
        malePercentage: "Ποσοστό ανδρών",
        femalePercentage: "Ποσοστό γυναικών",
        percentage: "Ποσοστό επί του συνόλου",
        averageGraduationGrade: "Μέση βαθμολογία αποφοίτησης",
        graduationGradeRange: "Εύρος βαθμολογίας αποφοίτησης",
        regionOfOrigin: "Περιφέρεια καταγωγής",
        cityOfOrigin: "Πόλη καταγωγής",
        countryOfOrigin: "Χώρα καταγωγής",
        category: "Κατηγορία",
        abroad: "Εξωτερικό",
        greece: "Ελλάδα",
        averageStudyDuration: "Μέση διάρκεια σπουδών",
        studyDurationRange: "Εύρος διάρκειας σπουδών",
      };
}

function appendDistributionTotal(rows: SheetRow[], firstColumn: string, countColumn: string, percentageColumn: string, totalLabel: string) {
  if (!rows.length) return rows;
  const total = rows.reduce((sum, row) => sum + num(row[countColumn]), 0);
  const percentage = roundTo(rows.reduce((sum, row) => sum + num(row[percentageColumn]), 0), 2);
  return [
    ...rows,
    {
      [firstColumn]: totalLabel,
      [countColumn]: total,
      [percentageColumn]: percentage,
    },
  ];
}


function blockChartIds(block: SheetBlock) {
  return block.chartIds ?? [block.chartId];
}

function mergeBlocksByFirstColumn(name: string, chartId: StatisticsChartId, blocks: SheetBlock[]) {
  const firstBlock = blocks[0];
  const firstRow = firstBlock?.rows[0];
  const keyColumn = Object.keys(firstRow ?? {})[0];

  if (!firstBlock || !firstRow || !keyColumn) return null;

  const rowOrder: string[] = [];
  const rowsByKey = new Map<string, SheetRow>();
  const columnKinds: Record<string, ExportColumnKind> = {};

  blocks.forEach((block) => {
    const sourceKeyColumn = Object.keys(block.rows[0] ?? {})[0];
    if (!sourceKeyColumn) return;

    Object.entries(block.columnKinds).forEach(([column, kind]) => {
      columnKinds[column === sourceKeyColumn ? keyColumn : column] = kind;
    });

    block.rows.forEach((row) => {
      const sourceKeyValue = row[sourceKeyColumn];
      const sourceKey = String(sourceKeyValue);

      if (!rowsByKey.has(sourceKey)) {
        rowsByKey.set(sourceKey, { [keyColumn]: sourceKeyValue });
        rowOrder.push(sourceKey);
      }

      const target = rowsByKey.get(sourceKey);
      if (!target) return;

      Object.entries(row).forEach(([column, value]) => {
        target[column === sourceKeyColumn ? keyColumn : column] = value;
      });
    });
  });

  return {
    chartId,
    chartIds: blocks.flatMap(blockChartIds),
    name,
    rows: rowOrder.map((key) => rowsByKey.get(key)).filter((row): row is SheetRow => !!row),
    columnKinds,
  };
}

function selectedBlocksFor(chartIds: StatisticsChartId[], sheets: Map<StatisticsChartId, SheetBlock>, selectedSet: Set<StatisticsChartId>) {
  return chartIds
    .filter((chartId) => !selectedSet.size || selectedSet.has(chartId))
    .map((chartId) => sheets.get(chartId))
    .filter((sheet): sheet is SheetBlock => !!sheet && sheet.rows.length > 0);
}

function buildSheets(args: BuildArgs) {
  const { data, activeLang } = args;
  const l = exportLabels(activeLang);
  const sheets = new Map<StatisticsChartId, SheetBlock>();
  const totalGraduates = num(args.total);
  const countByGraduationYear = new Map(rowsOf(data.by_year).map((row) => [num(row.year), num(row.count)]));
  const countByEntryYear = new Map(rowsOf(data.count_by_entry_year).map((row) => [num(row.entry_year), num(row.count)]));
  const entryYearTotal = Array.from(countByEntryYear.values()).reduce((sum, value) => sum + value, 0);

  const byYearRows = rowsOf(data.by_year).map((row) => {
    const count = num(row.count);
    return {
      [l.graduationYear]: num(row.year),
      [l.graduateCount]: count,
      [l.percentage]: percentOf(count, totalGraduates),
    };
  });

  sheets.set("byYear", {
    chartId: "byYear",
    name: activeLang === "en" ? "Graduates by Graduation Year" : "Πλήθος αποφοίτων ανά έτος αποφοίτησης",
    rows: appendDistributionTotal(byYearRows, l.graduationYear, l.graduateCount, l.percentage, l.total),
    columnKinds: {
      [l.graduationYear]: "year",
      [l.graduateCount]: "count",
      [l.percentage]: "percentage",
    },
  });

  const countByEntryYearRows = rowsOf(data.count_by_entry_year).map((row) => {
    const count = num(row.count);
    return {
      [l.entryYear]: num(row.entry_year),
      [l.graduateCount]: count,
      [l.percentage]: percentOf(count, totalGraduates),
    };
  });

  sheets.set("countByEntryYear", {
    chartId: "countByEntryYear",
    name: activeLang === "en" ? "Graduates by Entry Year" : "Πλήθος αποφοίτων ανά έτος εισαγωγής",
    rows: appendDistributionTotal(countByEntryYearRows, l.entryYear, l.graduateCount, l.percentage, l.total),
    columnKinds: {
      [l.entryYear]: "year",
      [l.graduateCount]: "count",
      [l.percentage]: "percentage",
    },
  });

  const genderRows = rowsOf(data.gender_by_year).map((row) => {
    const male = num(row.male);
    const female = num(row.female);
    const count = male + female;
    return {
      [l.graduationYear]: num(row.year),
      [l.maleCount]: male,
      [l.femaleCount]: female,
      [l.graduateCount]: count,
      [l.malePercentage]: percentOf(male, count),
      [l.femalePercentage]: percentOf(female, count),
    };
  });
  const genderMaleTotal = sumValues(data.gender_by_year, (row) => row.male);
  const genderFemaleTotal = sumValues(data.gender_by_year, (row) => row.female);
  const genderTotal = genderMaleTotal + genderFemaleTotal;

  sheets.set("gender", {
    chartId: "gender",
    name: activeLang === "en" ? "Gender Distribution by Graduation Year" : "Κατανομή φύλου ανά έτος αποφοίτησης",
    rows: genderRows.length
      ? [
          ...genderRows,
          {
            [l.graduationYear]: l.total,
            [l.maleCount]: genderMaleTotal,
            [l.femaleCount]: genderFemaleTotal,
            [l.graduateCount]: genderTotal,
            [l.malePercentage]: percentOf(genderMaleTotal, genderTotal),
            [l.femalePercentage]: percentOf(genderFemaleTotal, genderTotal),
          },
        ]
      : genderRows,
    columnKinds: {
      [l.graduationYear]: "year",
      [l.maleCount]: "count",
      [l.femaleCount]: "count",
      [l.graduateCount]: "count",
      [l.malePercentage]: "percentage",
      [l.femalePercentage]: "percentage",
    },
  });

  const birthYearRows = rowsOf(data.birth_year_distribution).map((row) => {
    const count = num(row.count);
    return {
      [l.birthYear]: num(row.year),
      [l.graduateCount]: count,
      [l.percentage]: percentOf(count, totalGraduates),
    };
  });

  sheets.set("birthYear", {
    chartId: "birthYear",
    name: activeLang === "en" ? "Graduates by Birth Year" : "Πλήθος αποφοίτων ανά έτος γέννησης",
    rows: appendDistributionTotal(birthYearRows, l.birthYear, l.graduateCount, l.percentage, l.total),
    columnKinds: {
      [l.birthYear]: "year",
      [l.graduateCount]: "count",
      [l.percentage]: "percentage",
    },
  });

  const gradeByYearRows = rowsOf(data.avg_grade_by_year).map((row) => {
    const year = num(row.year);
    const count = countByGraduationYear.get(year) ?? 0;
    return {
      [l.graduationYear]: year,
      [l.graduateCount]: count,
      [l.percentage]: percentOf(count, totalGraduates),
      [l.averageGraduationGrade]: roundTo(row.avg, 2),
    };
  });

  sheets.set("gradeByYear", {
    chartId: "gradeByYear",
    name: activeLang === "en" ? "Average Graduation Grade by Year" : "Μέση βαθμολογία αποφοίτησης ανά έτος",
    rows: gradeByYearRows.length
      ? [
          ...gradeByYearRows,
          {
            [l.graduationYear]: l.total,
            [l.graduateCount]: totalGraduates,
            [l.percentage]: totalGraduates > 0 ? 100 : 0,
            [l.averageGraduationGrade]: roundTo(args.avgGrade, 2),
          },
        ]
      : gradeByYearRows,
    columnKinds: {
      [l.graduationYear]: "year",
      [l.graduateCount]: "count",
      [l.percentage]: "percentage",
      [l.averageGraduationGrade]: "average",
    },
  });

  const gradeDistributionRows = rowsOf(data.degree_grade_bins).map((row) => {
    const count = num(row.count);
    return {
      [l.graduationGradeRange]: text(row.label),
      [l.graduateCount]: count,
      [l.percentage]: percentOf(count, totalGraduates),
    };
  });

  sheets.set("gradeDistribution", {
    chartId: "gradeDistribution",
    name: activeLang === "en" ? "Graduation Grade Distribution" : "Κατανομή βαθμολογίας αποφοίτησης",
    rows: appendDistributionTotal(gradeDistributionRows, l.graduationGradeRange, l.graduateCount, l.percentage, l.total),
    columnKinds: {
      [l.graduationGradeRange]: "text",
      [l.graduateCount]: "count",
      [l.percentage]: "percentage",
    },
  });

  const gradeByRegionRows = rowsOf(data.avg_grade_by_region).map((row) => {
    const count = num(row.count);
    return {
      [l.regionOfOrigin]: localizedName(row, activeLang),
      [l.graduateCount]: count,
      [l.percentage]: percentOf(count, totalGraduates),
      [l.averageGraduationGrade]: roundTo(row.avg, 2),
    };
  });
  const weightedGradeRegionTotal = gradeByRegionRows.reduce((sum, row) => sum + num(row[l.graduateCount]) * num(row[l.averageGraduationGrade]), 0);
  const gradeRegionCountTotal = gradeByRegionRows.reduce((sum, row) => sum + num(row[l.graduateCount]), 0);

  sheets.set("gradeByRegion", {
    chartId: "gradeByRegion",
    name: activeLang === "en" ? "Average Graduation Grade by Region" : "Μέση βαθμολογία αποφοίτησης ανά περιφέρεια καταγωγής",
    rows: gradeByRegionRows.length
      ? [
          ...gradeByRegionRows,
          {
            [l.regionOfOrigin]: l.total,
            [l.graduateCount]: gradeRegionCountTotal,
            [l.percentage]: gradeRegionCountTotal > 0 ? 100 : 0,
            [l.averageGraduationGrade]: gradeRegionCountTotal > 0 ? roundTo(weightedGradeRegionTotal / gradeRegionCountTotal, 2) : 0,
          },
        ]
      : gradeByRegionRows,
    columnKinds: {
      [l.regionOfOrigin]: "text",
      [l.graduateCount]: "count",
      [l.percentage]: "percentage",
      [l.averageGraduationGrade]: "average",
    },
  });

  const genderByEntryYearRows = rowsOf(data.gender_by_entry_year).map((row) => {
    const male = num(row.male);
    const female = num(row.female);
    const count = male + female;
    return {
      [l.entryYear]: num(row.entry_year),
      [l.maleCount]: male,
      [l.femaleCount]: female,
      [l.graduateCount]: count,
      [l.malePercentage]: percentOf(male, count),
      [l.femalePercentage]: percentOf(female, count),
    };
  });
  const entryMaleTotal = sumValues(data.gender_by_entry_year, (row) => row.male);
  const entryFemaleTotal = sumValues(data.gender_by_entry_year, (row) => row.female);
  const entryGenderTotal = entryMaleTotal + entryFemaleTotal;

  sheets.set("genderByEntryYear", {
    chartId: "genderByEntryYear",
    name: activeLang === "en" ? "Gender Distribution by Entry Year" : "Κατανομή φύλου ανά έτος εισαγωγής",
    rows: genderByEntryYearRows.length
      ? [
          ...genderByEntryYearRows,
          {
            [l.entryYear]: l.total,
            [l.maleCount]: entryMaleTotal,
            [l.femaleCount]: entryFemaleTotal,
            [l.graduateCount]: entryGenderTotal,
            [l.malePercentage]: percentOf(entryMaleTotal, entryGenderTotal),
            [l.femalePercentage]: percentOf(entryFemaleTotal, entryGenderTotal),
          },
        ]
      : genderByEntryYearRows,
    columnKinds: {
      [l.entryYear]: "year",
      [l.maleCount]: "count",
      [l.femaleCount]: "count",
      [l.graduateCount]: "count",
      [l.malePercentage]: "percentage",
      [l.femalePercentage]: "percentage",
    },
  });

  const originRegionRows = rowsOf(data.origin_region_distribution).map((row) => {
    const count = num(row.count);
    return {
      [l.regionOfOrigin]: localizedName(row, activeLang),
      [l.graduateCount]: count,
      [l.percentage]: percentOf(count, totalGraduates),
    };
  });

  sheets.set("originRegion", {
    chartId: "originRegion",
    name: activeLang === "en" ? "Graduate Count by Region of Origin" : "Πλήθος αποφοίτων ανά περιφέρεια καταγωγής",
    rows: appendDistributionTotal(originRegionRows, l.regionOfOrigin, l.graduateCount, l.percentage, l.total),
    columnKinds: {
      [l.regionOfOrigin]: "text",
      [l.graduateCount]: "count",
      [l.percentage]: "percentage",
    },
  });

  const genderByRegionRows = rowsOf(data.gender_by_region).map((row) => {
    const male = num(row.male);
    const female = num(row.female);
    const count = male + female;
    return {
      [l.regionOfOrigin]: localizedName(row, activeLang),
      [l.maleCount]: male,
      [l.femaleCount]: female,
      [l.graduateCount]: count,
      [l.malePercentage]: percentOf(male, count),
      [l.femalePercentage]: percentOf(female, count),
    };
  });
  const regionMaleTotal = sumValues(data.gender_by_region, (row) => row.male);
  const regionFemaleTotal = sumValues(data.gender_by_region, (row) => row.female);
  const regionGenderTotal = regionMaleTotal + regionFemaleTotal;

  sheets.set("genderByRegion", {
    chartId: "genderByRegion",
    name: activeLang === "en" ? "Gender Distribution by Region" : "Κατανομή φύλου ανά περιφέρεια καταγωγής",
    rows: genderByRegionRows.length
      ? [
          ...genderByRegionRows,
          {
            [l.regionOfOrigin]: l.total,
            [l.maleCount]: regionMaleTotal,
            [l.femaleCount]: regionFemaleTotal,
            [l.graduateCount]: regionGenderTotal,
            [l.malePercentage]: percentOf(regionMaleTotal, regionGenderTotal),
            [l.femalePercentage]: percentOf(regionFemaleTotal, regionGenderTotal),
          },
        ]
      : genderByRegionRows,
    columnKinds: {
      [l.regionOfOrigin]: "text",
      [l.maleCount]: "count",
      [l.femaleCount]: "count",
      [l.graduateCount]: "count",
      [l.malePercentage]: "percentage",
      [l.femalePercentage]: "percentage",
    },
  });

  const originMunicipalityRows = rowsOf(data.origin_municipality_distribution).map((row) => {
    const count = num(row.count);
    return {
      [l.cityOfOrigin]: localizedName(row, activeLang),
      [l.graduateCount]: count,
      [l.percentage]: percentOf(count, totalGraduates),
    };
  });

  sheets.set("originMunicipality", {
    chartId: "originMunicipality",
    name: activeLang === "en" ? "Graduate Count by City of Origin" : "Πλήθος αποφοίτων ανά πόλη καταγωγής",
    rows: appendDistributionTotal(originMunicipalityRows, l.cityOfOrigin, l.graduateCount, l.percentage, l.total),
    columnKinds: {
      [l.cityOfOrigin]: "text",
      [l.graduateCount]: "count",
      [l.percentage]: "percentage",
    },
  });

  const originCountryRows = rowsOf(data.origin_country_distribution).map((row) => {
    const count = num(row.count);
    return {
      [l.countryOfOrigin]: localizedName(row, activeLang),
      [l.graduateCount]: count,
      [l.percentage]: percentOf(count, totalGraduates),
    };
  });

  sheets.set("originCountry", {
    chartId: "originCountry",
    name: activeLang === "en" ? "Graduate Count by Country of Origin" : "Πλήθος αποφοίτων ανά χώρα καταγωγής",
    rows: appendDistributionTotal(originCountryRows, l.countryOfOrigin, l.graduateCount, l.percentage, l.total),
    columnKinds: {
      [l.countryOfOrigin]: "text",
      [l.graduateCount]: "count",
      [l.percentage]: "percentage",
    },
  });

  const abroadCount = num(data?.abroad_count);
  const abroadPct = roundTo(data?.abroad_pct, 2);
  const greeceCount = Math.max(0, totalGraduates - abroadCount);
  const greecePct = totalGraduates > 0 ? Math.max(0, roundTo(100 - abroadPct, 2)) : 0;

  sheets.set("abroadShare", {
    chartId: "abroadShare",
    name: activeLang === "en" ? "Greece and Abroad Graduate Distribution" : "Κατανομή αποφοίτων Ελλάδας και εξωτερικού",
    rows: [
      {
        [l.category]: l.abroad,
        [l.graduateCount]: abroadCount,
        [l.percentage]: abroadPct,
      },
      {
        [l.category]: l.greece,
        [l.graduateCount]: greeceCount,
        [l.percentage]: greecePct,
      },
      {
        [l.category]: l.total,
        [l.graduateCount]: totalGraduates,
        [l.percentage]: totalGraduates > 0 ? 100 : 0,
      },
    ],
    columnKinds: {
      [l.category]: "text",
      [l.graduateCount]: "count",
      [l.percentage]: "percentage",
    },
  });

  const durationByEntryYearRows = rowsOf(data.avg_years_to_degree_by_entry_year).map((row) => {
    const entryYear = num(row.entry_year);
    const count = countByEntryYear.get(entryYear) ?? 0;
    return {
      [l.entryYear]: entryYear,
      [l.graduateCount]: count,
      [l.percentage]: percentOf(count, entryYearTotal),
      [l.averageStudyDuration]: roundTo(row.avg_years, 2),
    };
  });
  const weightedDurationTotal = durationByEntryYearRows.reduce((sum, row) => sum + num(row[l.graduateCount]) * num(row[l.averageStudyDuration]), 0);
  const durationCountTotal = durationByEntryYearRows.reduce((sum, row) => sum + num(row[l.graduateCount]), 0);

  sheets.set("timeToDegreeByEntryYear", {
    chartId: "timeToDegreeByEntryYear",
    name: activeLang === "en" ? "Average Study Duration by Entry Year" : "Μέση διάρκεια σπουδών ανά έτος εισαγωγής",
    rows: durationByEntryYearRows.length
      ? [
          ...durationByEntryYearRows,
          {
            [l.entryYear]: l.total,
            [l.graduateCount]: durationCountTotal,
            [l.percentage]: durationCountTotal > 0 ? 100 : 0,
            [l.averageStudyDuration]: durationCountTotal > 0 ? roundTo(weightedDurationTotal / durationCountTotal, 2) : 0,
          },
        ]
      : durationByEntryYearRows,
    columnKinds: {
      [l.entryYear]: "year",
      [l.graduateCount]: "count",
      [l.percentage]: "percentage",
      [l.averageStudyDuration]: "duration",
    },
  });

  const durationByRegionRows = rowsOf(data.avg_years_to_degree_by_region).map((row) => {
    const count = num(row.count);
    return {
      [l.regionOfOrigin]: localizedName(row, activeLang),
      [l.graduateCount]: count,
      [l.percentage]: percentOf(count, totalGraduates),
      [l.averageStudyDuration]: roundTo(row.avg_years, 2),
    };
  });
  const weightedDurationRegionTotal = durationByRegionRows.reduce((sum, row) => sum + num(row[l.graduateCount]) * num(row[l.averageStudyDuration]), 0);
  const durationRegionCountTotal = durationByRegionRows.reduce((sum, row) => sum + num(row[l.graduateCount]), 0);

  sheets.set("timeToDegreeByRegion", {
    chartId: "timeToDegreeByRegion",
    name: activeLang === "en" ? "Average Study Duration by Region" : "Μέση διάρκεια σπουδών ανά περιφέρεια καταγωγής",
    rows: durationByRegionRows.length
      ? [
          ...durationByRegionRows,
          {
            [l.regionOfOrigin]: l.total,
            [l.graduateCount]: durationRegionCountTotal,
            [l.percentage]: durationRegionCountTotal > 0 ? 100 : 0,
            [l.averageStudyDuration]: durationRegionCountTotal > 0 ? roundTo(weightedDurationRegionTotal / durationRegionCountTotal, 2) : 0,
          },
        ]
      : durationByRegionRows,
    columnKinds: {
      [l.regionOfOrigin]: "text",
      [l.graduateCount]: "count",
      [l.percentage]: "percentage",
      [l.averageStudyDuration]: "duration",
    },
  });

  const durationDistributionRows = rowsOf(data.years_to_degree_distribution).map((row) => {
    const count = num(row.count);
    return {
      [l.studyDurationRange]: text(row.label),
      [l.graduateCount]: count,
      [l.percentage]: percentOf(count, totalGraduates),
    };
  });

  sheets.set("timeToDegreeDistribution", {
    chartId: "timeToDegreeDistribution",
    name: activeLang === "en" ? "Study Duration Distribution" : "Κατανομή διάρκειας σπουδών",
    rows: appendDistributionTotal(durationDistributionRows, l.studyDurationRange, l.graduateCount, l.percentage, l.total),
    columnKinds: {
      [l.studyDurationRange]: "text",
      [l.graduateCount]: "count",
      [l.percentage]: "percentage",
    },
  });

  const selectedSet = new Set(Array.isArray(args.selectedChartIds) ? args.selectedChartIds : []);
  const blocks: SheetBlock[] = [];
  const usedChartIds = new Set<StatisticsChartId>();
  const graduationYearBlocks = selectedBlocksFor(["byYear", "gender", "gradeByYear"], sheets, selectedSet);
  const entryYearBlocks = selectedBlocksFor(["countByEntryYear", "genderByEntryYear", "timeToDegreeByEntryYear"], sheets, selectedSet);
  const regionBlocks = selectedBlocksFor(["originRegion", "genderByRegion", "gradeByRegion", "timeToDegreeByRegion"], sheets, selectedSet);

  const graduationYearBlock = graduationYearBlocks.length > 1
    ? mergeBlocksByFirstColumn(activeLang === "en" ? "Graduation Year Statistics" : "Στατιστικά ανά έτος αποφοίτησης", "byYear", graduationYearBlocks)
    : graduationYearBlocks[0];

  const entryYearBlock = entryYearBlocks.length > 1
    ? mergeBlocksByFirstColumn(activeLang === "en" ? "Entry Year Statistics" : "Στατιστικά ανά έτος εισαγωγής", "genderByEntryYear", entryYearBlocks)
    : entryYearBlocks[0];

  if (graduationYearBlock) {
    blocks.push(graduationYearBlock);
    blockChartIds(graduationYearBlock).forEach((chartId) => usedChartIds.add(chartId));
  }

  if (entryYearBlock) {
    blocks.push(entryYearBlock);
    blockChartIds(entryYearBlock).forEach((chartId) => usedChartIds.add(chartId));
  }

  const regionBlock = regionBlocks.length > 1
    ? mergeBlocksByFirstColumn(activeLang === "en" ? "Region Statistics" : "Στατιστικά ανά περιφέρεια καταγωγής", "originRegion", regionBlocks)
    : regionBlocks[0];

  if (regionBlock) {
    blocks.push(regionBlock);
    blockChartIds(regionBlock).forEach((chartId) => usedChartIds.add(chartId));
  }

  statisticsChartOrder.forEach((chartId) => {
    if (usedChartIds.has(chartId)) return;
    if (selectedSet.size && !selectedSet.has(chartId)) return;

    const block = sheets.get(chartId);
    if (block?.rows.length) blocks.push(block);
  });

  return blocks;
}

function workbookSheetName(name: string, usedNames: Set<string>) {
  const base = name.slice(0, 31) || "Sheet";
  let candidate = base;
  let counter = 2;

  while (usedNames.has(candidate)) {
    const suffix = `_${counter}`;
    candidate = `${base.slice(0, Math.max(0, 31 - suffix.length))}${suffix}`;
    counter += 1;
  }

  usedNames.add(candidate);
  return candidate;
}

function numberFormat(kind: ExportColumnKind, activeLang: "el" | "en") {
  if (kind === "year" || kind === "count") return "0";
  if (kind === "percentage") return '0.00"%"';
  if (kind === "average") return "0.00";
  if (kind === "duration") return activeLang === "en" ? '0.00" years"' : '0.00" έτη"';
  return null;
}

function formatDecimal(value: unknown, decimals: number) {
  return num(value).toFixed(decimals);
}

function csvValue(value: unknown, kind: ExportColumnKind | undefined, activeLang: "el" | "en") {
  if (typeof value === "string") return value;
  if (kind === "year" || kind === "count") return String(Math.round(num(value)));
  if (kind === "percentage") return `${formatDecimal(value, 2)}%`;
  if (kind === "average") return formatDecimal(value, 2);
  if (kind === "duration") return `${formatDecimal(value, 2)} ${activeLang === "en" ? "years" : "έτη"}`;
  return value;
}

function applyWorksheetFormats(ws: XLSX.WorkSheet, headers: string[], block: SheetBlock, activeLang: "el" | "en") {
  headers.forEach((header, columnIndex) => {
    const format = numberFormat(block.columnKinds[header] ?? "text", activeLang);
    if (!format) return;
    for (let rowIndex = 1; rowIndex <= block.rows.length; rowIndex += 1) {
      const cell = ws[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
      if (cell && typeof cell.v === "number") cell.z = format;
    }
  });
}

function csvLines(block: SheetBlock, activeLang: "el" | "en") {
  const lines: string[] = [block.name];
  const headers = Object.keys(block.rows[0] ?? {});
  if (headers.length) lines.push(headers.map(csvCell).join("\t"));
  block.rows.forEach((row) => {
    lines.push(headers.map((header) => csvCell(csvValue(row[header], block.columnKinds[header], activeLang))).join("\t"));
  });
  return lines;
}

export function buildStatisticsExportFilename(args: BuildArgs, format: StatisticsExportFormat) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const selected = Array.isArray(args.selectedChartIds) ? args.selectedChartIds.filter(Boolean) : [];
  const chartCount = selected.length;
  const allSelected = chartCount === 0;
  const groupChartIds = {
    demographics: ["byYear", "countByEntryYear", "birthYear", "genderByEntryYear", "gender"],
    academic: ["gradeDistribution", "gradeByYear", "gradeByRegion", "timeToDegreeByEntryYear", "timeToDegreeDistribution", "timeToDegreeByRegion"],
    geography: ["originRegion", "genderByRegion", "originMunicipality", "originCountry", "abroadShare"],
  } as const;

  const selectedSet = new Set(selected);
  const matchingGroups = Object.entries(groupChartIds).filter(([, ids]) => ids.some((id) => selectedSet.has(id as StatisticsChartId))).map(([key]) => key);
  const scope = allSelected
    ? "all-charts"
    : matchingGroups.length === 1
      ? matchingGroups[0]
      : matchingGroups.length > 1
        ? "mixed-groups"
        : "selected-charts";
  const selection = allSelected ? "full-export" : `${chartCount}-charts`;
  return `alupla_statistics_${scope}_${selection}_${stamp}.${format}`;
}

export function exportStatisticsWorkbookFile(args: BuildArgs, filename = buildStatisticsExportFilename(args, "xlsx")) {
  const workbook = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  for (const sheet of buildSheets(args)) {
    const safeRows = sanitizeExportRows(sheet.rows);
    const ws = XLSX.utils.json_to_sheet(safeRows);
    const headers = Object.keys(safeRows[0] ?? {});
    ws["!cols"] = headers.map((header) => {
      const kind = sheet.columnKinds[header] ?? "text";
      const maxValueLength = safeRows.reduce((max, row) => Math.max(max, String(csvValue(row[header], kind, args.activeLang)).length), String(header).length);
      return { wch: Math.min(42, Math.max(18, maxValueLength + 4)) };
    });
    applyWorksheetFormats(ws, headers, sheet, args.activeLang);
    XLSX.utils.book_append_sheet(workbook, ws, workbookSheetName(sheet.name, usedNames));
  }

  exportWorkbook(filename, workbook);
}

export function exportStatisticsCsvFile(args: BuildArgs, filename = buildStatisticsExportFilename(args, "csv")) {
  const blocks = buildSheets(args);
  const lines: string[] = [];

  blocks.forEach((block, index) => {
    lines.push(...csvLines(block, args.activeLang));

    if (index < blocks.length - 1) {
      lines.push("");
      lines.push("--------------------------------------------------");
      lines.push("");
    }
  });

  if (lines.length) exportUtf16Csv(filename, lines.join("\r\n"));
}
