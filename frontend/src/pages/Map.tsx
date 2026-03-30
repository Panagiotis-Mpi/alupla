import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { DetailStatsCard, Field, FilterSection, MapViewportWatcher, RangeField } from "./map/shared";
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

export default function Map() {
  const { t, i18n } = useTranslation();

  const mapRef = useRef<L.Map | null>(null);
  const mapCanvasRef = useRef<HTMLDivElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

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
  const activeLang = (i18n.resolvedLanguage || i18n.language || "gr").toLowerCase().startsWith("en") ? "en" : "gr";

  const availableDirections = useMemo(() => {
    if (!filters.study_program_id) return programDirections;
    return programDirections.filter((item) => Number((item as any).study_program_id) === Number(filters.study_program_id));
  }, [filters.study_program_id, programDirections]);

  const metricOptions = useMemo(() => ({
    count: {
      label: t("map.metricOptions.count", { defaultValue: "Πλήθος αποφοίτων" }),
      valueLabel: t("map.export.count", { defaultValue: "Απόφοιτοι" }),
      value: (item: GraduatesMapItem) => Number(item.count ?? 0) || 0,
      format: (value: number) => String(Math.round(value)),
    },
    male_pct: {
      label: t("map.metricOptions.malePct", { defaultValue: "% Άνδρες" }),
      valueLabel: t("map.export.malePct", { defaultValue: "% Άνδρες" }),
      value: (item: GraduatesMapItem) => Number(item.male_pct ?? 0) || 0,
      format: (value: number) => `${compactNumber(value)}%`,
    },
    female_pct: {
      label: t("map.metricOptions.femalePct", { defaultValue: "% Γυναίκες" }),
      valueLabel: t("map.export.femalePct", { defaultValue: "% Γυναίκες" }),
      value: (item: GraduatesMapItem) => Number(item.female_pct ?? 0) || 0,
      format: (value: number) => `${compactNumber(value)}%`,
    },
    avg_age: {
      label: t("map.metricOptions.avgAge", { defaultValue: "Μέση ηλικία" }),
      valueLabel: t("map.export.avgAge", { defaultValue: "Μέση ηλικία" }),
      value: (item: GraduatesMapItem) => Number(item.avg_age ?? 0) || 0,
      format: (value: number) => compactNumber(value),
    },
    avg_grade: {
      label: t("map.metricOptions.avgGrade", { defaultValue: "Μέσος βαθμός" }),
      valueLabel: t("map.export.avgGrade", { defaultValue: "Μέσος βαθμός" }),
      value: (item: GraduatesMapItem) => Number(item.avg_grade ?? 0) || 0,
      format: (value: number) => compactNumber(value),
    },
  }), [t]);

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

  useEffect(() => {
    valuesRef.current = valuesByGreekName;
  }, [valuesByGreekName]);

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
      : Array.from({ length: 8 }, (_, index) => currentYear - 7 + index);
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
        setSelectedTrend(rows.filter((row, index) => row.count > 0 || years.length === 1 || index >= rows.length - 4));
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

  function featureGreekName(feature: any): string {
    const properties = feature?.properties || {};
    return String(properties.name_greek || properties.name_el || properties.name || properties.NAME || "");
  }

  function featureDisplayName(feature: any): string {
    const properties = feature?.properties || {};
    if (activeLang === "en") return String(properties.name_en || properties.name || properties.NAME || properties.name_greek || "");
    return featureGreekName(feature);
  }

  function currentValueForFeature(feature: any): number {
    return valuesRef.current.get(normalizeKey(featureGreekName(feature))) ?? 0;
  }

  function renderTooltipHtml(feature: any): string {
    const label = featureDisplayName(feature);
    const match = itemsRef.current.find((item) => normalizeKey(String(item.periphery_name || "")) === normalizeKey(featureGreekName(feature)));
    const metricValue = metricOptions[mapMetric].format(currentValueForFeature(feature));
    const metricLabel = metricOptions[mapMetric].valueLabel;
    const totalLabel = t("map.total", { total: Number(match?.count ?? 0) || 0, defaultValue: "Σύνολο: {{total}}" });
    return `<div class="alupla-region-tip-title">${label}</div><div class="alupla-region-tip-sub">${metricLabel}: ${metricValue}</div><div class="alupla-region-tip-sub">${totalLabel}</div>`;
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
    const regionName = regions.find((item) => String((item as any).id) === filters.origin_region_id)?.name || "";
    const program = studyPrograms.find((item) => String((item as any).id) === filters.study_program_id);
    const direction = programDirections.find((item) => String((item as any).id) === filters.program_direction_id);
    return [
      { key: "ad_code_like", label: t("graduates.filters.adCode", { defaultValue: "Α.Δ." }), value: filters.ad_code_like },
      { key: "student_number_like", label: t("graduates.filters.studentNumber", { defaultValue: "Α.Μ." }), value: filters.student_number_like },
      { key: "last_name_like", label: t("graduates.filters.lastName", { defaultValue: "Επώνυμο" }), value: filters.last_name_like },
      { key: "first_name_like", label: t("graduates.filters.firstName", { defaultValue: "Όνομα" }), value: filters.first_name_like },
      { key: "father_name_like", label: t("graduates.filters.fatherName", { defaultValue: "Πατρώνυμο" }), value: filters.father_name_like },
      { key: "gender", label: t("graduates.filters.gender", { defaultValue: "Φύλο" }), value: filters.gender === "M" ? t("common.male", { defaultValue: "Άνδρας" }) : filters.gender === "F" ? t("common.female", { defaultValue: "Γυναίκα" }) : "" },
      { key: "entry_year", label: t("graduates.filters.entryYear", { defaultValue: "Έτος εισαγωγής" }), value: [filters.entry_year_min, filters.entry_year_max].filter(Boolean).join(" - ") },
      { key: "birth_year", label: t("graduates.filters.birthYear", { defaultValue: "Έτος γέννησης" }), value: [filters.birth_year_min, filters.birth_year_max].filter(Boolean).join(" - ") },
      { key: "degree_grade", label: t("graduates.filters.degreeGrade", { defaultValue: "Βαθμός πτυχίου" }), value: [filters.degree_grade_min, filters.degree_grade_max].filter(Boolean).join(" - ") },
      { key: "graduation_year", label: t("map.filters.year", { defaultValue: "Έτος αποφοίτησης" }), value: filters.graduation_year },
      { key: "graduation_date", label: t("graduates.filters.graduationDate", { defaultValue: "Ημερομηνία αποφοίτησης" }), value: [filters.graduation_date_from, filters.graduation_date_to].filter(Boolean).join(" - ") },
      { key: "oath_date", label: t("graduates.filters.oathDate", { defaultValue: "Ημερομηνία ορκωμοσίας" }), value: [filters.oath_date_from, filters.oath_date_to].filter(Boolean).join(" - ") },
      { key: "study_program_id", label: t("map.filters.studyProgram", { defaultValue: "Πρόγραμμα Σπουδών" }), value: program ? (activeLang === "en" ? program.name_en || program.name_el || program.code : program.name_el || program.name_en || program.code) : "" },
      { key: "program_direction_id", label: t("graduates.filters.direction", { defaultValue: "Κατεύθυνση" }), value: direction ? (activeLang === "en" ? (direction as any).name_en || (direction as any).name_el || (direction as any).code : (direction as any).name_el || (direction as any).name_en || (direction as any).code) : "" },
      { key: "origin_region_id", label: t("graduates.filters.region", { defaultValue: "Περιφέρεια" }), value: regionName },
      { key: "origin_municipality_like", label: t("graduates.filters.city", { defaultValue: "Πόλη" }), value: filters.origin_municipality_like },
      { key: "age_group", label: t("map.filters.ageGroup", { defaultValue: "Ηλικιακή ομάδα" }), value: filters.age_group },
    ].filter((row) => row.value);
  }, [filters, regions, studyPrograms, programDirections, activeLang, t]);

  const activeFilterChips = useMemo(() => currentFilterRows.map((row) => `${row.label}: ${row.value}`), [currentFilterRows]);

  function exportRows() {
    return items.map((item: any) => ({
      [t("map.export.periphery", { defaultValue: "Περιφέρεια" })]: excelCellValue(item.periphery_name ?? ""),
      [t("map.export.countDetailed", { defaultValue: "Πλήθος αποφοίτων περιφέρειας" })]: excelCellValue(item.count ?? 0),
      [t("map.export.avgAgeDetailed", { defaultValue: "Μέση ηλικία αποφοίτων περιφέρειας" })]: excelCellValue(item.avg_age ?? ""),
      [t("map.export.malePctDetailed", { defaultValue: "Ποσοστό ανδρών αποφοίτων περιφέρειας" })]: excelCellValue(item.male_pct ?? ""),
      [t("map.export.femalePctDetailed", { defaultValue: "Ποσοστό γυναικών αποφοίτων περιφέρειας" })]: excelCellValue(item.female_pct ?? ""),
      [t("map.export.avgGradeDetailed", { defaultValue: "Μέσος βαθμός πτυχίου αποφοίτων περιφέρειας" })]: excelCellValue(item.avg_grade ?? ""),
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
      [t("map.summary.total", { defaultValue: "Σύνολο αποφοίτων" }), total],
      [t("map.summary.metric", { defaultValue: "Τρέχουσα απεικόνιση χάρτη" }), metricOptions[mapMetric].label],
      [t("map.summary.topPeriphery", { defaultValue: "Περιφέρεια με τους περισσότερους αποφοίτους" }), topPeriphery ? `${topPeriphery.periphery_name} (${topPeriphery.count})` : "-"],
      [t("map.summary.topCity", { defaultValue: "Πόλη με τους περισσότερους αποφοίτους" }), topCity ? `${topCity.city_name} (${topCity.count})` : "-"],
      [t("map.summary.avgAge", { defaultValue: "Μέση ηλικία αποφοίτων" }), weightedAvgAge ?? "-"],
    ];

    const mapSheet = XLSX.utils.json_to_sheet(rows);
    mapSheet["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 24 }, { wch: 24 }, { wch: 26 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, mapSheet, "Map");

    const filtersSheet = XLSX.utils.aoa_to_sheet([
      [t("graduates.filters.toggle", { defaultValue: "Φίλτρα" }), t("common.value", { defaultValue: "Τιμή" })],
      ...filtersRows,
    ]);
    filtersSheet["!cols"] = [{ wch: 34 }, { wch: 34 }];
    XLSX.utils.book_append_sheet(workbook, filtersSheet, "Filters");

    const summarySheet = XLSX.utils.aoa_to_sheet([
      [t("map.summary.title", { defaultValue: "Σύνοψη χάρτη" }), t("common.value", { defaultValue: "Τιμή" })],
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
      [t("map.export.periphery", { defaultValue: "Περιφέρεια" })]: "",
      [t("map.export.countDetailed", { defaultValue: "Πλήθος αποφοίτων περιφέρειας" })]: "",
      [t("map.export.avgAgeDetailed", { defaultValue: "Μέση ηλικία αποφοίτων περιφέρειας" })]: "",
      [t("map.export.malePctDetailed", { defaultValue: "Ποσοστό ανδρών αποφοίτων περιφέρειας" })]: "",
      [t("map.export.femalePctDetailed", { defaultValue: "Ποσοστό γυναικών αποφοίτων περιφέρειας" })]: "",
      [t("map.export.avgGradeDetailed", { defaultValue: "Μέσος βαθμός πτυχίου αποφοίτων περιφέρειας" })]: "",
    });
    const esc = (value: any) => {
      const text = String(value ?? "");
      if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
      return text;
    };
    const lines = [
      `${esc(t("map.summary.metric", { defaultValue: "Τρέχουσα απεικόνιση χάρτη" }))},${esc(metricOptions[mapMetric].label)}`,
      `${esc(t("graduates.filters.toggle", { defaultValue: "Φίλτρα" }))},${esc(t("common.value", { defaultValue: "Τιμή" }))}`,
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
  const geoRenderKey = useMemo(() => `${i18n.language}:${items.length}:${maxMetricValue}:${mapMetric}`, [i18n.language, items.length, maxMetricValue, mapMetric]);

  const trendData = useMemo(() => ({
    labels: selectedTrend.map((item) => item.year),
    datasets: [
      {
        label: t("map.trend.series", { defaultValue: "Απόφοιτοι" }),
        data: selectedTrend.map((item) => item.count),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37,99,235,.18)",
        tension: 0.28,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 5,
      },
    ],
  }), [selectedTrend, t]);

  const trendOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 as any },
        grid: { color: "rgba(148,163,184,.18)" },
      },
      x: {
        grid: { display: false },
      },
    },
  }), []);

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
        .map-summary-card {
          min-width: 0;
          padding: 16px 18px;
          display: grid;
          gap: 6px;
        }
        .map-summary-value {
          font-size: 24px;
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
        .map-metric-group {
          display: inline-grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 8px;
          width: 100%;
        }
        .map-metric-button {
          border: 1px solid var(--border);
          background: #ffffff;
          border-radius: 999px;
          min-height: 40px;
          padding: 0 14px;
          font: inherit;
          cursor: pointer;
          color: #334155;
        }
        .map-metric-button.active {
          background: #eff6ff;
          border-color: #93c5fd;
          color: #1d4ed8;
          font-weight: 700;
        }
        .map-actions-bar {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          width: 100%;
          position: relative;
        }
        .map-action-button { width: 100%; min-height: 48px; font-size: 16px; }
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
        .map-trend-card { display: grid; gap: 12px; }
        .map-trend-canvas { height: 240px; }
        @media (max-width: 1100px) {
          .map-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .map-metric-group { grid-template-columns: repeat(3, minmax(0, 1fr)); }
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
          .map-actions-bar { grid-template-columns: 1fr 1fr; }
          .map-controls-row { padding: 14px 14px 0; }
          .map-metric-group { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .map-filters-modal {
            top: 76px;
            width: calc(100vw - 16px);
            max-height: calc(100vh - 88px);
            padding: 12px;
          }
          .map-filters-modal section > div:last-child { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="topbar map-page-title-row" style={{ alignItems: "baseline", gap: 18 }}>
        <h2 style={{ margin: 0, lineHeight: 1, display: "flex", alignItems: "baseline" }}>{t("map.title", { defaultValue: "Χάρτης αποφοίτων" })}</h2>
        <span className="badge" style={{ display: "inline-flex", alignItems: "baseline", lineHeight: 1, paddingTop: 0, paddingBottom: 0 }}>
          {loading ? t("common.loading", { defaultValue: "Φόρτωση..." }) : `${t("map.totalInline", { defaultValue: "Σύνολο" })}: ${total}`}
        </span>
      </div>

      <div className="map-summary-grid">
        <div className="card map-summary-card">
          <div className="label">{t("map.summary.total", { defaultValue: "Σύνολο αποφοίτων" })}</div>
          <div className="map-summary-value">{total}</div>
          <div className="map-summary-sub">{t("map.summary.metric", { defaultValue: "Τρέχουσα απεικόνιση χάρτη" })}: {metricOptions[mapMetric].label}</div>
        </div>
        <div className="card map-summary-card">
          <div className="label">{t("map.summary.topPeriphery", { defaultValue: "Περιφέρεια με τους περισσότερους αποφοίτους" })}</div>
          <div className="map-summary-value">{topPeriphery?.periphery_name || "-"}</div>
          <div className="map-summary-sub">{topPeriphery ? `${topPeriphery.count} ${t("map.export.count", { defaultValue: "Απόφοιτοι" })}` : "-"}</div>
        </div>
        <div className="card map-summary-card">
          <div className="label">{t("map.summary.topCity", { defaultValue: "Πόλη με τους περισσότερους αποφοίτους" })}</div>
          <div className="map-summary-value">{topCity?.city_name || "-"}</div>
          <div className="map-summary-sub">{topCity ? `${topCity.count} ${t("map.export.count", { defaultValue: "Απόφοιτοι" })}` : "-"}</div>
        </div>
        <div className="card map-summary-card">
          <div className="label">{t("map.summary.avgAge", { defaultValue: "Μέση ηλικία αποφοίτων" })}</div>
          <div className="map-summary-value">{weightedAvgAge === null ? "-" : compactNumber(weightedAvgAge)}</div>
          <div className="map-summary-sub">{t("map.summary.fromCurrentFilters", { defaultValue: "Υπολογισμός με βάση τα τρέχοντα φίλτρα" })}</div>
        </div>
      </div>

      {activeFilterChips.length ? (
        <div className="map-filter-chips">
          {activeFilterChips.map((chip) => (
            <span className="map-filter-chip" key={chip}>{chip}</span>
          ))}
          <button className="btn" type="button" onClick={onReset}>{t("common.reset", { defaultValue: "Καθαρισμός" })}</button>
        </div>
      ) : null}

      <div className="page-two-col" style={{ marginTop: 12 }}>
        <div className="card alupla-map-card">
          <div className="map-controls-row">
            <div style={{ display: "grid", gap: 8, width: "100%" }}>
              <label className="label">{t("map.metricLabel", { defaultValue: "Προβολή χάρτη" })}</label>
              <div className="map-metric-group">
                {(["count", "male_pct", "female_pct", "avg_age", "avg_grade"] as MapMetric[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`map-metric-button ${mapMetric === option ? "active" : ""}`}
                    onClick={() => setMapMetric(option)}
                  >
                    {metricOptions[option].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

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
                    icon={cityLabelIcon(mapCityLabel(city))}
                    interactive={false}
                  />
                );
              })}
            </MapContainer>
          </div>

          <div style={{ position: "absolute", left: 12, bottom: 12, background: "rgba(255,255,255,.94)", border: "1px solid var(--border)", borderRadius: 14, padding: "10px 12px", fontSize: 12, boxShadow: "var(--shadow)", maxWidth: 240 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{t("map.legend", { defaultValue: "Υπόμνημα" })}</div>
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
                  <div key={index} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 16, height: 12, display: "inline-block", border: "1px solid #334155", background: color, opacity, borderRadius: 3 }} />
                    <span>{metricOptions[mapMetric].format(from)}–{metricOptions[mapMetric].format(to)}</span>
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
            {!items.length ? (
              <div className="map-empty-state">{t("map.noResults", { defaultValue: "Δεν βρέθηκαν απόφοιτοι με τα συγκεκριμένα φίλτρα." })}</div>
            ) : !selected ? (
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
                  basicsTitle={t("map.detailGroups.basics", { defaultValue: "Βασικά στοιχεία" })}
                  demographicsTitle={t("map.detailGroups.demographics", { defaultValue: "Δημογραφικά" })}
                  academicsTitle={t("map.detailGroups.academics", { defaultValue: "Ακαδημαϊκά" })}
                />

                <div className="card map-trend-card" style={{ padding: 14 }}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontWeight: 700 }}>{t("map.trend.title", { defaultValue: "Μεταβολή αποφοίτων ανά έτος" })}</div>
                    <div className="muted">{selected.periphery_name}</div>
                  </div>
                  {trendLoading ? (
                    <div className="muted">{t("common.loading", { defaultValue: "Φόρτωση..." })}</div>
                  ) : selectedTrend.length ? (
                    <div className="map-trend-canvas">
                      <Line data={trendData} options={trendOptions as any} />
                    </div>
                  ) : (
                    <div className="muted">{t("map.trend.empty", { defaultValue: "Δεν υπάρχουν διαθέσιμα χρονολογικά στοιχεία για την τρέχουσα επιλογή." })}</div>
                  )}
                </div>

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
                        basicsTitle={t("map.detailGroups.basics", { defaultValue: "Βασικά στοιχεία" })}
                        demographicsTitle={t("map.detailGroups.demographics", { defaultValue: "Δημογραφικά" })}
                        academicsTitle={t("map.detailGroups.academics", { defaultValue: "Ακαδημαϊκά" })}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="muted">{t("map.noCities", { defaultValue: "Δεν υπάρχουν διαθέσιμες πόλεις για την τρέχουσα περιφέρεια." })}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
