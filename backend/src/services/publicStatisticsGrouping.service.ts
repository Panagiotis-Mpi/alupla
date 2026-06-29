import { ensureLocalizedRegionNames } from "./mapLocation.service";
import { resolveMapCityPresentation, resolveMapCountryPresentation } from "../controllers/map.controller";
import { isGreeceOriginValue } from "../controllers/map.helpers";

export type StatisticsMunicipalityRow = {
  city_id?: number | null;
  country_id?: number | null;
  periphery_id?: number | null;
  region_id?: number | null;
  country_name?: string | null;
  name: string;
  count: number;
  male?: number;
  female?: number;
};

export type StatisticsCountryRow = {
  id?: number | null;
  name: string;
  count: number;
};

export async function localizedNamesForRegion(regionId: number | null | undefined, fallback: string) {
  const safeFallback = String(fallback ?? "").trim();
  if (!regionId) return { name_el: safeFallback, name_en: safeFallback };
  const names = await ensureLocalizedRegionNames(Number(regionId));
  return {
    name_el: String(names.nameEl ?? safeFallback).trim() || safeFallback,
    name_en: String(names.nameEn ?? safeFallback).trim() || safeFallback,
  };
}

function mergeLocalizedCount(
  map: Map<string, { id?: number | null; name: string; name_el: string; name_en: string; count: number }>,
  key: string,
  item: { id?: number | null; name: string; name_el: string; name_en: string; count: number }
) {
  const current = map.get(key);
  if (current) {
    current.count += item.count;
    if (!current.id && item.id) current.id = item.id;
    if (!current.name_el && item.name_el) current.name_el = item.name_el;
    if (!current.name_en && item.name_en) current.name_en = item.name_en;
    return;
  }
  map.set(key, item);
}

export async function groupStatisticsMunicipalities(rows: StatisticsMunicipalityRow[], forcedScope?: "greece" | "abroad") {
  const groups = new Map<string, { id?: number | null; name: string; name_el: string; name_en: string; count: number; male: number; female: number }>();
  for (const row of rows) {
    const rawName = String(row.name ?? "").trim();
    if (!rawName) continue;
    const countryName = String(row.country_name ?? "").trim();
    const scope = forcedScope || (countryName && !isGreeceOriginValue(countryName) ? "abroad" : "greece");
    const presentation = await resolveMapCityPresentation({
      origin_country: countryName || null,
      origin_country_region_id: Number(row.country_id) || null,
      origin_periphery_region_id: Number(row.periphery_id) || null,
      origin_region_id: Number(row.region_id) || null,
      origin_city_region_id: Number(row.city_id) || null,
      origin_municipality: scope === "greece" ? rawName : null,
      origin_foreign_city: scope === "abroad" ? rawName : null,
    }, scope);
    const current = groups.get(presentation.key);
    if (current) {
      current.count += Number(row.count) || 0;
      current.male += Number(row.male) || 0;
      current.female += Number(row.female) || 0;
      continue;
    }
    groups.set(presentation.key, {
      id: presentation.id,
      name: presentation.name,
      name_el: presentation.name_el,
      name_en: presentation.name_en,
      count: Number(row.count) || 0,
      male: Number(row.male) || 0,
      female: Number(row.female) || 0,
    });
  }
  return groups;
}

export async function groupStatisticsCountries(rows: StatisticsCountryRow[]) {
  const groups = new Map<string, { id?: number | null; name: string; name_el: string; name_en: string; count: number }>();
  for (const row of rows) {
    const presentation = await resolveMapCountryPresentation({
      origin_country: String(row.name ?? "").trim(),
      origin_country_region_id: Number(row.id) || null,
    });
    mergeLocalizedCount(groups, presentation.key, {
      id: presentation.id,
      name: presentation.name,
      name_el: presentation.name_el,
      name_en: presentation.name_en,
      count: Number(row.count) || 0,
    });
  }
  return groups;
}
