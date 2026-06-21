import { ensureGreekCityRegion } from "./mapLocation.service";
import { cleanRegionText, normalizeRegionText } from "../utils/regionText";
import { clearGraduateLocalizationCache } from "./graduateLocalization.service";
import { getGreekNomosNormalizedName } from "./greekNomosLookup.service";
import { clearRegionLookupIndex, getRegionAncestor, loadRegionLookupIndex, type RegionLookupItem } from "./regionLookup.service";

type ResolveOriginInput = {
  origin_country_region_id?: number | null;
  origin_periphery_region_id?: number | null;
  origin_region_id?: number | null;
  origin_city_region_id?: number | null;
  origin_municipality?: string | null;
  allowOnlineLookup?: boolean;
};

type RegionLite = RegionLookupItem;

export type NormalizedOriginResult = {
  origin_country_region_id: number | null;
  origin_periphery_region_id: number | null;
  origin_region_id: number | null;
  origin_city_region_id: number | null;
  origin_municipality: string | null;
};

const GREECE_KEYS = new Set([normalizeRegionText("Ελλάδα"), normalizeRegionText("Greece")]);


function isGreece(region: RegionLite | null | undefined) {
  return Boolean(region && region.type === "COUNTRY" && GREECE_KEYS.has(region.normalized_name));
}

function pickScopedRegion(candidates: RegionLite[], preferredParentId: number | null, byId: Map<number, RegionLite>, mode: "greece" | "foreign") {
  if (candidates.length === 0) return null;
  if (preferredParentId) {
    const scopedMatch = candidates.find((item) => {
      if (mode === "greece") {
        return item.parent_id === preferredParentId || getRegionAncestor(item.id, "PERIPHERY", byId)?.id === preferredParentId;
      }
      return item.parent_id === preferredParentId;
    });
    if (scopedMatch) return scopedMatch;
  }
  return candidates[0] ?? null;
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
  clearRegionLookupIndex();
  clearGraduateLocalizationCache();
}

// Μετατρέπει καταγωγή φόρμας/import σε συνεπή region ids.
export async function normalizeOriginLocation(input: ResolveOriginInput): Promise<NormalizedOriginResult> {
  let {
    byId,
    cityByNormalized: cityByKey,
    nomosByNormalized: nomosByKey,
    dimosByNormalized: dimosByKey,
    foreignCityByNormalized: foreignCityByKey,
    peripheryMatchesByNormalized: peripheryByKey,
    countryMatchesByNormalized: countryByKey,
  } = await loadRegionLookupIndex();

  const rawMunicipality = cleanRegionText(input.origin_municipality);
  const normalizedMunicipality = normalizeRegionText(rawMunicipality);

  let country = input.origin_country_region_id != null ? byId.get(Number(input.origin_country_region_id)) ?? null : null;
  let periphery = input.origin_periphery_region_id != null ? byId.get(Number(input.origin_periphery_region_id)) ?? null : null;
  const legacyRegion = input.origin_region_id != null ? byId.get(Number(input.origin_region_id)) ?? null : null;
  let nomos = legacyRegion?.type === "NOMOS" ? legacyRegion : null;
  let city = input.origin_city_region_id != null ? byId.get(Number(input.origin_city_region_id)) ?? null : null;

  if (!periphery && legacyRegion?.type === "PERIPHERY") periphery = legacyRegion;
  if (!nomos && (city?.type === "CITY" || city?.type === "DIMOS")) nomos = getRegionAncestor(city.id, "NOMOS", byId);
  if (!periphery && nomos) periphery = getRegionAncestor(nomos.id, "PERIPHERY", byId);
  if (!country && periphery) country = getRegionAncestor(periphery.id, "COUNTRY", byId);
  if (!country && city) country = getRegionAncestor(city.id, "COUNTRY", byId);
  if (!periphery && (city?.type === "CITY" || city?.type === "DIMOS")) periphery = getRegionAncestor(city.id, "PERIPHERY", byId);
  if (!country && rawMunicipality) country = findCountryFromText(rawMunicipality, countryByKey);

  if (!country) {
    country = (countryByKey.get(normalizeRegionText("Ελλάδα")) ?? [])[0] ?? null;
  }

  if (isGreece(country)) {
    if (normalizedMunicipality) {
      if (!periphery && (city?.type === "CITY" || city?.type === "DIMOS")) {
        periphery = getRegionAncestor(city.id, "PERIPHERY", byId);
      }

      if (!city || (city.type !== "CITY" && city.type !== "DIMOS")) {
        city = pickScopedRegion(dimosByKey.get(normalizedMunicipality) ?? [], nomos?.id ?? periphery?.id ?? null, byId, "greece") ?? pickScopedRegion(cityByKey.get(normalizedMunicipality) ?? [], periphery?.id ?? null, byId, "greece");
      }

      if (!city && input.allowOnlineLookup !== false) {
        const onlineCity = await ensureGreekCityRegion(rawMunicipality, periphery?.id ?? null);
        if (onlineCity?.origin_city_region_id) {
          clearRegionLookupCache();
          ({
            byId,
            cityByNormalized: cityByKey,
            nomosByNormalized: nomosByKey,
            dimosByNormalized: dimosByKey,
            foreignCityByNormalized: foreignCityByKey,
            peripheryMatchesByNormalized: peripheryByKey,
            countryMatchesByNormalized: countryByKey,
          } = await loadRegionLookupIndex());
          city = byId.get(Number(onlineCity.origin_city_region_id)) ?? null;
          if (!periphery && onlineCity.origin_periphery_region_id) {
            periphery = byId.get(Number(onlineCity.origin_periphery_region_id)) ?? null;
          }
        }
      }

      if (!nomos && rawMunicipality) {
        const nomosKey = getGreekNomosNormalizedName(rawMunicipality);
        nomos = pickScopedRegion(nomosByKey.get(nomosKey || normalizedMunicipality) ?? [], periphery?.id ?? null, byId, "greece");
      }

      if (!periphery) {
        periphery = pickScopedRegion(peripheryByKey.get(normalizedMunicipality) ?? [], null, byId, "greece");
      }
    }

    if (city?.type === "CITY" || city?.type === "DIMOS") {
      const nomosKey = getGreekNomosNormalizedName(city.name || rawMunicipality);
      const mappedNomos = nomosKey ? pickScopedRegion(nomosByKey.get(nomosKey) ?? [], periphery?.id ?? null, byId, "greece") : null;
      nomos = getRegionAncestor(city.id, "NOMOS", byId) ?? mappedNomos ?? nomos;
    }

    if (nomos?.type === "NOMOS") {
      periphery = getRegionAncestor(nomos.id, "PERIPHERY", byId) ?? periphery;
    }

    if (city?.type === "CITY" || city?.type === "DIMOS") {
      periphery = getRegionAncestor(city.id, "PERIPHERY", byId) ?? periphery;
    }

    if (periphery && !country) {
      country = getRegionAncestor(periphery.id, "COUNTRY", byId);
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
    country = getRegionAncestor(city.id, "COUNTRY", byId);
  }

  return {
    origin_country_region_id: country?.id ?? null,
    origin_periphery_region_id: null,
    origin_region_id: null,
    origin_city_region_id: city?.type === "FOREIGN_CITY" ? city.id : null,
    origin_municipality: city?.type === "FOREIGN_CITY" ? city.name : rawMunicipality || null,
  };
}
