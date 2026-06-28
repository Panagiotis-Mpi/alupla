import {
  getRegionHierarchy,
  loadRegionLookupIndex,
} from "./regionLookup.service";
import { normalizeOriginLocation, type ResolveOriginInput } from "./regionResolver.service";

type ResolvedMapLocation = {
  cityId: number | null;
  cityName: string | null;
  peripheryId: number | null;
  peripheryName: string | null;
  countryId: number | null;
  countryName: string | null;
  latitude: number | null;
  longitude: number | null;
};

function numberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function ensureLocalizedRegionNames(regionId: number | null | undefined) {
  if (!regionId) return { nameEl: null, nameEn: null };
  const index = await loadRegionLookupIndex();
  const region = index.byId.get(Number(regionId));
  if (!region) return { nameEl: null, nameEn: null };
  return {
    nameEl: region.name_el || region.name || null,
    nameEn: region.name_en || region.name || null,
  };
}

export async function resolveMapLocation(input: ResolveOriginInput): Promise<ResolvedMapLocation | null> {
  let locationId = numberOrNull(input.origin_location_id);
  if (!locationId) {
    const normalized = await normalizeOriginLocation({ ...input, allowOnlineLookup: false });
    locationId = normalized.origin_location_id;
  }
  if (!locationId) return null;

  const index = await loadRegionLookupIndex();
  const hierarchy = getRegionHierarchy(locationId, index.byId);
  if (!hierarchy?.country) return null;

  const location = hierarchy.location;
  const city = hierarchy.city;
  const latitude = numberOrNull(city?.latitude) ?? numberOrNull(location.latitude) ?? numberOrNull(hierarchy.nomos?.latitude) ?? numberOrNull(hierarchy.periphery?.latitude) ?? numberOrNull(hierarchy.country.latitude);
  const longitude = numberOrNull(city?.longitude) ?? numberOrNull(location.longitude) ?? numberOrNull(hierarchy.nomos?.longitude) ?? numberOrNull(hierarchy.periphery?.longitude) ?? numberOrNull(hierarchy.country.longitude);

  return {
    cityId: city?.id ?? (location.type === "CITY" ? location.id : null),
    cityName: city?.name ?? location.name,
    peripheryId: hierarchy.periphery?.id ?? null,
    peripheryName: hierarchy.periphery?.name ?? null,
    countryId: hierarchy.country.id,
    countryName: hierarchy.country.name,
    latitude,
    longitude,
  };
}
