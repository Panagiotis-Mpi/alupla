import L from "leaflet";
import type { MapCityPoint } from "../../lib/api";

export function cityLabelIcon(label: string) {
  const safeLabel = String(label || "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char] || char));
  const width = Math.max(64, Math.min(220, safeLabel.length * 8 + 24));
  const height = 28;

  return L.divIcon({
    className: "alupla-city-label-icon",
    html: `<span class="alupla-city-point"><span class="alupla-city-label-text">${safeLabel}</span><span class="alupla-city-label-dot"></span></span>`,
    iconSize: [width, height],
    iconAnchor: [Math.round(width / 2), height - 6],
    popupAnchor: [0, -height + 8],
  });
}

export function normalizeKey(value: string): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapCityLatitude(city: MapCityPoint): number | null {
  if ("latitude" in city) {
    const value = Number(city.latitude);
    return Number.isFinite(value) ? value : null;
  }
  const value = Number(city.lat);
  return Number.isFinite(value) ? value : null;
}

export function mapCityLongitude(city: MapCityPoint): number | null {
  if ("longitude" in city) {
    const value = Number(city.longitude);
    return Number.isFinite(value) ? value : null;
  }
  const value = Number(city.lng);
  return Number.isFinite(value) ? value : null;
}

export function mapCityLabel(city: MapCityPoint): string {
  return city.city_name;
}

export function mapCityKey(city: MapCityPoint): string {
  return `db-${city.city_id}`;
}

export function tryParseGeoJson(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
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

export function thresholdsForMax(max: number) {
  const boundedMax = Math.max(1, max || 1);
  const first = Math.ceil(boundedMax * 0.2);
  const second = Math.ceil(boundedMax * 0.4);
  const third = Math.ceil(boundedMax * 0.6);
  const fourth = Math.ceil(boundedMax * 0.8);
  return [0, first, second, third, fourth, boundedMax];
}

export function bucketIndexForCount(count: number, maxCount: number) {
  const thresholds = thresholdsForMax(maxCount);
  for (let index = 0; index < 5; index += 1) {
    const from = thresholds[index];
    const to = thresholds[index + 1];
    if (count >= from && count <= to) return index;
  }
  return 4;
}

export function fillColorForCount(count: number, maxCount: number, fillColors: string[]) {
  const index = bucketIndexForCount(count, maxCount);
  return fillColors[Math.max(0, Math.min(fillColors.length - 1, index))];
}

export function fillOpacityForCount(count: number) {
  return count <= 0 ? 0.18 : 0.75;
}

export function legendBuckets(maxCount: number) {
  return thresholdsForMax(Math.max(1, maxCount));
}
