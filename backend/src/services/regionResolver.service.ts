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
  error?: string;
};

type GeocodedCity = {
  nameEl: string;
  nameEn: string;
  latitude: number;
  longitude: number;
};

type CityResolution = {
  id: number | null;
  error?: string;
};

const GREEK_LETTERS = /[\u0370-\u03ff\u1f00-\u1fff]/u;
const CITY_LOOKUP_ERROR = "origin city could not be resolved with an English name";

function isGreece(region: RegionLookupItem | null | undefined) {
  return Boolean(region && region.type === "COUNTRY" && region.code === "GR");
}

function firstScoped(candidates: RegionLookupItem[], scopeId: number | null, byId: Map<number, RegionLookupItem>) {
  if (!scopeId) return candidates[0] ?? null;
  return candidates.find((item) => isDescendantOf(item.id, scopeId, byId)) ?? null;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = cleanRegionText(value);
    if (text) return text;
  }
  return "";
}

function firstNonGreekText(...values: unknown[]) {
  for (const value of values) {
    const text = cleanRegionText(value);
    if (text && !GREEK_LETTERS.test(text)) return text;
  }
  return "";
}

async function geocodeCity(name: string, country: RegionLookupItem): Promise<GeocodedCity | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "5");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("namedetails", "1");
    url.searchParams.set("accept-language", "en,el");
    url.searchParams.set("q", `${name}, ${country.name_en}`);
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en,el",
        "User-Agent": "alupla-map/1.0",
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const items = await response.json() as Array<Record<string, any>>;
    for (const item of items) {
      const latitude = Number(item?.lat);
      const longitude = Number(item?.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
      const namedetails = item?.namedetails ?? {};
      const address = item?.address ?? {};
      const addressType = cleanRegionText(item?.addresstype || item?.type).toLowerCase();
      if (["continent", "country", "state", "region", "county"].includes(addressType)) continue;
      const displayName = cleanRegionText(item?.display_name).split(",")[0];
      const nameEn = firstNonGreekText(
        namedetails["name:en"],
        namedetails["official_name:en"],
        namedetails["short_name:en"],
        namedetails["alt_name:en"],
        namedetails.int_name,
        item?.name,
        address.city,
        address.town,
        address.village,
        address.hamlet,
        address.municipality,
        displayName,
      );
      if (!nameEn) continue;
      const nameEl = firstText(
        namedetails["name:el"],
        namedetails["official_name:el"],
        namedetails["short_name:el"],
        GREEK_LETTERS.test(name) ? name : null,
        name,
      );
      return { nameEl, nameEn, latitude, longitude };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function persistCity(
  nameEl: string,
  nameEn: string,
  parent: RegionLookupItem,
  latitude: number,
  longitude: number,
) {
  try {
    const [row] = await Region.findOrCreate({
      where: { type: "CITY", parent_id: parent.id, name_el: nameEl },
      defaults: {
        name_el: nameEl,
        name_en: nameEn,
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
        name_el: { [Op.iLike]: nameEl },
      },
      order: [["id", "ASC"]],
    });
    if (!existing) throw error;
    clearRegionLookupIndex();
    return Number(existing.id);
  }
}

async function createCity(
  name: string,
  parent: RegionLookupItem,
  country: RegionLookupItem,
  allowOnlineLookup: boolean,
): Promise<CityResolution> {
  if (!allowOnlineLookup) return { id: null };
  const cleanName = cleanRegionText(name);
  const geocoded = await geocodeCity(cleanName, country);
  if (!geocoded?.nameEn) return { id: null, error: CITY_LOOKUP_ERROR };
  return {
    id: await persistCity(
      geocoded.nameEl || cleanName,
      geocoded.nameEn,
      parent,
      geocoded.latitude,
      geocoded.longitude,
    ),
  };
}

async function ensureGreekCityLocation(
  name: string,
  peripheryId: number | null,
  nomosId: number | null,
  allowOnlineLookup = true,
): Promise<CityResolution> {
  const index = await loadRegionLookupIndex();
  const candidates = findRegions("CITY", name, index).filter((item) => isGreece(getRegionAncestor(item.id, "COUNTRY", index.byId)));
  const existing = firstScoped(candidates, nomosId ?? peripheryId, index.byId);
  if (existing) return { id: existing.id };

  let parent = nomosId ? index.byId.get(nomosId) ?? null : null;
  if (!parent || parent.type !== "NOMOS") {
    const nomosKey = getGreekNomosNormalizedName(name);
    const nomoi = nomosKey ? findRegions("NOMOS", nomosKey, index) : [];
    parent = firstScoped(nomoi, peripheryId, index.byId);
  }
  if (!parent || parent.type !== "NOMOS") return { id: peripheryId };
  const country = getRegionAncestor(parent.id, "COUNTRY", index.byId);
  if (!country) return { id: null, error: CITY_LOOKUP_ERROR };
  return createCity(name, parent, country, allowOnlineLookup);
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
  if (!country) country = index.rows.find((item) => item.type === "COUNTRY" && item.code === "GR") ?? null;
  if (!country) return { origin_location_id: null };

  const cityText = cleanRegionText(input.origin_foreign_city || input.origin_municipality);
  const allowOnlineLookup = input.allowOnlineLookup !== false;
  if (!isGreece(country)) {
    if (!cityText) return { origin_location_id: country.id };
    const existing = findRegions("CITY", cityText, index).find((item) => item.parent_id === country!.id);
    if (existing) return { origin_location_id: existing.id };
    const created = await createCity(cityText, country, country, allowOnlineLookup);
    if (created.error) return { origin_location_id: null, error: created.error };
    return { origin_location_id: created.id ?? country.id };
  }

  if (explicitCity?.type === "CITY" && isGreece(getRegionAncestor(explicitCity.id, "COUNTRY", index.byId))) {
    return { origin_location_id: explicitCity.id };
  }

  const periphery = explicitPeriphery?.type === "PERIPHERY"
    ? explicitPeriphery
    : explicitNomos ? getRegionAncestor(explicitNomos.id, "PERIPHERY", index.byId) : null;
  const nomos = explicitNomos?.type === "NOMOS" ? explicitNomos : null;

  if (cityText) {
    const resolved = await ensureGreekCityLocation(
      cityText,
      periphery?.id ?? null,
      nomos?.id ?? null,
      allowOnlineLookup,
    );
    if (resolved.error) return { origin_location_id: null, error: resolved.error };
    if (resolved.id) return { origin_location_id: resolved.id };
  }

  return { origin_location_id: nomos?.id ?? periphery?.id ?? country.id };
}
