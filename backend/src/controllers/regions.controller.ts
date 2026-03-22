import type { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import { Graduate } from "../models/Graduate";
import { Region } from "../models/Region";
import { logAction } from "../services/log.service";

const REGION_TYPES = ["PERIPHERY", "NOMOS", "DIMOS", "CITY"] as const;

type RegionType = typeof REGION_TYPES[number];
type CityPayload = {
  name: string;
  type: "CITY";
  parent_id: number;
  latitude: number | null;
  longitude: number | null;
};

type CityValidation = { value: CityPayload } | { error: string };

function badRequest(res: Response, message: string) {
  return res.status(400).json({ ok: false, error: { message } });
}

function notFound(res: Response) {
  return res.status(404).json({ ok: false, error: { message: "Not found" } });
}

function parseId(value: unknown) {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
}

function isRegionType(value: unknown): value is RegionType {
  return typeof value === "string" && (REGION_TYPES as readonly string[]).includes(value);
}

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

async function findRegionById(idValue: unknown) {
  const id = parseId(idValue);
  if (id === null) return { id: null, item: null };
  const item = await Region.findByPk(id);
  return { id, item };
}

function parseListFilters(req: Request) {
  const where: Record<string, unknown> = {};
  const parentRaw = req.query.parent_id;
  const typeRaw = req.query.type;

  if (parentRaw === "null" || parentRaw === "") {
    where.parent_id = null;
  } else if (typeof parentRaw === "string" && parentRaw.trim()) {
    const parentId = parseId(parentRaw);
    if (parentId !== null) where.parent_id = parentId;
  }

  if (isRegionType(typeRaw)) {
    where.type = typeRaw;
  }

  return where;
}

async function validateCityInput(body: any, currentId?: number): Promise<CityValidation> {
  const name = String(body?.name ?? "").trim();
  const parentId = Number(body?.parent_id);
  const latitude = toNullableCoord(body?.latitude);
  const longitude = toNullableCoord(body?.longitude);

  if (!name) return { error: "name is required" };
  if (!Number.isFinite(parentId) || parentId <= 0) return { error: "parent_id is required" };
  if (Number.isNaN(latitude as number)) return { error: "latitude must be a number" };
  if (Number.isNaN(longitude as number)) return { error: "longitude must be a number" };

  const parent = await Region.findByPk(parentId);
  if (!parent || String((parent as any).type) !== "PERIPHERY") {
    return { error: "parent_id must point to a periphery" };
  }

  const siblings = await Region.findAll({
    where: {
      type: "CITY",
      parent_id: parentId,
      ...(currentId ? { id: { [Op.ne]: currentId } } : {}),
    },
    attributes: ["id", "name"],
  });

  const normalizedName = normalizeRegionName(name);
  const duplicate = (siblings as any[]).find((item) => normalizeRegionName(item.name) === normalizedName);
  if (duplicate) {
    return { error: "A city with this name already exists in the selected periphery" };
  }

  return {
    value: {
      name,
      type: "CITY",
      parent_id: parentId,
      latitude,
      longitude,
    },
  };
}

export async function listRegions(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await Region.findAll({
      where: parseListFilters(req),
      order: [["name", "ASC"]],
    });

    res.json({ ok: true, items });
  } catch (err) {
    next(err);
  }
}

export async function getRegion(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, item } = await findRegionById(req.params.id);
    if (id === null) return badRequest(res, "Invalid id");
    if (!item) return notFound(res);

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

    const where: Record<string, unknown> = {
      name: { [Op.like]: `%${q}%` },
    };

    if (isRegionType(type)) {
      where.type = type;
    }

    const items = await Region.findAll({
      where,
      order: [["name", "ASC"]],
      limit: 50,
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
      const current = grouped.get(key);

      if (current) {
        current.count += 1;
        if (!current.periphery_id && periphery) {
          current.periphery_id = periphery.id;
          current.periphery_name = periphery.name;
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
    if (type !== "CITY") return badRequest(res, "Only CITY creation is supported");

    const validated = await validateCityInput(req.body);
    if ("error" in validated) return badRequest(res, validated.error);

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
    const { id, item } = await findRegionById(req.params.id);
    if (id === null) return badRequest(res, "Invalid id");
    if (!item) return notFound(res);
    if (String((item as any).type) !== "CITY") {
      return badRequest(res, "Only CITY update is supported");
    }

    const validated = await validateCityInput({ ...req.body, type: "CITY" }, id);
    if ("error" in validated) return badRequest(res, validated.error);

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
