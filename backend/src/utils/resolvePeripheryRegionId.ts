// Μετατρέπει χώρα/περιφέρεια/πόλη καταγωγής σε σωστά region ids της βάσης.
import { Region, type RegionType } from "../models/Region";
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
  type: RegionType;
  parent_id: number | null;
};

type RegionAliasLite = {
  region_id: number;
  normalized_alias: string;
};

type RegionLookups = {
  byId: Map<number, RegionLite>;
  cityByKey: Map<string, RegionLite[]>;
  foreignCityByKey: Map<string, RegionLite[]>;
  peripheryByKey: Map<string, RegionLite[]>;
  countryByKey: Map<string, RegionLite[]>;
  aliasByKey: Map<string, RegionLite[]>;
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

let regionLookupsCache: Promise<RegionLookups> | null = null;

// Προσθέτει πιθανό region match με score.
function pushMatch(map: Map<string, RegionLite[]>, key: string, region: RegionLite) {
  const existing = map.get(key);
  if (existing) {
    existing.push(region);
    return;
  }
  map.set(key, [region]);
}

// Ελέγχει αν μία τιμή περιοχής είναι Ελλάδα.
function isGreece(region: RegionLite | null | undefined) {
  return Boolean(region && region.type === "COUNTRY" && GREECE_KEYS.has(region.normalized_name));
}

// Ανεβαίνει στην ιεραρχία regions για να βρει parent.
function getAncestor(regionId: number | null | undefined, targetType: RegionType, byId: Map<number, RegionLite>) {
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

// Διαλέγει region που ταιριάζει με χώρα/περιφέρεια scope.
function pickScopedRegion(candidates: RegionLite[], preferredParentId: number | null, byId: Map<number, RegionLite>, mode: "greece" | "foreign") {
  if (candidates.length === 0) return null;

  if (preferredParentId) {
    const scopedMatch = candidates.find((item) => {
      if (mode === "greece") {
        return getAncestor(item.id, "PERIPHERY", byId)?.id === preferredParentId;
      }
      return item.parent_id === preferredParentId;
    });

    if (scopedMatch) return scopedMatch;
  }

  return candidates[0] ?? null;
}

// Μετατρέπει Sequelize region σε ελαφρύ object lookup.
function toRegionLite(row: Region) {
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    normalized_name: String(row.normalized_name ?? normalizeRegionText(row.name)),
    type: row.type,
    parent_id: row.parent_id != null ? Number(row.parent_id) : null,
  } satisfies RegionLite;
}

// Φτιάχνει maps για γρήγορη εύρεση regions με id/name.
function createRegionLookups(regions: Region[], aliases: RegionAliasLite[]) {
  const lookups: RegionLookups = {
    byId: new Map<number, RegionLite>(),
    cityByKey: new Map<string, RegionLite[]>(),
    foreignCityByKey: new Map<string, RegionLite[]>(),
    peripheryByKey: new Map<string, RegionLite[]>(),
    countryByKey: new Map<string, RegionLite[]>(),
    aliasByKey: new Map<string, RegionLite[]>(),
  };

  for (const row of regions) {
    const region = toRegionLite(row);
    lookups.byId.set(region.id, region);

    if (!region.normalized_name) {
      continue;
    }

    if (region.type === "CITY") pushMatch(lookups.cityByKey, region.normalized_name, region);
    if (region.type === "FOREIGN_CITY") pushMatch(lookups.foreignCityByKey, region.normalized_name, region);
    if (region.type === "PERIPHERY") pushMatch(lookups.peripheryByKey, region.normalized_name, region);
    if (region.type === "COUNTRY") pushMatch(lookups.countryByKey, region.normalized_name, region);
  }

  for (const alias of aliases) {
    const region = lookups.byId.get(Number(alias.region_id));
    const key = String(alias.normalized_alias ?? "");

    if (!region || !key) {
      continue;
    }

    pushMatch(lookups.aliasByKey, key, region);
  }

  return lookups;
}

// Φορτώνει και cache-άρει lookups περιοχών για γρήγορο matching.
async function loadRegionLookups() {
  if (!regionLookupsCache) {
    regionLookupsCache = Promise.all([
      Region.findAll({ attributes: ["id", "name", "normalized_name", "type", "parent_id"] }),
      RegionAlias.findAll({ attributes: ["region_id", "normalized_alias"], raw: true }) as Promise<RegionAliasLite[]>,
    ]).then(([regions, aliases]) => createRegionLookups(regions, aliases));
  }

  return regionLookupsCache;
}

// Βρίσκει χώρα από κείμενο import/φόρμας.
function findCountryFromText(value: string, countryByKey: Map<string, RegionLite[]>, aliasByKey: Map<string, RegionLite[]>) {
// Το matching γίνεται πάνω σε καθαρισμένο όνομα περιοχής.
  const normalized = normalizeRegionText(value);
  if (!normalized) return null;

  const directMatch = (countryByKey.get(normalized) ?? [])[0];
  if (directMatch) return directMatch;

  return (aliasByKey.get(normalized) ?? []).find((item) => item.type === "COUNTRY") ?? null;
}

// Καθαρίζει cache lookup περιοχών.
export function clearRegionLookupCache() {
  regionLookupsCache = null;
}

// Μετατρέπει καταγωγή φόρμας/import σε συνεπή region ids.
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
    country = (countryByKey.get(normalizeRegionText("Ελλάδα")) ?? [])[0] ?? null;
  }

  if (isGreece(country)) {
    if (normalizedMunicipality) {
      if (!periphery && city?.type === "CITY") {
        periphery = getAncestor(city.id, "PERIPHERY", byId);
      }

      if (!city || city.type !== "CITY") {
        city = pickScopedRegion(cityByKey.get(normalizedMunicipality) ?? [], periphery?.id ?? null, byId, "greece");
      }

      if (!city) {
        const aliasMatch = pickScopedRegion(aliasByKey.get(normalizedMunicipality) ?? [], periphery?.id ?? null, byId, "greece");
        if (aliasMatch?.type === "CITY") {
          city = aliasMatch;
        }
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
      const aliasMatch = pickScopedRegion(aliasByKey.get(normalizedMunicipality) ?? [], country?.id ?? null, byId, "foreign");
      if (aliasMatch?.type === "FOREIGN_CITY") {
        city = aliasMatch;
      }
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
