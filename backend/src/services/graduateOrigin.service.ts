import { normalizeOriginLocation, type ResolveOriginInput } from "./regionResolver.service";

export type GraduateOriginPayload = {
  origin_location_id: number;
};

export async function buildForeignGraduateOriginPayload(
  countryName: string | null,
  countryRegionId: number | null,
  foreignCity: string | null,
) {
  if (!countryName || !countryRegionId) return { error: "origin_country is required" };
  if (!foreignCity) return { error: "origin_foreign_city is required" };
  const normalized = await normalizeOriginLocation({
    origin_country: countryName,
    origin_country_region_id: countryRegionId,
    origin_foreign_city: foreignCity,
  });
  if (!normalized.origin_location_id) return { error: "origin location could not be resolved" };
  return { payload: { origin_location_id: normalized.origin_location_id } satisfies GraduateOriginPayload };
}

export async function buildGreekGraduateOriginPayload(input: ResolveOriginInput, _regionsById?: Map<number, unknown>) {
  const normalized = await normalizeOriginLocation(input);
  if (!normalized.origin_location_id) return { error: "origin location could not be resolved" };
  return { payload: { origin_location_id: normalized.origin_location_id } satisfies GraduateOriginPayload };
}
