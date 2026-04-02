import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { GeoJSON, MapContainer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as XLSX from "xlsx";
import { Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import {
  getGraduatesMap,
  getMapCities,
  getMapCityDetail,
  listStudyPrograms,
  logPublicExport,
  type GraduatesMapItem,
  type MapCityDetailResponse,
  type StudyProgram,
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

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend, ArcElement);

type MapMetric = "count" | "dominant_gender" | "dominant_direction";
type ExportFormat = "xlsx" | "csv" | "png";
type ExportCategoryKey = MapMetric;

const fillColors = ["#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#2563eb"];
const genderColors = { male: "#3b82f6", female: "#c084fc", balanced: "#cbd5e1", empty: "#e5e7eb" };
const directionPalette = ["#2563eb", "#dc2626", "#16a34a", "#f59e0b", "#7c3aed", "#0891b2", "#e11d48", "#65a30d", "#ea580c", "#4f46e5", "#db2777", "#0f766e", "#b91c1c", "#0284c7", "#a16207", "#9333ea", "#15803d", "#c2410c", "#1d4ed8", "#be123c"];
const chartPalette = directionPalette;

function useCompactMapViewport() {
  const [isCompact, setIsCompact] = useState(() => typeof window !== "undefined" ? window.innerWidth <= 820 : false);

  useEffect(() => {
    const update = () => setIsCompact(window.innerWidth <= 820);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return isCompact;
}

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

function buildDirectionColorMap(labels: string[]) {
  const unique = Array.from(new Set(labels.map((label) => String(label || "").trim()).filter(Boolean)));
  unique.sort((left, right) => left.localeCompare(right, "el"));
  const pairs = unique.map((label, index) => [label, directionPalette[index % directionPalette.length]]);
  return new Map<string, string>(pairs);
}

function directionColor(label: string, colorMap?: Map<string, string>) {
  if (!label) return genderColors.empty;
  if (colorMap?.has(label)) return colorMap.get(label) || genderColors.empty;
  return directionPalette[hashLabel(label) % directionPalette.length];
}

function isPlaceholderLegendLabel(value: string) {
  const normalized = normalizeKey(String(value || ""))
    .replace(/[–—−‑‒﹘﹣]/g, "-")
    .replace(/\s+/g, "")
    .trim();
  return /^\d+-\d+$/.test(normalized) && normalized.split("-")[0] === normalized.split("-")[1];
}

function colorWithAlpha(color: string, alpha: number) {
  if (color.startsWith("#") && (color.length === 7 || color.length === 4)) {
    const hex = color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}

function programSortScore(label: string) {
  const value = String(label || "");
  const years = Array.from(value.matchAll(/(19|20)\d{2}/g)).map((match) => Number(match[0]));
  const current = /σημερα|σήμερα|today|present|current/i.test(value) ? 1 : 0;
  const maxYear = years.length ? Math.max(...years) : 0;
  const minYear = years.length ? Math.min(...years) : 0;
  return current * 1000000 + maxYear * 1000 + minYear;
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
  const programMenuRef = useRef<HTMLDivElement | null>(null);

  const [mapMetric, setMapMetric] = useState<MapMetric>("count");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showProgramMenu, setShowProgramMenu] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = useState<ExportFormat | null>(null);
  const [selectedExportCategories, setSelectedExportCategories] = useState<ExportCategoryKey[]>([]);
  const [selectedExportStudyProgramIds, setSelectedExportStudyProgramIds] = useState<string[]>([]);
  const [exportingSelection, setExportingSelection] = useState(false);
  const [mapZoom, setMapZoom] = useState(6.5);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [selected, setSelected] = useState<GraduatesMapItem | null>(null);
  const [selectedCityPoint, setSelectedCityPoint] = useState<any | null>(null);
  const [cityDetailLoading, setCityDetailLoading] = useState(false);
  const [cityDetail, setCityDetail] = useState<MapCityDetailResponse | null>(null);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);
  const [selectedStudyProgramId, setSelectedStudyProgramId] = useState<string>("");
  const [directionModeReady, setDirectionModeReady] = useState(false);
  const isCompactViewport = useCompactMapViewport();
  const fitPadding = isCompactViewport ? [18, 18] as [number, number] : [6, 6] as [number, number];
  const fitMaxZoom = isCompactViewport ? 6.25 : 6.75;
  const initialZoom = isCompactViewport ? 6.2 : 6.75;
  const minMapZoom = isCompactViewport ? 5.6 : 5.8;

  const params = useMemo(() => createMapParams({
    ...EMPTY_FILTERS,
    ...(mapMetric === "dominant_direction" && directionModeReady && selectedStudyProgramId ? { study_program_id: selectedStudyProgramId } : {}),
  }), [directionModeReady, mapMetric, selectedStudyProgramId]);
  const shouldShowDirectionData = mapMetric !== "dominant_direction" || (directionModeReady && !!selectedStudyProgramId);
  const { loading, items, cityPoints, cityStatsLoading, selectedCityStats } = useMapData(params, shouldShowDirectionData ? selected?.periphery_id : null);

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
      map.fitBounds(geojsonBounds, { padding: fitPadding, maxZoom: fitMaxZoom });
      setMapZoom(map.getZoom());
      setMapBounds(map.getBounds());
    };
    const frame = window.requestAnimationFrame(sync);
    const timer = window.setTimeout(sync, 120);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [fitMaxZoom, fitPadding, geojsonBounds]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      const target = event.target as Node;
      if (exportMenuRef.current && !exportMenuRef.current.contains(target)) {
        setShowExportMenu(false);
      }
      if (programMenuRef.current && !programMenuRef.current.contains(target)) {
        setShowProgramMenu(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    let active = true;
    listStudyPrograms()
      .then((response) => {
        if (!active) return;
        const items = Array.isArray(response?.items) ? [...response.items] : [];
        items.sort((left, right) => {
          const leftLabel = String(left.name_el || left.name_en || left.code || "");
          const rightLabel = String(right.name_el || right.name_en || right.code || "");
          const scoreDiff = programSortScore(rightLabel) - programSortScore(leftLabel);
          if (scoreDiff !== 0) return scoreDiff;
          return leftLabel.localeCompare(rightLabel, "el");
        });
        setStudyPrograms(items);
        setSelectedStudyProgramId((current) => {
          if (current && items.some((item) => String(item.id) === current)) return current;
          return items[0] ? String(items[0].id) : "";
        });
      })
      .catch(() => {
        if (active) setStudyPrograms([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (mapMetric !== "dominant_direction") {
      setDirectionModeReady(false);
      return;
    }
    if (!studyPrograms.length) {
      setSelectedStudyProgramId("");
      setDirectionModeReady(false);
      return;
    }
    setSelectedStudyProgramId((current) => (studyPrograms.some((item) => String(item.id) === current) ? current : String(studyPrograms[0].id)));
    setDirectionModeReady((current) => current || !!selectedStudyProgramId);
  }, [mapMetric, selectedStudyProgramId, studyPrograms]);

  useEffect(() => {
    if (mapMetric !== "dominant_direction") return;
    if (!selectedStudyProgramId) return;
    setDirectionModeReady(true);
  }, [mapMetric, selectedStudyProgramId]);

  useEffect(() => {
    if (mapMetric !== "dominant_direction") return;
    if (directionModeReady && selectedStudyProgramId) return;
    setSelectedCityPoint(null);
  }, [directionModeReady, mapMetric, selectedStudyProgramId]);

  useEffect(() => {
    if (!selected) return;
    const nextSelected = items.find((item) => item.periphery_id === selected.periphery_id) || null;
    if (!nextSelected) {
      setSelected(null);
      return;
    }
    if (nextSelected === selected) return;
    setSelected(nextSelected);
  }, [items, selected]);

  useEffect(() => {
    if (!selectedCityPoint) {
      setCityDetail(null);
      return;
    }
    let active = true;
    setCityDetailLoading(true);
    getMapCityDetail({
      city_id: selectedCityPoint.city_id,
      mode: mapMetric,
      ...(mapMetric === "dominant_direction" && selectedStudyProgramId ? { study_program_id: selectedStudyProgramId } : {}),
    })
      .then((response) => {
        if (!active) return;
        setCityDetail(response || null);
      })
      .catch(() => {
        if (active) setCityDetail(null);
      })
      .finally(() => {
        if (active) setCityDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedCityPoint?.city_id, mapMetric, selectedStudyProgramId]);

  const selectedStudyProgram = useMemo(() => studyPrograms.find((item) => String(item.id) === selectedStudyProgramId) || null, [studyPrograms, selectedStudyProgramId]);

  const selectedStudyProgramLabel = useMemo(() => {
    if (!selectedStudyProgram) return "";
    return i18n.language === "en"
      ? String(selectedStudyProgram.name_en || selectedStudyProgram.name_el || selectedStudyProgram.code || "")
      : String(selectedStudyProgram.name_el || selectedStudyProgram.name_en || selectedStudyProgram.code || "");
  }, [i18n.language, selectedStudyProgram]);

  const studyProgramOptions = useMemo(() => studyPrograms.map((item) => ({
    id: String(item.id),
    label: i18n.language === "en"
      ? String(item.name_en || item.name_el || item.code || "")
      : String(item.name_el || item.name_en || item.code || ""),
  })), [i18n.language, studyPrograms]);


  useEffect(() => {
    if (!studyProgramOptions.length) {
      setSelectedExportStudyProgramIds([]);
      return;
    }
    setSelectedExportStudyProgramIds((prev) => prev.length ? prev.filter((id) => studyProgramOptions.some((item) => item.id === id)) : studyProgramOptions.map((item) => item.id));
  }, [studyProgramOptions]);

  const exportCategoryOptions = useMemo(() => ([
    { id: "count" as ExportCategoryKey, label: mt("metricOptions.count", { defaultValue: "Πλήθος αποφοίτων" }) },
    { id: "dominant_gender" as ExportCategoryKey, label: mt("metricOptions.dominantGender", { defaultValue: "Φύλο" }) },
    { id: "dominant_direction" as ExportCategoryKey, label: mt("metricOptions.dominantDirection", { defaultValue: "Πρόγραμμα σπουδών" }) },
  ]), [mt]);

  const directionColorMap = useMemo(() => {
    if (mapMetric !== "dominant_direction") return new Map<string, string>();
    const labels = items.flatMap((item) => {
      const entries = Array.isArray(item.recent_directions) ? item.recent_directions : [];
      const recentLabels = entries.map((entry: any) => String(entry?.label || "")).filter(Boolean);
      const dominantLabel = item.dominant_recent_direction ? [String(item.dominant_recent_direction)] : [];
      return [...recentLabels, ...dominantLabel];
    });
    return buildDirectionColorMap(labels);
  }, [items, mapMetric]);

  const metricOptions = useMemo(() => ({
    count: {
      label: mt("metricOptions.count", { defaultValue: "Πλήθος αποφοίτων" }),
      legend: mt("export.count", { defaultValue: "Απόφοιτοι" }),
      value: (item: GraduatesMapItem) => Number(item.count ?? 0) || 0,
    },
    dominant_gender: {
      label: mt("metricOptions.dominantGender", { defaultValue: "Φύλο" }),
      legend: mt("legendLabels.dominantGender", { defaultValue: "Κυρίαρχο φύλο" }),
      value: (item: GraduatesMapItem) => Math.abs((Number(item.male_count ?? 0) || 0) - (Number(item.female_count ?? 0) || 0)),
    },
    dominant_direction: {
      label: mt("metricOptions.dominantDirection", { defaultValue: "Πρόγραμμα σπουδών" }),
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
      ].filter((entry) => !isPlaceholderLegendLabel(entry.label));
    }
    if (mapMetric === "dominant_direction") {
      return Array.from(new Set(items.map((item) => item.dominant_recent_direction).filter(Boolean) as string[]))
        .filter((label) => !isPlaceholderLegendLabel(label))
        .map((label) => ({ label, color: directionColor(label, directionColorMap) }));
    }
    return [] as Array<{ label: string; color: string }>;
  }, [directionColorMap, items, mapMetric, mt]);

  const visibleLegendEntries = useMemo(() => {
    if (mapMetric === "count") {
      const scaleBuckets = legendBuckets(maxMetricValue);
      const seen = new Set<string>();
      return Array.from({ length: 5 }).flatMap((_, index) => {
        const from = Math.round(scaleBuckets[index]);
        const to = Math.round(scaleBuckets[index + 1]);
        if (from === 1 && to === 1) return [];
        const key = `${from}-${to}`;
        if (seen.has(key)) return [];
        seen.add(key);
        const mid = (scaleBuckets[index] + scaleBuckets[index + 1]) / 2;
        return [{
          key,
          label: `${from}–${to}`,
          color: fillColorForCount(mid, maxMetricValue, fillColors),
          opacity: fillOpacityForCount(mid),
        }];
      });
    }
    return categoricalLegendEntries
      .filter((entry) => !isPlaceholderLegendLabel(entry.label))
      .map((entry) => ({
        key: entry.label,
        label: entry.label,
        color: entry.color,
        opacity: 0.82,
      }));
  }, [categoricalLegendEntries, mapMetric, maxMetricValue]);

  const renderedLegendEntries = useMemo(() => {
    if (mapMetric === "count") return visibleLegendEntries;
    return visibleLegendEntries.filter((entry) => !isPlaceholderLegendLabel(entry.label));
  }, [mapMetric, visibleLegendEntries]);

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
      return { color: "#334155", weight: 1, fillColor: directionColor(label, directionColorMap), fillOpacity: 0.82 };
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
  }, [directionColorMap, items, mapMetric, maxMetricValue, i18n.language]);

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


  function metricFilenameBase(metric: MapMetric, studyProgramId?: string) {
    const parts = ["alupla_map", slugPart(metric)];
    if (metric === "dominant_direction" && studyProgramId) {
      const program = studyProgramOptions.find((item) => item.id === studyProgramId);
      if (program?.label) parts.push(slugPart(program.label));
    }
    return parts.join("_");
  }

  function openExportSelection(format: ExportFormat) {
    setSelectedExportCategories(exportCategoryOptions.map((item) => item.id));
    setSelectedExportFormat(format);
    setShowExportMenu(false);
  }

  function closeExportSelection() {
    if (exportingSelection) return;
    setSelectedExportFormat(null);
  }

  function toggleExportCategory(category: ExportCategoryKey) {
    setSelectedExportCategories((prev) => prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]);
  }

  function toggleAllExportCategories() {
    setSelectedExportCategories((prev) => prev.length === exportCategoryOptions.length ? [] : exportCategoryOptions.map((item) => item.id));
  }

  function toggleExportStudyProgram(programId: string) {
    setSelectedExportStudyProgramIds((prev) => prev.includes(programId) ? prev.filter((item) => item !== programId) : [...prev, programId]);
  }

  function toggleAllExportStudyPrograms() {
    setSelectedExportStudyProgramIds((prev) => prev.length === studyProgramOptions.length ? [] : studyProgramOptions.map((item) => item.id));
  }

  async function loadExportCategoryData(metric: MapMetric, studyProgramId?: string) {
    const nextParams = createMapParams({
      ...EMPTY_FILTERS,
      ...(metric === "dominant_direction" && studyProgramId ? { study_program_id: studyProgramId } : {}),
    });
    const [mapResponse, citiesResponse] = await Promise.all([
      getGraduatesMap(nextParams),
      getMapCities(nextParams),
    ]);
    return {
      items: Array.isArray(mapResponse?.items) ? mapResponse.items : [],
      cityPoints: Array.isArray(citiesResponse?.items) ? citiesResponse.items : [],
    };
  }

  function buildCountSheetRows(exportItems: GraduatesMapItem[], exportCities: any[]) {
    const cityMap = new Map<string, any[]>();
    exportCities.forEach((city) => {
      const key = String(city.periphery_id || "");
      const current = cityMap.get(key) || [];
      current.push(city);
      cityMap.set(key, current);
    });
    const rows: Record<string, any>[] = [];
    exportItems.forEach((item) => {
      const peripheryCities = [...(cityMap.get(String(item.periphery_id || "")) || [])].sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;
        return String(left.city_name || "").localeCompare(String(right.city_name || ""), "el");
      });
      rows.push({
        [mt("export.periphery", { defaultValue: "Περιφέρεια" })]: excelCellValue(item.periphery_name),
        [mt("export.countDetailed", { defaultValue: "Πλήθος αποφοίτων περιφέρειας" })]: excelCellValue(item.count),
        [mt("citiesTitle", { defaultValue: "Πόλεις" })]: "",
        [mt("export.cityCount", { defaultValue: "Πλήθος αποφοίτων πόλης" })]: "",
      });
      peripheryCities.forEach((city) => rows.push({
        [mt("export.periphery", { defaultValue: "Περιφέρεια" })]: excelCellValue(item.periphery_name),
        [mt("export.countDetailed", { defaultValue: "Πλήθος αποφοίτων περιφέρειας" })]: "",
        [mt("citiesTitle", { defaultValue: "Πόλεις" })]: excelCellValue(city.city_name),
        [mt("export.cityCount", { defaultValue: "Πλήθος αποφοίτων πόλης" })]: excelCellValue(city.count),
      }));
    });
    return rows;
  }

  function buildGenderSheetRows(exportItems: GraduatesMapItem[], exportCities: any[]) {
    const cityMap = new Map<string, any[]>();
    exportCities.forEach((city) => {
      const key = String(city.periphery_id || "");
      const current = cityMap.get(key) || [];
      current.push(city);
      cityMap.set(key, current);
    });
    const rows: Record<string, any>[] = [];
    exportItems.forEach((item) => {
      const peripheryCities = [...(cityMap.get(String(item.periphery_id || "")) || [])].sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;
        return String(left.city_name || "").localeCompare(String(right.city_name || ""), "el");
      });
      rows.push({
        [mt("export.periphery", { defaultValue: "Περιφέρεια" })]: excelCellValue(item.periphery_name),
        [mt("maleCount", { defaultValue: "Άνδρες" })]: excelCellValue(item.male_count ?? 0),
        [mt("femaleCount", { defaultValue: "Γυναίκες" })]: excelCellValue(item.female_count ?? 0),
        [mt("malePct", { defaultValue: "% Άνδρες" })]: excelCellValue(item.male_pct ?? 0),
        [mt("femalePct", { defaultValue: "% Γυναίκες" })]: excelCellValue(item.female_pct ?? 0),
        [mt("citiesTitle", { defaultValue: "Πόλεις" })]: "",
        [mt("export.cityCount", { defaultValue: "Πλήθος αποφοίτων πόλης" })]: "",
      });
      peripheryCities.forEach((city) => rows.push({
        [mt("export.periphery", { defaultValue: "Περιφέρεια" })]: excelCellValue(item.periphery_name),
        [mt("maleCount", { defaultValue: "Άνδρες" })]: "",
        [mt("femaleCount", { defaultValue: "Γυναίκες" })]: "",
        [mt("malePct", { defaultValue: "% Άνδρες" })]: "",
        [mt("femalePct", { defaultValue: "% Γυναίκες" })]: "",
        [mt("citiesTitle", { defaultValue: "Πόλεις" })]: excelCellValue(city.city_name),
        [mt("export.cityCount", { defaultValue: "Πλήθος αποφοίτων πόλης" })]: excelCellValue(city.count),
      }));
    });
    return rows;
  }

  function buildDirectionSheetRows(exportItems: GraduatesMapItem[], exportCities: any[]) {
    const cityMap = new Map<string, any[]>();
    exportCities.forEach((city) => {
      const key = String(city.periphery_id || "");
      const current = cityMap.get(key) || [];
      current.push(city);
      cityMap.set(key, current);
    });
    const rows: Record<string, any>[] = [];
    exportItems.forEach((item) => {
      const peripheryCities = [...(cityMap.get(String(item.periphery_id || "")) || [])].sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;
        return String(left.city_name || "").localeCompare(String(right.city_name || ""), "el");
      });
      rows.push({
        [mt("export.periphery", { defaultValue: "Περιφέρεια" })]: excelCellValue(item.periphery_name),
        [mt("dominantDirection", { defaultValue: "Πρόγραμμα σπουδών" })]: excelCellValue(item.dominant_recent_direction ?? ""),
        [mt("directionCount", { defaultValue: "Απόφοιτοι κατεύθυνσης" })]: excelCellValue(item.dominant_recent_direction_count ?? 0),
        [mt("citiesTitle", { defaultValue: "Πόλεις" })]: "",
        [mt("export.cityCount", { defaultValue: "Πλήθος αποφοίτων πόλης" })]: "",
      });
      peripheryCities.forEach((city) => rows.push({
        [mt("export.periphery", { defaultValue: "Περιφέρεια" })]: excelCellValue(item.periphery_name),
        [mt("dominantDirection", { defaultValue: "Πρόγραμμα σπουδών" })]: "",
        [mt("directionCount", { defaultValue: "Απόφοιτοι κατεύθυνσης" })]: "",
        [mt("citiesTitle", { defaultValue: "Πόλεις" })]: excelCellValue(city.city_name),
        [mt("export.cityCount", { defaultValue: "Πλήθος αποφοίτων πόλης" })]: excelCellValue(city.count),
      }));
    });
    return rows;
  }

  function workbookSheetName(name: string, used: Set<string>) {
    let next = String(name || "Sheet").replace(/[\/?*\[\]:]/g, " ").trim() || "Sheet";
    next = next.slice(0, 31);
    if (!used.has(next)) {
      used.add(next);
      return next;
    }
    let index = 2;
    while (true) {
      const suffix = `_${index}`;
      const candidate = `${next.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
      if (!used.has(candidate)) {
        used.add(candidate);
        return candidate;
      }
      index += 1;
    }
  }

  function escapeCsv(value: unknown) {
    const text = String(value ?? "");
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }

  function buildCsvFromBlocks(blocks: Array<{ title: string; rows: Record<string, any>[] }>) {
    const lines: string[] = [];
    blocks.forEach((block, blockIndex) => {
      if (blockIndex > 0) lines.push("");
      lines.push(escapeCsv(block.title));
      const headers = Object.keys(block.rows[0] || {});
      if (!headers.length) return;
      lines.push(headers.map(escapeCsv).join(","));
      block.rows.forEach((row) => lines.push(headers.map((header) => escapeCsv((row as any)[header])).join(",")));
    });
    return lines.join("\r\n");
  }

  async function waitForMapFrame() {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => window.setTimeout(resolve, 240));
    if (mapRef.current) mapRef.current.invalidateSize();
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  }

  async function renderMapSnapshot(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const width = Math.ceil(rect.width);
    const height = Math.ceil(rect.height);
    const clone = element.cloneNode(true) as HTMLElement;
    const sourceNodes = [element, ...Array.from(element.querySelectorAll<HTMLElement>("*"))];
    const cloneNodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];

    sourceNodes.forEach((sourceNode, index) => {
      const cloneNode = cloneNodes[index];
      if (!cloneNode) return;
      const computed = window.getComputedStyle(sourceNode);
      cloneNode.setAttribute("style", Array.from(computed).map((name) => `${name}:${computed.getPropertyValue(name)};`).join(""));
    });

    Array.from(element.querySelectorAll("canvas")).forEach((sourceCanvas, index) => {
      const cloneCanvas = clone.querySelectorAll("canvas")[index];
      if (!cloneCanvas) return;
      const image = document.createElement("img");
      try {
        image.src = (sourceCanvas as HTMLCanvasElement).toDataURL("image/png");
      } catch {
        return;
      }
      image.style.width = `${cloneCanvas.clientWidth || (sourceCanvas as HTMLCanvasElement).clientWidth}px`;
      image.style.height = `${cloneCanvas.clientHeight || (sourceCanvas as HTMLCanvasElement).clientHeight}px`;
      cloneCanvas.replaceWith(image);
    });

    clone.style.margin = "0";
    clone.style.width = `${width}px`;
    clone.style.height = `${height}px`;
    const wrapper = document.createElement("div");
    wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    wrapper.style.width = `${width}px`;
    wrapper.style.height = `${height}px`;
    wrapper.style.background = "#ffffff";
    wrapper.appendChild(clone);
    const serialized = new XMLSerializer().serializeToString(wrapper);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image_error"));
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });
    return { image, width, height };
  }

  async function exportCombinedSnapshots(filename: string, title: string, snapshots: Array<{ image: HTMLImageElement; width: number; height: number; caption?: string }>) {
    if (!snapshots.length) return;
    const padding = 20;
    const gap = 18;
    const titleHeight = 42;
    const captionHeight = 28;
    const width = Math.max(...snapshots.map((snapshot) => snapshot.width)) + padding * 2;
    const height = titleHeight + padding + snapshots.reduce((sum, snapshot) => sum + snapshot.height + (snapshot.caption ? captionHeight : 0), 0) + gap * Math.max(0, snapshots.length - 1) + padding;
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(2, 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#0f172a";
    ctx.font = '700 22px Arial, sans-serif';
    ctx.fillText(title, padding, 30);
    let offsetY = titleHeight;
    snapshots.forEach((snapshot, index) => {
      if (snapshot.caption) {
        ctx.fillStyle = "#334155";
        ctx.font = '700 16px Arial, sans-serif';
        ctx.fillText(snapshot.caption, padding, offsetY + 18);
        offsetY += captionHeight;
      }
      ctx.drawImage(snapshot.image, padding, offsetY, snapshot.width, snapshot.height);
      offsetY += snapshot.height;
      if (index < snapshots.length - 1) offsetY += gap;
    });
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function exportMapSelectionAsPng() {
    if (!mapCanvasRef.current) return;
    const previousMetric = mapMetric;
    const previousStudyProgramId = selectedStudyProgramId;
    const snapshotsByCategory: Array<{ key: ExportCategoryKey; snapshots: Array<{ image: HTMLImageElement; width: number; height: number; caption?: string }> }> = [];
    try {
      for (const category of selectedExportCategories) {
        if (category === "dominant_direction") {
          const programIds = selectedExportStudyProgramIds.length ? selectedExportStudyProgramIds : (selectedStudyProgramId ? [selectedStudyProgramId] : []);
          const snapshots: Array<{ image: HTMLImageElement; width: number; height: number; caption?: string }> = [];
          for (const programId of programIds) {
            setSelectedStudyProgramId(programId);
            setMapMetric("dominant_direction");
            await waitForMapFrame();
            const snapshot = await renderMapSnapshot(mapCanvasRef.current);
            snapshots.push({ ...snapshot, caption: studyProgramOptions.find((item) => item.id === programId)?.label || "" });
          }
          if (snapshots.length) snapshotsByCategory.push({ key: category, snapshots });
          continue;
        }
        setMapMetric(category);
        await waitForMapFrame();
        snapshotsByCategory.push({ key: category, snapshots: [await renderMapSnapshot(mapCanvasRef.current)] });
      }
    } finally {
      setMapMetric(previousMetric);
      setSelectedStudyProgramId(previousStudyProgramId);
      await waitForMapFrame();
    }

    for (const entry of snapshotsByCategory) {
      const option = exportCategoryOptions.find((item) => item.id === entry.key);
      await exportCombinedSnapshots(`${metricFilenameBase(entry.key)}.png`, option?.label || entry.key, entry.snapshots);
    }
  }

  async function handleExportSelection() {
    if (!selectedExportFormat || !selectedExportCategories.length) return;
    if (selectedExportCategories.includes("dominant_direction") && !selectedExportStudyProgramIds.length) return;
    setExportingSelection(true);
    try {
      if (selectedExportFormat === "png") {
        await exportMapSelectionAsPng();
      } else {
        const workbook = XLSX.utils.book_new();
        const usedNames = new Set<string>();
        const csvBlocks: Array<{ title: string; rows: Record<string, any>[] }> = [];
        for (const category of selectedExportCategories) {
          if (category === "count") {
            const response = await loadExportCategoryData("count");
            const rows = buildCountSheetRows(response.items, response.cityPoints);
            const title = mt("metricOptions.count", { defaultValue: "Πλήθος αποφοίτων" });
            if (selectedExportFormat === "xlsx") {
              XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), workbookSheetName(title, usedNames));
            }
            csvBlocks.push({ title, rows });
            continue;
          }
          if (category === "dominant_gender") {
            const response = await loadExportCategoryData("dominant_gender");
            const rows = buildGenderSheetRows(response.items, response.cityPoints);
            const title = mt("metricOptions.dominantGender", { defaultValue: "Φύλο" });
            if (selectedExportFormat === "xlsx") {
              XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), workbookSheetName(title, usedNames));
            }
            csvBlocks.push({ title, rows });
            continue;
          }
          for (const programId of selectedExportStudyProgramIds) {
            const response = await loadExportCategoryData("dominant_direction", programId);
            const rows = buildDirectionSheetRows(response.items, response.cityPoints);
            const programLabel = studyProgramOptions.find((item) => item.id === programId)?.label || mt("metricOptions.dominantDirection", { defaultValue: "Πρόγραμμα σπουδών" });
            const title = `${mt("metricOptions.dominantDirection", { defaultValue: "Πρόγραμμα σπουδών" })} - ${programLabel}`;
            if (selectedExportFormat === "xlsx") {
              XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), workbookSheetName(title, usedNames));
            }
            csvBlocks.push({ title, rows });
          }
        }
        if (selectedExportFormat === "xlsx") exportWorkbook("alupla_map_export.xlsx", workbook);
        if (selectedExportFormat === "csv") exportCsvText("alupla_map_export.csv", buildCsvFromBlocks(csvBlocks));
      }
      try { await logPublicExport("map_export", selectedExportFormat); } catch {}
      setSelectedExportFormat(null);
    } finally {
      setExportingSelection(false);
    }
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
    exportCsvText(`${currentFilenameBase()}.csv`, lines.join("\r\n"));
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
          title: selectedStudyProgramLabel || mt("detailGroups.directions", { defaultValue: "Κατευθύνσεις" }),
          rows: Array.isArray(item.recent_directions)
            ? item.recent_directions.map((entry: any) => ({
                label: entry.label,
                value: `${detailValue(entry.count)} (${detailValue(entry.pct, "%")})`,
              }))
            : [],
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

  function renderCityPopupContent() {
    if (cityDetailLoading) return <div className="muted">{ct("loading", { defaultValue: "Φόρτωση..." })}</div>;
    if (!cityDetail) return <div className="muted">{mt("cityPopup.noData", { defaultValue: "Δεν υπάρχουν διαθέσιμα στοιχεία για την πόλη." })}</div>;

    if (mapMetric === "dominant_gender") {
      const pieData = {
        labels: [mt("maleCount", { defaultValue: "Άνδρες" }), mt("femaleCount", { defaultValue: "Γυναίκες" })],
        datasets: [
          {
            data: [Number(cityDetail.male_count ?? 0), Number(cityDetail.female_count ?? 0)],
            backgroundColor: [genderColors.male, genderColors.female],
            borderColor: [genderColors.male, genderColors.female],
            borderWidth: 1,
          },
        ],
      };
      const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { position: "bottom" as const } },
      };

      return (
        <div className="map-city-popup-card">
          <div className="map-city-popup-title">{cityDetail.city_name}</div>
          <div className="map-city-popup-sub">{mt("totalGraduatesLine", { total: cityDetail.total, defaultValue: "Σύνολο αποφοίτων: {{total}}" })}</div>
          <div className="map-city-popup-chart">{Number(cityDetail.total) > 0 ? <Pie data={pieData as any} options={pieOptions as any} /> : <div className="muted">{mt("cityPopup.noData", { defaultValue: "Δεν υπάρχουν διαθέσιμα στοιχεία για την πόλη." })}</div>}</div>
          <div className="map-city-popup-grid">
            <div><div className="map-city-popup-label">{mt("maleCount", { defaultValue: "Άνδρες" })}</div><div className="map-city-popup-value">{detailValue(cityDetail.male_pct, "%")}</div></div>
            <div><div className="map-city-popup-label">{mt("femaleCount", { defaultValue: "Γυναίκες" })}</div><div className="map-city-popup-value">{detailValue(cityDetail.female_pct, "%")}</div></div>
          </div>
        </div>
      );
    }

    if (mapMetric === "dominant_direction") {
      const programs = Array.isArray(cityDetail.programs) ? cityDetail.programs : [];
      const activeProgram = programs.find((program) => String(program.program_id) === selectedStudyProgramId) || programs[0] || null;
      return (
        <div className="map-city-popup-card">
          <div className="map-city-popup-title">{cityDetail.city_name}</div>
          {activeProgram ? (
            <>
              <div className="map-city-popup-program-heading">
                <span>{activeProgram.program_label}</span>
                <strong>{activeProgram.total}</strong>
              </div>
              <div className="map-city-popup-list">
                <div className="map-city-popup-program-list">
                  {activeProgram.directions.map((direction) => (
                    <div className="map-city-popup-row" key={direction.id}>
                      <span>{direction.label}</span>
                      <strong>{direction.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : <div className="muted">{mt("cityPopup.noDirections", { defaultValue: "Δεν υπάρχουν διαθέσιμες κατευθύνσεις για την πόλη." })}</div>}
        </div>
      );
    }

    const popupLabels = cityDetail.labels?.length ? cityDetail.labels : Array.from({ length: 8 }, () => "");
    const lineData = {
      labels: popupLabels,
      datasets: (cityDetail.datasets?.length ? cityDetail.datasets : [{ key: "count", label: mt("export.count", { defaultValue: "Απόφοιτοι" }), values: popupLabels.map(() => null) }]).map((dataset, index) => {
        const color = directionColor(dataset.label || chartPalette[index % chartPalette.length], directionColorMap);
        return {
          label: dataset.label,
          data: dataset.values,
          borderColor: color,
          backgroundColor: colorWithAlpha(color, 0.18),
          pointBackgroundColor: color,
          pointBorderColor: color,
          fill: true,
          borderWidth: 2,
          pointRadius: cityDetail.datasets?.length ? 2 : 0,
          tension: 0.28,
        };
      }),
    };
    const lineOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 as any }, grid: { color: "rgba(148,163,184,.18)" } },
        x: { ticks: { autoSkip: true, maxRotation: 0, minRotation: 0 }, grid: { color: "rgba(148,163,184,.18)" } },
      },
    };

    return (
      <div className="map-city-popup-card">
        <div className="map-city-popup-title">{cityDetail.city_name}</div>
        <div className="map-city-popup-sub">{mt("totalGraduatesLine", { total: cityDetail.total, defaultValue: "Σύνολο αποφοίτων: {{total}}" })}</div>
        <div className="map-city-popup-chart map-city-popup-line"><Line data={lineData as any} options={lineOptions as any} /></div>
      </div>
    );
  }

  return (
    <div className="container">
      <style>{`
        .leaflet-container path:focus, .leaflet-interactive:focus, .leaflet-container:focus { outline: none !important; }
        .alupla-map .leaflet-container { background: transparent !important; }
        .alupla-map-card { padding: 0; overflow: hidden; position: relative; }
        .alupla-city-label-icon { background: transparent !important; border: 0 !important; }
        .alupla-city-point { position: relative; display: block; width: 100%; height: 100%; overflow: visible; pointer-events: auto; cursor: pointer; }
        .alupla-city-label-text { position: absolute; left: 50%; bottom: 13px; transform: translateX(-50%); color: #1e293b; font-size: 12px; font-weight: 600; white-space: nowrap; text-shadow: 0 1px 2px rgba(255,255,255,.95), 0 0 6px rgba(255,255,255,.9); pointer-events: auto; }
        .alupla-city-label-dot { position: absolute; left: 50%; bottom: 3px; transform: translateX(-50%); width: 5px; height: 5px; border-radius: 999px; background: #1e293b; box-shadow: 0 0 0 2px rgba(255,255,255,.92); pointer-events: auto; }
        .leaflet-tooltip.alupla-region-tooltip { background: rgba(248,250,252,.98); color: #0f172a; border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow); padding: 10px 12px; }
        .leaflet-tooltip.alupla-region-tooltip:before { border-top-color: var(--border); }
        .alupla-region-tip-title { font-weight: 700; margin-bottom: 4px; }
        .alupla-region-tip-sub { color: #64748b; font-size: 12px; }
        .map-top-menu-card { padding: 20px 16px 16px; display: grid; gap: 14px; }
        .map-top-menu-title { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .map-top-menu-title h2 { margin: 0; }
        .map-metric-group { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; width: 100%; }
        .map-metric-button, .map-action-button, .map-program-button { width: 100%; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; }
        .map-metric-button.active, .map-program-button.active { background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 700; }
        .map-program-button { gap: 8px; }
        .map-menu { position: absolute; top: calc(100% + 8px); right: 0; width: 220px; background: #fff; border: 1px solid var(--border); border-radius: 14px; box-shadow: 0 18px 40px rgba(15,23,42,.16); padding: 8px; z-index: 3000; display: grid; gap: 6px; }
        .map-menu-item { width: 100%; border: 0; background: transparent; text-align: left; padding: 10px 12px; border-radius: 10px; cursor: pointer; font: inherit; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .map-menu-item:hover { background: #f8fafc; }
        .map-menu-item.active { background: #eff6ff; color: #1d4ed8; font-weight: 700; }
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
        .map-city-popup-card { display: grid; gap: 10px; min-width: 280px; max-width: 340px; }
        .map-city-popup-title { font-size: 16px; font-weight: 800; color: #0f172a; }
        .map-city-popup-sub, .map-city-popup-label { color: #64748b; font-size: 12px; }
        .map-city-popup-chart { height: 190px; min-height: 190px; }
        .map-city-popup-line { height: 180px; min-height: 180px; }
        .map-city-popup-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .map-city-popup-value { font-size: 16px; font-weight: 800; color: #0f172a; }
        .map-city-popup-list, .map-city-popup-program-list { display: grid; gap: 8px; }
        .map-city-popup-program-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-size: 14px; color: #0f172a; font-weight: 700; }
        .map-city-popup-program-title { font-size: 13px; font-weight: 800; color: #0f172a; }
        .map-city-popup-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; color: #334155; font-size: 13px; }
        @media (max-width: 1100px) { .map-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 640px) { .map-metric-group, .map-summary-grid, .map-city-cards-inline { grid-template-columns: 1fr; } }
      `}</style>

      <div className="card map-top-menu-card">
        <div className="map-top-menu-title">
          <h2>{mt("title", { defaultValue: "Χάρτης αποφοίτων" })}</h2>
          <span className="badge">{loading ? ct("loading", { defaultValue: "Φόρτωση..." }) : `${total} ${mt("totalInline", { defaultValue: "σύνολο" })}`}</span>
        </div>
        <div className="map-metric-group">
          {(["count", "dominant_gender"] as MapMetric[]).map((option) => (
            <button key={option} type="button" className={`btn map-metric-button ${mapMetric === option ? "active primary" : ""}`} onClick={() => setMapMetric(option)}>
              {metricOptions[option].label}
            </button>
          ))}
          <div ref={programMenuRef} style={{ position: "relative" }}>
            <button
              type="button"
              className={`btn map-program-button ${mapMetric === "dominant_direction" ? "active primary" : ""}`}
              style={{ width: "100%" }}
              onClick={() => setShowProgramMenu((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={showProgramMenu}
              aria-label={mt("filters.studyProgram", { defaultValue: "Πρόγραμμα Σπουδών" })}
            >
              <span>{metricOptions.dominant_direction.label}</span>
              <span aria-hidden="true">▾</span>
            </button>
            {showProgramMenu ? (
              <div className="map-menu">
                {studyProgramOptions.map((program) => (
                  <button
                    key={program.id}
                    className={`map-menu-item ${selectedStudyProgramId === program.id ? "active" : ""}`}
                    type="button"
                    onClick={() => {
                      setSelectedStudyProgramId(program.id);
                      setMapMetric("dominant_direction");
                      setShowProgramMenu(false);
                    }}
                  >
                    <span>{program.label}</span>
                    <span>{selectedStudyProgramId === program.id ? "✓" : ""}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div ref={exportMenuRef} style={{ position: "relative" }}>
            <button className="btn map-action-button" type="button" style={{ width: "100%" }} onClick={() => setShowExportMenu((prev) => !prev)}>
              {ct("export", { defaultValue: "Εξαγωγή" })}
            </button>
            {showExportMenu ? (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  minWidth: 180,
                  borderRadius: 14,
                  border: "1px solid rgba(148, 163, 184, 0.28)",
                  background: "#fff",
                  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.16)",
                  padding: 8,
                  zIndex: 20,
                  display: "grid",
                  gap: 6,
                }}
              >
                <button className="btn" type="button" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => openExportSelection("xlsx")}>Excel</button>
                <button className="btn" type="button" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => openExportSelection("csv")}>CSV</button>
                <button className="btn" type="button" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => openExportSelection("png")}>PNG</button>
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
              zoom={initialZoom as any}
              minZoom={minMapZoom as any}
              zoomSnap={0.25}
              whenCreated={(map) => {
                mapRef.current = map;
                if (geojsonBounds) map.fitBounds(geojsonBounds, { padding: fitPadding, maxZoom: fitMaxZoom });
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
                const activeCity = selectedCityPoint?.city_id === city.city_id;
                return (
                  <Marker
                    key={mapCityKey(city)}
                    position={[latitude, longitude]}
                    icon={cityLabelIcon(mapCityLabel(city))}
                    eventHandlers={{
                      click: () => {
                        setSelectedCityPoint(city);
                        if (city.periphery_id) {
                          const hit = items.find((item) => item.periphery_id === city.periphery_id);
                          if (hit) setSelected(hit);
                        }
                      },
                      popupclose: () => setSelectedCityPoint(null),
                    }}
                  >
                    <Popup minWidth={300} maxWidth={360} autoPan closeButton>
                      {activeCity ? renderCityPopupContent() : <div style={{ minWidth: 280 }} />}
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          <div style={{ position: "absolute", left: 12, bottom: 12, background: "rgba(255,255,255,.94)", border: "1px solid var(--border)", borderRadius: 14, padding: "10px 12px", fontSize: 12, boxShadow: "var(--shadow)", maxWidth: 260 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{mt("legend", { defaultValue: "Υπόμνημα" })}</div>
            <div className="muted" style={{ marginBottom: 8 }}>{metricOptions[mapMetric].legend}</div>
            <div style={{ display: "grid", gap: 6 }}>
              {renderedLegendEntries.map((entry) => (
                <div key={entry.key} style={{ display: "grid", gridTemplateColumns: "18px 1fr", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 18, height: 12, borderRadius: 999, background: entry.color, opacity: entry.opacity, border: "1px solid rgba(51,65,85,.18)" }} />
                  <span>{entry.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selected ? (
        <>
          <div className="card map-combined-details-card">
            <div style={{ fontWeight: 800, fontSize: 18 }}>{mt("infoTitle", { defaultValue: "Πληροφορίες" })}</div>
            {shouldShowDirectionData ? (
              <>
                <InfoBox title={selected.periphery_name} totalText={mt("totalGraduatesLine", { total: selected.count, defaultValue: "Σύνολο αποφοίτων: {{total}}" })} groups={detailGroups(selected)} />
                <div style={{ fontWeight: 700 }}>{mt("citiesTitle", { defaultValue: "Πόλεις" })} ({selectedCityStats.length})</div>
                {cityStatsLoading ? <div className="muted">{ct("loading", { defaultValue: "Φόρτωση..." })}</div> : selectedCityStats.length ? (
                  <div className="map-city-cards-inline">
                    {selectedCityStats.map((city) => <InfoBox key={city.city} title={city.city} totalText={mt("totalGraduatesLine", { total: city.count, defaultValue: "Σύνολο αποφοίτων: {{total}}" })} groups={detailGroups(city)} />)}
                  </div>
                ) : <div className="muted">{mt("noCities", { defaultValue: "Δεν υπάρχουν διαθέσιμες πόλεις για την τρέχουσα περιφέρεια." })}</div>}
              </>
            ) : (
              <div className="muted">{ct("loading", { defaultValue: "Φόρτωση..." })}</div>
            )}
          </div>
        </>
      ) : items.length ? (
        <div className="card map-combined-details-card"><div className="muted">{mt("detailsHint", { defaultValue: "Κάνε κλικ σε μία περιφέρεια για λεπτομέρειες." })}</div></div>
      ) : (
        <div className="card map-combined-details-card"><div className="muted">{mt("noResults", { defaultValue: "Δεν βρέθηκαν απόφοιτοι με τα συγκεκριμένα φίλτρα." })}</div></div>
      )}

      {selectedExportFormat ? (
        <div
          onClick={closeExportSelection}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.34)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 60,
          }}
        >
          <div
            className="card"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(680px, 100%)",
              maxHeight: "min(78vh, 760px)",
              display: "grid",
              gridTemplateRows: "auto minmax(0, 1fr) auto",
              gap: 12,
              padding: 14,
              overflow: "hidden",
            }}
          >
            <div className="topbar" style={{ marginBottom: 0, gap: 10, alignItems: "flex-start" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>{mt("export.selectionTitle", { defaultValue: "Επιλογή κατηγοριών εξαγωγής" })}</h3>
                <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                  {mt("export.selectionSubtitle", { defaultValue: "Επίλεξε ποιες κατηγορίες θέλεις να κατεβάσεις" })} · {selectedExportFormat.toUpperCase()}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10, overflowY: "auto", minHeight: 0, paddingRight: 4 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
                <input type="checkbox" checked={selectedExportCategories.length === exportCategoryOptions.length && exportCategoryOptions.length > 0} onChange={toggleAllExportCategories} />
                <span>{ct("all", { defaultValue: "Όλα" })}</span>
              </label>

              {exportCategoryOptions.map((category) => {
                const isSelected = selectedExportCategories.includes(category.id);
                return (
                  <div key={category.id} style={{ display: "grid", gap: 8, border: "1px solid rgba(148, 163, 184, 0.2)", borderRadius: 14, padding: 10, background: "rgba(248, 250, 252, 0.76)" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleExportCategory(category.id)} />
                      <span>{category.label}</span>
                    </label>
                    {category.id === "dominant_direction" && isSelected ? (
                      <div style={{ display: "grid", gap: 8, paddingLeft: 28 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
                          <input type="checkbox" checked={selectedExportStudyProgramIds.length === studyProgramOptions.length && studyProgramOptions.length > 0} onChange={toggleAllExportStudyPrograms} />
                          <span>{ct("all", { defaultValue: "Όλα" })}</span>
                        </label>
                        <div style={{ display: "grid", gap: 6 }}>
                          {studyProgramOptions.map((program) => (
                            <label key={program.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <input type="checkbox" checked={selectedExportStudyProgramIds.includes(program.id)} onChange={() => toggleExportStudyProgram(program.id)} />
                              <span>{program.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", paddingTop: 2 }}>
              <button type="button" className="btn" style={{ minHeight: 40, padding: "0 14px" }} onClick={closeExportSelection}>
                {ct("cancel", { defaultValue: "Ακύρωση" })}
              </button>
              <button type="button" className="btn primary" disabled={!selectedExportCategories.length || exportingSelection || (selectedExportCategories.includes("dominant_direction") && !selectedExportStudyProgramIds.length)} style={{ opacity: !selectedExportCategories.length || (selectedExportCategories.includes("dominant_direction") && !selectedExportStudyProgramIds.length) ? 0.55 : 1 }} onClick={() => void handleExportSelection()}>
                {exportingSelection ? ct("loading", { defaultValue: "Φόρτωση..." }) : mt("export.exportSelected", { defaultValue: "Εξαγωγή επιλεγμένων" })}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
