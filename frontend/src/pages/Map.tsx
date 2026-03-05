import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { GeoJSON, MapContainer } from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { getGraduatesMap, type GraduatesMapItem } from "../lib/api";
import greeceRegionsRaw from "../assets/greece-regions.geojson?raw";

type AgeGroup = "" | "18-22" | "23-26" | "27-30" | "31+";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeKey(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tryParseGeoJson(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(v: any, delimiter: string) {
  const s = v === null || v === undefined ? "" : String(v);
  // helper logic
  if (s.includes(delimiter) || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function Map() {
  const { t, i18n } = useTranslation();

  const mapRef = useRef<L.Map | null>(null);

  const [year, setYear] = useState<string>("");
  const [studyProgramId, setStudyProgramId] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("");

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<GraduatesMapItem[]>([]);
  const [selected, setSelected] = useState<GraduatesMapItem | null>(null);

  const geojson = useMemo(() => tryParseGeoJson(greeceRegionsRaw), []);

  // Keep the map framed tightly around Greece (no basemap). This affects only the initial view.
  useEffect(() => {
    if (!geojson || !mapRef.current) return;
    try {
      const layer = L.geoJSON(geojson as any);
      const bounds = layer.getBounds();
      if (bounds && bounds.isValid()) {
        // Use a bit more padding and cap maxZoom to avoid cutting islands.
        mapRef.current.fitBounds(bounds, { padding: [32, 32], maxZoom: 7.25 });
      }
    } catch {
      // ignore
    }
  }, [geojson]);

  // counts keyed by Greek name (periphery_name), normalized.
  const countsByGreekName = useMemo(() => {
    const M = new (globalThis as any).Map<string, number>();
    for (const it of items) {
      const name = String((it as any).periphery_name ?? "");
      const c = Number((it as any).count ?? 0) || 0;
      if (name) M.set(normalizeKey(name), c);
    }
    return M as Map<string, number>;
  }, [items]);

  const maxCount = useMemo(() => {
    let m = 1;
    for (const it of items) {
      const c = Number((it as any).count ?? 0) || 0;
      if (c > m) m = c;
    }
    return m;
  }, [items]);

  // IMPORTANT: GeoJSON tooltips are bound once. Use refs so events always read latest counts/items.
  const countsRef = useRef<Map<string, number>>(countsByGreekName);
  const itemsRef = useRef<GraduatesMapItem[]>(items);

  useEffect(() => {
    countsRef.current = countsByGreekName;
  }, [countsByGreekName]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  async function fetchMap(opts?: {
    year?: string;
    studyProgramId?: string;
    gender?: string;
    ageGroup?: AgeGroup;
  }) {
    setLoading(true);
    setSelected(null);
    try {
      const res = await getGraduatesMap({
        year: opts?.year || undefined,
        study_program_id: opts?.studyProgramId || undefined,
        gender: opts?.gender || undefined,
        age_group: opts?.ageGroup || undefined,
      });
      setItems(res?.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  // Load totals immediately on first render (no filters)
  useEffect(() => {
    fetchMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onApply() {
    await fetchMap({ year, studyProgramId, gender, ageGroup });
  }

  function onReset() {
    setYear("");
    setStudyProgramId("");
    setGender("");
    setAgeGroup("");
    setSelected(null);
    // After clearing filters, show totals again (no filters)
    fetchMap();
  }

  
// Color ramp (soft blue shades). 5 buckets.
const fillColors = ["#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#2563eb"];

function thresholdsForMax(m: number) {
  const mm = Math.max(1, m || 1);
  const b1 = Math.ceil(mm * 0.2);
  const b2 = Math.ceil(mm * 0.4);
  const b3 = Math.ceil(mm * 0.6);
  const b4 = Math.ceil(mm * 0.8);
  return [0, b1, b2, b3, b4, mm];
}

function bucketIndexForCount(c: number) {
  const t = thresholdsForMax(maxCount);
  for (let i = 0; i < 5; i++) {
    const from = t[i];
    const to = t[i + 1];
    if (c >= from && c <= to) return i;
  }
  return 4;
}

function fillColorForCount(c: number) {
  const idx = bucketIndexForCount(c);
  return fillColors[Math.max(0, Math.min(fillColors.length - 1, idx))];
}

function fillOpacityForCount(c: number) {
  // Keep a visible but subtle fill for 0-count regions.
  return c <= 0 ? 0.18 : 0.75;
}

  function featureGreekName(feature: any): string {
    const p = feature?.properties || {};
    return String(p.name_greek || p.name_el || p.name || p.NAME || "");
  }

  function featureDisplayName(feature: any): string {
    const p = feature?.properties || {};
    if (i18n.language?.toLowerCase().startsWith("en")) {
      return String(p.name_en || p.name || p.NAME || p.name_greek || "");
    }
    return featureGreekName(feature);
  }

  function currentCountForFeature(feature: any): number {
    const key = normalizeKey(featureGreekName(feature));
    return countsRef.current.get(key) ?? 0;
  }

  function renderTooltipHtml(feature: any): string {
    const label = featureDisplayName(feature);
    const c = currentCountForFeature(feature);
    const totalLabel = t("map.total", { total: c, defaultValue: "Σύνολο: {{total}}" });
    return `<div style="font-weight:700">${label}</div><div style="font-size:12px;opacity:.9">${totalLabel}</div>`;
  }

  const total = useMemo(() => items.reduce((s, it: any) => s + (Number(it.count) || 0), 0), [items]);

  function onExportCsv() {
    // Excel (especially on Windows) often misreads UTF-8 unless there is a BOM.
    const BOM = "\ufeff";

    // Greek/European Excel often expects semicolon delimiter.
    const delimiter = i18n.language?.toLowerCase().startsWith("el") ? ";" : ",";

    const headers = ["periphery_id", "periphery_name", "count", "avg_age", "male_pct", "female_pct"];
    const lines = [headers.join(delimiter)];

    for (const it of items) {
      const row = [
        (it as any).periphery_id ?? "",
        (it as any).periphery_name ?? "",
        (it as any).count ?? 0,
        (it as any).avg_age ?? "",
        (it as any).male_pct ?? "",
        (it as any).female_pct ?? "",
      ].map((v) => csvEscape(v, delimiter));
      lines.push(row.join(delimiter));
    }

    const csv = BOM + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    downloadBlob("alupla_graduates_map_peripheries.csv", blob);
  }

  function legendBuckets(max: number) {
    // 5 buckets inclusive
    const m = Math.max(1, max);
    const b1 = Math.ceil(m * 0.2);
    const b2 = Math.ceil(m * 0.4);
    const b3 = Math.ceil(m * 0.6);
    const b4 = Math.ceil(m * 0.8);
    return [0, b1, b2, b3, b4, m];
  }

  const buckets = useMemo(() => legendBuckets(maxCount), [maxCount]);

  // react-leaflet's GeoJSON layers do not always re-apply styles when external data changes.
  // Force a remount whenever the computed buckets/max change so initial load paints correctly.
  const geoRenderKey = useMemo(() => {
    return `${i18n.language}:${items.length}:${maxCount}`;
  }, [i18n.language, items.length, maxCount]);

  // ---- UI styles (Map page only) ----
  const ui = useMemo(
    () =>
      ({
        page: {
          minHeight: "calc(100vh - 70px)",
          padding: "1.2rem 1.5rem",
          background: "linear-gradient(180deg, #eef4ff 0%, #ffffff 65%)",
          paddingBottom: "4.2rem",
        } as React.CSSProperties,
        wrap: {
          width: "100%",
          maxWidth: 1200,
          margin: "0 auto",
        } as React.CSSProperties,
        titleRow: {
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        } as React.CSSProperties,
        h2: {
          margin: 0,
          fontSize: "1.85rem",
          fontWeight: 800,
          color: "#0f172a",
          letterSpacing: "-0.02em",
        } as React.CSSProperties,
        badge: {
          fontSize: 12,
          border: "1px solid #e5edff",
          background: "#ffffff",
          padding: "2px 10px",
          borderRadius: 999,
          color: "#475569",
        } as React.CSSProperties,
        card: {
          background: "white",
          borderRadius: 18,
          border: "1px solid #e5edff",
          boxShadow: "0 10px 30px rgba(59,130,246,0.08)",
          padding: "1.2rem 1.2rem",
        } as React.CSSProperties,
        input: {
          height: 42,
          borderRadius: 12,
          border: "1px solid #dbeafe",
          background: "#ffffff",
          padding: "0 12px",
          outline: "none",
          width: "100%",
        } as React.CSSProperties,
        select: {
          height: 42,
          borderRadius: 12,
          border: "1px solid #dbeafe",
          background: "#ffffff",
          padding: "0 10px",
          outline: "none",
          width: "100%",
        } as React.CSSProperties,
        label: {
          fontSize: 13,
          fontWeight: 700,
          color: "#334155",
          marginBottom: 8,
        } as React.CSSProperties,
        btnPrimary: {
          height: 42,
          borderRadius: 12,
          border: "none",
          backgroundColor: "#2563eb",
          color: "white",
          cursor: "pointer",
          fontWeight: 800,
          padding: "0 14px",
          boxShadow: "0 10px 22px rgba(37,99,235,0.18)",
        } as React.CSSProperties,
        btnSecondary: {
          height: 42,
          borderRadius: 12,
          border: "1px solid #dbeafe",
          background: "#ffffff",
          color: "#1e3a8a",
          cursor: "pointer",
          fontWeight: 800,
          padding: "0 14px",
        } as React.CSSProperties,
        btnDisabled: {
          cursor: "not-allowed",
          opacity: 0.6,
          boxShadow: "none",
        } as React.CSSProperties,
        mapCard: {
          padding: 0,
          overflow: "hidden",
          position: "relative",
        } as React.CSSProperties,
        mapFrame: {
          height: "calc(100vh - 260px)",
          minHeight: 720,
          borderRadius: 18,
          overflow: "hidden",
        } as React.CSSProperties,
        legend: {
          position: "absolute",
          left: 12,
          bottom: 12,
          background: "rgba(255,255,255,.94)",
          border: "1px solid #e5edff",
          borderRadius: 14,
          padding: "10px 12px",
          fontSize: 12,
          boxShadow: "0 10px 22px rgba(59,130,246,0.10)",
          maxWidth: 220,
        } as React.CSSProperties,
      }) as const,
    []
  );

  return (
    <div style={ui.page}>
      {/* Remove the Leaflet/SVG focus outline (the "selection box") without affecting behavior */}
      <style>{`
        .leaflet-container path:focus { outline: none !important; }
        .leaflet-interactive:focus { outline: none !important; }
        .leaflet-container:focus { outline: none !important; }
      `}</style>

      <div style={ui.wrap}>
        <div style={ui.titleRow}>
          <h2 style={ui.h2}>{t("map.title", { defaultValue: "Χάρτης αποφοίτων (Περιφέρειες)" })}</h2>
          <span style={ui.badge}>
          {loading
            ? t("common.loading", { defaultValue: "Φόρτωση..." })
            : `${t("common.ready", { defaultValue: "Έτοιμο" })} · ${t("map.totalInline", { defaultValue: "Σύνολο" })}: ${total}`}
        </span>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button
              onClick={onExportCsv}
              disabled={loading || items.length === 0}
              style={{
                ...ui.btnSecondary,
                ...(loading || items.length === 0 ? ui.btnDisabled : null),
              }}
            >
              {t("map.exportCsv", { defaultValue: "Export CSV" })}
            </button>
          </div>
        </div>

      {/* Two-column layout: map on the left, filters+details stacked on the right */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.7fr 0.9fr",
          gap: 12,
          alignItems: "start",
          marginTop: 12,
        }}
      >
        {/* Map column (left) */}
        <div
          style={{
            ...ui.card,
            ...ui.mapCard,
          }}
        >
          <div style={ui.mapFrame}>
            <MapContainer
              center={[38.6, 24.0]}
              zoom={6.5 as any}
              zoomSnap={0.5}
              whenCreated={(m) => {
                mapRef.current = m;
              }}
              style={{ height: "100%", width: "100%", background: "transparent" }}
              scrollWheelZoom
            >
              {geojson ? (
                <GeoJSON
                  key={geoRenderKey}
                  data={geojson as any}
                  style={(feature: any) => {
                    const c = currentCountForFeature(feature);
                    return {
                      color: "#334155",
                      weight: 1,
                      fillColor: fillColorForCount(c),
                      fillOpacity: fillOpacityForCount(c),
                    } as any;
                  }}
                  onEachFeature={(feature: any, layer: any) => {
                    layer.bindTooltip(renderTooltipHtml(feature), { sticky: true });

                    layer.on({
                      mouseover: (e: LeafletMouseEvent) => {
                        layer.setStyle({ weight: 2 });
                        layer.bringToFront();
                        layer.setTooltipContent(renderTooltipHtml(feature));
                      },
                      mouseout: () => {
                        layer.setStyle({ weight: 1 });
                      },
                      click: () => {
                        const key = normalizeKey(featureGreekName(feature));
                        const match =
                          itemsRef.current.find((it: any) => normalizeKey(String(it.periphery_name || "")) === key) ||
                          null;
                        setSelected(match);
                        layer.setTooltipContent(renderTooltipHtml(feature));
                      },
                    });
                  }}
                />
              ) : null}
            </MapContainer>
          </div>

          {/* Legend */}
          <div
            style={ui.legend}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{t("map.legend", { defaultValue: "Υπόμνημα" })}</div>
            <div className="muted" style={{ marginBottom: 8 }}>
              {t("map.legendCounts", { defaultValue: "Αριθμός αποφοίτων" })}
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {Array.from({ length: 5 }).map((_, idx) => {
                const from = buckets[idx];
                const to = buckets[idx + 1];
                const mid = (from + to) / 2;
                const opacity = fillOpacityForCount(mid);
                const color = fillColorForCount(mid);
                return (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 16,
                        height: 12,
                        display: "inline-block",
                        border: "1px solid #334155",
                        background: color,
                        opacity,
                        borderRadius: 3,
                      }}
                    />
                    <span>
                      {from}–{to}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column: filters + details stacked */}
        <div style={{ display: "grid", gap: 12 }}>
          <div style={ui.card}>
            <div className="grid cols2" style={{ alignItems: "end", gap: 12 }}>
              <div>
                <div style={ui.label}>{t("map.filters.year", { defaultValue: "Έτος αποφοίτησης" })}</div>
                <input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder={t("map.filters.yearPh", { defaultValue: "π.χ. 2026" })}
                  style={ui.input}
                />
              </div>

              <div>
                <div style={ui.label}>{t("map.filters.programId", { defaultValue: "ID προγράμματος" })}</div>
                <input
                  value={studyProgramId}
                  onChange={(e) => setStudyProgramId(e.target.value)}
                  placeholder={t("map.filters.programIdPh", { defaultValue: "π.χ. 1" })}
                  style={ui.input}
                />
              </div>

              <div>
                <div style={ui.label}>{t("map.filters.gender", { defaultValue: "Φύλο" })}</div>
                <select value={gender} onChange={(e) => setGender(e.target.value)} style={ui.select}>
                  <option value="">{t("common.all", { defaultValue: "Όλα" })}</option>
                  <option value="M">{t("common.male", { defaultValue: "Άνδρας" })}</option>
                  <option value="F">{t("common.female", { defaultValue: "Γυναίκα" })}</option>
                </select>
              </div>

              <div>
                <div style={ui.label}>{t("map.filters.ageGroup", { defaultValue: "Ηλικιακή ομάδα" })}</div>
                <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value as AgeGroup)} style={ui.select}>
                  <option value="">{t("common.all", { defaultValue: "Όλα" })}</option>
                  <option value="18-22">18-22</option>
                  <option value="23-26">23-26</option>
                  <option value="27-30">27-30</option>
                  <option value="31+">31+</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <button
                onClick={onApply}
                disabled={loading}
                style={{
                  ...ui.btnPrimary,
                  ...(loading ? ui.btnDisabled : null),
                }}
              >
                {t("common.apply", { defaultValue: "Εφαρμογή" })}
              </button>
              <button
                onClick={onReset}
                disabled={loading}
                style={{
                  ...ui.btnSecondary,
                  ...(loading ? ui.btnDisabled : null),
                }}
              >
                {t("common.reset", { defaultValue: "Reset" })}
              </button>
            </div>
          </div>

          <div style={ui.card}>
            <h3 style={{ marginTop: 0 }}>{t("map.detailsTitle", { defaultValue: "Λεπτομέρειες" })}</h3>
            {!selected ? (
              <div className="muted">{t("map.detailsHint", { defaultValue: "Κάνε κλικ σε μία περιφέρεια για λεπτομέρειες." })}</div>
            ) : (
              <div className="grid" style={{ gap: 10 }}>
                <div>
                  <div style={ui.label}>{t("map.region", { defaultValue: "Περιφέρεια" })}</div>
                  <div style={{ fontWeight: 700 }}>{(selected as any).periphery_name}</div>
                </div>

                <div className="grid cols2">
                  <div>
                    <div style={ui.label}>{t("map.totalLabel", { defaultValue: "Σύνολο" })}</div>
                    <div style={{ fontWeight: 700 }}>{(selected as any).count ?? 0}</div>
                  </div>
                  <div>
                    <div style={ui.label}>{t("map.avgAge", { defaultValue: "Μέση ηλικία" })}</div>
                    <div style={{ fontWeight: 700 }}>{(selected as any).avg_age ?? "-"}</div>
                  </div>
                </div>

                <div className="grid cols2">
                  <div>
                    <div style={ui.label}>{t("map.malePct", { defaultValue: "% Άνδρες" })}</div>
                    <div style={{ fontWeight: 700 }}>{(selected as any).male_pct ?? 0}%</div>
                  </div>
                  <div>
                    <div style={ui.label}>{t("map.femalePct", { defaultValue: "% Γυναίκες" })}</div>
                    <div style={{ fontWeight: 700 }}>{(selected as any).female_pct ?? 0}%</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
