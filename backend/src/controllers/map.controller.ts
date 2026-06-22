import type { Request, Response } from "express";
import { Graduate } from "../models/Graduate";
import { StudyProgram } from "../models/StudyProgram";
import { ensureLocalizedRegionNames, resolveMapLocation } from "../services/mapLocation.service";
import { getRegionHierarchy, loadRegionLookupIndex } from "../services/regionLookup.service";
import { buildMapWhere, normalizeKey, pickTopName, toInt } from "./map.helpers";
import { getGraduationYears } from "../services/analyticsAggregations.service";
import { applyGraduateMetrics, createMetricsBucket, serializeMapMetrics } from "./map.metrics";

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
  const peripheryId = Number(resolvedLocation?.peripheryId || 0);
  if (peripheryId === 1) return true;
  return athensLookupKey(resolvedLocation?.peripheryName) === athensLookupKey("Αττική");
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

function isGreeceCountry(name: unknown) {
  const value = normalizeKey(String(name ?? ""));
  return value === normalizeKey("Ελλάδα") || value === normalizeKey("Greece");
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
  const rows = await StudyProgram.findAll({ attributes: ["id", "code", "name_el", "name_en"] });
  return new Map(rows.map((row: any) => [Number(row.id), String(row.name_el || row.name_en || row.code || "")]));
}

function graduateAttributes() {
  return ["origin_location_id", "gender", "birth_date", "degree_grade", "entry_year", "graduation_date", "study_program_id"];
}

async function buildMapData(req: Request, options: MapBuildOptions = {}) {
  const scope = mapScopeFromRequest(req);
  const { where } = buildMapWhere(req);
  const includeMapItems = options.includeMapItems !== false;
  const includeCityItems = options.includeCityItems === true;
  const [rows, index, programLabels] = await Promise.all([
    Graduate.findAll({ where, attributes: graduateAttributes() }),
    loadRegionLookupIndex(),
    includeMapItems ? loadProgramLabels() : Promise.resolve(new Map<number, string>()),
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
        longitude: region.longitude,
      }));
    }
  }

  for (const source of rows as any[]) {
    const graduate = source.get({ plain: true });
    const hierarchy = getRegionHierarchy(Number(graduate.origin_location_id), index.byId);
    if (!hierarchy?.country) continue;
    const isGreece = isGreeceCountry(hierarchy.country.name);
    if ((scope === "greece") !== isGreece) continue;
    const resolved = await resolveMapLocation({ origin_location_id: graduate.origin_location_id });
    if (!resolved) continue;

    if (includeMapItems) {
      const mapRegion = scope === "greece" ? hierarchy.periphery : hierarchy.country;
      if (mapRegion) {
        const bucket = mapGroups.get(mapRegion.id) || createMetricsBucket({
          periphery_id: mapRegion.id,
          periphery_name: mapRegion.name,
          periphery_name_el: mapRegion.name_el || mapRegion.name,
          periphery_name_en: mapRegion.name_en || mapRegion.name,
          latitude: mapRegion.latitude ?? resolved.latitude,
          longitude: mapRegion.longitude ?? resolved.longitude,
        });
        applyGraduateMetrics(bucket, graduate);
        mapGroups.set(mapRegion.id, bucket);
      }
    }

    if (includeCityItems) {
      const rawCityName = hierarchy.city?.name || hierarchy.location.name;
      const group = scope === "greece" ? greekCityGroupForLocation(resolved, rawCityName) : null;
      const cityId = group ? 0 : hierarchy.city?.id ?? hierarchy.location.id;
      const key = group
        ? `group:${group.key}`
        : `${hierarchy.country.id}:${cityId}`;
      const city = hierarchy.city || hierarchy.location;
      const parent = scope === "greece" ? hierarchy.periphery : hierarchy.country;
      const bucket = cityGroups.get(key) || createMetricsBucket({
        city_id: cityId,
        city_name: group?.nameEl || city.name,
        city_name_el: group?.nameEl || city.name_el || city.name,
        city_name_en: group?.nameEn || city.name_en || city.name,
        map_group_key: group?.key || null,
        periphery_id: parent?.id ?? null,
        periphery_name: parent?.name || "",
        periphery_name_el: parent?.name_el || parent?.name || "",
        periphery_name_en: parent?.name_en || parent?.name || "",
        country_region_id: hierarchy.country.id,
        country_name: hierarchy.country.name,
        country_name_el: hierarchy.country.name_el || hierarchy.country.name,
        country_name_en: hierarchy.country.name_en || hierarchy.country.name,
        latitude: group?.latitude ?? resolved.latitude,
        longitude: group?.longitude ?? resolved.longitude,
      });
      applyGraduateMetrics(bucket, graduate);
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
    cities: { items: includeCityItems ? cities : [] },
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
  const countryId = toInt(req.query.country_region_id) || toInt(req.query.periphery_id);
  const { where, currentYear } = buildMapWhere(req);
  const [rows, index] = await Promise.all([
    Graduate.findAll({ where, attributes: graduateAttributes() }),
    loadRegionLookupIndex(),
  ]);
  const matching: any[] = [];
  let label = group?.nameEl || cityName;

  for (const source of rows as any[]) {
    const graduate = source.get({ plain: true });
    const hierarchy = getRegionHierarchy(Number(graduate.origin_location_id), index.byId);
    if (!hierarchy?.country) continue;
    const isGreece = isGreeceCountry(hierarchy.country.name);
    if ((scope === "greece") !== isGreece) continue;
    const resolved = await resolveMapLocation({ origin_location_id: graduate.origin_location_id });
    if (!resolved) continue;

    if (scope === "abroad") {
      if (countryId && hierarchy.country.id !== countryId) continue;
      if (cityId && (hierarchy.city?.id ?? hierarchy.location.id) !== cityId) continue;
      if (!cityId && cityName && normalizeKey(hierarchy.city?.name || hierarchy.location.name) !== normalizeKey(cityName)) continue;
      label = cityName || hierarchy.city?.name || hierarchy.country.name;
    } else if (group) {
      if (greekCityGroupForLocation(resolved, hierarchy.city?.name || hierarchy.location.name)?.key !== group.key) continue;
    } else if (cityId && (hierarchy.city?.id ?? hierarchy.location.id) !== cityId) {
      continue;
    }
    matching.push(graduate);
  }

  const bucket = createMetricsBucket({});
  matching.forEach((graduate) => applyGraduateMetrics(bucket, graduate));
  const metrics = serializeMapMetrics(bucket);
  const names = cityId ? await ensureLocalizedRegionNames(cityId) : { nameEl: null, nameEn: null };
  const countryNames = countryId ? await ensureLocalizedRegionNames(countryId) : { nameEl: null, nameEn: null };
  const base = {
    ok: true,
    city_id: group ? 0 : cityId || 0,
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
    female_pct: metrics.female_pct,
  };
  if (String(req.query.mode || "count") === "dominant_gender") return res.json({ ...base, mode: "dominant_gender" });

  const startYear = 2010;
  const endYear = Math.max(currentYear, startYear);
  const labels = Array.from({ length: endYear - startYear + 1 }, (_, index) => String(startYear + index));
  const counts = labels.map(() => 0);
  for (const graduate of matching) {
    const year = Number(String(graduate.graduation_date || "").slice(0, 4));
    if (year >= startYear && year <= endYear) counts[year - startYear] += 1;
  }
  const lang = String(req.query.lang || "").toLowerCase().startsWith("en") ? "en" : "gr";
  return res.json({ ...base, mode: "count", labels, datasets: [{ key: "count", label: lang === "en" ? "Graduates" : "Απόφοιτοι", values: counts }] });
}
