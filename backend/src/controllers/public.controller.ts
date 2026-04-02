import { NextFunction, Request, Response } from "express";
import { QueryTypes } from "sequelize";
import XLSX from "xlsx";
import { sequelize } from "../config/sequelize";
import { StudyProgram } from "../models/StudyProgram";
import { Region } from "../models/Region";
import { verifyToken } from "../utils/jwt";
import { logAction } from "../services/log.service";

function num(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

let graduatesBirthModeCache: "birth_date" | "birth_year" | null = null;

async function getGraduatesBirthMode(): Promise<"birth_date" | "birth_year"> {
  if (graduatesBirthModeCache) return graduatesBirthModeCache;

  const rows = await sequelize.query<{ column_name: string }>(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_name = 'graduates'
        AND column_name IN ('birth_date', 'birth_year')`,
    { type: QueryTypes.SELECT }
  );

  const cols = new Set(rows.map((r) => String(r.column_name)));
  graduatesBirthModeCache = cols.has("birth_date") ? "birth_date" : "birth_year";
  return graduatesBirthModeCache;
}

async function getBirthDateExpr(): Promise<string> {
  const mode = await getGraduatesBirthMode();
  if (mode === "birth_date") return "g.birth_date";
  return "make_date(CAST(g.birth_year AS int), 1, 1)";
}

async function getBirthYearExpr(): Promise<string> {
  const birthExpr = await getBirthDateExpr();
  return `EXTRACT(YEAR FROM ${birthExpr})::int`;
}


function normalizePlaceName(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

let regionRowsCache: Promise<any[]> | null = null;

async function loadRegionRows() {
  if (!regionRowsCache) {
    regionRowsCache = Region.findAll({
      attributes: ["id", "name", "type", "parent_id", "latitude", "longitude"],
      order: [["name", "ASC"]],
    }).then((rows) => (rows as any[]).map((row) => ({
      id: Number(row.id),
      name: String(row.name ?? ""),
      type: String(row.type ?? ""),
      parent_id: row.parent_id != null ? Number(row.parent_id) : null,
      latitude: row.latitude != null ? Number(row.latitude) : null,
      longitude: row.longitude != null ? Number(row.longitude) : null,
    })));
  }
  return regionRowsCache;
}

async function buildRegionLookup() {
  const rows = await loadRegionRows();
  const byId = new Map<number, any>();
  const cityByName = new Map<string, any>();

  for (const row of rows) {
    byId.set(row.id, row);
    if (row.type === "CITY") {
      const key = normalizePlaceName(row.name);
      if (key && !cityByName.has(key)) cityByName.set(key, row);
    }
  }

  const findPeriphery = (regionId: number | null | undefined) => {
    if (!regionId) return null;
    let current = byId.get(Number(regionId)) ?? null;
    let steps = 0;
    while (current && steps < 25) {
      steps += 1;
      if (current.type === "PERIPHERY") return current;
      if (!current.parent_id) return null;
      current = byId.get(current.parent_id) ?? null;
    }
    return null;
  };

  return { byId, cityByName, findPeriphery };
}

function getOptionalUserId(req: Request): number | null {
  const auth = req.headers.authorization;
  let token: string | null = null;

  if (typeof auth === "string" && auth.trim()) {
    const raw = auth.trim();
    token = raw.toLowerCase().startsWith("bearer ") ? raw.slice(7).trim() : raw;
  }

  if (!token && typeof req.query.token === "string" && req.query.token.trim()) {
    token = req.query.token.trim();
  }

  if (!token) return null;

  try {
    const payload: any = verifyToken(token);
    const id = Number(payload?.sub ?? payload?.userId);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

async function logPublicExportAction(
  req: Request,
  action: string,
  entityType: string,
  details?: Record<string, any>
) {
  await logAction({
    user_id: getOptionalUserId(req),
    action,
    entity_type: entityType,
    entity_id: null,
    details: details ?? null,
  });
}

async function buildWhere(req: Request) {
  const birthExpr = await getBirthDateExpr();
  const where: string[] = [];
  const repl: Record<string, any> = {};

  const graduationYear = num(req.query.graduation_year);
  const studyProgramId = num(req.query.study_program_id);
  const gender = typeof req.query.gender === "string" ? req.query.gender : "";
  const ageGroup = typeof req.query.age_group === "string" ? req.query.age_group : "";

  if (graduationYear) {
    where.push("EXTRACT(YEAR FROM g.graduation_date) = :graduationYear");
    repl.graduationYear = graduationYear;
  }
  if (studyProgramId) {
    where.push("g.study_program_id = :studyProgramId");
    repl.studyProgramId = studyProgramId;
  }
  if (gender === "M" || gender === "F") {
    where.push("g.gender = :gender");
    repl.gender = gender;
  }

  if (ageGroup) {
    if (ageGroup === "23-26") where.push(`EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 23 AND 26`);
    else if (ageGroup === "27-30") where.push(`EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 27 AND 30`);
    else if (ageGroup === "31+") where.push(`EXTRACT(YEAR FROM age(current_date, ${birthExpr})) >= 31`);
  }

  const sqlWhere = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return { sqlWhere, repl, birthExpr };
}

export async function publicStudyPrograms(_req: Request, res: Response) {
  const items = await StudyProgram.findAll({
    attributes: ["id", "code", "name_el", "name_en"],
    order: [["code", "ASC"]],
  });
  res.json({ ok: true, items });
}

export async function publicStats(req: Request, res: Response) {
  try {
    const { sqlWhere, repl, birthExpr } = await buildWhere(req);
    const birthYearExpr = await getBirthYearExpr();

    const totalRow = await sequelize.query<{ total: number }>(
      `SELECT COUNT(*) as total FROM graduates g ${sqlWhere}`,
      { replacements: repl, type: QueryTypes.SELECT }
    );
    const total = Number(totalRow?.[0]?.total ?? 0);

    const avgRow = await sequelize.query<{ avg_age: number | null; avg_degree_grade: number | null }>(
      `SELECT AVG(EXTRACT(YEAR FROM age(g.graduation_date, ${birthExpr}))) as avg_age,
              AVG(g.degree_grade) as avg_degree_grade
       FROM graduates g ${sqlWhere}`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const byYear = await sequelize.query<{ year: number; count: number }>(
      `SELECT EXTRACT(YEAR FROM g.graduation_date)::int as year,
              COUNT(*)::int as count
       FROM graduates g ${sqlWhere}
       GROUP BY EXTRACT(YEAR FROM g.graduation_date)
       ORDER BY year ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const byTerm = await sequelize.query<{ year: number; term: string; count: number }>(
      `SELECT EXTRACT(YEAR FROM g.graduation_date)::int as year,
              CASE
                WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
                WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
                WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
                ELSE 'other'
              END as term,
              COUNT(*)::int as count
       FROM graduates g ${sqlWhere}
       GROUP BY EXTRACT(YEAR FROM g.graduation_date),
                CASE
                  WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
                  WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
                  WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
                  ELSE 'other'
                END
       ORDER BY year ASC,
                CASE
                  WHEN CASE
                    WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
                    WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
                    WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
                    ELSE 'other'
                  END = 'winter' THEN 1
                  WHEN CASE
                    WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
                    WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
                    WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
                    ELSE 'other'
                  END = 'spring' THEN 2
                  WHEN CASE
                    WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
                    WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
                    WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
                    ELSE 'other'
                  END = 'september' THEN 3
                  ELSE 99
                END ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const genderRows = await sequelize.query<{ gender: string; count: number }>(
      `SELECT g.gender as gender, COUNT(*)::int as count
       FROM graduates g ${sqlWhere}
       GROUP BY g.gender`,
      { replacements: repl, type: QueryTypes.SELECT }
    );
    const gender = { M: 0, F: 0 };
    for (const r of genderRows) {
      if (r.gender === 'M') gender.M = Number(r.count);
      if (r.gender === 'F') gender.F = Number(r.count);
    }

    const genderByYear = await sequelize.query<{ year: number; male: number; female: number }>(
      `SELECT EXTRACT(YEAR FROM g.graduation_date)::int as year,
              SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END)::int as male,
              SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END)::int as female
       FROM graduates g ${sqlWhere}
       GROUP BY EXTRACT(YEAR FROM g.graduation_date)
       ORDER BY year ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const genderByTerm = await sequelize.query<{ year: number; term: string; male: number; female: number }>(
      `SELECT EXTRACT(YEAR FROM g.graduation_date)::int as year,
              CASE
                WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
                WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
                WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
                ELSE 'other'
              END as term,
              SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END)::int as male,
              SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END)::int as female
       FROM graduates g ${sqlWhere}
       GROUP BY EXTRACT(YEAR FROM g.graduation_date),
                CASE
                  WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
                  WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
                  WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
                  ELSE 'other'
                END
       ORDER BY year ASC,
                CASE
                  WHEN CASE
                    WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
                    WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
                    WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
                    ELSE 'other'
                  END = 'winter' THEN 1
                  WHEN CASE
                    WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
                    WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
                    WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
                    ELSE 'other'
                  END = 'spring' THEN 2
                  WHEN CASE
                    WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
                    WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
                    WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
                    ELSE 'other'
                  END = 'september' THEN 3
                  ELSE 99
                END ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const birthYearRows = await sequelize.query<{ year: number; count: number }>(
      `SELECT ${birthYearExpr} as year,
              COUNT(*)::int as count
       FROM graduates g ${sqlWhere}
       GROUP BY ${birthYearExpr}
       ORDER BY year ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const ageRows = await sequelize.query<{ label: string; count: number }>(
      `SELECT CASE
                WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 23 AND 26 THEN '23-26'
                WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 27 AND 30 THEN '27-30'
                WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) >= 31 THEN '31+'
                ELSE 'unknown'
              END as label,
              COUNT(*)::int as count
       FROM graduates g ${sqlWhere}
       GROUP BY CASE
                  WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 23 AND 26 THEN '23-26'
                  WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 27 AND 30 THEN '27-30'
                  WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) >= 31 THEN '31+'
                  ELSE 'unknown'
                END
       ORDER BY CASE
                  WHEN CASE
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 23 AND 26 THEN '23-26'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 27 AND 30 THEN '27-30'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) >= 31 THEN '31+'
                    ELSE 'unknown'
                  END = '23-26' THEN 1
                  WHEN CASE
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 23 AND 26 THEN '23-26'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 27 AND 30 THEN '27-30'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) >= 31 THEN '31+'
                    ELSE 'unknown'
                  END = '27-30' THEN 2
                  WHEN CASE
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 23 AND 26 THEN '23-26'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 27 AND 30 THEN '27-30'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) >= 31 THEN '31+'
                    ELSE 'unknown'
                  END = '31+' THEN 3
                  ELSE 99
                END`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const avgGradeByYear = await sequelize.query<{ year: number; avg: number }>(
      `SELECT EXTRACT(YEAR FROM g.graduation_date)::int as year,
              ROUND(AVG(g.degree_grade)::numeric, 2) as avg
       FROM graduates g ${sqlWhere}
       GROUP BY EXTRACT(YEAR FROM g.graduation_date)
       ORDER BY year ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const avgGradeByProgram = await sequelize.query<{ id: number | null; name_el: string | null; name_en: string | null; avg: number }>(
      `SELECT sp.id as id,
              sp.name_el as name_el,
              sp.name_en as name_en,
              ROUND(AVG(g.degree_grade)::numeric, 2) as avg
       FROM graduates g
       LEFT JOIN study_programs sp ON sp.id = g.study_program_id
       ${sqlWhere}
       GROUP BY sp.id, sp.name_el, sp.name_en
       ORDER BY avg DESC, sp.name_el ASC, sp.name_en ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const genderByProgram = await sequelize.query<{ id: number | null; name_el: string | null; name_en: string | null; male: number; female: number }>(
      `SELECT sp.id as id,
              sp.name_el as name_el,
              sp.name_en as name_en,
              SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END)::int as male,
              SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END)::int as female
       FROM graduates g
       LEFT JOIN study_programs sp ON sp.id = g.study_program_id
       ${sqlWhere}
       GROUP BY sp.id, sp.name_el, sp.name_en
       ORDER BY (SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END) + SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END)) DESC,
                sp.name_el ASC,
                sp.name_en ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const degreeGradeBins = await sequelize.query<{ label: string; count: number }>(
      `SELECT CASE
                WHEN g.degree_grade < 5 THEN '<5'
                WHEN g.degree_grade < 6 THEN '5-5.99'
                WHEN g.degree_grade < 7 THEN '6-6.99'
                WHEN g.degree_grade < 8 THEN '7-7.99'
                WHEN g.degree_grade < 9 THEN '8-8.99'
                ELSE '9-10'
              END as label,
              COUNT(*)::int as count
       FROM graduates g ${sqlWhere}
       GROUP BY CASE
                  WHEN g.degree_grade < 5 THEN '<5'
                  WHEN g.degree_grade < 6 THEN '5-5.99'
                  WHEN g.degree_grade < 7 THEN '6-6.99'
                  WHEN g.degree_grade < 8 THEN '7-7.99'
                  WHEN g.degree_grade < 9 THEN '8-8.99'
                  ELSE '9-10'
                END
       ORDER BY CASE
                  WHEN CASE
                    WHEN g.degree_grade < 5 THEN '<5'
                    WHEN g.degree_grade < 6 THEN '5-5.99'
                    WHEN g.degree_grade < 7 THEN '6-6.99'
                    WHEN g.degree_grade < 8 THEN '7-7.99'
                    WHEN g.degree_grade < 9 THEN '8-8.99'
                    ELSE '9-10'
                  END = '<5' THEN 1
                  WHEN CASE
                    WHEN g.degree_grade < 5 THEN '<5'
                    WHEN g.degree_grade < 6 THEN '5-5.99'
                    WHEN g.degree_grade < 7 THEN '6-6.99'
                    WHEN g.degree_grade < 8 THEN '7-7.99'
                    WHEN g.degree_grade < 9 THEN '8-8.99'
                    ELSE '9-10'
                  END = '5-5.99' THEN 2
                  WHEN CASE
                    WHEN g.degree_grade < 5 THEN '<5'
                    WHEN g.degree_grade < 6 THEN '5-5.99'
                    WHEN g.degree_grade < 7 THEN '6-6.99'
                    WHEN g.degree_grade < 8 THEN '7-7.99'
                    WHEN g.degree_grade < 9 THEN '8-8.99'
                    ELSE '9-10'
                  END = '6-6.99' THEN 3
                  WHEN CASE
                    WHEN g.degree_grade < 5 THEN '<5'
                    WHEN g.degree_grade < 6 THEN '5-5.99'
                    WHEN g.degree_grade < 7 THEN '6-6.99'
                    WHEN g.degree_grade < 8 THEN '7-7.99'
                    WHEN g.degree_grade < 9 THEN '8-8.99'
                    ELSE '9-10'
                  END = '7-7.99' THEN 4
                  WHEN CASE
                    WHEN g.degree_grade < 5 THEN '<5'
                    WHEN g.degree_grade < 6 THEN '5-5.99'
                    WHEN g.degree_grade < 7 THEN '6-6.99'
                    WHEN g.degree_grade < 8 THEN '7-7.99'
                    WHEN g.degree_grade < 9 THEN '8-8.99'
                    ELSE '9-10'
                  END = '8-8.99' THEN 5
                  ELSE 6
                END`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const studyProgramDistribution = await sequelize.query<{ id: number; name_el: string | null; name_en: string | null; count: number }>(
      `SELECT sp.id as id,
              sp.name_el as name_el,
              sp.name_en as name_en,
              COUNT(*)::int as count
       FROM graduates g
       LEFT JOIN study_programs sp ON sp.id = g.study_program_id
       ${sqlWhere}
       GROUP BY sp.id, sp.name_el, sp.name_en
       ORDER BY count DESC, sp.name_el ASC, sp.name_en ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const directionDistribution = await sequelize.query<{ id: number | null; study_program_id: number | null; name_el: string | null; name_en: string | null; count: number }>(
      `SELECT pd.id as id,
              pd.study_program_id as study_program_id,
              pd.name_el as name_el,
              pd.name_en as name_en,
              COUNT(*)::int as count
       FROM graduates g
       LEFT JOIN program_directions pd ON pd.id = g.program_direction_id
       ${sqlWhere}
       GROUP BY pd.id, pd.study_program_id, pd.name_el, pd.name_en
       ORDER BY count DESC, pd.name_el ASC, pd.name_en ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const originRegionDistribution = await sequelize.query<{ id: number | null; name_el: string | null; name_en: string | null; count: number }>(
      `SELECT r.id as id,
              r.name as name_el,
              r.name as name_en,
              COUNT(*)::int as count
       FROM graduates g
       LEFT JOIN regions r ON r.id = g.origin_region_id
       ${sqlWhere}
       GROUP BY r.id, r.name
       ORDER BY count DESC, r.name ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const municipalityWhere = sqlWhere
      ? `${sqlWhere} AND g.origin_municipality IS NOT NULL AND btrim(g.origin_municipality) <> ''`
      : `WHERE g.origin_municipality IS NOT NULL AND btrim(g.origin_municipality) <> ''`;

    const rawOriginMunicipalityDistribution = await sequelize.query<{ name: string; count: number }>(
      `SELECT g.origin_municipality as name,
              COUNT(*)::int as count
       FROM graduates g ${municipalityWhere}
       GROUP BY g.origin_municipality
       ORDER BY count DESC, g.origin_municipality ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const { cityByName } = await buildRegionLookup();
    const municipalityGroups = new Map<string, { name: string; count: number }>();
    for (const row of rawOriginMunicipalityDistribution) {
      const rawName = String(row.name ?? "").trim();
      if (!rawName) continue;
      const canonical = cityByName.get(normalizePlaceName(rawName));
      const label = canonical ? String(canonical.name) : rawName;
      const key = normalizePlaceName(label);
      const current = municipalityGroups.get(key) ?? { name: label, count: 0 };
      current.count += Number(row.count) || 0;
      municipalityGroups.set(key, current);
    }

    const originMunicipalityDistribution = Array.from(municipalityGroups.values())
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name, "el");
      });

    const oathYearDistribution = await sequelize.query<{ year: number; count: number }>(
      `SELECT EXTRACT(YEAR FROM g.oath_date)::int as year,
              COUNT(*)::int as count
       FROM graduates g ${sqlWhere}
       GROUP BY EXTRACT(YEAR FROM g.oath_date)
       ORDER BY year ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const avgYearsToDegreeByEntryYear = await sequelize.query<{ entry_year: number; avg_years: number }>(
      `SELECT g.entry_year::int as entry_year,
              ROUND(AVG(EXTRACT(YEAR FROM g.graduation_date) - g.entry_year)::numeric, 2) as avg_years
       FROM graduates g ${sqlWhere}
       GROUP BY g.entry_year
       ORDER BY entry_year ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const yearsToDegreeDistributionWhere = sqlWhere
      ? `${sqlWhere} AND g.graduation_date IS NOT NULL`
      : 'WHERE g.graduation_date IS NOT NULL';

    const yearsToDegreeDistribution = await sequelize.query<{ label: string; count: number }>(
      `SELECT (EXTRACT(YEAR FROM g.graduation_date)::int - g.entry_year)::text as label,
              COUNT(*)::int as count
       FROM graduates g ${yearsToDegreeDistributionWhere}
       GROUP BY (EXTRACT(YEAR FROM g.graduation_date)::int - g.entry_year)
       ORDER BY (EXTRACT(YEAR FROM g.graduation_date)::int - g.entry_year) ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    res.json({
      ok: true,
      total,
      avg_age: avgRow?.[0]?.avg_age ?? null,
      avg_degree_grade: avgRow?.[0]?.avg_degree_grade ?? null,
      by_year: byYear,
      by_term: byTerm.filter((r) => r.term !== 'other'),
      gender,
      gender_by_year: genderByYear,
      gender_by_term: genderByTerm.filter((r) => r.term !== 'other'),
      birth_years: birthYearRows,
      birth_year_distribution: birthYearRows,
      age_groups: ageRows.filter((r) => r.label !== 'unknown'),
      avg_grade_by_year: avgGradeByYear,
      avg_grade_by_program: avgGradeByProgram.filter((r) => r.id !== null),
      avg_grade_by_term: [],
      degree_grade_bins: degreeGradeBins,
      study_program_distribution: studyProgramDistribution.filter((r) => r.id !== null),
      gender_by_program: genderByProgram.filter((r) => r.id !== null),
      direction_distribution: directionDistribution.map((r) => ({
        ...r,
        name_el: r.name_el ?? 'Χωρίς κατεύθυνση',
        name_en: r.name_en ?? 'No direction',
      })),
      origin_region_distribution: originRegionDistribution.map((r) => ({
        ...r,
        name_el: r.name_el ?? 'Άγνωστη περιοχή',
        name_en: r.name_en ?? 'Unknown region',
      })),
      origin_municipality_distribution: originMunicipalityDistribution,
      oath_year_distribution: oathYearDistribution,
      direction_by_year: [],
      direction_by_term: [],
      avg_years_to_degree_by_entry_year: avgYearsToDegreeByEntryYear,
      years_to_degree_distribution: yearsToDegreeDistribution,
    });
  } catch (err) {
    console.error('[public/stats] failed', err);
    return res.status(500).json({ message: 'Stats query failed' });
  }
}

export async function publicMap(req: Request, res: Response) {
  const { sqlWhere, repl } = await buildWhere(req);
  const { byId, findPeriphery } = await buildRegionLookup();

  const rows = await sequelize.query<any>(
    `SELECT
        g.origin_region_id as region_id,
        COALESCE(r.name, 'Unknown') as region_name,
        r.type as region_type,
        COUNT(*) as count,
        SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END) as male,
        SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END) as female
     FROM graduates g
     LEFT JOIN regions r ON r.id = g.origin_region_id
     ${sqlWhere}
     GROUP BY g.origin_region_id, r.name, r.type
     ORDER BY count DESC, region_name ASC`,
    { replacements: repl, type: QueryTypes.SELECT }
  );

  const items = rows.map((row) => {
    const regionId = Number(row.region_id) || null;
    const rawRegion = regionId ? byId.get(regionId) ?? null : null;
    const periphery = rawRegion ? findPeriphery(regionId) : null;
    const region = periphery ?? rawRegion;
    return {
      region_id: region ? Number(region.id) : regionId,
      region_name: region ? String(region.name) : String(row.region_name ?? 'Unknown'),
      region_type: region ? String(region.type) : String(row.region_type ?? 'UNKNOWN'),
      latitude: region?.latitude ?? null,
      longitude: region?.longitude ?? null,
      count: Number(row.count) || 0,
      male: Number(row.male) || 0,
      female: Number(row.female) || 0,
    };
  });

  res.json({ ok: true, rows: items });
}

export async function publicAnonymousGraduatesCsv(req: Request, res: Response) {
  const { sqlWhere, repl } = await buildWhere(req);
  const countsMode = req.query.counts_mode === "semester" ? "semester" : "year";
  const genderMode = req.query.gender_mode === "semester" ? "semester" : "year";

  const byYear = await sequelize.query<{ year: number; count: number }>(
    `SELECT EXTRACT(YEAR FROM g.graduation_date)::int as year,
            COUNT(*)::int as count
     FROM graduates g ${sqlWhere}
     GROUP BY EXTRACT(YEAR FROM g.graduation_date)
     ORDER BY year ASC`,
    { replacements: repl, type: QueryTypes.SELECT }
  );

  const byTerm = await sequelize.query<{ year: number; term: string; count: number }>(
    `SELECT EXTRACT(YEAR FROM g.graduation_date)::int as year,
            CASE
              WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
              WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
              WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
              ELSE 'other'
            END as term,
            COUNT(*)::int as count
     FROM graduates g ${sqlWhere}
     GROUP BY EXTRACT(YEAR FROM g.graduation_date),
              CASE
                WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
                WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
                WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
                ELSE 'other'
              END
     ORDER BY year ASC,
              CASE
                WHEN CASE
                  WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
                  WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
                  WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
                  ELSE 'other'
                END = 'winter' THEN 1
                WHEN CASE
                  WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
                  WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
                  WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
                  ELSE 'other'
                END = 'spring' THEN 2
                WHEN CASE
                  WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
                  WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
                  WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
                  ELSE 'other'
                END = 'september' THEN 3
                ELSE 99
              END ASC`,
    { replacements: repl, type: QueryTypes.SELECT }
  );

  const genderByYear = await sequelize.query<{ year: number; male: number; female: number }>(
    `SELECT EXTRACT(YEAR FROM g.graduation_date)::int as year,
            SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END)::int as male,
            SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END)::int as female
     FROM graduates g ${sqlWhere}
     GROUP BY EXTRACT(YEAR FROM g.graduation_date)
     ORDER BY year ASC`,
    { replacements: repl, type: QueryTypes.SELECT }
  );

  const genderByTerm = await sequelize.query<{ year: number; term: string; male: number; female: number }>(
    `SELECT EXTRACT(YEAR FROM g.graduation_date)::int as year,
            CASE
              WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
              WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
              WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
              ELSE 'other'
            END as term,
            SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END)::int as male,
            SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END)::int as female
     FROM graduates g ${sqlWhere}
     GROUP BY EXTRACT(YEAR FROM g.graduation_date),
              CASE
                WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
                WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
                WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
                ELSE 'other'
              END
     ORDER BY year ASC,
              CASE
                WHEN CASE
                  WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
                  WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
                  WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
                  ELSE 'other'
                END = 'winter' THEN 1
                WHEN CASE
                  WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
                  WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
                  WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
                  ELSE 'other'
                END = 'spring' THEN 2
                WHEN CASE
                  WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
                  WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
                  WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
                  ELSE 'other'
                END = 'september' THEN 3
                ELSE 99
              END ASC`,
    { replacements: repl, type: QueryTypes.SELECT }
  );

  const termLabel = (term: string) => {
    if (term === "winter") return "Χειμερινό";
    if (term === "spring") return "Εαρινό";
    if (term === "september") return "Σεπτέμβριος";
    return term;
  };

  const countsRows = countsMode === "semester"
    ? byTerm.filter((r) => r.term !== "other").map((r) => ({
        "Έτος": Number(r.year),
        "Εξάμηνο": termLabel(String(r.term)),
        "Πλήθος αποφοίτων": Number(r.count) || 0,
      }))
    : byYear.map((r) => ({
        "Έτος": Number(r.year),
        "Πλήθος αποφοίτων": Number(r.count) || 0,
      }));

  const genderRows = genderMode === "semester"
    ? genderByTerm.filter((r) => r.term !== "other").map((r) => ({
        "Έτος": Number(r.year),
        "Εξάμηνο": termLabel(String(r.term)),
        "Άνδρες": Number(r.male) || 0,
        "Γυναίκες": Number(r.female) || 0,
      }))
    : genderByYear.map((r) => ({
        "Έτος": Number(r.year),
        "Άνδρες": Number(r.male) || 0,
        "Γυναίκες": Number(r.female) || 0,
      }));

  const workbook = XLSX.utils.book_new();
  const countsSheet = XLSX.utils.json_to_sheet(countsRows);
  const genderSheet = XLSX.utils.json_to_sheet(genderRows);
  XLSX.utils.book_append_sheet(workbook, countsSheet, "Πλήθος αποφοίτων");
  XLSX.utils.book_append_sheet(workbook, genderSheet, "Αναλογία φύλων");

  await logPublicExportAction(req, "statistics_export", "statistics", {
    format: "xls",
    graduation_year: req.query.graduation_year ?? null,
    study_program_id: req.query.study_program_id ?? null,
    gender: req.query.gender ?? null,
    age_group: req.query.age_group ?? null,
    counts_mode: countsMode,
    gender_mode: genderMode,
    rows: countsRows.length + genderRows.length,
  });

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xls" });
  res.setHeader("Content-Type", "application/vnd.ms-excel");
  res.setHeader("Content-Disposition", 'attachment; filename="statistics-export.xls"');
  res.send(buffer);
}

export async function publicExportActivity(req: Request, res: Response) {
  const action = typeof req.body?.action === "string" ? req.body.action : "";
  const format = typeof req.body?.format === "string" ? req.body.format : null;

  if (action !== "map_export" && action !== "statistics_export") {
    return res.status(400).json({ ok: false, message: "Invalid action" });
  }

  const entityType = action === "map_export" ? "map" : "statistics";
  await logPublicExportAction(req, action, entityType, { format });
  return res.json({ ok: true });
}
