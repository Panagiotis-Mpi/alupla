import { Request, Response } from "express";
import { Op, QueryTypes } from "sequelize";
import { sequelize } from "../config/sequelize";
import { StudyProgram } from "../models/StudyProgram";

function num(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildWhere(req: Request) {
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

  // Age group based on years since birth_date
  // Supported values: 18-22, 23-27, 28-32, 33-40, 41+
  if (ageGroup) {
    if (ageGroup === "18-22") where.push("EXTRACT(YEAR FROM age(current_date, g.birth_date)) BETWEEN 18 AND 22");
    else if (ageGroup === "23-27") where.push("EXTRACT(YEAR FROM age(current_date, g.birth_date)) BETWEEN 23 AND 27");
    else if (ageGroup === "28-32") where.push("EXTRACT(YEAR FROM age(current_date, g.birth_date)) BETWEEN 28 AND 32");
    else if (ageGroup === "33-40") where.push("EXTRACT(YEAR FROM age(current_date, g.birth_date)) BETWEEN 33 AND 40");
    else if (ageGroup === "41+") where.push("EXTRACT(YEAR FROM age(current_date, g.birth_date)) >= 41");
  }

  const sqlWhere = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return { sqlWhere, repl };
}

export async function publicStudyPrograms(_req: Request, res: Response) {
  const items = await StudyProgram.findAll({
    attributes: ["id", "code", "name_el", "name_en"],
    where: { is_active: true },
    order: [["code", "ASC"]]
  });
  res.json({ ok: true, items });
}

export async function publicStats(req: Request, res: Response) {
  try {
const { sqlWhere, repl } = buildWhere(req);

  const totalRow = await sequelize.query<{ total: number }>(
    `SELECT COUNT(*) as total FROM graduates g ${sqlWhere}`,
    { replacements: repl, type: QueryTypes.SELECT }
  );
  const total = Number(totalRow?.[0]?.total ?? 0);

  const avgRow = await sequelize.query<{ avg_age: number | null; avg_degree_grade: number | null }>(
    `SELECT AVG(EXTRACT(YEAR FROM age(current_date, g.birth_date))) as avg_age, AVG(g.degree_grade) as avg_degree_grade
     FROM graduates g ${sqlWhere}`,
    { replacements: repl, type: QueryTypes.SELECT }
  );

  const byYear = await sequelize.query<{ year: number; count: number }>(
    `SELECT EXTRACT(YEAR FROM g.graduation_date)::int as year, COUNT(*) as count
     FROM graduates g ${sqlWhere}
     GROUP BY EXTRACT(YEAR FROM g.graduation_date)
     ORDER BY year ASC`,
    { replacements: repl, type: QueryTypes.SELECT }
  );

  const genderRows = await sequelize.query<{ gender: string; count: number }>(
    `SELECT g.gender as gender, COUNT(*) as count
     FROM graduates g ${sqlWhere}
     GROUP BY g.gender`,
    { replacements: repl, type: QueryTypes.SELECT }
  );
  const gender = { M: 0, F: 0 };
  for (const r of genderRows) {
    if (r.gender === "M") gender.M = Number(r.count);
    if (r.gender === "F") gender.F = Number(r.count);
  }
  const ageRows = await sequelize.query<{ label: string; count: number }>(
    `SELECT
      CASE
        WHEN EXTRACT(YEAR FROM age(current_date, g.birth_date)) BETWEEN 18 AND 22 THEN '18-22'
        WHEN EXTRACT(YEAR FROM age(current_date, g.birth_date)) BETWEEN 23 AND 27 THEN '23-27'
        WHEN EXTRACT(YEAR FROM age(current_date, g.birth_date)) BETWEEN 28 AND 32 THEN '28-32'
        WHEN EXTRACT(YEAR FROM age(current_date, g.birth_date)) BETWEEN 33 AND 40 THEN '33-40'
        WHEN EXTRACT(YEAR FROM age(current_date, g.birth_date)) >= 41 THEN '41+'
        ELSE 'unknown'
      END as label,
      COUNT(*) as count
     FROM graduates g ${sqlWhere}
     GROUP BY label
     ORDER BY
       CASE label
         WHEN '18-22' THEN 1
         WHEN '23-27' THEN 2
         WHEN '28-32' THEN 3
         WHEN '33-40' THEN 4
         WHEN '41+' THEN 5
         ELSE 99
       END`,
    { replacements: repl, type: QueryTypes.SELECT }
  );

  const avgGradeByYear = await sequelize.query<{ year: number; avg: number }>(
    `SELECT EXTRACT(YEAR FROM g.graduation_date)::int as year, AVG(g.degree_grade) as avg
     FROM graduates g ${sqlWhere}
     GROUP BY EXTRACT(YEAR FROM g.graduation_date)
     ORDER BY year ASC`,
    { replacements: repl, type: QueryTypes.SELECT }
  );

  const byTerm = await sequelize.query<{ year: number; term: string; count: number }>(
    `SELECT
        EXTRACT(YEAR FROM g.graduation_date)::int as year,
        CASE
          WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1,2) THEN 'winter'
          WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6,7) THEN 'spring'
          WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
          ELSE 'other'
        END as term,
        COUNT(*) as count
     FROM graduates g ${sqlWhere}
     GROUP BY EXTRACT(YEAR FROM g.graduation_date), term
     ORDER BY year ASC,
       CASE term
         WHEN 'winter' THEN 1
         WHEN 'spring' THEN 2
         WHEN 'september' THEN 3
         ELSE 99
       END ASC`,
    { replacements: repl, type: QueryTypes.SELECT }
  );




const sqlWhereEntry = sqlWhere ? `${sqlWhere} AND g.entry_year IS NOT NULL AND g.graduation_date IS NOT NULL` : "WHERE g.entry_year IS NOT NULL AND g.graduation_date IS NOT NULL";
const avgYearsToDegreeByEntryYear = await sequelize.query<{ entry_year: number; avg_years: number }>(
  `SELECT
      g.entry_year as entry_year,
      AVG(EXTRACT(EPOCH FROM (g.graduation_date::date - make_date(g.entry_year, 9, 1)))/86400.0/365.25) as avg_years
   FROM graduates g ${sqlWhereEntry}
   GROUP BY g.entry_year
   ORDER BY entry_year ASC`,
  { replacements: repl, type: QueryTypes.SELECT }
);

  res.json({
    ok: true,
    total,
    avg_age: avgRow?.[0]?.avg_age ?? null,
    avg_degree_grade: avgRow?.[0]?.avg_degree_grade ?? null,
    by_year: byYear,
    gender,
    age_groups: ageRows.filter((r) => r.label !== "unknown"),
    avg_grade_by_year: avgGradeByYear,
    by_term: byTerm.filter((r) => r.term !== 'other'),
    avg_years_to_degree_by_entry_year: avgYearsToDegreeByEntryYear
  });
} catch (err) {
  console.error("[public/stats] failed", err);
  return res.status(500).json({ message: "Stats query failed" });
}
}

export async function publicMap(req: Request, res: Response) {
  const { sqlWhere, repl } = buildWhere(req);

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
  const { sqlWhere, repl } = buildWhere(req);

  // Anonymous dataset: no names/ad_code/student_number.
  const rows = await sequelize.query<any>(
    `SELECT
      EXTRACT(YEAR FROM g.graduation_date)::int as graduation_year,
      g.entry_year,
      g.birth_date,
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

  const headers = [
    "graduation_year",
    "entry_year",
    "birth_date",
    "gender",
    "degree_grade",
    "study_program_id",
    "program_direction_id",
    "origin_region_id"
  ];

  const esc = (v: any) => {
    const s = String(v ?? "");
    if (/[\",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
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
