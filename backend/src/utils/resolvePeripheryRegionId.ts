import { Region } from "../models/Region";

/**
 * Enforces the "Option A" rule: graduates.origin_region_id should point to a PERIPHERY.
 *
 * If the given region is CITY/DIMOS/NOMOS, we walk parent_id until we reach PERIPHERY.
 * If origin_region_id is null but origin_municipality is provided, we try to find a Region
 * by name and then apply the same roll-up.
 */
export async function resolvePeripheryRegionId(input: {
  origin_region_id: number | null;
  origin_municipality: string | null;
}): Promise<number | null> {
  const { origin_region_id, origin_municipality } = input;

  // 1) Prefer explicit id.
  if (origin_region_id != null) {
    const pid = await rollupToPeriphery(origin_region_id);
    return pid;
  }

  // 2) Fallback: try resolve by municipality name.
  const name = (origin_municipality ?? "").trim();
  if (!name) return null;

  // Try exact match first.
  const hit = await Region.findOne({ where: { name } });
  if (!hit) return null;

  return await rollupToPeriphery(Number((hit as any).id));
}

async function rollupToPeriphery(regionId: number): Promise<number | null> {
  let cur = await Region.findByPk(regionId);
  let guard = 0;

  while (cur && guard++ < 25) {
    if (String((cur as any).type) === "PERIPHERY") return Number((cur as any).id);
    const parentId = (cur as any).parent_id ? Number((cur as any).parent_id) : null;
    if (!parentId) return null;
    cur = await Region.findByPk(parentId);
  }

  return null;
}
