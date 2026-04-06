import { useEffect, useState } from "react";
import type React from "react";

import { normalizeKey } from "./utils";

const directionPalette = ["#2563eb", "#dc2626", "#16a34a", "#f59e0b", "#7c3aed", "#0891b2", "#e11d48", "#65a30d", "#ea580c", "#4f46e5", "#db2777", "#0f766e", "#b91c1c", "#0284c7", "#a16207", "#9333ea", "#15803d", "#c2410c", "#1d4ed8", "#be123c"];
const genderColors = { male: "#3b82f6", female: "#c084fc", balanced: "#cbd5e1", empty: "#e5e7eb" };

export { directionPalette, genderColors };

export function useCompactMapViewport() {
  const [isCompact, setIsCompact] = useState(() => typeof window !== "undefined" ? window.innerWidth <= 820 : false);

  useEffect(() => {
    const update = () => setIsCompact(window.innerWidth <= 820);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return isCompact;
}

export function compactNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  if (Number.isInteger(numeric)) return String(numeric);
  return numeric.toFixed(1);
}

export function detailValue(value: number | string | null | undefined, suffix = "") {
  if (value === null || value === undefined || value === "") return "-";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return `${value}${suffix}`;
  return `${compactNumber(numeric)}${suffix}`;
}

function hashLabel(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

export function buildDirectionColorMap(labels: string[]) {
  const unique = Array.from(new Set(labels.map((label) => String(label || "").trim()).filter(Boolean)));
  unique.sort((left, right) => left.localeCompare(right, "el"));
  return new Map<string, string>(unique.map((label, index) => [label, directionPalette[index % directionPalette.length]]));
}

export function directionColor(label: string, colorMap?: Map<string, string>) {
  if (!label) return genderColors.empty;
  if (colorMap?.has(label)) return colorMap.get(label) || genderColors.empty;
  return directionPalette[hashLabel(label) % directionPalette.length];
}

export function isPlaceholderLegendLabel(value: string) {
  const normalized = normalizeKey(String(value || ""))
    .replace(/[–—−‑‒﹘﹣]/g, "-")
    .replace(/\s+/g, "")
    .trim();
  return /^\d+-\d+$/.test(normalized) && normalized.split("-")[0] === normalized.split("-")[1];
}

export function colorWithAlpha(color: string, alpha: number) {
  if (color.startsWith("#") && (color.length === 7 || color.length === 4)) {
    const hex = color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}

export function programSortScore(label: string) {
  const value = String(label || "");
  const years = Array.from(value.matchAll(/(19|20)\d{2}/g)).map((match) => Number(match[0]));
  const current = /σημερα|σήμερα|today|present|current/i.test(value) ? 1 : 0;
  const maxYear = years.length ? Math.max(...years) : 0;
  const minYear = years.length ? Math.min(...years) : 0;
  return current * 1000000 + maxYear * 1000 + minYear;
}

export function slugPart(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "map";
}

export function InfoBox({ title, totalText, groups }: { title: string; totalText: string; groups: Array<{ title: string; rows: Array<{ label: string; value: string }> }> }) {
  return (
    <div className="map-info-box">
      <div className="map-info-box-header">
        <div className="map-info-box-title">{title}</div>
        <div className="map-info-total-line">{totalText}</div>
      </div>
      <div className="map-info-groups">
        {groups.filter((group) => group.rows.length > 0).map((group) => (
          <div className="map-info-group" key={`${title}-${group.title}`}>
            <div className="map-info-group-title">{group.title}</div>
            <div className="map-info-metrics">
              {group.rows.map((row) => (
                <div className="map-info-metric" key={`${title}-${group.title}-${row.label}`}>
                  <div className="map-info-metric-label">{row.label}</div>
                  <div className="map-info-metric-value">{row.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
