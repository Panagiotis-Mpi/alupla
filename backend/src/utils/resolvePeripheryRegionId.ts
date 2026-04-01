import { Region } from "../models/Region";
import { RegionAlias } from "../models/RegionAlias";
import { cleanRegionText, normalizeRegionText } from "./regionText";

type ResolveOriginInput = {
  origin_region_id: number | null;
  origin_city_region_id?: number | null;
  origin_municipality: string | null;
};

type RegionLite = {
  id: number;
  name: string;
  normalized_name: string;
  type: string;
  parent_id: number | null;
};

type AliasLite = {
  region_id: number;
  normalized_alias: string;
};

export type NormalizedOriginResult = {
  origin_region_id: number | null;
  origin_city_region_id: number | null;
  origin_municipality: string | null;
};

const MAX_PARENT_STEPS = 25;
let regionLookupsCache: Promise<{
  byId: Map<number, RegionLite>;
  cityByKey: Map<string, RegionLite[]>;
  peripheryByKey: Map<string, RegionLite[]>;
  aliasByKey: Map<string, RegionLite[]>;
}> | null = null;

function pushMatch(map: Map<string, RegionLite[]>, key: string, region: RegionLite) {
  const items = map.get(key);
  if (items) items.push(region);
  else map.set(key, [region]);
}

async function loadRegionLookups() {
  if (!regionLookupsCache) {
    regionLookupsCache = Promise.all([
      Region.findAll({ attributes: ["id", "name", "normalized_name", "type", "parent_id"] }),
      RegionAlias.findAll({ attributes: ["region_id", "normalized_alias"] }),
    ]).then(([regions, aliases]) => {
      const byId = new Map<number, RegionLite>();
      const cityByKey = new Map<string, RegionLite[]>();
      const peripheryByKey = new Map<string, RegionLite[]>();
      const aliasByKey = new Map<string, RegionLite[]>();

      for (const row of regions as any[]) {
        const region: RegionLite = {
          id: Number(row.id),
          name: String(row.name ?? ""),
          normalized_name: String(row.normalized_name ?? normalizeRegionText(row.name)),
          type: String(row.type ?? ""),
          parent_id: row.parent_id != null ? Number(row.parent_id) : null,
        };
        byId.set(region.id, region);
        if (region.normalized_name) {
          if (region.type === "CITY") pushMatch(cityByKey, region.normalized_name, region);
          if (region.type === "PERIPHERY") pushMatch(peripheryByKey, region.normalized_name, region);
        }
      }

      for (const row of aliases as any[]) {
        const region = byId.get(Number(row.region_id));
        const key = String(row.normalized_alias ?? "");
        if (!region || !key) continue;
        pushMatch(aliasByKey, key, region);
      }

      return { byId, cityByKey, peripheryByKey, aliasByKey };
    });
  }
  return regionLookupsCache;
}

function getPeripheryFromRegion(regionId: number | null | undefined, byId: Map<number, RegionLite>) {
  if (!regionId) return null;
  let current = byId.get(Number(regionId)) ?? null;
  let steps = 0;

  while (current && steps < MAX_PARENT_STEPS) {
    steps += 1;
    if (current.type === "PERIPHERY") return current;
    if (!current.parent_id) return null;
    current = byId.get(current.parent_id) ?? null;
  }

  return null;
}

function pickScopedRegion(candidates: RegionLite[], preferredPeripheryId: number | null, byId: Map<number, RegionLite>) {
  if (!candidates.length) return null;
  if (preferredPeripheryId) {
    const scoped = candidates.find((item) => getPeripheryFromRegion(item.id, byId)?.id === preferredPeripheryId);
    if (scoped) return scoped;
  }
  return candidates[0] ?? null;
}

export function clearRegionLookupCache() {
  regionLookupsCache = null;
}

export async function normalizeOriginLocation(input: ResolveOriginInput): Promise<NormalizedOriginResult> {
  const { byId, cityByKey, peripheryByKey, aliasByKey } = await loadRegionLookups();

  const rawMunicipality = cleanRegionText(input.origin_municipality);
  const normalizedMunicipality = normalizeRegionText(rawMunicipality);
  const explicitCity = input.origin_city_region_id != null ? byId.get(Number(input.origin_city_region_id)) ?? null : null;
  const currentRegion = input.origin_region_id != null ? byId.get(Number(input.origin_region_id)) ?? null : null;
  const currentPeriphery = explicitCity
    ? getPeripheryFromRegion(explicitCity.id, byId)
    : currentRegion
      ? getPeripheryFromRegion(currentRegion.id, byId) ?? (currentRegion.type === "PERIPHERY" ? currentRegion : null)
      : null;
  const preferredPeripheryId = currentPeriphery?.id ?? null;

  let matchedCity = explicitCity?.type === "CITY" ? explicitCity : null;

  if (!matchedCity && normalizedMunicipality) {
    matchedCity = pickScopedRegion(cityByKey.get(normalizedMunicipality) ?? [], preferredPeripheryId, byId);
  }

  if (!matchedCity && normalizedMunicipality) {
    const aliasHit = pickScopedRegion(aliasByKey.get(normalizedMunicipality) ?? [], preferredPeripheryId, byId);
    if (aliasHit?.type === "CITY") matchedCity = aliasHit;
  }

  let matchedPeriphery = matchedCity ? getPeripheryFromRegion(matchedCity.id, byId) : currentPeriphery;

  if (!matchedPeriphery && normalizedMunicipality) {
    matchedPeriphery = pickScopedRegion(peripheryByKey.get(normalizedMunicipality) ?? [], null, byId);
  }

  return {
    origin_region_id: matchedPeriphery?.id ?? null,
    origin_city_region_id: matchedCity?.id ?? null,
    origin_municipality: matchedCity?.name ?? (rawMunicipality || null),
  };
}

export async function resolvePeripheryRegionId(input: ResolveOriginInput): Promise<number | null> {
  const normalized = await normalizeOriginLocation(input);
  return normalized.origin_region_id;
}
