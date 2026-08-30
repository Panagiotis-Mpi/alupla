import type { Request, Response } from "express";
import { StudyProgram } from "../models/StudyProgram";
import { getGraduationYears } from "../services/analyticsAggregations.service";
import { loadMapAggregateRows, loadMapCityYearCounts } from "../services/mapAggregations.service";
import { ensureLocalizedRegionNames, resolveMapLocation } from "../services/mapLocation.service";
import { loadRegionLookupIndex } from "../services/regionLookup.service";
import { normalizeKey, pickTopName, toInt } from "./map.helpers";
import { applyAggregateMetrics, createMetricsBucket, serializeMapMetrics } from "./map.metrics";

const ATHENS_GROUP_KEY = "athens";
const ATHENS_GROUP = {
  key: ATHENS_GROUP_KEY,
  nameEl: "Αθήνα",
  nameEn: "Athens",
  latitude: 37.9838,
  longitude: 23.7275,
};
const ATHENS_MUNICIPALITY_NAMES = [
  "Αθήνα",
  "Αθηναίων",
  "Athens",
  "Βύρωνας",
  "Βύρωνος",
  "Γαλάτσι",
  "Γαλατσίου",
  "Δάφνη-Υμηττός",
  "Δάφνης-Υμηττού",
  "Δάφνη",
  "Υμηττός",
  "Ζωγράφου",
  "Ηλιούπολη",
  "Ηλιούπολης",
  "Καισαριανή",
  "Καισαριανής",
  "Φιλαδέλφεια-Χαλκηδόνα",
  "Φιλαδέλφειας-Χαλκηδόνας",
  "Νέα Φιλαδέλφεια-Νέα Χαλκηδόνα",
  "Νέας Φιλαδέλφειας-Νέας Χαλκηδόνας",
  "Νέα Φιλαδέλφεια",
  "Νέας Φιλαδέλφειας",
  "Νέα Χαλκηδόνα",
  "Νέας Χαλκηδόνας",
  "Αγία Παρασκευή",
  "Αγίας Παρασκευής",
  "Αγ Παρασκευή",
  "Αγ Παρασκευής",
  "Αμαρούσιο",
  "Μαρούσι",
  "Αμαρουσίου",
  "Βριλήσσια",
  "Βριλησσίων",
  "Ηράκλειο",
  "Ηράκλειο Αττικής",
  "Ηρακλείου",
  "Κηφισιά",
  "Κηφισιάς",
  "Λυκόβρυση-Πεύκη",
  "Λυκόβρυσης-Πεύκης",
  "Λυκόβρυση",
  "Λυκόβρυσης",
  "Πεύκη",
  "Πεύκης",
  "Μεταμόρφωση",
  "Μεταμορφώσεως",
  "Νέα Ιωνία",
  "Νέας Ιωνίας",
  "Παπάγου-Χολαργός",
  "Παπάγου-Χολαργού",
  "Παπάγου",
  "Χολαργός",
  "Χολαργού",
  "Πεντέλη",
  "Πεντέλης",
  "Φιλοθέη-Ψυχικό",
  "Φιλοθέης-Ψυχικού",
  "Φιλοθέη",
  "Φιλοθέης",
  "Ψυχικό",
  "Ψυχικού",
  "Νέο Ψυχικό",
  "Νέου Ψυχικού",
  "Χαλάνδρι",
  "Χαλανδρίου",
  "Άγιος Δημήτριος",
  "Αγίου Δημητρίου",
  "Αγ Δημήτριος",
  "Αγ Δημητρίου",
  "Άλιμος",
  "Αλίμου",
  "Γλυφάδα",
  "Γλυφάδας",
  "Ελληνικό-Αργυρούπολη",
  "Ελληνικού-Αργυρούπολης",
  "Ελληνικό",
  "Ελληνικού",
  "Αργυρούπολη",
  "Αργυρούπολης",
  "Καλλιθέα",
  "Καλλιθέας",
  "Μοσχάτο-Ταύρος",
  "Μοσχάτου-Ταύρου",
  "Μοσχάτο",
  "Μοσχάτου",
  "Ταύρος",
  "Ταύρου",
  "Νέα Σμύρνη",
  "Νέας Σμύρνης",
  "Παλαιό Φάληρο",
  "Παλαιού Φαλήρου",
  "Αγία Βαρβάρα",
  "Αγίας Βαρβάρας",
  "Αγ Βαρβάρα",
  "Αγ Βαρβάρας",
  "Άγιοι Ανάργυροι-Καματερό",
  "Αγίων Αναργύρων-Καματερού",
  "Αγ Ανάργυροι-Καματερό",
  "Αγ Αναργύρων-Καματερού",
  "Άγιοι Ανάργυροι",
  "Αγίων Αναργύρων",
  "Αγ Ανάργυροι",
  "Αγ Αναργύρων",
  "Καματερό",
  "Καματερού",
  "Αιγάλεω",
  "Ιλίου",
  "Ίλιον",
  "Περιστέρι",
  "Περιστερίου",
  "Πετρούπολη",
  "Πετρούπολης",
  "Χαϊδάρι",
  "Χαϊδαρίου",
];
const ATHENS_GROUP_NAMES = new Set(ATHENS_MUNICIPALITY_NAMES.map((name) => athensLookupKey(name)));

function athensLookupKey(value: unknown) {
  const tokensToRemove = new Set(["δημοσ", "δημου", "δημοτικη", "δημοτικησ", "ενοτητα", "ενοτητασ"]);
  return normalizeKey(String(value ?? ""))
    .replace(/ς/g, "σ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((token) => token && !tokensToRemove.has(token))
    .join("");
}

function isAtticaLocation(resolvedLocation: any) {
  const peripheryKey = athensLookupKey(resolvedLocation?.peripheryName);
  return peripheryKey === athensLookupKey("Αττική") || peripheryKey === athensLookupKey("Attica");
}

function greekCityGroupForName(value: unknown) {
  return ATHENS_GROUP_NAMES.has(athensLookupKey(value)) ? ATHENS_GROUP : null;
}

function greekCityGroupForLocation(resolvedLocation: any, rawName?: unknown) {
  const cityGroup = greekCityGroupForName(resolvedLocation?.cityName) || greekCityGroupForName(rawName);
  if (!cityGroup) return null;
  const cityKey = athensLookupKey(resolvedLocation?.cityName || rawName);
  if (cityKey === athensLookupKey("Αθήνα") || cityKey === athensLookupKey("Αθηναίων")) return cityGroup;
  return isAtticaLocation(resolvedLocation) ? cityGroup : null;
}

function greekCityGroupForKey(value: unknown) {
  return String(value ?? "").trim() === ATHENS_GROUP_KEY ? ATHENS_GROUP : null;
}


type MapScope = "greece" | "abroad";
type MapBuildOptions = { includeMapItems?: boolean; includeCityItems?: boolean };

function mapScopeFromRequest(req: Request): MapScope {
  return String(req.query.scope || "greece").trim().toLowerCase() === "abroad" ? "abroad" : "greece";
}

function bucketToMapItem(bucket: any, programLabels: Map<number, string>) {
  return {
    periphery_id: bucket.periphery_id,
    periphery_name: bucket.periphery_name,
    periphery_name_el: bucket.periphery_name_el || bucket.periphery_name,
    periphery_name_en: bucket.periphery_name_en || bucket.periphery_name,
    latitude: bucket.latitude ?? null,
    longitude: bucket.longitude ?? null,
    ...serializeMapMetrics(bucket),
    dominant_study_program: pickTopName(bucket.programCounts, programLabels),
  };
}

function cityItem(bucket: any) {
  return {
    city_id: bucket.city_id,
    city_name: bucket.city_name,
    city_name_el: bucket.city_name_el || bucket.city_name,
    city_name_en: bucket.city_name_en || bucket.city_name,
    map_group_key: bucket.map_group_key || null,
    periphery_id: bucket.periphery_id,
    periphery_name: bucket.periphery_name,
    periphery_name_el: bucket.periphery_name_el || bucket.periphery_name,
    periphery_name_en: bucket.periphery_name_en || bucket.periphery_name,
    country_region_id: bucket.country_region_id,
    country_name: bucket.country_name,
    country_name_el: bucket.country_name_el || bucket.country_name,
    country_name_en: bucket.country_name_en || bucket.country_name,
    latitude: bucket.latitude,
    longitude: bucket.longitude,
    ...serializeMapMetrics(bucket),
  };
}

async function loadProgramLabels() {
  const rows = await StudyProgram.findAll({ attributes: ["id", "name_el", "name_en"], order: [["id", "ASC"]] });
  return new Map(rows.map((row: any) => [Number(row.id), String(row.name_el || row.name_en || "")]));
}

function numericOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function buildMapData(req: Request, options: MapBuildOptions = {}) {
  const scope = mapScopeFromRequest(req);
  const includeMapItems = options.includeMapItems !== false;
  const includeCityItems = options.includeCityItems === true;
  const [rows, index, programLabels] = await Promise.all([
    loadMapAggregateRows(req, scope),
    loadRegionLookupIndex(),
    includeMapItems ? loadProgramLabels() : Promise.resolve(new Map<number, string>())
  ]);

  const mapGroups = new Map<number, any>();
  const cityGroups = new Map<string, any>();

  if (includeMapItems && scope === "greece") {
    for (const region of index.rows) {
      if (region.type !== "PERIPHERY") continue;
      mapGroups.set(region.id, createMetricsBucket({
        periphery_id: region.id,
        periphery_name: region.name,
        periphery_name_el: region.name_el || region.name,
        periphery_name_en: region.name_en || region.name,
        latitude: region.latitude,
        longitude: region.longitude
      }));
    }
  }

  for (const row of rows) {
    const mapRegionId = Number(row.map_region_id || 0);
    if (includeMapItems && mapRegionId > 0) {
      const bucket = mapGroups.get(mapRegionId) || createMetricsBucket({
        periphery_id: mapRegionId,
        periphery_name: String(row.map_region_name || ""),
        periphery_name_el: String(row.map_region_name_el || row.map_region_name || ""),
        periphery_name_en: String(row.map_region_name_en || row.map_region_name || ""),
        latitude: numericOrNull(row.map_latitude),
        longitude: numericOrNull(row.map_longitude)
      });
      applyAggregateMetrics(bucket, row);
      mapGroups.set(mapRegionId, bucket);
    }

    if (includeCityItems) {
      const resolved = {
        cityName: String(row.city_name || ""),
        peripheryId: Number(row.periphery_id || 0) || null,
        peripheryName: String(row.periphery_name || "")
      };
      const group = scope === "greece" ? greekCityGroupForLocation(resolved, row.city_name) : null;
      const cityId = group ? 0 : Number(row.city_id || 0);
      if (!group && cityId <= 0) continue;
      const countryId = Number(row.country_id || 0);
      const key = group ? `group:${group.key}` : `${countryId}:${cityId}`;
      const parentId = scope === "greece" ? Number(row.periphery_id || 0) || null : countryId || null;
      const parentName = scope === "greece" ? row.periphery_name : row.country_name;
      const parentNameEl = scope === "greece" ? row.periphery_name_el : row.country_name_el;
      const parentNameEn = scope === "greece" ? row.periphery_name_en : row.country_name_en;
      const bucket = cityGroups.get(key) || createMetricsBucket({
        city_id: cityId,
        city_name: group?.nameEl || String(row.city_name || ""),
        city_name_el: group?.nameEl || String(row.city_name_el || row.city_name || ""),
        city_name_en: group?.nameEn || String(row.city_name_en || row.city_name || ""),
        map_group_key: group?.key || null,
        periphery_id: parentId,
        periphery_name: String(parentName || ""),
        periphery_name_el: String(parentNameEl || parentName || ""),
        periphery_name_en: String(parentNameEn || parentName || ""),
        country_region_id: countryId || null,
        country_name: String(row.country_name || ""),
        country_name_el: String(row.country_name_el || row.country_name || ""),
        country_name_en: String(row.country_name_en || row.country_name || ""),
        latitude: group?.latitude ?? numericOrNull(row.city_latitude),
        longitude: group?.longitude ?? numericOrNull(row.city_longitude)
      });
      applyAggregateMetrics(bucket, row);
      cityGroups.set(key, bucket);
    }
  }

  const mapItems = [...mapGroups.values()]
    .map((bucket) => bucketToMapItem(bucket, programLabels))
    .sort((a, b) => b.count - a.count);
  const cities = [...cityGroups.values()]
    .filter((bucket) => bucket.count > 0)
    .map(cityItem)
    .sort((a, b) => b.count - a.count || String(a.city_name).localeCompare(String(b.city_name), "el"));

  return {
    map: { items: includeMapItems ? mapItems : [], total: mapItems.reduce((sum, item) => sum + Number(item.count || 0), 0) },
    cities: { items: includeCityItems ? cities : [] }
  };
}

export async function resolveMapCityPresentation(input: any, scope: MapScope) {
  const resolved = await resolveMapLocation(input);
  const rawName = String(scope === "abroad" ? input?.origin_foreign_city || input?.origin_municipality || "" : input?.origin_municipality || "").trim();
  const fallback = String(resolved?.cityName || rawName).trim();
  const group = scope === "greece" ? greekCityGroupForLocation(resolved, rawName) : null;
  const cityId = group ? null : Number(resolved?.cityId || input?.origin_city_region_id || 0) || null;
  const names = cityId ? await ensureLocalizedRegionNames(cityId) : { nameEl: null, nameEn: null };
  const nameEl = group?.nameEl || names.nameEl || fallback;
  const nameEn = group?.nameEn || names.nameEn || nameEl;
  const countryName = String(resolved?.countryName || input?.origin_country || "");
  const key = scope === "abroad"
    ? `${normalizeKey(countryName)}::${cityId || normalizeKey(fallback)}`
    : group ? `group:${group.key}` : `${cityId || normalizeKey(fallback)}::${resolved?.peripheryId || "none"}`;
  return { key, id: cityId, name: nameEl, name_el: nameEl, name_en: nameEn };
}

export async function resolveMapCountryPresentation(input: any) {
  const resolved = await resolveMapLocation(input);
  const rawName = String(input?.origin_country || resolved?.countryName || "").trim();
  if (!rawName || rawName === "Άγνωστη χώρα") return { key: "country:unknown", id: null, name: "Άγνωστη χώρα", name_el: "Άγνωστη χώρα", name_en: "Unknown country" };
  const countryId = Number(resolved?.countryId || input?.origin_country_region_id || 0) || null;
  const names = countryId ? await ensureLocalizedRegionNames(countryId) : { nameEl: null, nameEn: null };
  const nameEl = names.nameEl || rawName;
  const nameEn = names.nameEn || nameEl;
  return { key: countryId ? `country:${countryId}` : `country:${normalizeKey(rawName)}`, id: countryId, name: nameEl, name_el: nameEl, name_en: nameEn };
}

export async function getGraduatesMap(req: Request, res: Response) {
  const data = await buildMapData(req, { includeMapItems: true });
  return res.json({ ok: true, items: data.map.items, total: data.map.total });
}

export async function getMapSummary(req: Request, res: Response) {
  const data = await buildMapData(req, { includeMapItems: true, includeCityItems: true });
  return res.json({ ok: true, items: data.map.items, total: data.map.total, cities: data.cities.items });
}

export async function getMapCities(req: Request, res: Response) {
  const data = await buildMapData(req, { includeMapItems: false, includeCityItems: true });
  return res.json({ ok: true, items: data.cities.items });
}

export async function getMapYearRange(_req: Request, res: Response) {
  try {
    const years = await getGraduationYears();
    return res.json({ ok: true, years, min_year: years[0] ?? null, max_year: years.at(-1) ?? null });
  } catch {
    return res.status(500).json({ ok: false, message: "Failed to load map years" });
  }
}

export async function getMapCityDetail(req: Request, res: Response) {
  const scope = mapScopeFromRequest(req);
  const cityId = toInt(req.query.city_id);
  const cityName = String(req.query.city_name || "").trim();
  const group = scope === "greece" ? greekCityGroupForKey(req.query.map_group_key) || greekCityGroupForName(cityName) : null;
  const countryLookupId = toInt(req.query.country_region_id) || toInt(req.query.periphery_id);
  const rows = await loadMapAggregateRows(req, scope);
  const matching = rows.filter((row) => {
    if (scope === "abroad") {
      if (countryLookupId && Number(row.country_id) !== countryLookupId) return false;
      if (cityId && Number(row.city_id) !== cityId) return false;
      return cityId || !cityName ? true : normalizeKey(row.city_name) === normalizeKey(cityName);
    }
    if (group) {
      return greekCityGroupForLocation({
        cityName: row.city_name,
        peripheryId: Number(row.periphery_id || 0) || null,
        peripheryName: row.periphery_name
      }, row.city_name)?.key === group.key;
    }
    if (cityId) return Number(row.city_id) === cityId;
    return cityName ? normalizeKey(row.city_name) === normalizeKey(cityName) : false;
  });

  const bucket = createMetricsBucket({});
  matching.forEach((row) => applyAggregateMetrics(bucket, row));
  const metrics = serializeMapMetrics(bucket);
  const selectedCityIds = Array.from(new Set(matching.map((row) => Number(row.city_id || 0)).filter((id) => id > 0)));
  const resolvedCityId = group ? 0 : cityId || selectedCityIds[0] || 0;
  const label = group?.nameEl || cityName || String(matching[0]?.city_name || "");
  const names = resolvedCityId ? await ensureLocalizedRegionNames(resolvedCityId) : { nameEl: null, nameEn: null };
  const countryNames = countryLookupId ? await ensureLocalizedRegionNames(countryLookupId) : { nameEl: null, nameEn: null };
  const base = {
    ok: true,
    city_id: resolvedCityId,
    city_name: label,
    city_name_el: group?.nameEl || names.nameEl || label,
    city_name_en: group?.nameEn || names.nameEn || label,
    map_group_key: group?.key || null,
    country_name: countryNames.nameEl || countryNames.nameEn || null,
    country_name_el: countryNames.nameEl,
    country_name_en: countryNames.nameEn,
    total: metrics.count,
    avg_age: metrics.avg_age,
    avg_grade: metrics.avg_grade,
    avg_graduation_years: metrics.avg_graduation_years,
    male_count: metrics.male_count,
    female_count: metrics.female_count,
    male_pct: metrics.male_pct,
    female_pct: metrics.female_pct
  };
  if (String(req.query.mode || "count") === "dominant_gender") return res.json({ ...base, mode: "dominant_gender" });

  const currentYear = new Date().getFullYear();
  const yearRows = await loadMapCityYearCounts(req, scope, selectedCityIds, scope === "abroad" ? countryLookupId : null);
  const rowYears = yearRows.map((row) => Number(row.year)).filter((year) => Number.isFinite(year) && year > 1900);
  const startYear = rowYears.length ? Math.min(...rowYears) : currentYear;
  const endYear = Math.max(currentYear, rowYears.length ? Math.max(...rowYears) : startYear);
  const labels = Array.from({ length: endYear - startYear + 1 }, (_, index) => String(startYear + index));
  const counts = labels.map(() => 0);
  for (const row of yearRows) {
    const year = Number(row.year);
    if (year >= startYear && year <= endYear) counts[year - startYear] = Number(row.count) || 0;
  }
  const lang = String(req.query.lang || "").toLowerCase().startsWith("en") ? "en" : "gr";
  return res.json({ ...base, mode: "count", labels, datasets: [{ key: "count", label: lang === "en" ? "Graduates" : "Απόφοιτοι", values: counts }] });
}
