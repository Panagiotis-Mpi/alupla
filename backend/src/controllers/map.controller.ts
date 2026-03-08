import type { Request, Response } from "express";
import { Op, Sequelize } from "sequelize";

import { Graduate } from "../models/Graduate";
import { Region } from "../models/Region";

type AgeGroup = "18-22" | "23-26" | "27-30" | "31+";
type RegionRow = {
  id: number;
  name: string;
  type: string;
  parent_id: number | null;
  latitude: number | null;
  longitude: number | null;
};

type MapGroup = {
  periphery_id: number;
  periphery_name: string;
  latitude: number | null;
  longitude: number | null;
  count: number;
  male: number;
  female: number;
  ageSum: number;
  ageCount: number;
};

function toInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function getAgeRange(group: AgeGroup): [number, number | null] {
  if (group === "18-22") return [18, 22];
  if (group === "23-26") return [23, 26];
  if (group === "27-30") return [27, 30];
  return [31, null];
}

function parseFilters(req: Request) {
  return {
    graduationYear: toInt(req.query.graduation_year),
    studyProgramId: toInt(req.query.study_program_id),
    gender: typeof req.query.gender === "string" ? req.query.gender : "",
    ageGroup: typeof req.query.age_group === "string" ? (req.query.age_group as AgeGroup) : undefined,
  };
}

function buildGraduateWhere(filters: ReturnType<typeof parseFilters>) {
  const where: any = {};

  if (filters.studyProgramId) where.study_program_id = filters.studyProgramId;
  if (filters.gender === "M" || filters.gender === "F") where.gender = filters.gender;

  if (filters.graduationYear) {
    where[Op.and] = (where[Op.and] || []).concat([
      Sequelize.where(Sequelize.fn("YEAR", Sequelize.col("graduation_date")), filters.graduationYear),
    ]);
  }

  if (filters.ageGroup) {
    const currentYear = new Date().getFullYear();
    const [minAge, maxAge] = getAgeRange(filters.ageGroup);
    const minBirthYear = currentYear - (maxAge ?? 200);
    const maxBirthYear = currentYear - minAge;

    where[Op.and] = (where[Op.and] || []).concat([
      {
        birth_date: {
          [Op.between]: [`${minBirthYear}-01-01`, `${maxBirthYear}-12-31`],
        }
      }
    ]);
  }

  return where;
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildRegionMaps(regions: RegionRow[]) {
  const byId = new Map<number, RegionRow>();
  const byName = new Map<string, RegionRow>();

  for (const region of regions) {
    byId.set(region.id, region);

    const key = normalizeName(String(region.name || ""));
    if (key && !byName.has(key)) {
      byName.set(key, region);
    }
  }

  return { byId, byName };
}

function findPeriphery(byId: Map<number, RegionRow>, regionId: number | null | undefined): RegionRow | null {
  if (!regionId) return null;

  let current = byId.get(Number(regionId));
  let steps = 0;

  while (current && steps < 20) {
    steps += 1;
    if (String(current.type) === "PERIPHERY") return current;
    if (!current.parent_id) return null;
    current = byId.get(Number(current.parent_id));
  }

  return null;
}

function resolveRegionId(byName: Map<string, RegionRow>, municipality: string | null | undefined): number | null {
  const key = normalizeName(String(municipality || ""));
  if (!key) return null;

  const region = byName.get(key);
  return region ? Number(region.id) : null;
}

function createEmptyGroup(periphery: RegionRow): MapGroup {
  return {
    periphery_id: periphery.id,
    periphery_name: periphery.name,
    latitude: periphery.latitude ?? null,
    longitude: periphery.longitude ?? null,
    count: 0,
    male: 0,
    female: 0,
    ageSum: 0,
    ageCount: 0,
  };
}

function initPeripheryGroups(regions: RegionRow[]) {
  const groups = new Map<number, MapGroup>();

  for (const region of regions) {
    if (String(region.type) !== "PERIPHERY") continue;
    groups.set(region.id, createEmptyGroup(region));
  }

  return groups;
}

export async function getGraduatesMap(req: Request, res: Response) {
  const filters = parseFilters(req);
  const where = buildGraduateWhere(filters);
  const currentYear = new Date().getFullYear();

  const regionRows = (await Region.findAll({
    attributes: ["id", "name", "type", "parent_id", "latitude", "longitude"],
  })) as any[];

  const regions: RegionRow[] = regionRows.map((region) => ({
    id: Number(region.id),
    name: String(region.name),
    type: String(region.type),
    parent_id: region.parent_id ? Number(region.parent_id) : null,
    latitude: region.latitude ?? null,
    longitude: region.longitude ?? null,
  }));

  const { byId, byName } = buildRegionMaps(regions);
  const groups = initPeripheryGroups(regions);

  const graduates = await Graduate.findAll({
    where,
    attributes: ["origin_region_id", "origin_municipality", "gender", "birth_date"],
  });

  for (const graduate of graduates as any[]) {
    const directRegionId = Number(graduate.origin_region_id) || null;
    const fallbackRegionId = resolveRegionId(byName, graduate.origin_municipality);
    const periphery = findPeriphery(byId, directRegionId || fallbackRegionId);
    if (!periphery) continue;

    const group = groups.get(periphery.id) ?? createEmptyGroup(periphery);
    group.count += 1;

    if (graduate.gender === "M") group.male += 1;
    if (graduate.gender === "F") group.female += 1;

    const birthYear = Number(String(graduate.birth_date ?? "").slice(0, 4));
    if (Number.isFinite(birthYear) && birthYear > 1900) {
      group.ageSum += currentYear - birthYear;
      group.ageCount += 1;
    }

    groups.set(periphery.id, group);
  }

  const rows = Array.from(groups.values())
    .map((group) => ({
      periphery_id: group.periphery_id,
      periphery_name: group.periphery_name,
      latitude: group.latitude,
      longitude: group.longitude,
      count: group.count,
      male_pct: group.count ? Math.round((group.male / group.count) * 100) : 0,
      female_pct: group.count ? Math.round((group.female / group.count) * 100) : 0,
      avg_age: group.ageCount ? Number((group.ageSum / group.ageCount).toFixed(1)) : null,
    }))
    .sort((a, b) => a.periphery_name.localeCompare(b.periphery_name, "el"));

  return res.json({ ok: true, rows });
}
