// Χειρίζεται τα δεδομένα του χάρτη: συγκεντρώσεις, φίλτρα, πόλεις και λεπτομέρειες.
import type { Request, Response } from "express";
import { Graduate } from "../models/Graduate";
import { StudyProgram } from "../models/StudyProgram";
import { col, fn, literal } from "sequelize";
import { ensureLocalizedRegionNames, resolveMapLocation } from "../services/mapLocation.service";
import { buildMapWhere, isAbroadMapGraduate, isGreeceOriginValue, isGreekMapGraduate, loadRegions, normalizeKey, pickTopName, toInt } from "./map.helpers";
import { getGraduationYears } from "../services/analyticsAggregations.service";
import { applyAggregatedMetrics, applyGraduateMetrics, createMetricsBucket, serializeMapMetrics, type AggregatedMapMetricsRow } from "./map.metrics";

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
type LocalizedNames = { nameEl: string | null; nameEn: string | null };
type MapBuildOptions = { includeMapItems?: boolean; includeCityItems?: boolean };


type AggregatedGraduateRow = AggregatedMapMetricsRow & {
  origin_country: string | null;
  origin_foreign_city: string | null;
  origin_country_region_id: number | null;
  origin_periphery_region_id: number | null;
  origin_region_id: number | null;
  origin_city_region_id: number | null;
  origin_municipality: string | null;
};

const MAP_LOCATION_GROUP_FIELDS = [
  "origin_country",
  "origin_foreign_city",
  "origin_country_region_id",
  "origin_periphery_region_id",
  "origin_region_id",
  "origin_city_region_id",
  "origin_municipality",
  "gender",
  "study_program_id",
] as const;

const mapAggregateAttributes = [
  ...MAP_LOCATION_GROUP_FIELDS,
  [fn("COUNT", col("id")), "graduate_count"],
  [literal("SUM(CASE WHEN degree_grade IS NOT NULL AND degree_grade >= 0 THEN degree_grade ELSE 0 END)"), "grade_sum"],
  [literal("COUNT(CASE WHEN degree_grade IS NOT NULL AND degree_grade >= 0 THEN 1 END)"), "grade_count"],
  [literal("SUM(CASE WHEN birth_date IS NOT NULL AND graduation_date IS NOT NULL AND graduation_date >= birth_date THEN EXTRACT(YEAR FROM AGE(graduation_date, birth_date)) ELSE 0 END)"), "age_sum"],
  [literal("COUNT(CASE WHEN birth_date IS NOT NULL AND graduation_date IS NOT NULL AND graduation_date >= birth_date THEN 1 END)"), "age_count"],
  [literal("MIN(CASE WHEN birth_date IS NOT NULL AND graduation_date IS NOT NULL AND graduation_date >= birth_date THEN EXTRACT(YEAR FROM AGE(graduation_date, birth_date)) ELSE NULL END)"), "min_age"],
  [literal("MAX(CASE WHEN birth_date IS NOT NULL AND graduation_date IS NOT NULL AND graduation_date >= birth_date THEN EXTRACT(YEAR FROM AGE(graduation_date, birth_date)) ELSE NULL END)"), "max_age"],
  [literal("SUM(CASE WHEN entry_year IS NOT NULL AND graduation_date IS NOT NULL AND entry_year > 1900 AND CAST(EXTRACT(YEAR FROM graduation_date) AS INTEGER) >= entry_year THEN CAST(EXTRACT(YEAR FROM graduation_date) AS INTEGER) - entry_year ELSE 0 END)"), "graduation_duration_sum"],
  [literal("COUNT(CASE WHEN entry_year IS NOT NULL AND graduation_date IS NOT NULL AND entry_year > 1900 AND CAST(EXTRACT(YEAR FROM graduation_date) AS INTEGER) >= entry_year THEN 1 END)"), "graduation_duration_count"],
] as const;

function graduateLocationKey(graduate: any, scope: MapScope) {
  return [
    scope,
    graduate.origin_country || "",
    graduate.origin_foreign_city || "",
    Number(graduate.origin_country_region_id) || 0,
    Number(graduate.origin_periphery_region_id) || 0,
    Number(graduate.origin_region_id) || 0,
    Number(graduate.origin_city_region_id) || 0,
    graduate.origin_municipality || "",
  ].join("|");
}

function mapLocationInput(graduate: any, scope: MapScope) {
  return {
    origin_country: graduate.origin_country || null,
    origin_country_region_id: Number(graduate.origin_country_region_id) || null,
    origin_periphery_region_id: Number(graduate.origin_periphery_region_id) || Number(graduate.origin_region_id) || null,
    origin_region_id: Number(graduate.origin_periphery_region_id) || Number(graduate.origin_region_id) || null,
    origin_city_region_id: Number(graduate.origin_city_region_id) || null,
    origin_municipality: scope === "abroad" ? (graduate.origin_foreign_city || graduate.origin_municipality || null) : (graduate.origin_municipality || null),
  };
}

async function resolveGraduateLocation(graduate: any, scope: MapScope, cache: Map<string, Promise<any>>) {
  const key = graduateLocationKey(graduate, scope);
  let pending = cache.get(key);
  if (!pending) {
    pending = resolveMapLocation(mapLocationInput(graduate, scope));
    cache.set(key, pending);
  }
  return pending;
}

async function getLocalizedNames(regionId: number | null | undefined, cache: Map<number, Promise<LocalizedNames>>) {
  const id = Number(regionId) || 0;
  if (!id) return { nameEl: null, nameEn: null };
  let pending = cache.get(id);
  if (!pending) {
    pending = ensureLocalizedRegionNames(id) as Promise<LocalizedNames>;
    cache.set(id, pending);
  }
  return pending;
}

export async function resolveMapCityPresentation(input: any, scope: MapScope) {
  const rawName = String(scope === "abroad" ? input?.origin_foreign_city || input?.origin_municipality || "" : input?.origin_municipality || "").trim();
  const resolvedLocation = await resolveMapLocation(mapLocationInput(input, scope));
  const fallbackName = String(resolvedLocation?.cityName || rawName || "").trim();
  const cityGroup = scope === "greece" ? greekCityGroupForLocation(resolvedLocation, rawName) : null;
  const cityId = cityGroup ? null : Number(resolvedLocation?.cityId || input?.origin_city_region_id || 0) || null;
  const names = cityGroup
    ? { nameEl: cityGroup.nameEl, nameEn: cityGroup.nameEn }
    : cityId
      ? await ensureLocalizedRegionNames(cityId)
      : { nameEl: null, nameEn: null };
  const nameEl = String(names.nameEl || fallbackName).trim() || fallbackName;
  const nameEn = String(names.nameEn || nameEl || fallbackName).trim() || nameEl || fallbackName;
  const countryName = String(resolvedLocation?.countryName || input?.origin_country || "").trim();
  const key = scope === "abroad"
    ? `${normalizeKey(countryName)}::${cityId || normalizeKey(fallbackName)}`
    : cityGroup
      ? `group:${cityGroup.key}`
      : `${cityId || normalizeKey(fallbackName)}::${resolvedLocation?.peripheryId || input?.origin_periphery_region_id || "none"}`;
  return { key, id: cityId, name: nameEl, name_el: nameEl, name_en: nameEn };
}

export async function resolveMapCountryPresentation(input: any) {
  const rawName = String(input?.origin_country || "").trim();
  if (!rawName || rawName === "Άγνωστη χώρα") {
    return { key: "country:unknown", id: null, name: "Άγνωστη χώρα", name_el: "Άγνωστη χώρα", name_en: "Unknown country" };
  }
  const explicitCountryId = Number(input?.origin_country_region_id || 0) || null;
  if (isGreeceOriginValue(rawName)) {
    const names = explicitCountryId ? await ensureLocalizedRegionNames(explicitCountryId) : { nameEl: null, nameEn: null };
    const nameEl = String(names.nameEl || "Ελλάδα").trim() || "Ελλάδα";
    const nameEn = String(names.nameEn || "Greece").trim() || "Greece";
    return { key: explicitCountryId ? `country:${explicitCountryId}` : "country:greece", id: explicitCountryId, name: nameEl, name_el: nameEl, name_en: nameEn };
  }
  const resolvedLocation = await resolveMapLocation(mapLocationInput(input, "abroad"));
  const countryId = Number(resolvedLocation?.countryId || explicitCountryId || 0) || null;
  const names = countryId ? await ensureLocalizedRegionNames(countryId) : { nameEl: null, nameEn: null };
  const fallbackName = String(resolvedLocation?.countryName || rawName).trim() || rawName;
  const nameEl = String(names.nameEl || fallbackName).trim() || fallbackName;
  const nameEn = String(names.nameEn || nameEl || fallbackName).trim() || nameEl || fallbackName;
  return { key: countryId ? `country:${countryId}` : `country:${normalizeKey(fallbackName)}`, id: countryId, name: nameEl, name_el: nameEl, name_en: nameEn };
}

async function loadAggregatedMapRows(where: Record<string | symbol, unknown>) {
  const rows = await Graduate.findAll({
    where,
    attributes: mapAggregateAttributes as any,
    group: [...MAP_LOCATION_GROUP_FIELDS],
    raw: true,
  });
  return rows as unknown as AggregatedGraduateRow[];
}

function finishMapBuckets(groups: Map<unknown, any>, labels: { studyProgramLabels: Map<number, string> }) {
  const items = Array.from(groups.values())
    .map((bucket) => bucketToMapItem(bucket, labels, { idKey: "periphery_id", nameKey: "periphery_name", latitudeKey: "latitude", longitudeKey: "longitude" }))
    .sort((left, right) => right.count - left.count);

  return { items, total: items.reduce((sum, item) => sum + (Number(item.count) || 0), 0) };
}

function finishCityBuckets(groups: Map<string, any>) {
  return Array.from(groups.values())
    .filter((item) => item.count > 0)
    .map((item) => ({
      city_id: item.city_id,
      city_name: item.city_name,
      city_name_el: item.city_name_el || item.city_name,
      city_name_en: item.city_name_en || item.city_name,
      map_group_key: item.map_group_key || null,
      periphery_id: item.periphery_id,
      periphery_name: item.periphery_name,
      periphery_name_el: item.periphery_name_el || item.periphery_name,
      periphery_name_en: item.periphery_name_en || item.periphery_name,
      country_region_id: item.country_region_id,
      country_name: item.country_name,
      country_name_el: item.country_name_el || item.country_name,
      country_name_en: item.country_name_en || item.country_name,
      latitude: item.latitude,
      longitude: item.longitude,
      ...serializeMapMetrics(item),
    }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      if (left.periphery_name !== right.periphery_name) return String(left.periphery_name || "").localeCompare(String(right.periphery_name || ""), "el");
      return String(left.city_name || "").localeCompare(String(right.city_name || ""), "el");
    });
}

// Διαβάζει αν ο χάρτης δείχνει Ελλάδα, εξωτερικό ή όλα.
function mapScopeFromRequest(req: Request) {
  return String(req.query.scope || "greece").trim().toLowerCase() === "abroad" ? "abroad" : "greece";
}

// Φορτώνει πρόγραμμα σπουδών για labels στα στοιχεία χάρτη.
async function loadProgramMetadata() {
  const studyPrograms = await StudyProgram.findAll({ attributes: ["id", "code", "name_el", "name_en"] });

  const studyProgramLabels = new Map<number, string>();

  for (const item of studyPrograms as any[]) {
    studyProgramLabels.set(Number(item.id), String(item.name_el || item.name_en || item.code || ""));
  }

  return { studyProgramLabels };
}

// Μετατρέπει bucket μετρήσεων σε item που καταλαβαίνει το frontend map.
function bucketToMapItem(bucket: any, labels: { studyProgramLabels: Map<number, string> }, nameKeys: { idKey: string; nameKey: string; latitudeKey?: string; longitudeKey?: string }) {
  const baseName = String(nameKeys.nameKey || "");
  return {
    [nameKeys.idKey]: bucket[nameKeys.idKey],
    [nameKeys.nameKey]: bucket[nameKeys.nameKey],
    [`${baseName}_el`]: bucket[`${baseName}_el`] ?? bucket[nameKeys.nameKey],
    [`${baseName}_en`]: bucket[`${baseName}_en`] ?? bucket[nameKeys.nameKey],
    ...(nameKeys.latitudeKey ? { [nameKeys.latitudeKey]: bucket[nameKeys.latitudeKey] ?? null } : {}),
    ...(nameKeys.longitudeKey ? { [nameKeys.longitudeKey]: bucket[nameKeys.longitudeKey] ?? null } : {}),
    ...serializeMapMetrics(bucket),
    dominant_study_program: pickTopName(bucket.programCounts, labels.studyProgramLabels),
  };
}

// Επιστρέφει συγκεντρωτικά δεδομένα για τα bubbles/heatmap του χάρτη.
async function buildMapData(req: Request, options: MapBuildOptions = {}) {
  const scope = mapScopeFromRequest(req) as MapScope;
  const { where } = buildMapWhere(req);
  const includeMapItems = options.includeMapItems !== false;
  const includeCityItems = options.includeCityItems === true;
  const { regions, findPeriphery, findRegion } = await loadRegions();
  const labels = includeMapItems ? await loadProgramMetadata() : { studyProgramLabels: new Map<number, string>() };
  const locationCache = new Map<string, Promise<any>>();
  const localizedCache = new Map<number, Promise<LocalizedNames>>();

  const grads = await loadAggregatedMapRows(where as Record<string | symbol, unknown>);

  const mapGroups = new Map<unknown, any>();
  const cityGroups = new Map<string, any>();

  if (includeMapItems && scope === "greece") {
    for (const region of regions as any[]) {
      if (String(region.type) !== "PERIPHERY") continue;
      const id = Number(region.id);
      mapGroups.set(id, createMetricsBucket({
        periphery_id: id,
        periphery_name: String(region.name),
        periphery_name_el: String((region as any).name_el || region.name),
        periphery_name_en: String((region as any).name_en || region.name),
        latitude: region.latitude ?? null,
        longitude: region.longitude ?? null,
      }));
    }
  }

  for (const graduate of grads) {
    if (scope === "abroad" && !isAbroadMapGraduate(graduate)) continue;
    if (scope === "greece" && !isGreekMapGraduate(graduate)) continue;

    const resolvedLocation = await resolveGraduateLocation(graduate, scope, locationCache);

    if (includeMapItems) {
      if (scope === "abroad") {
        const countryId = Number(resolvedLocation?.countryId || graduate.origin_country_region_id || 0);
        const country = countryId ? findRegion(countryId) : null;
        if (countryId && country && String((country as any).type) === "COUNTRY") {
          const countryNames = await getLocalizedNames(countryId, localizedCache);
          const bucket = mapGroups.get(countryId) || createMetricsBucket({
            periphery_id: countryId,
            periphery_name: String((country as any).name || resolvedLocation?.countryName || graduate.origin_country || ""),
            periphery_name_el: countryNames.nameEl || String((country as any).name || resolvedLocation?.countryName || graduate.origin_country || ""),
            periphery_name_en: countryNames.nameEn || String((country as any).name || resolvedLocation?.countryName || graduate.origin_country || ""),
            latitude: resolvedLocation?.latitude ?? (country as any).latitude ?? null,
            longitude: resolvedLocation?.longitude ?? (country as any).longitude ?? null,
          });
          applyAggregatedMetrics(bucket, graduate);
          mapGroups.set(countryId, bucket);
        }
      } else {
        const periphery = resolvedLocation?.peripheryId ? findPeriphery(resolvedLocation.peripheryId) : null;
        if (periphery) {
          const peripheryNames = await getLocalizedNames(Number(periphery.id), localizedCache);
          const bucket = mapGroups.get(Number(periphery.id)) || createMetricsBucket({
            periphery_id: Number(periphery.id),
            periphery_name: String(periphery.name),
            periphery_name_el: peripheryNames.nameEl || String(periphery.name),
            periphery_name_en: peripheryNames.nameEn || String(periphery.name),
            latitude: (periphery as any).latitude ?? null,
            longitude: (periphery as any).longitude ?? null,
          });
          applyAggregatedMetrics(bucket, graduate);
          mapGroups.set(Number(periphery.id), bucket);
        }
      }
    }

    if (!includeCityItems) continue;
    if (!resolvedLocation?.cityName || resolvedLocation.latitude === null || resolvedLocation.longitude === null) continue;

    const country = resolvedLocation.countryId ? findRegion(Number(resolvedLocation.countryId)) : (Number(graduate.origin_country_region_id) ? findRegion(Number(graduate.origin_country_region_id)) : null);
    const cityGroup = scope === "greece" ? greekCityGroupForLocation(resolvedLocation, graduate.origin_municipality) : null;
    const key = scope === "abroad"
      ? `${normalizeKey(String(country?.name || resolvedLocation.countryName || graduate.origin_country || ""))}::${normalizeKey(resolvedLocation.cityName)}`
      : cityGroup
        ? `group:${cityGroup.key}`
        : `${resolvedLocation.cityId || normalizeKey(resolvedLocation.cityName)}::${resolvedLocation.peripheryId || "none"}`;

    const cityNames = cityGroup ? { nameEl: cityGroup.nameEl, nameEn: cityGroup.nameEn } : await getLocalizedNames(resolvedLocation.cityId, localizedCache);
    const countryNames = await getLocalizedNames(resolvedLocation.countryId || Number(graduate.origin_country_region_id) || null, localizedCache);
    const peripheryNames = scope === "greece" ? await getLocalizedNames(resolvedLocation.peripheryId, localizedCache) : countryNames;
    const bucket = cityGroups.get(key) || createMetricsBucket({
      city_id: cityGroup ? 0 : resolvedLocation.cityId || 0,
      city_name: cityGroup ? cityGroup.nameEl : resolvedLocation.cityName,
      city_name_el: cityNames.nameEl || resolvedLocation.cityName,
      city_name_en: cityNames.nameEn || resolvedLocation.cityName,
      map_group_key: cityGroup?.key || null,
      periphery_id: scope === "greece" ? resolvedLocation.peripheryId : (resolvedLocation.countryId || Number(graduate.origin_country_region_id) || null),
      periphery_name: scope === "greece"
        ? (resolvedLocation.peripheryName || "")
        : String(country?.name || resolvedLocation.countryName || graduate.origin_country || ""),
      periphery_name_el: scope === "greece" ? (peripheryNames.nameEl || resolvedLocation.peripheryName || "") : (countryNames.nameEl || String(country?.name || resolvedLocation.countryName || graduate.origin_country || "")),
      periphery_name_en: scope === "greece" ? (peripheryNames.nameEn || resolvedLocation.peripheryName || "") : (countryNames.nameEn || String(country?.name || resolvedLocation.countryName || graduate.origin_country || "")),
      country_region_id: resolvedLocation.countryId || Number(graduate.origin_country_region_id) || null,
      country_name: String(country?.name || resolvedLocation.countryName || graduate.origin_country || ""),
      country_name_el: countryNames.nameEl || String(country?.name || resolvedLocation.countryName || graduate.origin_country || ""),
      country_name_en: countryNames.nameEn || String(country?.name || resolvedLocation.countryName || graduate.origin_country || ""),
      latitude: cityGroup ? cityGroup.latitude : resolvedLocation.latitude,
      longitude: cityGroup ? cityGroup.longitude : resolvedLocation.longitude,
    });

    applyAggregatedMetrics(bucket, graduate);
    cityGroups.set(key, bucket);
  }

  return {
    map: includeMapItems ? finishMapBuckets(mapGroups, labels) : { items: [], total: 0 },
    cities: { items: includeCityItems ? finishCityBuckets(cityGroups) : [] },
  };
}

export async function getGraduatesMap(req: Request, res: Response) {
  const data = await buildMapData(req, { includeMapItems: true, includeCityItems: false });
  return res.json({ ok: true, items: data.map.items, total: data.map.total });
}

export async function getMapSummary(req: Request, res: Response) {
  const data = await buildMapData(req, { includeMapItems: true, includeCityItems: true });
  return res.json({ ok: true, items: data.map.items, total: data.map.total, cities: data.cities.items });
}

// Επιστρέφει λίστα πόλεων που ταιριάζουν με τα φίλτρα χάρτη.
export async function getMapCities(req: Request, res: Response) {
  const data = await buildMapData(req, { includeMapItems: false, includeCityItems: true });
  return res.json({ ok: true, items: data.cities.items });
}

// Βρίσκει ελάχιστο/μέγιστο έτος αποφοίτησης για τον slider χάρτη.
export async function getMapYearRange(_req: Request, res: Response) {
  try {
    const years = await getGraduationYears();
    return res.json({ ok: true, years, min_year: years[0] ?? null, max_year: years.length ? years[years.length - 1] : null });
  } catch (error) {
    console.error("[map] failed to load year range:", (error as Error)?.message ?? error);
    return res.status(500).json({ ok: false, message: "Failed to load map years" });
  }
}

// Επιστρέφει αναλυτικά στατιστικά για μία πόλη του χάρτη.
export async function getMapCityDetail(req: Request, res: Response) {
  const scope = mapScopeFromRequest(req) as MapScope;
  const cityId = toInt(req.query.city_id);
  const cityNameQuery = String(req.query.city_name || "").trim();
  const cityGroup = scope === "greece"
    ? greekCityGroupForKey(req.query.map_group_key) || greekCityGroupForName(cityNameQuery)
    : null;
  const countryRegionId = toInt(req.query.country_region_id) || toInt(req.query.periphery_id);
  const mode = String(req.query.mode || "count");
  const { where, currentYear } = buildMapWhere(req);
  const { findRegion } = await loadRegions();
  const country = scope === "abroad" && countryRegionId ? findRegion(countryRegionId) : null;
  const city = scope === "greece" && !cityGroup && cityId ? findRegion(cityId) : null;

  if (scope === "greece" && !cityGroup && (!cityId || !city || String(city.type) !== "CITY")) {
    return res.status(404).json({ ok: false, error: "city not found" });
  }

  const grads = await Graduate.findAll({
    where,
    attributes: [
      "origin_country",
      "origin_foreign_city",
      "origin_country_region_id",
      "origin_periphery_region_id",
      "origin_region_id",
      "origin_city_region_id",
      "origin_municipality",
      "gender",
      "birth_date",
      "degree_grade",
      "entry_year",
      "graduation_date",
      "study_program_id",
    ],
  });

  const hasAbroadCityFilter = scope === "abroad" && Boolean(cityId || cityNameQuery);
  const matching: any[] = [];
  const locationCache = new Map<string, Promise<any>>();
  let cityLabel = cityGroup?.nameEl || String(city?.name || cityNameQuery || "");
  if (scope === "abroad" && !hasAbroadCityFilter && country) {
    cityLabel = String(country.name || cityNameQuery || "");
  }

  for (const graduate of grads as any[]) {
    if (scope === "abroad" && !isAbroadMapGraduate(graduate)) continue;
    if (scope === "greece" && !isGreekMapGraduate(graduate)) continue;
    const resolvedLocation = await resolveGraduateLocation(graduate, scope, locationCache);

    if (scope === "abroad") {
      const sameCountry = countryRegionId
        ? Number(resolvedLocation?.countryId || graduate.origin_country_region_id || 0) === countryRegionId
        : true;
      if (!sameCountry) continue;
      if (hasAbroadCityFilter) {
        const sameCity = cityId
          ? Number(resolvedLocation?.cityId || 0) === cityId
          : normalizeKey(String(resolvedLocation?.cityName || "")) === normalizeKey(cityNameQuery);
        if (!sameCity) continue;
        cityLabel = String(resolvedLocation?.cityName || cityNameQuery || "");
      } else if (!cityLabel) {
        cityLabel = String(resolvedLocation?.countryName || graduate.origin_country || cityNameQuery || "");
      }
    } else if (cityGroup) {
      if (greekCityGroupForLocation(resolvedLocation, graduate.origin_municipality)?.key !== cityGroup.key) continue;
    } else if (Number(resolvedLocation?.cityId || 0) !== cityId) {
      continue;
    }

    matching.push(graduate);
  }

  const metricBucket = createMetricsBucket({});
  for (const graduate of matching) applyGraduateMetrics(metricBucket, graduate);
  const detailMetrics = serializeMapMetrics(metricBucket);
  const detailCityNames = cityGroup
    ? { nameEl: cityGroup.nameEl, nameEn: cityGroup.nameEn }
    : cityId
      ? await ensureLocalizedRegionNames(cityId)
      : { nameEl: null, nameEn: null };
  const detailCountryNames = countryRegionId
    ? await ensureLocalizedRegionNames(countryRegionId)
    : { nameEl: null, nameEn: null };
  const detailNameEl = detailCityNames.nameEl || detailCountryNames.nameEl || cityLabel;
  const detailNameEn = detailCityNames.nameEn || detailCountryNames.nameEn || cityLabel;
  const detailCountryNameEl = detailCountryNames.nameEl || null;
  const detailCountryNameEn = detailCountryNames.nameEn || null;
  const baseResponse = {
    ok: true,
    city_id: cityGroup ? 0 : cityId || 0,
    city_name: cityLabel,
    city_name_el: detailNameEl,
    city_name_en: detailNameEn,
    map_group_key: cityGroup?.key || null,
    country_name: detailCountryNameEl || detailCountryNameEn || null,
    country_name_el: detailCountryNameEl,
    country_name_en: detailCountryNameEn,
    total: detailMetrics.count,
    avg_age: detailMetrics.avg_age,
    avg_grade: detailMetrics.avg_grade,
    avg_graduation_years: detailMetrics.avg_graduation_years,
    male_count: detailMetrics.male_count,
    female_count: detailMetrics.female_count,
    male_pct: detailMetrics.male_pct,
    female_pct: detailMetrics.female_pct,
  };

  if (mode === "dominant_gender") {
    return res.json({ ...baseResponse, mode });
  }

  const lang = String(req.query.lang ?? "").toLowerCase().startsWith("en") ? "en" : "gr";
  const startYear = 2010;
  const endYear = Math.max(currentYear, startYear);
  const labels = Array.from({ length: endYear - startYear + 1 }, (_, index) => String(startYear + index));
  const yearIndex = new Map(labels.map((label, index) => [Number(label), index]));
  const counts = labels.map(() => 0);

  for (const graduate of matching) {
    const year = Number(String(graduate.graduation_date || "").slice(0, 4));
    const index = yearIndex.get(year);
    if (index !== undefined) counts[index] += 1;
  }

  return res.json({
    ...baseResponse,
    mode: "count",
    labels,
    datasets: [{ key: "count", label: lang === "en" ? "Graduates" : "Απόφοιτοι", values: counts }],
  });
}
