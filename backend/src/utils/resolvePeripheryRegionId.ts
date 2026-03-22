import { Region } from "../models/Region";

type ResolveOriginInput = {
  origin_region_id: number | null;
  origin_municipality: string | null;
};

type RegionLite = {
  id: number;
  name: string;
  type: string;
  parent_id: number | null;
};

export type NormalizedOriginResult = {
  origin_region_id: number | null;
  origin_municipality: string | null;
  city_region_id: number | null;
};

const MAX_PARENT_STEPS = 25;

function toName(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeName(value: unknown) {
  return toName(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pushMatch(map: Map<string, RegionLite[]>, key: string, region: RegionLite) {
  const items = map.get(key);
  if (items) {
    items.push(region);
    return;
  }
  map.set(key, [region]);
}

let regionsCache: Promise<RegionLite[]> | null = null;

async function loadRegions() {
  if (!regionsCache) {
    regionsCache = Region.findAll({ attributes: ["id", "name", "type", "parent_id"] }).then((rows) =>
      (rows as any[]).map((row) => ({
        id: Number(row.id),
        name: String(row.name ?? ""),
        type: String(row.type ?? ""),
        parent_id: row.parent_id != null ? Number(row.parent_id) : null,
      }))
    );
  }
  return regionsCache;
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

function pickRegionMatch(
  normalizedMunicipality: string,
  preferredPeripheryId: number | null,
  cityByName: Map<string, RegionLite[]>,
  regionByName: Map<string, RegionLite[]>,
  byId: Map<number, RegionLite>
) {
  if (!normalizedMunicipality) return null;

  const cityCandidates = cityByName.get(normalizedMunicipality) ?? [];
  if (preferredPeripheryId) {
    const scoped = cityCandidates.find((item) => {
      const periphery = getPeripheryFromRegion(item.id, byId);
      return periphery ? periphery.id === preferredPeripheryId : false;
    });
    if (scoped) return scoped;
  }

  if (cityCandidates[0]) return cityCandidates[0];

  const regionCandidates = regionByName.get(normalizedMunicipality) ?? [];
  if (preferredPeripheryId) {
    const scoped = regionCandidates.find((item) => {
      const periphery = getPeripheryFromRegion(item.id, byId);
      return periphery ? periphery.id === preferredPeripheryId : false;
    });
    if (scoped) return scoped;
  }

  return regionCandidates[0] ?? null;
}

export async function normalizeOriginLocation(input: ResolveOriginInput): Promise<NormalizedOriginResult> {
  const regions = await loadRegions();
  const byId = new Map<number, RegionLite>();
  const cityByName = new Map<string, RegionLite[]>();
  const regionByName = new Map<string, RegionLite[]>();

  for (const region of regions) {
    byId.set(region.id, region);
    const key = normalizeName(region.name);
    if (!key) continue;
    pushMatch(regionByName, key, region);
    if (region.type === "CITY") pushMatch(cityByName, key, region);
  }

  const rawMunicipality = toName(input.origin_municipality);
  const normalizedMunicipality = normalizeName(rawMunicipality);
  const currentRegion = input.origin_region_id != null ? byId.get(Number(input.origin_region_id)) ?? null : null;
  const currentPeriphery = currentRegion ? getPeripheryFromRegion(currentRegion.id, byId) : null;
  const preferredPeripheryId = currentPeriphery ? currentPeriphery.id : currentRegion?.type === "PERIPHERY" ? currentRegion.id : null;

  let matchedRegion = pickRegionMatch(normalizedMunicipality, preferredPeripheryId, cityByName, regionByName, byId);

  if (!matchedRegion && currentRegion?.type === "CITY") {
    matchedRegion = currentRegion;
  }

  const periphery = matchedRegion
    ? getPeripheryFromRegion(matchedRegion.id, byId)
    : currentRegion
      ? getPeripheryFromRegion(currentRegion.id, byId)
      : null;

  const municipality = matchedRegion?.type === "CITY"
    ? matchedRegion.name
    : rawMunicipality || (currentRegion?.type === "CITY" ? currentRegion.name : null);

  return {
    origin_region_id: periphery ? periphery.id : null,
    origin_municipality: municipality || null,
    city_region_id: matchedRegion?.type === "CITY" ? matchedRegion.id : null,
  };
}

export async function resolvePeripheryRegionId(input: ResolveOriginInput): Promise<number | null> {
  const normalized = await normalizeOriginLocation(input);
  return normalized.origin_region_id;
}
