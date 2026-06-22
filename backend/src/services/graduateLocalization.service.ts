import type { LocalizedNamesByRegionId } from "../controllers/graduates.shared";
import {
  getRegionHierarchy,
  loadRegionLookupIndex,
} from "./regionLookup.service";

function text(...values: unknown[]) {
  for (const value of values) {
    const result = String(value ?? "").trim();
    if (result) return result;
  }
  return "";
}


export async function getLocalizedNamesForGraduates(rows: Array<Record<string, any>>, lang: string) {
  if (!String(lang || "").toLowerCase().startsWith("en")) return undefined;
  const index = await loadRegionLookupIndex();
  const ids = new Set<number>();
  for (const source of rows) {
    const row = source?.get ? source.get({ plain: true }) : source;
    const hierarchy = getRegionHierarchy(Number(row.origin_location_id), index.byId);
    for (const region of [hierarchy?.location, hierarchy?.city, hierarchy?.nomos, hierarchy?.periphery, hierarchy?.country]) {
      if (region) ids.add(region.id);
    }
  }
  return new Map([...ids].map((id) => {
    const region = index.byId.get(id)!;
    return [id, {
      nameEl: text(region.name_el, region.name) || null,
      nameEn: text(region.name_en, region.name) || null,
    }];
  })) as LocalizedNamesByRegionId;
}

export async function serializeGraduateRows(rows: any[], lang: string) {
  const index = await loadRegionLookupIndex();
  const english = String(lang || "").toLowerCase().startsWith("en");
  return rows.map((source) => {
    const row = source?.get ? source.get({ plain: true }) : source;
    const hierarchy = getRegionHierarchy(Number(row.origin_location_id), index.byId);
    if (!hierarchy?.country) return row;
    const abroad = hierarchy.country.normalized_name !== "ελλαδα" && hierarchy.country.normalized_name !== "greece";
    const city = hierarchy.city;
    return {
      ...row,
      origin_country: hierarchy.country.name,
      origin_foreign_city: abroad ? city?.name ?? hierarchy.location.name : null,
      origin_country_region_id: hierarchy.country.id,
      origin_periphery_region_id: abroad ? null : hierarchy.periphery?.id ?? null,
      origin_region_id: abroad ? null : hierarchy.nomos?.id ?? null,
      origin_city_region_id: abroad ? null : city?.id ?? null,
      origin_municipality: abroad ? null : city?.name ?? null,
      origin_country_name_en: text(hierarchy.country.name_en, hierarchy.country.name),
      origin_region_name_en: text(hierarchy.periphery?.name_en, hierarchy.periphery?.name),
      origin_nomos_name_en: text(hierarchy.nomos?.name_en, hierarchy.nomos?.name),
      origin_city_name_en: text(city?.name_en, city?.name),
      ...(english ? {
        origin_country_display: text(hierarchy.country.name_en, hierarchy.country.name),
        origin_region_display: text(hierarchy.periphery?.name_en, hierarchy.periphery?.name),
        origin_nomos_display: text(hierarchy.nomos?.name_en, hierarchy.nomos?.name),
        origin_city_display: text(city?.name_en, city?.name),
      } : {}),
    };
  });
}
