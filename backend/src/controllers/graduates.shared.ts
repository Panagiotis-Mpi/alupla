import { StudyProgram } from "../models/StudyProgram";
import { normalizeRegionText } from "../utils/regionText";
import { loadRegionLookupIndex, type RegionLookupItem } from "../services/regionLookup.service";
import {
  buildForeignGraduateOriginPayload,
  buildGreekGraduateOriginPayload,
} from "../services/graduateOrigin.service";
import {
  formatCountryValue,
  formatDateDisplay,
  formatGenderValue,
  getColumnLabels,
  getGreeceRegionId,
  getStrictTemplateHeaderRows,
  isAbroadOriginInput,
  isGreeceCountryValue,
  toNullableNumber,
  trimNullableText,
  type ExportLang,
} from "./graduates.helpers";

export type ProgramLookup = Pick<StudyProgram, "id" | "name_el" | "name_en">;
export type RegionLookup = RegionLookupItem;
export type LocalizedNamesByRegionId = Map<number, { nameEl: string | null; nameEn: string | null }>;
export type ReferenceMaps = {
  programsById: Map<number, ProgramLookup>;
  regionsById: Map<number, RegionLookup>;
};

type GraduateExportSource = Record<string, any>;
type ManagedOriginTarget = { origin_location_id: number };

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function regionName(region: RegionLookup | undefined, lang: ExportLang, localized?: LocalizedNamesByRegionId) {
  if (!region) return "";
  const names = localized?.get(Number(region.id));
  return lang === "en"
    ? firstText(names?.nameEn, region.name_en, names?.nameEl, region.name_el, region.name)
    : firstText(names?.nameEl, region.name_el, region.name, names?.nameEn, region.name_en);
}

function compareDiplomaNumber(a: GraduateExportSource, b: GraduateExportSource) {
  const result = String(a.ad_code ?? "").localeCompare(String(b.ad_code ?? ""), "el", { numeric: true, sensitivity: "base" });
  return result || String(a.student_number ?? "").localeCompare(String(b.student_number ?? ""), "el", { numeric: true, sensitivity: "base" });
}

export function buildExportRows(
  rows: GraduateExportSource[],
  lang: ExportLang,
  programsById: Map<number, ProgramLookup>,
  regionsById: Map<number, RegionLookup>,
  localizedNamesById?: LocalizedNamesByRegionId,
) {
  const labels = getColumnLabels(lang);
  return [...rows].sort(compareDiplomaNumber).map((row) => {
    const program = programsById.get(Number(row.study_program_id));
    const country = regionsById.get(Number(row.origin_country_region_id));
    const periphery = regionsById.get(Number(row.origin_periphery_region_id));
    const nomos = regionsById.get(Number(row.origin_region_id));
    const city = regionsById.get(Number(row.origin_city_region_id));
    const countryName = formatCountryValue(regionName(country, lang, localizedNamesById) || row.origin_country, lang);
    const isGreece = isGreeceCountryValue(country?.name || row.origin_country);
    const cityName = isGreece
      ? regionName(city, lang, localizedNamesById) || String(row.origin_municipality ?? "")
      : regionName(city, lang, localizedNamesById) || String(row.origin_foreign_city ?? "");
    return {
      [labels.ad_code]: row.ad_code ?? "",
      [labels.student_number]: row.student_number ?? "",
      [labels.last_name]: row.last_name ?? "",
      [labels.first_name]: row.first_name ?? "",
      [labels.father_name]: row.father_name ?? "",
      [labels.gender]: formatGenderValue(row.gender, lang),
      [labels.entry_year]: row.entry_year ?? "",
      [labels.birth_date]: formatDateDisplay(row.birth_date),
      [labels.degree_grade]: row.degree_grade ?? "",
      [labels.graduation_date]: formatDateDisplay(row.graduation_date),
      [labels.oath_date]: formatDateDisplay(row.oath_date),
      [labels.study_program]: program
        ? lang === "en"
          ? firstText(program.name_en, program.name_el, program.id)
          : firstText(program.name_el, program.name_en, program.id)
        : "",
      [labels.origin_country]: countryName,
      [labels.origin_region]: isGreece ? regionName(periphery, lang, localizedNamesById) : "",
      [labels.origin_nomos]: isGreece ? regionName(nomos, lang, localizedNamesById) : "",
      [labels.origin_municipality]: cityName,
    };
  });
}

export function getTemplateHeaders(lang: ExportLang) {
  return [getStrictTemplateHeaderRows(lang)];
}

export async function getReferenceMaps(): Promise<ReferenceMaps> {
  const [programs, regionIndex] = await Promise.all([
    StudyProgram.findAll({ order: [["id", "ASC"]] }),
    loadRegionLookupIndex(),
  ]);
  return {
    programsById: new Map(programs.map((item) => [Number(item.id), item as ProgramLookup])),
    regionsById: regionIndex.byId,
  };
}

function normalizeLookupValue(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveStudyProgramId(value: unknown, programsById: Map<number, ProgramLookup>) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const directId = Number(raw);
  if (Number.isFinite(directId) && programsById.has(directId)) return directId;
  const normalized = normalizeLookupValue(raw);
  for (const [id, item] of programsById) {
    const candidates = [item.name_el, item.name_en, `${item.id} (${item.name_el ?? item.name_en ?? item.id})`, `${item.id} (${item.name_en ?? item.name_el ?? item.id})`]
      .filter(Boolean)
      .map(normalizeLookupValue);
    if (candidates.includes(normalized)) return id;
  }
  return null;
}

export function resolveRegionId(value: unknown, regionsById: Map<number, RegionLookup>) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const directId = Number(raw);
  if (Number.isFinite(directId) && regionsById.has(directId)) return directId;
  const normalized = normalizeLookupValue(raw);
  for (const [id, item] of regionsById) {
    if ([item.name_el, item.name_en, item.normalized_name].filter(Boolean).map(normalizeLookupValue).includes(normalized)) return id;
  }
  return null;
}

export function reconcileOriginCountryRegionId(
  originCountry: unknown,
  originCountryRegionId: number | null | undefined,
  regionsById: Map<number, RegionLookup>,
) {
  const selectedId = toNullableNumber(originCountryRegionId);
  const selected = selectedId != null ? regionsById.get(selectedId) : null;
  if (selected?.type === "COUNTRY") return Number(selected.id);
  const normalized = normalizeRegionText(originCountry);
  if (normalized) {
    const matched = [...regionsById.values()].find((item) => item.type === "COUNTRY" && [item.name, item.name_el, item.name_en].some((name) => normalizeRegionText(name) === normalized));
    if (matched) return Number(matched.id);
  }
  return getGreeceRegionId(regionsById);
}

function ancestor(regionsById: Map<number, RegionLookup>, locationId: number | null | undefined, type: string) {
  let current = locationId ? regionsById.get(Number(locationId)) ?? null : null;
  for (let step = 0; current && step < 8; step += 1) {
    if (String(current.type) === type) return current;
    current = current.parent_id ? regionsById.get(Number(current.parent_id)) ?? null : null;
  }
  return null;
}

export function buildResolvedOriginSnapshot<T extends Record<string, any>>(item: T, regionsById: Map<number, RegionLookup>) {
  const locationId = Number(item.origin_location_id);
  if (!Number.isFinite(locationId)) return item;
  const location = regionsById.get(locationId);
  const country = ancestor(regionsById, locationId, "COUNTRY");
  if (!location || !country) return item;
  const abroad = !isGreeceCountryValue(country.name);
  const city = ancestor(regionsById, locationId, "CITY");
  const nomos = ancestor(regionsById, locationId, "NOMOS");
  const periphery = ancestor(regionsById, locationId, "PERIPHERY");
  return {
    ...item,
    origin_country: country.name,
    origin_foreign_city: abroad ? city?.name ?? location.name : null,
    origin_country_region_id: country.id,
    origin_periphery_region_id: abroad ? null : periphery?.id ?? null,
    origin_region_id: abroad ? null : nomos?.id ?? null,
    origin_city_region_id: abroad ? null : city?.id ?? null,
    origin_municipality: abroad ? null : city?.name ?? null,
  } as T;
}

export async function buildCreateOriginPayload(body: Record<string, unknown>, regionsById: Map<number, RegionLookup>) {
  const defaultGreeceId = getGreeceRegionId(regionsById);
  const countryId = reconcileOriginCountryRegionId(body.origin_country, toNullableNumber(body.origin_country_region_id) ?? defaultGreeceId, regionsById);
  if (!countryId) return { error: "origin_country_region_id is required" };
  const country = regionsById.get(countryId);
  if (!country || country.type !== "COUNTRY") return { error: "origin_country_region_id is invalid" };
  const foreignCity = trimNullableText(body.origin_foreign_city);
  const abroad = isAbroadOriginInput(country.name, countryId, defaultGreeceId, foreignCity);
  if (abroad) return buildForeignGraduateOriginPayload(country.name, countryId, foreignCity);
  const cityId = toNullableNumber(body.origin_city_region_id);
  const peripheryId = toNullableNumber(body.origin_periphery_region_id);
  const nomosId = toNullableNumber(body.origin_region_id);
  const municipality = trimNullableText(body.origin_municipality);
  if (!cityId && !municipality) return { error: "origin_municipality is required" };
  return buildGreekGraduateOriginPayload({
    origin_country_region_id: countryId,
    origin_periphery_region_id: peripheryId,
    origin_region_id: nomosId,
    origin_city_region_id: cityId,
    origin_municipality: municipality,
  });
}

export async function applyOriginPatch(item: ManagedOriginTarget, body: Record<string, unknown>, regionsById: Map<number, RegionLookup>) {
  const keys = ["origin_location_id", "origin_country", "origin_foreign_city", "origin_country_region_id", "origin_periphery_region_id", "origin_region_id", "origin_city_region_id", "origin_municipality"];
  if (!keys.some((key) => body[key] !== undefined)) return null;
  if (body.origin_location_id !== undefined) {
    const direct = toNullableNumber(body.origin_location_id);
    if (direct && regionsById.has(direct)) {
      item.origin_location_id = direct;
      return null;
    }
  }
  const current = buildResolvedOriginSnapshot({ origin_location_id: item.origin_location_id }, regionsById);
  const result = await buildCreateOriginPayload({ ...current, ...body }, regionsById);
  if (result.error) return result.error;
  item.origin_location_id = result.payload!.origin_location_id;
  return null;
}
