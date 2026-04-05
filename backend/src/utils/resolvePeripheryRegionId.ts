import { Region } from "../models/Region";
import { RegionAlias } from "../models/RegionAlias";
import { cleanRegionText, normalizeRegionText } from "./regionText";

type ResolveOriginInput = {
  origin_country_region_id?: number | null;
  origin_periphery_region_id?: number | null;
  origin_region_id?: number | null;
  origin_city_region_id?: number | null;
  origin_municipality?: string | null;
};

type RegionLite = {
  id: number;
  name: string;
  normalized_name: string;
  type: string;
  parent_id: number | null;
};

export type NormalizedOriginResult = {
  origin_country_region_id: number | null;
  origin_periphery_region_id: number | null;
  origin_region_id: number | null;
  origin_city_region_id: number | null;
  origin_municipality: string | null;
};

const MAX_PARENT_STEPS = 25;
const GREECE_KEYS = new Set([normalizeRegionText("Ελλάδα"), normalizeRegionText("Greece")]);

let regionLookupsCache: Promise<{
  byId: Map<number, RegionLite>;
  cityByKey: Map<string, RegionLite[]>;
  foreignCityByKey: Map<string, RegionLite[]>;
  peripheryByKey: Map<string, RegionLite[]>;
  countryByKey: Map<string, RegionLite[]>;
  aliasByKey: Map<string, RegionLite[]>;
}> | null = null;

function pushMatch(map: Map<string, RegionLite[]>, key: string, region: RegionLite) {
  const items = map.get(key);
  if (items) items.push(region);
  else map.set(key, [region]);
}

function isGreece(region: RegionLite | null | undefined) {
  if (!region || region.type !== "COUNTRY") return false;
  return GREECE_KEYS.has(region.normalized_name);
}

function getAncestor(regionId: number | null | undefined, targetType: string, byId: Map<number, RegionLite>) {
  if (!regionId) return null;
  let current = byId.get(Number(regionId)) ?? null;
  let steps = 0;

  while (current && steps < MAX_PARENT_STEPS) {
    if (current.type === targetType) return current;
    current = current.parent_id ? byId.get(Number(current.parent_id)) ?? null : null;
    steps += 1;
  }

  return null;
}

function pickScopedRegion(candidates: RegionLite[], preferredParentId: number | null, byId: Map<number, RegionLite>, mode: "greece" | "foreign") {
  if (!candidates.length) return null;
  if (preferredParentId) {
    const scoped = candidates.find((item) => {
      if (mode === "greece") return getAncestor(item.id, "PERIPHERY", byId)?.id === preferredParentId;
      return item.parent_id === preferredParentId;
    });
    if (scoped) return scoped;
  }
  return candidates[0] ?? null;
}

async function loadRegionLookups() {
  if (!regionLookupsCache) {
    regionLookupsCache = Promise.all([
      Region.findAll({ attributes: ["id", "name", "normalized_name", "type", "parent_id"] }),
      RegionAlias.findAll({ attributes: ["region_id", "normalized_alias"] }),
    ]).then(([regions, aliases]) => {
      const byId = new Map<number, RegionLite>();
      const cityByKey = new Map<string, RegionLite[]>();
      const foreignCityByKey = new Map<string, RegionLite[]>();
      const peripheryByKey = new Map<string, RegionLite[]>();
      const countryByKey = new Map<string, RegionLite[]>();
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
        if (!region.normalized_name) continue;
        if (region.type === "CITY") pushMatch(cityByKey, region.normalized_name, region);
        if (region.type === "FOREIGN_CITY") pushMatch(foreignCityByKey, region.normalized_name, region);
        if (region.type === "PERIPHERY") pushMatch(peripheryByKey, region.normalized_name, region);
        if (region.type === "COUNTRY") pushMatch(countryByKey, region.normalized_name, region);
      }

      for (const row of aliases as any[]) {
        const region = byId.get(Number(row.region_id));
        const key = String(row.normalized_alias ?? "");
        if (!region || !key) continue;
        pushMatch(aliasByKey, key, region);
      }

      return { byId, cityByKey, foreignCityByKey, peripheryByKey, countryByKey, aliasByKey };
    });
  }

  return regionLookupsCache;
}

function findCountryFromText(value: string, countryByKey: Map<string, RegionLite[]>, aliasByKey: Map<string, RegionLite[]>) {
  const normalized = normalizeRegionText(value);
  if (!normalized) return null;
  const direct = (countryByKey.get(normalized) ?? [])[0];
  if (direct) return direct;
  const aliasHit = (aliasByKey.get(normalized) ?? []).find((item) => item.type === "COUNTRY");
  return aliasHit ?? null;
}

export function clearRegionLookupCache() {
  regionLookupsCache = null;
}

export async function normalizeOriginLocation(input: ResolveOriginInput): Promise<NormalizedOriginResult> {
  const { byId, cityByKey, foreignCityByKey, peripheryByKey, countryByKey, aliasByKey } = await loadRegionLookups();

  const rawMunicipality = cleanRegionText(input.origin_municipality);
  const normalizedMunicipality = normalizeRegionText(rawMunicipality);

  let country = input.origin_country_region_id != null ? byId.get(Number(input.origin_country_region_id)) ?? null : null;
  let periphery = input.origin_periphery_region_id != null ? byId.get(Number(input.origin_periphery_region_id)) ?? null : null;
  const legacyPeriphery = input.origin_region_id != null ? byId.get(Number(input.origin_region_id)) ?? null : null;
  let city = input.origin_city_region_id != null ? byId.get(Number(input.origin_city_region_id)) ?? null : null;

  if (!periphery && legacyPeriphery?.type === "PERIPHERY") periphery = legacyPeriphery;
  if (!country && periphery) country = getAncestor(periphery.id, "COUNTRY", byId);
  if (!country && city) country = getAncestor(city.id, "COUNTRY", byId);
  if (!periphery && city?.type === "CITY") periphery = getAncestor(city.id, "PERIPHERY", byId);
  if (!country && rawMunicipality) country = findCountryFromText(rawMunicipality, countryByKey, aliasByKey);

  if (!country) {
    const greece = (countryByKey.get(normalizeRegionText("Ελλάδα")) ?? [])[0] ?? null;
    if (greece) country = greece;
  }

  if (isGreece(country)) {
    if (normalizedMunicipality) {
      if (!periphery && city?.type === "CITY") periphery = getAncestor(city.id, "PERIPHERY", byId);
      if (!city || city.type !== "CITY") {
        city = pickScopedRegion(cityByKey.get(normalizedMunicipality) ?? [], periphery?.id ?? null, byId, "greece");
      }
      if (!city) {
        const aliasHit = pickScopedRegion(aliasByKey.get(normalizedMunicipality) ?? [], periphery?.id ?? null, byId, "greece");
        if (aliasHit?.type === "CITY") city = aliasHit;
      }
      if (!periphery) {
        periphery = pickScopedRegion(peripheryByKey.get(normalizedMunicipality) ?? [], null, byId, "greece");
      }
    }

    if (city?.type === "CITY") {
      periphery = getAncestor(city.id, "PERIPHERY", byId) ?? periphery;
    }

    if (periphery && !country) {
      country = getAncestor(periphery.id, "COUNTRY", byId);
    }

    return {
      origin_country_region_id: country?.id ?? null,
      origin_periphery_region_id: periphery?.id ?? null,
      origin_region_id: periphery?.id ?? null,
      origin_city_region_id: city?.type === "CITY" ? city.id : null,
      origin_municipality: city?.type === "CITY" ? city.name : rawMunicipality || null,
    };
  }

  if (normalizedMunicipality) {
    if (!city || city.type !== "FOREIGN_CITY") {
      city = pickScopedRegion(foreignCityByKey.get(normalizedMunicipality) ?? [], country?.id ?? null, byId, "foreign");
    }
    if (!city) {
      const aliasHit = pickScopedRegion(aliasByKey.get(normalizedMunicipality) ?? [], country?.id ?? null, byId, "foreign");
      if (aliasHit?.type === "FOREIGN_CITY") city = aliasHit;
    }
  }

  if (city?.type === "FOREIGN_CITY" && !country) {
    country = getAncestor(city.id, "COUNTRY", byId);
  }

  return {
    origin_country_region_id: country?.id ?? null,
    origin_periphery_region_id: null,
    origin_region_id: null,
    origin_city_region_id: city?.type === "FOREIGN_CITY" ? city.id : null,
    origin_municipality: city?.type === "FOREIGN_CITY" ? city.name : rawMunicipality || null,
  };
}
