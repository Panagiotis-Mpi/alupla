import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { GeoJSON, MapContainer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as XLSX from "xlsx";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

import {
  getGraduatesMap,
  logPublicExport,
  type GraduatesMapItem,
} from "../lib/api";
import greeceRegionsRaw from "../assets/greece-regions.geojson?raw";
import { Field, FilterSection, MapViewportWatcher, RangeField } from "./map/shared";
import { excelCellValue, exportCsvText, exportElementAsPng, exportWorkbook } from "./map/mapExport";
import { useMapData, useMapLookups, useVisibleCities } from "./map/hooks";
import { EMPTY_FILTERS, type AgeGroup, type FiltersState } from "./map/types";
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

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend);

type MapMetric = "count" | "male_pct" | "female_pct" | "avg_age" | "avg_grade";

const fillColors = ["#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#2563eb"];

function compactNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  if (Number.isInteger(numeric)) return String(numeric);
  return numeric.toFixed(1);
}

function slugPart(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "map";
}

function displayPeripheryName(value: string) {
  return String(value || "").trim();
}

function displayCityName(value: string) {
  return String(value || "").trim();
}

function detailValue(value: number | string | null | undefined, suffix = "") {
  if (value === null || value === undefined || value === "") return "-";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return `${value}${suffix}`;
  if (suffix) return `${compactNumber(numeric)}${suffix}`;
  return compactNumber(numeric);
}

function detailMetric(label: string, value: string) {
  return { label, value };
}

export default function GraduatesMapPage() {
  const { t, i18n } = useTranslation(["map", "graduates", "common"]);

  const mt = useCallback((key: string, options?: Record<string, unknown>) => t(key, { ns: "map", ...(options || {}) }), [t]);
  const ct = useCallback((key: string, options?: Record<string, unknown>) => t(`common.${key}`, { ns: "common", ...(options || {}) }), [t]);
  const gt = useCallback((key: string, options?: Record<string, unknown>) => t(`graduates.${key}`, { ns: "common", ...(options || {}) }), [t]);

  const mapRef = useRef<L.Map | null>(null);
  const mapCanvasRef = useRef<HTMLDivElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);

  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [mapMetric, setMapMetric] = useState<MapMetric>("count");
  const [mapZoom, setMapZoom] = useState(6.5);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [selected, setSelected] = useState<GraduatesMapItem | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState<Array<{ year: string; count: number }>>([]);

  const { studyPrograms, programDirections, regions } = useMapLookups();
  const params = useMemo(() => createMapParams(filters), [filters]);
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
  const geojsonBounds = useMemo(() => {
    if (!geojson) return null;
    try {
      const layer = L.geoJSON(geojson as any);
      const bounds = layer.getBounds();
      return bounds && bounds.isValid() ? bounds : null;
    } catch {
      return null;
    }
  }, [geojson]);
  const activeLang = (i18n.resolvedLanguage || i18n.language || "gr").toLowerCase().startsWith("en") ? "en" : "gr";

  const availableDirections = useMemo(() => {
    if (!filters.study_program_id) return programDirections;
    return programDirections.filter((item) => Number((item as any).study_program_id) === Number(filters.study_program_id));
  }, [filters.study_program_id, programDirections]);

  const metricOptions = useMemo(() => ({
    count: {
      label: mt("metricOptions.count", { defaultValue: "Πλήθος αποφοίτων" }),
      valueLabel: mt("export.count", { defaultValue: "Απόφοιτοι" }),
      value: (item: GraduatesMapItem) => Number(item.count ?? 0) || 0,
      format: (value: number) => String(Math.round(value)),
    },
    male_pct: {
      label: mt("metricOptions.malePct", { defaultValue: "Ποσοστό ανδρών" }),
      valueLabel: mt("export.malePct", { defaultValue: "% Άνδρες" }),
      value: (item: GraduatesMapItem) => {
        const totalCount = Number(item.count ?? 0) || 0;
        const percentage = Number(item.male_pct ?? 0) || 0;
        return totalCount > 0 ? (totalCount * percentage) / 100 : 0;
      },
      format: (value: number) => String(Math.round(value)),
    },
    female_pct: {
      label: mt("metricOptions.femalePct", { defaultValue: "Ποσοστό γυναικών" }),
      valueLabel: mt("export.femalePct", { defaultValue: "% Γυναίκες" }),
      value: (item: GraduatesMapItem) => {
        const totalCount = Number(item.count ?? 0) || 0;
        const percentage = Number(item.female_pct ?? 0) || 0;
        return totalCount > 0 ? (totalCount * percentage) / 100 : 0;
      },
      format: (value: number) => String(Math.round(value)),
    },
    avg_age: {
      label: mt("metricOptions.avgAge", { defaultValue: "Μέση ηλικία" }),
      valueLabel: mt("export.avgAge", { defaultValue: "Μέση ηλικία" }),
      value: (item: GraduatesMapItem) => Number(item.avg_age ?? 0) || 0,
      format: (value: number) => compactNumber(value),
    },
    avg_grade: {
      label: mt("metricOptions.avgGrade", { defaultValue: "Μέσος βαθμός" }),
      valueLabel: mt("export.avgGrade", { defaultValue: "Μέσος βαθμός" }),
      value: (item: GraduatesMapItem) => Number(item.avg_grade ?? 0) || 0,
      format: (value: number) => compactNumber(value),
    },
  }), [t]);

  useLayoutEffect(() => {
    if (!geojsonBounds || !mapRef.current) return;
    const map = mapRef.current;
    const applyBounds = () => {
      map.invalidateSize();
      map.fitBounds(geojsonBounds, { padding: [6, 6], maxZoom: 6.75 });
      setMapZoom((prev) => Math.abs(prev - map.getZoom()) < 0.001 ? prev : map.getZoom());
      setMapBounds((prev) => (prev && prev.equals(map.getBounds()) ? prev : map.getBounds()));
    };

    const frame = window.requestAnimationFrame(applyBounds);
    const timeoutId = window.setTimeout(applyBounds, 140);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeoutId);
    };
  }, [geojsonBounds]);

  const valuesByGreekName = useMemo(() => {
    const next = new Map<string, number>();
    const getter = metricOptions[mapMetric].value;
    for (const item of items) {
      next.set(normalizeKey(String((item as any).periphery_name ?? "")), getter(item));
    }
    return next;
  }, [items, mapMetric, metricOptions]);

  const maxMetricValue = useMemo(() => {
    const getter = metricOptions[mapMetric].value;
    let maxValue = 1;
    for (const item of items) {
      const value = getter(item);
      if (Number.isFinite(value) && value > maxValue) maxValue = value;
    }
    return maxValue;
  }, [items, mapMetric, metricOptions]);

  const valuesRef = useRef<Map<string, number>>(valuesByGreekName);
  const itemsRef = useRef<GraduatesMapItem[]>(items);

  valuesRef.current = valuesByGreekName;
  itemsRef.current = items;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!exportMenuRef.current) return;
      if (exportMenuRef.current.contains(e.target as Node)) return;
      setShowExportMenu(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const layer = geoJsonLayerRef.current;
    if (!layer) return;

    layer.eachLayer((entryLayer: any) => {
      const feature = entryLayer?.feature;
      if (!feature) return;
      const value = currentValueForFeature(feature);
      entryLayer.setStyle({
        color: "#334155",
        weight: 1,
        fillColor: fillColorForCount(value, maxMetricValue, fillColors),
        fillOpacity: fillOpacityForCount(value),
      });
      if (entryLayer.getTooltip()) {
        entryLayer.setTooltipContent(renderTooltipHtml(feature));
      }
    });
  }, [items, mapMetric, maxMetricValue, i18n.language]);

  useEffect(() => {
    if (!selected) {
      setSelectedTrend([]);
      return;
    }

    let active = true;
    const selectedPeripheryId = Number(selected.periphery_id);
    const selectedPeripheryName = normalizeKey(selected.periphery_name || "");
    const currentYear = new Date().getFullYear();
    const years = filters.graduation_year
      ? [Number(filters.graduation_year)]
      : Array.from({ length: Math.max(2035, currentYear + 2) - 2010 + 1 }, (_, index) => 2010 + index);
    const baseFilters = { ...params };
    delete baseFilters.graduation_year;

    setTrendLoading(true);

    Promise.all(
      years.map(async (year) => {
        const response = await getGraduatesMap({ ...baseFilters, graduation_year: String(year) });
        const itemsForYear = Array.isArray(response?.items) ? response.items : [];
        const hit = itemsForYear.find((item: GraduatesMapItem) => normalizeKey(item.periphery_name || "") === selectedPeripheryName || Number(item.periphery_id) === selectedPeripheryId);
        return { year: String(year), count: Number(hit?.count ?? 0) || 0 };
      })
    )
      .then((rows) => {
        if (!active) return;
        const visibleRows = rows.filter((row) => row.count > 0 || years.length === 1);
        setSelectedTrend(visibleRows);
      })
      .catch(() => {
        if (!active) return;
        setSelectedTrend([]);
      })
      .finally(() => {
        if (active) setTrendLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selected, params, filters.graduation_year]);

  const handleZoomChange = useCallback((nextZoom: number) => {
    setMapZoom((prev) => (Math.abs(prev - nextZoom) < 0.001 ? prev : nextZoom));
  }, []);

  const handleBoundsChange = useCallback((nextBounds: L.LatLngBounds) => {
    setMapBounds((prev) => (prev && prev.equals(nextBounds) ? prev : nextBounds));
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
    fetchMap(createMapParams(EMPTY_FILTERS));
  }

  function featureGreekName(feature: any): string {
    const properties = feature?.properties || {};
    return String(properties.name_greek || properties.name_el || properties.name || properties.NAME || "");
  }

  function featureDisplayName(feature: any): string {
    return featureGreekName(feature);
  }

  function currentValueForFeature(feature: any): number {
    return valuesRef.current.get(normalizeKey(featureGreekName(feature))) ?? 0;
  }

  function renderTooltipHtml(feature: any): string {
    const label = displayPeripheryName(featureDisplayName(feature));
    const match = itemsRef.current.find((item) => normalizeKey(String(item.periphery_name || "")) === normalizeKey(featureGreekName(feature)));
    const totalCount = Number(match?.count ?? 0) || 0;
    const metricValue = currentValueForFeature(feature);
    const metricLabel = metricOptions[mapMetric].valueLabel;
    const totalLabel = mt("total", { total: totalCount, defaultValue: "Σύνολο: {{total}}" });

    if (mapMetric === "male_pct" || mapMetric === "female_pct") {
      const percentageValue = mapMetric === "male_pct"
        ? Number(match?.male_pct ?? 0) || 0
        : Number(match?.female_pct ?? 0) || 0;
      const ratioLabel = mapMetric === "male_pct"
        ? mt("malePct", { defaultValue: "% Άνδρες" })
        : mt("femalePct", { defaultValue: "% Γυναίκες" });
      const countLabel = mapMetric === "male_pct"
        ? mt("tooltip.maleCount", { count: Math.round(metricValue), defaultValue: "Άνδρες: {{count}}" })
        : mt("tooltip.femaleCount", { count: Math.round(metricValue), defaultValue: "Γυναίκες: {{count}}" });
      return `<div class="alupla-region-tip-title">${label}</div><div class="alupla-region-tip-sub">${countLabel}</div><div class="alupla-region-tip-sub">${ratioLabel}: ${compactNumber(percentageValue)}%</div><div class="alupla-region-tip-sub">${totalLabel}</div>`;
    }

    return `<div class="alupla-region-tip-title">${label}</div><div class="alupla-region-tip-sub">${metricLabel}: ${metricOptions[mapMetric].format(metricValue)}</div><div class="alupla-region-tip-sub">${totalLabel}</div>`;
  }

  const total = useMemo(() => items.reduce((sum, item: any) => sum + (Number(item.count) || 0), 0), [items]);
  const visibleCities = useVisibleCities(cityPoints, mapBounds, mapZoom);

  const topPeriphery = useMemo(() => items[0] || null, [items]);
  const topCity = useMemo(() => cityPoints[0] || null, [cityPoints]);
  const weightedAvgAge = useMemo(() => {
    let weightedSum = 0;
    let weightedCount = 0;
    for (const item of items) {
      const avgAge = Number(item.avg_age ?? NaN);
      const count = Number(item.count ?? 0) || 0;
      if (!Number.isFinite(avgAge) || count <= 0) continue;
      weightedSum += avgAge * count;
      weightedCount += count;
    }
    if (!weightedCount) return null;
    return Math.round((weightedSum / weightedCount) * 10) / 10;
  }, [items]);

  const currentFilterRows = useMemo(() => {
    const regionName = displayPeripheryName(regions.find((item) => String((item as any).id) === filters.origin_region_id)?.name || "");
    const program = studyPrograms.find((item) => String((item as any).id) === filters.study_program_id);
    const direction = programDirections.find((item) => String((item as any).id) === filters.program_direction_id);
    return [
      { key: "ad_code_like", label: gt("filters.adCode", { defaultValue: "Α.Δ." }), value: filters.ad_code_like },
      { key: "student_number_like", label: gt("filters.studentNumber", { defaultValue: "Α.Μ." }), value: filters.student_number_like },
      { key: "last_name_like", label: gt("filters.lastName", { defaultValue: "Επώνυμο" }), value: filters.last_name_like },
      { key: "first_name_like", label: gt("filters.firstName", { defaultValue: "Όνομα" }), value: filters.first_name_like },
      { key: "father_name_like", label: gt("filters.fatherName", { defaultValue: "Πατρώνυμο" }), value: filters.father_name_like },
      { key: "gender", label: gt("filters.gender", { defaultValue: "Φύλο" }), value: filters.gender === "M" ? ct("male", { defaultValue: "Άνδρας" }) : filters.gender === "F" ? ct("female", { defaultValue: "Γυναίκα" }) : "" },
      { key: "entry_year", label: gt("filters.entryYear", { defaultValue: "Έτος εισαγωγής" }), value: [filters.entry_year_min, filters.entry_year_max].filter(Boolean).join(" - ") },
      { key: "birth_year", label: gt("filters.birthYear", { defaultValue: "Έτος γέννησης" }), value: [filters.birth_year_min, filters.birth_year_max].filter(Boolean).join(" - ") },
      { key: "degree_grade", label: gt("filters.degreeGrade", { defaultValue: "Βαθμός πτυχίου" }), value: [filters.degree_grade_min, filters.degree_grade_max].filter(Boolean).join(" - ") },
      { key: "graduation_year", label: mt("filters.year", { defaultValue: "Έτος αποφοίτησης" }), value: filters.graduation_year },
      { key: "graduation_date", label: gt("filters.graduationDate", { defaultValue: "Ημερομηνία αποφοίτησης" }), value: [filters.graduation_date_from, filters.graduation_date_to].filter(Boolean).join(" - ") },
      { key: "oath_date", label: gt("filters.oathDate", { defaultValue: "Ημερομηνία ορκωμοσίας" }), value: [filters.oath_date_from, filters.oath_date_to].filter(Boolean).join(" - ") },
      { key: "study_program_id", label: mt("filters.studyProgram", { defaultValue: "Πρόγραμμα Σπουδών" }), value: program ? (activeLang === "en" ? program.name_en || program.name_el || program.code : program.name_el || program.name_en || program.code) : "" },
      { key: "program_direction_id", label: gt("filters.direction", { defaultValue: "Κατεύθυνση" }), value: direction ? (activeLang === "en" ? (direction as any).name_en || (direction as any).name_el || (direction as any).code : (direction as any).name_el || (direction as any).name_en || (direction as any).code) : "" },
      { key: "origin_region_id", label: gt("filters.region", { defaultValue: "Περιφέρεια" }), value: regionName },
      { key: "origin_municipality_like", label: gt("filters.city", { defaultValue: "Πόλη" }), value: displayCityName(filters.origin_municipality_like) },
      { key: "age_group", label: mt("filters.ageGroup", { defaultValue: "Ηλικιακή ομάδα" }), value: filters.age_group },
    ].filter((row) => row.value);
  }, [filters, regions, studyPrograms, programDirections, activeLang, t]);

  const activeFilterChips = useMemo(() => currentFilterRows.map((row) => `${row.label}: ${row.value}`), [currentFilterRows]);

  function exportRows() {
    return items.map((item: any) => ({
      [mt("export.periphery", { defaultValue: "Περιφέρεια" })]: excelCellValue(displayPeripheryName(item.periphery_name ?? "")),
      [mt("export.countDetailed", { defaultValue: "Πλήθος αποφοίτων περιφέρειας" })]: excelCellValue(item.count ?? 0),
      [mt("export.avgAgeDetailed", { defaultValue: "Μέση ηλικία αποφοίτων περιφέρειας" })]: excelCellValue(item.avg_age ?? ""),
      [mt("export.malePctDetailed", { defaultValue: "Ποσοστό ανδρών αποφοίτων περιφέρειας" })]: excelCellValue(item.male_pct ?? ""),
      [mt("export.femalePctDetailed", { defaultValue: "Ποσοστό γυναικών αποφοίτων περιφέρειας" })]: excelCellValue(item.female_pct ?? ""),
      [mt("export.avgGradeDetailed", { defaultValue: "Μέσος βαθμός πτυχίου αποφοίτων περιφέρειας" })]: excelCellValue(item.avg_grade ?? ""),
    }));
  }

  function currentFilenameBase() {
    const parts = ["alupla_map", slugPart(mapMetric)];
    if (filters.graduation_year) parts.push(`year-${slugPart(filters.graduation_year)}`);
    if (filters.study_program_id) parts.push(`program-${slugPart(filters.study_program_id)}`);
    if (selected?.periphery_name) parts.push(slugPart(selected.periphery_name));
    return parts.join("_");
  }

  async function onExportExcel() {
    const workbook = XLSX.utils.book_new();
    const rows = exportRows();
    const filtersRows = currentFilterRows.map((row) => [row.label, row.value]);
    const summaryRows = [
      [mt("summary.total", { defaultValue: "Σύνολο αποφοίτων" }), total],
      [mt("summary.metric", { defaultValue: "Τρέχουσα απεικόνιση χάρτη" }), metricOptions[mapMetric].label],
      [mt("summary.topPeriphery", { defaultValue: "Περιφέρεια με τους περισσότερους αποφοίτους" }), topPeriphery ? `${displayPeripheryName(topPeriphery.periphery_name)} (${topPeriphery.count})` : "-"],
      [mt("summary.topCity", { defaultValue: "Πόλη με τους περισσότερους αποφοίτους" }), topCity ? `${displayCityName(topCity.city_name)} (${topCity.count})` : "-"],
      [mt("summary.avgAge", { defaultValue: "Μέση ηλικία αποφοίτων" }), weightedAvgAge ?? "-"],
    ];

    const mapSheet = XLSX.utils.json_to_sheet(rows);
    mapSheet["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 24 }, { wch: 24 }, { wch: 26 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, mapSheet, "Map");

    const filtersSheet = XLSX.utils.aoa_to_sheet([
      [gt("filters.toggle", { defaultValue: "Φίλτρα" }), ct("value", { defaultValue: "Τιμή" })],
      ...filtersRows,
    ]);
    filtersSheet["!cols"] = [{ wch: 34 }, { wch: 34 }];
    XLSX.utils.book_append_sheet(workbook, filtersSheet, "Filters");

    const summarySheet = XLSX.utils.aoa_to_sheet([
      [mt("summary.title", { defaultValue: "Σύνοψη χάρτη" }), ct("value", { defaultValue: "Τιμή" })],
      ...summaryRows,
    ]);
    summarySheet["!cols"] = [{ wch: 36 }, { wch: 34 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    exportWorkbook(`${currentFilenameBase()}.xlsx`, workbook);

    try {
      await logPublicExport("map_export", "xlsx");
    } catch {
    }
  }

  async function onExportCsv() {
    const rows = exportRows();
    const filtersRows = currentFilterRows;
    const headers = Object.keys(rows[0] || {
      [mt("export.periphery", { defaultValue: "Περιφέρεια" })]: "",
      [mt("export.countDetailed", { defaultValue: "Πλήθος αποφοίτων περιφέρειας" })]: "",
      [mt("export.avgAgeDetailed", { defaultValue: "Μέση ηλικία αποφοίτων περιφέρειας" })]: "",
      [mt("export.malePctDetailed", { defaultValue: "Ποσοστό ανδρών αποφοίτων περιφέρειας" })]: "",
      [mt("export.femalePctDetailed", { defaultValue: "Ποσοστό γυναικών αποφοίτων περιφέρειας" })]: "",
      [mt("export.avgGradeDetailed", { defaultValue: "Μέσος βαθμός πτυχίου αποφοίτων περιφέρειας" })]: "",
    });
    const esc = (value: any) => {
      const text = String(value ?? "");
      if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
      return text;
    };
    const lines = [
      `${esc(mt("summary.metric", { defaultValue: "Τρέχουσα απεικόνιση χάρτη" }))},${esc(metricOptions[mapMetric].label)}`,
      `${esc(gt("filters.toggle", { defaultValue: "Φίλτρα" }))},${esc(ct("value", { defaultValue: "Τιμή" }))}`,
      ...filtersRows.map((row) => `${esc(row.label)},${esc(row.value)}`),
      "",
      headers.map(esc).join(","),
      ...rows.map((row) => headers.map((header) => esc((row as any)[header])).join(",")),
    ];
    exportCsvText(`${currentFilenameBase()}.csv`, lines.join("\n"));
    try {
      await logPublicExport("map_export", "csv");
    } catch {
    }
  }

  async function onExportPng() {
    if (!mapCanvasRef.current) return;
    await exportElementAsPng(mapCanvasRef.current, `${currentFilenameBase()}.png`);
    try {
      await logPublicExport("map_export", "png");
    } catch {
    }
  }

  const buckets = useMemo(() => legendBuckets(maxMetricValue), [maxMetricValue]);
  const geoRenderKey = useMemo(() => {
    const metricSignature = items
      .map((item) => `${item.periphery_id}:${metricOptions[mapMetric].value(item)}`)
      .join("|");
    return `${i18n.language}:${mapMetric}:${maxMetricValue}:${metricSignature}`;
  }, [i18n.language, items, mapMetric, maxMetricValue, metricOptions]);

  const trendSkeletonLabels = useMemo(() => Array.from({ length: 8 }, () => ""), []);

  const trendData = useMemo(() => {
    const hasTrend = selectedTrend.length > 0;
    return {
      labels: hasTrend ? selectedTrend.map((item) => item.year) : trendSkeletonLabels,
      datasets: [
        {
          label: mt("trend.series", { defaultValue: "Απόφοιτοι" }),
          data: hasTrend ? selectedTrend.map((item) => item.count) : trendSkeletonLabels.map(() => null),
          borderColor: "#2563eb",
          backgroundColor: hasTrend ? "rgba(37,99,235,.18)" : "rgba(37,99,235,.04)",
          tension: 0.28,
          fill: true,
          pointRadius: hasTrend ? 4 : 0,
          pointHoverRadius: hasTrend ? 5 : 0,
          borderWidth: hasTrend ? 3 : 1.5,
          spanGaps: false,
        },
      ],
    };
  }, [selectedTrend, trendSkeletonLabels, t]);



  function renderInfoBox(title: string, total: number | string, metrics: { demographics: Array<{ label: string; value: string }>; academics: Array<{ label: string; value: string }>; }) {
    const groups = [
      { title: mt("detailGroups.demographics", { defaultValue: "Δημογραφικά" }), rows: metrics.demographics },
      { title: mt("detailGroups.academics", { defaultValue: "Ακαδημαϊκά" }), rows: metrics.academics },
    ].filter((group) => group.rows.length > 0);

    return (
      <div className="map-info-box">
        <div className="map-info-box-header">
          <div className="map-info-box-title">{title}</div>
          <div className="map-info-total-line">{mt("totalGraduatesLine", { total, defaultValue: "Σύνολο αποφοίτων: {{total}}" })}</div>
        </div>

        <div className="map-info-groups">
          {groups.map((group) => (
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

  const trendOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: selectedTrend.length > 0 },
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: selectedTrend.length ? undefined : 10,
        ticks: selectedTrend.length ? { precision: 0 as any } : { display: false },
        grid: { color: "rgba(148,163,184,.18)" },
      },
      x: {
        grid: { color: "rgba(148,163,184,.18)" },
        ticks: selectedTrend.length ? { autoSkip: false, maxRotation: 0, minRotation: 0 } : { display: false },
      },
    },
  }), [selectedTrend]);

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
        .leaflet-tooltip.alupla-region-tooltip:before { border-top-color: var(--border); }
        .alupla-region-tip-title { font-weight: 700; margin-bottom: 4px; }
        .alupla-region-tip-sub { color: #64748b; font-size: 12px; }
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
        .map-export-item:hover { background: #f8fafc; }
        .map-page-title-row { align-items: baseline; }
        .map-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin: 12px 0 0;
        }
        .map-summary-label {
          color: #475569;
          font-size: 17px;
          line-height: 1.32;
        }
        .map-summary-card {
          min-width: 0;
          min-height: 124px;
          padding: 18px;
          display: grid;
          align-content: space-between;
          gap: 8px;
        }
        .map-summary-value {
          font-size: 28px;
          font-weight: 800;
          line-height: 1.1;
          color: #0f172a;
        }
        .map-summary-sub {
          color: #64748b;
          font-size: 13px;
          line-height: 1.35;
        }
        .map-controls-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 16px 0;
          flex-wrap: wrap;
        }
        .map-top-menu-card {
          padding: 20px 16px 16px;
          display: grid;
          gap: 14px;
        }
        .map-top-menu-card .badge {
          min-height: 40px;
          padding: 0 12px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
        }
        .map-top-menu-header {
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: center;
          gap: 16px;
        }
        .map-top-menu-title {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          min-width: 0;
        }
        .map-top-menu-title h2 {
          margin: 0;
        }
        .map-top-menu-actions {
          display: contents;
        }
        .map-metric-group {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 10px;
          width: 100%;
          margin: 0 auto;
          align-items: stretch;
        }
        .map-metric-button,
        .map-action-button {
          width: 100%;
          min-width: 136px;
          min-height: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          padding: 0 12px;
          font-size: 14px;
          line-height: 1.2;
          border-radius: 12px;
          text-align: center;
        }
        .map-metric-button {
          font: inherit;
          font-weight: 400;
        }
        .map-metric-button.active {
          background: var(--primary);
          border-color: var(--primary);
          color: #fff;
          font-weight: 700;
        }
        .map-metric-button.active:hover {
          background: var(--primaryHover);
          border-color: var(--primaryHover);
        }
        .map-actions-bar {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          width: 100%;
          position: relative;
        }
        .map-main-card {
          margin: 12px auto 0;
          max-width: 1080px;
        }
        .map-map-wrap {
          position: relative;
          padding: 8px 8px 12px;
        }
        .map-combined-details-card {
          margin-top: 12px;
          display: grid;
          gap: 18px;
          padding: 20px;
        }
        .map-combined-details-block {
          display: grid;
          gap: 12px;
        }
        .map-info-header {
          display: grid;
          gap: 4px;
        }
        .map-info-box {
          border: 1px solid var(--border);
          border-radius: 16px;
          background: rgba(248,250,252,.82);
          padding: 16px 18px;
          display: grid;
          gap: 14px;
        }
        .map-info-box-header {
          display: grid;
          gap: 6px;
        }
        .map-info-box-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
        }
        .map-info-total-line {
          color: #475569;
          font-size: 15px;
          line-height: 1.35;
        }
        .map-info-groups {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 14px;
        }
        .map-info-group {
          display: grid;
          gap: 8px;
          align-content: start;
        }
        .map-info-group-title {
          font-size: 14px;
          font-weight: 800;
          color: #334155;
        }
        .map-info-metrics {
          display: grid;
          gap: 8px;
        }
        .map-info-metric {
          display: grid;
          gap: 4px;
        }
        .map-info-metric-label {
          color: #64748b;
          font-size: 13px;
          line-height: 1.25;
        }
        .map-info-metric-value {
          color: #0f172a;
          font-size: 15px;
          font-weight: 800;
          line-height: 1.2;
        }
        .map-city-cards-inline {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 12px;
          align-items: start;
        }
        .map-filter-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }
        .map-filter-chip {
          padding: 8px 12px;
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid var(--border);
          color: #334155;
          font-size: 13px;
          line-height: 1.2;
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
        .map-filters-modal .label { font-size: 12px; }
        .map-filters-grid { display: grid; gap: 14px; }
        .map-filters-grid input,
        .map-filters-grid select { min-height: 42px; }
        .map-empty-state {
          padding: 18px;
          border: 1px dashed var(--border);
          border-radius: 14px;
          background: #f8fafc;
          color: #64748b;
        }
        .map-panel-stack {
          display: grid;
          gap: 12px;
          align-content: start;
        }
        .map-detail-card {
          display: grid;
          gap: 12px;
        }
        .map-lower-section {
          margin-top: 12px;
          display: grid;
          gap: 12px;
        }
        .map-cities-card {
          display: grid;
          gap: 12px;
        }
        .map-city-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 12px;
          align-items: start;
        }
        .map-trend-card { display: grid; gap: 12px; }
        .map-trend-canvas {
          height: 260px;
          min-height: 260px;
          width: 100%;
        }
        .map-trend-scroll {
          overflow: hidden;
          min-height: 260px;
        }
        .map-main-card .map-canvas { height: clamp(760px, 80vh, 940px); min-height: 760px; }
        @media (max-width: 1100px) {
          .map-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .map-summary-card { min-height: 124px; padding: 18px; }
          .map-summary-label { font-size: 17px; }
          .map-summary-value { font-size: 28px; }
          .map-metric-group { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          .map-city-stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .map-top-menu-header { grid-template-columns: 1fr; }
          .map-top-menu-title { justify-content: center; }
          .map-main-card { max-width: 100%; }
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
          .map-page-title-row { align-items: flex-start; gap: 10px; }
          .map-summary-grid { grid-template-columns: 1fr; }
          .map-summary-card { min-height: auto; gap: 12px; padding: 18px; }
          .map-summary-label { font-size: 17px; }
          .map-summary-value { font-size: 28px; }
          .map-actions-bar { grid-template-columns: 1fr 1fr; }
          .map-controls-row { padding: 14px 14px 0; }
          .map-metric-group { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .map-city-stats-grid { grid-template-columns: 1fr; }
          .map-top-menu-card { padding: 16px; }
          .map-city-cards-inline { grid-template-columns: 1fr; }
          .map-metric-button,
          .map-action-button { min-width: 0; }
          .map-filters-modal {
            top: 76px;
            width: calc(100vw - 16px);
            max-height: calc(100vh - 88px);
            padding: 12px;
          }
          .map-filters-modal section > div:last-child { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="card map-top-menu-card">
        <div className="map-top-menu-header">
          <div className="map-top-menu-title">
            <h2 style={{ margin: 0 }}>{mt("title", { defaultValue: "Χάρτης αποφοίτων" })}</h2>
            <span className="badge" style={{ display: "inline-flex", alignItems: "center", lineHeight: 1, paddingTop: 0, paddingBottom: 0 }}>
              {loading ? ct("loading", { defaultValue: "Φόρτωση..." }) : `${total} ${mt("totalInline", { defaultValue: "σύνολο" })}`}
            </span>
          </div>
        </div>

        <div className="map-metric-group">
          {(["count", "male_pct", "female_pct", "avg_age", "avg_grade"] as MapMetric[]).map((option) => (
            <button
              key={option}
              type="button"
              className={`btn map-metric-button ${mapMetric === option ? "active primary" : ""}`}
              onClick={() => setMapMetric(option)}
            >
              {metricOptions[option].label}
            </button>
          ))}

          <button className="btn map-action-button" type="button" onClick={() => setShowFilters((prev) => !prev)}>
            {showFilters ? ct("hide", { defaultValue: "Απόκρυψη" }) : gt("filters.toggle", { defaultValue: "Φίλτρα" })}
          </button>

          <div ref={exportMenuRef} style={{ position: "relative" }}>
            <button className="btn map-action-button" type="button" style={{ width: "100%", justifyContent: "center" }} onClick={() => setShowExportMenu((prev) => !prev)}>
              {ct("export", { defaultValue: "Εξαγωγή" })}
            </button>
            {showExportMenu ? (
              <div className="map-export-menu">
                <button className="map-export-item" type="button" onClick={() => { setShowExportMenu(false); void onExportExcel(); }}>
                  Excel
                </button>
                <button className="map-export-item" type="button" onClick={() => { setShowExportMenu(false); void onExportCsv(); }}>
                  CSV
                </button>
                <button className="map-export-item" type="button" onClick={() => { setShowExportMenu(false); void onExportPng(); }}>
                  PNG
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="map-summary-grid">
        <div className="card map-summary-card">
          <div className="map-summary-label">{mt("summary.total", { defaultValue: "Σύνολο αποφοίτων" })}</div>
          <div className="map-summary-value">{total}</div>
        </div>
        <div className="card map-summary-card">
          <div className="map-summary-label">{mt("summary.topPeriphery", { defaultValue: "Περιφέρεια με τους περισσότερους αποφοίτους" })}</div>
          <div className="map-summary-value">{topPeriphery ? displayPeripheryName(topPeriphery.periphery_name) : "-"}</div>
          <div className="map-summary-sub">{topPeriphery ? `${topPeriphery.count} ${mt("export.count", { defaultValue: "Απόφοιτοι" })}` : "-"}</div>
        </div>
        <div className="card map-summary-card">
          <div className="map-summary-label">{mt("summary.topCity", { defaultValue: "Πόλη με τους περισσότερους αποφοίτους" })}</div>
          <div className="map-summary-value">{topCity ? displayCityName(topCity.city_name) : "-"}</div>
          <div className="map-summary-sub">{topCity ? `${topCity.count} ${mt("export.count", { defaultValue: "Απόφοιτοι" })}` : "-"}</div>
        </div>
        <div className="card map-summary-card">
          <div className="map-summary-label">{mt("summary.avgAge", { defaultValue: "Μέσος όρος ηλικίας" })}</div>
          <div className="map-summary-value">{weightedAvgAge === null ? "-" : compactNumber(weightedAvgAge)}</div>
        </div>
      </div>

      {activeFilterChips.length ? (
        <div className="map-filter-chips">
          {activeFilterChips.map((chip) => (
            <span className="map-filter-chip" key={chip}>{chip}</span>
          ))}
          <button className="btn" type="button" onClick={onReset}>{ct("reset", { defaultValue: "Καθαρισμός" })}</button>
        </div>
      ) : null}

      <div className="card alupla-map-card map-main-card">
        <div className="map-map-wrap">
          <div className="alupla-map map-canvas" ref={mapCanvasRef}>
            <MapContainer
              center={[38.6, 24.0]}
              zoom={6.75 as any}
              minZoom={5.8 as any}
              zoomSnap={0.25}
              whenCreated={(map) => {
                mapRef.current = map;
                if (geojsonBounds) {
                  map.fitBounds(geojsonBounds, { padding: [6, 6], maxZoom: 6.75 });
                }
                setMapZoom(map.getZoom());
                setMapBounds(map.getBounds());
              }}
              style={{ height: "100%", width: "100%", background: "transparent" }}
              scrollWheelZoom
            >
              <MapViewportWatcher onZoomChange={handleZoomChange} onBoundsChange={handleBoundsChange} />

              {geojson ? (
                <GeoJSON
                  key={geoRenderKey}
                  ref={(layer) => { geoJsonLayerRef.current = layer; }}
                  data={geojson as any}
                  style={(feature: any) => {
                    const value = currentValueForFeature(feature);
                    return {
                      color: "#334155",
                      weight: 1,
                      fillColor: fillColorForCount(value, maxMetricValue, fillColors),
                      fillOpacity: fillOpacityForCount(value),
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
                        const match = itemsRef.current.find((item: any) => normalizeKey(String(item.periphery_name || "")) === key) || null;
                        setSelected(match);
                        layer.setTooltipContent(renderTooltipHtml(feature));
                      },
                    });
                  }}
                />
              ) : null}

              {visibleCities.map((city) => {
                const latitude = mapCityLatitude(city);
                const longitude = mapCityLongitude(city);
                if (latitude === null || longitude === null) return null;
                return (
                  <Marker
                    key={mapCityKey(city)}
                    position={[latitude, longitude]}
                    icon={cityLabelIcon(displayCityName(mapCityLabel(city)))}
                    interactive={false}
                  />
                );
              })}
            </MapContainer>
          </div>

          <div style={{ position: "absolute", left: 12, bottom: 12, background: "rgba(255,255,255,.94)", border: "1px solid var(--border)", borderRadius: 14, padding: "10px 12px", fontSize: 12, boxShadow: "var(--shadow)", maxWidth: 240 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{mt("legend", { defaultValue: "Υπόμνημα" })}</div>
            <div className="muted" style={{ marginBottom: 8 }}>
              {metricOptions[mapMetric].label}
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {Array.from({ length: 5 }).map((_, index) => {
                const from = buckets[index];
                const to = buckets[index + 1];
                const mid = (from + to) / 2;
                const opacity = fillOpacityForCount(mid);
                const color = fillColorForCount(mid, maxMetricValue, fillColors);
                return (
                  <div key={`${from}-${to}`} style={{ display: "grid", gridTemplateColumns: "18px 1fr", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 18, height: 12, borderRadius: 999, background: color, opacity, border: "1px solid rgba(51,65,85,.18)" }} />
                    <span>{`${Math.round(from)}–${Math.round(to)}`}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
          {showFilters ? (
            <>
              <button className="map-filters-overlay" type="button" aria-label={ct("close", { defaultValue: "Κλείσιμο" })} onClick={() => setShowFilters(false)} />
              <div className="card map-filters-modal">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <h3 style={{ margin: 0 }}>{gt("filters.toggle", { defaultValue: "Φίλτρα" })}</h3>
                  <button className="btn" type="button" onClick={() => setShowFilters(false)}>
                    {ct("hide", { defaultValue: "Απόκρυψη" })}
                  </button>
                </div>

                <div className="map-filters-grid">
                  <FilterSection title="">
                    <Field label={gt("filters.adCode", { defaultValue: "Α.Δ." })} span={1}>
                      <input className="input" value={filters.ad_code_like} onChange={(e) => updateFilter("ad_code_like", e.target.value)} />
                    </Field>
                    <Field label={gt("filters.studentNumber", { defaultValue: "Α.Μ." })} span={1}>
                      <input className="input" value={filters.student_number_like} onChange={(e) => updateFilter("student_number_like", e.target.value)} />
                    </Field>
                    <Field label={gt("filters.lastName", { defaultValue: "Επώνυμο" })} span={1}>
                      <input className="input" value={filters.last_name_like} onChange={(e) => updateFilter("last_name_like", e.target.value)} />
                    </Field>
                    <Field label={gt("filters.firstName", { defaultValue: "Όνομα" })} span={1}>
                      <input className="input" value={filters.first_name_like} onChange={(e) => updateFilter("first_name_like", e.target.value)} />
                    </Field>
                    <Field label={gt("filters.fatherName", { defaultValue: "Πατρώνυμο" })} span={1}>
                      <input className="input" value={filters.father_name_like} onChange={(e) => updateFilter("father_name_like", e.target.value)} />
                    </Field>
                    <Field label={gt("filters.city", { defaultValue: "Πόλη" })} span={1}>
                      <input className="input" value={filters.origin_municipality_like} onChange={(e) => updateFilter("origin_municipality_like", e.target.value)} />
                    </Field>
                  </FilterSection>

                  <FilterSection title="">
                    <Field label={gt("filters.gender", { defaultValue: "Φύλο" })} span={1}>
                      <select className="input" value={filters.gender} onChange={(e) => updateFilter("gender", e.target.value)}>
                        <option value="">{ct("all", { defaultValue: "Όλα" })}</option>
                        <option value="M">{ct("male", { defaultValue: "Άνδρας" })}</option>
                        <option value="F">{ct("female", { defaultValue: "Γυναίκα" })}</option>
                      </select>
                    </Field>
                    <RangeField label={gt("filters.birthYear", { defaultValue: "Έτος γέννησης" })} fromLabel={gt("filters.from", { defaultValue: "Από" })} toLabel={gt("filters.to", { defaultValue: "Έως" })} fromValue={filters.birth_year_min} toValue={filters.birth_year_max} onFromChange={(value) => updateFilter("birth_year_min", value)} onToChange={(value) => updateFilter("birth_year_max", value)} type="number" span={1} />
                    <Field label={mt("filters.ageGroup", { defaultValue: "Ηλικιακή ομάδα" })} span={1}>
                      <select className="input" value={filters.age_group} onChange={(e) => updateFilter("age_group", e.target.value as AgeGroup)}>
                        <option value="">{ct("all", { defaultValue: "Όλα" })}</option>
                        <option value="23-26">23-26</option>
                        <option value="27-30">27-30</option>
                        <option value="31+">31+</option>
                      </select>
                    </Field>
                    <Field label={gt("filters.region", { defaultValue: "Περιφέρεια" })} span={1}>
                      <select className="input" value={filters.origin_region_id} onChange={(e) => updateFilter("origin_region_id", e.target.value)}>
                        <option value="">{ct("all", { defaultValue: "Όλα" })}</option>
                        {regions.map((region) => (
                          <option key={region.id} value={String(region.id)}>{region.name}</option>
                        ))}
                      </select>
                    </Field>
                  </FilterSection>

                  <FilterSection title="">
                    <RangeField label={gt("filters.entryYear", { defaultValue: "Έτος εισαγωγής" })} fromLabel={gt("filters.from", { defaultValue: "Από" })} toLabel={gt("filters.to", { defaultValue: "Έως" })} fromValue={filters.entry_year_min} toValue={filters.entry_year_max} onFromChange={(value) => updateFilter("entry_year_min", value)} onToChange={(value) => updateFilter("entry_year_max", value)} type="number" span={1} />
                    <Field label={mt("filters.year", { defaultValue: "Έτος αποφοίτησης" })} span={1}>
                      <input className="input" value={filters.graduation_year} onChange={(e) => updateFilter("graduation_year", e.target.value)} />
                    </Field>
                    <RangeField label={gt("filters.degreeGrade", { defaultValue: "Βαθμός πτυχίου" })} fromLabel={gt("filters.from", { defaultValue: "Από" })} toLabel={gt("filters.to", { defaultValue: "Έως" })} fromValue={filters.degree_grade_min} toValue={filters.degree_grade_max} onFromChange={(value) => updateFilter("degree_grade_min", value)} onToChange={(value) => updateFilter("degree_grade_max", value)} type="number" step="0.1" span={1} />
                    <RangeField label={gt("filters.graduationDate", { defaultValue: "Ημερομηνία αποφοίτησης" })} fromLabel={gt("filters.from", { defaultValue: "Από" })} toLabel={gt("filters.to", { defaultValue: "Έως" })} fromValue={filters.graduation_date_from} toValue={filters.graduation_date_to} onFromChange={(value) => updateFilter("graduation_date_from", value)} onToChange={(value) => updateFilter("graduation_date_to", value)} type="date" span={1} />
                    <RangeField label={gt("filters.oathDate", { defaultValue: "Ημερομηνία ορκωμοσίας" })} fromLabel={gt("filters.from", { defaultValue: "Από" })} toLabel={gt("filters.to", { defaultValue: "Έως" })} fromValue={filters.oath_date_from} toValue={filters.oath_date_to} onFromChange={(value) => updateFilter("oath_date_from", value)} onToChange={(value) => updateFilter("oath_date_to", value)} type="date" span={1} />
                    <Field label={mt("filters.studyProgram", { defaultValue: "Πρόγραμμα Σπουδών" })} span={1}>
                      <select className="input" value={filters.study_program_id} onChange={(e) => updateFilter("study_program_id", e.target.value)}>
                        <option value="">{ct("all", { defaultValue: "Όλα" })}</option>
                        {studyPrograms.map((program) => (
                          <option key={program.id} value={String(program.id)}>
                            {activeLang === "en" ? program.name_en || program.name_el || program.code : program.name_el || program.name_en || program.code}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label={gt("filters.direction", { defaultValue: "Κατεύθυνση" })} span={1}>
                      <select className="input" value={filters.program_direction_id} onChange={(e) => updateFilter("program_direction_id", e.target.value)}>
                        <option value="">{ct("all", { defaultValue: "Όλα" })}</option>
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
                    {ct("reset", { defaultValue: "Reset" })}
                  </button>
                  <button className="btn primary" type="button" onClick={onApply} disabled={loading}>
                    {ct("apply", { defaultValue: "Εφαρμογή" })}
                  </button>
                </div>
              </div>
            </>
          ) : null}

      </div>

      {items.length && selected ? (
        <>
          <div className="map-lower-section">
            <div className="card map-trend-card" style={{ padding: 16 }}>
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontWeight: 700 }}>{mt("trend.title", { defaultValue: "Μεταβολή αποφοίτων ανά έτος" })}</div>
                <div className="muted">{selected ? displayPeripheryName(selected.periphery_name) : mt("trend.selectRegion", { defaultValue: "Επίλεξε περιφέρεια" })}</div>
              </div>
              <div className="map-trend-scroll">
                <div className="map-trend-canvas">
                  <Line data={trendData} options={trendOptions as any} />
                </div>
              </div>
              {trendLoading ? (
                <div className="muted">{ct("loading", { defaultValue: "Φόρτωση..." })}</div>
              ) : selected && !selectedTrend.length ? (
                <div className="muted">{mt("trend.empty", { defaultValue: "Δεν υπάρχουν διαθέσιμα χρονολογικά στοιχεία για την τρέχουσα επιλογή." })}</div>
              ) : null}
            </div>
          </div>

          <div className="card map-combined-details-card">
            <div className="map-info-header">
              <div style={{ fontWeight: 800, fontSize: 18 }}>{mt("infoTitle", { defaultValue: "Πληροφορίες" })}</div>
            </div>

            <div className="map-combined-details-block">
              {renderInfoBox(
                displayPeripheryName((selected as any).periphery_name),
                (selected as any).count ?? 0,
                {
                  demographics: [
                    detailMetric(mt("avgAge", { defaultValue: "Μέση ηλικία" }), detailValue((selected as any).avg_age)),
                    detailMetric(mt("malePct", { defaultValue: "% Άνδρες" }), detailValue((selected as any).male_pct, "%")),
                    detailMetric(mt("femalePct", { defaultValue: "% Γυναίκες" }), detailValue((selected as any).female_pct, "%")),
                  ],
                  academics: [
                    detailMetric(mt("avgGrade", { defaultValue: "Μέσος βαθμός" }), detailValue((selected as any).avg_grade)),
                    detailMetric(mt("avgGraduationYears", { defaultValue: "Μέσος χρόνος αποφοίτησης" }), detailValue((selected as any).avg_graduation_years)),
                  ],
                }
              )}
            </div>

            <div className="map-combined-details-block">
              <div style={{ fontWeight: 700 }}>{mt("citiesTitle", { defaultValue: "Πόλεις" })}</div>
              {cityStatsLoading ? (
                <div className="muted">{ct("loading", { defaultValue: "Φόρτωση..." })}</div>
              ) : selectedCityStats.length > 0 ? (
                <div className="map-city-cards-inline">
                  {selectedCityStats.map((city) => renderInfoBox(
                    displayCityName(city.city),
                    city.count ?? 0,
                    {
                      demographics: [
                        detailMetric(mt("avgAge", { defaultValue: "Μέση ηλικία" }), detailValue(city.avg_age)),
                        detailMetric(mt("malePct", { defaultValue: "% Άνδρες" }), detailValue(city.male_pct, "%")),
                        detailMetric(mt("femalePct", { defaultValue: "% Γυναίκες" }), detailValue(city.female_pct, "%")),
                      ],
                      academics: [
                        detailMetric(mt("avgGrade", { defaultValue: "Μέσος βαθμός" }), detailValue(city.avg_grade)),
                        detailMetric(mt("avgGraduationYears", { defaultValue: "Μέσος χρόνος αποφοίτησης" }), detailValue(city.avg_graduation_years)),
                      ],
                    }
                  ))}
                </div>
              ) : (
                <div className="muted">{mt("noCities", { defaultValue: "Δεν υπάρχουν διαθέσιμες πόλεις για την τρέχουσα περιφέρεια." })}</div>
              )}
            </div>
          </div>
        </>
      ) : items.length ? (
        <div className="card map-combined-details-card">
          <div className="muted">{mt("detailsHint", { defaultValue: "Κάνε κλικ σε μία περιφέρεια για λεπτομέρειες." })}</div>
        </div>
      ) : (
        <div className="card map-combined-details-card">
          <div className="map-empty-state">{mt("noResults", { defaultValue: "Δεν βρέθηκαν απόφοιτοι με τα συγκεκριμένα φίλτρα." })}</div>
        </div>
      )}
    </div>
  );
}
