import { Region } from "../models/Region";

type ResolveOriginInput = {
  origin_region_id: number | null;
  origin_municipality: string | null;
};

const MAX_PARENT_STEPS = 25;

async function getPeripheryFromRegion(regionId: number): Promise<number | null> {
  let current = await Region.findByPk(regionId);
  let steps = 0;

  while (current && steps < MAX_PARENT_STEPS) {
    steps += 1;

    if (String((current as any).type) === "PERIPHERY") {
      return Number((current as any).id);
    }

    const parentId = (current as any).parent_id ? Number((current as any).parent_id) : null;
    if (!parentId) return null;

    current = await Region.findByPk(parentId);
  }

  return null;
}

async function findRegionIdByName(name: string): Promise<number | null> {
  const region = await Region.findOne({ where: { name } });
  return region ? Number((region as any).id) : null;
}

export async function resolvePeripheryRegionId(input: ResolveOriginInput): Promise<number | null> {
  if (input.origin_region_id != null) {
    return getPeripheryFromRegion(input.origin_region_id);
  }

  const municipality = String(input.origin_municipality ?? "").trim();
  if (!municipality) return null;

  const regionId = await findRegionIdByName(municipality);
  if (!regionId) return null;

  return getPeripheryFromRegion(regionId);
}
