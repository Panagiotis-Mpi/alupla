import type { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import { Graduate } from "../models/Graduate";
import { Region } from "../models/Region";
import { logAction } from "../services/log.service";

function normalizeRegionName(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}


function normalizeLookupKey(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toNullableCoord(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : NaN;
}

async function validateCityInput(body: any, currentId?: number) {
  const name = String(body?.name ?? "").trim();
  const parentRaw = Number(body?.parent_id);
  const latitude = toNullableCoord(body?.latitude);
  const longitude = toNullableCoord(body?.longitude);

  if (!name) return { error: "name is required" };
  if (!Number.isFinite(parentRaw) || parentRaw <= 0) return { error: "parent_id is required" };
  if (Number.isNaN(latitude as any)) return { error: "latitude must be a number" };
  if (Number.isNaN(longitude as any)) return { error: "longitude must be a number" };

  const parent = await Region.findByPk(parentRaw);
  if (!parent || String((parent as any).type) !== "PERIPHERY") {
    return { error: "parent_id must point to a periphery" };
  }

  const siblings = await Region.findAll({
    where: {
      type: "CITY",
      parent_id: parentRaw,
      ...(currentId ? { id: { [Op.ne]: currentId } } : {}),
    },
    attributes: ["id", "name"],
  });

  const normalizedName = normalizeRegionName(name);
  const duplicate = (siblings as any[]).find((item) => normalizeRegionName(item.name) === normalizedName);
  if (duplicate) return { error: "A city with this name already exists in the selected periphery" };

  return {
    value: {
      name,
      type: "CITY",
      parent_id: parentRaw,
      latitude,
      longitude,
    },
  };
}

export async function listRegions(req: Request, res: Response, next: NextFunction) {
  try {
    const parentRaw = req.query.parent_id;
    const typeRaw = req.query.type;

    const where: any = {};

    if (parentRaw === "null" || parentRaw === "") {
      where.parent_id = null;
    } else if (typeof parentRaw === "string" && parentRaw.trim().length) {
      const n = Number(parentRaw);
      if (Number.isFinite(n)) where.parent_id = n;
    }

    if (typeof typeRaw === "string" && ["PERIPHERY", "NOMOS", "DIMOS", "CITY"].includes(typeRaw)) {
      where.type = typeRaw;
    }

    const items = await Region.findAll({
      where,
      order: [["name", "ASC"]]
    });

    res.json({ ok: true, items });
  } catch (err) {
    next(err);
  }
}

export async function getRegion(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: { message: "Invalid id" } });

    const item = await Region.findByPk(id);
    if (!item) return res.status(404).json({ ok: false, error: { message: "Not found" } });

    res.json({ ok: true, item });
  } catch (err) {
    next(err);
  }
}

export async function searchRegions(req: Request, res: Response, next: NextFunction) {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const type = typeof req.query.type === "string" ? req.query.type.trim() : "";
    if (!q) return res.json({ ok: true, items: [] });

    const where: any = { name: { [Op.like]: `%${q}%` } };
    if (["PERIPHERY", "NOMOS", "DIMOS", "CITY"].includes(type)) where.type = type;

    const items = await Region.findAll({
      where,
      order: [["name", "ASC"]],
      limit: 50
    });

    res.json({ ok: true, items });
  } catch (err) {
    next(err);
  }
}


export async function listUnmatchedCities(req: Request, res: Response, next: NextFunction) {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    const [regions, graduates] = await Promise.all([
      Region.findAll({ attributes: ["id", "name", "type", "parent_id"] }),
      Graduate.findAll({ attributes: ["origin_municipality", "origin_region_id"] }),
    ]);

    const peripheryById = new Map<number, { id: number; name: string }>();
    const cityKeys = new Set<string>();

    for (const row of regions as any[]) {
      const id = Number(row.id);
      const type = String(row.type ?? "");
      const name = String(row.name ?? "").trim();
      if (!name) continue;
      if (type === "PERIPHERY") peripheryById.set(id, { id, name });
      if (type === "CITY") cityKeys.add(normalizeLookupKey(name));
    }

    const grouped = new Map<string, {
      name: string;
      count: number;
      periphery_id: number | null;
      periphery_name: string | null;
    }>();

    for (const row of graduates as any[]) {
      const rawName = String(row.origin_municipality ?? "").trim();
      if (!rawName) continue;
      const key = normalizeLookupKey(rawName);
      if (!key || cityKeys.has(key)) continue;

      const regionId = row.origin_region_id != null ? Number(row.origin_region_id) : null;
      const periphery = regionId ? peripheryById.get(regionId) ?? null : null;
      const existing = grouped.get(key);

      if (existing) {
        existing.count += 1;
        if (!existing.periphery_id && periphery) {
          existing.periphery_id = periphery.id;
          existing.periphery_name = periphery.name;
        }
        continue;
      }

      grouped.set(key, {
        name: rawName,
        count: 1,
        periphery_id: periphery?.id ?? null,
        periphery_name: periphery?.name ?? null,
      });
    }

    let items = Array.from(grouped.values());

    if (q) {
      const qKey = normalizeLookupKey(q);
      items = items.filter((item) => normalizeLookupKey(item.name).includes(qKey));
    }

    items.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name, "el");
    });

    res.json({ ok: true, items });
  } catch (err) {
    next(err);
  }
}

export async function createRegion(req: Request, res: Response, next: NextFunction) {
  try {
    const type = String(req.body?.type ?? "").trim();
    if (type !== "CITY") return res.status(400).json({ ok: false, error: { message: "Only CITY creation is supported" } });

    const validated = await validateCityInput(req.body);
    if ('error' in validated) return res.status(400).json({ ok: false, error: { message: validated.error } });

    const item = await Region.create(validated.value as any);

    await logAction({
      user_id: req.user?.id ?? null,
      action: "create_region_city",
      entity_type: "region",
      entity_id: Number((item as any).id),
      details: {
        name: validated.value.name,
        parent_id: validated.value.parent_id,
      },
    });

    res.status(201).json({ ok: true, item });
  } catch (err) {
    next(err);
  }
}

export async function updateRegion(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: { message: "Invalid id" } });

    const item = await Region.findByPk(id);
    if (!item) return res.status(404).json({ ok: false, error: { message: "Not found" } });
    if (String((item as any).type) !== "CITY") {
      return res.status(400).json({ ok: false, error: { message: "Only CITY update is supported" } });
    }

    const validated = await validateCityInput({ ...req.body, type: "CITY" }, id);
    if ('error' in validated) return res.status(400).json({ ok: false, error: { message: validated.error } });

    await item.update(validated.value as any);

    await logAction({
      user_id: req.user?.id ?? null,
      action: "update_region_city",
      entity_type: "region",
      entity_id: id,
      details: {
        name: validated.value.name,
        parent_id: validated.value.parent_id,
      },
    });

    res.json({ ok: true, item });
  } catch (err) {
    next(err);
  }
}
