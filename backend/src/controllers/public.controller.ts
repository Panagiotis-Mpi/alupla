import { Request, Response } from "express";
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/sequelize";
import { StudyProgram } from "../models/StudyProgram";
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
  return mode === "birth_date" ? "g.birth_date" : "make_date(g.birth_year, 1, 1)";
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
    if (ageGroup === "18-22") where.push(`EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 18 AND 22`);
    else if (ageGroup === "23-27") where.push(`EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 23 AND 27`);
    else if (ageGroup === "28-32") where.push(`EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 28 AND 32`);
    else if (ageGroup === "33-40") where.push(`EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 33 AND 40`);
    else if (ageGroup === "41+") where.push(`EXTRACT(YEAR FROM age(current_date, ${birthExpr})) >= 41`);
  }

  const sqlWhere = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return { sqlWhere, repl, birthExpr };
}

export async function publicStudyPrograms(_req: Request, res: Response) {
  const items = await StudyProgram.findAll({
    attributes: ["id", "code", "name_el", "name_en"],
    where: { is_active: true },
    order: [["code", "ASC"]],
  });
  res.json({ ok: true, items });
}

export async function publicStats(req: Request, res: Response) {
  try {
    const { sqlWhere, repl, birthExpr } = await buildWhere(req);

    const totalRow = await sequelize.query<{ total: number }>(
      `SELECT COUNT(*) as total FROM graduates g ${sqlWhere}`,
      { replacements: repl, type: QueryTypes.SELECT }
    );
    const total = Number(totalRow?.[0]?.total ?? 0);

    const avgRow = await sequelize.query<{ avg_age: number | null; avg_degree_grade: number | null }>(
      `SELECT AVG(EXTRACT(YEAR FROM age(current_date, ${birthExpr}))) as avg_age,
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

    const ageRows = await sequelize.query<{ label: string; count: number }>(
      `SELECT CASE
                WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 18 AND 22 THEN '18-22'
                WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 23 AND 27 THEN '23-27'
                WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 28 AND 32 THEN '28-32'
                WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 33 AND 40 THEN '33-40'
                WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) >= 41 THEN '41+'
                ELSE 'unknown'
              END as label,
              COUNT(*)::int as count
       FROM graduates g ${sqlWhere}
       GROUP BY CASE
                  WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 18 AND 22 THEN '18-22'
                  WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 23 AND 27 THEN '23-27'
                  WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 28 AND 32 THEN '28-32'
                  WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 33 AND 40 THEN '33-40'
                  WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) >= 41 THEN '41+'
                  ELSE 'unknown'
                END
       ORDER BY CASE
                  WHEN CASE
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 18 AND 22 THEN '18-22'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 23 AND 27 THEN '23-27'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 28 AND 32 THEN '28-32'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 33 AND 40 THEN '33-40'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) >= 41 THEN '41+'
                    ELSE 'unknown'
                  END = '18-22' THEN 1
                  WHEN CASE
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 18 AND 22 THEN '18-22'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 23 AND 27 THEN '23-27'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 28 AND 32 THEN '28-32'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 33 AND 40 THEN '33-40'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) >= 41 THEN '41+'
                    ELSE 'unknown'
                  END = '23-27' THEN 2
                  WHEN CASE
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 18 AND 22 THEN '18-22'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 23 AND 27 THEN '23-27'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 28 AND 32 THEN '28-32'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 33 AND 40 THEN '33-40'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) >= 41 THEN '41+'
                    ELSE 'unknown'
                  END = '28-32' THEN 3
                  WHEN CASE
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 18 AND 22 THEN '18-22'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 23 AND 27 THEN '23-27'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 28 AND 32 THEN '28-32'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 33 AND 40 THEN '33-40'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) >= 41 THEN '41+'
                    ELSE 'unknown'
                  END = '33-40' THEN 4
                  WHEN CASE
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 18 AND 22 THEN '18-22'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 23 AND 27 THEN '23-27'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 28 AND 32 THEN '28-32'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 33 AND 40 THEN '33-40'
                    WHEN EXTRACT(YEAR FROM age(current_date, ${birthExpr})) >= 41 THEN '41+'
                    ELSE 'unknown'
                  END = '41+' THEN 5
                  ELSE 99
                END`,
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
      age_groups: ageRows.filter((r) => r.label !== 'unknown'),
      avg_grade_by_year: [],
      avg_grade_by_term: [],
      degree_grade_bins: [],
      direction_by_year: [],
      direction_by_term: [],
      avg_years_to_degree_by_entry_year: [],
    });
  } catch (err) {
    console.error('[public/stats] failed', err);
    return res.status(500).json({ message: 'Stats query failed' });
  }
}

export async function publicMap(req: Request, res: Response) {
  const { sqlWhere, repl } = await buildWhere(req);

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

  res.json({ ok: true, rows });
}

export async function publicAnonymousGraduatesCsv(req: Request, res: Response) {
  const { sqlWhere, repl, birthExpr } = await buildWhere(req);

  const rows = await sequelize.query<any>(
    `SELECT
      EXTRACT(YEAR FROM g.graduation_date)::int as graduation_year,
      g.entry_year,
      ${birthExpr} as birth_date,
      g.gender,
      g.degree_grade,
      g.study_program_id,
      g.program_direction_id,
      g.origin_region_id
     FROM graduates g
     ${sqlWhere}
     ORDER BY graduation_year ASC`,
    { replacements: repl, type: QueryTypes.SELECT }
  );

  await logPublicExportAction(req, "statistics_export", "statistics", {
    format: "csv",
    graduation_year: req.query.graduation_year ?? null,
    study_program_id: req.query.study_program_id ?? null,
    gender: req.query.gender ?? null,
    age_group: req.query.age_group ?? null,
    rows: rows.length,
  });

  const headers = [
    "graduation_year",
    "entry_year",
    "birth_date",
    "gender",
    "degree_grade",
    "study_program_id",
    "program_direction_id",
    "origin_region_id",
  ];

  const esc = (v: any) => {
    const s = String(v ?? "");
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => esc(r?.[h])).join(","));
  }

  res.setHeader("Content-Type", "text/csv;charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=anonymous-graduates.csv");
  res.send(lines.join("\n"));
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
