import { Op, UniqueConstraintError } from "sequelize";
import { Region } from "../models/Region";
import { cleanRegionText, normalizeRegionText } from "../utils/regionText";
import { getGreekNomosNormalizedName } from "./greekNomosLookup.service";
import {
  clearRegionLookupIndex,
  findRegions,
  getRegionAncestor,
  getRegionHierarchy,
  isDescendantOf,
  loadRegionLookupIndex,
  type RegionLookupItem,
} from "./regionLookup.service";

export type ResolveOriginInput = {
  origin_location_id?: number | null;
  origin_country_region_id?: number | null;
  origin_periphery_region_id?: number | null;
  origin_region_id?: number | null;
  origin_city_region_id?: number | null;
  origin_country?: string | null;
  origin_foreign_city?: string | null;
  origin_municipality?: string | null;
  allowOnlineLookup?: boolean;
};

export type NormalizedOriginResult = {
  origin_location_id: number | null;
};

const GREECE_KEYS = new Set([normalizeRegionText("Ελλάδα"), normalizeRegionText("Greece")]);

function isGreece(region: RegionLookupItem | null | undefined) {
  return Boolean(region && region.type === "COUNTRY" && GREECE_KEYS.has(normalizeRegionText(region.name)));
}

function firstScoped(candidates: RegionLookupItem[], scopeId: number | null, byId: Map<number, RegionLookupItem>) {
  if (!scopeId) return candidates[0] ?? null;
  return candidates.find((item) => isDescendantOf(item.id, scopeId, byId)) ?? null;
}

async function geocodeGreekCity(name: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("q", `${name}, Greece`);
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "alupla-map/1.0" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const item = (await response.json() as any[])?.[0];
    const latitude = Number(item?.lat);
    const longitude = Number(item?.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function persistCity(
  cleanName: string,
  parent: RegionLookupItem,
  latitude: number | null,
  longitude: number | null,
) {
  try {
    const [row] = await Region.findOrCreate({
      where: { type: "CITY", parent_id: parent.id, name_el: cleanName },
      defaults: {
        name_el: cleanName,
        name_en: null,
        type: "CITY",
        parent_id: parent.id,
        latitude,
        longitude,
      } as any,
    });
    clearRegionLookupIndex();
    return Number(row.id);
  } catch (error) {
    if (!(error instanceof UniqueConstraintError)) throw error;
    const existing = await Region.findOne({
      where: {
        type: "CITY",
        parent_id: parent.id,
        name_el: { [Op.iLike]: cleanName },
      },
      order: [["id", "ASC"]],
    });
    if (!existing) throw error;
    clearRegionLookupIndex();
    return Number(existing.id);
  }
}

async function createCity(name: string, parent: RegionLookupItem, allowOnlineLookup: boolean) {
  const cleanName = cleanRegionText(name);
  const geocoded = allowOnlineLookup ? await geocodeGreekCity(cleanName) : null;
  return persistCity(
    cleanName,
    parent,
    geocoded?.latitude ?? parent.latitude,
    geocoded?.longitude ?? parent.longitude,
  );
}

async function createForeignCity(name: string, country: RegionLookupItem) {
  const cleanName = cleanRegionText(name);
  return persistCity(cleanName, country, country.latitude, country.longitude);
}

async function ensureGreekCityLocation(name: string, peripheryId: number | null, nomosId: number | null, allowOnlineLookup = true) {
  const index = await loadRegionLookupIndex();
  const candidates = findRegions("CITY", name, index).filter((item) => isGreece(getRegionAncestor(item.id, "COUNTRY", index.byId)));
  const existing = firstScoped(candidates, nomosId ?? peripheryId, index.byId);
  if (existing) return existing.id;

  let parent = nomosId ? index.byId.get(nomosId) ?? null : null;
  if (!parent || parent.type !== "NOMOS") {
    const nomosKey = getGreekNomosNormalizedName(name);
    const nomoi = nomosKey ? findRegions("NOMOS", nomosKey, index) : [];
    parent = firstScoped(nomoi, peripheryId, index.byId);
  }
  if (!parent || parent.type !== "NOMOS") return peripheryId;
  return createCity(name, parent, allowOnlineLookup);
}

export async function normalizeOriginLocation(input: ResolveOriginInput): Promise<NormalizedOriginResult> {
  const index = await loadRegionLookupIndex();
  const direct = input.origin_location_id ? getRegionHierarchy(Number(input.origin_location_id), index.byId) : null;
  if (direct?.country) return { origin_location_id: direct.location.id };

  const explicitCity = input.origin_city_region_id ? index.byId.get(Number(input.origin_city_region_id)) ?? null : null;
  const explicitNomos = input.origin_region_id ? index.byId.get(Number(input.origin_region_id)) ?? null : null;
  const explicitPeriphery = input.origin_periphery_region_id ? index.byId.get(Number(input.origin_periphery_region_id)) ?? null : null;
  let country = input.origin_country_region_id ? index.byId.get(Number(input.origin_country_region_id)) ?? null : null;

  if (!country && input.origin_country) country = findRegions("COUNTRY", input.origin_country, index)[0] ?? null;
  if (!country && explicitCity) country = getRegionAncestor(explicitCity.id, "COUNTRY", index.byId);
  if (!country && explicitNomos) country = getRegionAncestor(explicitNomos.id, "COUNTRY", index.byId);
  if (!country && explicitPeriphery) country = getRegionAncestor(explicitPeriphery.id, "COUNTRY", index.byId);
  if (!country) country = findRegions("COUNTRY", "Ελλάδα", index)[0] ?? null;
  if (!country) return { origin_location_id: null };

  const cityText = cleanRegionText(input.origin_foreign_city || input.origin_municipality);
  if (!isGreece(country)) {
    if (!cityText) return { origin_location_id: country.id };
    const existing = findRegions("CITY", cityText, index).find((item) => item.parent_id === country!.id);
    return { origin_location_id: existing?.id ?? await createForeignCity(cityText, country) };
  }

  if (explicitCity?.type === "CITY" && isGreece(getRegionAncestor(explicitCity.id, "COUNTRY", index.byId))) {
    return { origin_location_id: explicitCity.id };
  }

  const periphery = explicitPeriphery?.type === "PERIPHERY"
    ? explicitPeriphery
    : explicitNomos ? getRegionAncestor(explicitNomos.id, "PERIPHERY", index.byId) : null;
  const nomos = explicitNomos?.type === "NOMOS" ? explicitNomos : null;

  if (cityText) {
    const locationId = await ensureGreekCityLocation(
      cityText,
      periphery?.id ?? null,
      nomos?.id ?? null,
      input.allowOnlineLookup !== false,
    );
    if (locationId) return { origin_location_id: locationId };
  }

  return { origin_location_id: nomos?.id ?? periphery?.id ?? country.id };
}
