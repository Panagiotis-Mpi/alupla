import type { Request, Response } from "express";
import { Op } from "sequelize";
import { Graduate } from "../models/Graduate";
import { Region } from "../models/Region";
import { StudyProgram } from "../models/StudyProgram";
import { ProgramDirection } from "../models/ProgramDirection";
import { buildGraduateWhere } from "../utils/buildGraduateWhere";

function toInt(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

type AgeGroup = "18-22" | "23-26" | "27-30" | "31+";

function ageGroupToRange(g: AgeGroup): [number, number | null] {
  if (g === "18-22") return [18, 22];
  if (g === "23-26") return [23, 26];
  if (g === "27-30") return [27, 30];
  return [31, null];
}

function buildMapWhere(req: Request) {
  const graduationYear = toInt(req.query.graduation_year);
  const ageGroup = (req.query.age_group as string | undefined) as AgeGroup | undefined;
  const where: any = buildGraduateWhere(req.query as Record<string, unknown>);
  const currentYear = new Date().getFullYear();
  const andParts = Array.isArray(where[Op.and]) ? [...where[Op.and]] : [];

  if (graduationYear) {
    andParts.push({ graduation_date: { [Op.between]: [`${graduationYear}-01-01`, `${graduationYear}-12-31`] } });
  }

  if (ageGroup) {
    const [minAge, maxAge] = ageGroupToRange(ageGroup);
    const minBirth = currentYear - (maxAge ?? 120);
    const maxBirth = currentYear - minAge;
    andParts.push({ birth_date: { [Op.between]: [`${minBirth}-01-01`, `${maxBirth}-12-31`] } });
  }

  if (andParts.length) where[Op.and] = andParts;
  return { where, currentYear };
}

async function loadRegions() {
  const regions = await Region.findAll({
    attributes: ["id", "name", "type", "parent_id", "latitude", "longitude"],
  });

  const byId = new Map<number, any>();
  for (const r of regions) byId.set(Number((r as any).id), (r as any));

  const normalizeKey = (s: string) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim();

  const byName = new Map<string, any>();
  for (const r of regions as any[]) {
    const key = normalizeKey(String(r.name || ""));
    if (!key || byName.has(key)) continue;
    byName.set(key, r);
  }

  function findPeriphery(regionId: number | null | undefined): any | null {
    if (!regionId) return null;
    let cur = byId.get(Number(regionId));
    let guard = 0;
    while (cur && guard++ < 20) {
      if (String(cur.type) === "PERIPHERY") return cur;
      const pid = cur.parent_id ? Number(cur.parent_id) : null;
      if (!pid) return null;
      cur = byId.get(pid);
    }
    return null;
  }

  function resolveRegionIdFromMunicipalityName(name: string | null | undefined): number | null {
    const key = normalizeKey(String(name || ""));
    if (!key) return null;
    const hit = byName.get(key);
    return hit ? (Number(hit.id) || null) : null;
  }

  return { regions, findPeriphery, resolveRegionIdFromMunicipalityName };
}

export async function getMapFilterOptions(_req: Request, res: Response) {
  const [studyPrograms, programDirections, regions] = await Promise.all([
    StudyProgram.findAll({
      attributes: ["id", "code", "name_el", "name_en"],
      where: { is_active: true },
      order: [["code", "ASC"]],
    }),
    ProgramDirection.findAll({
      attributes: ["id", "study_program_id", "code", "name_el", "name_en"],
      where: { is_active: true },
      order: [["study_program_id", "ASC"], ["code", "ASC"]],
    }),
    Region.findAll({
      attributes: ["id", "name", "type", "parent_id"],
      where: { type: "PERIPHERY" },
      order: [["name", "ASC"]],
    }),
  ]);

  return res.json({ ok: true, studyPrograms, programDirections, regions });
}

export async function getGraduatesMap(req: Request, res: Response) {
  const { where, currentYear } = buildMapWhere(req);
  const { regions, findPeriphery, resolveRegionIdFromMunicipalityName } = await loadRegions();

  const grads = await Graduate.findAll({
    where,
    attributes: ["origin_region_id", "origin_municipality", "gender", "birth_date", "degree_grade", "entry_year", "graduation_date"],
  });

  const groups = new Map<number, any>();

  for (const r of regions as any[]) {
    if (String(r.type) !== "PERIPHERY") continue;
    const id = Number(r.id);
    groups.set(id, {
      periphery_id: id,
      periphery_name: String(r.name),
      latitude: r.latitude ?? null,
      longitude: r.longitude ?? null,
      count: 0,
      male: 0,
      female: 0,
      ageSum: 0,
      ageCount: 0,
      gradeSum: 0,
      gradeCount: 0,
      graduationDurationSum: 0,
      graduationDurationCount: 0,
    });
  }

  for (const g of grads as any[]) {
    const originId = Number(g.origin_region_id) || resolveRegionIdFromMunicipalityName(g.origin_municipality);
    const per = findPeriphery(originId);
    if (!per) continue;

    const id = Number(per.id);
    const cur = groups.get(id) || {
      periphery_id: id,
      periphery_name: String(per.name),
      latitude: per.latitude ?? null,
      longitude: per.longitude ?? null,
      count: 0,
      male: 0,
      female: 0,
      ageSum: 0,
      ageCount: 0,
      gradeSum: 0,
      gradeCount: 0,
      graduationDurationSum: 0,
      graduationDurationCount: 0,
    };

    cur.count += 1;
    if (g.gender === "M") cur.male += 1;
    if (g.gender === "F") cur.female += 1;

    const by = Number(String(g.birth_date ?? "").slice(0, 4));
    if (Number.isFinite(by) && by > 1900) {
      cur.ageSum += currentYear - by;
      cur.ageCount += 1;
    }

    const degreeGrade = Number(g.degree_grade);
    if (Number.isFinite(degreeGrade) && degreeGrade >= 0) {
      cur.gradeSum += degreeGrade;
      cur.gradeCount += 1;
    }

    const entryYear = Number(g.entry_year);
    const graduationYear = Number(String(g.graduation_date ?? "").slice(0, 4));
    if (Number.isFinite(entryYear) && Number.isFinite(graduationYear) && entryYear > 1900 && graduationYear >= entryYear) {
      cur.graduationDurationSum += graduationYear - entryYear;
      cur.graduationDurationCount += 1;
    }

    groups.set(id, cur);
  }

  const items = Array.from(groups.values())
    .map((x) => ({
      periphery_id: x.periphery_id,
      periphery_name: x.periphery_name,
      latitude: x.latitude,
      longitude: x.longitude,
      count: x.count,
      male_pct: x.count ? Math.round((x.male / x.count) * 1000) / 10 : 0,
      female_pct: x.count ? Math.round((x.female / x.count) * 1000) / 10 : 0,
      avg_age: x.ageCount ? Math.round((x.ageSum / x.ageCount) * 10) / 10 : null,
      avg_grade: x.gradeCount ? Math.round((x.gradeSum / x.gradeCount) * 100) / 100 : null,
      avg_graduation_years: x.graduationDurationCount ? Math.round((x.graduationDurationSum / x.graduationDurationCount) * 10) / 10 : null,
    }))
    .sort((a, b) => b.count - a.count);

  const total = items.reduce((s, it) => s + (Number(it.count) || 0), 0);
  return res.json({ ok: true, items, total });
}

export async function getMapCities(req: Request, res: Response) {
  const { where } = buildMapWhere(req);
  const { regions, findPeriphery, resolveRegionIdFromMunicipalityName } = await loadRegions();

  const cityRegions = (regions as any[]).filter((region) => String(region.type) === "CITY" && region.latitude !== null && region.longitude !== null);
  const cityById = new Map<number, any>();
  const groups = new Map<number, any>();

  for (const city of cityRegions) {
    const cityId = Number(city.id);
    if (!cityId) continue;
    const per = findPeriphery(city.parent_id ? Number(city.parent_id) : cityId);
    cityById.set(cityId, city);
    groups.set(cityId, {
      city_id: cityId,
      city_name: String(city.name),
      periphery_id: per ? Number(per.id) : null,
      periphery_name: per ? String(per.name) : "",
      latitude: city.latitude ?? null,
      longitude: city.longitude ?? null,
      count: 0,
    });
  }

  const grads = await Graduate.findAll({
    where,
    attributes: ["origin_region_id", "origin_municipality"],
  });

  for (const g of grads as any[]) {
    let cityId = Number(g.origin_region_id) || 0;
    const directHit = cityById.get(cityId);
    if (!directHit) {
      cityId = resolveRegionIdFromMunicipalityName(g.origin_municipality) || 0;
    }
    if (!cityId || !groups.has(cityId)) continue;
    const cur = groups.get(cityId);
    cur.count += 1;
  }

  const items = Array.from(groups.values())
    .filter((item) => item.count > 0)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.periphery_name !== b.periphery_name) return a.periphery_name.localeCompare(b.periphery_name, "el");
      return a.city_name.localeCompare(b.city_name, "el");
    });

  return res.json({ ok: true, items });
}

export async function getRegionCities(req: Request, res: Response) {
  const peripheryId = toInt(req.query.periphery_id);
  if (!peripheryId) return res.status(400).json({ ok: false, error: "periphery_id is required" });

  const { where, currentYear } = buildMapWhere(req);
  const { findPeriphery, resolveRegionIdFromMunicipalityName } = await loadRegions();

  const grads = await Graduate.findAll({
    where,
    attributes: ["origin_region_id", "origin_municipality", "gender", "birth_date", "degree_grade", "entry_year", "graduation_date"],
  });

  const groups = new Map<string, any>();

  for (const g of grads as any[]) {
    const originId = Number(g.origin_region_id) || resolveRegionIdFromMunicipalityName(g.origin_municipality);
    const per = findPeriphery(originId);
    if (!per || Number(per.id) !== peripheryId) continue;

    const name = String(g.origin_municipality || "").trim();
    if (!name) continue;

    const key = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim();

    const cur = groups.get(key) || {
      city: name,
      count: 0,
      male: 0,
      female: 0,
      ageSum: 0,
      ageCount: 0,
      gradeSum: 0,
      gradeCount: 0,
      graduationDurationSum: 0,
      graduationDurationCount: 0,
    };

    cur.count += 1;
    if (g.gender === "M") cur.male += 1;
    if (g.gender === "F") cur.female += 1;

    const by = Number(String(g.birth_date ?? "").slice(0, 4));
    if (Number.isFinite(by) && by > 1900) {
      cur.ageSum += currentYear - by;
      cur.ageCount += 1;
    }

    const degreeGrade = Number(g.degree_grade);
    if (Number.isFinite(degreeGrade) && degreeGrade >= 0) {
      cur.gradeSum += degreeGrade;
      cur.gradeCount += 1;
    }

    const entryYear = Number(g.entry_year);
    const graduationYear = Number(String(g.graduation_date ?? "").slice(0, 4));
    if (Number.isFinite(entryYear) && Number.isFinite(graduationYear) && entryYear > 1900 && graduationYear >= entryYear) {
      cur.graduationDurationSum += graduationYear - entryYear;
      cur.graduationDurationCount += 1;
    }

    groups.set(key, cur);
  }

  const items = Array.from(groups.values())
    .map((x) => ({
      city: x.city,
      count: x.count,
      male_pct: x.count ? Math.round((x.male / x.count) * 1000) / 10 : 0,
      female_pct: x.count ? Math.round((x.female / x.count) * 1000) / 10 : 0,
      avg_age: x.ageCount ? Math.round((x.ageSum / x.ageCount) * 10) / 10 : null,
      avg_grade: x.gradeCount ? Math.round((x.gradeSum / x.gradeCount) * 100) / 100 : null,
      avg_graduation_years: x.graduationDurationCount ? Math.round((x.graduationDurationSum / x.graduationDurationCount) * 10) / 10 : null,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.city.localeCompare(b.city, "el");
    })
    .slice(0, 3);

  return res.json({ ok: true, items });
}
