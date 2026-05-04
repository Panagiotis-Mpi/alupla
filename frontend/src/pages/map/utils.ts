// Μικρές βοηθητικές συναρτήσεις για υπολογισμούς του χάρτη.
import type { MapCityPoint } from "../../lib/api";

export function normalizeKey(value: string): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapCityLatitude(city: MapCityPoint): number | null {
  const direct = Number(city.latitude);
  return Number.isFinite(direct) ? direct : null;
}

export function mapCityLongitude(city: MapCityPoint): number | null {
  const direct = Number(city.longitude);
  return Number.isFinite(direct) ? direct : null;
}

export function mapCityKey(city: MapCityPoint): string {
  if (Number(city.city_id) > 0) return `db-${city.city_id}`;
  return `name-${normalizeKey(city.city_name)}-${normalizeKey(city.country_name || city.periphery_name)}`;
}

export function createMapParams(filters: Record<string, unknown>) {
  const params: Record<string, string> = {};
  Object.entries(filters).forEach(([key, value]) => {
    const trimmed = typeof value === "string" ? value.trim() : value;
    if (trimmed === undefined || trimmed === null || trimmed === "") return;
    params[key] = String(trimmed);
  });
  return params;
}
