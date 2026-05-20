// Δημόσια endpoints για επισκέπτες: ανώνυμα στατιστικά, χάρτης και exports.
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/sequelize";
import { NextFunction, Request, Response } from "express";
import { StudyProgram } from "../models/StudyProgram";
import { Region } from "../models/Region";
import { ensureLocalizedRegionNames } from "../services/mapLocation.service";
import {
  buildRegionLookup,
  buildWhere,
  getBirthYearExpr,
  logPublicExportAction,
  normalizePlaceName,
} from "./public.helpers";
import { buildAnonymousStatisticsWorkbook, loadPublicMapRows } from "./public.stats";

type PublicStatsCacheEntry = { expires: number; body: Record<string, unknown> };
// Κρατά προσωρινά δεδομένα για πιο γρήγορη απόκριση.
const publicStatsCache = new Map<string, PublicStatsCacheEntry>();
const PUBLIC_STATS_CACHE_MS = 5 * 60 * 1000;

async function localizedNamesForRegion(regionId: number | null | undefined, fallback: string) {
  const safeFallback = String(fallback ?? "").trim();
  if (!regionId) return { name_el: safeFallback, name_en: safeFallback };
  const names = await ensureLocalizedRegionNames(Number(regionId));
  return {
    name_el: String(names.nameEl ?? safeFallback).trim() || safeFallback,
    name_en: String(names.nameEn ?? safeFallback).trim() || safeFallback,
  };
}

function mergeLocalizedCount(
  map: Map<string, { id?: number | null; name: string; name_el: string; name_en: string; count: number }>,
  key: string,
  item: { id?: number | null; name: string; name_el: string; name_en: string; count: number }
) {
  const current = map.get(key);
  if (current) {
    current.count += item.count;
    if (!current.id && item.id) current.id = item.id;
    if (!current.name_el && item.name_el) current.name_el = item.name_el;
    if (!current.name_en && item.name_en) current.name_en = item.name_en;
    return;
  }
  map.set(key, item);
}

// Διαβάζει cached δημόσια στατιστικά αν είναι ακόμα φρέσκα.
function getPublicStatsCache(key: string) {
  const item = publicStatsCache.get(key);
  if (!item) return null;
  if (item.expires <= Date.now()) {
    publicStatsCache.delete(key);
    return null;
  }
  return item.body;
}

// Αποθηκεύει δημόσια στατιστικά στο cache.
function setPublicStatsCache(key: string, body: Record<string, unknown>) {
  publicStatsCache.set(key, { expires: Date.now() + PUBLIC_STATS_CACHE_MS, body });
}

// Καθαρίζει cache στατιστικών μετά από αλλαγές αποφοίτων.
export function clearPublicStatsCache() {
  publicStatsCache.clear();
}

// Επιστρέφει ενεργά προγράμματα σπουδών για δημόσια φίλτρα.
export async function publicStudyPrograms(_req: Request, res: Response) {
  const items = await StudyProgram.findAll({
    attributes: ["id", "code", "name_el", "name_en"],
    order: [["code", "ASC"]],
  });
  res.json({ ok: true, items });
}

// Επιστρέφει ανώνυμα στατιστικά για τη δημόσια σελίδα Στατιστικά.
export async function publicStats(req: Request, res: Response) {
  try {
    const cacheKey = req.originalUrl || req.url;
// Τα δημόσια στατιστικά cache-άρονται για να μη γίνονται βαριά queries συνέχεια.
    const cached = getPublicStatsCache(cacheKey);
    if (cached) {
      res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=240");
      return res.json(cached);
    }

    const { sqlWhere, repl, birthExpr } = await buildWhere(req);
    const birthYearExpr = await getBirthYearExpr();
    const section = String(req.query.section ?? "all").toLowerCase();

    if (section === "demographics") {
      const totalRow = await sequelize.query<{ total: number }>(
        `SELECT COUNT(*) as total FROM graduates g ${sqlWhere}`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const total = Number(totalRow?.[0]?.total ?? 0);
      const avgRow = await sequelize.query<{
        avg_age: number | null;
        min_age: number | null;
        max_age: number | null;
        avg_degree_grade: number | null;
        min_degree_grade: number | null;
        max_degree_grade: number | null;
        avg_years_to_degree: number | null;
        min_years_to_degree: number | null;
        max_years_to_degree: number | null;
      }>(
        `SELECT AVG(EXTRACT(YEAR FROM age(g.graduation_date, ${birthExpr}))) as avg_age,
                MIN(EXTRACT(YEAR FROM age(g.graduation_date, ${birthExpr}))) as min_age,
                MAX(EXTRACT(YEAR FROM age(g.graduation_date, ${birthExpr}))) as max_age,
                AVG(g.degree_grade) as avg_degree_grade,
                MIN(g.degree_grade) as min_degree_grade,
                MAX(g.degree_grade) as max_degree_grade,
                AVG(CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) - g.entry_year) as avg_years_to_degree,
                MIN(CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) - g.entry_year) as min_years_to_degree,
                MAX(CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) - g.entry_year) as max_years_to_degree
         FROM graduates g ${sqlWhere}`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const byYear = await sequelize.query<{ year: number; count: number }>(
        `SELECT CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) as year,
                CAST(COUNT(*) AS INTEGER) as count
         FROM graduates g ${sqlWhere}
         GROUP BY EXTRACT(YEAR FROM g.graduation_date)
         ORDER BY year ASC`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const byTerm = await sequelize.query<{ year: number; term: string; count: number }>(
        `SELECT CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) as year,
                CASE
                  WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
                  WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
                  WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
                  ELSE 'other'
                END as term,
                CAST(COUNT(*) AS INTEGER) as count
         FROM graduates g ${sqlWhere}
         GROUP BY EXTRACT(YEAR FROM g.graduation_date),
                  CASE
                    WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
                    WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
                    WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
                    ELSE 'other'
                  END
         ORDER BY year ASC`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const genderRows = await sequelize.query<{ gender: string; count: number }>(
        `SELECT g.gender as gender, CAST(COUNT(*) AS INTEGER) as count
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
        `SELECT CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) as year,
                CAST(SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END) AS INTEGER) as male,
                CAST(SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END) AS INTEGER) as female
         FROM graduates g ${sqlWhere}
         GROUP BY EXTRACT(YEAR FROM g.graduation_date)
         ORDER BY year ASC`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const birthYearRows = await sequelize.query<{ year: number; count: number }>(
        `SELECT ${birthYearExpr} as year,
                CAST(COUNT(*) AS INTEGER) as count
         FROM graduates g ${sqlWhere}
         GROUP BY ${birthYearExpr}
         ORDER BY year ASC`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const countByEntryYear = await sequelize.query<{ entry_year: number; count: number }>(
        `SELECT CAST(g.entry_year AS INTEGER) as entry_year,
                CAST(COUNT(*) AS INTEGER) as count
         FROM graduates g ${sqlWhere}
         GROUP BY g.entry_year
         ORDER BY g.entry_year ASC`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const genderByEntryYear = await sequelize.query<{ entry_year: number; male: number; female: number }>(
        `SELECT CAST(g.entry_year AS INTEGER) as entry_year,
                CAST(SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END) AS INTEGER) as male,
                CAST(SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END) AS INTEGER) as female
         FROM graduates g ${sqlWhere}
         GROUP BY g.entry_year
         ORDER BY g.entry_year ASC`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const body = {
        ok: true,
        total,
        avg_age: avgRow?.[0]?.avg_age ?? null,
        min_age: avgRow?.[0]?.min_age ?? null,
        max_age: avgRow?.[0]?.max_age ?? null,
        avg_degree_grade: avgRow?.[0]?.avg_degree_grade ?? null,
        min_degree_grade: avgRow?.[0]?.min_degree_grade ?? null,
        max_degree_grade: avgRow?.[0]?.max_degree_grade ?? null,
        avg_years_to_degree: avgRow?.[0]?.avg_years_to_degree ?? null,
        min_years_to_degree: avgRow?.[0]?.min_years_to_degree ?? null,
        max_years_to_degree: avgRow?.[0]?.max_years_to_degree ?? null,
        by_year: byYear,
        by_term: byTerm.filter((r) => r.term !== 'other'),
        gender,
        gender_by_year: genderByYear,
        gender_by_term: [],
        birth_years: birthYearRows,
        birth_year_distribution: birthYearRows,
        age_groups: [],
        count_by_entry_year: countByEntryYear,
        gender_by_entry_year: genderByEntryYear,
      };
      setPublicStatsCache(cacheKey, body);
      res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=240");
      return res.json(body);
    }

    if (section === "academic") {
      const avgGradeByYear = await sequelize.query<{ year: number; avg: number }>(
        `SELECT CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) as year,
                ROUND(CAST(AVG(g.degree_grade) AS NUMERIC), 2) as avg
         FROM graduates g ${sqlWhere}
         GROUP BY EXTRACT(YEAR FROM g.graduation_date)
         ORDER BY year ASC`,
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
                CAST(COUNT(*) AS INTEGER) as count
         FROM graduates g ${sqlWhere}
         GROUP BY CASE
                    WHEN g.degree_grade < 5 THEN '<5'
                    WHEN g.degree_grade < 6 THEN '5-5.99'
                    WHEN g.degree_grade < 7 THEN '6-6.99'
                    WHEN g.degree_grade < 8 THEN '7-7.99'
                    WHEN g.degree_grade < 9 THEN '8-8.99'
                    ELSE '9-10'
                  END
         ORDER BY label ASC`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const degreeGradeBinsByGender = await sequelize.query<{ label: string; male: number; female: number }>(
        `SELECT CASE
                  WHEN g.degree_grade < 5 THEN '<5'
                  WHEN g.degree_grade < 6 THEN '5-5.99'
                  WHEN g.degree_grade < 7 THEN '6-6.99'
                  WHEN g.degree_grade < 8 THEN '7-7.99'
                  WHEN g.degree_grade < 9 THEN '8-8.99'
                  ELSE '9-10'
                END as label,
                CAST(SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END) AS INTEGER) as male,
                CAST(SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END) AS INTEGER) as female
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
                  END ASC`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const avgYearsToDegreeByEntryYear = await sequelize.query<{ entry_year: number; avg_years: number }>(
        `SELECT CAST(g.entry_year AS INTEGER) as entry_year,
                ROUND(CAST(AVG(EXTRACT(YEAR FROM g.graduation_date) - g.entry_year) AS NUMERIC), 2) as avg_years
         FROM graduates g ${sqlWhere}
         GROUP BY g.entry_year
         ORDER BY entry_year ASC`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const yearsToDegreeDistributionWhere = sqlWhere
        ? `${sqlWhere} AND g.graduation_date IS NOT NULL`
        : 'WHERE g.graduation_date IS NOT NULL';
      const yearsToDegreeDistribution = await sequelize.query<{ label: string; count: number }>(
        `SELECT CAST((CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) - g.entry_year) AS TEXT) as label,
                CAST(COUNT(*) AS INTEGER) as count
         FROM graduates g ${yearsToDegreeDistributionWhere}
         GROUP BY (CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) - g.entry_year)
         ORDER BY (CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) - g.entry_year) ASC`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const originRegionJoin = `LEFT JOIN regions origin_region ON origin_region.id = g.origin_region_id
         LEFT JOIN regions origin_parent_region ON origin_parent_region.id = origin_region.parent_id
         LEFT JOIN regions r ON r.id = COALESCE(
           g.origin_periphery_region_id,
           CASE WHEN origin_region.type = 'PERIPHERY' THEN origin_region.id ELSE NULL END,
           CASE WHEN origin_parent_region.type = 'PERIPHERY' THEN origin_parent_region.id ELSE NULL END
         )`;
      const originRegionWhere = sqlWhere
        ? `${sqlWhere} AND r.id IS NOT NULL AND r.type = 'PERIPHERY' AND (LOWER(BTRIM(COALESCE(g.origin_country, ''))) IN ('ελλάδα', 'ελλαδα', 'greece') OR ((g.origin_country IS NULL OR BTRIM(g.origin_country) = '') AND g.origin_country_region_id IN (SELECT id FROM regions WHERE type = 'COUNTRY' AND LOWER(BTRIM(name)) IN ('ελλάδα', 'ελλαδα', 'greece'))))`
        : `WHERE r.id IS NOT NULL AND r.type = 'PERIPHERY' AND (LOWER(BTRIM(COALESCE(g.origin_country, ''))) IN ('ελλάδα', 'ελλαδα', 'greece') OR ((g.origin_country IS NULL OR BTRIM(g.origin_country) = '') AND g.origin_country_region_id IN (SELECT id FROM regions WHERE type = 'COUNTRY' AND LOWER(BTRIM(name)) IN ('ελλάδα', 'ελλαδα', 'greece'))))`;
      const avgGradeByRegionRaw = await sequelize.query<{ id: number | null; name_el: string | null; name_en: string | null; count: number; avg: number }>(
        `SELECT r.id as id,
                r.name as name_el,
                r.name as name_en,
                CAST(COUNT(*) AS INTEGER) as count,
                ROUND(CAST(AVG(g.degree_grade) AS NUMERIC), 2) as avg
         FROM graduates g
         ${originRegionJoin}
         ${originRegionWhere}
         GROUP BY r.id, r.name
         ORDER BY count DESC, r.name ASC`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const avgYearsToDegreeByRegionRaw = await sequelize.query<{ id: number | null; name_el: string | null; name_en: string | null; count: number; avg_years: number }>(
        `SELECT r.id as id,
                r.name as name_el,
                r.name as name_en,
                CAST(COUNT(*) AS INTEGER) as count,
                ROUND(CAST(AVG(EXTRACT(YEAR FROM g.graduation_date) - g.entry_year) AS NUMERIC), 2) as avg_years
         FROM graduates g
         ${originRegionJoin}
         ${originRegionWhere}
         GROUP BY r.id, r.name
         ORDER BY count DESC, r.name ASC`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const localizedAvgGradeByRegion = await Promise.all(avgGradeByRegionRaw.map(async (r) => {
        const names = await localizedNamesForRegion(r.id, String(r.name_el ?? r.name_en ?? ""));
        return { ...r, name_el: names.name_el || r.name_el || 'Άγνωστη περιοχή', name_en: names.name_en || r.name_en || 'Unknown region' };
      }));
      const localizedAvgYearsToDegreeByRegion = await Promise.all(avgYearsToDegreeByRegionRaw.map(async (r) => {
        const names = await localizedNamesForRegion(r.id, String(r.name_el ?? r.name_en ?? ""));
        return { ...r, name_el: names.name_el || r.name_el || 'Άγνωστη περιοχή', name_en: names.name_en || r.name_en || 'Unknown region' };
      }));
      const body = {
        ok: true,
        avg_grade_by_year: avgGradeByYear,
        avg_grade_by_term: [],
        degree_grade_bins: degreeGradeBins,
        degree_grade_bins_by_gender: degreeGradeBinsByGender,
        avg_grade_by_region: localizedAvgGradeByRegion,
        avg_years_to_degree_by_region: localizedAvgYearsToDegreeByRegion,
        avg_years_to_degree_by_entry_year: avgYearsToDegreeByEntryYear,
        years_to_degree_distribution: yearsToDegreeDistribution,
      };
      setPublicStatsCache(cacheKey, body);
      res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=240");
      return res.json(body);
    }

    if (section === "geography") {
      const originRegionJoin = `LEFT JOIN regions origin_region ON origin_region.id = g.origin_region_id
         LEFT JOIN regions origin_parent_region ON origin_parent_region.id = origin_region.parent_id
         LEFT JOIN regions r ON r.id = COALESCE(
           g.origin_periphery_region_id,
           CASE WHEN origin_region.type = 'PERIPHERY' THEN origin_region.id ELSE NULL END,
           CASE WHEN origin_parent_region.type = 'PERIPHERY' THEN origin_parent_region.id ELSE NULL END
         )`;
      const originRegionWhere = sqlWhere
        ? `${sqlWhere} AND r.id IS NOT NULL AND r.type = 'PERIPHERY' AND (LOWER(BTRIM(COALESCE(g.origin_country, ''))) IN ('ελλάδα', 'ελλαδα', 'greece') OR ((g.origin_country IS NULL OR BTRIM(g.origin_country) = '') AND g.origin_country_region_id IN (SELECT id FROM regions WHERE type = 'COUNTRY' AND LOWER(BTRIM(name)) IN ('ελλάδα', 'ελλαδα', 'greece'))))`
        : `WHERE r.id IS NOT NULL AND r.type = 'PERIPHERY' AND (LOWER(BTRIM(COALESCE(g.origin_country, ''))) IN ('ελλάδα', 'ελλαδα', 'greece') OR ((g.origin_country IS NULL OR BTRIM(g.origin_country) = '') AND g.origin_country_region_id IN (SELECT id FROM regions WHERE type = 'COUNTRY' AND LOWER(BTRIM(name)) IN ('ελλάδα', 'ελλαδα', 'greece'))))`;
      const originRegionDistribution = await sequelize.query<{ id: number | null; name_el: string | null; name_en: string | null; count: number }>(
        `SELECT r.id as id,
                r.name as name_el,
                r.name as name_en,
                CAST(COUNT(*) AS INTEGER) as count
         FROM graduates g
         ${originRegionJoin}
         ${originRegionWhere}
         GROUP BY r.id, r.name
         ORDER BY count DESC, r.name ASC`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const genderByRegionRaw = await sequelize.query<{ id: number | null; name_el: string | null; name_en: string | null; count: number; male: number; female: number }>(
        `SELECT r.id as id,
                r.name as name_el,
                r.name as name_en,
                CAST(COUNT(*) AS INTEGER) as count,
                CAST(SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END) AS INTEGER) as male,
                CAST(SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END) AS INTEGER) as female
         FROM graduates g
         ${originRegionJoin}
         ${originRegionWhere}
         GROUP BY r.id, r.name
         ORDER BY count DESC, r.name ASC`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const originNomosJoin = `LEFT JOIN regions origin_nomos_region ON origin_nomos_region.id = g.origin_region_id
         LEFT JOIN regions origin_city_region ON origin_city_region.id = g.origin_city_region_id
         LEFT JOIN regions origin_city_parent_region ON origin_city_parent_region.id = origin_city_region.parent_id
         LEFT JOIN regions origin_city_grandparent_region ON origin_city_grandparent_region.id = origin_city_parent_region.parent_id
         LEFT JOIN regions r ON r.id = COALESCE(
           CASE WHEN origin_nomos_region.type = 'NOMOS' THEN origin_nomos_region.id ELSE NULL END,
           CASE WHEN origin_city_parent_region.type = 'NOMOS' THEN origin_city_parent_region.id ELSE NULL END,
           CASE WHEN origin_city_grandparent_region.type = 'NOMOS' THEN origin_city_grandparent_region.id ELSE NULL END
         )`;
      const originNomosWhere = sqlWhere
        ? `${sqlWhere} AND r.id IS NOT NULL AND r.type = 'NOMOS' AND (LOWER(BTRIM(COALESCE(g.origin_country, ''))) IN ('ελλάδα', 'ελλαδα', 'greece') OR ((g.origin_country IS NULL OR BTRIM(g.origin_country) = '') AND g.origin_country_region_id IN (SELECT id FROM regions WHERE type = 'COUNTRY' AND LOWER(BTRIM(name)) IN ('ελλάδα', 'ελλαδα', 'greece'))))`
        : `WHERE r.id IS NOT NULL AND r.type = 'NOMOS' AND (LOWER(BTRIM(COALESCE(g.origin_country, ''))) IN ('ελλάδα', 'ελλαδα', 'greece') OR ((g.origin_country IS NULL OR BTRIM(g.origin_country) = '') AND g.origin_country_region_id IN (SELECT id FROM regions WHERE type = 'COUNTRY' AND LOWER(BTRIM(name)) IN ('ελλάδα', 'ελλαδα', 'greece'))))`;
      const avgYearsToDegreeByNomosRaw = await sequelize.query<{ id: number | null; name_el: string | null; name_en: string | null; count: number; avg_years: number }>(
        `SELECT r.id as id,
                r.name as name_el,
                r.name as name_en,
                CAST(COUNT(*) AS INTEGER) as count,
                ROUND(CAST(AVG(EXTRACT(YEAR FROM g.graduation_date) - g.entry_year) AS NUMERIC), 2) as avg_years
         FROM graduates g
         ${originNomosJoin}
         ${originNomosWhere}
         GROUP BY r.id, r.name
         ORDER BY count DESC, r.name ASC`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const abroadByYear = await sequelize.query<{ year: number; greece: number; abroad: number }>(
        `SELECT CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) as year,
                CAST(SUM(CASE WHEN COALESCE(NULLIF(TRIM(g.origin_country), ''), '') <> '' AND LOWER(TRANSLATE(TRIM(g.origin_country), 'ΆάΈέΉήΊίΌόΎύΏώ', 'ΑαΕεΗηΙιΟοΥυΩω')) NOT IN ('ελλαδα', 'greece') THEN 0 ELSE 1 END) AS INTEGER) as greece,
                CAST(SUM(CASE WHEN COALESCE(NULLIF(TRIM(g.origin_country), ''), '') <> '' AND LOWER(TRANSLATE(TRIM(g.origin_country), 'ΆάΈέΉήΊίΌόΎύΏώ', 'ΑαΕεΗηΙιΟοΥυΩω')) NOT IN ('ελλαδα', 'greece') THEN 1 ELSE 0 END) AS INTEGER) as abroad
         FROM graduates g ${sqlWhere}
         GROUP BY EXTRACT(YEAR FROM g.graduation_date)
         ORDER BY year ASC`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const municipalityWhere = sqlWhere
        ? `${sqlWhere} AND g.origin_municipality IS NOT NULL AND btrim(g.origin_municipality) <> ''`
        : `WHERE g.origin_municipality IS NOT NULL AND btrim(g.origin_municipality) <> ''`;
      const rawOriginMunicipalityDistribution = await sequelize.query<{ name: string; count: number }>(
        `SELECT g.origin_municipality as name,
                CAST(COUNT(*) AS INTEGER) as count
         FROM graduates g ${municipalityWhere}
         GROUP BY g.origin_municipality
         ORDER BY count DESC, g.origin_municipality ASC`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const rawGenderByMunicipality = await sequelize.query<{ name: string; count: number; male: number; female: number }>(
        `SELECT g.origin_municipality as name,
                CAST(COUNT(*) AS INTEGER) as count,
                CAST(SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END) AS INTEGER) as male,
                CAST(SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END) AS INTEGER) as female
         FROM graduates g ${municipalityWhere}
         GROUP BY g.origin_municipality
         ORDER BY count DESC, g.origin_municipality ASC`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const { cityByName } = await buildRegionLookup();
      const municipalityGroups = new Map<string, { id?: number | null; name: string; name_el: string; name_en: string; count: number }>();
      for (const row of rawOriginMunicipalityDistribution) {
        const rawName = String(row.name ?? "").trim();
        if (!rawName) continue;
        const canonical = cityByName.get(normalizePlaceName(rawName));
        const baseName = canonical ? String(canonical.name) : rawName;
        const names = await localizedNamesForRegion(canonical?.id, baseName);
        const key = canonical?.id ? `city:${Number(canonical.id)}` : `name:${normalizePlaceName(names.name_el || baseName)}`;
        mergeLocalizedCount(municipalityGroups, key, {
          id: canonical?.id ?? null,
          name: names.name_el || baseName,
          name_el: names.name_el || baseName,
          name_en: names.name_en || names.name_el || baseName,
          count: Number(row.count) || 0,
        });
      }
      const genderMunicipalityGroups = new Map<string, { id?: number | null; name: string; name_el: string; name_en: string; count: number; male: number; female: number }>();
      for (const row of rawGenderByMunicipality) {
        const rawName = String(row.name ?? "").trim();
        if (!rawName) continue;
        const canonical = cityByName.get(normalizePlaceName(rawName));
        const baseName = canonical ? String(canonical.name) : rawName;
        const names = await localizedNamesForRegion(canonical?.id, baseName);
        const key = canonical?.id ? `city:${Number(canonical.id)}` : `name:${normalizePlaceName(names.name_el || baseName)}`;
        const current = genderMunicipalityGroups.get(key);
        if (current) {
          current.count += Number(row.count) || 0;
          current.male += Number(row.male) || 0;
          current.female += Number(row.female) || 0;
        } else {
          genderMunicipalityGroups.set(key, {
            id: canonical?.id ?? null,
            name: names.name_el || baseName,
            name_el: names.name_el || baseName,
            name_en: names.name_en || names.name_el || baseName,
            count: Number(row.count) || 0,
            male: Number(row.male) || 0,
            female: Number(row.female) || 0,
          });
        }
      }
      const rawOriginCountryDistribution = await sequelize.query<{ id: number | null; name: string; count: number }>(
        `SELECT g.origin_country_region_id as id,
                CASE
                  WHEN COALESCE(NULLIF(TRIM(g.origin_country), ''), '') = '' THEN 'Άγνωστη χώρα'
                  WHEN LOWER(TRANSLATE(TRIM(g.origin_country), 'ΆάΈέΉήΊίΌόΎύΏώ', 'ΑαΕεΗηΙιΟοΥυΩω')) IN ('ελλαδα', 'greece') THEN 'Ελλάδα'
                  ELSE TRIM(g.origin_country)
                END as name,
                CAST(COUNT(*) AS INTEGER) as count
         FROM graduates g ${sqlWhere}
         GROUP BY g.origin_country_region_id, 2
         ORDER BY count DESC, name ASC`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const countryRows = await Region.findAll({ attributes: ["id", "name"], where: { type: "COUNTRY" } });
      const countryByName = new Map<string, any>();
      for (const country of countryRows as any[]) {
        const key = normalizePlaceName(country.name);
        if (key && !countryByName.has(key)) countryByName.set(key, country);
      }
      const countryGroups = new Map<string, { id?: number | null; name: string; name_el: string; name_en: string; count: number }>();
      for (const row of rawOriginCountryDistribution) {
        const rawName = String(row.name ?? "").trim();
        if (!rawName) continue;
        const matchedCountry = Number(row.id) ? { id: Number(row.id), name: rawName } : countryByName.get(normalizePlaceName(rawName));
        const names = rawName === "Άγνωστη χώρα"
          ? { name_el: "Άγνωστη χώρα", name_en: "Unknown country" }
          : rawName === "Ελλάδα"
            ? { name_el: "Ελλάδα", name_en: "Greece" }
            : await localizedNamesForRegion(matchedCountry?.id, rawName);
        const key = matchedCountry?.id ? `country:${Number(matchedCountry.id)}` : `name:${normalizePlaceName(names.name_el || rawName)}`;
        mergeLocalizedCount(countryGroups, key, {
          id: matchedCountry?.id ?? null,
          name: names.name_el || rawName,
          name_el: names.name_el || rawName,
          name_en: names.name_en || names.name_el || rawName,
          count: Number(row.count) || 0,
        });
      }
      const abroadSummaryRow = await sequelize.query<{ abroad_count: number }>(
        `SELECT CAST(COUNT(*) AS INTEGER) as abroad_count
         FROM graduates g
         ${sqlWhere ? `${sqlWhere} AND` : 'WHERE'} COALESCE(NULLIF(TRIM(g.origin_country), ''), '') <> ''
           AND LOWER(TRANSLATE(TRIM(g.origin_country), 'ΆάΈέΉήΊίΌόΎύΏώ', 'ΑαΕεΗηΙιΟοΥυΩω')) NOT IN ('ελλαδα', 'greece')`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const localizedOriginRegionDistribution = await Promise.all(originRegionDistribution.map(async (r) => {
        const names = await localizedNamesForRegion(r.id, String(r.name_el ?? r.name_en ?? ""));
        return { ...r, name_el: names.name_el || r.name_el || 'Άγνωστη περιοχή', name_en: names.name_en || r.name_en || 'Unknown region' };
      }));
      const localizedGenderByRegion = await Promise.all(genderByRegionRaw.map(async (r) => {
        const names = await localizedNamesForRegion(r.id, String(r.name_el ?? r.name_en ?? ""));
        return { ...r, name_el: names.name_el || r.name_el || 'Άγνωστη περιοχή', name_en: names.name_en || r.name_en || 'Unknown region' };
      }));
      const localizedAvgYearsToDegreeByNomos = await Promise.all(avgYearsToDegreeByNomosRaw.map(async (r) => {
        const names = await localizedNamesForRegion(r.id, String(r.name_el ?? r.name_en ?? ""));
        return { ...r, name_el: names.name_el || r.name_el || 'Άγνωστος νομός', name_en: names.name_en || r.name_en || 'Unknown regional unit' };
      }));
      const totalRow = await sequelize.query<{ total: number }>(
        `SELECT COUNT(*) as total FROM graduates g ${sqlWhere}`,
        { replacements: repl, type: QueryTypes.SELECT }
      );
      const total = Number(totalRow?.[0]?.total ?? 0);
      const originMunicipalityDistribution = Array.from(municipalityGroups.values()).sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name, "el");
      });
      const genderByMunicipality = Array.from(genderMunicipalityGroups.values()).sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name, "el");
      });
      const originCountryDistribution = Array.from(countryGroups.values()).sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.name_el.localeCompare(b.name_el, "el");
      });
      const abroadCount = Number(abroadSummaryRow?.[0]?.abroad_count ?? 0);
      const body = {
        ok: true,
        origin_region_distribution: localizedOriginRegionDistribution,
        gender_by_region: localizedGenderByRegion,
        origin_country_distribution: originCountryDistribution,
        abroad_by_year: abroadByYear,
        avg_years_to_degree_by_nomos: localizedAvgYearsToDegreeByNomos,
        abroad_count: abroadCount,
        abroad_pct: total > 0 ? Math.round((abroadCount / total) * 1000) / 10 : 0,
        origin_municipality_distribution: originMunicipalityDistribution,
        gender_by_municipality: genderByMunicipality,
      };
      setPublicStatsCache(cacheKey, body);
      res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=240");
      return res.json(body);
    }

    const totalRow = await sequelize.query<{ total: number }>(
      `SELECT COUNT(*) as total FROM graduates g ${sqlWhere}`,
      { replacements: repl, type: QueryTypes.SELECT }
    );
    const total = Number(totalRow?.[0]?.total ?? 0);

    const avgRow = await sequelize.query<{
      avg_age: number | null;
      min_age: number | null;
      max_age: number | null;
      avg_degree_grade: number | null;
      min_degree_grade: number | null;
      max_degree_grade: number | null;
      avg_years_to_degree: number | null;
      min_years_to_degree: number | null;
      max_years_to_degree: number | null;
    }>(
      `SELECT AVG(EXTRACT(YEAR FROM age(g.graduation_date, ${birthExpr}))) as avg_age,
              MIN(EXTRACT(YEAR FROM age(g.graduation_date, ${birthExpr}))) as min_age,
              MAX(EXTRACT(YEAR FROM age(g.graduation_date, ${birthExpr}))) as max_age,
              AVG(g.degree_grade) as avg_degree_grade,
              MIN(g.degree_grade) as min_degree_grade,
              MAX(g.degree_grade) as max_degree_grade,
              AVG(CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) - g.entry_year) as avg_years_to_degree,
              MIN(CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) - g.entry_year) as min_years_to_degree,
              MAX(CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) - g.entry_year) as max_years_to_degree
       FROM graduates g ${sqlWhere}`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const byYear = await sequelize.query<{ year: number; count: number }>(
      `SELECT CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) as year,
              CAST(COUNT(*) AS INTEGER) as count
       FROM graduates g ${sqlWhere}
       GROUP BY EXTRACT(YEAR FROM g.graduation_date)
       ORDER BY year ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const byTerm = await sequelize.query<{ year: number; term: string; count: number }>(
      `SELECT CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) as year,
              CASE
                WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
                WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
                WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
                ELSE 'other'
              END as term,
              CAST(COUNT(*) AS INTEGER) as count
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
      `SELECT g.gender as gender, CAST(COUNT(*) AS INTEGER) as count
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
      `SELECT CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) as year,
              CAST(SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END) AS INTEGER) as male,
              CAST(SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END) AS INTEGER) as female
       FROM graduates g ${sqlWhere}
       GROUP BY EXTRACT(YEAR FROM g.graduation_date)
       ORDER BY year ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const genderByTerm = await sequelize.query<{ year: number; term: string; male: number; female: number }>(
      `SELECT CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) as year,
              CASE
                WHEN EXTRACT(MONTH FROM g.graduation_date) IN (1, 2) THEN 'winter'
                WHEN EXTRACT(MONTH FROM g.graduation_date) IN (6, 7) THEN 'spring'
                WHEN EXTRACT(MONTH FROM g.graduation_date) = 9 THEN 'september'
                ELSE 'other'
              END as term,
              CAST(SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END) AS INTEGER) as male,
              CAST(SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END) AS INTEGER) as female
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
              CAST(COUNT(*) AS INTEGER) as count
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
              CAST(COUNT(*) AS INTEGER) as count
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
      `SELECT CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) as year,
              ROUND(CAST(AVG(g.degree_grade) AS NUMERIC), 2) as avg
       FROM graduates g ${sqlWhere}
       GROUP BY EXTRACT(YEAR FROM g.graduation_date)
       ORDER BY year ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const genderByEntryYear = await sequelize.query<{ entry_year: number; male: number; female: number }>(
      `SELECT CAST(g.entry_year AS INTEGER) as entry_year,
              CAST(SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END) AS INTEGER) as male,
              CAST(SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END) AS INTEGER) as female
       FROM graduates g ${sqlWhere}
       GROUP BY g.entry_year
       ORDER BY g.entry_year ASC`,
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
              CAST(COUNT(*) AS INTEGER) as count
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

    const originRegionJoin = `LEFT JOIN regions origin_region ON origin_region.id = g.origin_region_id
       LEFT JOIN regions origin_parent_region ON origin_parent_region.id = origin_region.parent_id
       LEFT JOIN regions r ON r.id = COALESCE(
         g.origin_periphery_region_id,
         CASE WHEN origin_region.type = 'PERIPHERY' THEN origin_region.id ELSE NULL END,
         CASE WHEN origin_parent_region.type = 'PERIPHERY' THEN origin_parent_region.id ELSE NULL END
       )`;

    const originRegionWhere = sqlWhere
      ? `${sqlWhere} AND r.id IS NOT NULL AND r.type = 'PERIPHERY' AND (LOWER(BTRIM(COALESCE(g.origin_country, ''))) IN ('ελλάδα', 'ελλαδα', 'greece') OR ((g.origin_country IS NULL OR BTRIM(g.origin_country) = '') AND g.origin_country_region_id IN (SELECT id FROM regions WHERE type = 'COUNTRY' AND LOWER(BTRIM(name)) IN ('ελλάδα', 'ελλαδα', 'greece'))))`
      : `WHERE r.id IS NOT NULL AND r.type = 'PERIPHERY' AND (LOWER(BTRIM(COALESCE(g.origin_country, ''))) IN ('ελλάδα', 'ελλαδα', 'greece') OR ((g.origin_country IS NULL OR BTRIM(g.origin_country) = '') AND g.origin_country_region_id IN (SELECT id FROM regions WHERE type = 'COUNTRY' AND LOWER(BTRIM(name)) IN ('ελλάδα', 'ελλαδα', 'greece'))))`;

    const originRegionDistribution = await sequelize.query<{ id: number | null; name_el: string | null; name_en: string | null; count: number }>(
      `SELECT r.id as id,
              r.name as name_el,
              r.name as name_en,
              CAST(COUNT(*) AS INTEGER) as count
       FROM graduates g
       ${originRegionJoin}
       ${originRegionWhere}
       GROUP BY r.id, r.name
       ORDER BY count DESC, r.name ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const countByEntryYear = await sequelize.query<{ entry_year: number; count: number }>(
      `SELECT CAST(g.entry_year AS INTEGER) as entry_year,
              CAST(COUNT(*) AS INTEGER) as count
       FROM graduates g ${sqlWhere}
       GROUP BY g.entry_year
       ORDER BY g.entry_year ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const genderByRegionRaw = await sequelize.query<{ id: number | null; name_el: string | null; name_en: string | null; count: number; male: number; female: number }>(
      `SELECT r.id as id,
              r.name as name_el,
              r.name as name_en,
              CAST(COUNT(*) AS INTEGER) as count,
              CAST(SUM(CASE WHEN g.gender = 'M' THEN 1 ELSE 0 END) AS INTEGER) as male,
              CAST(SUM(CASE WHEN g.gender = 'F' THEN 1 ELSE 0 END) AS INTEGER) as female
       FROM graduates g
       ${originRegionJoin}
       ${originRegionWhere}
       GROUP BY r.id, r.name
       ORDER BY count DESC, r.name ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const avgGradeByRegionRaw = await sequelize.query<{ id: number | null; name_el: string | null; name_en: string | null; count: number; avg: number }>(
      `SELECT r.id as id,
              r.name as name_el,
              r.name as name_en,
              CAST(COUNT(*) AS INTEGER) as count,
              ROUND(CAST(AVG(g.degree_grade) AS NUMERIC), 2) as avg
       FROM graduates g
       ${originRegionJoin}
       ${originRegionWhere}
       GROUP BY r.id, r.name
       ORDER BY count DESC, r.name ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const avgYearsToDegreeByRegionRaw = await sequelize.query<{ id: number | null; name_el: string | null; name_en: string | null; count: number; avg_years: number }>(
      `SELECT r.id as id,
              r.name as name_el,
              r.name as name_en,
              CAST(COUNT(*) AS INTEGER) as count,
              ROUND(CAST(AVG(EXTRACT(YEAR FROM g.graduation_date) - g.entry_year) AS NUMERIC), 2) as avg_years
       FROM graduates g
       ${originRegionJoin}
       ${originRegionWhere}
       GROUP BY r.id, r.name
       ORDER BY count DESC, r.name ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const municipalityWhere = sqlWhere
      ? `${sqlWhere} AND g.origin_municipality IS NOT NULL AND btrim(g.origin_municipality) <> ''`
      : `WHERE g.origin_municipality IS NOT NULL AND btrim(g.origin_municipality) <> ''`;

    const rawOriginMunicipalityDistribution = await sequelize.query<{ name: string; count: number }>(
      `SELECT g.origin_municipality as name,
              CAST(COUNT(*) AS INTEGER) as count
       FROM graduates g ${municipalityWhere}
       GROUP BY g.origin_municipality
       ORDER BY count DESC, g.origin_municipality ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const { cityByName } = await buildRegionLookup();
    const municipalityGroups = new Map<string, { id?: number | null; name: string; name_el: string; name_en: string; count: number }>();
    for (const row of rawOriginMunicipalityDistribution) {
      const rawName = String(row.name ?? "").trim();
      if (!rawName) continue;
      const canonical = cityByName.get(normalizePlaceName(rawName));
      const baseName = canonical ? String(canonical.name) : rawName;
      const names = await localizedNamesForRegion(canonical?.id, baseName);
      const key = canonical?.id ? `city:${Number(canonical.id)}` : `name:${normalizePlaceName(names.name_el || baseName)}`;
      mergeLocalizedCount(municipalityGroups, key, {
        id: canonical?.id ?? null,
        name: names.name_el || baseName,
        name_el: names.name_el || baseName,
        name_en: names.name_en || names.name_el || baseName,
        count: Number(row.count) || 0,
      });
    }

    const foreignCityWhere = sqlWhere
      ? `${sqlWhere} AND g.origin_foreign_city IS NOT NULL AND btrim(g.origin_foreign_city) <> ''`
      : `WHERE g.origin_foreign_city IS NOT NULL AND btrim(g.origin_foreign_city) <> ''`;

    const rawForeignCityDistribution = await sequelize.query<{ name: string; count: number }>(
      `SELECT g.origin_foreign_city as name,
              CAST(COUNT(*) AS INTEGER) as count
       FROM graduates g ${foreignCityWhere}
       GROUP BY g.origin_foreign_city
       ORDER BY count DESC, g.origin_foreign_city ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    for (const row of rawForeignCityDistribution) {
      const rawName = String(row.name ?? "").trim();
      if (!rawName) continue;
      const canonical = cityByName.get(normalizePlaceName(rawName));
      const baseName = canonical ? String(canonical.name) : rawName;
      const names = await localizedNamesForRegion(canonical?.id, baseName);
      const key = canonical?.id ? `city:${Number(canonical.id)}` : `name:${normalizePlaceName(names.name_el || baseName)}`;
      mergeLocalizedCount(municipalityGroups, key, {
        id: canonical?.id ?? null,
        name: names.name_el || baseName,
        name_el: names.name_el || baseName,
        name_en: names.name_en || names.name_el || baseName,
        count: Number(row.count) || 0,
      });
    }

    const originMunicipalityDistribution = Array.from(municipalityGroups.values())
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name, "el");
      });

    const rawOriginCountryDistribution = await sequelize.query<{ id: number | null; name: string; count: number }>(
      `SELECT g.origin_country_region_id as id,
              CASE
                WHEN COALESCE(NULLIF(TRIM(g.origin_country), ''), '') = '' THEN 'Άγνωστη χώρα'
                WHEN LOWER(TRANSLATE(TRIM(g.origin_country), 'ΆάΈέΉήΊίΌόΎύΏώ', 'ΑαΕεΗηΙιΟοΥυΩω')) IN ('ελλαδα', 'greece') THEN 'Ελλάδα'
                ELSE TRIM(g.origin_country)
              END as name,
              CAST(COUNT(*) AS INTEGER) as count
       FROM graduates g ${sqlWhere}
       GROUP BY g.origin_country_region_id, 2
       ORDER BY count DESC, name ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const countryRows = await Region.findAll({ attributes: ["id", "name"], where: { type: "COUNTRY" } });
    const countryByName = new Map<string, any>();
    for (const country of countryRows as any[]) {
      const key = normalizePlaceName(country.name);
      if (key && !countryByName.has(key)) countryByName.set(key, country);
    }

    const countryGroups = new Map<string, { id?: number | null; name: string; name_el: string; name_en: string; count: number }>();
    for (const row of rawOriginCountryDistribution) {
      const rawName = String(row.name ?? "").trim();
      if (!rawName) continue;
      const matchedCountry = Number(row.id) ? { id: Number(row.id), name: rawName } : countryByName.get(normalizePlaceName(rawName));
      const names = rawName === "Άγνωστη χώρα"
        ? { name_el: "Άγνωστη χώρα", name_en: "Unknown country" }
        : rawName === "Ελλάδα"
          ? { name_el: "Ελλάδα", name_en: "Greece" }
          : await localizedNamesForRegion(matchedCountry?.id, rawName);
      const key = matchedCountry?.id ? `country:${Number(matchedCountry.id)}` : `name:${normalizePlaceName(names.name_el || rawName)}`;
      mergeLocalizedCount(countryGroups, key, {
        id: matchedCountry?.id ?? null,
        name: names.name_el || rawName,
        name_el: names.name_el || rawName,
        name_en: names.name_en || names.name_el || rawName,
        count: Number(row.count) || 0,
      });
    }

    const originCountryDistribution = Array.from(countryGroups.values())
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.name_el.localeCompare(b.name_el, "el");
      });

    const abroadSummaryRow = await sequelize.query<{ abroad_count: number }>(
      `SELECT CAST(COUNT(*) AS INTEGER) as abroad_count
       FROM graduates g
       ${sqlWhere ? `${sqlWhere} AND` : 'WHERE'} COALESCE(NULLIF(TRIM(g.origin_country), ''), '') <> ''
         AND LOWER(TRANSLATE(TRIM(g.origin_country), 'ΆάΈέΉήΊίΌόΎύΏώ', 'ΑαΕεΗηΙιΟοΥυΩω')) NOT IN ('ελλαδα', 'greece')`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const oathYearDistribution = await sequelize.query<{ year: number; count: number }>(
      `SELECT CAST(EXTRACT(YEAR FROM g.oath_date) AS INTEGER) as year,
              CAST(COUNT(*) AS INTEGER) as count
       FROM graduates g ${sqlWhere}
       GROUP BY EXTRACT(YEAR FROM g.oath_date)
       ORDER BY year ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const avgYearsToDegreeByEntryYear = await sequelize.query<{ entry_year: number; avg_years: number }>(
      `SELECT CAST(g.entry_year AS INTEGER) as entry_year,
              ROUND(CAST(AVG(EXTRACT(YEAR FROM g.graduation_date) - g.entry_year) AS NUMERIC), 2) as avg_years
       FROM graduates g ${sqlWhere}
       GROUP BY g.entry_year
       ORDER BY entry_year ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const yearsToDegreeDistributionWhere = sqlWhere
      ? `${sqlWhere} AND g.graduation_date IS NOT NULL`
      : 'WHERE g.graduation_date IS NOT NULL';

    const yearsToDegreeDistribution = await sequelize.query<{ label: string; count: number }>(
      `SELECT CAST((CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) - g.entry_year) AS TEXT) as label,
              CAST(COUNT(*) AS INTEGER) as count
       FROM graduates g ${yearsToDegreeDistributionWhere}
       GROUP BY (CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) - g.entry_year)
       ORDER BY (CAST(EXTRACT(YEAR FROM g.graduation_date) AS INTEGER) - g.entry_year) ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const localizedOriginRegionDistribution = await Promise.all(originRegionDistribution.map(async (r) => {
      const names = await localizedNamesForRegion(r.id, String(r.name_el ?? r.name_en ?? ""));
      return {
        ...r,
        name_el: names.name_el || r.name_el || 'Άγνωστη περιοχή',
        name_en: names.name_en || r.name_en || 'Unknown region',
      };
    }));

    const localizedGenderByRegion = await Promise.all(genderByRegionRaw.map(async (r) => {
      const names = await localizedNamesForRegion(r.id, String(r.name_el ?? r.name_en ?? ""));
      return {
        ...r,
        name_el: names.name_el || r.name_el || 'Άγνωστη περιοχή',
        name_en: names.name_en || r.name_en || 'Unknown region',
      };
    }));

    const localizedAvgGradeByRegion = await Promise.all(avgGradeByRegionRaw.map(async (r) => {
      const names = await localizedNamesForRegion(r.id, String(r.name_el ?? r.name_en ?? ""));
      return {
        ...r,
        name_el: names.name_el || r.name_el || 'Άγνωστη περιοχή',
        name_en: names.name_en || r.name_en || 'Unknown region',
      };
    }));

    const localizedAvgYearsToDegreeByRegion = await Promise.all(avgYearsToDegreeByRegionRaw.map(async (r) => {
      const names = await localizedNamesForRegion(r.id, String(r.name_el ?? r.name_en ?? ""));
      return {
        ...r,
        name_el: names.name_el || r.name_el || 'Άγνωστη περιοχή',
        name_en: names.name_en || r.name_en || 'Unknown region',
      };
    }));

    const body = {
      ok: true,
      total,
      avg_age: avgRow?.[0]?.avg_age ?? null,
      min_age: avgRow?.[0]?.min_age ?? null,
      max_age: avgRow?.[0]?.max_age ?? null,
      avg_degree_grade: avgRow?.[0]?.avg_degree_grade ?? null,
      min_degree_grade: avgRow?.[0]?.min_degree_grade ?? null,
      max_degree_grade: avgRow?.[0]?.max_degree_grade ?? null,
      avg_years_to_degree: avgRow?.[0]?.avg_years_to_degree ?? null,
      min_years_to_degree: avgRow?.[0]?.min_years_to_degree ?? null,
      max_years_to_degree: avgRow?.[0]?.max_years_to_degree ?? null,
      by_year: byYear,
      by_term: byTerm.filter((r) => r.term !== 'other'),
      gender,
      gender_by_year: genderByYear,
      gender_by_term: genderByTerm.filter((r) => r.term !== 'other'),
      birth_years: birthYearRows,
      birth_year_distribution: birthYearRows,
      age_groups: ageRows.filter((r) => r.label !== 'unknown'),
      avg_grade_by_year: avgGradeByYear,
      avg_grade_by_term: [],
      degree_grade_bins: degreeGradeBins,
      count_by_entry_year: countByEntryYear,
      gender_by_entry_year: genderByEntryYear,
      origin_region_distribution: localizedOriginRegionDistribution,
      gender_by_region: localizedGenderByRegion,
      avg_grade_by_region: localizedAvgGradeByRegion,
      avg_years_to_degree_by_region: localizedAvgYearsToDegreeByRegion,
      origin_country_distribution: originCountryDistribution,
      abroad_count: Number(abroadSummaryRow?.[0]?.abroad_count ?? 0),
      abroad_pct: total > 0 ? Math.round((Number(abroadSummaryRow?.[0]?.abroad_count ?? 0) / total) * 1000) / 10 : 0,
      origin_municipality_distribution: originMunicipalityDistribution,
      oath_year_distribution: oathYearDistribution,
      avg_years_to_degree_by_entry_year: avgYearsToDegreeByEntryYear,
      years_to_degree_distribution: yearsToDegreeDistribution,
    };

    setPublicStatsCache(cacheKey, body);
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=240");
    return res.json(body);
  } catch (err) {
    console.error('[public/stats] failed', err);
    return res.status(500).json({ message: 'Stats query failed' });
  }
}

// Επιστρέφει ανώνυμα συγκεντρωτικά δεδομένα για τον δημόσιο χάρτη.
export async function publicMap(req: Request, res: Response) {
  const context = await buildWhere(req);
  const { byId, findPeriphery } = await buildRegionLookup();
  const rows = await loadPublicMapRows(context);

  const items = rows.map((row) => {
    const regionId = Number((row as any).region_id) || null;
    const rawRegion = regionId ? byId.get(regionId) ?? null : null;
    const periphery = rawRegion ? findPeriphery(regionId) : null;
    const region = periphery ?? rawRegion;
    return {
      region_id: region ? Number(region.id) : regionId,
      region_name: region ? String(region.name) : String((row as any).region_name ?? 'Unknown'),
      region_type: region ? String(region.type) : String((row as any).region_type ?? 'UNKNOWN'),
      latitude: region?.latitude ?? null,
      longitude: region?.longitude ?? null,
      count: Number((row as any).count) || 0,
      male: Number((row as any).male) || 0,
      female: Number((row as any).female) || 0,
    };
  });

  res.json({ ok: true, rows: items });
}

// Εξάγει ανώνυμα δεδομένα αποφοίτων για επισκέπτες.
export async function publicAnonymousGraduatesCsv(req: Request, res: Response) {
  const context = await buildWhere(req);
  const countsMode = req.query.counts_mode === "semester" ? "semester" : "year";
  const genderMode = req.query.gender_mode === "semester" ? "semester" : "year";
  const lang = String(req.query.lang ?? "").toLowerCase().startsWith("en") ? "en" : "gr";

  const { buffer, rowCount } = await buildAnonymousStatisticsWorkbook(context, countsMode, genderMode, lang);

// Τα public exports γράφονται στα logs ως ενέργειες επισκέπτη.
  await logPublicExportAction(req, "statistics_export", "statistics", {
    format: "xlsx",
    graduation_year: req.query.graduation_year ?? null,
    study_program_id: req.query.study_program_id ?? null,
    gender: req.query.gender ?? null,
    age_group: req.query.age_group ?? null,
    counts_mode: countsMode,
    gender_mode: genderMode,
    lang,
    rows: rowCount,
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="statistics-export.xlsx"');
  res.send(buffer);
}

// Γράφει log για δημόσια exports, ακόμα και χωρίς logged-in χρήστη.
export async function publicExportActivity(req: Request, res: Response) {
  const action = typeof req.body?.action === "string" ? req.body.action : "";
  const format = typeof req.body?.format === "string" ? req.body.format : null;

  if (action !== "map_export" && action !== "statistics_export") {
    return res.status(400).json({ ok: false, message: "Invalid action" });
  }

  const entityType = action === "map_export" ? "map" : "statistics";
// Τα public exports γράφονται στα logs ως ενέργειες επισκέπτη.
  await logPublicExportAction(req, action, entityType, { format });
  return res.json({ ok: true });
}
