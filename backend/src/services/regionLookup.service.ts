import { Region, type RegionType } from "../models/Region";
import { normalizeRegionText } from "../utils/regionText";

export type RegionLookupItem = {
  id: number;
  name: string;
  name_el: string | null;
  name_en: string;
  normalized_name: string;
  type: RegionType;
  parent_id: number | null;
  latitude: number | null;
  longitude: number | null;
};

export type RegionHierarchy = {
  location: RegionLookupItem;
  city: RegionLookupItem | null;
  nomos: RegionLookupItem | null;
  periphery: RegionLookupItem | null;
  country: RegionLookupItem | null;
};

export type RegionLookupIndex = {
  rows: RegionLookupItem[];
  byId: Map<number, RegionLookupItem>;
  byTypeAndName: Map<RegionType, Map<string, RegionLookupItem[]>>;
};

let lookupCache: Promise<RegionLookupIndex> | null = null;

function numberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function addMatch(map: Map<string, RegionLookupItem[]>, key: string, item: RegionLookupItem) {
  if (!key) return;
  const current = map.get(key);
  if (current) current.push(item);
  else map.set(key, [item]);
}

function createIndex(rows: RegionLookupItem[]) {
  const byId = new Map<number, RegionLookupItem>();
  const byTypeAndName = new Map<RegionType, Map<string, RegionLookupItem[]>>();
  for (const type of ["COUNTRY", "PERIPHERY", "NOMOS", "CITY"] as RegionType[]) {
    byTypeAndName.set(type, new Map());
  }
  for (const item of rows) {
    byId.set(item.id, item);
    const target = byTypeAndName.get(item.type)!;
    for (const value of [item.normalized_name, item.name_el, item.name_en]) {
      addMatch(target, normalizeRegionText(value), item);
    }
  }
  return { rows, byId, byTypeAndName };
}

export async function loadRegionLookupIndex() {
  if (!lookupCache) {
    lookupCache = Region.findAll({
      attributes: ["id", "name_el", "name_en", "type", "parent_id", "latitude", "longitude"],
      order: [["id", "ASC"]],
    }).then((rows) => createIndex((rows as any[]).map((row) => ({
      id: Number(row.id),
      name: String(row.name_el || ""),
      name_el: String(row.name_el || "") || null,
      name_en: String(row.name_en),
      normalized_name: normalizeRegionText(row.name_el),
      type: row.type as RegionType,
      parent_id: row.parent_id != null ? Number(row.parent_id) : null,
      latitude: numberOrNull(row.latitude),
      longitude: numberOrNull(row.longitude),
    }))));
  }
  return lookupCache;
}

export function clearRegionLookupIndex() {
  lookupCache = null;
}

export function getRegionAncestor(regionId: number | null | undefined, targetType: RegionType, byId: Map<number, RegionLookupItem>) {
  let current = regionId ? byId.get(Number(regionId)) ?? null : null;
  for (let step = 0; current && step < 8; step += 1) {
    if (current.type === targetType) return current;
    current = current.parent_id ? byId.get(current.parent_id) ?? null : null;
  }
  return null;
}

export function getRegionHierarchy(regionId: number | null | undefined, byId: Map<number, RegionLookupItem>): RegionHierarchy | null {
  const location = regionId ? byId.get(Number(regionId)) ?? null : null;
  if (!location) return null;
  return {
    location,
    city: getRegionAncestor(location.id, "CITY", byId),
    nomos: getRegionAncestor(location.id, "NOMOS", byId),
    periphery: getRegionAncestor(location.id, "PERIPHERY", byId),
    country: getRegionAncestor(location.id, "COUNTRY", byId),
  };
}

export function findRegions(type: RegionType, value: unknown, index: RegionLookupIndex) {
  return index.byTypeAndName.get(type)?.get(normalizeRegionText(value)) ?? [];
}

export function isDescendantOf(regionId: number, ancestorId: number, byId: Map<number, RegionLookupItem>) {
  let current = byId.get(regionId) ?? null;
  for (let step = 0; current && step < 8; step += 1) {
    if (current.id === ancestorId) return true;
    current = current.parent_id ? byId.get(current.parent_id) ?? null : null;
  }
  return false;
}
