import { Region, type RegionType } from "../models/Region";
import { normalizeRegionText } from "../utils/regionText";

export type RegionLookupItem = {
  id: number;
  name: string;
  name_el: string | null;
  name_en: string | null;
  normalized_name: string;
  type: RegionType;
  parent_id: number | null;
  latitude: number | null;
  longitude: number | null;
  external_ref_id: string | null;
};

export type RegionLookupIndex = {
  rows: RegionLookupItem[];
  byId: Map<number, RegionLookupItem>;
  cityByNormalized: Map<string, RegionLookupItem[]>;
  nomosByNormalized: Map<string, RegionLookupItem[]>;
  dimosByNormalized: Map<string, RegionLookupItem[]>;
  foreignCityByNormalized: Map<string, RegionLookupItem[]>;
  peripheryByNormalized: Map<string, RegionLookupItem>;
  countryByNormalized: Map<string, RegionLookupItem>;
  peripheryMatchesByNormalized: Map<string, RegionLookupItem[]>;
  countryMatchesByNormalized: Map<string, RegionLookupItem[]>;
};

const MAX_PARENT_STEPS = 25;
let lookupCache: Promise<RegionLookupIndex> | null = null;

function numberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function addMatch(map: Map<string, RegionLookupItem[]>, key: string, item: RegionLookupItem) {
  const current = map.get(key);
  if (current) current.push(item);
  else map.set(key, [item]);
}

function createIndex(rows: RegionLookupItem[]): RegionLookupIndex {
  const index: RegionLookupIndex = {
    rows,
    byId: new Map(),
    cityByNormalized: new Map(),
    nomosByNormalized: new Map(),
    dimosByNormalized: new Map(),
    foreignCityByNormalized: new Map(),
    peripheryByNormalized: new Map(),
    countryByNormalized: new Map(),
    peripheryMatchesByNormalized: new Map(),
    countryMatchesByNormalized: new Map(),
  };
  for (const item of rows) {
    index.byId.set(item.id, item);
    const key = item.normalized_name;
    if (!key) continue;
    if (item.type === "CITY") addMatch(index.cityByNormalized, key, item);
    if (item.type === "NOMOS") addMatch(index.nomosByNormalized, key, item);
    if (item.type === "DIMOS") addMatch(index.dimosByNormalized, key, item);
    if (item.type === "FOREIGN_CITY") addMatch(index.foreignCityByNormalized, key, item);
    if (item.type === "PERIPHERY") {
      addMatch(index.peripheryMatchesByNormalized, key, item);
      if (!index.peripheryByNormalized.has(key)) index.peripheryByNormalized.set(key, item);
    }
    if (item.type === "COUNTRY") {
      addMatch(index.countryMatchesByNormalized, key, item);
      if (!index.countryByNormalized.has(key)) index.countryByNormalized.set(key, item);
    }
  }
  return index;
}

export async function loadRegionLookupIndex() {
  if (!lookupCache) {
    lookupCache = Region.findAll({ attributes: ["id", "name", "name_el", "name_en", "normalized_name", "type", "parent_id", "latitude", "longitude", "external_ref_id"] })
      .then((rows) => createIndex((rows as any[]).map((row) => ({
        id: Number(row.id),
        name: String(row.name || ""),
        name_el: row.name_el != null ? String(row.name_el) : null,
        name_en: row.name_en != null ? String(row.name_en) : null,
        normalized_name: String(row.normalized_name || normalizeRegionText(row.name)),
        type: row.type as RegionType,
        parent_id: row.parent_id != null ? Number(row.parent_id) : null,
        latitude: numberOrNull(row.latitude),
        longitude: numberOrNull(row.longitude),
        external_ref_id: row.external_ref_id != null ? String(row.external_ref_id) : null,
      }))));
  }
  return lookupCache;
}

export function clearRegionLookupIndex() {
  lookupCache = null;
}

export function getRegionAncestor(regionId: number | null | undefined, targetType: RegionType, byId: Map<number, RegionLookupItem>) {
  let current = regionId ? byId.get(Number(regionId)) ?? null : null;
  let steps = 0;
  while (current && steps < MAX_PARENT_STEPS) {
    if (current.type === targetType) return current;
    current = current.parent_id ? byId.get(Number(current.parent_id)) ?? null : null;
    steps += 1;
  }
  return null;
}
