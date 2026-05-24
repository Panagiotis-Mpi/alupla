import { ensureLocalizedRegionNames } from "./mapLocation.service";
import type { LocalizedNamesByRegionId } from "../controllers/graduates.shared";

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
  const entries = await Promise.all(
    collectGraduateRegionIds(plainRows).map(
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
  const localizedNamesById = await getLocalizedNamesForGraduates(
    plainRows,
    lang,
  );
  if (!localizedNamesById) return plainRows;
  return plainRows.map((row) => ({
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
