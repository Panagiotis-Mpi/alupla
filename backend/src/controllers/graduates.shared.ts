import { Graduate } from "../models/Graduate";
import { Region } from "../models/Region";
import { StudyProgram } from "../models/StudyProgram";
import { normalizeOriginLocation, type NormalizedOriginResult } from "../utils/resolvePeripheryRegionId";
import { normalizeRegionText } from "../utils/regionText";
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

type ProgramLookup = Pick<StudyProgram, "id" | "code" | "name_el" | "name_en">;
type RegionLookup = Pick<Region, "id" | "name" | "normalized_name" | "external_ref_id" | "type">;
type GraduateExportSource = Pick<Graduate, "ad_code" | "student_number" | "last_name" | "first_name" | "father_name" | "gender" | "entry_year" | "birth_date" | "degree_grade" | "graduation_date" | "oath_date" | "study_program_id" | "origin_country" | "origin_foreign_city" | "origin_country_region_id" | "origin_periphery_region_id" | "origin_region_id" | "origin_city_region_id" | "origin_municipality">;
type ManagedOriginTarget = Pick<Graduate, "origin_country" | "origin_foreign_city" | "origin_country_region_id" | "origin_periphery_region_id" | "origin_region_id" | "origin_city_region_id" | "origin_municipality">;

export type ReferenceMaps = {
  programsById: Map<number, ProgramLookup>;
  regionsById: Map<number, RegionLookup>;
};

function isInvalidNullableNumber(value: number | null) {
  return value !== null && Number.isNaN(value);
}

function getRegionNameById(regionsById: Map<number, RegionLookup>, value: unknown) {
  if (value == null || value === "") return "";
  return String(regionsById.get(Number(value))?.name ?? "").trim();
}

function getMunicipalityExportName(row: GraduateExportSource, regionsById: Map<number, RegionLookup>, isGreece: boolean) {
  const explicitMunicipality = String(row.origin_municipality ?? "").trim();
  const foreignCity = String(row.origin_foreign_city ?? "").trim();
  const cityName = getRegionNameById(regionsById, row.origin_city_region_id);
  const legacyRegionName = getRegionNameById(regionsById, row.origin_region_id);

  if (isGreece) {
    return explicitMunicipality || cityName || legacyRegionName || foreignCity;
  }

  return foreignCity || explicitMunicipality || cityName || legacyRegionName;
}

function compareDiplomaNumber(a: GraduateExportSource, b: GraduateExportSource) {
  const left = String(a.ad_code ?? "").trim();
  const right = String(b.ad_code ?? "").trim();
  const result = left.localeCompare(right, "el", { numeric: true, sensitivity: "base" });
  if (result !== 0) return result;
  return String(a.student_number ?? "").localeCompare(String(b.student_number ?? ""), "el", { numeric: true, sensitivity: "base" });
}

export function buildExportRows(
  rows: GraduateExportSource[],
  lang: ExportLang,
  programsById: Map<number, ProgramLookup>,
  regionsById: Map<number, RegionLookup>,
) {
  const labels = getColumnLabels(lang);

  return [...rows].sort(compareDiplomaNumber).map((row) => {
    const studyProgram = programsById.get(Number(row.study_program_id));
    const region = regionsById.get(Number(row.origin_periphery_region_id ?? row.origin_region_id));
    const country = regionsById.get(Number(row.origin_country_region_id));
    const rawCountryName = String(row.origin_country ?? country?.name ?? "");
    const isGreece = isGreeceCountryValue(rawCountryName) || (country ? isGreeceCountryValue(country.name) : false);
    const municipalityName = getMunicipalityExportName(row, regionsById, isGreece);

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
      [labels.study_program]: studyProgram ? String(lang === "en" ? studyProgram.name_en ?? studyProgram.name_el ?? studyProgram.code ?? studyProgram.id : studyProgram.name_el ?? studyProgram.name_en ?? studyProgram.code ?? studyProgram.id) : "",
      [labels.origin_country]: formatCountryValue(rawCountryName || String(country?.name ?? ""), lang),
      [labels.origin_region]: isGreece ? (region ? String(region.name ?? "") : "") : "",
      [labels.origin_municipality]: municipalityName,
    };
  });
}

export function getTemplateHeaders(lang: ExportLang) {
  return [getStrictTemplateHeaderRows(lang)];
}

export async function getReferenceMaps(): Promise<ReferenceMaps> {
  const [programs, regions] = await Promise.all([
    StudyProgram.findAll({ order: [["id", "ASC"]] }),
    Region.findAll({ order: [["id", "ASC"]] }),
  ]);

  return {
    programsById: new Map(programs.map((item) => [Number(item.id), item as ProgramLookup])),
    regionsById: new Map(regions.map((item) => [Number(item.id), item as RegionLookup])),
  };
}

function normalizeLookupValue(value: unknown) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
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

  const prefixId = raw.match(/^\s*(\d+)\s*(?:\(|-|$)/);
  if (prefixId) {
    const id = Number(prefixId[1]);
    if (programsById.has(id)) return id;
  }

  const normalized = normalizeLookupValue(raw);
  for (const [id, item] of programsById.entries()) {
    const candidates = [
      item.code,
      item.name_el,
      item.name_en,
      `${item.id} (${item.name_el ?? item.name_en ?? item.code ?? item.id})`,
      `${item.id} (${item.name_en ?? item.name_el ?? item.code ?? item.id})`,
    ].filter(Boolean).map(normalizeLookupValue);
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
  for (const [id, item] of regionsById.entries()) {
    const candidates = [item?.name, item?.normalized_name, item?.external_ref_id].filter(Boolean).map(normalizeLookupValue);
    if (candidates.includes(normalized)) return id;
  }

  return null;
}

function resolveCountryRegionByName(value: unknown, regionsById: Map<number, RegionLookup>) {
  const regionId = resolveRegionId(value, regionsById);
  if (!regionId) return null;
  const region = regionsById.get(Number(regionId));
  if (!region || String(region.type) !== "COUNTRY") return null;
  return Number(region.id);
}

export function reconcileOriginCountryRegionId(
  originCountry: unknown,
  originCountryRegionId: number | null | undefined,
  regionsById: Map<number, RegionLookup>,
) {
  const defaultGreeceId = getGreeceRegionId(regionsById);
  const selectedCountryId = toNullableNumber(originCountryRegionId);
  const selectedCountry = selectedCountryId != null ? regionsById.get(Number(selectedCountryId)) ?? null : null;
  const explicitCountryName = trimNullableText(originCountry);
  const matchedCountryId = resolveCountryRegionByName(explicitCountryName, regionsById);
  const matchedCountry = matchedCountryId != null ? regionsById.get(Number(matchedCountryId)) ?? null : null;
  const selectedIsCountry = !!selectedCountry && String(selectedCountry.type) === "COUNTRY";
  const selectedIsGreece = selectedIsCountry && isGreeceCountryValue(selectedCountry?.name);
  const matchedIsGreece = !!matchedCountry && isGreeceCountryValue(matchedCountry?.name);

  if (explicitCountryName) {
    if (matchedCountryId != null) {
      if (!selectedIsCountry) return matchedCountryId;
      if (selectedIsGreece !== matchedIsGreece) return matchedCountryId;
      if (!selectedIsGreece && normalizeRegionText(selectedCountry?.name) !== normalizeRegionText(matchedCountry?.name)) return matchedCountryId;
    }

    if (isGreeceCountryValue(explicitCountryName) && defaultGreeceId != null) {
      return defaultGreeceId;
    }
  }

  if (selectedIsCountry) return Number(selectedCountry!.id);
  return defaultGreeceId ?? null;
}

export function buildResolvedOriginSnapshot<T extends ManagedOriginTarget>(item: T, regionsById: Map<number, RegionLookup>) {
  const nextCountryRegionId = reconcileOriginCountryRegionId(item.origin_country, item.origin_country_region_id ?? null, regionsById);
  const nextCountry = nextCountryRegionId != null ? regionsById.get(Number(nextCountryRegionId)) ?? null : null;
  const nextCountryName = trimNullableText(item.origin_country) ?? trimNullableText(nextCountry?.name);
  const isAbroad = !!(nextCountryName && !isGreeceCountryValue(nextCountryName));

  return {
    ...item,
    origin_country: isAbroad ? nextCountryName : "Ελλάδα",
    origin_country_region_id: nextCountryRegionId,
    origin_foreign_city: isAbroad ? trimNullableText(item.origin_foreign_city) : null,
    origin_periphery_region_id: isAbroad ? null : item.origin_periphery_region_id ?? null,
    origin_region_id: isAbroad ? null : item.origin_region_id ?? null,
    origin_city_region_id: isAbroad ? null : item.origin_city_region_id ?? null,
    origin_municipality: isAbroad ? null : item.origin_municipality ?? null,
  } as T;
}

function hasOriginValue(originCountryRegionId: number | null | undefined, originRegionId: number | null | undefined, originMunicipality: string | null | undefined) {
  return originCountryRegionId != null || originRegionId != null || String(originMunicipality ?? "").trim().length > 0;
}

export function ensureManagedOrigin(
  normalizedOrigin: NormalizedOriginResult,
  originCountryRegionId: number | null | undefined,
  originRegionId: number | null | undefined,
  originMunicipality: string | null | undefined,
  regionsById?: Map<number, RegionLookup>,
) {
  if (!hasOriginValue(originCountryRegionId, originRegionId, originMunicipality)) return null;
  if (!normalizedOrigin.origin_country_region_id) return "origin_country_region_id is required";
  if (!normalizedOrigin.origin_municipality) return "origin_municipality is required";
  if (!regionsById) return null;

  const country = regionsById.get(Number(normalizedOrigin.origin_country_region_id));
  const isGreece = normalizeRegionText(country?.name) === normalizeRegionText("Ελλάδα");
  if (isGreece && !normalizedOrigin.origin_periphery_region_id) return "origin_periphery_region_id is required for Greece";
  if (!isGreece && normalizedOrigin.origin_periphery_region_id) return "origin_periphery_region_id must be empty for foreign countries";
  return null;
}

export async function buildCreateOriginPayload(body: Record<string, unknown>, regionsById: Map<number, RegionLookup>) {
  const defaultGreeceId = getGreeceRegionId(regionsById);
  const requestedCountryRegionId = toNullableNumber(body.origin_country_region_id) ?? defaultGreeceId;
  if (requestedCountryRegionId === null) return { error: "origin_country_region_id is required" };
  if (isInvalidNullableNumber(requestedCountryRegionId)) return { error: "origin_country_region_id must be a number" };

  const originCountryRegionId = reconcileOriginCountryRegionId(body.origin_country, requestedCountryRegionId, regionsById);
  if (originCountryRegionId === null) return { error: "origin_country_region_id is required" };

  const selectedCountryName = String(regionsById.get(Number(originCountryRegionId))?.name ?? "").trim();
  const originCountryName = trimNullableText(body.origin_country) ?? trimNullableText(selectedCountryName);
  const originForeignCity = trimNullableText(body.origin_foreign_city);
  const isAbroad = isAbroadOriginInput(originCountryName, originCountryRegionId, defaultGreeceId, originForeignCity);

  if (isAbroad) {
    const resolvedCountryName = originCountryName ?? trimNullableText(selectedCountryName);
    if (!resolvedCountryName) return { error: "origin_country is required" };
    if (!originForeignCity) return { error: "origin_foreign_city is required" };

    return {
      payload: {
        origin_country: resolvedCountryName,
        origin_foreign_city: originForeignCity,
        origin_country_region_id: originCountryRegionId,
        origin_periphery_region_id: null,
        origin_region_id: null,
        origin_city_region_id: null,
        origin_municipality: null,
      },
    };
  }

  const originPeripheryRegionId = toNullableNumber(body.origin_periphery_region_id ?? body.origin_region_id);
  if (isInvalidNullableNumber(originPeripheryRegionId)) return { error: "origin_periphery_region_id must be a number" };

  const originMunicipality = String(body.origin_municipality ?? "").trim();
  if (!originMunicipality) return { error: "origin_municipality is required" };

  const normalizedOrigin = await normalizeOriginLocation({
    origin_country_region_id: originCountryRegionId ?? null,
    origin_periphery_region_id: originPeripheryRegionId ?? null,
    origin_region_id: originPeripheryRegionId ?? null,
    origin_city_region_id: toNullableNumber(body.origin_city_region_id),
    origin_municipality: originMunicipality,
  });

  const managedOriginError = ensureManagedOrigin(normalizedOrigin, originCountryRegionId ?? null, originPeripheryRegionId ?? null, originMunicipality, regionsById);
  if (managedOriginError) return { error: managedOriginError };

  return {
    payload: {
      origin_country: "Ελλάδα",
      origin_foreign_city: null,
      origin_country_region_id: normalizedOrigin.origin_country_region_id,
      origin_periphery_region_id: normalizedOrigin.origin_periphery_region_id,
      origin_region_id: normalizedOrigin.origin_region_id,
      origin_city_region_id: normalizedOrigin.origin_city_region_id,
      origin_municipality: normalizedOrigin.origin_municipality,
    },
  };
}

export async function applyOriginPatch(item: ManagedOriginTarget, body: Record<string, unknown>, regionsById: Map<number, RegionLookup>) {
  const defaultGreeceId = getGreeceRegionId(regionsById);
  let originRegionTouched = false;
  let foreignOriginTouched = false;

  if (body.origin_country_region_id !== undefined) {
    const value = toNullableNumber(body.origin_country_region_id);
    if (isInvalidNullableNumber(value)) return "origin_country_region_id must be a number";
    item.origin_country_region_id = value;
    originRegionTouched = true;
  }

  if (body.origin_periphery_region_id !== undefined || body.origin_region_id !== undefined) {
    const value = toNullableNumber(body.origin_periphery_region_id ?? body.origin_region_id);
    if (isInvalidNullableNumber(value)) return "origin_periphery_region_id must be a number";
    item.origin_periphery_region_id = value;
    item.origin_region_id = value;
    originRegionTouched = true;
  }

  if (body.origin_city_region_id !== undefined) {
    const value = toNullableNumber(body.origin_city_region_id);
    if (isInvalidNullableNumber(value)) return "origin_city_region_id must be a number";
    item.origin_city_region_id = value;
    originRegionTouched = true;
  }

  if (body.origin_country !== undefined) {
    item.origin_country = trimNullableText(body.origin_country);
    foreignOriginTouched = true;
  }

  if (body.origin_foreign_city !== undefined) {
    item.origin_foreign_city = trimNullableText(body.origin_foreign_city);
    foreignOriginTouched = true;
  }

  if (body.origin_municipality !== undefined) {
    item.origin_municipality = body.origin_municipality === "" ? null : String(body.origin_municipality ?? "").trim();
    originRegionTouched = true;
  }

  item.origin_country_region_id = reconcileOriginCountryRegionId(item.origin_country, item.origin_country_region_id ?? null, regionsById);

  const selectedCountryName = String(regionsById.get(Number(item.origin_country_region_id))?.name ?? "").trim();
  const currentCountryName = trimNullableText(item.origin_country) ?? trimNullableText(selectedCountryName);
  const currentForeignCity = trimNullableText(item.origin_foreign_city);
  const isAbroad = isAbroadOriginInput(currentCountryName, item.origin_country_region_id ?? null, defaultGreeceId, currentForeignCity);

  if (isAbroad) {
    item.origin_country = currentCountryName ?? trimNullableText(selectedCountryName);
    if (!item.origin_country) return "origin_country is required";
    if (!currentForeignCity) return "origin_foreign_city is required";
    item.origin_foreign_city = currentForeignCity;
    item.origin_periphery_region_id = null;
    item.origin_region_id = null;
    item.origin_city_region_id = null;
    item.origin_municipality = null;
    return null;
  }

  if (!originRegionTouched && !foreignOriginTouched && body.origin_country_region_id === undefined && body.origin_country === undefined) {
    return null;
  }

  if (!item.origin_country_region_id && defaultGreeceId != null) {
    item.origin_country_region_id = defaultGreeceId;
  }

  const normalized = await normalizeOriginLocation({
    origin_country_region_id: item.origin_country_region_id ?? null,
    origin_periphery_region_id: item.origin_periphery_region_id ?? item.origin_region_id ?? null,
    origin_region_id: item.origin_periphery_region_id ?? item.origin_region_id ?? null,
    origin_city_region_id: item.origin_city_region_id ?? null,
    origin_municipality: item.origin_municipality ?? null,
  });

  const managedOriginError = ensureManagedOrigin(
    normalized,
    item.origin_country_region_id ?? null,
    item.origin_periphery_region_id ?? item.origin_region_id ?? null,
    item.origin_municipality ?? null,
    regionsById,
  );
  if (managedOriginError) return managedOriginError;

  item.origin_country = "Ελλάδα";
  item.origin_foreign_city = null;
  item.origin_country_region_id = normalized.origin_country_region_id;
  item.origin_periphery_region_id = normalized.origin_periphery_region_id;
  item.origin_region_id = normalized.origin_region_id;
  item.origin_city_region_id = normalized.origin_city_region_id;
  item.origin_municipality = normalized.origin_municipality;
  return null;
}
