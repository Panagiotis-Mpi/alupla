import { useEffect, useState } from "react";
import type React from "react";

export const genderColors = { male: "#3b82f6", female: "#db2777", balanced: "#475569", empty: "#dbe2ea" };

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

export function slugPart(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "map";
}

export function InfoBox({ title, totalText, groups, onRemove, removeLabel }: { title: string; totalText: string; groups: Array<{ title: string; rows: Array<{ label: string; value: string }> }>; onRemove?: () => void; removeLabel?: string }) {
  return (
    <div className="map-info-box">
      {onRemove ? (
        <button type="button" className="map-info-box-close" onClick={onRemove} aria-label={removeLabel || "Κλείσιμο"}>
          ×
        </button>
      ) : null}
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
