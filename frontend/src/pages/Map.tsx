import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import L from "leaflet";

import {
  getGraduatesMap,
  getMapCities,
  getMapFilterOptions,
  getRegionCitiesMap,
  type GraduatesMapItem,
  type MapCityPoint,
  type ProgramDirection,
  type Region,
  type RegionCityMapItem,
  type StudyProgram,
} from "../lib/api";
import greeceRegionsRaw from "../assets/greece-regions.geojson?raw";
import { MapCanvasCard } from "./map/MapCanvasCard";
import { buildMapFilterRows, exportElementAsPng, exportMapCsv, exportMapExcel } from "./map/mapExport";
import {
  DetailStatsCard,
  EMPTY_MAP_FILTERS,
  FilterSection,
  Field,
  RangeField,
  normalizeKey,
  tryParseGeoJson,
  type MapFiltersState,
  type AgeGroup,
} from "./map/shared";

const fillColors = ["#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#2563eb"];

function thresholdsForMax(max: number) {
  const safeMax = Math.max(1, max || 1);
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
    if (trimmed === undefined || trimmed === null || trimmed === "") return;
    params[key] = String(trimmed);
  });
  return params;
}

function countByPeriphery(items: GraduatesMapItem[]) {
  const counts = new globalThis.Map<string, number>();
  for (const item of items) {
    counts.set(normalizeKey(String(item.periphery_name ?? "")), Number(item.count ?? 0) || 0);
  }
  return counts;
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
      if (count > currentMax) currentMax = count;
    }
    return currentMax;
  }, [items]);
  const total = useMemo(() => items.reduce((sum, item) => sum + (Number(item.count) || 0), 0), [items]);
  const buckets = useMemo(() => thresholdsForMax(maxCount), [maxCount]);
  const geoRenderKey = useMemo(() => `${i18n.language}:${items.length}:${maxCount}`, [i18n.language, items.length, maxCount]);
  const availableDirections = useMemo(() => {
    if (!filters.study_program_id) return programDirections;
    return programDirections.filter((item) => Number(item.study_program_id) === Number(filters.study_program_id));
  }, [filters.study_program_id, programDirections]);
  const countsRef = useRef<Map<string, number>>(countsByGreekName);
  const itemsRef = useRef<GraduatesMapItem[]>(items);

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
      if (!exportMenuRef.current) return;
      if (exportMenuRef.current.contains(event.target as Node)) return;
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
    fetchMap({});
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
        if (active) setCityStatsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [params, selected?.periphery_id]);

  function updateFilter<K extends keyof MapFiltersState>(key: K, value: MapFiltersState[K]) {
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
    setFilters(EMPTY_MAP_FILTERS);
    setSelected(null);
    setSelectedCityStats([]);
    fetchMap({});
  }

  function currentFilterRows() {
    return buildMapFilterRows({ t, filters, activeLang, studyPrograms, programDirections, regions });
  }

  async function onExportExcel() {
    await exportMapExcel({ items, filtersRows: currentFilterRows(), t });
  }

  async function onExportCsv() {
    await exportMapCsv({ items, filtersRows: currentFilterRows(), t });
  }

  async function onExportPng() {
    if (!mapCanvasRef.current) return;
    await exportElementAsPng(mapCanvasRef.current, "alupla_map_export.png");
  }

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
        <MapCanvasCard
          mapCanvasRef={mapCanvasRef}
          mapRef={mapRef}
          geojson={geojson}
          geoRenderKey={geoRenderKey}
          items={items}
          itemsRef={itemsRef}
          cityPoints={cityPoints}
          mapBounds={mapBounds}
          mapZoom={mapZoom}
          buckets={buckets}
          activeLang={activeLang}
          t={t}
          onZoomChange={setMapZoom}
          onBoundsChange={setMapBounds}
          setSelected={setSelected}
          countsRef={countsRef}
          fillColors={fillColors}
        />

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
                        <option value="18-22">18-22</option>
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
                            {activeLang === "en" ? direction.name_en || direction.name_el || direction.code : direction.name_el || direction.name_en || direction.code}
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
