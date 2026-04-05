import { Op, type WhereOptions } from "sequelize";
import type { Graduate } from "../models/Graduate";

type Query = Record<string, unknown>;
type GraduateWhere = WhereOptions<Graduate> & Record<string | symbol, unknown>;

type TextFilterPair = {
  field: string;
  exactKey: string;
  likeKey: string;
};

function readString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : undefined;
}

function contains(value: string) {
  return { [Op.like]: `%${value}%` };
}

function setTextFilters(where: GraduateWhere, query: Query) {
  const pairs: TextFilterPair[] = [
    { field: "ad_code", exactKey: "ad_code", likeKey: "ad_code_like" },
    { field: "last_name", exactKey: "last_name", likeKey: "last_name_like" },
    { field: "first_name", exactKey: "first_name", likeKey: "first_name_like" },
    { field: "father_name", exactKey: "father_name", likeKey: "father_name_like" },
    { field: "student_number", exactKey: "student_number", likeKey: "student_number_like" },
    { field: "origin_municipality", exactKey: "origin_municipality", likeKey: "origin_municipality_like" },
    { field: "origin_foreign_country", exactKey: "origin_foreign_country", likeKey: "origin_foreign_country_like" },
    { field: "origin_foreign_city", exactKey: "origin_foreign_city", likeKey: "origin_foreign_city_like" }
  ];

  for (const pair of pairs) {
    const exactValue = readString(query[pair.exactKey]);
    const likeValue = readString(query[pair.likeKey]);

    if (exactValue) where[pair.field] = exactValue;
    if (likeValue) where[pair.field] = contains(likeValue);
  }
}

function setEnumAndForeignKeyFilters(where: GraduateWhere, query: Query) {
  const gender = readString(query.gender);
  if (gender === "M" || gender === "F") {
    where.gender = gender;
  }

  const originType = readString(query.origin_type);
  if (originType === "greece" || originType === "abroad") {
    where.origin_type = originType;
  }

  const studyProgramId = readNumber(query.study_program_id);
  if (studyProgramId !== undefined) {
    where.study_program_id = studyProgramId;
  }

  const programDirectionId = readNumber(query.program_direction_id);
  if (programDirectionId !== undefined) {
    where.program_direction_id = programDirectionId;
  }

  const originRegionId = readNumber(query.origin_region_id);
  if (originRegionId !== undefined) {
    where.origin_region_id = originRegionId;
  }
}

function setRangeOrExact(
  where: GraduateWhere,
  field: string,
  exactValue: number | undefined,
  minValue: number | undefined,
  maxValue: number | undefined
) {
  if (exactValue !== undefined) {
    where[field] = exactValue;
  }

  if (minValue === undefined && maxValue === undefined) {
    return;
  }

  where[field] = {
    ...(minValue !== undefined ? { [Op.gte]: minValue } : {}),
    ...(maxValue !== undefined ? { [Op.lte]: maxValue } : {})
  };
}

function setDateRange(where: GraduateWhere, field: string, from: string | undefined, to: string | undefined) {
  if (!from && !to) {
    return;
  }

  where[field] = {
    ...(from ? { [Op.gte]: from } : {}),
    ...(to ? { [Op.lte]: to } : {})
  };
}

function setNumericFilters(where: GraduateWhere, query: Query) {
  setRangeOrExact(
    where,
    "degree_grade",
    readNumber(query.degree_grade),
    readNumber(query.degree_grade_min),
    readNumber(query.degree_grade_max)
  );

  setRangeOrExact(
    where,
    "entry_year",
    readNumber(query.entry_year),
    readNumber(query.entry_year_min),
    readNumber(query.entry_year_max)
  );
}

function setBirthDateFilters(where: GraduateWhere, query: Query) {
  const exactBirthYear = readNumber(query.birth_year);
  const birthYearMin = readNumber(query.birth_year_min);
  const birthYearMax = readNumber(query.birth_year_max);

  if (exactBirthYear !== undefined) {
    where.birth_date = {
      [Op.between]: [`${exactBirthYear}-01-01`, `${exactBirthYear}-12-31`]
    };
  } else if (birthYearMin !== undefined || birthYearMax !== undefined) {
    setDateRange(
      where,
      "birth_date",
      birthYearMin !== undefined ? `${birthYearMin}-01-01` : undefined,
      birthYearMax !== undefined ? `${birthYearMax}-12-31` : undefined
    );
  }

  const exactBirthDate = readString(query.birth_date);
  if (exactBirthDate) {
    where.birth_date = exactBirthDate;
  }

  setDateRange(where, "birth_date", readString(query.birth_date_from), readString(query.birth_date_to));
}

function setDateFilters(where: GraduateWhere, query: Query) {
  setDateRange(where, "graduation_date", readString(query.graduation_date_from), readString(query.graduation_date_to));
  setDateRange(where, "oath_date", readString(query.oath_date_from), readString(query.oath_date_to));
}

function setGlobalSearch(where: GraduateWhere, query: Query) {
  const keyword = readString(query.q);
  if (!keyword) {
    return;
  }

  where[Op.or] = [
    { last_name: contains(keyword) },
    { first_name: contains(keyword) },
    { father_name: contains(keyword) },
    { student_number: contains(keyword) },
    { ad_code: contains(keyword) },
    { origin_municipality: contains(keyword) },
    { origin_foreign_country: contains(keyword) },
    { origin_foreign_city: contains(keyword) }
  ];
}

export function buildGraduateWhere(query: Query): WhereOptions<Graduate> {
  const where: GraduateWhere = {};

  setTextFilters(where, query);
  setEnumAndForeignKeyFilters(where, query);
  setNumericFilters(where, query);
  setBirthDateFilters(where, query);
  setDateFilters(where, query);
  setGlobalSearch(where, query);

  return where;
}
