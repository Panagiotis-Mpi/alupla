import { ensureLocalizedRegionNames } from "./mapLocation.service";
import type { LocalizedNamesByRegionId } from "../controllers/graduates.shared";
import { Region } from "../models/Region";

function collectGraduateRegionIds(rows: Array<Record<string, any>>) {
  const ids = new Set<number>();
  for (const row of rows) {
    [
      row.origin_country_region_id,
      row.origin_periphery_region_id,
      row.origin_region_id,
      row.origin_city_region_id,
    ].forEach((value) => {
      const id = Number(value);
      if (Number.isFinite(id) && id > 0) ids.add(id);
    });
  }
  return Array.from(ids);
}

type RegionNode = {
  id: number;
  type: string;
  parent_id: number | null;
};

let graduateRegionTreeCache: Promise<Map<number, RegionNode>> | null = null;

function ancestorOf(
  startId: unknown,
  targetType: string,
  regionsById: Map<number, RegionNode>,
) {
  const id = Number(startId);
  if (!Number.isFinite(id) || id <= 0) return null;
  let current = regionsById.get(id) ?? null;
  let steps = 0;

  while (current && steps < 25) {
    if (current.type === targetType) return current;
    current = current.parent_id ? regionsById.get(current.parent_id) ?? null : null;
    steps += 1;
  }

  return null;
}

function getGraduateRegionTree() {
  if (!graduateRegionTreeCache) {
    graduateRegionTreeCache = Region.findAll({
      attributes: ["id", "type", "parent_id"],
    }).then(
      (rows) =>
        new Map(
          rows.map((row: any) => [
            Number(row.id),
            {
              id: Number(row.id),
              type: String(row.type),
              parent_id: row.parent_id == null ? null : Number(row.parent_id),
            },
          ]),
        ),
    );
  }
  return graduateRegionTreeCache;
}

export function clearGraduateLocalizationCache() {
  graduateRegionTreeCache = null;
}

async function completeGraduateRegionIds(rows: Array<Record<string, any>>) {
  if (!rows.length) return rows;
  const regionsById = await getGraduateRegionTree();

  return rows.map((row) => {
    const next = { ...row };
    const cityId = Number(next.origin_city_region_id);
    const nomosId = Number(next.origin_region_id);
    const peripheryId = Number(next.origin_periphery_region_id);

    if ((!Number.isFinite(nomosId) || nomosId <= 0) && Number.isFinite(cityId) && cityId > 0) {
      const nomos = ancestorOf(cityId, "NOMOS", regionsById);
      if (nomos) next.origin_region_id = nomos.id;
    }

    if (!Number.isFinite(peripheryId) || peripheryId <= 0) {
      const sourceId = Number(next.origin_region_id) || cityId;
      const periphery = ancestorOf(sourceId, "PERIPHERY", regionsById);
      if (periphery) next.origin_periphery_region_id = periphery.id;
    }

    return next;
  });
}

export async function getLocalizedNamesForGraduates(
  rows: Array<Record<string, any>>,
  lang: string,
) {
  if (
    !String(lang || "")
      .toLowerCase()
      .startsWith("en")
  )
    return undefined;
  const plainRows = rows.map((row: any) =>
    row?.get ? row.get({ plain: true }) : row,
  );
  const normalizedRows = await completeGraduateRegionIds(plainRows);
  const entries = await Promise.all(
    collectGraduateRegionIds(normalizedRows).map(
      async (id) => [id, await ensureLocalizedRegionNames(id)] as const,
    ),
  );
  return new Map(entries) as LocalizedNamesByRegionId;
}

function localizedName(
  localizedNamesById: LocalizedNamesByRegionId | undefined,
  id: unknown,
) {
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return "";
  return String(localizedNamesById?.get(numericId)?.nameEn ?? "").trim();
}

export async function serializeGraduateRows(rows: any[], lang: string) {
  const plainRows = rows.map((row) =>
    row?.get ? row.get({ plain: true }) : row,
  );
  const normalizedRows = await completeGraduateRegionIds(plainRows);
  const localizedNamesById = await getLocalizedNamesForGraduates(
    normalizedRows,
    lang,
  );
  if (!localizedNamesById) return normalizedRows;
  return normalizedRows.map((row) => ({
    ...row,
    origin_country_name_en: localizedName(
      localizedNamesById,
      row.origin_country_region_id,
    ),
    origin_region_name_en: localizedName(
      localizedNamesById,
      row.origin_periphery_region_id,
    ),
    origin_nomos_name_en: localizedName(
      localizedNamesById,
      row.origin_region_id,
    ),
    origin_city_name_en: localizedName(
      localizedNamesById,
      row.origin_city_region_id,
    ),
  }));
}
