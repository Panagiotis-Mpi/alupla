import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { GeoJSON, MapContainer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as XLSX from "xlsx";

import {
  logPublicExport,
  type GraduatesMapItem,
} from "../lib/api";
import greeceRegionsRaw from "../assets/greece-regions.geojson?raw";
import { DetailStatsCard, Field, FilterSection, MapViewportWatcher, RangeField } from "./map/shared";
import { excelCellValue, exportCsvText, exportElementAsPng, exportWorkbook } from "./map/mapExport";
import { useMapData, useMapLookups, useVisibleCities } from "./map/hooks";
import { EMPTY_FILTERS, type FiltersState } from "./map/types";
import {
  cityLabelIcon,
  createMapParams,
  fillColorForCount,
  fillOpacityForCount,
  legendBuckets,
  mapCityKey,
  mapCityLabel,
  mapCityLatitude,
  mapCityLongitude,
  normalizeKey,
  tryParseGeoJson,
} from "./map/utils";

export default function Map() {
  const { t, i18n } = useTranslation();

  const mapRef = useRef<L.Map | null>(null);
  const mapCanvasRef = useRef<HTMLDivElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const { studyPrograms, programDirections, regions } = useMapLookups();
  const [mapZoom, setMapZoom] = useState(6.5);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [selected, setSelected] = useState<GraduatesMapItem | null>(null);
  const {
    loading,
    items,
    cityPoints,
    cityStatsLoading,
    selectedCityStats,
    setSelectedCityStats,
    fetchMap,
  } = useMapData(params, selected?.periphery_id);

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

  const activeLang = (i18n.resolvedLanguage || i18n.language || "gr").toLowerCase().startsWith("en") ? "en" : "gr";

  const availableDirections = useMemo(() => {
    if (!filters.study_program_id) return programDirections;
    return programDirections.filter((item) => Number((item as any).study_program_id) === Number(filters.study_program_id));
  }, [filters.study_program_id, programDirections]);

  const params = useMemo(() => createMapParams(filters), [filters]);

  const countsByGreekName = useMemo(() => {
    const next = new (globalThis as any).Map<string, number>();
    for (const it of items) next.set(normalizeKey(String((it as any).periphery_name ?? "")), Number((it as any).count ?? 0) || 0);
    return next;
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


  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!exportMenuRef.current) return;
      if (exportMenuRef.current.contains(e.target as Node)) return;
      setShowExportMenu(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);


  function updateFilter<K extends keyof FiltersState>(key: K, value: FiltersState[K]) {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "study_program_id") next.program_direction_id = "";
      return next;
    });
  }

  async function onApply() {
    await fetchMap(params);
  }

  function onReset() {
    setFilters(EMPTY_FILTERS);
    setSelected(null);
    setSelectedCityStats([]);
    fetchMap({});
  }

  const fillColors = ["#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#2563eb"];

  function featureGreekName(feature: any): string {
    const p = feature?.properties || {};
    return String(p.name_greek || p.name_el || p.name || p.NAME || "");
  }

  function featureDisplayName(feature: any): string {
    const p = feature?.properties || {};
    if (activeLang === "en") return String(p.name_en || p.name || p.NAME || p.name_greek || "");
    return featureGreekName(feature);
  }

  function currentCountForFeature(feature: any): number {
    return countsRef.current.get(normalizeKey(featureGreekName(feature))) ?? 0;
  }

  function renderTooltipHtml(feature: any): string {
    const label = featureDisplayName(feature);
    const c = currentCountForFeature(feature);
    const totalLabel = t("map.total", { total: c, defaultValue: "Σύνολο: {{total}}" });
    return `<div class="alupla-region-tip-title">${label}</div><div class="alupla-region-tip-sub">${totalLabel}</div>`;
  }

  const total = useMemo(() => items.reduce((s, it: any) => s + (Number(it.count) || 0), 0), [items]);

  const visibleCities = useVisibleCities(cityPoints, mapBounds, mapZoom);

  function currentFilterRows() {
    const regionName = regions.find((item) => String((item as any).id) === filters.origin_region_id)?.name || "";
    const program = studyPrograms.find((item) => String((item as any).id) === filters.study_program_id);
    const direction = programDirections.find((item) => String((item as any).id) === filters.program_direction_id);
    return [
      [t("graduates.filters.adCode", { defaultValue: "Α.Δ." }), filters.ad_code_like],
      [t("graduates.filters.studentNumber", { defaultValue: "Α.Μ." }), filters.student_number_like],
      [t("graduates.filters.lastName", { defaultValue: "Επώνυμο" }), filters.last_name_like],
      [t("graduates.filters.firstName", { defaultValue: "Όνομα" }), filters.first_name_like],
      [t("graduates.filters.fatherName", { defaultValue: "Πατρώνυμο" }), filters.father_name_like],
      [t("graduates.filters.gender", { defaultValue: "Φύλο" }), filters.gender === "M" ? t("common.male", { defaultValue: "Άνδρας" }) : filters.gender === "F" ? t("common.female", { defaultValue: "Γυναίκα" }) : ""],
      [t("graduates.filters.entryYear", { defaultValue: "Έτος εισαγωγής" }), [filters.entry_year_min, filters.entry_year_max].filter(Boolean).join(" - ")],
      [t("graduates.filters.birthYear", { defaultValue: "Έτος γέννησης" }), [filters.birth_year_min, filters.birth_year_max].filter(Boolean).join(" - ")],
      [t("graduates.filters.degreeGrade", { defaultValue: "Βαθμός πτυχίου" }), [filters.degree_grade_min, filters.degree_grade_max].filter(Boolean).join(" - ")],
      [t("map.filters.year", { defaultValue: "Έτος αποφοίτησης" }), filters.graduation_year],
      [t("graduates.filters.graduationDate", { defaultValue: "Ημερομηνία αποφοίτησης" }), [filters.graduation_date_from, filters.graduation_date_to].filter(Boolean).join(" - ")],
      [t("graduates.filters.oathDate", { defaultValue: "Ημερομηνία ορκωμοσίας" }), [filters.oath_date_from, filters.oath_date_to].filter(Boolean).join(" - ")],
      [t("map.filters.studyProgram", { defaultValue: "Πρόγραμμα Σπουδών" }), program ? (activeLang === "en" ? program.name_en || program.name_el || program.code : program.name_el || program.name_en || program.code) : ""],
      [t("graduates.filters.direction", { defaultValue: "Κατεύθυνση" }), direction ? (activeLang === "en" ? (direction as any).name_en || (direction as any).name_el || (direction as any).code : (direction as any).name_el || (direction as any).name_en || (direction as any).code) : ""],
      [t("graduates.filters.region", { defaultValue: "Περιφέρεια" }), regionName],
      [t("graduates.filters.city", { defaultValue: "Πόλη" }), filters.origin_municipality_like],
      [t("map.filters.ageGroup", { defaultValue: "Ηλικιακή ομάδα" }), filters.age_group],
    ].filter((row) => row[1]);
  }

  function exportRows() {
    return items.map((it: any) => ({
      [t("map.export.periphery", { defaultValue: "Περιφέρεια" })]: excelCellValue(it.periphery_name ?? ""),
      [t("map.export.count", { defaultValue: "Απόφοιτοι" })]: excelCellValue(it.count ?? 0),
      [t("map.export.avgAge", { defaultValue: "Μέση Ηλικία" })]: excelCellValue(it.avg_age ?? ""),
      [t("map.export.malePct", { defaultValue: "% Άνδρες" })]: excelCellValue(it.male_pct ?? ""),
      [t("map.export.femalePct", { defaultValue: "% Γυναίκες" })]: excelCellValue(it.female_pct ?? ""),
    }));
  }

  async function onExportExcel() {
    const workbook = XLSX.utils.book_new();
    const rows = exportRows();
    const filtersRows = currentFilterRows();

    const mapSheet = XLSX.utils.json_to_sheet(rows);
    mapSheet["!cols"] = [{ wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(workbook, mapSheet, "Map");

    const filtersSheet = XLSX.utils.aoa_to_sheet([
      [t("graduates.filters.toggle", { defaultValue: "Φίλτρα" }), t("common.value", { defaultValue: "Τιμή" })],
      ...filtersRows,
    ]);
    filtersSheet["!cols"] = [{ wch: 28 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(workbook, filtersSheet, "Filters");

    exportWorkbook("alupla_map_export.xlsx", workbook);

    try {
      await logPublicExport("map_export", "xlsx");
    } catch {
    }
  }

  async function onExportCsv() {
    const rows = exportRows();
    const filtersRows = currentFilterRows();
    const headers = Object.keys(rows[0] || {
      [t("map.export.periphery", { defaultValue: "Περιφέρεια" })]: "",
      [t("map.export.count", { defaultValue: "Απόφοιτοι" })]: "",
      [t("map.export.avgAge", { defaultValue: "Μέση Ηλικία" })]: "",
      [t("map.export.malePct", { defaultValue: "% Άνδρες" })]: "",
      [t("map.export.femalePct", { defaultValue: "% Γυναίκες" })]: "",
    });
    const esc = (value: any) => {
      const s = String(value ?? "");
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [
      `${esc(t("graduates.filters.toggle", { defaultValue: "Φίλτρα" }))},${esc(t("common.value", { defaultValue: "Τιμή" }))}`,
      ...filtersRows.map((row) => `${esc(row[0])},${esc(row[1])}`),
      "",
      headers.map(esc).join(","),
      ...rows.map((row) => headers.map((header) => esc((row as any)[header])).join(",")),
    ];
    exportCsvText("alupla_map_export.csv", lines.join("\n"));
    try {
      await logPublicExport("map_export", "csv");
    } catch {
    }
  }

  async function onExportPng() {
    if (!mapCanvasRef.current) return;
    await exportElementAsPng(mapCanvasRef.current, "alupla_map_export.png");
    try {
      await logPublicExport("map_export", "png");
    } catch {
    }
  }


  const buckets = useMemo(() => legendBuckets(maxCount), [maxCount]);
  const geoRenderKey = useMemo(() => `${i18n.language}:${items.length}:${maxCount}`, [i18n.language, items.length, maxCount]);

  return (
    <div className="container">
      <style>{`
        .leaflet-container path:focus { outline: none !important; }
        .leaflet-interactive:focus { outline: none !important; }
        .leaflet-container:focus { outline: none !important; }
        .alupla-map .leaflet-container { background: transparent !important; }
        .alupla-map-card { padding: 0; overflow: hidden; position: relative; }
        .alupla-city-label-icon { background: transparent !important; border: 0 !important; }
        .alupla-city-point {
          position: relative;
          display: block;
          width: 1px;
          height: 1px;
          overflow: visible;
          pointer-events: none;
        }
        .alupla-city-label-text {
          position: absolute;
          left: 50%;
          bottom: 7px;
          transform: translateX(-50%);
          color: #1e293b;
          font-size: 12px;
          font-weight: 600;
          line-height: 1;
          white-space: nowrap;
          text-shadow: 0 1px 2px rgba(255,255,255,.95), 0 0 6px rgba(255,255,255,.9);
          display: inline-block;
        }
        .alupla-city-label-dot {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: #1e293b;
          box-shadow: 0 0 0 2px rgba(255,255,255,.92);
          display: inline-block;
        }
        .leaflet-tooltip.alupla-region-tooltip {
          background: rgba(248,250,252,.98);
          color: #0f172a;
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: var(--shadow);
          padding: 10px 12px;
        }
        .leaflet-tooltip.alupla-region-tooltip:before {
          border-top-color: var(--border);
        }
        .alupla-region-tip-title {
          font-weight: 700;
          margin-bottom: 4px;
        }
        .alupla-region-tip-sub {
          color: #64748b;
          font-size: 12px;
        }
        .map-export-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 220px;
          background: #ffffff;
          border: 1px solid var(--border);
          border-radius: 14px;
          box-shadow: 0 18px 40px rgba(15,23,42,.16);
          padding: 8px;
          z-index: 3000;
          display: grid;
          gap: 6px;
          opacity: 1;
          backdrop-filter: none;
        }
        .map-export-item {
          width: 100%;
          border: 0;
          background: transparent;
          text-align: left;
          padding: 10px 12px;
          border-radius: 10px;
          cursor: pointer;
          font: inherit;
        }
        .map-export-item:hover {
          background: #f8fafc;
        }
        .map-page-title-row {
          align-items: baseline;
        }
        .map-actions-bar {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          width: 100%;
          position: relative;
        }
        .map-actions-bar > div {
          min-width: 0;
        }
        .map-action-button {
          width: 100%;
          min-height: 48px;
          font-size: 16px;
        }
        .map-filters-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.2);
          border: 0;
          z-index: 1190;
        }
        .map-filters-modal {
          position: fixed;
          top: 108px;
          left: 50%;
          transform: translateX(-50%);
          width: min(980px, calc(100vw - 72px));
          max-height: calc(100vh - 160px);
          overflow: auto;
          z-index: 1200;
          padding: 16px;
          display: grid;
          gap: 14px;
        }
        .map-filters-modal .label {
          font-size: 12px;
        }
        .map-filters-grid {
          display: grid;
          gap: 14px;
        }
        .map-filters-grid input,
        .map-filters-grid select {
          min-height: 42px;
        }
        @media (max-width: 900px) {
          .map-filters-modal {
            top: 88px;
            width: calc(100vw - 24px);
            max-height: calc(100vh - 112px);
            padding: 14px;
          }
        }
        @media (max-width: 640px) {
          .map-page-title-row {
            align-items: flex-start;
            gap: 10px;
          }
          .map-actions-bar {
            grid-template-columns: 1fr 1fr;
          }
          .map-filters-modal {
            top: 76px;
            width: calc(100vw - 16px);
            max-height: calc(100vh - 88px);
            padding: 12px;
          }
          .map-filters-modal section > div:last-child {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="topbar map-page-title-row" style={{ alignItems: "baseline", gap: 18 }}>
        <h2 style={{ margin: 0, lineHeight: 1, display: "flex", alignItems: "baseline" }}>{t("map.title", { defaultValue: "Χάρτης αποφοίτων" })}</h2>
        <span className="badge" style={{ display: "inline-flex", alignItems: "baseline", lineHeight: 1, paddingTop: 0, paddingBottom: 0 }}>
          {loading ? t("common.loading", { defaultValue: "Φόρτωση..." }) : `${t("map.totalInline", { defaultValue: "Σύνολο" })}: ${total}`}
        </span>
      </div>

      <div className="page-two-col" style={{ marginTop: 12 }}>
        <div className="card alupla-map-card">
          <div className="alupla-map map-canvas" ref={mapCanvasRef}>
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
                      fillColor: fillColorForCount(c, maxCount, fillColors),
                      fillOpacity: fillOpacityForCount(c),
                    } as any;
                  }}
                  onEachFeature={(feature: any, layer: any) => {
                    layer.bindTooltip(renderTooltipHtml(feature), { sticky: true, className: "alupla-region-tooltip" });
                    layer.on({
                      mouseover: () => {
                        layer.setStyle({ weight: 2 });
                        layer.bringToFront();
                        layer.setTooltipContent(renderTooltipHtml(feature));
                      },
                      mouseout: () => {
                        layer.setStyle({ weight: 1 });
                      },
                      click: () => {
                        const key = normalizeKey(featureGreekName(feature));
                        const match = itemsRef.current.find((it: any) => normalizeKey(String(it.periphery_name || "")) === key) || null;
                        setSelected(match);
                        layer.setTooltipContent(renderTooltipHtml(feature));
                      },
                    });
                  }}
                />
              ) : null}

              {visibleCities.map((city) => {
                const lat = mapCityLatitude(city);
                const lng = mapCityLongitude(city);
                if (lat === null || lng === null) return null;
                return (
                  <Marker
                    key={mapCityKey(city)}
                    position={[lat, lng]}
                    icon={cityLabelIcon(mapCityLabel(city))}
                    interactive={false}
                  />
                );
              })}
            </MapContainer>
          </div>

          <div style={{ position: "absolute", left: 12, bottom: 12, background: "rgba(255,255,255,.94)", border: "1px solid var(--border)", borderRadius: 14, padding: "10px 12px", fontSize: 12, boxShadow: "var(--shadow)", maxWidth: 220 }}>
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
                const color = fillColorForCount(mid, maxCount, fillColors);
                return (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 16, height: 12, display: "inline-block", border: "1px solid #334155", background: color, opacity, borderRadius: 3 }} />
                    <span>{from}–{to}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="map-panel-stack">
          <div className="map-actions-bar">
            <div style={{ position: "relative" }} ref={exportMenuRef}>
              <button className="btn map-action-button" type="button" onClick={() => setShowExportMenu((prev) => !prev)} disabled={loading || items.length === 0}>
                {t("common.export", { defaultValue: "Export" })}
              </button>
              {showExportMenu ? (
                <div className="map-export-menu">
                  <button className="map-export-item" type="button" onClick={() => { setShowExportMenu(false); void onExportPng(); }}>
                    {t("map.exportPng", { defaultValue: "Export map as PNG" })}
                  </button>
                  <button className="map-export-item" type="button" onClick={() => { setShowExportMenu(false); void onExportExcel(); }}>
                    {t("map.exportExcel", { defaultValue: "Export Excel" })}
                  </button>
                  <button className="map-export-item" type="button" onClick={() => { setShowExportMenu(false); void onExportCsv(); }}>
                    {t("map.exportCsv", { defaultValue: "Export CSV" })}
                  </button>
                </div>
              ) : null}
            </div>
            <button className="btn map-action-button" type="button" onClick={() => setShowFilters((prev) => !prev)}>
              {showFilters ? t("common.hide", { defaultValue: "Απόκρυψη" }) : t("graduates.filters.toggle", { defaultValue: "Φίλτρα" })}
            </button>
          </div>

          {showFilters ? (
            <>
              <button className="map-filters-overlay" type="button" aria-label={t("common.close", { defaultValue: "Κλείσιμο" })} onClick={() => setShowFilters(false)} />
              <div className="card map-filters-modal">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <h3 style={{ margin: 0 }}>{t("graduates.filters.toggle", { defaultValue: "Φίλτρα" })}</h3>
                  <button className="btn" type="button" onClick={() => setShowFilters(false)}>
                    {t("common.hide", { defaultValue: "Απόκρυψη" })}
                  </button>
                </div>

                <div className="map-filters-grid">
                  <FilterSection title="">
                    <Field label={t("graduates.filters.adCode", { defaultValue: "Α.Δ." })} span={1}>
                      <input className="input" value={filters.ad_code_like} onChange={(e) => updateFilter("ad_code_like", e.target.value)} />
                    </Field>
                    <Field label={t("graduates.filters.studentNumber", { defaultValue: "Α.Μ." })} span={1}>
                      <input className="input" value={filters.student_number_like} onChange={(e) => updateFilter("student_number_like", e.target.value)} />
                    </Field>
                    <Field label={t("graduates.filters.lastName", { defaultValue: "Επώνυμο" })} span={1}>
                      <input className="input" value={filters.last_name_like} onChange={(e) => updateFilter("last_name_like", e.target.value)} />
                    </Field>
                    <Field label={t("graduates.filters.firstName", { defaultValue: "Όνομα" })} span={1}>
                      <input className="input" value={filters.first_name_like} onChange={(e) => updateFilter("first_name_like", e.target.value)} />
                    </Field>
                    <Field label={t("graduates.filters.fatherName", { defaultValue: "Πατρώνυμο" })} span={1}>
                      <input className="input" value={filters.father_name_like} onChange={(e) => updateFilter("father_name_like", e.target.value)} />
                    </Field>
                    <Field label={t("graduates.filters.city", { defaultValue: "Πόλη" })} span={1}>
                      <input className="input" value={filters.origin_municipality_like} onChange={(e) => updateFilter("origin_municipality_like", e.target.value)} />
                    </Field>
                  </FilterSection>

                  <FilterSection title="">
                    <Field label={t("graduates.filters.gender", { defaultValue: "Φύλο" })} span={1}>
                      <select className="input" value={filters.gender} onChange={(e) => updateFilter("gender", e.target.value)}>
                        <option value="">{t("common.all", { defaultValue: "Όλα" })}</option>
                        <option value="M">{t("common.male", { defaultValue: "Άνδρας" })}</option>
                        <option value="F">{t("common.female", { defaultValue: "Γυναίκα" })}</option>
                      </select>
                    </Field>
                    <RangeField label={t("graduates.filters.birthYear", { defaultValue: "Έτος γέννησης" })} fromLabel={t("graduates.filters.from", { defaultValue: "Από" })} toLabel={t("graduates.filters.to", { defaultValue: "Έως" })} fromValue={filters.birth_year_min} toValue={filters.birth_year_max} onFromChange={(value) => updateFilter("birth_year_min", value)} onToChange={(value) => updateFilter("birth_year_max", value)} type="number" span={1} />
                    <Field label={t("map.filters.ageGroup", { defaultValue: "Ηλικιακή ομάδα" })} span={1}>
                      <select className="input" value={filters.age_group} onChange={(e) => updateFilter("age_group", e.target.value as AgeGroup)}>
                        <option value="">{t("common.all", { defaultValue: "Όλα" })}</option>
                        <option value="23-26">23-26</option>
                        <option value="27-30">27-30</option>
                        <option value="31+">31+</option>
                      </select>
                    </Field>
                    <Field label={t("graduates.filters.region", { defaultValue: "Περιφέρεια" })} span={1}>
                      <select className="input" value={filters.origin_region_id} onChange={(e) => updateFilter("origin_region_id", e.target.value)}>
                        <option value="">{t("common.all", { defaultValue: "Όλα" })}</option>
                        {regions.map((region) => (
                          <option key={region.id} value={String(region.id)}>{region.name}</option>
                        ))}
                      </select>
                    </Field>
                  </FilterSection>

                  <FilterSection title="">
                    <RangeField label={t("graduates.filters.entryYear", { defaultValue: "Έτος εισαγωγής" })} fromLabel={t("graduates.filters.from", { defaultValue: "Από" })} toLabel={t("graduates.filters.to", { defaultValue: "Έως" })} fromValue={filters.entry_year_min} toValue={filters.entry_year_max} onFromChange={(value) => updateFilter("entry_year_min", value)} onToChange={(value) => updateFilter("entry_year_max", value)} type="number" span={1} />
                    <Field label={t("map.filters.year", { defaultValue: "Έτος αποφοίτησης" })} span={1}>
                      <input className="input" value={filters.graduation_year} onChange={(e) => updateFilter("graduation_year", e.target.value)} />
                    </Field>
                    <RangeField label={t("graduates.filters.degreeGrade", { defaultValue: "Βαθμός πτυχίου" })} fromLabel={t("graduates.filters.from", { defaultValue: "Από" })} toLabel={t("graduates.filters.to", { defaultValue: "Έως" })} fromValue={filters.degree_grade_min} toValue={filters.degree_grade_max} onFromChange={(value) => updateFilter("degree_grade_min", value)} onToChange={(value) => updateFilter("degree_grade_max", value)} type="number" step="0.1" span={1} />
                    <RangeField label={t("graduates.filters.graduationDate", { defaultValue: "Ημερομηνία αποφοίτησης" })} fromLabel={t("graduates.filters.from", { defaultValue: "Από" })} toLabel={t("graduates.filters.to", { defaultValue: "Έως" })} fromValue={filters.graduation_date_from} toValue={filters.graduation_date_to} onFromChange={(value) => updateFilter("graduation_date_from", value)} onToChange={(value) => updateFilter("graduation_date_to", value)} type="date" span={1} />
                    <RangeField label={t("graduates.filters.oathDate", { defaultValue: "Ημερομηνία ορκωμοσίας" })} fromLabel={t("graduates.filters.from", { defaultValue: "Από" })} toLabel={t("graduates.filters.to", { defaultValue: "Έως" })} fromValue={filters.oath_date_from} toValue={filters.oath_date_to} onFromChange={(value) => updateFilter("oath_date_from", value)} onToChange={(value) => updateFilter("oath_date_to", value)} type="date" span={1} />
                    <Field label={t("map.filters.studyProgram", { defaultValue: "Πρόγραμμα Σπουδών" })} span={1}>
                      <select className="input" value={filters.study_program_id} onChange={(e) => updateFilter("study_program_id", e.target.value)}>
                        <option value="">{t("common.all", { defaultValue: "Όλα" })}</option>
                        {studyPrograms.map((program) => (
                          <option key={program.id} value={String(program.id)}>
                            {activeLang === "en" ? program.name_en || program.name_el || program.code : program.name_el || program.name_en || program.code}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label={t("graduates.filters.direction", { defaultValue: "Κατεύθυνση" })} span={1}>
                      <select className="input" value={filters.program_direction_id} onChange={(e) => updateFilter("program_direction_id", e.target.value)}>
                        <option value="">{t("common.all", { defaultValue: "Όλα" })}</option>
                        {availableDirections.map((direction) => (
                          <option key={direction.id} value={String(direction.id)}>
                            {activeLang === "en" ? (direction as any).name_en || (direction as any).name_el || (direction as any).code : (direction as any).name_el || (direction as any).name_en || (direction as any).code}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </FilterSection>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button className="btn" type="button" onClick={onReset} disabled={loading}>
                    {t("common.reset", { defaultValue: "Reset" })}
                  </button>
                  <button className="btn primary" type="button" onClick={onApply} disabled={loading}>
                    {t("common.apply", { defaultValue: "Εφαρμογή" })}
                  </button>
                </div>
              </div>
            </>
          ) : null}

          <div className="card">
            <h3 style={{ marginTop: 0 }}>{t("map.detailsTitle", { defaultValue: "Λεπτομέρειες" })}</h3>
            {!selected ? (
              <div className="muted">{t("map.detailsHint", { defaultValue: "Κάνε κλικ σε μία περιφέρεια για λεπτομέρειες." })}</div>
            ) : (
              <div className="grid" style={{ gap: 10 }}>
                <DetailStatsCard
                  title={(selected as any).periphery_name}
                  total={(selected as any).count ?? 0}
                  avgAge={(selected as any).avg_age}
                  malePct={(selected as any).male_pct}
                  femalePct={(selected as any).female_pct}
                  avgGrade={(selected as any).avg_grade}
                  avgGraduationYears={(selected as any).avg_graduation_years}
                  totalText={t("map.total", { total: (selected as any).count ?? 0, defaultValue: "Σύνολο: {{total}}" })}
                  totalLabel={t("map.totalLabel", { defaultValue: "Σύνολο" })}
                  avgAgeLabel={t("map.avgAge", { defaultValue: "Μέση ηλικία" })}
                  malePctLabel={t("map.malePct", { defaultValue: "% Άνδρες" })}
                  femalePctLabel={t("map.femalePct", { defaultValue: "% Γυναίκες" })}
                  avgGradeLabel={t("map.avgGrade", { defaultValue: "Μέσος βαθμός" })}
                  avgGraduationYearsLabel={t("map.avgGraduationYears", { defaultValue: "Μέσος χρόνος αποφοίτησης" })}
                />

                {cityStatsLoading ? (
                    <div className="muted">{t("common.loading", { defaultValue: "Φόρτωση..." })}</div>
                  ) : selectedCityStats.length > 0 ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      <label className="label">{t("map.cities", { defaultValue: "Πόλεις" })}</label>
                      {selectedCityStats.map((city) => (
                        <DetailStatsCard
                          key={`${selected?.periphery_id}-${city.city}`}
                          title={city.city}
                          total={city.count}
                          avgAge={city.avg_age}
                          malePct={city.male_pct}
                          femalePct={city.female_pct}
                          avgGrade={city.avg_grade}
                          avgGraduationYears={city.avg_graduation_years}
                          totalText={t("map.total", { total: city.count ?? 0, defaultValue: "Σύνολο: {{total}}" })}
                          totalLabel={t("map.totalLabel", { defaultValue: "Σύνολο" })}
                          avgAgeLabel={t("map.avgAge", { defaultValue: "Μέση ηλικία" })}
                          malePctLabel={t("map.malePct", { defaultValue: "% Άνδρες" })}
                          femalePctLabel={t("map.femalePct", { defaultValue: "% Γυναίκες" })}
                          avgGradeLabel={t("map.avgGrade", { defaultValue: "Μέσος βαθμός" })}
                          avgGraduationYearsLabel={t("map.avgGraduationYears", { defaultValue: "Μέσος χρόνος αποφοίτησης" })}
                        />
                      ))}
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
