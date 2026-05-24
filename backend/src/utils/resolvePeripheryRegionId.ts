// Μετατρέπει χώρα/περιφέρεια/πόλη καταγωγής σε σωστά region ids της βάσης.
import { Region, type RegionType } from "../models/Region";
import { ensureGreekCityRegion } from "../services/mapLocation.service";
import { cleanRegionText, normalizeRegionText } from "./regionText";

type ResolveOriginInput = {
  origin_country_region_id?: number | null;
  origin_periphery_region_id?: number | null;
  origin_region_id?: number | null;
  origin_city_region_id?: number | null;
  origin_municipality?: string | null;
  allowOnlineLookup?: boolean;
};

type RegionLite = {
  id: number;
  name: string;
  normalized_name: string;
  type: RegionType;
  parent_id: number | null;
};


type RegionLookups = {
  byId: Map<number, RegionLite>;
  cityByKey: Map<string, RegionLite[]>;
  nomosByKey: Map<string, RegionLite[]>;
  dimosByKey: Map<string, RegionLite[]>;
  foreignCityByKey: Map<string, RegionLite[]>;
  peripheryByKey: Map<string, RegionLite[]>;
  countryByKey: Map<string, RegionLite[]>;
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
        return item.parent_id === preferredParentId || getAncestor(item.id, "PERIPHERY", byId)?.id === preferredParentId;
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
function createRegionLookups(regions: Region[]) {
  const lookups: RegionLookups = {
    byId: new Map<number, RegionLite>(),
    cityByKey: new Map<string, RegionLite[]>(),
    nomosByKey: new Map<string, RegionLite[]>(),
    dimosByKey: new Map<string, RegionLite[]>(),
    foreignCityByKey: new Map<string, RegionLite[]>(),
    peripheryByKey: new Map<string, RegionLite[]>(),
    countryByKey: new Map<string, RegionLite[]>(),
  };

  for (const row of regions) {
    const region = toRegionLite(row);
    lookups.byId.set(region.id, region);

    if (!region.normalized_name) {
      continue;
    }

    if (region.type === "CITY") pushMatch(lookups.cityByKey, region.normalized_name, region);
    if (region.type === "NOMOS") pushMatch(lookups.nomosByKey, region.normalized_name, region);
    if (region.type === "DIMOS") pushMatch(lookups.dimosByKey, region.normalized_name, region);
    if (region.type === "FOREIGN_CITY") pushMatch(lookups.foreignCityByKey, region.normalized_name, region);
    if (region.type === "PERIPHERY") pushMatch(lookups.peripheryByKey, region.normalized_name, region);
    if (region.type === "COUNTRY") pushMatch(lookups.countryByKey, region.normalized_name, region);
  }

  return lookups;
}

// Φορτώνει και cache-άρει lookups περιοχών για γρήγορο matching.
async function loadRegionLookups() {
  if (!regionLookupsCache) {
    regionLookupsCache = Region.findAll({ attributes: ["id", "name", "normalized_name", "type", "parent_id"] }).then((regions) => createRegionLookups(regions));
  }

  return regionLookupsCache;
}

// Βρίσκει χώρα από κείμενο import/φόρμας.
function findCountryFromText(value: string, countryByKey: Map<string, RegionLite[]>) {
// Το matching γίνεται πάνω σε καθαρισμένο όνομα περιοχής.
  const normalized = normalizeRegionText(value);
  if (!normalized) return null;

  return (countryByKey.get(normalized) ?? [])[0] ?? null;
}

// Καθαρίζει cache lookup περιοχών.
export function clearRegionLookupCache() {
  regionLookupsCache = null;
}

// Μετατρέπει καταγωγή φόρμας/import σε συνεπή region ids.
export async function normalizeOriginLocation(input: ResolveOriginInput): Promise<NormalizedOriginResult> {
  let { byId, cityByKey, nomosByKey, dimosByKey, foreignCityByKey, peripheryByKey, countryByKey } = await loadRegionLookups();

  const rawMunicipality = cleanRegionText(input.origin_municipality);
  const normalizedMunicipality = normalizeRegionText(rawMunicipality);

  let country = input.origin_country_region_id != null ? byId.get(Number(input.origin_country_region_id)) ?? null : null;
  let periphery = input.origin_periphery_region_id != null ? byId.get(Number(input.origin_periphery_region_id)) ?? null : null;
  const legacyRegion = input.origin_region_id != null ? byId.get(Number(input.origin_region_id)) ?? null : null;
  let nomos = legacyRegion?.type === "NOMOS" ? legacyRegion : null;
  let city = input.origin_city_region_id != null ? byId.get(Number(input.origin_city_region_id)) ?? null : null;

  if (!periphery && legacyRegion?.type === "PERIPHERY") periphery = legacyRegion;
  if (!nomos && city?.type === "DIMOS") nomos = getAncestor(city.id, "NOMOS", byId);
  if (!periphery && nomos) periphery = getAncestor(nomos.id, "PERIPHERY", byId);
  if (!country && periphery) country = getAncestor(periphery.id, "COUNTRY", byId);
  if (!country && city) country = getAncestor(city.id, "COUNTRY", byId);
  if (!periphery && (city?.type === "CITY" || city?.type === "DIMOS")) periphery = getAncestor(city.id, "PERIPHERY", byId);
  if (!country && rawMunicipality) country = findCountryFromText(rawMunicipality, countryByKey);

  if (!country) {
    country = (countryByKey.get(normalizeRegionText("Ελλάδα")) ?? [])[0] ?? null;
  }

  if (isGreece(country)) {
    if (normalizedMunicipality) {
      if (!periphery && (city?.type === "CITY" || city?.type === "DIMOS")) {
        periphery = getAncestor(city.id, "PERIPHERY", byId);
      }

      if (!city || (city.type !== "CITY" && city.type !== "DIMOS")) {
        city = pickScopedRegion(dimosByKey.get(normalizedMunicipality) ?? [], nomos?.id ?? periphery?.id ?? null, byId, "greece") ?? pickScopedRegion(cityByKey.get(normalizedMunicipality) ?? [], periphery?.id ?? null, byId, "greece");
      }

      if (!city && input.allowOnlineLookup !== false) {
        const onlineCity = await ensureGreekCityRegion(rawMunicipality, periphery?.id ?? null);
        if (onlineCity?.origin_city_region_id) {
          clearRegionLookupCache();
          ({ byId, cityByKey, nomosByKey, dimosByKey, foreignCityByKey, peripheryByKey, countryByKey } = await loadRegionLookups());
          city = byId.get(Number(onlineCity.origin_city_region_id)) ?? null;
          if (!periphery && onlineCity.origin_periphery_region_id) {
            periphery = byId.get(Number(onlineCity.origin_periphery_region_id)) ?? null;
          }
        }
      }

      if (!nomos && rawMunicipality) {
        nomos = pickScopedRegion(nomosByKey.get(normalizedMunicipality) ?? [], periphery?.id ?? null, byId, "greece");
      }

      if (!periphery) {
        periphery = pickScopedRegion(peripheryByKey.get(normalizedMunicipality) ?? [], null, byId, "greece");
      }
    }

    if (city?.type === "DIMOS") {
      nomos = getAncestor(city.id, "NOMOS", byId) ?? nomos;
    }

    if (nomos?.type === "NOMOS") {
      periphery = getAncestor(nomos.id, "PERIPHERY", byId) ?? periphery;
    }

    if (city?.type === "CITY" || city?.type === "DIMOS") {
      periphery = getAncestor(city.id, "PERIPHERY", byId) ?? periphery;
    }

    if (periphery && !country) {
      country = getAncestor(periphery.id, "COUNTRY", byId);
    }

    return {
      origin_country_region_id: country?.id ?? null,
      origin_periphery_region_id: periphery?.id ?? null,
      origin_region_id: nomos?.type === "NOMOS" ? nomos.id : null,
      origin_city_region_id: city?.type === "CITY" || city?.type === "DIMOS" ? city.id : null,
      origin_municipality: city?.type === "CITY" || city?.type === "DIMOS" ? city.name : rawMunicipality || null,
    };
  }

  if (normalizedMunicipality) {
    if (!city || city.type !== "FOREIGN_CITY") {
      city = pickScopedRegion(foreignCityByKey.get(normalizedMunicipality) ?? [], country?.id ?? null, byId, "foreign");
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
