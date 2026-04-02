import fs from "fs/promises";
import path from "path";
import { Region } from "../models/Region";
import { cleanRegionText, normalizeRegionText } from "../utils/regionText";

type RegionLite = {
  id: number;
  name: string;
  normalized_name: string;
  type: string;
  parent_id: number | null;
  latitude: number | null;
  longitude: number | null;
  external_ref_id: string | null;
};

type GeoPoint = { latitude: number; longitude: number };

type ResolvedMapLocation = {
  cityId: number | null;
  cityName: string | null;
  peripheryId: number | null;
  peripheryName: string | null;
  latitude: number | null;
  longitude: number | null;
};

type GraduateOriginInput = {
  origin_region_id?: number | null;
  origin_city_region_id?: number | null;
  origin_municipality?: string | null;
};

type NominatimItem = {
  lat?: string;
  lon?: string;
  osm_type?: string;
  osm_id?: number;
  display_name?: string;
  address?: Record<string, string>;
};

type BoundaryFeature = {
  name: string;
  normalizedName: string;
  polygons: number[][][];
};

const MAX_PARENT_STEPS = 25;
const geocodeCache = new Map<string, Promise<ResolvedMapLocation | null>>();
let regionLookupPromise: Promise<{
  byId: Map<number, RegionLite>;
  cityByNormalized: Map<string, RegionLite[]>;
  peripheryByNormalized: Map<string, RegionLite>;
}> | null = null;
let boundaryPromise: Promise<BoundaryFeature[]> | null = null;

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickScopedCity(candidates: RegionLite[], preferredPeripheryId: number | null, byId: Map<number, RegionLite>) {
  if (!candidates.length) return null;
  if (preferredPeripheryId) {
    const scoped = candidates.find((item) => getPeripheryFromRegionId(item.id, byId)?.id === preferredPeripheryId);
    if (scoped) return scoped;
  }
  return candidates[0] ?? null;
}

function getPeripheryFromRegionId(regionId: number | null | undefined, byId: Map<number, RegionLite>) {
  if (!regionId) return null;
  let current = byId.get(Number(regionId)) ?? null;
  let steps = 0;
  while (current && steps < MAX_PARENT_STEPS) {
    steps += 1;
    if (current.type === "PERIPHERY") return current;
    current = current.parent_id ? byId.get(Number(current.parent_id)) ?? null : null;
  }
  return null;
}

async function loadRegionLookups() {
  if (!regionLookupPromise) {
    regionLookupPromise = Region.findAll({
      attributes: ["id", "name", "normalized_name", "type", "parent_id", "latitude", "longitude", "external_ref_id"],
    }).then((rows) => {
      const byId = new Map<number, RegionLite>();
      const cityByNormalized = new Map<string, RegionLite[]>();
      const peripheryByNormalized = new Map<string, RegionLite>();

      for (const row of rows as any[]) {
        const item: RegionLite = {
          id: Number(row.id),
          name: String(row.name || ""),
          normalized_name: String(row.normalized_name || normalizeRegionText(row.name)),
          type: String(row.type || ""),
          parent_id: row.parent_id != null ? Number(row.parent_id) : null,
          latitude: toNumber(row.latitude),
          longitude: toNumber(row.longitude),
          external_ref_id: row.external_ref_id != null ? String(row.external_ref_id) : null,
        };
        byId.set(item.id, item);
        if (item.type === "CITY" && item.normalized_name) {
          const current = cityByNormalized.get(item.normalized_name) || [];
          current.push(item);
          cityByNormalized.set(item.normalized_name, current);
        }
        if (item.type === "PERIPHERY" && item.normalized_name && !peripheryByNormalized.has(item.normalized_name)) {
          peripheryByNormalized.set(item.normalized_name, item);
        }
      }

      return { byId, cityByNormalized, peripheryByNormalized };
    });
  }
  return regionLookupPromise;
}

function clearLocationCaches() {
  regionLookupPromise = null;
}

async function loadBoundaries() {
  if (!boundaryPromise) {
    boundaryPromise = (async () => {
      const attempts = [
        path.resolve(process.cwd(), "../frontend/src/assets/greece-regions.geojson"),
        path.resolve(process.cwd(), "../../frontend/src/assets/greece-regions.geojson"),
        path.resolve(__dirname, "../../../frontend/src/assets/greece-regions.geojson"),
      ];
      let raw = "";
      for (const filePath of attempts) {
        try {
          raw = await fs.readFile(filePath, "utf8");
          if (raw) break;
        } catch {
        }
      }
      if (!raw) return [];
      const json = JSON.parse(raw) as any;
      const features = Array.isArray(json?.features) ? json.features : [];
      return features.map((feature: any) => {
        const geometry = feature?.geometry || {};
        const coordinates = Array.isArray(geometry?.coordinates) ? geometry.coordinates : [];
        const polygons = geometry?.type === "Polygon"
          ? coordinates
          : geometry?.type === "MultiPolygon"
            ? coordinates.flatMap((polygon: any) => polygon)
            : [];
        return {
          name: String(feature?.properties?.name_greek || feature?.properties?.name || ""),
          normalizedName: normalizeRegionText(feature?.properties?.name_greek || feature?.properties?.name || ""),
          polygons: polygons.filter((ring: any) => Array.isArray(ring)),
        } as BoundaryFeature;
      }).filter((item: BoundaryFeature) => item.name && item.polygons.length > 0);
    })();
  }
  return boundaryPromise;
}

function isPointInRing(lon: number, lat: number, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = Number(ring[i]?.[0]);
    const yi = Number(ring[i]?.[1]);
    const xj = Number(ring[j]?.[0]);
    const yj = Number(ring[j]?.[1]);
    const intersects = ((yi > lat) !== (yj > lat)) && (lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || Number.EPSILON) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

async function findPeripheryByCoords(latitude: number, longitude: number) {
  const [boundaries, lookups] = await Promise.all([loadBoundaries(), loadRegionLookups()]);
  for (const feature of boundaries) {
    if (!feature.polygons.some((ring) => isPointInRing(longitude, latitude, ring))) continue;
    const hit = lookups.peripheryByNormalized.get(feature.normalizedName);
    if (hit) return hit;
  }
  return null;
}

function peripheryFromAddress(address: Record<string, string> | undefined, peripheryByNormalized: Map<string, RegionLite>) {
  if (!address) return null;
  const candidates = [
    address.state,
    address.region,
    address.county,
    address.state_district,
  ].map((value) => normalizeRegionText(value)).filter(Boolean);

  for (const candidate of candidates) {
    const direct = peripheryByNormalized.get(candidate);
    if (direct) return direct;
  }
  return null;
}


function resolveNormalizedCityName(...values: Array<unknown>) {
  for (const value of values) {
    const cleaned = cleanRegionText(value);
    const normalized = normalizeRegionText(cleaned);
    if (normalized) return { cleaned, normalized };
  }
  return { cleaned: null, normalized: null };
}

function cityNameFromAddress(rawName: string, address: Record<string, string> | undefined) {
  const candidate = cleanRegionText(
    address?.city ||
    address?.town ||
    address?.village ||
    address?.municipality ||
    address?.suburb ||
    rawName
  );
  return candidate || cleanRegionText(rawName) || null;
}

async function geocodeCity(rawCityName: string, preferredPeripheryId: number | null) {
  const query = cleanRegionText(rawCityName);
  if (!query) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("countrycodes", "gr");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "5");
    url.searchParams.set("accept-language", "el,en");
    url.searchParams.set("q", `${query}, Greece`);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "alupla-map/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const items = await response.json() as NominatimItem[];
    if (!Array.isArray(items) || !items.length) return null;

    const lookups = await loadRegionLookups();
    const preferredPeriphery = preferredPeripheryId ? lookups.byId.get(preferredPeripheryId) ?? null : null;

    const ranked = [] as Array<{ item: NominatimItem; lat: number; lng: number; score: number; peripheryId: number | null; peripheryName: string | null; cityName: string | null; externalRefId: string | null }>;

    for (const item of items) {
      const lat = Number(item.lat);
      const lng = Number(item.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const boundaryPeriphery = await findPeripheryByCoords(lat, lng);
      const addressPeriphery = peripheryFromAddress(item.address, lookups.peripheryByNormalized);
      const periphery = boundaryPeriphery || addressPeriphery || preferredPeriphery;
      const peripheryId = periphery ? Number(periphery.id) : null;
      const cityName = cityNameFromAddress(query, item.address);
      let score = 0;
      if (preferredPeripheryId && peripheryId === preferredPeripheryId) score += 100;
      if (boundaryPeriphery) score += 40;
      if (addressPeriphery) score += 20;
      if (normalizeRegionText(cityName) === normalizeRegionText(query)) score += 15;
      if (String(item.display_name || "").toLowerCase().includes("greece")) score += 5;
      ranked.push({
        item,
        lat,
        lng,
        score,
        peripheryId,
        peripheryName: periphery ? periphery.name : null,
        cityName,
        externalRefId: item.osm_type && item.osm_id ? `nominatim:${item.osm_type}:${item.osm_id}` : null,
      });
    }

    ranked.sort((left, right) => right.score - left.score);
    return ranked[0] || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function persistCityFromGeocode(rawCityName: string, preferredPeripheryId: number | null) {
  const rawResolved = resolveNormalizedCityName(rawCityName);
  if (!rawResolved.normalized) return null;

  const lookups = await loadRegionLookups();
  const existing = pickScopedCity(lookups.cityByNormalized.get(rawResolved.normalized) || [], preferredPeripheryId, lookups.byId);

  if (existing && existing.latitude !== null && existing.longitude !== null) {
    const periphery = getPeripheryFromRegionId(existing.id, lookups.byId);
    return {
      cityId: existing.id,
      cityName: existing.name,
      peripheryId: periphery ? periphery.id : null,
      peripheryName: periphery ? periphery.name : null,
      latitude: existing.latitude,
      longitude: existing.longitude,
    } as ResolvedMapLocation;
  }

  const geocoded = await geocodeCity(rawCityName, preferredPeripheryId);
  if (!geocoded) {
    if (!existing) return null;
    const periphery = getPeripheryFromRegionId(existing.id, lookups.byId);
    return {
      cityId: existing.id,
      cityName: existing.name,
      peripheryId: periphery ? periphery.id : null,
      peripheryName: periphery ? periphery.name : null,
      latitude: existing.latitude,
      longitude: existing.longitude,
    };
  }

  let city = existing;
  const peripheryId = geocoded.peripheryId ?? preferredPeripheryId;
  const periphery = peripheryId ? lookups.byId.get(peripheryId) ?? null : null;

  const cityResolved = resolveNormalizedCityName(geocoded.cityName, rawCityName);
  const cityName = cityResolved.cleaned;
  const normalizedCityName = cityResolved.normalized;

  if (!city && peripheryId && cityName && normalizedCityName) {
    const scopedMatch = pickScopedCity(lookups.cityByNormalized.get(normalizedCityName) || [], peripheryId, lookups.byId);
    if (scopedMatch) {
      city = scopedMatch;
    } else {
      city = await Region.create({
        name: cityName,
        normalized_name: normalizedCityName,
        external_ref_id: geocoded.externalRefId,
        type: "CITY",
        parent_id: peripheryId,
        latitude: geocoded.lat,
        longitude: geocoded.lng,
      } as any) as any;
      clearLocationCaches();
    }
  } else if (city) {
    const updatePayload: Record<string, unknown> = {};
    if (city.latitude === null || city.longitude === null) {
      updatePayload.latitude = geocoded.lat;
      updatePayload.longitude = geocoded.lng;
    }
    if (!city.normalized_name && normalizedCityName) updatePayload.normalized_name = normalizedCityName;
    if (!city.external_ref_id && geocoded.externalRefId) updatePayload.external_ref_id = geocoded.externalRefId;
    if (Object.keys(updatePayload).length) {
      await Region.update(updatePayload, { where: { id: city.id } });
      clearLocationCaches();
    }
  }

  const cityId = city ? Number((city as any).id) : null;
  return {
    cityId,
    cityName: city ? String((city as any).name) : geocoded.cityName,
    peripheryId: periphery ? periphery.id : geocoded.peripheryId,
    peripheryName: periphery ? periphery.name : geocoded.peripheryName,
    latitude: geocoded.lat,
    longitude: geocoded.lng,
  };
}

export async function resolveMapLocation(input: GraduateOriginInput): Promise<ResolvedMapLocation | null> {
  const lookups = await loadRegionLookups();
  const explicitCityId = input.origin_city_region_id ? Number(input.origin_city_region_id) : null;
  const explicitRegionId = input.origin_region_id ? Number(input.origin_region_id) : null;
  const rawCityName = cleanRegionText(input.origin_municipality);

  const explicitCity = explicitCityId ? lookups.byId.get(explicitCityId) ?? null : null;
  if (explicitCity && explicitCity.type === "CITY") {
    const periphery = getPeripheryFromRegionId(explicitCity.id, lookups.byId);
    if ((explicitCity.latitude !== null && explicitCity.longitude !== null) || !rawCityName) {
      return {
        cityId: explicitCity.id,
        cityName: explicitCity.name,
        peripheryId: periphery ? periphery.id : null,
        peripheryName: periphery ? periphery.name : null,
        latitude: explicitCity.latitude,
        longitude: explicitCity.longitude,
      };
    }
  }

  const region = explicitRegionId ? lookups.byId.get(explicitRegionId) ?? null : null;
  const periphery = explicitCity ? getPeripheryFromRegionId(explicitCity.id, lookups.byId) : region?.type === "PERIPHERY" ? region : getPeripheryFromRegionId(explicitRegionId, lookups.byId);
  const preferredPeripheryId = periphery ? periphery.id : null;

  if (!rawCityName) {
    return {
      cityId: explicitCity?.id ?? null,
      cityName: explicitCity?.name ?? null,
      peripheryId: periphery ? periphery.id : null,
      peripheryName: periphery ? periphery.name : null,
      latitude: explicitCity?.latitude ?? null,
      longitude: explicitCity?.longitude ?? null,
    };
  }

  const normalized = normalizeRegionText(rawCityName);
  if (!normalized) {
    return {
      cityId: explicitCity?.id ?? null,
      cityName: explicitCity?.name ?? rawCityName,
      peripheryId: periphery ? periphery.id : null,
      peripheryName: periphery ? periphery.name : null,
      latitude: explicitCity?.latitude ?? null,
      longitude: explicitCity?.longitude ?? null,
    };
  }

  const existing = pickScopedCity(lookups.cityByNormalized.get(normalized) || [], preferredPeripheryId, lookups.byId);
  if (existing && existing.latitude !== null && existing.longitude !== null) {
    const existingPeriphery = getPeripheryFromRegionId(existing.id, lookups.byId);
    return {
      cityId: existing.id,
      cityName: existing.name,
      peripheryId: existingPeriphery ? existingPeriphery.id : null,
      peripheryName: existingPeriphery ? existingPeriphery.name : null,
      latitude: existing.latitude,
      longitude: existing.longitude,
    };
  }

  const cacheKey = `${normalized}::${preferredPeripheryId || "none"}`;
  let pending = geocodeCache.get(cacheKey);
  if (!pending) {
    pending = persistCityFromGeocode(rawCityName, preferredPeripheryId);
    geocodeCache.set(cacheKey, pending);
  }

  const dynamic = await pending;
  if (dynamic) return dynamic;

  return {
    cityId: existing?.id ?? explicitCity?.id ?? null,
    cityName: existing?.name || explicitCity?.name || rawCityName,
    peripheryId: periphery ? periphery.id : null,
    peripheryName: periphery ? periphery.name : null,
    latitude: existing?.latitude ?? explicitCity?.latitude ?? null,
    longitude: existing?.longitude ?? explicitCity?.longitude ?? null,
  };
}
