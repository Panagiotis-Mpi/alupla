import type { Request } from "express";
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

type MapScope = "greece" | "abroad";

type SqlFilter = {
  clause: string;
  replacements: Record<string, unknown>;
};

function numberValue(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function integerValue(value: unknown) {
  const parsed = numberValue(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function textValue(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function buildMapFilter(req: Request, scope: MapScope): SqlFilter {
  const query = req.query;
  const conditions = [scope === "greece" ? "rh.country_code = 'GR'" : "rh.country_code IS NOT NULL AND rh.country_code <> 'GR'"];
  const replacements: Record<string, unknown> = {};

  const addExactText = (parameter: string, column: string) => {
    const value = textValue(query[parameter]);
    if (!value) return;
    conditions.push(`${column} = :${parameter}`);
    replacements[parameter] = value;
  };
  const addLikeText = (parameter: string, column: string) => {
    const value = textValue(query[parameter]);
    if (!value) return;
    conditions.push(`${column} ILIKE :${parameter}`);
    replacements[parameter] = `%${value}%`;
  };
  const addNumberRange = (column: string, exactKey: string, minKey: string, maxKey: string) => {
    const exact = numberValue(query[exactKey]);
    const min = numberValue(query[minKey]);
    const max = numberValue(query[maxKey]);
    if (exact !== null) {
      conditions.push(`${column} = :${exactKey}`);
      replacements[exactKey] = exact;
      return;
    }
    if (min !== null) {
      conditions.push(`${column} >= :${minKey}`);
      replacements[minKey] = min;
    }
    if (max !== null) {
      conditions.push(`${column} <= :${maxKey}`);
      replacements[maxKey] = max;
    }
  };
  const addDateRange = (column: string, fromKey: string, toKey: string) => {
    const from = textValue(query[fromKey]);
    const to = textValue(query[toKey]);
    if (from) {
      conditions.push(`${column} >= :${fromKey}`);
      replacements[fromKey] = from;
    }
    if (to) {
      conditions.push(`${column} <= :${toKey}`);
      replacements[toKey] = to;
    }
  };

  addExactText("origin_municipality", "rh.city_name");
  addLikeText("origin_municipality_like", "rh.city_name");
  addExactText("origin_foreign_city", "rh.city_name");
  addLikeText("origin_foreign_city_like", "rh.city_name");
  addExactText("origin_country", "rh.country_name");
  addLikeText("origin_country_like", "rh.country_name");

  const locationFilters = [
    ["origin_region_id", "rh.periphery_id"],
    ["origin_nomos_region_id", "rh.nomos_id"],
    ["origin_country_region_id", "rh.country_id"],
    ["origin_city_region_id", "rh.city_id"],
  ] as const;
  for (const [parameter, column] of locationFilters) {
    const value = integerValue(query[parameter]);
    if (value === null) continue;
    conditions.push(`${column} = :${parameter}`);
    replacements[parameter] = value;
  }

  const studyProgramId = integerValue(query.study_program_id);
  if (studyProgramId !== null) {
    conditions.push("g.study_program_id = :studyProgramId");
    replacements.studyProgramId = studyProgramId;
  }
  const gender = textValue(query.gender);
  if (gender === "M" || gender === "F") {
    conditions.push("g.gender = :gender");
    replacements.gender = gender;
  }

  addNumberRange("g.degree_grade", "degree_grade", "degree_grade_min", "degree_grade_max");
  addNumberRange("g.entry_year", "entry_year", "entry_year_min", "entry_year_max");

  addDateRange("g.graduation_date", "graduation_date_from", "graduation_date_to");
  addDateRange("g.oath_date", "oath_date_from", "oath_date_to");

  const graduationYear = integerValue(query.graduation_year);
  const graduationYearFrom = integerValue(query.graduation_year_from);
  const graduationYearTo = integerValue(query.graduation_year_to);
  if (graduationYear !== null) {
    conditions.push("g.graduation_date BETWEEN :graduationYearStart AND :graduationYearEnd");
    replacements.graduationYearStart = `${graduationYear}-01-01`;
    replacements.graduationYearEnd = `${graduationYear}-12-31`;
  } else if (graduationYearFrom !== null || graduationYearTo !== null) {
    const first = graduationYearFrom ?? graduationYearTo;
    const last = graduationYearTo ?? graduationYearFrom;
    if (first !== null && last !== null) {
      conditions.push("g.graduation_date BETWEEN :graduationYearStart AND :graduationYearEnd");
      replacements.graduationYearStart = `${Math.min(first, last)}-01-01`;
      replacements.graduationYearEnd = `${Math.max(first, last)}-12-31`;
    }
  }

  const currentYear = new Date().getFullYear();
  const ageGroup = textValue(query.age_group);
  if (ageGroup === "23-26") {
    conditions.push("g.birth_date BETWEEN :ageBirthDateFrom AND :ageBirthDateTo");
    replacements.ageBirthDateFrom = `${currentYear - 26}-01-01`;
    replacements.ageBirthDateTo = `${currentYear - 23}-12-31`;
  } else if (ageGroup === "27-30") {
    conditions.push("g.birth_date BETWEEN :ageBirthDateFrom AND :ageBirthDateTo");
    replacements.ageBirthDateFrom = `${currentYear - 30}-01-01`;
    replacements.ageBirthDateTo = `${currentYear - 27}-12-31`;
  } else if (ageGroup === "31+") {
    conditions.push("g.birth_date BETWEEN :ageBirthDateFrom AND :ageBirthDateTo");
    replacements.ageBirthDateFrom = `${currentYear - 120}-01-01`;
    replacements.ageBirthDateTo = `${currentYear - 31}-12-31`;
  }

  return { clause: `WHERE ${conditions.join(" AND ")}`, replacements };
}

const joins = `
  FROM graduates g
  JOIN region_hierarchy rh ON rh.location_id = g.origin_location_id
  LEFT JOIN regions city_region ON city_region.id = rh.city_id
  LEFT JOIN regions nomos_region ON nomos_region.id = rh.nomos_id
  LEFT JOIN regions periphery_region ON periphery_region.id = rh.periphery_id
  LEFT JOIN regions country_region ON country_region.id = rh.country_id`;

const metricColumns = `
  CAST(COUNT(*) AS INTEGER) AS count,
  CAST(COUNT(*) FILTER (WHERE g.gender = 'M') AS INTEGER) AS male,
  CAST(COUNT(*) FILTER (WHERE g.gender = 'F') AS INTEGER) AS female,
  COALESCE(SUM(CASE WHEN g.graduation_date >= g.birth_date THEN EXTRACT(YEAR FROM age(g.graduation_date, g.birth_date)) ELSE 0 END), 0)::double precision AS age_sum,
  CAST(COUNT(*) FILTER (WHERE g.graduation_date >= g.birth_date) AS INTEGER) AS age_count,
  MIN(CASE WHEN g.graduation_date >= g.birth_date THEN EXTRACT(YEAR FROM age(g.graduation_date, g.birth_date)) END)::double precision AS min_age,
  MAX(CASE WHEN g.graduation_date >= g.birth_date THEN EXTRACT(YEAR FROM age(g.graduation_date, g.birth_date)) END)::double precision AS max_age,
  COALESCE(SUM(g.degree_grade), 0)::double precision AS grade_sum,
  CAST(COUNT(g.degree_grade) AS INTEGER) AS grade_count,
  COALESCE(SUM(CASE WHEN g.entry_year > 1900 AND EXTRACT(YEAR FROM g.graduation_date) >= g.entry_year THEN EXTRACT(YEAR FROM g.graduation_date) - g.entry_year ELSE 0 END), 0)::double precision AS graduation_duration_sum,
  CAST(COUNT(*) FILTER (WHERE g.entry_year > 1900 AND EXTRACT(YEAR FROM g.graduation_date) >= g.entry_year) AS INTEGER) AS graduation_duration_count`;

export type MapAggregateRow = {
  map_region_id: number | null;
  map_region_name: string | null;
  map_region_name_el: string | null;
  map_region_name_en: string | null;
  map_latitude: number | null;
  map_longitude: number | null;
  city_id: number | null;
  city_name: string | null;
  city_name_el: string | null;
  city_name_en: string | null;
  city_latitude: number | null;
  city_longitude: number | null;
  periphery_id: number | null;
  periphery_name: string | null;
  periphery_name_el: string | null;
  periphery_name_en: string | null;
  country_id: number | null;
  country_name: string | null;
  country_name_el: string | null;
  country_name_en: string | null;
  study_program_id: number;
  count: number;
  male: number;
  female: number;
  age_sum: number;
  age_count: number;
  min_age: number | null;
  max_age: number | null;
  grade_sum: number;
  grade_count: number;
  graduation_duration_sum: number;
  graduation_duration_count: number;
};

export async function loadMapAggregateRows(req: Request, scope: MapScope) {
  const filter = buildMapFilter(req, scope);
  return sequelize.query<MapAggregateRow>(
    `SELECT
       CASE WHEN :mapScope = 'greece' THEN rh.periphery_id ELSE rh.country_id END AS map_region_id,
       CASE WHEN :mapScope = 'greece' THEN periphery_region.name_el ELSE country_region.name_el END AS map_region_name,
       CASE WHEN :mapScope = 'greece' THEN periphery_region.name_el ELSE country_region.name_el END AS map_region_name_el,
       CASE WHEN :mapScope = 'greece' THEN COALESCE(periphery_region.name_en, periphery_region.name_el) ELSE COALESCE(country_region.name_en, country_region.name_el) END AS map_region_name_en,
       CASE WHEN :mapScope = 'greece' THEN COALESCE(periphery_region.latitude, city_region.latitude, rh.latitude, nomos_region.latitude, country_region.latitude) ELSE COALESCE(country_region.latitude, city_region.latitude, rh.latitude) END::double precision AS map_latitude,
       CASE WHEN :mapScope = 'greece' THEN COALESCE(periphery_region.longitude, city_region.longitude, rh.longitude, nomos_region.longitude, country_region.longitude) ELSE COALESCE(country_region.longitude, city_region.longitude, rh.longitude) END::double precision AS map_longitude,
       COALESCE(rh.city_id, rh.location_id) AS city_id,
       COALESCE(rh.city_name, rh.location_name) AS city_name,
       COALESCE(rh.city_name_el, rh.location_name_el, rh.city_name, rh.location_name) AS city_name_el,
       COALESCE(rh.city_name_en, rh.location_name_en, rh.city_name, rh.location_name) AS city_name_en,
       COALESCE(city_region.latitude, rh.latitude, nomos_region.latitude, periphery_region.latitude, country_region.latitude)::double precision AS city_latitude,
       COALESCE(city_region.longitude, rh.longitude, nomos_region.longitude, periphery_region.longitude, country_region.longitude)::double precision AS city_longitude,
       rh.periphery_id,
       periphery_region.name_el AS periphery_name,
       periphery_region.name_el AS periphery_name_el,
       COALESCE(periphery_region.name_en, periphery_region.name_el) AS periphery_name_en,
       rh.country_id,
       country_region.name_el AS country_name,
       country_region.name_el AS country_name_el,
       COALESCE(country_region.name_en, country_region.name_el) AS country_name_en,
       g.study_program_id,
       ${metricColumns}
     ${joins}
     ${filter.clause}
     GROUP BY
       1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
       12, 13, 14, 15, 16, 17, 18, 19, 20, 21`,
    {
      replacements: { ...filter.replacements, mapScope: scope },
      type: QueryTypes.SELECT
    }
  );
}

export async function loadMapCityYearCounts(
  req: Request,
  scope: MapScope,
  cityIds: number[],
  countryId: number | null
) {
  if (!cityIds.length) return [] as Array<{ year: number; count: number }>;
  const filter = buildMapFilter(req, scope);
  const conditions = [filter.clause.replace(/^WHERE\s+/, "")];
  conditions.push("COALESCE(rh.city_id, rh.location_id) IN (:cityIds)");
  if (scope === "abroad" && countryId) conditions.push("rh.country_id = :detailCountryId");

  return sequelize.query<{ year: number; count: number }>(
    `SELECT CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) AS year,
            CAST(COUNT(*) AS INTEGER) AS count
     ${joins}
     WHERE ${conditions.join(" AND ")}
     GROUP BY EXTRACT(YEAR FROM g.graduation_date)
     ORDER BY year ASC`,
    {
      replacements: {
        ...filter.replacements,
        cityIds,
        ...(scope === "abroad" && countryId ? { detailCountryId: countryId } : {})
      },
      type: QueryTypes.SELECT
    }
  );
}
