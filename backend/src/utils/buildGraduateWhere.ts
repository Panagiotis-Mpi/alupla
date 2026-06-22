import { Op, literal, type WhereOptions } from "sequelize";
import { sequelize } from "../config/sequelize";
import type { Graduate } from "../models/Graduate";

type Query = Record<string, unknown>;
type GraduateWhere = WhereOptions<Graduate> & Record<string | symbol, any>;

function readString(value: unknown) {
  const normalized = value == null ? "" : String(value).trim();
  return normalized || undefined;
}

function readNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : undefined;
}

function contains(value: string) {
  return { [Op.iLike]: `%${value}%` };
}

function appendAnd(where: GraduateWhere, condition: any) {
  const current = where[Op.and];
  where[Op.and] = Array.isArray(current) ? [...current, condition] : [condition];
}

function hierarchyCondition(column: string, value: string, exact = false) {
  const escaped = sequelize.escape(exact ? value : `%${value}%`);
  const operator = exact ? "=" : "ILIKE";
  return literal(`"origin_location_id" IN (
    SELECT location_id FROM public.region_hierarchy
    WHERE COALESCE(${column}, '') ${operator} ${escaped}
  )`);
}

function setTextFilters(where: GraduateWhere, query: Query) {
  for (const field of ["ad_code", "last_name", "first_name", "father_name", "student_number"]) {
    const exact = readString(query[field]);
    const like = readString(query[`${field}_like`]);
    if (exact) where[field] = exact;
    if (like) where[field] = contains(like);
  }

  const geoFilters = [
    ["origin_municipality", "city_name"],
    ["origin_country", "country_name"],
    ["origin_foreign_city", "city_name"],
  ] as const;
  for (const [key, column] of geoFilters) {
    const exact = readString(query[key]);
    const like = readString(query[`${key}_like`]);
    if (exact) appendAnd(where, hierarchyCondition(column, exact, true));
    if (like) appendAnd(where, hierarchyCondition(column, like));
  }
}

function setLocationFilters(where: GraduateWhere, query: Query) {
  const peripheryId = readNumber(query.origin_region_id);
  const nomosId = readNumber(query.origin_nomos_region_id);
  const countryId = readNumber(query.origin_country_region_id);
  const cityId = readNumber(query.origin_city_region_id);
  if (peripheryId !== undefined) appendAnd(where, literal(`"origin_location_id" IN (SELECT location_id FROM public.region_hierarchy WHERE periphery_id = ${Math.trunc(peripheryId)})`));
  if (nomosId !== undefined) appendAnd(where, literal(`"origin_location_id" IN (SELECT location_id FROM public.region_hierarchy WHERE nomos_id = ${Math.trunc(nomosId)})`));
  if (countryId !== undefined) appendAnd(where, literal(`"origin_location_id" IN (SELECT location_id FROM public.region_hierarchy WHERE country_id = ${Math.trunc(countryId)})`));
  if (cityId !== undefined) appendAnd(where, literal(`"origin_location_id" IN (SELECT location_id FROM public.region_hierarchy WHERE city_id = ${Math.trunc(cityId)})`));
}

function setRangeOrExact(where: GraduateWhere, field: string, exact: number | undefined, min: number | undefined, max: number | undefined) {
  if (exact !== undefined) {
    where[field] = exact;
  } else if (min !== undefined || max !== undefined) {
    where[field] = {
      ...(min !== undefined ? { [Op.gte]: min } : {}),
      ...(max !== undefined ? { [Op.lte]: max } : {}),
    };
  }
}

function setDateRange(where: GraduateWhere, field: string, from?: string, to?: string) {
  if (!from && !to) return;
  where[field] = {
    ...(from ? { [Op.gte]: from } : {}),
    ...(to ? { [Op.lte]: to } : {}),
  };
}

function setBirthFilters(where: GraduateWhere, query: Query) {
  const year = readNumber(query.birth_year);
  const min = readNumber(query.birth_year_min);
  const max = readNumber(query.birth_year_max);
  if (year !== undefined) where.birth_date = { [Op.between]: [`${year}-01-01`, `${year}-12-31`] };
  else if (min !== undefined || max !== undefined) setDateRange(where, "birth_date", min !== undefined ? `${min}-01-01` : undefined, max !== undefined ? `${max}-12-31` : undefined);
  const exact = readString(query.birth_date);
  if (exact) where.birth_date = exact;
  setDateRange(where, "birth_date", readString(query.birth_date_from), readString(query.birth_date_to));
}

export function buildGraduateWhere(query: Query): WhereOptions<Graduate> {
  const where: GraduateWhere = {};
  setTextFilters(where, query);
  setLocationFilters(where, query);

  const gender = readString(query.gender);
  if (gender === "M" || gender === "F") where.gender = gender;
  const programId = readNumber(query.study_program_id);
  if (programId !== undefined) where.study_program_id = programId;

  setRangeOrExact(where, "degree_grade", readNumber(query.degree_grade), readNumber(query.degree_grade_min), readNumber(query.degree_grade_max));
  setRangeOrExact(where, "entry_year", readNumber(query.entry_year), readNumber(query.entry_year_min), readNumber(query.entry_year_max));
  setBirthFilters(where, query);
  setDateRange(where, "graduation_date", readString(query.graduation_date_from), readString(query.graduation_date_to));
  setDateRange(where, "oath_date", readString(query.oath_date_from), readString(query.oath_date_to));

  const keyword = readString(query.q);
  if (keyword) {
    where[Op.or] = [
      { last_name: contains(keyword) },
      { first_name: contains(keyword) },
      { father_name: contains(keyword) },
      { student_number: contains(keyword) },
      { ad_code: contains(keyword) },
      hierarchyCondition("COALESCE(city_name, '') || ' ' || COALESCE(nomos_name, '') || ' ' || COALESCE(periphery_name, '') || ' ' || COALESCE(country_name, '')", keyword),
    ];
  }

  return where;
}
