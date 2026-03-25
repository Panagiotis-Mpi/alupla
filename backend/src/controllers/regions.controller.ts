import type { NextFunction, Request, Response } from "express";
import XLSX from "xlsx";
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

type PeripheryPayload = {
  name: string;
  type: "PERIPHERY";
  parent_id: null;
  latitude: number | null;
  longitude: number | null;
};

type CityValidation = { value: CityPayload } | { error: string };
type PeripheryValidation = { value: PeripheryPayload } | { error: string };
type RegionImportMode = "PERIPHERY" | "CITY";

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


function getCellValue(row: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && String(row[name]).trim() !== "") return row[name];
  }
  return undefined;
}

function getTextCell(row: Record<string, unknown>, names: string[]) {
  const value = getCellValue(row, names);
  return String(value ?? "").trim();
}

function getCoordCell(row: Record<string, unknown>, names: string[]) {
  const value = getCellValue(row, names);
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const num = Number(String(value).replace(/,/g, "."));
  return Number.isFinite(num) ? num : NaN;
}

function parseRegionRows(file: Express.Multer.File | undefined) {
  if (!file) return [];
  const workbook = XLSX.read(file.buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
}

async function importPeripheryRows(rows: Record<string, unknown>[], userId: number | null) {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  const existingItems = await Region.findAll({
    where: { type: "PERIPHERY" },
    attributes: ["id", "name"],
  });
  const existingByName = new Map<string, number>();
  for (const item of existingItems as any[]) {
    existingByName.set(normalizeRegionName(item.name), Number(item.id));
  }

  for (const row of rows) {
    const name = getTextCell(row, ["name", "Name", "periphery name", "Periphery name", "όνομα", "Όνομα", "όνομα περιφέρειας", "Όνομα περιφέρειας"]);
    const latitude = getCoordCell(row, ["latitude", "Latitude", "lat", "Lat"]);
    const longitude = getCoordCell(row, ["longitude", "Longitude", "lng", "Lng", "lon", "Lon"]);

    if (!name) {
      skipped += 1;
      continue;
    }

    const existingId = existingByName.get(normalizeRegionName(name));

    if (existingId) {
      const validatedExisting = await validatePeripheryInput({ name, latitude, longitude }, existingId);
      if ("error" in validatedExisting) {
        skipped += 1;
        continue;
      }
      const item = await Region.findByPk(existingId);
      if (!item) {
        skipped += 1;
        continue;
      }
      await item.update(validatedExisting.value as any);
      updated += 1;
      continue;
    }

    const validatedNew = await validatePeripheryInput({ name, latitude, longitude });
    if ("error" in validatedNew) {
      skipped += 1;
      continue;
    }
    const item = await Region.create(validatedNew.value as any);
    existingByName.set(normalizeRegionName(name), Number((item as any).id));
    inserted += 1;
  }

  await logAction({
    user_id: userId,
    action: "import_region_peripheries",
    entity_type: "region",
    entity_id: null,
    details: { inserted, updated, skipped },
  });

  return { inserted, updated, skipped };
}

async function importCityRows(rows: Record<string, unknown>[], userId: number | null) {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  const peripheries = await Region.findAll({
    where: { type: "PERIPHERY" },
    attributes: ["id", "name"],
  });
  const peripheryByName = new Map<string, { id: number; name: string }>();
  for (const item of peripheries as any[]) {
    peripheryByName.set(normalizeRegionName(item.name), { id: Number(item.id), name: String(item.name) });
  }

  for (const row of rows) {
    const name = getTextCell(row, ["name", "Name", "city", "City", "city name", "City name", "πόλη", "Πόλη", "όνομα", "Όνομα", "όνομα πόλης", "Όνομα πόλης"]);
    const peripheryName = getTextCell(row, ["periphery", "Periphery", "periphery name", "Periphery name", "region", "Region", "περιφέρεια", "Περιφέρεια", "όνομα περιφέρειας", "Όνομα περιφέρειας"]);
    const latitude = getCoordCell(row, ["latitude", "Latitude", "lat", "Lat"]);
    const longitude = getCoordCell(row, ["longitude", "Longitude", "lng", "Lng", "lon", "Lon"]);

    if (!name || !peripheryName) {
      skipped += 1;
      continue;
    }

    const periphery = peripheryByName.get(normalizeRegionName(peripheryName));
    if (!periphery) {
      skipped += 1;
      continue;
    }

    const cityItems = await Region.findAll({
      where: { type: "CITY", parent_id: periphery.id },
      attributes: ["id", "name"],
    });
    const existingId = (cityItems as any[])
      .map((item) => ({ id: Number(item.id), key: normalizeRegionName(item.name) }))
      .find((item) => item.key === normalizeRegionName(name))?.id;

    if (existingId) {
      const validatedExisting = await validateCityInput({ name, parent_id: periphery.id, latitude, longitude }, existingId);
      if ("error" in validatedExisting) {
        skipped += 1;
        continue;
      }
      const item = await Region.findByPk(existingId);
      if (!item) {
        skipped += 1;
        continue;
      }
      await item.update(validatedExisting.value as any);
      updated += 1;
      continue;
    }

    const validatedNew = await validateCityInput({ name, parent_id: periphery.id, latitude, longitude });
    if ("error" in validatedNew) {
      skipped += 1;
      continue;
    }
    await Region.create(validatedNew.value as any);
    inserted += 1;
  }

  await logAction({
    user_id: userId,
    action: "import_region_cities",
    entity_type: "region",
    entity_id: null,
    details: { inserted, updated, skipped },
  });

  return { inserted, updated, skipped };
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

async function validatePeripheryInput(body: any, currentId?: number): Promise<PeripheryValidation> {
  const name = String(body?.name ?? "").trim();
  const latitude = toNullableCoord(body?.latitude);
  const longitude = toNullableCoord(body?.longitude);

  if (!name) return { error: "name is required" };
  if (Number.isNaN(latitude as number)) return { error: "latitude must be a number" };
  if (Number.isNaN(longitude as number)) return { error: "longitude must be a number" };

  const peers = await Region.findAll({
    where: {
      type: "PERIPHERY",
      ...(currentId ? { id: { [Op.ne]: currentId } } : {}),
    },
    attributes: ["id", "name"],
  });

  const normalizedName = normalizeRegionName(name);
  const duplicate = (peers as any[]).find((item) => normalizeRegionName(item.name) === normalizedName);
  if (duplicate) {
    return { error: "A periphery with this name already exists" };
  }

  return {
    value: {
      name,
      type: "PERIPHERY",
      parent_id: null,
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

    if (type === "CITY") {
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

      return res.status(201).json({ ok: true, item });
    }

    if (type === "PERIPHERY") {
      const validated = await validatePeripheryInput(req.body);
      if ("error" in validated) return badRequest(res, validated.error);

      const item = await Region.create(validated.value as any);

      await logAction({
        user_id: req.user?.id ?? null,
        action: "create_region_periphery",
        entity_type: "region",
        entity_id: Number((item as any).id),
        details: {
          name: validated.value.name,
        },
      });

      return res.status(201).json({ ok: true, item });
    }

    return badRequest(res, "Only CITY or PERIPHERY creation is supported");
  } catch (err) {
    next(err);
  }
}

export async function updateRegion(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, item } = await findRegionById(req.params.id);
    if (id === null) return badRequest(res, "Invalid id");
    if (!item) return notFound(res);

    const itemType = String((item as any).type ?? "");

    if (itemType === "CITY") {
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

      return res.json({ ok: true, item });
    }

    if (itemType === "PERIPHERY") {
      const validated = await validatePeripheryInput({ ...req.body, type: "PERIPHERY" }, id);
      if ("error" in validated) return badRequest(res, validated.error);

      await item.update(validated.value as any);

      await logAction({
        user_id: req.user?.id ?? null,
        action: "update_region_periphery",
        entity_type: "region",
        entity_id: id,
        details: {
          name: validated.value.name,
        },
      });

      return res.json({ ok: true, item });
    }

    return badRequest(res, "Only CITY or PERIPHERY update is supported");
  } catch (err) {
    next(err);
  }
}


export async function deleteRegion(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, item } = await findRegionById(req.params.id);
    if (id === null) return badRequest(res, "Invalid id");
    if (!item) return notFound(res);

    const itemType = String((item as any).type ?? "");

    if (itemType === "PERIPHERY") {
      const childCount = await Region.count({ where: { parent_id: id, type: "CITY" } });
      if (childCount > 0) return badRequest(res, "Delete the cities of this periphery first");
      await Graduate.update({ origin_region_id: null }, { where: { origin_region_id: id } });
      const name = String((item as any).name ?? "");
      await item.destroy();
      await logAction({
        user_id: req.user?.id ?? null,
        action: "delete_region_periphery",
        entity_type: "region",
        entity_id: id,
        details: { name },
      });
      return res.json({ ok: true });
    }

    if (itemType === "CITY") {
      const name = String((item as any).name ?? "");
      await item.destroy();
      await logAction({
        user_id: req.user?.id ?? null,
        action: "delete_region_city",
        entity_type: "region",
        entity_id: id,
        details: { name, parent_id: (item as any).parent_id ?? null },
      });
      return res.json({ ok: true });
    }

    return badRequest(res, "Only CITY or PERIPHERY deletion is supported");
  } catch (err) {
    next(err);
  }
}

export async function importRegions(req: Request, res: Response, next: NextFunction) {
  try {
    const mode = String(req.body?.mode ?? "").trim() as RegionImportMode;
    if (mode !== "PERIPHERY" && mode !== "CITY") return badRequest(res, "Invalid import mode");

    const rows = parseRegionRows(req.file);
    if (!rows.length) return badRequest(res, "The file does not contain rows");

    const summary = mode === "PERIPHERY"
      ? await importPeripheryRows(rows, req.user?.id ?? null)
      : await importCityRows(rows, req.user?.id ?? null);

    res.json({ ok: true, summary });
  } catch (err) {
    next(err);
  }
}
