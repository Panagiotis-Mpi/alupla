import {
  normalizeOriginLocation,
  type NormalizedOriginResult,
} from "./regionResolver.service";
import { normalizeRegionText } from "../utils/regionText";

export type GraduateOriginPayload = {
  origin_country: string | null;
  origin_foreign_city: string | null;
  origin_country_region_id: number | null;
  origin_periphery_region_id: number | null;
  origin_region_id: number | null;
  origin_city_region_id: number | null;
  origin_municipality: string | null;
};

type OriginRegion = {
  name?: unknown;
};

type GreekOriginInput = NormalizedOriginResult & {
  managedOriginRegionId?: number | null;
};

function validateManagedOrigin<T extends OriginRegion>(
  normalizedOrigin: NormalizedOriginResult,
  originCountryRegionId: number | null | undefined,
  originRegionId: number | null | undefined,
  originMunicipality: string | null | undefined,
  regionsById?: Map<number, T>,
) {
  if (
    originCountryRegionId == null &&
    originRegionId == null &&
    !String(originMunicipality ?? "").trim()
  ) return null;
  if (!normalizedOrigin.origin_country_region_id)
    return "origin_country_region_id is required";
  if (!normalizedOrigin.origin_municipality)
    return "origin_municipality is required";
  if (!regionsById) return null;

  const country = regionsById.get(
    Number(normalizedOrigin.origin_country_region_id),
  );
  const isGreece =
    normalizeRegionText(country?.name) === normalizeRegionText("Ελλάδα");
  if (isGreece && !normalizedOrigin.origin_periphery_region_id)
    return "origin_periphery_region_id is required for Greece";
  if (!isGreece && normalizedOrigin.origin_periphery_region_id)
    return "origin_periphery_region_id must be empty for foreign countries";
  return null;
}

export function buildForeignGraduateOriginPayload(
  countryName: string | null,
  countryRegionId: number | null,
  foreignCity: string | null,
) {
  if (!countryName) return { error: "origin_country is required" };
  if (!foreignCity) return { error: "origin_foreign_city is required" };

  return {
    payload: {
      origin_country: countryName,
      origin_foreign_city: foreignCity,
      origin_country_region_id: countryRegionId,
      origin_periphery_region_id: null,
      origin_region_id: null,
      origin_city_region_id: null,
      origin_municipality: null,
    } satisfies GraduateOriginPayload,
  };
}

export async function buildGreekGraduateOriginPayload<T extends OriginRegion>(
  input: GreekOriginInput,
  regionsById: Map<number, T>,
) {
  const normalizedOrigin = await normalizeOriginLocation(input);
  const error = validateManagedOrigin(
    normalizedOrigin,
    input.origin_country_region_id,
    input.managedOriginRegionId ?? input.origin_periphery_region_id,
    input.origin_municipality,
    regionsById,
  );
  if (error) return { error };

  return {
    payload: {
      origin_country: "Ελλάδα",
      origin_foreign_city: null,
      ...normalizedOrigin,
    } satisfies GraduateOriginPayload,
  };
}
