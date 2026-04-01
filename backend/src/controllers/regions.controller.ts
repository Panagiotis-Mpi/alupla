import type { NextFunction, Request, Response } from "express";
import XLSX from "xlsx";
import { Op } from "sequelize";
import { Graduate } from "../models/Graduate";
import { Region } from "../models/Region";
import { RegionAlias } from "../models/RegionAlias";
import { UnresolvedRegion } from "../models/UnresolvedRegion";
import { logAction } from "../services/log.service";
import { cleanRegionText, normalizeRegionText } from "../utils/regionText";
import { clearRegionLookupCache, normalizeOriginLocation } from "../utils/resolvePeripheryRegionId";

const REGION_TYPES = ["PERIPHERY", "NOMOS", "DIMOS", "CITY"] as const;
type RegionType = typeof REGION_TYPES[number];
type RegionImportMode = "PERIPHERY" | "CITY";

type RegionPayload = {
  name: string;
  normalized_name: string;
  external_ref_id: string | null;
  latitude: number | null;
  longitude: number | null;
};

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
  return cleanRegionText(value ?? "");
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

async function ensureAlias(regionId: number, alias: string, aliasType = "manual") {
  const clean = cleanRegionText(alias);
  const normalized = normalizeRegionText(clean);
  if (!clean || !normalized) return;
  const exists = await RegionAlias.findOne({ where: { region_id: regionId, normalized_alias: normalized } });
  if (!exists) {
    await RegionAlias.create({ region_id: regionId, alias: clean, normalized_alias: normalized, alias_type: aliasType } as any);
  }
}

function buildPeripheryNameHelpers(regions: any[]) {
  const byId = new Map<number, any>();

  for (const row of regions as any[]) {
    byId.set(Number(row.id), row);
  }

  const findPeripheryId = (regionId: unknown) => {
    let currentId = Number(regionId || 0) || 0;
    let guard = 0;
    while (currentId > 0 && guard < 20) {
      guard += 1;
      const current = byId.get(currentId);
      if (!current) return null;
      if (String(current.type) === "PERIPHERY") return currentId;
      currentId = Number(current.parent_id || 0) || 0;
    }
    return null;
  };

  const getPeripheryNormalizedName = (regionId: unknown) => {
    const peripheryId = findPeripheryId(regionId);
    if (!peripheryId) return null;
    const periphery = byId.get(peripheryId);
    if (!periphery) return null;
    return String(periphery.normalized_name || normalizeRegionText(periphery.name) || "") || null;
  };

  return { byId, findPeripheryId, getPeripheryNormalizedName };
}

async function refreshUnresolvedQueue() {
  const [regions, aliases, graduates] = await Promise.all([
    Region.findAll({ attributes: ["id", "name", "type", "parent_id", "normalized_name"] }),
    RegionAlias.findAll({ attributes: ["region_id", "normalized_alias"] }),
    Graduate.findAll({ attributes: ["id", "origin_region_id", "origin_city_region_id", "origin_municipality"] }),
  ]);

  const { byId, findPeripheryId, getPeripheryNormalizedName } = buildPeripheryNameHelpers(regions as any[]);
  const cityKeys = new Set<string>();
  const aliasKeys = new Set<string>();

  for (const row of regions as any[]) {
    if (String(row.type) !== "CITY") continue;
    const normalizedName = String(row.normalized_name || normalizeRegionText(row.name));
    if (!normalizedName) continue;
    const peripheryName = getPeripheryNormalizedName(row.id);
    cityKeys.add(`${normalizedName}::${peripheryName ?? "none"}`);
    cityKeys.add(`${normalizedName}::none`);
  }

  for (const row of aliases as any[]) {
    const region = byId.get(Number(row.region_id));
    if (!region) continue;
    const normalizedAlias = String(row.normalized_alias || "");
    if (!normalizedAlias) continue;
    const peripheryName = getPeripheryNormalizedName(region.id);
    aliasKeys.add(`${normalizedAlias}::${peripheryName ?? "none"}`);
    aliasKeys.add(`${normalizedAlias}::none`);
  }

  const grouped = new Map<string, { raw_name: string; normalized_raw_name: string; periphery_id: number | null; count: number }>();

  for (const row of graduates as any[]) {
    const normalizedOrigin = await normalizeOriginLocation({
      origin_region_id: row.origin_region_id != null ? Number(row.origin_region_id) : null,
      origin_city_region_id: row.origin_city_region_id != null ? Number(row.origin_city_region_id) : null,
      origin_municipality: row.origin_municipality ?? null,
    });

    const nextPeripheryId = normalizedOrigin.origin_region_id != null ? findPeripheryId(normalizedOrigin.origin_region_id) ?? Number(normalizedOrigin.origin_region_id) : null;
    const currentPeripheryId = row.origin_region_id != null ? findPeripheryId(row.origin_region_id) ?? Number(row.origin_region_id) : null;
    const currentCityId = row.origin_city_region_id != null ? Number(row.origin_city_region_id) : null;
    const nextCityId = normalizedOrigin.origin_city_region_id != null ? Number(normalizedOrigin.origin_city_region_id) : null;
    const nextMunicipality = normalizedOrigin.origin_municipality ?? null;
    const currentMunicipality = row.origin_municipality != null ? String(row.origin_municipality) : null;

    if (
      currentPeripheryId !== nextPeripheryId ||
      currentCityId !== nextCityId ||
      String(currentMunicipality || "") !== String(nextMunicipality || "")
    ) {
      await Graduate.update(
        {
          origin_region_id: nextPeripheryId,
          origin_city_region_id: nextCityId,
          origin_municipality: nextMunicipality,
        },
        { where: { id: Number(row.id) } }
      );
    }

    if (nextCityId) continue;

    const raw = cleanRegionText(nextMunicipality);
    const normalized = normalizeRegionText(raw);
    if (!normalized) continue;
    const peripheryId = nextPeripheryId;
    const peripheryName = getPeripheryNormalizedName(peripheryId);
    if (cityKeys.has(`${normalized}::${peripheryName ?? "none"}`) || aliasKeys.has(`${normalized}::${peripheryName ?? "none"}`)) continue;
    const groupKey = `${normalized}::${peripheryId ?? "none"}`;
    const current = grouped.get(groupKey);
    if (current) current.count += 1;
    else grouped.set(groupKey, { raw_name: raw, normalized_raw_name: normalized, periphery_id: peripheryId, count: 1 });
  }

  const existingRows = await UnresolvedRegion.findAll();
  const existingByKey = new Map<string, any>();
  for (const row of existingRows as any[]) {
    existingByKey.set(`${row.normalized_raw_name}::${row.periphery_id ?? "none"}`, row);
  }

  for (const [key, value] of grouped.entries()) {
    const existing = existingByKey.get(key);
    if (existing) {
      await existing.update({ raw_name: value.raw_name, count: value.count, status: "pending", canonical_region_id: null, resolved_by_user_id: null });
      existingByKey.delete(key);
    } else {
      await UnresolvedRegion.create({ ...value, status: "pending" } as any);
    }
  }

  for (const leftover of existingByKey.values()) {
    if (String(leftover.status) === "pending") {
      await leftover.update({ count: 0 });
    }
  }
}


async function applyCanonicalCityToGraduates(unresolved: any, region: any) {
  const rawNormalized = String(unresolved.normalized_raw_name || normalizeRegionText(unresolved.raw_name));
  const [grads, regions] = await Promise.all([
    Graduate.findAll({ attributes: ["id", "origin_region_id", "origin_city_region_id", "origin_municipality"] }),
    Region.findAll({ attributes: ["id", "name", "type", "parent_id", "normalized_name"] }),
  ]);

  const { findPeripheryId, getPeripheryNormalizedName } = buildPeripheryNameHelpers(regions as any[]);
  const unresolvedPeripheryName = getPeripheryNormalizedName(unresolved.periphery_id);
  const regionPeripheryName = getPeripheryNormalizedName(region.id);

  for (const graduate of grads as any[]) {
    if (normalizeRegionText(graduate.origin_municipality) !== rawNormalized) continue;

    const currentNormalized = await normalizeOriginLocation({
      origin_region_id: graduate.origin_region_id != null ? Number(graduate.origin_region_id) : null,
      origin_city_region_id: graduate.origin_city_region_id != null ? Number(graduate.origin_city_region_id) : null,
      origin_municipality: graduate.origin_municipality ?? null,
    });

    const currentPeripheryId = currentNormalized.origin_region_id != null ? findPeripheryId(currentNormalized.origin_region_id) ?? Number(currentNormalized.origin_region_id) : null;
    const currentPeripheryName = getPeripheryNormalizedName(currentPeripheryId);

    if (
      unresolved.periphery_id != null &&
      currentPeripheryId != null &&
      currentPeripheryId !== Number(unresolved.periphery_id) &&
      unresolvedPeripheryName &&
      currentPeripheryName !== unresolvedPeripheryName
    ) {
      continue;
    }

    const nextValue = await normalizeOriginLocation({
      origin_region_id: Number((region as any).parent_id || 0) || null,
      origin_city_region_id: Number(region.id),
      origin_municipality: graduate.origin_municipality,
    });

    if (regionPeripheryName && getPeripheryNormalizedName(nextValue.origin_region_id) !== regionPeripheryName) {
      nextValue.origin_region_id = Number((region as any).parent_id || 0) || null;
    }

    await graduate.update(nextValue);
  }
}

async function autoResolveDirectMatches(userId: number | null = null) {
  const [pendingItems, regions] = await Promise.all([
    UnresolvedRegion.findAll({ where: { status: "pending", count: { [Op.gt]: 0 } } }),
    Region.findAll({ attributes: ["id", "name", "normalized_name", "type", "parent_id"] }),
  ]);

  const { getPeripheryNormalizedName } = buildPeripheryNameHelpers(regions as any[]);
  const cities = (regions as any[]).filter((item) => String(item.type) === "CITY");
  const cityByScopedKey = new Map<string, any>();
  const cityByName = new Map<string, any[]>();

  for (const city of cities as any[]) {
    const normalizedName = String(city.normalized_name || normalizeRegionText(city.name));
    const peripheryName = getPeripheryNormalizedName(city.id);
    cityByScopedKey.set(`${normalizedName}::${peripheryName ?? "none"}`, city);
    const items = cityByName.get(normalizedName);
    if (items) items.push(city);
    else cityByName.set(normalizedName, [city]);
  }

  let changed = false;

  for (const unresolved of pendingItems as any[]) {
    const normalizedName = String(unresolved.normalized_raw_name || normalizeRegionText(unresolved.raw_name));
    const peripheryName = getPeripheryNormalizedName(unresolved.periphery_id);

    let region = cityByScopedKey.get(`${normalizedName}::${peripheryName ?? "none"}`) ?? null;
    if (!region && !peripheryName) {
      const matches = cityByName.get(normalizedName) ?? [];
      if (matches.length === 1) region = matches[0];
    }
    if (!region) continue;

    await ensureAlias(Number(region.id), String(unresolved.raw_name), "auto");
    await applyCanonicalCityToGraduates(unresolved, region);
    await unresolved.update({
      status: "resolved",
      canonical_region_id: Number(region.id),
      resolved_by_user_id: userId,
      count: 0,
    });
    changed = true;
  }

  if (changed) clearRegionLookupCache();
}

async function importPeripheryRows(rows: Record<string, unknown>[], userId: number | null) {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  const existingItems = await Region.findAll({ where: { type: "PERIPHERY" } });
  const existingByName = new Map<string, any>();
  for (const item of existingItems as any[]) existingByName.set(String(item.normalized_name || normalizeRegionText(item.name)), item);

  for (const row of rows) {
    const name = getTextCell(row, ["name", "Name", "periphery name", "Periphery name", "όνομα", "Όνομα", "όνομα περιφέρειας", "Όνομα περιφέρειας"]);
    const external_ref_id = getTextCell(row, ["external_ref_id", "external id", "External id", "reference id", "Reference id"]);
    const latitude = getCoordCell(row, ["latitude", "Latitude", "lat", "Lat", "γεωγραφικό πλάτος", "Γεωγραφικό πλάτος", "πλάτος", "Πλάτος"]);
    const longitude = getCoordCell(row, ["longitude", "Longitude", "lng", "Lng", "lon", "Lon", "γεωγραφικό μήκος", "Γεωγραφικό μήκος", "μήκος", "Μήκος"]);
    const normalized = normalizeRegionText(name);
    if (!normalized || Number.isNaN(latitude as number) || Number.isNaN(longitude as number)) {
      skipped += 1;
      continue;
    }
    const payload = { name, normalized_name: normalized, external_ref_id: external_ref_id || null, latitude, longitude, type: "PERIPHERY", parent_id: null };
    const existing = existingByName.get(normalized);
    if (existing) {
      await existing.update(payload);
      updated += 1;
      continue;
    }
    const item = await Region.create(payload as any);
    existingByName.set(normalized, item);
    inserted += 1;
  }

  clearRegionLookupCache();
  await refreshUnresolvedQueue();
  await logAction({ user_id: userId, action: "import_region_peripheries", entity_type: "region", entity_id: null, details: { inserted, updated, skipped } });
  return { inserted, updated, skipped };
}

async function importCityRows(rows: Record<string, unknown>[], userId: number | null) {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  const peripheries = await Region.findAll({ where: { type: "PERIPHERY" } });
  const peripheryByName = new Map<string, any>();
  for (const item of peripheries as any[]) peripheryByName.set(String(item.normalized_name || normalizeRegionText(item.name)), item);

  const existingCities = await Region.findAll({ where: { type: "CITY" } });
  const cityByKey = new Map<string, any>();
  for (const city of existingCities as any[]) cityByKey.set(`${city.normalized_name}::${city.parent_id}`, city);

  for (const row of rows) {
    const name = getTextCell(row, ["name", "Name", "city", "City", "city name", "City name", "πόλη", "Πόλη", "όνομα", "Όνομα", "όνομα πόλης", "Όνομα πόλης"]);
    const peripheryName = getTextCell(row, ["periphery", "Periphery", "periphery name", "Periphery name", "region", "Region", "περιφέρεια", "Περιφέρεια", "όνομα περιφέρειας", "Όνομα περιφέρειας"]);
    const external_ref_id = getTextCell(row, ["external_ref_id", "external id", "External id", "reference id", "Reference id"]);
    const latitude = getCoordCell(row, ["latitude", "Latitude", "lat", "Lat", "γεωγραφικό πλάτος", "Γεωγραφικό πλάτος", "πλάτος", "Πλάτος"]);
    const longitude = getCoordCell(row, ["longitude", "Longitude", "lng", "Lng", "lon", "Lon", "γεωγραφικό μήκος", "Γεωγραφικό μήκος", "μήκος", "Μήκος"]);
    const normalized = normalizeRegionText(name);
    const periphery = peripheryByName.get(normalizeRegionText(peripheryName));
    if (!normalized || !periphery || Number.isNaN(latitude as number) || Number.isNaN(longitude as number)) {
      skipped += 1;
      continue;
    }
    const key = `${normalized}::${periphery.id}`;
    const payload = { name, normalized_name: normalized, external_ref_id: external_ref_id || null, latitude, longitude, type: "CITY", parent_id: Number(periphery.id) };
    const existing = cityByKey.get(key);
    if (existing) {
      await existing.update(payload);
      updated += 1;
      continue;
    }
    const item = await Region.create(payload as any);
    cityByKey.set(key, item);
    inserted += 1;
  }

  clearRegionLookupCache();
  await refreshUnresolvedQueue();
  await logAction({ user_id: userId, action: "import_region_cities", entity_type: "region", entity_id: null, details: { inserted, updated, skipped } });
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

  if (parentRaw === "null" || parentRaw === "") where.parent_id = null;
  else if (typeof parentRaw === "string" && parentRaw.trim()) {
    const parentId = parseId(parentRaw);
    if (parentId !== null) where.parent_id = parentId;
  }

  if (isRegionType(typeRaw)) where.type = typeRaw;
  return where;
}

async function validateRegionPayload(body: any, type: "CITY" | "PERIPHERY", currentId?: number) {
  const name = cleanRegionText(body?.name ?? "");
  const normalized_name = normalizeRegionText(name);
  const external_ref_id = cleanRegionText(body?.external_ref_id ?? "") || null;
  const latitude = toNullableCoord(body?.latitude);
  const longitude = toNullableCoord(body?.longitude);
  if (!normalized_name) return { error: "name is required" };
  if (Number.isNaN(latitude as number)) return { error: "latitude must be a number" };
  if (Number.isNaN(longitude as number)) return { error: "longitude must be a number" };

  if (type === "PERIPHERY") {
    const duplicate = await Region.findOne({ where: { type: "PERIPHERY", normalized_name, ...(currentId ? { id: { [Op.ne]: currentId } } : {}) } });
    if (duplicate) return { error: "A periphery with this name already exists" };
    return { value: { name, normalized_name, external_ref_id, latitude, longitude, type: "PERIPHERY", parent_id: null } };
  }

  const parentId = Number(body?.parent_id);
  if (!Number.isFinite(parentId) || parentId <= 0) return { error: "parent_id is required" };
  const parent = await Region.findByPk(parentId);
  if (!parent || String((parent as any).type) !== "PERIPHERY") return { error: "parent_id must point to a periphery" };
  const duplicate = await Region.findOne({ where: { type: "CITY", normalized_name, parent_id: parentId, ...(currentId ? { id: { [Op.ne]: currentId } } : {}) } });
  if (duplicate) return { error: "A city with this name already exists in the selected periphery" };
  return { value: { name, normalized_name, external_ref_id, latitude, longitude, type: "CITY", parent_id: parentId } };
}

export async function listRegions(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await Region.findAll({ where: parseListFilters(req), order: [["name", "ASC"]] });
    res.json({ ok: true, items });
  } catch (err) {
    next(err);
  }
}

export async function searchRegions(req: Request, res: Response, next: NextFunction) {
  try {
    const q = cleanRegionText(req.query.q ?? "");
    const type = typeof req.query.type === "string" ? req.query.type.trim() : "";
    if (!q) return res.json({ ok: true, items: [] });
    const where: any = { [Op.or]: [{ name: { [Op.iLike]: `%${q}%` } }, { normalized_name: { [Op.like]: `%${normalizeRegionText(q)}%` } }] };
    if (isRegionType(type)) where.type = type;
    const items = await Region.findAll({ where, order: [["name", "ASC"]], limit: 50 });
    res.json({ ok: true, items });
  } catch (err) {
    next(err);
  }
}

export async function listUnmatchedCities(req: Request, res: Response, next: NextFunction) {
  try {
    await refreshUnresolvedQueue();
    await autoResolveDirectMatches(req.user?.id ?? null);
    await refreshUnresolvedQueue();
    const q = cleanRegionText(req.query.q ?? "");
    const where: any = { status: "pending", count: { [Op.gt]: 0 } };
    if (q) where.raw_name = { [Op.iLike]: `%${q}%` };
    const items = await UnresolvedRegion.findAll({
      where,
      include: [{ model: Region, as: "periphery", attributes: ["id", "name"] }],
      order: [["count", "DESC"], ["raw_name", "ASC"]],
    });

    res.json({
      ok: true,
      items: (items as any[]).map((item) => ({
        id: Number(item.id),
        name: String(item.raw_name),
        count: Number(item.count || 0),
        periphery_id: item.periphery_id != null ? Number(item.periphery_id) : null,
        periphery_name: item.periphery?.name ?? null,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function resolveUnmatchedCity(req: Request, res: Response, next: NextFunction) {
  try {
    const unresolvedId = parseId(req.body?.unresolved_id);
    const canonicalRegionId = parseId(req.body?.canonical_region_id);
    const createAlias = req.body?.create_alias !== false;
    if (!unresolvedId || !canonicalRegionId) return badRequest(res, "unresolved_id and canonical_region_id are required");
    const unresolved = await UnresolvedRegion.findByPk(unresolvedId);
    const region = await Region.findByPk(canonicalRegionId);
    if (!unresolved || !region || String((region as any).type) !== "CITY") return notFound(res);
    if (unresolved.periphery_id != null && Number((region as any).parent_id || 0) !== Number(unresolved.periphery_id)) {
      return badRequest(res, "canonical_region_id must belong to the same periphery");
    }

    if (createAlias) await ensureAlias(Number(region.id), String(unresolved.raw_name), "unresolved");

    const rawNormalized = String(unresolved.normalized_raw_name || normalizeRegionText(unresolved.raw_name));
    await applyCanonicalCityToGraduates(unresolved, region);

    await unresolved.update({ status: "resolved", canonical_region_id: Number(region.id), resolved_by_user_id: req.user?.id ?? null, count: 0 });
    clearRegionLookupCache();
    await refreshUnresolvedQueue();
    await logAction({ user_id: req.user?.id ?? null, action: "resolve_unmatched_city", entity_type: "region", entity_id: Number(region.id), details: { unresolved_id: unresolvedId, raw_name: unresolved.raw_name } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function dismissUnmatchedCities(req: Request, res: Response, next: NextFunction) {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((value: unknown) => Number(value)).filter((value: number) => Number.isFinite(value) && value > 0) : [];
    if (!ids.length) return badRequest(res, "ids are required");
    await UnresolvedRegion.update({ status: "dismissed", resolved_by_user_id: req.user?.id ?? null, count: 0 }, { where: { id: ids } });
    await logAction({ user_id: req.user?.id ?? null, action: "dismiss_unmatched_cities", entity_type: "region", entity_id: null, details: { ids } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function createRegion(req: Request, res: Response, next: NextFunction) {
  try {
    const type = String(req.body?.type ?? "").trim();
    if (type !== "CITY" && type !== "PERIPHERY") return badRequest(res, "Only CITY or PERIPHERY creation is supported");
    const validated = await validateRegionPayload(req.body, type as any);
    if ("error" in validated) return badRequest(res, validated.error ?? "Invalid region payload");
    const item = await Region.create(validated.value as any);
    await ensureAlias(Number((item as any).id), String(validated.value.name), "canonical");
    clearRegionLookupCache();
    await refreshUnresolvedQueue();
    await logAction({ user_id: req.user?.id ?? null, action: `create_region_${type.toLowerCase()}`, entity_type: "region", entity_id: Number((item as any).id), details: { name: validated.value.name, parent_id: (validated.value as any).parent_id ?? null } });
    return res.status(201).json({ ok: true, item });
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
    if (itemType !== "CITY" && itemType !== "PERIPHERY") return badRequest(res, "Only CITY or PERIPHERY update is supported");
    const validated = await validateRegionPayload({ ...req.body, type: itemType }, itemType as any, id);
    if ("error" in validated) return badRequest(res, validated.error ?? "Invalid region payload");
    await item.update(validated.value as any);
    await ensureAlias(id, String(validated.value.name), "canonical");
    clearRegionLookupCache();
    await refreshUnresolvedQueue();
    await logAction({ user_id: req.user?.id ?? null, action: `update_region_${itemType.toLowerCase()}`, entity_type: "region", entity_id: id, details: { name: validated.value.name, parent_id: (validated.value as any).parent_id ?? null } });
    return res.json({ ok: true, item });
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
    }

    if (itemType === "CITY") {
      await Graduate.update({ origin_city_region_id: null }, { where: { origin_city_region_id: id } });
      await RegionAlias.destroy({ where: { region_id: id } });
    }

    const name = String((item as any).name ?? "");
    await item.destroy();
    clearRegionLookupCache();
    await refreshUnresolvedQueue();
    await logAction({ user_id: req.user?.id ?? null, action: `delete_region_${itemType.toLowerCase()}`, entity_type: "region", entity_id: id, details: { name, parent_id: (item as any).parent_id ?? null } });
    return res.json({ ok: true });
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
    const summary = mode === "PERIPHERY" ? await importPeripheryRows(rows, req.user?.id ?? null) : await importCityRows(rows, req.user?.id ?? null);
    res.json({ ok: true, summary });
  } catch (err) {
    next(err);
  }
}
