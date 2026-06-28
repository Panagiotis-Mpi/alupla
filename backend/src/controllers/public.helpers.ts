// Helpers για δημόσια ανώνυμα δεδομένα, φίλτρα και logging exports επισκεπτών.
import type { Request } from "express";
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/sequelize";
import { Region } from "../models/Region";
import { verifyToken } from "../utils/jwt";
import { logAction } from "../services/log.service";

// Μετατρέπει τιμή DB σε αριθμό.
function num(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

let graduatesBirthModeCache: "birth_date" | "birth_year" | null = null;

// Βλέπει αν η βάση κρατά birth_date ή birth_year.
async function getGraduatesBirthMode(): Promise<"birth_date" | "birth_year"> {
  if (graduatesBirthModeCache) return graduatesBirthModeCache;

  const rows = await sequelize.query<{ column_name: string }>(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_name = 'graduates'
        AND column_name IN ('birth_date', 'birth_year')`,
    { type: QueryTypes.SELECT }
  );

  const cols = new Set(rows.map((row) => String(row.column_name)));
  graduatesBirthModeCache = cols.has("birth_date") ? "birth_date" : "birth_year";
  return graduatesBirthModeCache;
}

// Φτιάχνει SQL expression για ημερομηνία γέννησης.
async function getBirthDateExpr() {
  const mode = await getGraduatesBirthMode();
  return mode === "birth_date" ? "g.birth_date" : "CASE WHEN TRIM(CAST(g.birth_year AS TEXT)) ~ '^[0-9]{4}$' THEN make_date(CAST(g.birth_year AS INTEGER), 1, 1) ELSE NULL END";
}

// Φτιάχνει SQL expression για έτος γέννησης.
export async function getBirthYearExpr() {
  const birthExpr = await getBirthDateExpr();
  return `CAST(EXTRACT(YEAR FROM ${birthExpr}) AS INTEGER)`;
}

// Καθαρίζει όνομα περιοχής για ομαδοποίηση.
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

// Φορτώνει regions για δημόσιο χάρτη/στατιστικά.
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

// Φτιάχνει lookup region id -> πληροφορίες περιοχής.
export async function buildRegionLookup() {
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

// Παίρνει user id αν υπάρχει token, αλλιώς επιστρέφει null.
function getOptionalUserId(req: Request) {
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

// Γράφει activity log για public export.
export async function logPublicExportAction(req: Request, action: string, entityType: string, details?: Record<string, any>) {
  await logAction({
    user_id: getOptionalUserId(req),
    action,
    entity_type: entityType,
    entity_id: null,
    details: details ?? null,
  });
}

// Χτίζει κοινό where για δημόσια στατιστικά/χάρτη.
export async function buildWhere(req: Request) {
  const birthExpr = await getBirthDateExpr();
  const where: string[] = [];
  const repl: Record<string, any> = {};

  const graduationYear = num(req.query.graduation_year);
  const graduationYearFrom = num(req.query.graduation_year_from);
  const graduationYearTo = num(req.query.graduation_year_to);
  const studyProgramId = num(req.query.study_program_id);
  const gender = typeof req.query.gender === "string" ? req.query.gender : "";
  const ageGroup = typeof req.query.age_group === "string" ? req.query.age_group : "";

  if (graduationYear) {
    where.push("g.graduation_date >= :graduationDateFrom AND g.graduation_date <= :graduationDateTo");
    repl.graduationDateFrom = `${graduationYear}-01-01`;
    repl.graduationDateTo = `${graduationYear}-12-31`;
  } else if (graduationYearFrom || graduationYearTo) {
    const firstYear = graduationYearFrom ?? graduationYearTo;
    const lastYear = graduationYearTo ?? graduationYearFrom;
    if (firstYear && lastYear) {
      const from = Math.min(firstYear, lastYear);
      const to = Math.max(firstYear, lastYear);
      where.push("g.graduation_date >= :graduationDateFrom AND g.graduation_date <= :graduationDateTo");
      repl.graduationDateFrom = `${from}-01-01`;
      repl.graduationDateTo = `${to}-12-31`;
    }
  }
  if (studyProgramId) {
    where.push("g.study_program_id = :studyProgramId");
    repl.studyProgramId = studyProgramId;
  }
  if (gender === "M" || gender === "F") {
    where.push("g.gender = :gender");
    repl.gender = gender;
  }

  if (ageGroup === "23-26") where.push(`EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 23 AND 26`);
  else if (ageGroup === "27-30") where.push(`EXTRACT(YEAR FROM age(current_date, ${birthExpr})) BETWEEN 27 AND 30`);
  else if (ageGroup === "31+") where.push(`EXTRACT(YEAR FROM age(current_date, ${birthExpr})) >= 31`);

  return {
    sqlWhere: where.length ? `WHERE ${where.join(" AND ")}` : "",
    repl,
    birthExpr,
  };
}
