import { Op, Transaction } from "sequelize";
import { sequelize } from "../config/sequelize";
import { Graduate } from "../models/Graduate";
import {
  type RuleViolationCode,
  buildImportViolationSummary,
  getGraduateRuleViolations,
  getGreeceRegionId,
  isGreeceCountryValue,
  parseImportGender,
  trimNullableText,
} from "../controllers/graduates.helpers";
import {
  resolveRegionId,
  resolveStudyProgramId,
  type ProgramLookup,
  type RegionLookup,
} from "../controllers/graduates.shared";
import {
  buildForeignGraduateOriginPayload,
  buildGreekGraduateOriginPayload,
} from "./graduateOrigin.service";
import { toDateOnly, toInt, toNumber } from "../utils/importUtils";

export type ImportRowError = {
  row: number;
  column?: string;
  message: string;
  value?: any;
  details?: string[];
  violation_codes?: RuleViolationCode[];
};

export type PreparedGraduateImportRow = {
  rowNum: number;
  student_number: string;
  payload: any;
};

export type GraduateImportIndexes = {
  ad_code: number;
  student_number: number;
  last_name: number;
  first_name: number;
  father_name: number;
  gender: number;
  entry_year: number;
  birth_date: number;
  degree_grade: number;
  graduation_date: number;
  oath_date: number;
  study_program: number;
  origin_country: number;
  origin_region: number;
  origin_municipality: number;
};

type PrepareGraduateImportRowsParams = {
  rows: any[][];
  idx: GraduateImportIndexes;
  importLang: "gr" | "en";
  programsById: Map<number, ProgramLookup>;
  regionsById: Map<number, RegionLookup>;
};

function readCell(
  arr: any[],
  idx: GraduateImportIndexes,
  key: keyof GraduateImportIndexes,
) {
  return idx[key] >= 0 ? arr[idx[key]] : "";
}

function pushRequired(
  rowProblems: ImportRowError[],
  rowNum: number,
  value: string,
  column: string,
) {
  if (!value) rowProblems.push({ row: rowNum, column, message: "Required" });
}

export async function prepareGraduateImportRows(
  params: PrepareGraduateImportRowsParams,
) {
  const {
    rows,
    idx,
    importLang,
    programsById,
    regionsById,
  } = params;
  const errors: ImportRowError[] = [];
  const preparedRows: PreparedGraduateImportRow[] = [];
  const studentNumbers: string[] = [];
  let skipped = 0;
  const defaultGreeceId = getGreeceRegionId(regionsById);

  for (let r = 1; r < rows.length; r++) {
    const arr = rows[r];
    if (arr.every((v) => String(v ?? "").trim() === "")) continue;

    const rowNum = r + 1;
    const get = (key: keyof GraduateImportIndexes) => readCell(arr, idx, key);
    const getOptional = (key: string) => {
      const position = (idx as Record<string, number>)[key];
      return Number.isInteger(position) && position >= 0 ? arr[position] : "";
    };

    const student_number = String(get("student_number")).trim();
    const ad_code = String(get("ad_code")).trim();
    const last_name = String(get("last_name")).trim();
    const first_name = String(get("first_name")).trim();
    const father_name = String(get("father_name")).trim();
    const genderRaw = String(get("gender")).trim();
    const gender = parseImportGender(genderRaw);
    const entry_year = toInt(get("entry_year"));
    const graduation_date = toDateOnly(get("graduation_date"));
    const oath_date = toDateOnly(get("oath_date"));
    const degree_grade = toNumber(get("degree_grade"));
    const birth_date = toDateOnly(get("birth_date"));
    const study_program_source = get("study_program");
    const study_program_id = resolveStudyProgramId(
      study_program_source,
      programsById,
    );
    const origin_country_source = get("origin_country");
    const matchedOriginCountryRegionId =
      resolveRegionId(origin_country_source, regionsById) ?? null;
    const origin_country_name =
      trimNullableText(origin_country_source) ??
      (matchedOriginCountryRegionId
        ? String(
            regionsById.get(matchedOriginCountryRegionId)?.name ?? "",
          ).trim()
        : null);
    const is_abroad = !!(
      origin_country_name && !isGreeceCountryValue(origin_country_name)
    );
    const origin_country_region_id = is_abroad
      ? matchedOriginCountryRegionId
      : (matchedOriginCountryRegionId ?? defaultGreeceId);
    const origin_region_source = get("origin_region");
    const origin_nomos_source = getOptional("origin_nomos");
    const raw_origin_municipality = trimNullableText(
      get("origin_municipality"),
    );
    const raw_origin_region = trimNullableText(origin_region_source);
    const origin_periphery_region_id = is_abroad
      ? null
      : resolveRegionId(origin_region_source, regionsById);
    const origin_nomos_region_id = is_abroad
      ? null
      : resolveRegionId(origin_nomos_source, regionsById);
    const origin_foreign_city = is_abroad
      ? (raw_origin_municipality ?? raw_origin_region ?? null)
      : null;
    const origin_municipality = is_abroad
      ? origin_foreign_city
      : raw_origin_municipality;

    const rowProblems: ImportRowError[] = [];
    pushRequired(rowProblems, rowNum, student_number, "student_number");
    pushRequired(rowProblems, rowNum, ad_code, "ad_code");
    pushRequired(rowProblems, rowNum, last_name, "last_name");
    pushRequired(rowProblems, rowNum, first_name, "first_name");
    pushRequired(rowProblems, rowNum, father_name, "father_name");
    if (!gender)
      rowProblems.push({
        row: rowNum,
        column: "gender",
        message: "Must be M/F or Άνδρας/Γυναίκα",
        value: genderRaw,
      });
    if (!entry_year)
      rowProblems.push({
        row: rowNum,
        column: "entry_year",
        message: "Invalid integer",
        value: get("entry_year"),
      });
    if (!graduation_date)
      rowProblems.push({
        row: rowNum,
        column: "graduation_date",
        message: "Invalid date",
        value: get("graduation_date"),
      });
    if (!oath_date)
      rowProblems.push({
        row: rowNum,
        column: "oath_date",
        message: "Invalid date",
        value: get("oath_date"),
      });
    if (degree_grade === null)
      rowProblems.push({
        row: rowNum,
        column: "degree_grade",
        message: "Invalid number",
        value: get("degree_grade"),
      });
    if (!birth_date)
      rowProblems.push({
        row: rowNum,
        column: "birth_date",
        message: "Invalid date",
        value: get("birth_date"),
      });
    if (!study_program_id)
      rowProblems.push({
        row: rowNum,
        column: "study_program",
        message: "Invalid value",
        value: study_program_source,
      });
    if (!origin_country_name)
      rowProblems.push({
        row: rowNum,
        column: "origin_country",
        message: "Required",
        value: origin_country_source,
      });
    if (is_abroad) {
      if (!origin_foreign_city)
        rowProblems.push({
          row: rowNum,
          column: "origin_municipality",
          message: "Required",
          value: get("origin_municipality") || origin_region_source,
        });
    } else {
      if (!origin_country_region_id)
        rowProblems.push({
          row: rowNum,
          column: "origin_country",
          message: "Invalid value",
          value: origin_country_source,
        });
      if (
        !origin_periphery_region_id &&
        String(origin_region_source ?? "").trim()
      )
        rowProblems.push({
          row: rowNum,
          column: "origin_region",
          message: "Invalid value",
          value: origin_region_source,
        });
      if (!origin_nomos_region_id && String(origin_nomos_source ?? "").trim())
        rowProblems.push({
          row: rowNum,
          column: "origin_nomos",
          message: "Invalid value",
          value: origin_nomos_source,
        });
    }

    if (rowProblems.length) {
      errors.push(...rowProblems);
      skipped++;
      continue;
    }

    const originResult = is_abroad
      ? await buildForeignGraduateOriginPayload(
          origin_country_name,
          origin_country_region_id,
          origin_foreign_city,
        )
      : await buildGreekGraduateOriginPayload(
          {
            origin_country_region_id,
            origin_periphery_region_id,
            origin_region_id: origin_nomos_region_id,
            origin_city_region_id: null,
            origin_municipality,
          },
          regionsById,
        );
    if (originResult.error || !originResult.payload) {
      errors.push({
        row: rowNum,
        column: "origin_municipality",
        message: originResult.error ?? "Invalid origin",
        value: origin_municipality,
      });
      skipped++;
      continue;
    }

    const ruleViolations = getGraduateRuleViolations(
      { entry_year, birth_date, graduation_date, degree_grade },
      importLang,
    );
    if (ruleViolations.length) {
      errors.push({
        row: rowNum,
        column: ruleViolations.some(
          (item) => item.code === "degree_grade_out_of_range",
        )
          ? "degree_grade"
          : "graduation_date",
        message: buildImportViolationSummary(ruleViolations, importLang),
        details: ruleViolations.map((item) => item.message),
        violation_codes: ruleViolations.map((item) => item.code),
      });
      skipped++;
      continue;
    }

    preparedRows.push({
      rowNum,
      student_number,
      payload: {
        student_number,
        ad_code,
        last_name,
        first_name,
        father_name,
        gender,
        entry_year,
        graduation_date,
        oath_date,
        degree_grade,
        birth_date,
        study_program_id,
        ...originResult.payload,
      },
    });
    studentNumbers.push(student_number);
  }

  return { errors, preparedRows, studentNumbers, skipped };
}

export async function savePreparedGraduateImportRows(
  preparedRows: PreparedGraduateImportRow[],
  studentNumbers: string[],
) {
  let inserted = 0;
  let updated = 0;

  if (!preparedRows.length) return { inserted, updated };

  const existingRows = await Graduate.findAll({
    where: { student_number: { [Op.in]: Array.from(new Set(studentNumbers)) } },
    attributes: ["id", "student_number"],
  });
  const existingByStudentNumber = new Map(
    existingRows.map((item: any) => [
      String(item.student_number),
      Number(item.id),
    ]),
  );

  await sequelize.transaction(async (transaction: Transaction) => {
    for (const item of preparedRows) {
      const existingId = existingByStudentNumber.get(item.student_number);
      if (existingId) {
        await Graduate.update(item.payload, {
          where: { id: existingId },
          transaction,
        });
        updated++;
        continue;
      }
      await Graduate.create(item.payload, { transaction });
      inserted++;
    }
  });

  return { inserted, updated };
}
