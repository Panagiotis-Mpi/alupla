// Φτιάχνει αρχεία export για τα στατιστικά.
import type { TFunction } from "i18next";
import * as XLSX from "xlsx";
import { downloadBlob } from "../lib/download";
import { sanitizeExportCell, sanitizeExportRows } from "../lib/exportSafety";
import { exportWorkbook } from "./map/mapExport";
import { buildExportFilename, exportFilenamePart, exportTimestamp, yearRangeFilenamePart } from "../lib/exportFilenames";
import { localizedCityRecordName, localizedCountryRecordName } from "./map/markers";

export type StatisticsChartId =
  | "byYear"
  | "countByEntryYear"
  | "gender"
  | "genderTotal"
  | "birthYear"
  | "gradeByYear"
  | "gradeDistribution"
  | "gradeDistributionByGender"
  | "genderByEntryYear"
  | "gradeByRegion"
  | "originRegion"
  | "genderByRegion"
  | "originMunicipality"
  | "genderByMunicipality"
  | "originCountry"
  | "abroadShare"
  | "abroadByYear"
  | "timeToDegreeByEntryYear"
  | "timeToDegreeDistribution"
  | "timeToDegreeByRegion"
  | "timeToDegreeByNomos"
  | "compare"
  | "compareDemographics"
  | "compareAcademic"
  | "compareGeography"
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
  greece?: number | null;
  abroad?: number | null;
};

type StatisticsData = Partial<Record<
  | "by_year"
  | "count_by_entry_year"
  | "gender_by_year"
  | "birth_year_distribution"
  | "gender_by_birth_year"
  | "avg_grade_by_year"
  | "avg_grade_by_region"
  | "degree_grade_bins"
  | "degree_grade_bins_by_gender"
  | "gender_by_entry_year"
  | "origin_region_distribution"
  | "gender_by_region"
  | "origin_municipality_distribution"
  | "gender_by_municipality"
  | "origin_country_distribution"
  | "abroad_by_year"
  | "avg_years_to_degree_by_entry_year"
  | "avg_years_to_degree_by_region"
  | "avg_years_to_degree_by_nomos"
  | "years_to_degree_distribution",
  NamedCountRow[]
>> & {
  abroad_count?: number | string | null;
  abroad_pct?: number | string | null;
};

type SheetRow = Record<string, string | number>;
type ExportColumnKind = "text" | "year" | "count" | "percentage" | "average" | "duration";

export type StatisticsExportFormat = "xlsx" | "csv" | "png";
export type StatisticsExportGroupKey = "demographics" | "academic" | "geography" | "compare";
export type StatisticsExportRange = { from?: string | number | null; to?: string | number | null };

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
  exportRanges?: Partial<Record<StatisticsExportGroupKey, StatisticsExportRange>>;
  compareFilenameRange?: string;
  compare?: {
    rangeALabel: string;
    rangeBLabel: string;
    changeLabel: string;
    sections: Partial<Record<"compare" | "compareDemographics" | "compareAcademic" | "compareGeography", {
      name: string;
      rows: Array<{ metric: string; a: string | number; b: string | number; delta: string | number }>;
    }>>;
  };
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
  "genderTotal",
  "gender",
  "gradeDistribution",
  "gradeDistributionByGender",
  "timeToDegreeDistribution",
  "gradeByYear",
  "gradeByRegion",
  "timeToDegreeByEntryYear",
  "timeToDegreeByRegion",
  "originRegion",
  "genderByRegion",
  "originMunicipality",
  "genderByMunicipality",
  "originCountry",
  "abroadShare",
  "abroadByYear",
  "timeToDegreeByNomos",
  "compare",
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

function localizedCityName(row: NamedCountRow, activeLang: "el" | "en") {
  const language = activeLang === "en" ? "en" : "gr";
  return localizedCityRecordName({ city_name: row.name, city_name_el: row.name_el, city_name_en: row.name_en }, language) || localizedName(row, activeLang);
}

function localizedCountryName(row: NamedCountRow, activeLang: "el" | "en") {
  const language = activeLang === "en" ? "en" : "gr";
  return localizedCountryRecordName({ country_name: row.name, country_name_el: row.name_el, country_name_en: row.name_en }, language) || localizedName(row, activeLang);
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
        percentage: "Percentage of all graduates",
        abroadPercentageByYear: "Abroad percentage within graduation year",
        averageGraduationGrade: "Average Graduation Grade",
        graduationGradeRange: "Graduation Grade Range",
        regionOfOrigin: "Region of Origin",
        nomosOfOrigin: "Regional Unit of Origin",
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
        percentage: "Ποσοστό επί του συνολικού πλήθους αποφοίτων",
        abroadPercentageByYear: "Ποσοστό εξωτερικού μέσα στο έτος αποφοίτησης",
        averageGraduationGrade: "Μέση βαθμολογία αποφοίτησης",
        graduationGradeRange: "Εύρος βαθμολογίας αποφοίτησης",
        regionOfOrigin: "Περιφέρεια καταγωγής",
        nomosOfOrigin: "Νομός καταγωγής",
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

  sheets.set("genderTotal", {
    chartId: "genderTotal",
    name: activeLang === "en" ? "Gender Distribution" : "Κατανομή φύλου",
    rows: [
      {
        [l.category]: activeLang === "en" ? "Male" : "Άνδρες",
        [l.graduateCount]: genderMaleTotal,
        [l.percentage]: percentOf(genderMaleTotal, genderTotal),
      },
      {
        [l.category]: activeLang === "en" ? "Female" : "Γυναίκες",
        [l.graduateCount]: genderFemaleTotal,
        [l.percentage]: percentOf(genderFemaleTotal, genderTotal),
      },
      {
        [l.category]: l.total,
        [l.graduateCount]: genderTotal,
        [l.percentage]: genderTotal > 0 ? 100 : 0,
      },
    ],
    columnKinds: {
      [l.category]: "text",
      [l.graduateCount]: "count",
      [l.percentage]: "percentage",
    },
  });

  const genderByBirthYearMap = new Map(rowsOf(data.gender_by_birth_year).map((row) => [num(row.year), row]));
  const birthYearRows = rowsOf(data.birth_year_distribution).map((row) => {
    const year = num(row.year);
    const count = num(row.count);
    const genderRow = genderByBirthYearMap.get(year);
    const male = num(genderRow?.male);
    const female = num(genderRow?.female);
    return {
      [l.birthYear]: year,
      [l.graduateCount]: count,
      [l.percentage]: percentOf(count, totalGraduates),
      [l.maleCount]: male,
      [l.femaleCount]: female,
      [l.malePercentage]: percentOf(male, count),
      [l.femalePercentage]: percentOf(female, count),
    };
  });
  const birthYearMaleTotal = birthYearRows.reduce((sum, row) => sum + num(row[l.maleCount]), 0);
  const birthYearFemaleTotal = birthYearRows.reduce((sum, row) => sum + num(row[l.femaleCount]), 0);
  const birthYearCountTotal = birthYearRows.reduce((sum, row) => sum + num(row[l.graduateCount]), 0);

  sheets.set("birthYear", {
    chartId: "birthYear",
    name: activeLang === "en" ? "Graduates by Birth Year" : "Πλήθος αποφοίτων ανά έτος γέννησης",
    rows: birthYearRows.length
      ? [
          ...birthYearRows,
          {
            [l.birthYear]: l.total,
            [l.graduateCount]: birthYearCountTotal,
            [l.percentage]: birthYearCountTotal > 0 ? 100 : 0,
            [l.maleCount]: birthYearMaleTotal,
            [l.femaleCount]: birthYearFemaleTotal,
            [l.malePercentage]: percentOf(birthYearMaleTotal, birthYearCountTotal),
            [l.femalePercentage]: percentOf(birthYearFemaleTotal, birthYearCountTotal),
          },
        ]
      : birthYearRows,
    columnKinds: {
      [l.birthYear]: "year",
      [l.graduateCount]: "count",
      [l.percentage]: "percentage",
      [l.maleCount]: "count",
      [l.femaleCount]: "count",
      [l.malePercentage]: "percentage",
      [l.femalePercentage]: "percentage",
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

  const gradeDistributionByGenderRows = rowsOf(data.degree_grade_bins_by_gender).map((row) => {
    const male = num(row.male);
    const female = num(row.female);
    const count = male + female;
    return {
      [l.graduationGradeRange]: text(row.label),
      [l.maleCount]: male,
      [l.femaleCount]: female,
      [l.graduateCount]: count,
      [l.malePercentage]: percentOf(male, count),
      [l.femalePercentage]: percentOf(female, count),
    };
  });
  const gradeGenderMaleTotal = sumValues(data.degree_grade_bins_by_gender, (row) => row.male);
  const gradeGenderFemaleTotal = sumValues(data.degree_grade_bins_by_gender, (row) => row.female);
  const gradeGenderTotal = gradeGenderMaleTotal + gradeGenderFemaleTotal;

  sheets.set("gradeDistributionByGender", {
    chartId: "gradeDistributionByGender",
    name: activeLang === "en" ? "Graduation Grade Distribution by Gender" : "Κατανομή βαθμολογίας αποφοίτησης ανά φύλο",
    rows: gradeDistributionByGenderRows.length
      ? [
          ...gradeDistributionByGenderRows,
          {
            [l.graduationGradeRange]: l.total,
            [l.maleCount]: gradeGenderMaleTotal,
            [l.femaleCount]: gradeGenderFemaleTotal,
            [l.graduateCount]: gradeGenderTotal,
            [l.malePercentage]: percentOf(gradeGenderMaleTotal, gradeGenderTotal),
            [l.femalePercentage]: percentOf(gradeGenderFemaleTotal, gradeGenderTotal),
          },
        ]
      : gradeDistributionByGenderRows,
    columnKinds: {
      [l.graduationGradeRange]: "text",
      [l.maleCount]: "count",
      [l.femaleCount]: "count",
      [l.graduateCount]: "count",
      [l.malePercentage]: "percentage",
      [l.femalePercentage]: "percentage",
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
      [l.cityOfOrigin]: localizedCityName(row, activeLang),
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

  const genderByMunicipalityRows = rowsOf(data.gender_by_municipality).map((row) => {
    const male = num(row.male);
    const female = num(row.female);
    const count = male + female;
    return {
      [l.cityOfOrigin]: localizedCityName(row, activeLang),
      [l.maleCount]: male,
      [l.femaleCount]: female,
      [l.graduateCount]: count,
      [l.malePercentage]: percentOf(male, count),
      [l.femalePercentage]: percentOf(female, count),
    };
  });
  const municipalityMaleTotal = sumValues(data.gender_by_municipality, (row) => row.male);
  const municipalityFemaleTotal = sumValues(data.gender_by_municipality, (row) => row.female);
  const municipalityGenderTotal = municipalityMaleTotal + municipalityFemaleTotal;

  sheets.set("genderByMunicipality", {
    chartId: "genderByMunicipality",
    name: activeLang === "en" ? "Gender Distribution by City of Origin" : "Κατανομή φύλου ανά πόλη καταγωγής",
    rows: genderByMunicipalityRows.length
      ? [
          ...genderByMunicipalityRows,
          {
            [l.cityOfOrigin]: l.total,
            [l.maleCount]: municipalityMaleTotal,
            [l.femaleCount]: municipalityFemaleTotal,
            [l.graduateCount]: municipalityGenderTotal,
            [l.malePercentage]: percentOf(municipalityMaleTotal, municipalityGenderTotal),
            [l.femalePercentage]: percentOf(municipalityFemaleTotal, municipalityGenderTotal),
          },
        ]
      : genderByMunicipalityRows,
    columnKinds: {
      [l.cityOfOrigin]: "text",
      [l.maleCount]: "count",
      [l.femaleCount]: "count",
      [l.graduateCount]: "count",
      [l.malePercentage]: "percentage",
      [l.femalePercentage]: "percentage",
    },
  });

  const originCountryRows = rowsOf(data.origin_country_distribution).map((row) => {
    const count = num(row.count);
    return {
      [l.countryOfOrigin]: localizedCountryName(row, activeLang),
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

  const abroadByYearRows = rowsOf(data.abroad_by_year).map((row) => {
    const greece = num(row.greece);
    const abroad = num(row.abroad);
    const count = greece + abroad;
    return {
      [l.graduationYear]: num(row.year),
      [l.greece]: greece,
      [l.abroad]: abroad,
      [l.graduateCount]: count,
      [l.abroadPercentageByYear]: percentOf(abroad, count),
    };
  });
  const abroadByYearGreeceTotal = sumValues(data.abroad_by_year, (row) => row.greece);
  const abroadByYearAbroadTotal = sumValues(data.abroad_by_year, (row) => row.abroad);
  const abroadByYearTotal = abroadByYearGreeceTotal + abroadByYearAbroadTotal;

  sheets.set("abroadByYear", {
    chartId: "abroadByYear",
    name: activeLang === "en" ? "Greece and abroad graduates distribution by graduation year" : "Κατανομή αποφοίτων Ελλάδας και εξωτερικού ανά έτος αποφοίτησης",
    rows: abroadByYearRows.length
      ? [
          ...abroadByYearRows,
          {
            [l.graduationYear]: l.total,
            [l.greece]: abroadByYearGreeceTotal,
            [l.abroad]: abroadByYearAbroadTotal,
            [l.graduateCount]: abroadByYearTotal,
            [l.abroadPercentageByYear]: percentOf(abroadByYearAbroadTotal, abroadByYearTotal),
          },
        ]
      : abroadByYearRows,
    columnKinds: {
      [l.graduationYear]: "year",
      [l.greece]: "count",
      [l.abroad]: "count",
      [l.graduateCount]: "count",
      [l.abroadPercentageByYear]: "percentage",
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

  const durationByNomosRows = rowsOf(data.avg_years_to_degree_by_nomos).map((row) => {
    const count = num(row.count);
    return {
      [l.nomosOfOrigin]: localizedName(row, activeLang),
      [l.graduateCount]: count,
      [l.percentage]: percentOf(count, totalGraduates),
      [l.averageStudyDuration]: roundTo(row.avg_years, 2),
    };
  });
  const weightedDurationNomosTotal = durationByNomosRows.reduce((sum, row) => sum + num(row[l.graduateCount]) * num(row[l.averageStudyDuration]), 0);
  const durationNomosCountTotal = durationByNomosRows.reduce((sum, row) => sum + num(row[l.graduateCount]), 0);

  sheets.set("timeToDegreeByNomos", {
    chartId: "timeToDegreeByNomos",
    name: activeLang === "en" ? "Average Study Duration by Regional Unit" : "Μέση διάρκεια σπουδών ανά νομό καταγωγής",
    rows: durationByNomosRows.length
      ? [
          ...durationByNomosRows,
          {
            [l.nomosOfOrigin]: l.total,
            [l.graduateCount]: durationNomosCountTotal,
            [l.percentage]: durationNomosCountTotal > 0 ? 100 : 0,
            [l.averageStudyDuration]: durationNomosCountTotal > 0 ? roundTo(weightedDurationNomosTotal / durationNomosCountTotal, 2) : 0,
          },
        ]
      : durationByNomosRows,
    columnKinds: {
      [l.nomosOfOrigin]: "text",
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

  if (args.compare) {
    Object.entries(args.compare.sections).forEach(([chartId, section]) => {
      if (!section?.rows.length) return;
      sheets.set(chartId as "compare" | "compareDemographics" | "compareAcademic" | "compareGeography", {
        chartId: chartId as "compare" | "compareDemographics" | "compareAcademic" | "compareGeography",
        name: section.name,
        rows: section.rows.map((row) => ({
          [l.category]: row.metric,
          [args.compare?.rangeALabel ?? "A"]: row.a,
          [args.compare?.rangeBLabel ?? "B"]: row.b,
          [args.compare?.changeLabel ?? "Change"]: row.delta,
        })),
        columnKinds: {
          [l.category]: "text",
          [args.compare?.rangeALabel ?? "A"]: "text",
          [args.compare?.rangeBLabel ?? "B"]: "text",
          [args.compare?.changeLabel ?? "Change"]: "text",
        },
      });
    });
  }

  const selectedSet = new Set(Array.isArray(args.selectedChartIds) ? args.selectedChartIds : []);
  const blocks: SheetBlock[] = [];
  const usedChartIds = new Set<StatisticsChartId>();
  const mergeGroups = [
    {
      chartId: "byYear" as StatisticsChartId,
      chartIds: ["byYear", "gender"] as StatisticsChartId[],
      name: activeLang === "en" ? "Graduate Count and Gender by Graduation Year" : "Πλήθος και φύλο ανά έτος αποφοίτησης",
    },
    {
      chartId: "countByEntryYear" as StatisticsChartId,
      chartIds: ["countByEntryYear", "genderByEntryYear"] as StatisticsChartId[],
      name: activeLang === "en" ? "Graduate Count and Gender by Entry Year" : "Πλήθος και φύλο ανά έτος εισαγωγής",
    },
    {
      chartId: "gradeDistribution" as StatisticsChartId,
      chartIds: ["gradeDistribution", "gradeDistributionByGender"] as StatisticsChartId[],
      name: activeLang === "en" ? "Graduation Grade Distribution" : "Κατανομή βαθμολογίας αποφοίτησης",
    },
    {
      chartId: "gradeByRegion" as StatisticsChartId,
      chartIds: ["gradeByRegion", "timeToDegreeByRegion"] as StatisticsChartId[],
      name: activeLang === "en" ? "Academic Data by Region of Origin" : "Ακαδημαϊκά στοιχεία ανά περιφέρεια καταγωγής",
    },
    {
      chartId: "originRegion" as StatisticsChartId,
      chartIds: ["originRegion", "genderByRegion"] as StatisticsChartId[],
      name: activeLang === "en" ? "Geographic Distribution by Region" : "Γεωγραφική κατανομή ανά περιφέρεια",
    },
    {
      chartId: "originMunicipality" as StatisticsChartId,
      chartIds: ["originMunicipality", "genderByMunicipality"] as StatisticsChartId[],
      name: activeLang === "en" ? "Geographic Distribution by City" : "Γεωγραφική κατανομή ανά πόλη",
    },
  ];
  const mergeGroupByChartId = new Map<StatisticsChartId, (typeof mergeGroups)[number]>();

  mergeGroups.forEach((group) => {
    group.chartIds.forEach((chartId) => mergeGroupByChartId.set(chartId, group));
  });

  statisticsChartOrder.forEach((chartId) => {
    if (usedChartIds.has(chartId)) return;

    const mergeGroup = mergeGroupByChartId.get(chartId);
    if (mergeGroup) {
      if (selectedSet.size && !mergeGroup.chartIds.some((id) => selectedSet.has(id))) return;

      const groupBlocks = selectedBlocksFor(mergeGroup.chartIds, sheets, selectedSet);
      const block = groupBlocks.length > 1
        ? mergeBlocksByFirstColumn(mergeGroup.name, mergeGroup.chartId, groupBlocks)
        : groupBlocks[0];

      if (block?.rows.length) {
        blocks.push(block);
        blockChartIds(block).forEach((id) => usedChartIds.add(id));
      }
      return;
    }

    if (selectedSet.size && !selectedSet.has(chartId)) return;

    const block = sheets.get(chartId);
    if (block?.rows.length) {
      blocks.push(block);
      blockChartIds(block).forEach((id) => usedChartIds.add(id));
    }
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

function filenamePart(value: unknown) {
  return exportFilenamePart(value);
}

function rangeValue(range?: StatisticsExportRange) {
  return yearRangeFilenamePart(range?.from, range?.to);
}

function groupRangeParts(args: BuildArgs, groups: StatisticsExportGroupKey[]) {
  const labels: Record<StatisticsExportGroupKey, string> = {
    demographics: "count_gender",
    academic: "academic_data",
    geography: "geo_distribution",
    compare: "comparison",
  };
  const items = groups.map((group) => {
    const range = group === "compare" && args.compareFilenameRange ? args.compareFilenameRange : rangeValue(args.exportRanges?.[group]);
    return { group, range };
  });
  const sameRange = items.length > 0 && items.every((item) => item.range === items[0].range);
  if (sameRange && items[0]?.range) return [items[0].range];
  return items.map((item) => `${labels[item.group]}_${item.range}`);
}

export function statisticsExportGroupForChart(chartId: StatisticsChartId): StatisticsExportGroupKey {
  if (["byYear", "countByEntryYear", "birthYear", "genderTotal", "genderByEntryYear", "gender"].includes(chartId)) return "demographics";
  if (["gradeDistribution", "gradeDistributionByGender", "timeToDegreeDistribution", "gradeByYear", "gradeByRegion", "timeToDegreeByEntryYear", "timeToDegreeByRegion"].includes(chartId)) return "academic";
  if (["originRegion", "genderByRegion", "originMunicipality", "genderByMunicipality", "originCountry", "abroadShare", "abroadByYear", "timeToDegreeByNomos"].includes(chartId)) return "geography";
  return "compare";
}

export function buildStatisticsExportFilename(args: BuildArgs, format: StatisticsExportFormat) {
  const selected = Array.isArray(args.selectedChartIds) ? args.selectedChartIds.filter(Boolean) : [];
  const chartCount = selected.length;
  const allChartIds = [
    "byYear",
    "countByEntryYear",
    "birthYear",
    "genderTotal",
    "gender",
    "gradeDistribution",
    "gradeDistributionByGender",
    "timeToDegreeDistribution",
    "gradeByYear",
    "gradeByRegion",
    "timeToDegreeByEntryYear",
    "timeToDegreeByRegion",
    "originRegion",
    "genderByRegion",
    "originMunicipality",
    "genderByMunicipality",
    "originCountry",
    "abroadShare",
    "abroadByYear",
    "timeToDegreeByNomos",
    "compare",
  ] as StatisticsChartId[];
  const selectedSet = new Set(selected);
  const groups = (["demographics", "academic", "geography", "compare"] as StatisticsExportGroupKey[])
    .filter((group) => selected.some((id) => statisticsExportGroupForChart(id) === group));
  const allSelected = chartCount === allChartIds.length && allChartIds.every((id) => selectedSet.has(id));
  const scope = allSelected ? "all_categories" : groups.length === 1 ? groups[0] : groups.length > 1 ? "mixed_categories" : "selected_charts";
  const selectionParts = allSelected ? ["all", "charts"] : ["selected", chartCount, "charts"];
  return buildExportFilename("statistics", [scope, ...selectionParts, ...groupRangeParts(args, groups.length ? groups : ["demographics", "academic", "geography", "compare"])], format);
}

export function buildStatisticsPngFilename(args: BuildArgs, chartId: StatisticsChartId | null, fallbackParts: Array<string | number | null | undefined>, groupKey?: StatisticsExportGroupKey) {
  const group = groupKey ?? (chartId ? statisticsExportGroupForChart(chartId) : null);
  const rangeParts = group ? groupRangeParts(args, [group]) : [];
  const parts = [...fallbackParts, group, chartId, ...rangeParts, exportTimestamp()].map(filenamePart).filter(Boolean);
  return `${parts.join("_") || `alupla_statistics_${exportTimestamp()}`}.png`;
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
