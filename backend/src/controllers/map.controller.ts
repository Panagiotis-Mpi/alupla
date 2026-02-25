import type { Request, Response } from "express";
import { Op, Sequelize } from "sequelize";

import { Graduate } from "../models/Graduate";
import { Region } from "../models/Region";

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

export async function getGraduatesMap(req: Request, res: Response) {
  const graduationYear = toInt(req.query.graduation_year);
  const studyProgramId = toInt(req.query.study_program_id);
  const gender = (req.query.gender as string | undefined) || "";
  const ageGroup = (req.query.age_group as string | undefined) as AgeGroup | undefined;

  const where: any = {};

  if (studyProgramId) where.study_program_id = studyProgramId;
  if (gender === "M" || gender === "F") where.gender = gender;

  // Filter by graduation year
  if (graduationYear) {
    // Works for MySQL/MariaDB. If dialect differs, YEAR(...) may need adjustment.
    where[Op.and] = (where[Op.and] || []).concat([
      Sequelize.where(Sequelize.fn("YEAR", Sequelize.col("graduation_date")), graduationYear),
    ]);
  }

  // Filter by age group (based on current year - YEAR(birth_date))
  const currentYear = new Date().getFullYear();
  if (ageGroup) {
    const [minAge, maxAge] = ageGroupToRange(ageGroup);
    const minBirth = currentYear - (maxAge ?? 200);
    const maxBirth = currentYear - minAge;
    // YEAR(birth_date) between [minBirth, maxBirth]
    where[Op.and] = (where[Op.and] || []).concat([
      Sequelize.where(Sequelize.fn("YEAR", Sequelize.col("birth_date")), { [Op.between]: [minBirth, maxBirth] }),
    ]);
  }

  // Load regions for parent-chain rollup to PERIPHERY.
  const regions = await Region.findAll({
    attributes: ["id", "name", "type", "parent_id", "latitude", "longitude"],
  });

  const byId = new Map<number, any>();
  for (const r of regions) byId.set(Number((r as any).id), (r as any));

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

  const grads = await Graduate.findAll({
    where,
        // origin_region_id is preferred; origin_municipality is a fallback for older/imported rows.
    attributes: ["origin_region_id", "origin_municipality", "gender", "birth_date"],
  });

  const groups = new Map<number, any>();

  // Initialize all PERIPHERY regions with zeros so the map can show empty peripheries too.
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
    });
  }

  // A lightweight lookup to resolve municipality/city names to a Region id when origin_region_id is missing.
  // This keeps the map useful even if some imported graduates only have origin_municipality filled.
  const normalizeKey = (s: string) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      // remove accents/diacritics
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim();

  const byName = new Map<string, any>();
  for (const r of regions as any[]) {
    const k = normalizeKey(String(r.name || ""));
    if (!k) continue;
    if (!byName.has(k)) byName.set(k, r);
  }

  function resolveRegionIdFromMunicipalityName(name: string | null | undefined): number | null {
    const k = normalizeKey(String(name || ""));
    if (!k) return null;
    const hit = byName.get(k);
    return hit ? (Number(hit.id) || null) : null;
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
    };

    cur.count += 1;
    if (g.gender === "M") cur.male += 1;
    if (g.gender === "F") cur.female += 1;

    const bd = String(g.birth_date || "");
    const by = Number(bd.slice(0, 4));
    if (Number.isFinite(by) && by > 1900) {
      cur.ageSum += currentYear - by;
      cur.ageCount += 1;
    }

    groups.set(id, cur);
  }

  const items = Array.from(groups.values())
    .map((x) => {
      const malePct = x.count ? Math.round((x.male / x.count) * 1000) / 10 : 0;
      const femalePct = x.count ? Math.round((x.female / x.count) * 1000) / 10 : 0;
      const avgAge = x.ageCount ? Math.round((x.ageSum / x.ageCount) * 10) / 10 : null;
      return {
        periphery_id: x.periphery_id,
        periphery_name: x.periphery_name,
        latitude: x.latitude,
        longitude: x.longitude,
        count: x.count,
        male_pct: malePct,
        female_pct: femalePct,
        avg_age: avgAge,
      };
    })
    .sort((a, b) => b.count - a.count);

  const total = items.reduce((s, it) => s + (Number(it.count) || 0), 0);

  return res.json({ ok: true, items, total });
}
