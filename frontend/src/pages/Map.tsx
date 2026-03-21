import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { GeoJSON, MapContainer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
import { regionCities, type RegionCity } from "../data/regionCities";
import * as XLSX from "xlsx";

type AgeGroup = "" | "18-22" | "23-26" | "27-30" | "31+";

type FiltersState = {
  ad_code_like: string;
  student_number_like: string;
  last_name_like: string;
  first_name_like: string;
  father_name_like: string;
  gender: string;
  entry_year_min: string;
  entry_year_max: string;
  birth_year_min: string;
  birth_year_max: string;
  degree_grade_min: string;
  degree_grade_max: string;
  graduation_year: string;
  graduation_date_from: string;
  graduation_date_to: string;
  oath_date_from: string;
  oath_date_to: string;
  study_program_id: string;
  program_direction_id: string;
  origin_region_id: string;
  origin_municipality_like: string;
  age_group: AgeGroup;
};

const EMPTY_FILTERS: FiltersState = {
  ad_code_like: "",
  student_number_like: "",
  last_name_like: "",
  first_name_like: "",
  father_name_like: "",
  gender: "",
  entry_year_min: "",
  entry_year_max: "",
  birth_year_min: "",
  birth_year_max: "",
  degree_grade_min: "",
  degree_grade_max: "",
  graduation_year: "",
  graduation_date_from: "",
  graduation_date_to: "",
  oath_date_from: "",
  oath_date_to: "",
  study_program_id: "",
  program_direction_id: "",
  origin_region_id: "",
  origin_municipality_like: "",
  age_group: "",
};

function cityLabelIcon(label: string) {
  return L.divIcon({
    className: "alupla-city-label-icon",
    html: `<span class="alupla-city-point"><span class="alupla-city-label-text">${label}</span><span class="alupla-city-label-dot"></span></span>`,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  });
}


function DetailStatsCard(props: {
  title: string;
  total: number | string;
  avgAge: number | string | null | undefined;
  malePct: number | string | null | undefined;
  femalePct: number | string | null | undefined;
  avgGrade: number | string | null | undefined;
  avgGraduationYears: number | string | null | undefined;
  totalText: string;
  totalLabel: string;
  avgAgeLabel: string;
  malePctLabel: string;
  femalePctLabel: string;
  avgGradeLabel: string;
  avgGraduationYearsLabel: string;
}) {
  return (
    <div style={{ padding: "14px", border: "1px solid var(--border)", borderRadius: 12, background: "rgba(248,250,252,.8)", display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontWeight: 700 }}>{props.title}</div>
        <div className="muted">{props.totalText}</div>
      </div>

      <div className="grid cols2">
        <div>
          <label className="label">{props.totalLabel}</label>
          <div style={{ fontWeight: 700 }}>{props.total}</div>
        </div>
        <div>
          <label className="label">{props.avgAgeLabel}</label>
          <div style={{ fontWeight: 700 }}>{props.avgAge ?? "-"}</div>
        </div>
        <div>
          <label className="label">{props.malePctLabel}</label>
          <div style={{ fontWeight: 700 }}>{props.malePct ?? 0}%</div>
        </div>
        <div>
          <label className="label">{props.femalePctLabel}</label>
          <div style={{ fontWeight: 700 }}>{props.femalePct ?? 0}%</div>
        </div>
        <div>
          <label className="label">{props.avgGradeLabel}</label>
          <div style={{ fontWeight: 700 }}>{props.avgGrade ?? "-"}</div>
        </div>
        <div>
          <label className="label">{props.avgGraduationYearsLabel}</label>
          <div style={{ fontWeight: 700 }}>{props.avgGraduationYears ?? "-"}</div>
        </div>
      </div>
    </div>
  );
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

function copyComputedStyles(source: Element, target: Element) {
  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);
  const computed = window.getComputedStyle(source as HTMLElement);
  const styleText = Array.from(computed)
    .map((name) => `${name}:${computed.getPropertyValue(name)};`)
    .join("");
  target.setAttribute("style", styleText);
  for (let i = 0; i < sourceChildren.length; i += 1) {
    if (targetChildren[i]) copyComputedStyles(sourceChildren[i], targetChildren[i]);
  }
}

async function exportElementAsPng(element: HTMLElement, filename: string) {
  const rect = element.getBoundingClientRect();
  const clone = element.cloneNode(true) as HTMLElement;
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  copyComputedStyles(element, clone);
  clone.style.margin = "0";
  clone.style.width = `${Math.ceil(rect.width)}px`;
  clone.style.height = `${Math.ceil(rect.height)}px`;

  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.width = `${Math.ceil(rect.width)}px`;
  wrapper.style.height = `${Math.ceil(rect.height)}px`;
  wrapper.style.background = "#ffffff";
  wrapper.appendChild(clone);

  const serialized = new XMLSerializer().serializeToString(wrapper);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(rect.width)}" height="${Math.ceil(rect.height)}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;

  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(rect.width * 2);
    canvas.height = Math.ceil(rect.height * 2);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("canvas_error"));
      return;
    }

    img.onload = () => {
      ctx.scale(2, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, Math.ceil(rect.width), Math.ceil(rect.height));
      ctx.drawImage(img, 0, 0, Math.ceil(rect.width), Math.ceil(rect.height));
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("blob_error"));
          return;
        }
        downloadBlob(filename, blob);
        resolve();
      }, "image/png");
    };

    img.onerror = () => reject(new Error("image_error"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

function Field(props: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div style={{ gridColumn: `span ${props.span ?? 4}`, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <label className="label">{props.label}</label>
      {props.children}
    </div>
  );
}

function FilterSection(props: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "grid", gap: props.title ? 10 : 0 }}>
      {props.title ? <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", letterSpacing: ".01em" }}>{props.title}</div> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>{props.children}</div>
    </section>
  );
}

function RangeField(props: {
  label: string;
  fromLabel: string;
  toLabel: string;
  fromValue: string;
  toValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  type?: string;
  min?: string;
  max?: string;
  step?: string;
  span?: number;
}) {
  return (
    <Field label={props.label} span={props.span}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label className="label" style={{ fontSize: 12, marginBottom: 6 }}>{props.fromLabel}</label>
          <input className="input" type={props.type ?? "text"} value={props.fromValue} min={props.min} max={props.max} step={props.step} onChange={(e) => props.onFromChange(e.target.value)} />
        </div>
        <div>
          <label className="label" style={{ fontSize: 12, marginBottom: 6 }}>{props.toLabel}</label>
          <input className="input" type={props.type ?? "text"} value={props.toValue} min={props.min} max={props.max} step={props.step} onChange={(e) => props.onToChange(e.target.value)} />
        </div>
      </div>
    </Field>
  );
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
  const mapCanvasRef = useRef<HTMLDivElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
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

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => {
      const trimmed = typeof value === "string" ? value.trim() : value;
      if (trimmed === undefined || trimmed === null || trimmed === "") return;
      p[key] = String(trimmed);
    });
    return p;
  }, [filters]);

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
    let active = true;
    (async () => {
      try {
        const res = await getMapFilterOptions();
        if (!active) return;
        setStudyPrograms(Array.isArray(res?.studyPrograms) ? res.studyPrograms : []);
        setProgramDirections(Array.isArray(res?.programDirections) ? res.programDirections : []);
        setRegions(Array.isArray(res?.regions) ? res.regions : []);
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
    function onDocClick(e: MouseEvent) {
      if (!exportMenuRef.current) return;
      if (exportMenuRef.current.contains(e.target as Node)) return;
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
      const [mapRes, citiesRes] = await Promise.all([
        getGraduatesMap(nextParams ?? params),
        getMapCities(nextParams ?? params),
      ]);
      setItems(Array.isArray(mapRes?.items) ? mapRes.items : []);
      setCityPoints(Array.isArray(citiesRes?.items) ? citiesRes.items : []);
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
        const res = await getRegionCitiesMap({ ...params, periphery_id: selected.periphery_id });
        if (!active) return;
        setSelectedCityStats(Array.isArray(res?.items) ? res.items : []);
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

  function thresholdsForMax(m: number) {
    const mm = Math.max(1, m || 1);
    const b1 = Math.ceil(mm * 0.2);
    const b2 = Math.ceil(mm * 0.4);
    const b3 = Math.ceil(mm * 0.6);
    const b4 = Math.ceil(mm * 0.8);
    return [0, b1, b2, b3, b4, mm];
  }

  function bucketIndexForCount(c: number) {
    const threshold = thresholdsForMax(maxCount);
    for (let i = 0; i < 5; i += 1) {
      const from = threshold[i];
      const to = threshold[i + 1];
      if (c >= from && c <= to) return i;
    }
    return 4;
  }

  function fillColorForCount(c: number) {
    return fillColors[Math.max(0, Math.min(fillColors.length - 1, bucketIndexForCount(c)))];
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

  const visibleCities = useMemo(() => {
    if (cityPoints.length > 0) {
      const grouped = new (globalThis as any).Map<string, MapCityPoint[]>();

      for (const city of cityPoints) {
        const key = normalizeKey(city.periphery_name);
        const list = grouped.get(key) || [];
        list.push(city);
        grouped.set(key, list);
      }

      const expanded = mapZoom >= 7;
      const next: Array<MapCityPoint | RegionCity> = [];

      grouped.forEach((list) => {
        const sorted = [...list].sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return a.city_name.localeCompare(b.city_name, "el");
        });
        if (!expanded) {
          if (sorted[0]) next.push(sorted[0]);
          return;
        }
        const insideBounds = mapBounds ? sorted.filter((city) => mapBounds.contains(L.latLng(Number(city.latitude), Number(city.longitude)))) : sorted;
        next.push(...(insideBounds.length ? insideBounds : sorted).slice(0, 3));
      });

      return next;
    }

    const grouped = new (globalThis as any).Map<string, RegionCity[]>();

    for (const city of regionCities) {
      const key = normalizeKey(city.region);
      const list = grouped.get(key) || [];
      list.push(city);
      grouped.set(key, list);
    }

    const expanded = mapZoom >= 7;
    const next: Array<MapCityPoint | RegionCity> = [];

    grouped.forEach((list) => {
      const sorted = [...list].sort((a, b) => b.population - a.population);
      if (!expanded) {
        if (sorted[0]) next.push(sorted[0]);
        return;
      }
      const insideBounds = mapBounds ? sorted.filter((city) => mapBounds.contains(L.latLng(city.lat, city.lng))) : sorted;
      next.push(...(insideBounds.length ? insideBounds : sorted).slice(0, 3));
    });

    return next;
  }, [cityPoints, mapBounds, mapZoom]);

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

    const output = XLSX.write(workbook, { bookType: "xlsx", type: "array", compression: true });
    downloadBlob("alupla_map_export.xlsx", new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));

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
    downloadBlob("alupla_map_export.csv", new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
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

  function legendBuckets(max: number) {
    const m = Math.max(1, max);
    const b1 = Math.ceil(m * 0.2);
    const b2 = Math.ceil(m * 0.4);
    const b3 = Math.ceil(m * 0.6);
    const b4 = Math.ceil(m * 0.8);
    return [0, b1, b2, b3, b4, m];
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
                      fillColor: fillColorForCount(c),
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

              {visibleCities.map((city) => (
                <Marker
                  key={`${city.region}-${city.nameEl}`}
                  position={[city.lat, city.lng]}
                  icon={cityLabelIcon(activeLang === "en" ? city.nameEn : city.nameEl)}
                  interactive={false}
                />
              ))}
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
                const color = fillColorForCount(mid);
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
