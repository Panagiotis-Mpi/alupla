import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { GeoJSON, MapContainer, Marker, useMapEvents } from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { getGraduatesMap, getPublicStudyPrograms, logPublicExport, type GraduatesMapItem, type StudyProgram } from "../lib/api";
import greeceRegionsRaw from "../assets/greece-regions.geojson?raw";
import { regionCities, type RegionCity } from "../data/regionCities";
import * as XLSX from "xlsx";

type AgeGroup = "" | "18-22" | "23-26" | "27-30" | "31+";

function cityLabelIcon(label: string) {
  return L.divIcon({
    className: "alupla-city-label-icon",
    html: `<span class="alupla-city-label-text">${label}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
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

function excelCellValue(v: any) {
  if (v === null || v === undefined || v === "") return "";
  return v;
}

function MapViewportWatcher({
  onZoomChange,
  onBoundsChange,
}: {
  onZoomChange: (zoom: number) => void;
  onBoundsChange: (bounds: L.LatLngBounds) => void;
}) {
  const map = useMapEvents({
    zoomend() {
      onZoomChange(map.getZoom());
      onBoundsChange(map.getBounds());
    },
    moveend() {
      onZoomChange(map.getZoom());
      onBoundsChange(map.getBounds());
    },
    resize() {
      onZoomChange(map.getZoom());
      onBoundsChange(map.getBounds());
    },
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
    onBoundsChange(map.getBounds());
  }, [map, onZoomChange, onBoundsChange]);

  return null;
}

export default function Map() {
  const { t, i18n } = useTranslation();

  const mapRef = useRef<L.Map | null>(null);

  const [year, setYear] = useState<string>("");
  const [studyProgramId, setStudyProgramId] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("");
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);
  const [mapZoom, setMapZoom] = useState(6.5);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<GraduatesMapItem[]>([]);
  const [selected, setSelected] = useState<GraduatesMapItem | null>(null);

  const geojson = useMemo(() => tryParseGeoJson(greeceRegionsRaw), []);

  useEffect(() => {
    if (!geojson || !mapRef.current) return;
    try {
      const layer = L.geoJSON(geojson as any);
      const bounds = layer.getBounds();
      if (bounds && bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [32, 32], maxZoom: 6.5 });
        setMapZoom(mapRef.current.getZoom());
        setMapBounds(mapRef.current.getBounds());
      }
    } catch {
    }
  }, [geojson]);

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
        graduation_year: opts?.year || undefined,
        study_program_id: opts?.studyProgramId || undefined,
        gender: opts?.gender || undefined,
        age_group: opts?.ageGroup || undefined,
      });
      setItems(res?.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMap();
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const res = await getPublicStudyPrograms();
        if (!active) return;
        setStudyPrograms(Array.isArray(res?.items) ? res.items : []);
      } catch {
        if (!active) return;
        setStudyPrograms([]);
      }
    })();

    return () => {
      active = false;
    };
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

    fetchMap();
  }

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

  const visibleCities = useMemo(() => {
    const grouped = new Map<string, RegionCity[]>();

    for (const city of regionCities) {
      const key = normalizeKey(city.region);
      const list = grouped.get(key) || [];
      list.push(city);
      grouped.set(key, list);
    }

    const expanded = mapZoom >= 7;
    const next: RegionCity[] = [];

    grouped.forEach((list) => {
      const sorted = [...list].sort((a, b) => b.population - a.population);

      if (!expanded) {
        if (sorted[0]) next.push(sorted[0]);
        return;
      }

      const insideBounds = mapBounds
        ? sorted.filter((city) => mapBounds.contains(L.latLng(city.lat, city.lng)))
        : sorted;

      next.push(...(insideBounds.length ? insideBounds : sorted).slice(0, 3));
    });

    return next;
  }, [mapBounds, mapZoom]);

  const selectedRegionCities = useMemo(() => {
    if (!selected) return [] as RegionCity[];
    const key = normalizeKey(String((selected as any).periphery_name || ""));
    return regionCities
      .filter((city) => normalizeKey(city.region) === key)
      .sort((a, b) => b.population - a.population)
      .slice(0, 3);
  }, [selected]);

  async function onExportExcel() {
    const res = await getGraduatesMap({
      graduation_year: year || undefined,
      study_program_id: studyProgramId || undefined,
      gender: gender || undefined,
      age_group: ageGroup || undefined,
    });

    const exportItems = res?.items ?? [];
    const rows = [
      [
        t("map.export.periphery", { defaultValue: "Περιφέρεια" }),
        t("map.export.count", { defaultValue: "Απόφοιτοι" }),
        t("map.export.avgAge", { defaultValue: "Μέση Ηλικία" }),
        t("map.export.malePct", { defaultValue: "% Άνδρες" }),
        t("map.export.femalePct", { defaultValue: "% Γυναίκες" }),
      ],
      ...exportItems.map((it) => [
        excelCellValue((it as any).periphery_name ?? ""),
        excelCellValue((it as any).count ?? 0),
        excelCellValue((it as any).avg_age ?? ""),
        excelCellValue((it as any).male_pct ?? ""),
        excelCellValue((it as any).female_pct ?? ""),
      ]),
    ];

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = [
      { wch: 28 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Χάρτης");

    const output = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
      compression: true,
    });

    const blob = new Blob([output], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const fileName = year
      ? `alupla_graduates_map_peripheries_${year}.xlsx`
      : "alupla_graduates_map_peripheries.xlsx";

    downloadBlob(fileName, blob);

    try {
      await logPublicExport("map_export", "xlsx");
    } catch {
    }
  }

  function legendBuckets(max: number) {
    const m = Math.max(1, max);
    const b1 = Math.ceil(m * 0.2);
    const b2 = Math.ceil(m * 0.4);
    const b3 = Math.ceil(m * 0.6);
    const b4 = Math.ceil(m * 0.8);
    return [0, b1, b2, b3, b4, m];
  }

  const buckets = useMemo(() => legendBuckets(maxCount), [maxCount]);

  const geoRenderKey = useMemo(() => {
    return `${i18n.language}:${items.length}:${maxCount}`;
  }, [i18n.language, items.length, maxCount]);

  return (
    <div className="container">
      <style>{`
        .leaflet-container path:focus { outline: none !important; }
        .leaflet-interactive:focus { outline: none !important; }
        .leaflet-container:focus { outline: none !important; }
        .alupla-map .leaflet-container { background: transparent !important; }
        .alupla-map-card { padding: 0; overflow: hidden; position: relative; }
        .alupla-city-label-icon { background: transparent !important; border: 0 !important; }
        .alupla-city-label-text {
          color: #1e293b;
          font-size: 12px;
          font-weight: 600;
          line-height: 1;
          white-space: nowrap;
          text-shadow: 0 1px 2px rgba(255,255,255,.95), 0 0 6px rgba(255,255,255,.9);
          transform: translate(-50%, -50%);
          display: inline-block;
          pointer-events: none;
        }
      `}</style>

      <div className="topbar">
        <h2 style={{ margin: 0 }}>{t("map.title", { defaultValue: "Χάρτης αποφοίτων" })}</h2>
        <span className="badge">
          {loading
            ? t("common.loading", { defaultValue: "Φόρτωση..." })
            : `${t("common.ready", { defaultValue: "" })}  ${t("map.totalInline", { defaultValue: "Σύνολο" })}: ${total}`}
        </span>
        <div className="spacer" />
        <button className="btn" type="button" onClick={onExportExcel} disabled={loading || items.length === 0}>
          {t("map.exportExcel", { defaultValue: "Export Excel" })}
        </button>
      </div>

      <div className="page-two-col" style={{ marginTop: 12 }}>
        <div className="card alupla-map-card">
          <div className="alupla-map map-canvas">
            <MapContainer
              center={[38.6, 24.0]}
              zoom={6.5 as any}
              zoomSnap={0.5}
              whenCreated={(m) => {
                mapRef.current = m;
                setMapZoom(m.getZoom());
                setMapBounds(m.getBounds());
              }}
              style={{ height: "100%", width: "100%", background: "transparent" }}
              scrollWheelZoom
            >
              <MapViewportWatcher onZoomChange={setMapZoom} onBoundsChange={setMapBounds} />

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

              {visibleCities.map((city) => (
                <Marker
                  key={`${city.region}-${city.nameEl}`}
                  position={[city.lat, city.lng]}
                  icon={cityLabelIcon(i18n.language?.toLowerCase().startsWith("en") ? city.nameEn : city.nameEl)}
                  interactive={false}
                />
              ))}
            </MapContainer>
          </div>

          <div
            style={{
              position: "absolute",
              left: 12,
              bottom: 12,
              background: "rgba(255,255,255,.94)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "10px 12px",
              fontSize: 12,
              boxShadow: "var(--shadow)",
              maxWidth: 220,
            }}
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

        <div className="map-panel-stack">
          <div className="card">
            <div className="grid cols2" style={{ alignItems: "end" }}>
              <div>
                <label className="label">{t("map.filters.year", { defaultValue: "Έτος αποφοίτησης" })}</label>
                <input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder={t("map.filters.yearPh", { defaultValue: "π.χ. 2026" })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">{t("map.filters.studyProgram", { defaultValue: "Πρόγραμμα Σπουδών" })}</label>
                <select className="input" value={studyProgramId} onChange={(e) => setStudyProgramId(e.target.value)}>
                  <option value="">{t("common.all", { defaultValue: "Όλα" })}</option>
                  {studyPrograms.map((program) => (
                    <option key={program.id} value={String(program.id)}>
                      {i18n.language?.toLowerCase().startsWith("en")
                        ? program.name_en || program.name_el || program.code
                        : program.name_el || program.name_en || program.code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">{t("map.filters.gender", { defaultValue: "Φύλο" })}</label>
                <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="">{t("common.all", { defaultValue: "Όλα" })}</option>
                  <option value="M">{t("common.male", { defaultValue: "Άνδρας" })}</option>
                  <option value="F">{t("common.female", { defaultValue: "Γυναίκα" })}</option>
                </select>
              </div>

              <div>
                <label className="label">{t("map.filters.ageGroup", { defaultValue: "Ηλικιακή ομάδα" })}</label>
                <select className="input" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}>
                  <option value="">{t("common.all", { defaultValue: "Όλα" })}</option>
                  <option value="18-22">18-22</option>
                  <option value="23-26">23-26</option>
                  <option value="27-30">27-30</option>
                  <option value="31+">31+</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <button className="btn primary" type="button" onClick={onApply} disabled={loading}>
                {t("common.apply", { defaultValue: "Εφαρμογή" })}
              </button>
              <button className="btn" type="button" onClick={onReset} disabled={loading}>
                {t("common.reset", { defaultValue: "Reset" })}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>{t("map.detailsTitle", { defaultValue: "Λεπτομέρειες" })}</h3>
            {!selected ? (
              <div className="muted">{t("map.detailsHint", { defaultValue: "Κάνε κλικ σε μία περιφέρεια για λεπτομέρειες." })}</div>
            ) : (
              <div className="grid" style={{ gap: 10 }}>
                <div>
                  <label className="label">{t("map.region", { defaultValue: "Περιφέρεια" })}</label>
                  <div style={{ fontWeight: 700 }}>{(selected as any).periphery_name}</div>
                </div>

                <div className="grid cols2">
                  <div>
                    <label className="label">{t("map.totalLabel", { defaultValue: "Σύνολο" })}</label>
                    <div style={{ fontWeight: 700 }}>{(selected as any).count ?? 0}</div>
                  </div>
                  <div>
                    <label className="label">{t("map.avgAge", { defaultValue: "Μέση ηλικία" })}</label>
                    <div style={{ fontWeight: 700 }}>{(selected as any).avg_age ?? "-"}</div>
                  </div>
                </div>

                <div className="grid cols2">
                  <div>
                    <label className="label">{t("map.malePct", { defaultValue: "% Άνδρες" })}</label>
                    <div style={{ fontWeight: 700 }}>{(selected as any).male_pct ?? 0}%</div>
                  </div>
                  <div>
                    <label className="label">{t("map.femalePct", { defaultValue: "% Γυναίκες" })}</label>
                    <div style={{ fontWeight: 700 }}>{(selected as any).female_pct ?? 0}%</div>
                  </div>
                </div>

                {selectedRegionCities.length > 0 ? (
                  <div>
                    <label className="label">{t("map.cities", { defaultValue: "Πόλεις" })}</label>
                    <div style={{ display: "grid", gap: 8 }}>
                      {selectedRegionCities.map((city) => (
                        <div
                          key={`${city.region}-${city.nameEl}-details`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            padding: "8px 10px",
                            border: "1px solid var(--border)",
                            borderRadius: 12,
                            background: "rgba(248,250,252,.8)",
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>
                            {i18n.language?.toLowerCase().startsWith("en") ? city.nameEn : city.nameEl}
                          </div>
                          <div className="muted">{city.population.toLocaleString(i18n.language === "en" ? "en-US" : "el-GR")}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
