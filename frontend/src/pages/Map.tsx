import React, { useEffect, useMemo, useRef, useState } from "react";
import { GeoJSON, MapContainer, Marker, useMapEvents } from "react-leaflet";
import { useTranslation } from "react-i18next";
import L from "leaflet";

import {
  getGraduatesMap,
  getMapCities,
  getMapFilterOptions,
  getRegionCitiesMap,
  logPublicExport,
  type GraduatesMapItem,
  type MapCityPoint,
  type ProgramDirection,
  type Region,
  type RegionCityMapItem,
  type StudyProgram,
} from "../lib/api";
import greeceRegionsRaw from "../assets/greece-regions.geojson?raw";
import { buildMapFilterRows, exportElementAsPng, exportMapCsv, exportMapExcel } from "./map/mapExport";
import { DetailStatsCard, EMPTY_MAP_FILTERS, MapFiltersForm, cityLabelIcon, mapCityKey, mapCityLabel, mapCityLatitude, mapCityLongitude, normalizeKey, tryParseGeoJson, type MapFiltersState } from "./map/shared";

const fillColors = ["#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#2563eb"];

function thresholdsForMax(max: number) {
  const safeMax = Math.max(1, max || 1);
  const first = Math.ceil(safeMax * 0.2);
  const second = Math.ceil(safeMax * 0.4);
  const third = Math.ceil(safeMax * 0.6);
  const fourth = Math.ceil(safeMax * 0.8);
  return [0, first, second, third, fourth, safeMax];
}

function legendBuckets(max: number) {
  const safeMax = Math.max(1, max);
  const first = Math.ceil(safeMax * 0.2);
  const second = Math.ceil(safeMax * 0.4);
  const third = Math.ceil(safeMax * 0.6);
  const fourth = Math.ceil(safeMax * 0.8);
  return [0, first, second, third, fourth, safeMax];
}

function buildParams(filters: MapFiltersState) {
  const params: Record<string, string> = {};
  Object.entries(filters).forEach(([key, value]) => {
    const trimmed = typeof value === "string" ? value.trim() : value;
    if (trimmed === undefined || trimmed === null || trimmed === "") {
      return;
    }
    params[key] = String(trimmed);
  });
  return params;
}

function countByPeriphery(items: GraduatesMapItem[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(normalizeKey(String(item.periphery_name ?? "")), Number(item.count ?? 0) || 0);
  }
  return counts;
}


function MapViewportWatcher(props: {
  onZoomChange: (zoom: number) => void;
  onBoundsChange: (bounds: L.LatLngBounds) => void;
}) {
  const map = useMapEvents({
    zoomend() {
      props.onZoomChange(map.getZoom());
      props.onBoundsChange(map.getBounds());
    },
    moveend() {
      props.onZoomChange(map.getZoom());
      props.onBoundsChange(map.getBounds());
    },
    resize() {
      props.onZoomChange(map.getZoom());
      props.onBoundsChange(map.getBounds());
    },
  });

  useEffect(() => {
    props.onZoomChange(map.getZoom());
    props.onBoundsChange(map.getBounds());
  }, [map, props.onBoundsChange, props.onZoomChange]);

  return null;
}

function visibleMapCities(cityPoints: MapCityPoint[], mapBounds: L.LatLngBounds | null, mapZoom: number) {
  const grouped = new Map<string, MapCityPoint[]>();

  for (const city of cityPoints) {
    const lat = Number(city.latitude);
    const lng = Number(city.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }
    const key = normalizeKey(city.periphery_name);
    const current = grouped.get(key) || [];
    current.push(city);
    grouped.set(key, current);
  }

  const expanded = mapZoom >= 7;
  const visible: MapCityPoint[] = [];

  grouped.forEach((list) => {
    const sorted = [...list].sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.city_name.localeCompare(b.city_name, "el");
    });

    if (!expanded) {
      if (sorted[0]) {
        visible.push(sorted[0]);
      }
      return;
    }

    const inBounds = mapBounds
      ? sorted.filter((city) => mapBounds.contains(L.latLng(Number(city.latitude), Number(city.longitude))))
      : sorted;

    visible.push(...(inBounds.length ? inBounds : sorted).slice(0, 3));
  });

  return visible;
}

export default function Map() {
  const { t, i18n } = useTranslation();

  const mapRef = useRef<L.Map | null>(null);
  const mapCanvasRef = useRef<HTMLDivElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  const [filters, setFilters] = useState<MapFiltersState>(EMPTY_MAP_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);
  const [programDirections, setProgramDirections] = useState<ProgramDirection[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [mapZoom, setMapZoom] = useState(6.5);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<GraduatesMapItem[]>([]);
  const [cityPoints, setCityPoints] = useState<MapCityPoint[]>([]);
  const [selected, setSelected] = useState<GraduatesMapItem | null>(null);
  const [selectedCityStats, setSelectedCityStats] = useState<RegionCityMapItem[]>([]);
  const [cityStatsLoading, setCityStatsLoading] = useState(false);

  const geojson = useMemo(() => tryParseGeoJson(greeceRegionsRaw), []);
  const activeLang: "gr" | "en" = (i18n.resolvedLanguage || i18n.language || "gr").toLowerCase().startsWith("en") ? "en" : "gr";
  const params = useMemo(() => buildParams(filters), [filters]);
  const countsByGreekName = useMemo(() => countByPeriphery(items), [items]);
  const maxCount = useMemo(() => {
    let currentMax = 1;
    for (const item of items) {
      const count = Number(item.count ?? 0) || 0;
      if (count > currentMax) {
        currentMax = count;
      }
    }
    return currentMax;
  }, [items]);
  const total = useMemo(() => items.reduce((sum, item) => sum + (Number(item.count) || 0), 0), [items]);
  const buckets = useMemo(() => legendBuckets(maxCount), [maxCount]);
  const geoRenderKey = useMemo(() => `${i18n.language}:${items.length}:${maxCount}`, [i18n.language, items.length, maxCount]);
  const visibleCities = useMemo(() => visibleMapCities(cityPoints, mapBounds, mapZoom), [cityPoints, mapBounds, mapZoom]);
  const availableDirections = useMemo(() => {
    if (!filters.study_program_id) {
      return programDirections;
    }
    return programDirections.filter((item) => Number(item.study_program_id) === Number(filters.study_program_id));
  }, [filters.study_program_id, programDirections]);
  const countsRef = useRef<Map<string, number>>(countsByGreekName);
  const itemsRef = useRef<GraduatesMapItem[]>(items);

  useEffect(() => {
    if (!geojson || !mapRef.current) {
      return;
    }
    try {
      const layer = L.geoJSON(geojson as any);
      const bounds = layer.getBounds();
      if (bounds && bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [32, 32], maxZoom: 6.5 });
        setMapZoom(mapRef.current.getZoom());
        setMapBounds(mapRef.current.getBounds());
      }
    } catch {}
  }, [geojson]);

  useEffect(() => {
    countsRef.current = countsByGreekName;
  }, [countsByGreekName]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await getMapFilterOptions();
        if (!active) return;
        setStudyPrograms(Array.isArray(response?.studyPrograms) ? response.studyPrograms : []);
        setProgramDirections(Array.isArray(response?.programDirections) ? response.programDirections : []);
        setRegions(Array.isArray(response?.regions) ? response.regions : []);
      } catch {
        if (!active) return;
        setStudyPrograms([]);
        setProgramDirections([]);
        setRegions([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!exportMenuRef.current) {
        return;
      }
      if (exportMenuRef.current.contains(event.target as Node)) {
        return;
      }
      setShowExportMenu(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function fetchMap(nextParams?: Record<string, string>) {
    setLoading(true);
    setSelected(null);
    setSelectedCityStats([]);
    try {
      const [mapResponse, citiesResponse] = await Promise.all([
        getGraduatesMap(nextParams ?? params),
        getMapCities(nextParams ?? params),
      ]);
      setItems(Array.isArray(mapResponse?.items) ? mapResponse.items : []);
      setCityPoints(Array.isArray(citiesResponse?.items) ? citiesResponse.items : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchMap({});
  }, []);

  useEffect(() => {
    if (!selected?.periphery_id) {
      setSelectedCityStats([]);
      return;
    }

    let active = true;
    setCityStatsLoading(true);

    (async () => {
      try {
        const response = await getRegionCitiesMap({ ...params, periphery_id: selected.periphery_id });
        if (!active) return;
        setSelectedCityStats(Array.isArray(response?.items) ? response.items : []);
      } catch {
        if (!active) return;
        setSelectedCityStats([]);
      } finally {
        if (active) {
          setCityStatsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [params, selected?.periphery_id]);

  function updateFilter<K extends keyof MapFiltersState>(key: K, value: MapFiltersState[K]) {
    setFilters((current) => {
      const next = { ...current, [key]: value };
      if (key === "study_program_id") {
        next.program_direction_id = "";
      }
      return next;
    });
  }

  function fillColorForCount(count: number) {
    const thresholds = thresholdsForMax(maxCount);
    let bucketIndex = 4;
    for (let index = 0; index < 5; index += 1) {
      const from = thresholds[index];
      const to = thresholds[index + 1];
      if (count >= from && count <= to) {
        bucketIndex = index;
        break;
      }
    }
    return fillColors[Math.max(0, Math.min(fillColors.length - 1, bucketIndex))];
  }

  function fillOpacityForCount(count: number) {
    return count <= 0 ? 0.18 : 0.75;
  }

  function featureGreekName(feature: any): string {
    const properties = feature?.properties || {};
    return String(properties.name_greek || properties.name_el || properties.name || properties.NAME || "");
  }

  function featureDisplayName(feature: any): string {
    const properties = feature?.properties || {};
    if (activeLang === "en") {
      return String(properties.name_en || properties.name || properties.NAME || properties.name_greek || "");
    }
    return featureGreekName(feature);
  }

  function currentCountForFeature(feature: any): number {
    return countsRef.current.get(normalizeKey(featureGreekName(feature))) ?? 0;
  }

  function renderTooltipHtml(feature: any): string {
    const label = featureDisplayName(feature);
    const count = currentCountForFeature(feature);
    const totalLabel = t("map.total", { total: count, defaultValue: "Σύνολο: {{total}}" });
    return `<div class="alupla-region-tip-title">${label}</div><div class="alupla-region-tip-sub">${totalLabel}</div>`;
  }

  async function onApply() {
    await fetchMap(params);
  }

  function onReset() {
    setFilters(EMPTY_MAP_FILTERS);
    setSelected(null);
    setSelectedCityStats([]);
    void fetchMap({});
  }

  async function onExportPng() {
    if (!mapCanvasRef.current) {
      return;
    }
    await exportElementAsPng(mapCanvasRef.current, "alupla_map_export.png");
    try {
      await logPublicExport("map_export", "png");
    } catch {}
  }

  const filterRows = useMemo(() => buildMapFilterRows({ t, filters, activeLang, studyPrograms, programDirections, regions }), [t, filters, activeLang, studyPrograms, programDirections, regions]);

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
              whenCreated={(map) => {
                mapRef.current = map;
                setMapZoom(map.getZoom());
                setMapBounds(map.getBounds());
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
                    const count = currentCountForFeature(feature);
                    return {
                      color: "#334155",
                      weight: 1,
                      fillColor: fillColorForCount(count),
                      fillOpacity: fillOpacityForCount(count),
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
                        const match = itemsRef.current.find((item) => normalizeKey(String(item.periphery_name || "")) === key) || null;
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
              {Array.from({ length: 5 }).map((_, index) => {
                const from = buckets[index];
                const to = buckets[index + 1];
                const mid = (from + to) / 2;
                const opacity = fillOpacityForCount(mid);
                const color = fillColorForCount(mid);
                return (
                  <div key={index} style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
              <button className="btn map-action-button" type="button" onClick={() => setShowExportMenu((current) => !current)} disabled={loading || items.length === 0}>
                {t("common.export", { defaultValue: "Export" })}
              </button>
              {showExportMenu ? (
                <div className="map-export-menu">
                  <button className="map-export-item" type="button" onClick={() => { setShowExportMenu(false); void onExportPng(); }}>
                    {t("map.exportPng", { defaultValue: "Export map as PNG" })}
                  </button>
                  <button className="map-export-item" type="button" onClick={() => { setShowExportMenu(false); void exportMapExcel({ items, filtersRows: filterRows, t }); }}>
                    {t("map.exportExcel", { defaultValue: "Export Excel" })}
                  </button>
                  <button className="map-export-item" type="button" onClick={() => { setShowExportMenu(false); void exportMapCsv({ items, filtersRows: filterRows, t }); }}>
                    {t("map.exportCsv", { defaultValue: "Export CSV" })}
                  </button>
                </div>
              ) : null}
            </div>
            <button className="btn map-action-button" type="button" onClick={() => setShowFilters((current) => !current)}>
              {showFilters ? t("common.hide", { defaultValue: "Απόκρυψη" }) : t("graduates.filters.toggle", { defaultValue: "Φίλτρα" })}
            </button>
          </div>

          {showFilters ? (
            <MapFiltersForm
              filters={filters}
              regions={regions}
              studyPrograms={studyPrograms}
              availableDirections={availableDirections}
              activeLang={activeLang}
              t={t}
              loading={loading}
              onClose={() => setShowFilters(false)}
              onApply={() => void onApply()}
              onReset={onReset}
              onChange={updateFilter}
            />
          ) : null}

          <div className="card">
            <h3 style={{ marginTop: 0 }}>{t("map.detailsTitle", { defaultValue: "Λεπτομέρειες" })}</h3>
            {!selected ? (
              <div className="muted">{t("map.detailsHint", { defaultValue: "Κάνε κλικ σε μία περιφέρεια για λεπτομέρειες." })}</div>
            ) : (
              <div className="grid" style={{ gap: 10 }}>
                <DetailStatsCard
                  title={selected.periphery_name}
                  total={selected.count ?? 0}
                  avgAge={selected.avg_age}
                  malePct={selected.male_pct}
                  femalePct={selected.female_pct}
                  avgGrade={selected.avg_grade}
                  avgGraduationYears={selected.avg_graduation_years}
                  totalText={t("map.total", { total: selected.count ?? 0, defaultValue: "Σύνολο: {{total}}" })}
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
                        key={`${selected.periphery_id}-${city.city}`}
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
