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
  getMapTrend,
  getGraduatesMap,
  logPublicExport,
  type GraduatesMapItem,
  type MapTrendResponse,
} from "../lib/api";
import greeceRegionsRaw from "../assets/greece-regions.geojson?raw";
import { excelCellValue, exportCsvText, exportElementAsPng, exportWorkbook } from "./map/mapExport";
import { useMapData, useVisibleCities } from "./map/hooks";
import { EMPTY_FILTERS } from "./map/types";
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
import { MapViewportWatcher } from "./map/shared";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend);

type MapMetric = "count" | "dominant_gender" | "dominant_direction";

const fillColors = ["#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#2563eb"];
const genderColors = { male: "#3b82f6", female: "#c084fc", balanced: "#cbd5e1", empty: "#e5e7eb" };
const directionPalette = ["#2563eb", "#7c3aed", "#0f766e", "#ea580c", "#dc2626", "#0891b2", "#65a30d", "#9333ea"];
const chartPalette = ["#2563eb", "#c084fc", "#0f766e", "#ea580c", "#dc2626", "#0891b2", "#65a30d", "#9333ea"];

function compactNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  if (Number.isInteger(numeric)) return String(numeric);
  return numeric.toFixed(1);
}

function detailValue(value: number | string | null | undefined, suffix = "") {
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

function directionColor(label: string) {
  if (!label) return genderColors.empty;
  return directionPalette[hashLabel(label) % directionPalette.length];
}

function slugPart(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "map";
}

function InfoBox({ title, totalText, groups }: { title: string; totalText: string; groups: Array<{ title: string; rows: Array<{ label: string; value: string }> }> }) {
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

export default function GraduatesMapPage() {
  const { t, i18n } = useTranslation(["map", "common"]);
  const mt = useCallback((key: string, options?: Record<string, unknown>) => t(key, { ns: "map", ...(options || {}) }), [t]);
  const ct = useCallback((key: string, options?: Record<string, unknown>) => t(`common.${key}`, { ns: "common", ...(options || {}) }), [t]);

  const mapRef = useRef<L.Map | null>(null);
  const mapCanvasRef = useRef<HTMLDivElement | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  const [mapMetric, setMapMetric] = useState<MapMetric>("count");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [mapZoom, setMapZoom] = useState(6.5);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [selected, setSelected] = useState<GraduatesMapItem | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trend, setTrend] = useState<MapTrendResponse | null>(null);
  const [selectedDirectionIds, setSelectedDirectionIds] = useState<number[]>([]);

  const params = useMemo(() => createMapParams(EMPTY_FILTERS), []);
  const { loading, items, cityPoints, cityStatsLoading, selectedCityStats } = useMapData(params, selected?.periphery_id);

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

  useLayoutEffect(() => {
    if (!geojsonBounds || !mapRef.current) return;
    const map = mapRef.current;
    const sync = () => {
      map.invalidateSize();
      map.fitBounds(geojsonBounds, { padding: [6, 6], maxZoom: 6.75 });
      setMapZoom(map.getZoom());
      setMapBounds(map.getBounds());
    };
    const frame = window.requestAnimationFrame(sync);
    const timer = window.setTimeout(sync, 120);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [geojsonBounds]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!exportMenuRef.current) return;
      if (exportMenuRef.current.contains(event.target as Node)) return;
      setShowExportMenu(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const metricOptions = useMemo(() => ({
    count: {
      label: mt("metricOptions.count", { defaultValue: "Πλήθος αποφοίτων" }),
      legend: mt("export.count", { defaultValue: "Απόφοιτοι" }),
      value: (item: GraduatesMapItem) => Number(item.count ?? 0) || 0,
    },
    dominant_gender: {
      label: mt("metricOptions.dominantGender", { defaultValue: "Κυρίαρχο φύλο" }),
      legend: mt("legendLabels.dominantGender", { defaultValue: "Κυρίαρχο φύλο" }),
      value: (item: GraduatesMapItem) => Math.abs((Number(item.male_count ?? 0) || 0) - (Number(item.female_count ?? 0) || 0)),
    },
    dominant_direction: {
      label: mt("metricOptions.dominantDirection", { defaultValue: "Κυρίαρχη κατεύθυνση" }),
      legend: mt("legendLabels.dominantDirection", { defaultValue: "Κυρίαρχη κατεύθυνση" }),
      value: (item: GraduatesMapItem) => Number(item.dominant_recent_direction_count ?? 0) || 0,
    },
  }), [mt]);

  const valuesByGreekName = useMemo(() => {
    const next = new Map<string, number>();
    const getter = metricOptions[mapMetric].value;
    items.forEach((item) => next.set(normalizeKey(item.periphery_name || ""), getter(item)));
    return next;
  }, [items, mapMetric, metricOptions]);

  const maxMetricValue = useMemo(() => {
    let max = 1;
    const getter = metricOptions[mapMetric].value;
    items.forEach((item) => {
      const value = getter(item);
      if (Number.isFinite(value) && value > max) max = value;
    });
    return max;
  }, [items, mapMetric, metricOptions]);

  const categoricalLegendEntries = useMemo(() => {
    if (mapMetric === "dominant_gender") {
      return [
        { label: mt("legendLabels.moreMen", { defaultValue: "Περισσότεροι άνδρες" }), color: genderColors.male },
        { label: mt("legendLabels.moreWomen", { defaultValue: "Περισσότερες γυναίκες" }), color: genderColors.female },
        { label: mt("legendLabels.balance", { defaultValue: "Ισορροπία" }), color: genderColors.balanced },
      ];
    }
    if (mapMetric === "dominant_direction") {
      return Array.from(new Set(items.map((item) => item.dominant_recent_direction).filter(Boolean) as string[])).map((label) => ({ label, color: directionColor(label) }));
    }
    return [] as Array<{ label: string; color: string }>;
  }, [items, mapMetric, mt]);

  const valuesRef = useRef(valuesByGreekName);
  const itemsRef = useRef(items);
  valuesRef.current = valuesByGreekName;
  itemsRef.current = items;

  function featureName(feature: any) {
    const properties = feature?.properties || {};
    return String(properties.name_greek || properties.name_el || properties.name || properties.NAME || "");
  }

  function itemForFeature(feature: any) {
    return itemsRef.current.find((item) => normalizeKey(item.periphery_name || "") === normalizeKey(featureName(feature))) || null;
  }

  function styleForFeature(feature: any) {
    const match = itemForFeature(feature);
    if (mapMetric === "dominant_gender") {
      if (!match || !Number(match.count)) return { color: "#334155", weight: 1, fillColor: genderColors.empty, fillOpacity: 0.18 };
      if (match.dominant_gender === "M") return { color: "#334155", weight: 1, fillColor: genderColors.male, fillOpacity: 0.82 };
      if (match.dominant_gender === "F") return { color: "#334155", weight: 1, fillColor: genderColors.female, fillOpacity: 0.82 };
      return { color: "#334155", weight: 1, fillColor: genderColors.balanced, fillOpacity: 0.82 };
    }
    if (mapMetric === "dominant_direction") {
      const label = match?.dominant_recent_direction || "";
      if (!match || !label) return { color: "#334155", weight: 1, fillColor: genderColors.empty, fillOpacity: 0.18 };
      return { color: "#334155", weight: 1, fillColor: directionColor(label), fillOpacity: 0.82 };
    }
    const value = valuesRef.current.get(normalizeKey(featureName(feature))) ?? 0;
    return {
      color: "#334155",
      weight: 1,
      fillColor: fillColorForCount(value, maxMetricValue, fillColors),
      fillOpacity: fillOpacityForCount(value),
    };
  }

  function tooltipHtml(feature: any) {
    const label = featureName(feature);
    const match = itemForFeature(feature);
    const total = Number(match?.count ?? 0) || 0;
    if (mapMetric === "dominant_gender") {
      const dominant = !match || !total
        ? mt("legendLabels.noData", { defaultValue: "Χωρίς δεδομένα" })
        : match.dominant_gender === "M"
          ? mt("legendLabels.moreMen", { defaultValue: "Περισσότεροι άνδρες" })
          : match.dominant_gender === "F"
            ? mt("legendLabels.moreWomen", { defaultValue: "Περισσότερες γυναίκες" })
            : mt("legendLabels.balance", { defaultValue: "Ισορροπία" });
      return `<div class="alupla-region-tip-title">${label}</div><div class="alupla-region-tip-sub">${mt("tooltip.dominantGender", { defaultValue: "Κυρίαρχο φύλο" })}: ${dominant}</div><div class="alupla-region-tip-sub">${mt("malePct", { defaultValue: "% Άνδρες" })}: ${compactNumber(match?.male_pct)}%</div><div class="alupla-region-tip-sub">${mt("femalePct", { defaultValue: "% Γυναίκες" })}: ${compactNumber(match?.female_pct)}%</div><div class="alupla-region-tip-sub">${mt("total", { total, defaultValue: "Σύνολο: {{total}}" })}</div>`;
    }
    if (mapMetric === "dominant_direction") {
      return `<div class="alupla-region-tip-title">${label}</div><div class="alupla-region-tip-sub">${mt("tooltip.dominantDirection", { defaultValue: "Κυρίαρχη κατεύθυνση" })}: ${match?.dominant_recent_direction || mt("legendLabels.noData", { defaultValue: "Χωρίς δεδομένα" })}</div><div class="alupla-region-tip-sub">${mt("directionCount", { count: Number(match?.dominant_recent_direction_count ?? 0) || 0, defaultValue: "Απόφοιτοι κατεύθυνσης: {{count}}" })}</div><div class="alupla-region-tip-sub">${mt("total", { total, defaultValue: "Σύνολο: {{total}}" })}</div>`;
    }
    return `<div class="alupla-region-tip-title">${label}</div><div class="alupla-region-tip-sub">${mt("export.count", { defaultValue: "Απόφοιτοι" })}: ${total}</div>`;
  }

  useEffect(() => {
    const layer = geoJsonLayerRef.current;
    if (!layer) return;
    layer.eachLayer((entryLayer: any) => {
      const feature = entryLayer?.feature;
      if (!feature) return;
      entryLayer.setStyle(styleForFeature(feature));
      if (entryLayer.getTooltip()) entryLayer.setTooltipContent(tooltipHtml(feature));
    });
  }, [items, mapMetric, maxMetricValue, i18n.language]);

  useEffect(() => {
    if (!selected) {
      setTrend(null);
      setSelectedDirectionIds([]);
      return;
    }
    let active = true;
    setTrendLoading(true);
    getMapTrend({ periphery_id: selected.periphery_id, mode: mapMetric, direction_ids: selectedDirectionIds.join(",") })
      .then((response) => {
        if (!active) return;
        setTrend(response || null);
        if (mapMetric === "dominant_direction") {
          const available = Array.isArray(response?.availableDirections) ? response.availableDirections : [];
          setSelectedDirectionIds((prev) => {
            const kept = prev.filter((id) => available.some((item: any) => Number(item.id) === id));
            if (kept.length) return kept;
            const firstId = Number(available[0]?.id || 0);
            return firstId ? [firstId] : [];
          });
        }
      })
      .catch(() => {
        if (active) setTrend(null);
      })
      .finally(() => {
        if (active) setTrendLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selected, mapMetric, selectedDirectionIds.join(",")]);

  const total = useMemo(() => items.reduce((sum, item) => sum + (Number(item.count) || 0), 0), [items]);
  const visibleCities = useVisibleCities(cityPoints, mapBounds, mapZoom);
  const topPeriphery = useMemo(() => items[0] || null, [items]);
  const topCity = useMemo(() => cityPoints[0] || null, [cityPoints]);
  const weightedAvgAge = useMemo(() => {
    let weightedSum = 0;
    let weightedCount = 0;
    items.forEach((item) => {
      const avgAge = Number(item.avg_age ?? NaN);
      const count = Number(item.count ?? 0) || 0;
      if (!Number.isFinite(avgAge) || count <= 0) return;
      weightedSum += avgAge * count;
      weightedCount += count;
    });
    return weightedCount ? Math.round((weightedSum / weightedCount) * 10) / 10 : null;
  }, [items]);

  const buckets = useMemo(() => legendBuckets(maxMetricValue), [maxMetricValue]);
  const geoRenderKey = useMemo(() => `${mapMetric}:${items.map((item) => `${item.periphery_id}:${metricOptions[mapMetric].value(item)}`).join("|")}`, [items, mapMetric, metricOptions]);

  const trendLabels = trend?.labels?.length ? trend.labels : Array.from({ length: 8 }, () => "");
  const trendData = useMemo(() => ({
    labels: trendLabels,
    datasets: (trend?.datasets?.length ? trend.datasets : [{ key: "empty", label: "", values: trendLabels.map(() => null) }]).map((dataset, index) => ({
      label: dataset.label,
      data: dataset.values,
      borderColor: chartPalette[index % chartPalette.length],
      backgroundColor: "rgba(37,99,235,.08)",
      tension: 0.28,
      fill: false,
      pointRadius: trend?.datasets?.length ? 3 : 0,
      pointHoverRadius: trend?.datasets?.length ? 4 : 0,
      borderWidth: trend?.datasets?.length ? 3 : 1.5,
      spanGaps: false,
    })),
  }), [trend, trendLabels]);

  const trendOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: Boolean(trend?.datasets?.length) }, tooltip: { enabled: Boolean(trend?.datasets?.length) } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: trend?.datasets?.length ? { precision: 0 as any } : { display: false },
        grid: { color: "rgba(148,163,184,.18)" },
      },
      x: {
        ticks: trend?.datasets?.length ? { autoSkip: false, maxRotation: 0, minRotation: 0 } : { display: false },
        grid: { color: "rgba(148,163,184,.18)" },
      },
    },
  }), [trend]);

  function exportRows() {
    return items.map((item) => ({
      [mt("export.periphery", { defaultValue: "Περιφέρεια" })]: excelCellValue(item.periphery_name),
      [mt("export.countDetailed", { defaultValue: "Πλήθος αποφοίτων περιφέρειας" })]: excelCellValue(item.count),
      [mt("maleCount", { defaultValue: "Άνδρες" })]: excelCellValue(item.male_count ?? 0),
      [mt("femaleCount", { defaultValue: "Γυναίκες" })]: excelCellValue(item.female_count ?? 0),
      [mt("dominantDirection", { defaultValue: "Κυρίαρχη κατεύθυνση" })]: excelCellValue(item.dominant_recent_direction ?? ""),
    }));
  }

  function currentFilenameBase() {
    const parts = ["alupla_map", slugPart(mapMetric)];
    if (selected?.periphery_name) parts.push(slugPart(selected.periphery_name));
    return parts.join("_");
  }

  async function onExportExcel() {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(exportRows());
    XLSX.utils.book_append_sheet(workbook, sheet, "Map");
    exportWorkbook(`${currentFilenameBase()}.xlsx`, workbook);
    try { await logPublicExport("map_export", "xlsx"); } catch {}
  }

  async function onExportCsv() {
    const rows = exportRows();
    const headers = Object.keys(rows[0] || {});
    const esc = (value: any) => {
      const text = String(value ?? "");
      if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
      return text;
    };
    const lines = [headers.map(esc).join(","), ...rows.map((row) => headers.map((header) => esc((row as any)[header])).join(","))];
    exportCsvText(`${currentFilenameBase()}.csv`, lines.join("\n"));
    try { await logPublicExport("map_export", "csv"); } catch {}
  }

  async function onExportPng() {
    if (!mapCanvasRef.current) return;
    await exportElementAsPng(mapCanvasRef.current, `${currentFilenameBase()}.png`);
    try { await logPublicExport("map_export", "png"); } catch {}
  }

  function detailGroups(item: any) {
    if (mapMetric === "dominant_gender") {
      return [
        {
          title: mt("detailGroups.demographics", { defaultValue: "Δημογραφικά" }),
          rows: [
            { label: mt("maleCount", { defaultValue: "Άνδρες" }), value: detailValue(item.male_count ?? 0) },
            { label: mt("femaleCount", { defaultValue: "Γυναίκες" }), value: detailValue(item.female_count ?? 0) },
            { label: mt("malePct", { defaultValue: "% Άνδρες" }), value: detailValue(item.male_pct, "%") },
            { label: mt("femalePct", { defaultValue: "% Γυναίκες" }), value: detailValue(item.female_pct, "%") },
          ],
        },
      ];
    }
    if (mapMetric === "dominant_direction") {
      return [
        {
          title: mt("detailGroups.demographics", { defaultValue: "Δημογραφικά" }),
          rows: [
            { label: mt("dominantDirection", { defaultValue: "Κυρίαρχη κατεύθυνση" }), value: item.dominant_recent_direction || "-" },
            { label: mt("directionCount", { defaultValue: "Απόφοιτοι κατεύθυνσης" }), value: detailValue(item.dominant_recent_direction_count ?? 0) },
          ],
        },
      ];
    }
    return [
      {
        title: mt("detailGroups.demographics", { defaultValue: "Δημογραφικά" }),
        rows: [
          { label: mt("avgAge", { defaultValue: "Μέση ηλικία" }), value: detailValue(item.avg_age) },
        ],
      },
      {
        title: mt("detailGroups.academics", { defaultValue: "Ακαδημαϊκά" }),
        rows: [
          { label: mt("avgGrade", { defaultValue: "Μέσος βαθμός" }), value: detailValue(item.avg_grade) },
          { label: mt("avgGraduationYears", { defaultValue: "Μέσος χρόνος αποφοίτησης" }), value: detailValue(item.avg_graduation_years) },
        ],
      },
    ];
  }

  return (
    <div className="container">
      <style>{`
        .leaflet-container path:focus, .leaflet-interactive:focus, .leaflet-container:focus { outline: none !important; }
        .alupla-map .leaflet-container { background: transparent !important; }
        .alupla-map-card { padding: 0; overflow: hidden; position: relative; }
        .alupla-city-label-icon { background: transparent !important; border: 0 !important; }
        .alupla-city-point { position: relative; display: block; width: 1px; height: 1px; overflow: visible; pointer-events: none; }
        .alupla-city-label-text { position: absolute; left: 50%; bottom: 7px; transform: translateX(-50%); color: #1e293b; font-size: 12px; font-weight: 600; white-space: nowrap; text-shadow: 0 1px 2px rgba(255,255,255,.95), 0 0 6px rgba(255,255,255,.9); }
        .alupla-city-label-dot { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 5px; height: 5px; border-radius: 999px; background: #1e293b; box-shadow: 0 0 0 2px rgba(255,255,255,.92); }
        .leaflet-tooltip.alupla-region-tooltip { background: rgba(248,250,252,.98); color: #0f172a; border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow); padding: 10px 12px; }
        .leaflet-tooltip.alupla-region-tooltip:before { border-top-color: var(--border); }
        .alupla-region-tip-title { font-weight: 700; margin-bottom: 4px; }
        .alupla-region-tip-sub { color: #64748b; font-size: 12px; }
        .map-top-menu-card { padding: 20px 16px 16px; display: grid; gap: 14px; }
        .map-top-menu-title { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .map-top-menu-title h2 { margin: 0; }
        .map-metric-group { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; width: 100%; }
        .map-metric-button, .map-action-button { width: 100%; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; }
        .map-metric-button.active { background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 700; }
        .map-export-menu { position: absolute; top: calc(100% + 8px); right: 0; width: 220px; background: #fff; border: 1px solid var(--border); border-radius: 14px; box-shadow: 0 18px 40px rgba(15,23,42,.16); padding: 8px; z-index: 3000; display: grid; gap: 6px; }
        .map-export-item { width: 100%; border: 0; background: transparent; text-align: left; padding: 10px 12px; border-radius: 10px; cursor: pointer; font: inherit; }
        .map-export-item:hover { background: #f8fafc; }
        .map-summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 12px 0 0; }
        .map-summary-card { min-height: 124px; padding: 18px; display: grid; align-content: space-between; gap: 8px; }
        .map-summary-label { color: #475569; font-size: 17px; line-height: 1.32; }
        .map-summary-value { font-size: 28px; font-weight: 800; line-height: 1.1; color: #0f172a; }
        .map-summary-sub { color: #64748b; font-size: 13px; line-height: 1.35; }
        .map-main-card { margin: 12px auto 0; max-width: 1080px; }
        .map-map-wrap { position: relative; padding: 8px 8px 12px; }
        .map-main-card .map-canvas { height: clamp(760px, 80vh, 940px); min-height: 760px; }
        .map-trend-card, .map-combined-details-card { margin-top: 12px; padding: 16px; display: grid; gap: 12px; }
        .map-trend-canvas { height: 260px; min-height: 260px; width: 100%; }
        .map-trend-scroll { overflow: hidden; min-height: 260px; }
        .map-info-box { border: 1px solid var(--border); border-radius: 16px; background: rgba(248,250,252,.82); padding: 16px 18px; display: grid; gap: 14px; }
        .map-info-box-header, .map-info-group, .map-info-metrics, .map-info-metric { display: grid; gap: 6px; }
        .map-info-box-title { font-size: 18px; font-weight: 800; color: #0f172a; }
        .map-info-total-line, .map-info-metric-label { color: #64748b; font-size: 13px; }
        .map-info-groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px; }
        .map-info-group-title, .map-info-metric-value { color: #0f172a; font-weight: 800; }
        .map-city-cards-inline { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
        .map-filter-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        @media (max-width: 1100px) { .map-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 640px) { .map-metric-group, .map-summary-grid, .map-city-cards-inline { grid-template-columns: 1fr; } }
      `}</style>

      <div className="card map-top-menu-card">
        <div className="map-top-menu-title">
          <h2>{mt("title", { defaultValue: "Χάρτης αποφοίτων" })}</h2>
          <span className="badge">{loading ? ct("loading", { defaultValue: "Φόρτωση..." }) : `${total} ${mt("totalInline", { defaultValue: "σύνολο" })}`}</span>
        </div>
        <div className="map-metric-group">
          {(["count", "dominant_gender", "dominant_direction"] as MapMetric[]).map((option) => (
            <button key={option} type="button" className={`btn map-metric-button ${mapMetric === option ? "active primary" : ""}`} onClick={() => setMapMetric(option)}>
              {metricOptions[option].label}
            </button>
          ))}
          <div ref={exportMenuRef} style={{ position: "relative" }}>
            <button className="btn map-action-button" type="button" style={{ width: "100%" }} onClick={() => setShowExportMenu((prev) => !prev)}>
              {ct("export", { defaultValue: "Εξαγωγή" })}
            </button>
            {showExportMenu ? (
              <div className="map-export-menu">
                <button className="map-export-item" type="button" onClick={() => { setShowExportMenu(false); void onExportExcel(); }}>Excel</button>
                <button className="map-export-item" type="button" onClick={() => { setShowExportMenu(false); void onExportCsv(); }}>CSV</button>
                <button className="map-export-item" type="button" onClick={() => { setShowExportMenu(false); void onExportPng(); }}>PNG</button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="map-summary-grid">
        <div className="card map-summary-card"><div className="map-summary-label">{mt("summary.total", { defaultValue: "Σύνολο αποφοίτων" })}</div><div className="map-summary-value">{total}</div></div>
        <div className="card map-summary-card"><div className="map-summary-label">{mt("summary.topPeriphery", { defaultValue: "Περιφέρεια με τους περισσότερους αποφοίτους" })}</div><div className="map-summary-value">{topPeriphery?.periphery_name || "-"}</div><div className="map-summary-sub">{topPeriphery ? `${topPeriphery.count} ${mt("export.count", { defaultValue: "Απόφοιτοι" })}` : "-"}</div></div>
        <div className="card map-summary-card"><div className="map-summary-label">{mt("summary.topCity", { defaultValue: "Πόλη με τους περισσότερους αποφοίτους" })}</div><div className="map-summary-value">{topCity?.city_name || "-"}</div><div className="map-summary-sub">{topCity ? `${topCity.count} ${mt("export.count", { defaultValue: "Απόφοιτοι" })}` : "-"}</div></div>
        <div className="card map-summary-card"><div className="map-summary-label">{mt("summary.avgAge", { defaultValue: "Μέση ηλικία αποφοίτων" })}</div><div className="map-summary-value">{weightedAvgAge === null ? "-" : compactNumber(weightedAvgAge)}</div></div>
      </div>

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
                if (geojsonBounds) map.fitBounds(geojsonBounds, { padding: [6, 6], maxZoom: 6.75 });
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
                  ref={(layer) => { geoJsonLayerRef.current = layer; }}
                  data={geojson as any}
                  style={(feature: any) => styleForFeature(feature) as any}
                  onEachFeature={(feature: any, layer: any) => {
                    layer.bindTooltip(tooltipHtml(feature), { sticky: true, className: "alupla-region-tooltip" });
                    layer.on({
                      mouseover: () => {
                        layer.setStyle({ weight: 2 });
                        layer.bringToFront();
                        layer.setTooltipContent(tooltipHtml(feature));
                      },
                      mouseout: () => layer.setStyle({ weight: 1 }),
                      click: () => {
                        const hit = items.find((item) => normalizeKey(item.periphery_name || "") === normalizeKey(featureName(feature)));
                        setSelected(hit || null);
                      },
                    });
                  }}
                />
              ) : null}
              {visibleCities.map((city) => {
                const latitude = mapCityLatitude(city);
                const longitude = mapCityLongitude(city);
                if (latitude === null || longitude === null) return null;
                return <Marker key={mapCityKey(city)} position={[latitude, longitude]} icon={cityLabelIcon(mapCityLabel(city))} interactive={false} />;
              })}
            </MapContainer>
          </div>

          <div style={{ position: "absolute", left: 12, bottom: 12, background: "rgba(255,255,255,.94)", border: "1px solid var(--border)", borderRadius: 14, padding: "10px 12px", fontSize: 12, boxShadow: "var(--shadow)", maxWidth: 260 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{mt("legend", { defaultValue: "Υπόμνημα" })}</div>
            <div className="muted" style={{ marginBottom: 8 }}>{metricOptions[mapMetric].legend}</div>
            <div style={{ display: "grid", gap: 6 }}>
              {mapMetric === "count" ? Array.from({ length: 5 }).map((_, index) => {
                const from = buckets[index];
                const to = buckets[index + 1];
                const mid = (from + to) / 2;
                return (
                  <div key={`${from}-${to}`} style={{ display: "grid", gridTemplateColumns: "18px 1fr", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 18, height: 12, borderRadius: 999, background: fillColorForCount(mid, maxMetricValue, fillColors), opacity: fillOpacityForCount(mid), border: "1px solid rgba(51,65,85,.18)" }} />
                    <span>{`${Math.round(from)}–${Math.round(to)}`}</span>
                  </div>
                );
              }) : categoricalLegendEntries.map((entry) => (
                <div key={entry.label} style={{ display: "grid", gridTemplateColumns: "18px 1fr", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 18, height: 12, borderRadius: 999, background: entry.color, opacity: 0.82, border: "1px solid rgba(51,65,85,.18)" }} />
                  <span>{entry.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selected ? (
        <>
          <div className="card map-trend-card">
            <div style={{ display: "grid", gap: 4 }}>
              <div style={{ fontWeight: 700 }}>
                {mapMetric === "dominant_gender"
                  ? mt("trend.genderTitle", { defaultValue: "Μεταβολή φύλου ανά έτος" })
                  : mapMetric === "dominant_direction"
                    ? mt("trend.directionTitle", { defaultValue: "Μεταβολή κατεύθυνσης ανά έτος" })
                    : mt("trend.title", { defaultValue: "Μεταβολή αποφοίτων ανά έτος" })}
              </div>
              <div className="muted">{selected.periphery_name}</div>
            </div>
            {mapMetric === "dominant_direction" && trend?.availableDirections?.length ? (
              <div className="map-filter-chips">
                {trend.availableDirections.map((direction) => {
                  const active = selectedDirectionIds.includes(Number(direction.id));
                  return (
                    <button
                      key={direction.id}
                      type="button"
                      className={`btn ${active ? "primary" : ""}`}
                      onClick={() => setSelectedDirectionIds((prev) => {
                        const directionId = Number(direction.id);
                        if (prev.includes(directionId)) return prev.filter((id) => id !== directionId);
                        return [...prev, directionId];
                      })}
                    >
                      {direction.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div className="map-trend-scroll"><div className="map-trend-canvas"><Line data={trendData} options={trendOptions as any} /></div></div>
            {trendLoading ? <div className="muted">{ct("loading", { defaultValue: "Φόρτωση..." })}</div> : !trend?.datasets?.length ? <div className="muted">{mt("trend.empty", { defaultValue: "Δεν υπάρχουν διαθέσιμα χρονολογικά στοιχεία για την τρέχουσα επιλογή." })}</div> : null}
          </div>

          <div className="card map-combined-details-card">
            <div style={{ fontWeight: 800, fontSize: 18 }}>{mt("infoTitle", { defaultValue: "Πληροφορίες" })}</div>
            <InfoBox title={selected.periphery_name} totalText={mt("totalGraduatesLine", { total: selected.count, defaultValue: "Σύνολο αποφοίτων: {{total}}" })} groups={detailGroups(selected)} />
            <div style={{ fontWeight: 700 }}>{mt("citiesTitle", { defaultValue: "Πόλεις" })}</div>
            {cityStatsLoading ? <div className="muted">{ct("loading", { defaultValue: "Φόρτωση..." })}</div> : selectedCityStats.length ? (
              <div className="map-city-cards-inline">
                {selectedCityStats.map((city) => <InfoBox key={city.city} title={city.city} totalText={mt("totalGraduatesLine", { total: city.count, defaultValue: "Σύνολο αποφοίτων: {{total}}" })} groups={detailGroups(city)} />)}
              </div>
            ) : <div className="muted">{mt("noCities", { defaultValue: "Δεν υπάρχουν διαθέσιμες πόλεις για την τρέχουσα περιφέρεια." })}</div>}
          </div>
        </>
      ) : items.length ? (
        <div className="card map-combined-details-card"><div className="muted">{mt("detailsHint", { defaultValue: "Κάνε κλικ σε μία περιφέρεια για λεπτομέρειες." })}</div></div>
      ) : (
        <div className="card map-combined-details-card"><div className="muted">{mt("noResults", { defaultValue: "Δεν βρέθηκαν απόφοιτοι με τα συγκεκριμένα φίλτρα." })}</div></div>
      )}
    </div>
  );
}
