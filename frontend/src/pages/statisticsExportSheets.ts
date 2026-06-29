import {
  appendDistributionTotal,
  blockChartIds,
  exportLabels,
  localizedCityName,
  localizedCountryName,
  localizedName,
  mergeBlocksByFirstColumn,
  num,
  percentOf,
  roundTo,
  rowsOf,
  selectedBlocksFor,
  statisticsChartOrder,
  sumValues,
  text,
  type BuildArgs,
  type SheetBlock,
  type SheetRow,
  type StatisticsChartId,
} from "./statisticsExportCore";

export function buildSheets(args: BuildArgs) {
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

  const compareSection = args.compare?.section;
  if (compareSection?.rows.length) {
    sheets.set("compare", {
      chartId: "compare",
      name: compareSection.name,
      rows: compareSection.rows.map((row) => ({
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
