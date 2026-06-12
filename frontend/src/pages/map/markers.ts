import L from "leaflet";
import { normalizeKey } from "./utils";
import { genderColors } from "./viewHelpers";

export type MapMetric = "count" | "dominant_gender";
export type MapScope = "greece" | "abroad";

export const countMarkerPalette = ["#eff6ff", "#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#3b82f6"];

export const lightMapTileUrl = "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png";
export const highContrastMapTileUrl = lightMapTileUrl;
export const mapTileAttribution =
  "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors &copy; <a href=\"https://carto.com/attributions\">CARTO</a>";


const escapeHtml = (value: string) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const hasGreek = (value: string) => /[\u0370-\u03ff]/.test(value);

const greekLetters: Record<string, string> = {
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th", ι: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o", π: "p", ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps", ω: "o",
};

function titleCaseLatin(value: string) {
  return value.replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}

function transliterateGreek(value: string) {
  const normalized = value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const latin = Array.from(normalized).map((char) => greekLetters[char] ?? char).join("");
  return titleCaseLatin(latin.replace(/\s+/g, " ").trim());
}

function removeAdministrativeTerms(value: string, lang: "gr" | "en") {
  let text = value.replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (lang === "en") {
    text = text
      .replace(/^municipal unit of\s+/i, "")
      .replace(/\s+municipal unit$/i, "")
      .replace(/^municipality of\s+/i, "")
      .replace(/\s+municipality$/i, "")
      .replace(/^regional unit of\s+/i, "")
      .replace(/\s+regional unit$/i, "");
    return text.replace(/\s+/g, " ").trim();
  }
  text = text
    .replace(/^δημοτική\s+ενότητα\s+/i, "")
    .replace(/^δημοτικη\s+ενοτητα\s+/i, "")
    .replace(/^δήμος\s+/i, "")
    .replace(/^δημος\s+/i, "")
    .replace(/^περιφερειακή\s+ενότητα\s+/i, "")
    .replace(/^περιφερειακη\s+ενοτητα\s+/i, "");
  return text.replace(/\s+/g, " ").trim();
}

function isAdministrativeName(value: string) {
  return /municipal unit|municipality|regional unit|δημοτική\s+ενότητα|δημοτικη\s+ενοτητα|δήμος|δημος|περιφερειακή\s+ενότητα|περιφερειακη\s+ενοτητα/i.test(value);
}

function localizedRecordName(item: any, field: string, lang: "gr" | "en") {
  const key = lang === "en" ? field + "_en" : field + "_el";
  const raw = String(item?.[field] ?? "").trim();
  const localized = String(item?.[key] ?? "").trim();
  if (lang === "en" && raw && hasGreek(raw) && (!localized || isAdministrativeName(localized))) {
    return transliterateGreek(removeAdministrativeTerms(raw, "gr") || raw);
  }
  const cleanedLocalized = removeAdministrativeTerms(localized, lang);
  if (cleanedLocalized) return cleanedLocalized;
  const cleanedRaw = removeAdministrativeTerms(raw, lang === "en" ? "gr" : lang);
  if (lang === "en" && cleanedRaw && hasGreek(cleanedRaw)) return transliterateGreek(cleanedRaw);
  return cleanedRaw;
}

export function localizedCityRecordName(item: any, lang: "gr" | "en") {
  return localizedRecordName(item, "city_name", lang);
}

export function localizedCountryRecordName(item: any, lang: "gr" | "en") {
  return localizedRecordName(item, "country_name", lang) || localizedRecordName(item, "periphery_name", lang);
}

export function localizedPeripheryRecordName(item: any, lang: "gr" | "en") {
  return localizedRecordName(item, "periphery_name", lang);
}

export function localizedCountryKey(value: unknown) {
  return normalizeKey(String(value ?? ""));
}


export function genderLegendPattern(entryKey: string, highContrastEnabled = false) {
  return "";
}

function roundLegendBreak(value: number, max: number) {
  if (value >= max) return max;
  if (value <= 12) return Math.max(1, Math.ceil(value));
  const step = value < 50 ? 5 : value < 200 ? 10 : value < 500 ? 20 : 50;
  return Math.min(max, Math.max(1, Math.ceil(value / step) * step));
}

function buildCountBreaks(counts: number[], maxBuckets: number) {
  const uniqueCounts = Array.from(new Set(counts)).sort((left, right) => left - right);
  if (!uniqueCounts.length) return [] as number[];
  if (uniqueCounts.length <= maxBuckets) return uniqueCounts;

  const max = uniqueCounts[uniqueCounts.length - 1];
  if (max <= 1) return [max];

  const sevenStepRatios = [0.02, 0.05, 0.1, 0.2, 0.4, 0.7, 1];
  const usableBuckets = Math.min(maxBuckets, uniqueCounts.length);
  const ratioStart = Math.max(0, sevenStepRatios.length - usableBuckets);
  const ratios = sevenStepRatios.slice(ratioStart);
  const breaks: number[] = [];

  ratios.forEach((ratio, index) => {
    let value = index === ratios.length - 1 ? max : roundLegendBreak(max * ratio, max);
    while (breaks.length > 0 && value <= breaks[breaks.length - 1] && value < max) {
      value += 1;
    }
    if (breaks.length === 0 || value > breaks[breaks.length - 1]) breaks.push(value);
  });

  if (breaks[breaks.length - 1] !== max) breaks[breaks.length - 1] = max;
  return breaks;
}

export function buildCountMarkerScale(countsInput: number[], palette: string[], radii: number[]) {
  const counts = countsInput
    .map((value) => Math.max(0, Math.round(Number(value) || 0)))
    .filter((value) => value > 0)
    .sort((left, right) => left - right);

  if (!counts.length) return { breaks: [] as number[], bucketForCount: () => 0 };

  const maxBuckets = Math.min(palette.length, radii.length);
  const breaks = buildCountBreaks(counts, maxBuckets);

  const bucketForCount = (count: number) => {
    const safeCount = Math.max(0, Math.round(Number(count) || 0));
    const hit = breaks.findIndex((value) => safeCount <= value);
    return hit === -1 ? breaks.length - 1 : hit;
  };

  return { breaks, bucketForCount };
}

export function sameMapSelection(scope: MapScope, left: any, right: any) {
  if (!left || !right) return false;
  if (scope === "abroad") {
    const leftCountryId = Number(left.country_region_id || left.periphery_id || 0);
    const rightCountryId = Number(right.country_region_id || right.periphery_id || 0);
    if (leftCountryId && rightCountryId) return leftCountryId === rightCountryId;
    return localizedCountryKey(left.country_name || left.periphery_name || left.city_name || "") === localizedCountryKey(right.country_name || right.periphery_name || right.city_name || "");
  }
  const leftGroupKey = String(left.map_group_key || "").trim();
  const rightGroupKey = String(right.map_group_key || "").trim();
  if (leftGroupKey || rightGroupKey) return Boolean(leftGroupKey && rightGroupKey && leftGroupKey === rightGroupKey);
  return normalizeKey(left.city_name || "") === normalizeKey(right.city_name || "") && Number(left.country_region_id || left.periphery_id || 0) === Number(right.country_region_id || right.periphery_id || 0);
}


export function bubbleLabelIcon(
  city: any,
  mapMetric: MapMetric,
  active: boolean,
  showLabel: boolean,
  mt: (key: string, options?: Record<string, unknown>) => string,
  highContrastEnabled: boolean,
) {
  const baseRadius = Math.max(10, Number(city?.markerRadius || 10));
  const radius = active ? Math.round(baseRadius * 1.12) : baseRadius;
  const size = radius * 2;
  const label = escapeHtml(String(city?.city_name || ""));
  const count = Math.max(0, Number(city?.count || 0));
  const maleCount = Math.max(0, Number(city?.male_count || 0));
  const femaleCount = Math.max(0, Number(city?.female_count || 0));
  const total = Math.max(0, maleCount + femaleCount);
  const malePct = total > 0 ? (maleCount / total) * 100 : 50;
  const femalePct = 100 - malePct;
  const countBubbleFill = highContrastEnabled ? "#ffd400" : String(city?.markerFill || "#60a5fa");
  const countBubbleStroke = highContrastEnabled ? "#000000" : String(city?.markerStroke || "#3b82f6");
  const countBubbleOpacity = highContrastEnabled ? 1 : Math.max(0.45, Number(city?.markerOpacity || 0.85));
  const fontSize = active ? (size >= 34 ? 13 : size >= 28 ? 12 : 11) : (size >= 34 ? 12 : size >= 28 ? 11 : 10);
  const labelWidth = showLabel ? Math.max(size + 10, Math.min(170, Math.max(64, label.length * 7))) : size + 10;
  const labelHeight = showLabel ? 18 : 0;
  const wrapperHeight = labelHeight + size + 6;
  const wrapperWidth = Math.max(labelWidth, size + 10);
  const activeRing = active ? '0 0 0 3px rgba(15,23,42,.14)' : 'none';
  const hasBothGenders = maleCount > 0 && femaleCount > 0;
  const highContrastMaleFill = "#ffd400";
  const highContrastFemaleFill = "#7fffd4";
  const highContrastBoundaryFill = "#000000";
  const maleAngle = Math.max(0, Math.min(360, malePct * 3.6));
  const genderBoundaryWidth = hasBothGenders
    ? Math.max(0.8, Math.min(3, maleAngle / 4, (360 - maleAngle) / 4))
    : 0;
  const genderBubbleBackground = highContrastEnabled
    ? hasBothGenders
      ? `conic-gradient(from -90deg, ${highContrastBoundaryFill} 0deg ${genderBoundaryWidth.toFixed(2)}deg, ${highContrastMaleFill} ${genderBoundaryWidth.toFixed(2)}deg ${Math.max(genderBoundaryWidth, maleAngle - genderBoundaryWidth).toFixed(2)}deg, ${highContrastBoundaryFill} ${Math.max(genderBoundaryWidth, maleAngle - genderBoundaryWidth).toFixed(2)}deg ${Math.min(360 - genderBoundaryWidth, maleAngle + genderBoundaryWidth).toFixed(2)}deg, ${highContrastFemaleFill} ${Math.min(360 - genderBoundaryWidth, maleAngle + genderBoundaryWidth).toFixed(2)}deg ${(360 - genderBoundaryWidth).toFixed(2)}deg, ${highContrastBoundaryFill} ${(360 - genderBoundaryWidth).toFixed(2)}deg 360deg)`
      : maleCount > 0
        ? highContrastMaleFill
        : femaleCount > 0
          ? highContrastFemaleFill
          : highContrastMaleFill
    : `conic-gradient(${genderColors.male} 0 ${malePct}%, ${genderColors.female} ${malePct}% 100%)`;
  const genderSymbolSize = Math.max(9, Math.min(size * 0.34, active ? 19 : 17));
  const genderSymbol = (type: "male" | "female", x: number, y: number) => {
    const shape = type === "male"
      ? `<circle cx="9" cy="15" r="4.6" fill="none" stroke="#000000" stroke-width="2.6"/><path d="M12.3 11.7 19 5" fill="none" stroke="#000000" stroke-width="2.6" stroke-linecap="round"/><path d="M14.8 5H19v4.2" fill="none" stroke="#000000" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`
      : `<circle cx="12" cy="7.5" r="4.6" fill="none" stroke="#000000" stroke-width="2.6"/><path d="M12 12.1v8.2" fill="none" stroke="#000000" stroke-width="2.6" stroke-linecap="round"/><path d="M8.1 16.4h7.8" fill="none" stroke="#000000" stroke-width="2.6" stroke-linecap="round"/>`;
    return `<span class="alupla-city-gender-symbol alupla-city-gender-symbol-${type}" style="position:absolute;left:${x.toFixed(2)}px;top:${y.toFixed(2)}px;width:${genderSymbolSize.toFixed(2)}px;height:${genderSymbolSize.toFixed(2)}px;transform:translate(-50%,-50%);display:block;color:#000000;z-index:2;pointer-events:none;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="display:block;width:100%;height:100%;overflow:visible;color:#000000;">${shape}</svg></span>`;
  };
  const genderSegmentPoint = (startAngle: number, segmentAngle: number) => {
    const center = size / 2;
    if (!hasBothGenders) return { x: center, y: center };
    const safeSegmentAngle = Math.max(0.01, Math.min(359.99, segmentAngle));
    const radians = ((startAngle + safeSegmentAngle / 2) * Math.PI) / 180;
    const segmentRadians = (safeSegmentAngle * Math.PI) / 180;
    const sectorDistance = (4 * radius * Math.sin(segmentRadians / 2)) / (3 * segmentRadians);
    const minDistance = Math.min(radius - 1, genderSymbolSize * 0.45 + 1);
    const maxDistance = Math.max(0, radius - genderSymbolSize * 0.52 - 1);
    const distance = Math.min(maxDistance, Math.max(minDistance, sectorDistance));
    return {
      x: center + Math.sin(radians) * distance,
      y: center - Math.cos(radians) * distance,
    };
  };
  const maleSegmentPoint = genderSegmentPoint(-90, maleAngle);
  const femaleSegmentPoint = genderSegmentPoint(-90 + maleAngle, 360 - maleAngle);
  const singleGenderPoint = { x: size / 2, y: size / 2 };
  const highContrastGenderDetails = highContrastEnabled
    ? hasBothGenders
      ? `${maleCount > 0 ? genderSymbol("male", maleSegmentPoint.x, maleSegmentPoint.y) : ""}${femaleCount > 0 ? genderSymbol("female", femaleSegmentPoint.x, femaleSegmentPoint.y) : ""}`
      : `<span class="alupla-city-gender-icons" style="font-size:${genderSymbolSize}px;">${maleCount > 0 ? genderSymbol("male", singleGenderPoint.x, singleGenderPoint.y) : ""}${femaleCount > 0 ? genderSymbol("female", singleGenderPoint.x, singleGenderPoint.y) : ""}</span>`
    : `<span class="alupla-city-bubble-number alupla-city-bubble-number-gender" style="font-size:${fontSize}px;">${count}</span>`;
  const bubbleHtml =
    mapMetric === "count"
      ? `<div class="alupla-city-bubble alupla-city-bubble-count${highContrastEnabled ? " is-high-contrast" : ""}" style="width:${size}px;height:${size}px;--alupla-bubble-border:${countBubbleStroke};--alupla-bubble-background:${countBubbleFill};--alupla-bubble-opacity:${countBubbleOpacity};--alupla-bubble-shadow:${activeRing};"><span class="alupla-city-bubble-number" style="font-size:${fontSize}px;">${count}</span></div>`
      : `<div class="alupla-city-bubble alupla-city-bubble-gender${highContrastEnabled ? " is-high-contrast" : ""}" style="width:${size}px;height:${size}px;--alupla-bubble-border:rgba(51,65,85,.72);--alupla-bubble-background:${genderBubbleBackground};--alupla-bubble-opacity:1;--alupla-bubble-shadow:${activeRing};">${highContrastGenderDetails}</div>`;
  const summary = "";
  return L.divIcon({
    className: "alupla-city-bubble-icon",
    html: `<div class="alupla-city-bubble-wrap" style="width:${wrapperWidth}px;height:${wrapperHeight}px;">${showLabel ? `<div class="alupla-city-bubble-label${active ? " active" : ""}" style="width:${labelWidth}px;">${label}</div>` : ""}${bubbleHtml}${summary}</div>`,
    iconSize: [wrapperWidth, wrapperHeight],
    iconAnchor: [wrapperWidth / 2, labelHeight + size / 2],
    popupAnchor: [0, -(size / 2 + 16)],
  });
}





export function markerDeclutterDistance(scope: MapScope, zoom: number) {
  if (scope === "abroad") {
    if (zoom < 2.2) return 88;
    if (zoom < 2.8) return 76;
    if (zoom < 3.5) return 62;
    if (zoom < 4.2) return 50;
    return 38;
  }
  if (zoom < 6.1) return 82;
  if (zoom < 6.8) return 68;
  if (zoom < 7.4) return 56;
  if (zoom < 8.1) return 44;
  return 34;
}

export function projectMarkerToViewport(
  latitude: number,
  longitude: number,
  bounds: L.LatLngBounds,
  width: number,
  height: number,
) {
  const north = bounds.getNorth();
  const south = bounds.getSouth();
  const east = bounds.getEast();
  const west = bounds.getWest();
  const lngSpan = east - west;
  const latSpan = north - south;
  if (!Number.isFinite(lngSpan) || !Number.isFinite(latSpan) || lngSpan <= 0 || latSpan <= 0) return null;
  const x = ((longitude - west) / lngSpan) * width;
  const y = ((north - latitude) / latSpan) * height;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}
