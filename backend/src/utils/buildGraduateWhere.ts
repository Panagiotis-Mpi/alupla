import { Op, type WhereOptions } from "sequelize";
import type { Graduate } from "../models/Graduate";

type Query = Record<string, unknown>;

function str(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

function num(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function dateStr(v: unknown): string | undefined {
  return str(v); // YYYY-MM-DD
}

function like(s: string) {
  return { [Op.like]: `%${s}%` };
}

export function buildGraduateWhere(q: Query): WhereOptions<Graduate> {
  const where: WhereOptions<Graduate> = {};

  // text: exact / like
  const textPairs: Array<[string, string]> = [
    ["ad_code", "ad_code_like"],
    ["last_name", "last_name_like"],
    ["first_name", "first_name_like"],
    ["father_name", "father_name_like"],
    ["student_number", "student_number_like"],
    ["origin_municipality", "origin_municipality_like"]
  ];

  for (const [exactKey, likeKey] of textPairs) {
    const exactVal = str(q[exactKey]);
    const likeVal = str(q[likeKey]);

    if (exactVal) (where as any)[exactKey] = exactVal;
    if (likeVal) (where as any)[exactKey] = like(likeVal);
  }

  // enums / fk
  const gender = str(q["gender"]);
  if (gender === "M" || gender === "F") (where as any).gender = gender;

  const sp = num(q["study_program_id"]);
  if (sp !== undefined) (where as any).study_program_id = sp;

  const pd = num(q["program_direction_id"]);
  if (pd !== undefined) (where as any).program_direction_id = pd;

  const regionId = num(q["origin_region_id"]);
  if (regionId !== undefined) (where as any).origin_region_id = regionId;

  // numeric exact / ranges
  const degreeMin = num(q["degree_grade_min"]);
  const degreeMax = num(q["degree_grade_max"]);
  const degreeExact = num(q["degree_grade"]);
  if (degreeExact !== undefined) (where as any).degree_grade = degreeExact;
  if (degreeMin !== undefined || degreeMax !== undefined) {
    (where as any).degree_grade = {
      ...(degreeMin !== undefined ? { [Op.gte]: degreeMin } : {}),
      ...(degreeMax !== undefined ? { [Op.lte]: degreeMax } : {})
    };
  }

  const entryMin = num(q["entry_year_min"]);
  const entryMax = num(q["entry_year_max"]);
  const entryExact = num(q["entry_year"]);
  if (entryExact !== undefined) (where as any).entry_year = entryExact;
  if (entryMin !== undefined || entryMax !== undefined) {
    (where as any).entry_year = {
      ...(entryMin !== undefined ? { [Op.gte]: entryMin } : {}),
      ...(entryMax !== undefined ? { [Op.lte]: entryMax } : {})
    };
  }

  // birth_year (schema). Also accept birth_date filters by converting to year.
  const birthYearMin = num(q["birth_year_min"]);
  const birthYearMax = num(q["birth_year_max"]);
  const birthYearExact = num(q["birth_year"]);
  if (birthYearExact !== undefined) (where as any).birth_year = birthYearExact;
  if (birthYearMin !== undefined || birthYearMax !== undefined) {
    (where as any).birth_year = {
      ...(birthYearMin !== undefined ? { [Op.gte]: birthYearMin } : {}),
      ...(birthYearMax !== undefined ? { [Op.lte]: birthYearMax } : {})
    };
  }

  const birthExact = dateStr(q["birth_date"]);
  if (birthExact) {
    const y = Number(String(birthExact).slice(0, 4));
    if (Number.isFinite(y)) (where as any).birth_year = y;
  }
  const birthFrom = dateStr(q["birth_date_from"]);
  const birthTo = dateStr(q["birth_date_to"]);
  if (birthFrom || birthTo) {
    const yf = birthFrom ? Number(String(birthFrom).slice(0, 4)) : undefined;
    const yt = birthTo ? Number(String(birthTo).slice(0, 4)) : undefined;
    (where as any).birth_year = {
      ...(Number.isFinite(yf as any) ? { [Op.gte]: yf } : {}),
      ...(Number.isFinite(yt as any) ? { [Op.lte]: yt } : {})
    };
  }

  // date ranges
  const gradFrom = dateStr(q["graduation_date_from"]);
  const gradTo = dateStr(q["graduation_date_to"]);
  if (gradFrom || gradTo) {
    (where as any).graduation_date = {
      ...(gradFrom ? { [Op.gte]: gradFrom } : {}),
      ...(gradTo ? { [Op.lte]: gradTo } : {})
    };
  }

  const oathFrom = dateStr(q["oath_date_from"]);
  const oathTo = dateStr(q["oath_date_to"]);
  if (oathFrom || oathTo) {
    (where as any).oath_date = {
      ...(oathFrom ? { [Op.gte]: oathFrom } : {}),
      ...(oathTo ? { [Op.lte]: oathTo } : {})
    };
  }

  // optional global q
  const global = str(q["q"]);
  if (global) {
    (where as any)[Op.or] = [
      { last_name: like(global) },
      { first_name: like(global) },
      { father_name: like(global) },
      { student_number: like(global) },
      { ad_code: like(global) },
      { origin_municipality: like(global) }
    ];
  }

  return where;
}
