import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as XLSX from "xlsx";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
} from "chart.js";
import {
  getGraduatesMap,
  getMapCities,
  getMapCityDetail,
  getMapYearRange,
  logPublicExport,
  type GraduatesMapItem,
  type MapCityDetailResponse,
} from "../lib/api";
import {
  exportCsvText,
  exportElementAsPng,
  exportWorkbook,
} from "./map/mapExport";
import { useMapData } from "./map/hooks";
import { EMPTY_FILTERS } from "./map/types";
import {
  createMapParams,
  fillColorForCount,
  fillOpacityForCount,
  legendBuckets,
  mapCityKey,
  mapCityLatitude,
  mapCityLongitude,
  normalizeKey,
} from "./map/utils";
import { MapResetControl, MapViewportWatcher } from "./map/shared";
import { MapTopControls, MapYearTimeline, MapExportSelectionModal } from "./map/controls";
import { MapCityPopupContent } from "./map/cityPopup";
import {
  InfoBox,
  compactNumber,
  detailValue,
  genderColors,
  isPlaceholderLegendLabel,
  slugPart,
  useCompactMapViewport,
} from "./map/viewHelpers";
import {
  applySheetLayout,
  buildBaseExportRows,
  buildCountSheetRows,
  buildCsvRows,
  buildCsvText,
  buildGenderSheetRows,
  exportCombinedSnapshots,
  renderMapSnapshot,
  toggleAllExportCategorySelection,
  toggleExportCategorySelection,
  waitForMapFrame,
  workbookSheetName,
} from "./map/exportSelection";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  ChartTooltip,
  Legend,
  ArcElement,
);

type MapMetric = "count" | "dominant_gender";
type MapScope = "greece" | "abroad";
type ExportFormat = "xlsx" | "csv" | "png";
type ExportCategoryKey = MapMetric;

const fillColors = ["#bfdbfe", "#93c5fd", "#60a5fa", "#2563eb", "#1d4ed8"];

const mapTileUrl = "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png";
const mapTileAttribution =
  "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors &copy; <a href=\"https://carto.com/attributions\">CARTO</a>";


const metroGroups = [
  {
    key: "athens",
    label: "Αθήνα",
    center: { latitude: 37.9838, longitude: 23.7275 },
    bounds: {
      minLat: 37.82,
      maxLat: 38.16,
      minLng: 23.44,
      maxLng: 23.98,
    },
  },
  {
    key: "thessaloniki",
    label: "Θεσσαλονίκη",
    center: { latitude: 40.6401, longitude: 22.9444 },
    bounds: {
      minLat: 40.50,
      maxLat: 40.74,
      minLng: 22.80,
      maxLng: 23.12,
    },
  },
] as const;

function metroGroupForPoint(latitude: number, longitude: number) {
  return (
    metroGroups.find(
      (group) =>
        latitude >= group.bounds.minLat &&
        latitude <= group.bounds.maxLat &&
        longitude >= group.bounds.minLng &&
        longitude <= group.bounds.maxLng,
    ) || null
  );
}
const escapeHtml = (value: string) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const COUNTRY_DISPLAY_NAMES: Array<{ names: string[]; gr: string; en: string }> = [
  { names: ["Ελλάδα", "Greece"], gr: "Ελλάδα", en: "Greece" },
  { names: ["ΗΠΑ", "Ηνωμένες Πολιτείες", "Ηνωμένες Πολιτείες Αμερικής", "Αμερική", "United States", "United States of America", "USA", "US", "U.S.A.", "U.S."], gr: "ΗΠΑ", en: "United States" },
  { names: ["Ολλανδία", "Ολλανδια", "Κάτω Χώρες", "Κατω Χωρες", "Netherlands", "The Netherlands", "Holland"], gr: "Ολλανδία", en: "Netherlands" },
  { names: ["Ηνωμένο Βασίλειο", "Ηνωμενο Βασιλειο", "Αγγλία", "Μεγάλη Βρετανία", "Μεγαλη Βρετανια", "United Kingdom", "UK", "U.K.", "Great Britain", "England"], gr: "Ηνωμένο Βασίλειο", en: "United Kingdom" },
  { names: ["Κύπρος", "Cyprus"], gr: "Κύπρος", en: "Cyprus" },
  { names: ["Ιταλία", "Italy"], gr: "Ιταλία", en: "Italy" },
  { names: ["Γερμανία", "Γερμανια", "Germany"], gr: "Γερμανία", en: "Germany" },
  { names: ["Γαλλία", "Γαλλια", "France"], gr: "Γαλλία", en: "France" },
  { names: ["Ισπανία", "Ισπανια", "Spain"], gr: "Ισπανία", en: "Spain" },
  { names: ["Πορτογαλία", "Πορτογαλια", "Portugal"], gr: "Πορτογαλία", en: "Portugal" },
  { names: ["Βέλγιο", "Belgium"], gr: "Βέλγιο", en: "Belgium" },
  { names: ["Ελβετία", "Ελβετια", "Switzerland"], gr: "Ελβετία", en: "Switzerland" },
  { names: ["Αυστρία", "Austria"], gr: "Αυστρία", en: "Austria" },
  { names: ["Σουηδία", "Σουηδια", "Sweden"], gr: "Σουηδία", en: "Sweden" },
  { names: ["Νορβηγία", "Νορβηγια", "Norway"], gr: "Νορβηγία", en: "Norway" },
  { names: ["Δανία", "Δανια", "Denmark"], gr: "Δανία", en: "Denmark" },
  { names: ["Ιρλανδία", "Ιρλανδια", "Ireland"], gr: "Ιρλανδία", en: "Ireland" },
  { names: ["Πολωνία", "Πολωνια", "Poland"], gr: "Πολωνία", en: "Poland" },
  { names: ["Τσεχία", "Τσεχικη Δημοκρατια", "Czechia", "Czech Republic"], gr: "Τσεχία", en: "Czechia" },
  { names: ["Ρουμανία", "Ρουμανια", "Romania"], gr: "Ρουμανία", en: "Romania" },
  { names: ["Βουλγαρία", "Βουλγαρια", "Bulgaria"], gr: "Βουλγαρία", en: "Bulgaria" },
  { names: ["Αλβανία", "Αλβανια", "Albania"], gr: "Αλβανία", en: "Albania" },
  { names: ["Σερβία", "Σερβια", "Serbia"], gr: "Σερβία", en: "Serbia" },
  { names: ["Βόρεια Μακεδονία", "Βορεια Μακεδονια", "Σκόπια", "North Macedonia"], gr: "Βόρεια Μακεδονία", en: "North Macedonia" },
  { names: ["Τουρκία", "Τουρκια", "Turkey"], gr: "Τουρκία", en: "Turkey" },
  { names: ["Ιαπωνία", "Ιαπωνια", "Japan"], gr: "Ιαπωνία", en: "Japan" },
  { names: ["Κίνα", "Κινα", "China"], gr: "Κίνα", en: "China" },
  { names: ["Αυστραλία", "Αυστραλια", "Australia"], gr: "Αυστραλία", en: "Australia" },
  { names: ["Καναδάς", "Καναδας", "Canada"], gr: "Καναδάς", en: "Canada" },
  { names: ["Ηνωμένα Αραβικά Εμιράτα", "Ηνωμενα Αραβικα Εμιρατα", "Εμιράτα", "ΗΑΕ", "United Arab Emirates", "UAE"], gr: "Ηνωμένα Αραβικά Εμιράτα", en: "United Arab Emirates" },
];

const countryNameLookup = new Map<string, { gr: string; en: string }>();
for (const entry of COUNTRY_DISPLAY_NAMES) {
  for (const name of entry.names) {
    countryNameLookup.set(normalizeKey(name), { gr: entry.gr, en: entry.en });
  }
}

function localizedCountryName(value: unknown, lang: "gr" | "en") {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const match = countryNameLookup.get(normalizeKey(raw));
  if (match) return lang === "en" ? match.en : match.gr;
  return raw;
}

function localizedCountryKey(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const match = countryNameLookup.get(normalizeKey(raw));
  return normalizeKey(match?.gr || raw);
}

function bubbleLabelIcon(
  city: any,
  mapMetric: MapMetric,
  active: boolean,
  showLabel: boolean,
  mt: (key: string, options?: Record<string, unknown>) => string,
) {
  const radius = Math.max(10, Number(city?.markerRadius || 10));
  const size = radius * 2;
  const label = escapeHtml(String(city?.city_name || ""));
  const count = Math.max(0, Number(city?.count || 0));
  const maleCount = Math.max(0, Number(city?.male_count || 0));
  const femaleCount = Math.max(0, Number(city?.female_count || 0));
  const total = Math.max(0, maleCount + femaleCount);
  const malePct = total > 0 ? (maleCount / total) * 100 : 50;
  const femalePct = 100 - malePct;
  const bubbleFill = String(city?.markerFill || "#60a5fa");
  const bubbleStroke = String(city?.markerStroke || "#1d4ed8");
  const bubbleOpacity = Math.max(0.45, Number(city?.markerOpacity || 0.85));
  const fontSize = size >= 34 ? 12 : size >= 28 ? 11 : 10;
  const labelWidth = showLabel ? Math.max(size + 10, Math.min(170, Math.max(64, label.length * 7))) : size + 10;
  const labelHeight = showLabel ? 18 : 0;
  const wrapperHeight = labelHeight + size + 6;
  const wrapperWidth = Math.max(labelWidth, size + 10);
  const activeRing = active ? '0 0 0 3px rgba(15,23,42,.14)' : 'none';
  const bubbleHtml =
    mapMetric === "count"
      ? `<div class="alupla-city-bubble alupla-city-bubble-count" style="width:${size}px;height:${size}px;border:2px solid ${bubbleStroke};background:${bubbleFill};opacity:${bubbleOpacity};box-shadow:${activeRing};"><span class="alupla-city-bubble-number" style="font-size:${fontSize}px;">${count}</span></div>`
      : `<div class="alupla-city-bubble alupla-city-bubble-gender" style="width:${size}px;height:${size}px;border:2px solid rgba(51,65,85,.72);background:conic-gradient(${genderColors.male} 0 ${malePct}%, ${genderColors.female} ${malePct}% 100%);box-shadow:${activeRing};"><span class="alupla-city-bubble-number alupla-city-bubble-number-gender" style="font-size:${fontSize}px;">${count}</span></div>`;
  const summary = "";
  return L.divIcon({
    className: "alupla-city-bubble-icon",
    html: `<div class="alupla-city-bubble-wrap" style="width:${wrapperWidth}px;height:${wrapperHeight}px;">${showLabel ? `<div class="alupla-city-bubble-label" style="width:${labelWidth}px;">${label}</div>` : ""}${bubbleHtml}${summary}</div>`,
    iconSize: [wrapperWidth, wrapperHeight],
    iconAnchor: [wrapperWidth / 2, labelHeight + size / 2],
    popupAnchor: [0, -(size / 2 + 16)],
  });
}



function pointLabelIcon(label: string, showLabel: boolean, active: boolean, size = 10) {
  const safeLabel = escapeHtml(String(label || ""));
  const width = showLabel ? Math.max(72, Math.min(220, safeLabel.length * 8 + 26)) : size + 10;
  const height = showLabel ? 42 : size + 10;
  const ring = active ? 'box-shadow:0 0 0 3px rgba(15,23,42,.14);' : '';
  return L.divIcon({
    className: "alupla-city-label-icon",
    html: showLabel
      ? `<span class="alupla-city-point"><span class="alupla-city-label-text">${safeLabel}</span><span class="alupla-city-label-dot" style="width:${size}px;height:${size}px;${ring}"></span></span>`
      : `<span class="alupla-city-point alupla-city-point-compact"><span class="alupla-city-label-dot" style="width:${size}px;height:${size}px;${ring}"></span></span>`,
    iconSize: [width, height],
    iconAnchor: [Math.round(width / 2), showLabel ? height - 4 : Math.round(height / 2)],
    popupAnchor: [0, showLabel ? -height + 12 : -height],
  });
}

function shouldCollapseMetroAtZoom(zoom: number) {
  return zoom < 10.2;
}

function visibleLabelLimit(scope: MapScope, zoom: number) {
  if (scope === "abroad") {
    if (zoom < 2.4) return 8;
    if (zoom < 3) return 14;
    if (zoom < 3.8) return 24;
    return Number.POSITIVE_INFINITY;
  }
  if (zoom < 6.2) return 10;
  if (zoom < 6.8) return 18;
  if (zoom < 7.4) return 28;
  if (zoom < 8) return 40;
  return Number.POSITIVE_INFINITY;
}

export default function GraduatesMapPage() {
  const { t, i18n } = useTranslation(["map", "common"]);
  const mt = useCallback(
    (key: string, options?: Record<string, unknown>) =>
      t(key, { ns: "map", ...(options || {}) }),
    [t],
  );
  const ct = useCallback(
    (key: string, options?: Record<string, unknown>) =>
      t(`common.${key}`, { ns: "common", ...(options || {}) }),
    [t],
  );

  const activeLang = (i18n.resolvedLanguage || i18n.language || "gr").toLowerCase().startsWith("en") ? "en" : "gr";

  const mapRef = useRef<L.Map | null>(null);
  const mapCanvasRef = useRef<HTMLDivElement | null>(null);

  const [mapMetric, setMapMetric] = useState<MapMetric>("count");
  const [mapScope, setMapScope] = useState<MapScope>("greece");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] =
    useState<ExportFormat | null>(null);
  const [selectedExportCategories, setSelectedExportCategories] = useState<
    ExportCategoryKey[]
  >([]);
  const [exportingSelection, setExportingSelection] = useState(false);
  const [mapZoom, setMapZoom] = useState(6.5);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [selected, setSelected] = useState<GraduatesMapItem | null>(null);
  const [selectedCityPoint, setSelectedCityPoint] = useState<any | null>(null);
  const [cityDetailLoading, setCityDetailLoading] = useState(false);
  const [cityDetail, setCityDetail] = useState<MapCityDetailResponse | null>(
    null,
  );
  const [selectedGraduationYear, setSelectedGraduationYear] = useState<string>("");
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [yearRangeLoading, setYearRangeLoading] = useState(false);
  const [initialPageReady, setInitialPageReady] = useState(false);
  const [scopeTransitionLoading, setScopeTransitionLoading] = useState(false);
  const [metricTransitionLoading, setMetricTransitionLoading] = useState(false);
  const isCompactViewport = useCompactMapViewport();
  const fitPadding = isCompactViewport
    ? ([18, 18] as [number, number])
    : ([6, 6] as [number, number]);
  const fitMaxZoom = isCompactViewport ? 6.25 : 6.75;
  const initialZoom = isCompactViewport ? 6.2 : 6.75;
  const minMapZoom = isCompactViewport ? 5.6 : 5.8;

  const params = useMemo(
    () =>
      createMapParams({
        ...EMPTY_FILTERS,
        scope: mapScope,
        ...(selectedGraduationYear
          ? { graduation_year: selectedGraduationYear }
          : {}),
      }),
    [mapScope, selectedGraduationYear],
  );
  const { loading, items, cityPoints, cityStatsLoading, selectedCityStats } =
    useMapData(params, selected?.periphery_id ?? null);

  const worldBounds = useMemo(() => L.latLngBounds(L.latLng(-60, -180), L.latLng(85, 180)), []);
  const greeceBounds = useMemo(() => L.latLngBounds(L.latLng(34.4, 19.8), L.latLng(41.9, 29.9)), []);

  const activeBounds = mapScope === "abroad" ? worldBounds : greeceBounds;
  const activeFitMaxZoom = mapScope === "abroad" ? (isCompactViewport ? 1.9 : 2.15) : fitMaxZoom;
  const activeInitialZoom = mapScope === "abroad" ? 2 : initialZoom;
  const activeMinZoom = mapScope === "abroad" ? 1.5 : minMapZoom;


  const greekCityMarkers = useMemo(() => {
    const palette = ["#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8"];
    const radii = [10, 12, 15, 18, 21, 25, 29];
    const grouped = new Map<string, any>();
    const collapseMetro = shouldCollapseMetroAtZoom(mapZoom);

    for (const city of cityPoints) {
      const latitude = mapCityLatitude(city);
      const longitude = mapCityLongitude(city);
      const count = Math.max(0, Number(city.count) || 0);
      if (latitude === null || longitude === null || count <= 0) continue;

      const metroGroup = collapseMetro ? metroGroupForPoint(latitude, longitude) : null;
      const key = metroGroup ? `metro:${metroGroup.key}` : `city:${mapCityKey(city as any)}`;
      const current = grouped.get(key) || {
        ...(metroGroup ? {
          city_id: 0,
          city_name: metroGroup.label,
          latitude: metroGroup.center.latitude,
          longitude: metroGroup.center.longitude,
          male_count: 0,
          female_count: 0,
          avg_age_weighted_sum: 0,
          avg_age_weight: 0,
          avg_grade_weighted_sum: 0,
          avg_grade_weight: 0,
          avg_graduation_weighted_sum: 0,
          avg_graduation_weight: 0,
        } : {
          ...city,
          latitude,
          longitude,
        }),
        count: 0,
      };

      current.count += count;
      current.male_count = Math.max(0, Number(current.male_count || 0)) + Math.max(0, Number((city as any).male_count || 0));
      current.female_count = Math.max(0, Number(current.female_count || 0)) + Math.max(0, Number((city as any).female_count || 0));

      const avgAge = Number((city as any).avg_age);
      if (Number.isFinite(avgAge)) {
        current.avg_age_weighted_sum = Number(current.avg_age_weighted_sum || 0) + avgAge * count;
        current.avg_age_weight = Number(current.avg_age_weight || 0) + count;
      }
      const avgGrade = Number((city as any).avg_grade);
      if (Number.isFinite(avgGrade)) {
        current.avg_grade_weighted_sum = Number(current.avg_grade_weighted_sum || 0) + avgGrade * count;
        current.avg_grade_weight = Number(current.avg_grade_weight || 0) + count;
      }
      const avgGraduationYears = Number((city as any).avg_graduation_years);
      if (Number.isFinite(avgGraduationYears)) {
        current.avg_graduation_weighted_sum = Number(current.avg_graduation_weighted_sum || 0) + avgGraduationYears * count;
        current.avg_graduation_weight = Number(current.avg_graduation_weight || 0) + count;
      }

      grouped.set(key, current);
    }

    const points = Array.from(grouped.values()).map((item) => ({
      ...item,
      avg_age: Number(item.avg_age_weight || 0) > 0 ? Number(item.avg_age_weighted_sum || 0) / Number(item.avg_age_weight || 1) : item.avg_age,
      avg_grade: Number(item.avg_grade_weight || 0) > 0 ? Number(item.avg_grade_weighted_sum || 0) / Number(item.avg_grade_weight || 1) : item.avg_grade,
      avg_graduation_years: Number(item.avg_graduation_weight || 0) > 0 ? Number(item.avg_graduation_weighted_sum || 0) / Number(item.avg_graduation_weight || 1) : item.avg_graduation_years,
    }));

    const counts = points.map((item) => Math.max(0, Number(item.count) || 0)).sort((left, right) => left - right);
    if (!counts.length) return { items: [] as Array<any>, legend: [] as Array<any>, maxCount: 0 };

    const breaks = Array.from({ length: palette.length }, (_, index) => {
      const percentile = (index + 1) / palette.length;
      const position = Math.min(counts.length - 1, Math.max(0, Math.ceil(percentile * counts.length) - 1));
      return counts[position];
    }).reduce((acc: number[], value) => {
      if (!acc.length || value > acc[acc.length - 1]) acc.push(value);
      return acc;
    }, []);

    const bucketForCount = (count: number) => {
      const hit = breaks.findIndex((value) => count <= value);
      return hit === -1 ? breaks.length - 1 : hit;
    };

    const legend = breaks.map((limit, index) => ({
      key: `city-${index}`,
      label: index === 0 ? `1–${limit}` : `${breaks[index - 1] + 1}–${limit}`,
      color: palette[Math.min(index, palette.length - 1)],
      radius: radii[Math.min(index, radii.length - 1)],
      opacity: 0.8,
    }));

    return {
      items: points.map((item) => {
        const bucket = bucketForCount(Math.max(0, Number(item.count) || 0));
        return {
          ...item,
          markerRadius: radii[Math.min(bucket, radii.length - 1)],
          markerFill: palette[Math.min(bucket, palette.length - 1)],
          markerStroke: bucket >= palette.length - 2 ? "#1e3a8a" : "#1d4ed8",
          markerOpacity: bucket >= palette.length - 2 ? 0.92 : 0.8,
        };
      }),
      legend,
      maxCount: counts[counts.length - 1],
    };
  }, [cityPoints, mapZoom]);

  useLayoutEffect(() => {
    if (!activeBounds || !mapRef.current) return;
    const map = mapRef.current;
    const sync = () => {
      map.invalidateSize();
      map.fitBounds(activeBounds, {
        padding: fitPadding,
        maxZoom: activeFitMaxZoom,
        animate: false,
      });
      setMapZoom(map.getZoom());
      setMapBounds(map.getBounds());
    };
    const frame = window.requestAnimationFrame(sync);
    const timer = window.setTimeout(sync, 120);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [activeBounds, activeFitMaxZoom, fitPadding]);


  useEffect(() => {
    setSelected(null);
    setSelectedCityPoint(null);
    setCityDetail(null);
  }, [mapScope]);

  useEffect(() => {
    if (!selected) return;
    const nextSelected =
      items.find((item) => item.periphery_id === selected.periphery_id) || null;
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
      ...(selectedCityPoint.city_id ? { city_id: selectedCityPoint.city_id } : {}),
      ...(mapScope === "greece" && selectedCityPoint.city_name ? { city_name: selectedCityPoint.city_name } : {}),
      ...(selectedCityPoint.country_region_id ? { country_region_id: selectedCityPoint.country_region_id } : {}),
      mode: mapMetric,
      ...params,
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
  }, [selectedCityPoint?.city_id, selectedCityPoint?.city_name, selectedCityPoint?.country_region_id, mapMetric, mapScope, params]);

  useEffect(() => {
    let active = true;
    setYearRangeLoading(true);
    getMapYearRange()
      .then((response) => {
        if (!active) return;
        const nextYears = Array.isArray(response?.years)
          ? response.years.filter((year) => Number.isFinite(year) && year > 1900)
          : [];
        setAvailableYears(nextYears);
        if (!selectedGraduationYear && nextYears.length) return;
        if (selectedGraduationYear && !nextYears.includes(Number(selectedGraduationYear))) {
          setSelectedGraduationYear("");
        }
      })
      .catch(() => {
        if (active) setAvailableYears([]);
      })
      .finally(() => {
        if (active) setYearRangeLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (initialPageReady || loading || yearRangeLoading) return;
    const frame = window.requestAnimationFrame(() => setInitialPageReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, [initialPageReady, loading, yearRangeLoading]);

  useEffect(() => {
    if (!scopeTransitionLoading || loading) return;
    const frame = window.requestAnimationFrame(() => setScopeTransitionLoading(false));
    return () => window.cancelAnimationFrame(frame);
  }, [loading, scopeTransitionLoading]);

  useEffect(() => {
    if (!metricTransitionLoading) return;
    const timer = window.setTimeout(() => setMetricTransitionLoading(false), 220);
    return () => window.clearTimeout(timer);
  }, [mapMetric, metricTransitionLoading]);

  const isAllYearsSelected = !selectedGraduationYear;
  const selectedYearLabel = isAllYearsSelected
    ? mt("timeline.allYears", { defaultValue: "Όλες οι χρονιές" })
    : selectedGraduationYear;
  const pageLoading = !initialPageReady || scopeTransitionLoading;
  const inlineMapLoading = (!pageLoading && loading) || metricTransitionLoading;
  const inlineTimelineLoading = (!pageLoading && (loading || yearRangeLoading)) || metricTransitionLoading;

  const exportCategoryOptions = useMemo(
    () => [
      {
        id: "count" as ExportCategoryKey,
        label: mt("metricOptions.count", { defaultValue: "Πλήθος αποφοίτων" }),
      },
      {
        id: "dominant_gender" as ExportCategoryKey,
        label: mt("metricOptions.dominantGender", { defaultValue: "Φύλο" }),
      },
    ],
    [mt],
  );

  const metricOptions = useMemo(
    () => ({
      count: {
        label: mt("metricOptions.count", { defaultValue: "Πλήθος αποφοίτων" }),
        legend: mt("export.count", { defaultValue: "Απόφοιτοι" }),
        value: (item: GraduatesMapItem) => Number(item.count ?? 0) || 0,
      },
      dominant_gender: {
        label: mt("metricOptions.dominantGender", { defaultValue: "Φύλο" }),
        legend: mt("legendLabels.dominantGender", {
          defaultValue: "Κυρίαρχο φύλο",
        }),
        value: (item: GraduatesMapItem) =>
          Math.abs(
            (Number(item.male_count ?? 0) || 0) -
              (Number(item.female_count ?? 0) || 0),
          ),
      },
    }),
    [mt],
  );

  const genderLegendEntries = useMemo(
    () => [
      {
        key: "male",
        label: mt("maleDominant", { defaultValue: "Περισσότεροι άντρες" }),
        color: genderColors.male,
        opacity: 0.82,
      },
      {
        key: "female",
        label: mt("femaleDominant", { defaultValue: "Περισσότερες γυναίκες" }),
        color: genderColors.female,
        opacity: 0.82,
      },
      {
        key: "balanced",
        label: mt("balanced", { defaultValue: "Ισορροπημένη κατανομή" }),
        color: genderColors.balanced,
        opacity: 0.82,
      },
    ],
    [mt],
  );

  const abroadCountryMarkers = useMemo(() => {
    const palette = ["#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8"];
    const radii = [10, 12, 15, 18, 21, 25, 29];
    const grouped = new Map<string, any>();

    for (const city of cityPoints) {
      const latitude = mapCityLatitude(city as any);
      const longitude = mapCityLongitude(city as any);
      const rawCountryName = String((city as any).country_name || (city as any).periphery_name || "").trim();
      const localizedName = localizedCountryName(rawCountryName, activeLang);
      const countryId = Number((city as any).country_region_id || (city as any).periphery_id || 0);
      if (!localizedName || latitude === null || longitude === null) continue;
      const key = countryId > 0 ? `country:${countryId}` : `country:${localizedCountryKey(rawCountryName)}`;
      const current = grouped.get(key) || {
        city_id: 0,
        city_name: localizedName,
        periphery_id: countryId || Number((city as any).periphery_id || 0) || null,
        periphery_name: localizedName,
        country_region_id: countryId || null,
        country_name: localizedName,
        raw_country_name: rawCountryName || localizedName,
        latitude_sum: 0,
        longitude_sum: 0,
        weight: 0,
        count: 0,
        male_count: 0,
        female_count: 0,
      };
      const weight = Math.max(1, Number((city as any).count) || 0);
      current.city_name = localizedName;
      current.periphery_name = localizedName;
      current.country_name = localizedName;
      current.latitude_sum += latitude * weight;
      current.longitude_sum += longitude * weight;
      current.weight += weight;
      current.count += weight;
      current.male_count += Math.max(0, Number((city as any).male_count) || 0);
      current.female_count += Math.max(0, Number((city as any).female_count) || 0);
      grouped.set(key, current);
    }

    const points = Array.from(grouped.values())
      .map((item) => ({
        city_id: 0,
        city_name: item.country_name,
        periphery_id: item.periphery_id,
        periphery_name: item.country_name,
        country_region_id: item.country_region_id,
        country_name: item.country_name,
        raw_country_name: item.raw_country_name,
        latitude: item.weight ? item.latitude_sum / item.weight : null,
        longitude: item.weight ? item.longitude_sum / item.weight : null,
        count: item.count,
        male_count: item.male_count,
        female_count: item.female_count,
      }))
      .filter((item) => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)));

    const counts = points.map((item) => Math.max(0, Number(item.count) || 0)).filter((value) => value > 0).sort((left, right) => left - right);
    if (!counts.length) return [] as Array<any>;

    const breaks = Array.from({ length: palette.length }, (_, index) => {
      const percentile = (index + 1) / palette.length;
      const position = Math.min(counts.length - 1, Math.max(0, Math.ceil(percentile * counts.length) - 1));
      return counts[position];
    }).reduce((acc: number[], value) => {
      if (!acc.length || value > acc[acc.length - 1]) acc.push(value);
      return acc;
    }, []);

    const bucketForCount = (count: number) => {
      const hit = breaks.findIndex((value) => count <= value);
      return hit === -1 ? breaks.length - 1 : hit;
    };

    return points
      .map((item) => {
        const bucket = bucketForCount(Math.max(0, Number(item.count) || 0));
        return {
          ...item,
          markerRadius: radii[Math.min(bucket, radii.length - 1)],
          markerFill: palette[Math.min(bucket, palette.length - 1)],
          markerStroke: bucket >= palette.length - 2 ? "#1e3a8a" : "#1d4ed8",
          markerOpacity: bucket >= palette.length - 2 ? 0.92 : 0.8,
        };
      })
      .sort((left, right) => {
        if ((right.count || 0) !== (left.count || 0)) return (right.count || 0) - (left.count || 0);
        return String(left.country_name || "").localeCompare(String(right.country_name || ""), activeLang === "en" ? "en" : "el");
      });
  }, [activeLang, cityPoints]);
  const abroadLegendEntries = useMemo(() => {
    if (mapMetric === "dominant_gender") return genderLegendEntries;
    const counts = abroadCountryMarkers
      .map((item) => Math.max(0, Number(item.count) || 0))
      .filter((value) => value > 0)
      .sort((left, right) => left - right);
    if (!counts.length) return [] as Array<any>;
    const palette = ["#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8"];
    const sizes = [10, 12, 15, 18, 21, 25, 29];
    const breaks = Array.from({ length: palette.length }, (_, index) => {
      const percentile = (index + 1) / palette.length;
      const position = Math.min(counts.length - 1, Math.max(0, Math.ceil(percentile * counts.length) - 1));
      return counts[position];
    }).reduce((acc: number[], value) => {
      if (!acc.length || value > acc[acc.length - 1]) acc.push(value);
      return acc;
    }, []);
    return breaks.map((limit, index) => ({
      key: `abroad-${index}`,
      label: index === 0 ? `1–${limit}` : `${breaks[index - 1] + 1}–${limit}`,
      color: palette[Math.min(index, palette.length - 1)],
      radius: sizes[Math.min(index, sizes.length - 1)],
      opacity: 0.8,
    }));
  }, [abroadCountryMarkers, genderLegendEntries, mapMetric]);

  const renderedLegendEntries = useMemo(() => {
    if (mapScope === "greece") {
      return mapMetric === "count" ? greekCityMarkers.legend : genderLegendEntries;
    }
    return abroadLegendEntries;
  }, [abroadLegendEntries, genderLegendEntries, greekCityMarkers.legend, mapMetric, mapScope]);

  const rankedMarkersBase = useMemo(() => {
    const source = (mapScope === "abroad" ? abroadCountryMarkers : greekCityMarkers.items)
      .map((item) => ({ item, count: Math.max(0, Number((item as any).count) || 0), name: String((item as any).city_name || (item as any).periphery_name || "") }))
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;
        return left.name.localeCompare(right.name, "el");
      });
    return new Map(source.map((entry, index) => [mapCityKey(entry.item as any), index]));
  }, [abroadCountryMarkers, greekCityMarkers.items, mapScope]);
  const labelLimit = useMemo(() => visibleLabelLimit(mapScope, mapZoom), [mapScope, mapZoom]);
  const shouldShowMarkerLabel = useCallback((city: any) => {
    const rank = rankedMarkersBase.get(mapCityKey(city as any));
    if (rank === undefined) return true;
    return rank < labelLimit;
  }, [labelLimit, rankedMarkersBase]);
  const renderedMarkers = useMemo(() => {
    const source = mapScope === "abroad" ? abroadCountryMarkers : greekCityMarkers.items;
    return source.filter((item) => {
      if (shouldShowMarkerLabel(item)) return true;
      if (!selectedCityPoint) return false;
      if (mapScope === "abroad") {
        const selectedCountryId = Number(selectedCityPoint.country_region_id || selectedCityPoint.periphery_id || 0);
        const currentCountryId = Number((item as any).country_region_id || (item as any).periphery_id || 0);
        if (selectedCountryId && currentCountryId) return selectedCountryId === currentCountryId;
        return localizedCountryKey(selectedCityPoint.country_name || selectedCityPoint.periphery_name || selectedCityPoint.city_name || "") === localizedCountryKey((item as any).country_name || (item as any).periphery_name || (item as any).city_name || "");
      }
      return normalizeKey(selectedCityPoint.city_name || "") === normalizeKey((item as any).city_name || "") && Number(selectedCityPoint.country_region_id || selectedCityPoint.periphery_id || 0) === Number((item as any).country_region_id || (item as any).periphery_id || 0);
    });
  }, [abroadCountryMarkers, greekCityMarkers.items, mapScope, selectedCityPoint, shouldShowMarkerLabel]);
  const topPeriphery = useMemo(() => items[0] || null, [items]);
  const topCity = useMemo(() => cityPoints[0] || null, [cityPoints]);
  const total = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.count ?? 0) || 0), 0),
    [items],
  );

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
    return weightedCount
      ? Math.round((weightedSum / weightedCount) * 10) / 10
      : null;
  }, [items]);


  function exportRows() {
    return buildBaseExportRows(items, mt);
  }

  function currentFilenameBase() {
    const parts = ["alupla_map", slugPart(mapScope), slugPart(mapMetric)];
    if (selectedGraduationYear) parts.push(slugPart(selectedGraduationYear));
    if (selected?.periphery_name) parts.push(slugPart(selected.periphery_name));
    return parts.join("_");
  }

  function metricFilenameBase(metric: MapMetric) {
    const parts = ["alupla_map", slugPart(mapScope), slugPart(metric)];
    if (selectedGraduationYear) parts.push(slugPart(selectedGraduationYear));
    return parts.join("_");
  }

  function openExportSelection(format: ExportFormat) {
    setSelectedExportCategories([]);
    setSelectedExportFormat(format);
    setShowExportMenu(false);
  }

  function closeExportSelection() {
    if (exportingSelection) return;
    setSelectedExportFormat(null);
  }

  function toggleExportCategory(category: ExportCategoryKey) {
    setSelectedExportCategories((prev) =>
      toggleExportCategorySelection(prev, category),
    );
  }

  function toggleAllExportCategories() {
    setSelectedExportCategories(
      (prev) =>
        toggleAllExportCategorySelection(
          prev,
          exportCategoryOptions.map((item) => item.id),
        ) as ExportCategoryKey[],
    );
  }

  async function loadExportCategoryData(metric: MapMetric) {
    const nextParams = createMapParams({
      ...EMPTY_FILTERS,
      scope: mapScope,
      ...(selectedGraduationYear ? { graduation_year: selectedGraduationYear } : {}),
    });
    const [mapResponse, citiesResponse] = await Promise.all([
      getGraduatesMap(nextParams),
      getMapCities(nextParams),
    ]);
    return {
      items: Array.isArray(mapResponse?.items) ? mapResponse.items : [],
      cityPoints: Array.isArray(citiesResponse?.items)
        ? citiesResponse.items
        : [],
    };
  }

  async function exportMapSelectionAsPng() {
    const previousMetric = mapMetric;
    const snapshotsByCategory: Array<{
      key: ExportCategoryKey;
      snapshots: Array<{
        image: HTMLImageElement;
        width: number;
        height: number;
        caption?: string;
      }>;
    }> = [];

    for (const category of selectedExportCategories) {
      setMapMetric(category);
      await waitForMapFrame(mapRef);
      if (!mapCanvasRef.current) continue;
      const snapshot = await renderMapSnapshot(mapCanvasRef.current);
      snapshotsByCategory.push({ key: category, snapshots: [snapshot] });
    }

    setMapMetric(previousMetric);
    await waitForMapFrame(mapRef);

    for (const entry of snapshotsByCategory) {
      const option = exportCategoryOptions.find(
        (item) => item.id === entry.key,
      );
      await exportCombinedSnapshots(
        `${metricFilenameBase(entry.key)}.png`,
        option?.label || entry.key,
        entry.snapshots,
      );
    }
  }

  async function handleExportSelection() {
    if (!selectedExportFormat || !selectedExportCategories.length) return;
    setExportingSelection(true);
    try {
      if (selectedExportFormat === "png") {
        await exportMapSelectionAsPng();
      } else {
        const workbook = XLSX.utils.book_new();
        const usedNames = new Set<string>();
        const csvRows: Array<Record<string, any>> = [];
        for (const category of selectedExportCategories) {
          if (category === "count") {
            const response = await loadExportCategoryData("count");
            const rows = buildCountSheetRows(
              response.items,
              response.cityPoints,
              mt,
            );
            const title = mt("metricOptions.count", {
              defaultValue: "Πλήθος αποφοίτων",
            });
            if (selectedExportFormat === "xlsx") {
              const sheet = XLSX.utils.json_to_sheet(rows);
              applySheetLayout(sheet, rows);
              XLSX.utils.book_append_sheet(
                workbook,
                sheet,
                workbookSheetName(title, usedNames),
              );
            }
            csvRows.push(...buildCsvRows(title, rows, mt, selectedYearLabel));
            continue;
          }
          if (category === "dominant_gender") {
            const response = await loadExportCategoryData("dominant_gender");
            const rows = buildGenderSheetRows(
              response.items,
              response.cityPoints,
              mt,
            );
            const title = mt("metricOptions.dominantGender", {
              defaultValue: "Φύλο",
            });
            if (selectedExportFormat === "xlsx") {
              const sheet = XLSX.utils.json_to_sheet(rows);
              applySheetLayout(sheet, rows);
              XLSX.utils.book_append_sheet(
                workbook,
                sheet,
                workbookSheetName(title, usedNames),
              );
            }
            csvRows.push(...buildCsvRows(title, rows, mt, selectedYearLabel));
            continue;
          }
        }
        if (selectedExportFormat === "xlsx")
          exportWorkbook("alupla_map_export.xlsx", workbook);
        if (selectedExportFormat === "csv")
          exportCsvText("alupla_map_export.csv", buildCsvText(csvRows));
      }
      try {
        await logPublicExport("map_export", selectedExportFormat);
      } catch {}
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
    try {
      await logPublicExport("map_export", "xlsx");
    } catch {}
  }

  async function onExportCsv() {
    const rows = exportRows();
    const headers = Object.keys(rows[0] || {});
    const esc = (value: any) => {
      const text = String(value ?? "");
      if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
      return text;
    };
    const lines = [
      headers.map(esc).join(","),
      ...rows.map((row) =>
        headers.map((header) => esc((row as any)[header])).join(","),
      ),
    ];
    exportCsvText(`${currentFilenameBase()}.csv`, lines.join("\r\n"));
    try {
      await logPublicExport("map_export", "csv");
    } catch {}
  }

  async function onExportPng() {
    if (!mapCanvasRef.current) return;
    await exportElementAsPng(
      mapCanvasRef.current,
      `${currentFilenameBase()}.png`,
    );
    try {
      await logPublicExport("map_export", "png");
    } catch {}
  }

  function detailGroups(item: any) {
    if (mapMetric === "dominant_gender") {
      return [
        {
          title: mt("detailGroups.demographics", {
            defaultValue: "Δημογραφικά",
          }),
          rows: [
            {
              label: mt("maleCount", { defaultValue: "Άνδρες" }),
              value: detailValue(item.male_count ?? 0),
            },
            {
              label: mt("femaleCount", { defaultValue: "Γυναίκες" }),
              value: detailValue(item.female_count ?? 0),
            },
            {
              label: mt("malePct", { defaultValue: "% Άνδρες" }),
              value: detailValue(item.male_pct, "%"),
            },
            {
              label: mt("femalePct", { defaultValue: "% Γυναίκες" }),
              value: detailValue(item.female_pct, "%"),
            },
          ],
        },
      ];
    }
    return [
      {
        title: mt("detailGroups.demographics", { defaultValue: "Δημογραφικά" }),
        rows: [
          {
            label: mt("avgAge", { defaultValue: "Μέση ηλικία" }),
            value: detailValue(item.avg_age),
          },
        ],
      },
      {
        title: mt("detailGroups.academics", { defaultValue: "Ακαδημαϊκά" }),
        rows: [
          {
            label: mt("avgGrade", { defaultValue: "Μέσος βαθμός" }),
            value: detailValue(item.avg_grade),
          },
          {
            label: mt("avgGraduationYears", {
              defaultValue: "Μέσος χρόνος αποφοίτησης",
            }),
            value: detailValue(item.avg_graduation_years),
          },
        ],
      },
    ];
  }

  function renderCityPopupContent() {
    return (
      <MapCityPopupContent
        ct={ct}
        mt={mt}
        mapMetric={mapMetric}
        cityDetailLoading={cityDetailLoading}
        cityDetail={cityDetail}
        directionColorMap={new Map()}
      />
    );
  }

  if (pageLoading) {
    return <div className="card">{ct("loading", { defaultValue: "Φόρτωση..." })}</div>;
  }

  return (
    <div className="container">
      <style>{`
        .leaflet-container path:focus, .leaflet-interactive:focus, .leaflet-container:focus { outline: none !important; }
        .alupla-map .leaflet-container { background: transparent !important; }
        .alupla-map-card { padding: 0; overflow: hidden; position: relative; }
        .alupla-city-label-icon { background: transparent !important; border: 0 !important; }
        .alupla-city-bubble-icon { background: transparent !important; border: 0 !important; }
        .alupla-city-bubble-wrap { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; pointer-events: auto; overflow: visible; }
        .alupla-city-bubble-label, .alupla-city-label-text { text-align: center; color: #0f172a; font-size: 12px; font-weight: 700; line-height: 1.05; white-space: nowrap; text-shadow: 0 1px 2px rgba(255,255,255,.95), 0 0 6px rgba(255,255,255,.9); background: transparent !important; border: 0 !important; padding: 0; }
        .alupla-city-bubble-label { margin: 0 0 4px; }
        .alupla-city-bubble { position: relative; display: flex; align-items: center; justify-content: center; border-radius: 999px; color: #fff; font-weight: 800; }
        .alupla-city-bubble-number { line-height: 1; color: #fff; text-shadow: 0 1px 1px rgba(15,23,42,.35); }
        .alupla-city-bubble-number-gender { color: #0f172a; text-shadow: 0 1px 1px rgba(255,255,255,.5); }
        .alupla-city-bubble-sub { margin-top: 4px; color: #475569; font-size: 10px; font-weight: 700; white-space: nowrap; text-shadow: 0 1px 2px rgba(255,255,255,.95), 0 0 6px rgba(255,255,255,.9); }
        .alupla-city-point { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 4px; pointer-events: auto; }
        .alupla-city-label-text { display: block; margin: 0; }
        .alupla-city-label-dot { display: block; border-radius: 999px; background: #475569; border: 1px solid rgba(255,255,255,.92); box-shadow: 0 1px 2px rgba(15,23,42,.18); }
        .alupla-city-point-compact { width: 18px; height: 18px; display:flex; align-items:center; justify-content:center; }
        .alupla-map .leaflet-control-zoom .alupla-map-reset-button { display: block; text-align: center; text-decoration: none; }
        .alupla-map .leaflet-control-zoom .alupla-map-reset-button:hover { text-decoration: none; }
        .alupla-map .leaflet-control-zoom .alupla-map-reset-button span { font-size: 18px; line-height: 1; font-weight: 800; }
        .alupla-region-tip-title { font-weight: 700; margin-bottom: 4px; }
        .alupla-region-tip-sub { color: #64748b; font-size: 12px; }
        .map-top-menu-card { padding: 20px 16px 16px; display: grid; gap: 14px; }
        .map-top-menu-title { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .map-top-menu-title h2 { margin: 0; }
        .map-scope-group, .map-metric-group { display: grid; gap: 10px; width: 100%; }
        .map-scope-group { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .map-metric-group { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .map-metric-button, .map-action-button, .map-program-button { width: 100%; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; }
        .map-metric-button.active, .map-program-button.active { background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 700; }
        .map-program-button { gap: 8px; }
        .map-menu { position: absolute; top: calc(100% + 8px); right: 0; width: 220px; background: #fff; border: 1px solid var(--border); border-radius: 14px; box-shadow: 0 18px 40px rgba(15,23,42,.16); padding: 8px; z-index: 3000; display: grid; gap: 6px; }
        .map-menu-item { width: 100%; border: 0; background: transparent; text-align: left; padding: 10px 12px; border-radius: 10px; cursor: pointer; font: inherit; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .map-menu-item:hover { background: #f8fafc; }
        .map-menu-item.active { background: #eff6ff; color: #1d4ed8; font-weight: 700; }
        .map-timeline-card { margin: 12px auto 0; max-width: 1080px; padding: 16px 18px; display: grid; gap: 14px; }
        .map-timeline-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .map-timeline-title { font-size: 18px; font-weight: 800; color: #0f172a; }
        .map-timeline-subtitle { color: #64748b; font-size: 13px; margin-top: 4px; }
        .map-timeline-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .map-timeline-current { min-height: 44px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--border); background: rgba(248,250,252,.9); display: inline-flex; align-items: center; font-weight: 700; color: #0f172a; }
        .map-timeline-all-button { min-height: 44px; }
        .map-timeline-slider-wrap { display: grid; gap: 10px; }
        .map-timeline-slider { width: 100%; accent-color: var(--primary); cursor: pointer; }
        .map-timeline-slider:disabled { cursor: default; opacity: .65; }
        .map-timeline-scale { display: flex; justify-content: space-between; gap: 12px; color: #64748b; font-size: 13px; font-weight: 700; }
        .map-summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 12px 0 0; }
        .map-summary-card { min-height: 124px; padding: 18px; display: grid; align-content: space-between; gap: 8px; }
        .map-summary-label { color: #475569; font-size: 17px; line-height: 1.32; }
        .map-summary-value { font-size: 28px; font-weight: 800; line-height: 1.1; color: #0f172a; }
        .map-summary-sub { color: #64748b; font-size: 13px; line-height: 1.35; }
        .map-main-card { margin: 12px auto 0; max-width: 1080px; }
        .map-map-wrap { position: relative; padding: 8px 8px 12px; }
        .map-loading-overlay { position: absolute; inset: 8px 8px 12px; border-radius: 18px; background: rgba(255,255,255,.78); backdrop-filter: blur(2px); display: grid; place-items: center; z-index: 450; pointer-events: none; }
        .map-loading-overlay-card { min-width: 180px; min-height: 88px; padding: 16px 20px; border-radius: 18px; border: 1px solid rgba(148,163,184,.28); background: rgba(255,255,255,.96); box-shadow: 0 18px 40px rgba(15,23,42,.14); display: grid; place-items: center; font-size: 18px; font-weight: 800; color: #0f172a; text-align: center; }
        .map-loading-overlay-timeline { inset: 0; border-radius: 16px; }
        .map-timeline-shell { position: relative; }
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
        @media (max-width: 640px) { .map-metric-group, .map-summary-grid, .map-city-cards-inline { grid-template-columns: 1fr; } .map-timeline-actions { width: 100%; } .map-timeline-current, .map-timeline-all-button { width: 100%; justify-content: center; } }
      `}</style>

      <MapTopControls
        mt={mt}
        ct={ct}
        loading={loading}
        total={total}
        mapMetric={mapMetric}
        mapScope={mapScope}
        metricOptions={metricOptions}
        showExportMenu={showExportMenu}
        onMetricChange={(metric) => {
          if (metric === mapMetric) return;
          setMetricTransitionLoading(true);
          setMapMetric(metric);
        }}
        onScopeChange={(scope) => {
          if (scope === mapScope) return;
          setShowExportMenu(false);
          setScopeTransitionLoading(true);
          setMapScope(scope);
        }}
        onToggleExportMenu={() => setShowExportMenu((prev) => !prev)}
        onExportPick={openExportSelection}
      />

      <div className="map-summary-grid">
        <div className="card map-summary-card">
          <div className="map-summary-label">
            {mt("summary.total", { defaultValue: "Σύνολο αποφοίτων" })}
          </div>
          <div className="map-summary-value">{total}</div>
        </div>
        <div className="card map-summary-card">
          <div className="map-summary-label">
            {mapScope === "abroad"
              ? mt("summary.topCountry", { defaultValue: "Χώρα με τους περισσότερους αποφοίτους" })
              : mt("summary.topPeriphery", { defaultValue: "Περιφέρεια με τους περισσότερους αποφοίτους" })}
          </div>
          <div className="map-summary-value">
            {topPeriphery?.periphery_name || "-"}
          </div>
          <div className="map-summary-sub">
            {topPeriphery
              ? `${topPeriphery.count} ${mt("export.count", { defaultValue: "Απόφοιτοι" })}`
              : "-"}
          </div>
        </div>
        <div className="card map-summary-card">
          <div className="map-summary-label">
            {mt("summary.topCity", {
              defaultValue: "Πόλη με τους περισσότερους αποφοίτους",
            })}
          </div>
          <div className="map-summary-value">{topCity?.city_name || "-"}</div>
          <div className="map-summary-sub">
            {topCity
              ? `${topCity.count} ${mt("export.count", { defaultValue: "Απόφοιτοι" })}`
              : "-"}
          </div>
        </div>
        <div className="card map-summary-card">
          <div className="map-summary-label">
            {mt("summary.avgAge", { defaultValue: "Μέση ηλικία αποφοίτων" })}
          </div>
          <div className="map-summary-value">
            {weightedAvgAge === null ? "-" : compactNumber(weightedAvgAge)}
          </div>
        </div>
      </div>

      <div className="map-timeline-shell">
        <MapYearTimeline
          mt={mt}
          years={availableYears}
          selectedYear={selectedGraduationYear}
          isAllYears={isAllYearsSelected}
          loading={yearRangeLoading || inlineTimelineLoading}
          onSelectAllYears={() => setSelectedGraduationYear("")}
          onSliderChange={(year) => setSelectedGraduationYear(year)}
        />
        {inlineTimelineLoading ? (
          <div className="map-loading-overlay map-loading-overlay-timeline">
            <div className="map-loading-overlay-card">{ct("loading", { defaultValue: "Φόρτωση..." })}</div>
          </div>
        ) : null}
      </div>

      <div className="card alupla-map-card map-main-card">
        <div className="map-map-wrap">
          <div className="alupla-map map-canvas" ref={mapCanvasRef}>
            <MapContainer
              key={`map-${mapScope}`}
              center={mapScope === "abroad" ? [20, 0] : [38.6, 24.0]}
              zoom={activeInitialZoom as any}
              minZoom={activeMinZoom as any}
              zoomSnap={0.25}
              maxBounds={mapScope === "abroad" ? worldBounds.pad(0.05) : undefined}
              maxBoundsViscosity={mapScope === "abroad" ? 1 : undefined}
              worldCopyJump={mapScope === "abroad"}
              whenCreated={(map) => {
                mapRef.current = map;
                if (activeBounds)
                  map.fitBounds(activeBounds, {
                    padding: fitPadding,
                    maxZoom: activeFitMaxZoom,
                    animate: false,
                  });
                setMapZoom(map.getZoom());
                setMapBounds(map.getBounds());
              }}
              style={{
                height: "100%",
                width: "100%",
                background: "transparent",
              }}
              scrollWheelZoom
            >
              <TileLayer
                attribution={mapTileAttribution}
                url={mapTileUrl}
                crossOrigin="anonymous"
              />
              <MapViewportWatcher
                onZoomChange={setMapZoom}
                onBoundsChange={setMapBounds}
              />
              {activeBounds ? (
                <MapResetControl
                  title={mt("mapReset", { defaultValue: "Επαναφορά αρχικής προβολής" })}
                  label="↺"
                  bounds={activeBounds}
                  padding={fitPadding}
                  maxZoom={activeFitMaxZoom}
                />
              ) : null}
              {renderedMarkers.map((city) => {
                const latitude = mapCityLatitude(city);
                const longitude = mapCityLongitude(city);
                if (latitude === null || longitude === null) return null;
                const activeCity = mapScope === "abroad"
                  ? (() => {
                      const selectedCountryId = Number(selectedCityPoint?.country_region_id || selectedCityPoint?.periphery_id || 0);
                      const cityCountryId = Number(city.country_region_id || city.periphery_id || 0);
                      if (selectedCountryId && cityCountryId) return selectedCountryId === cityCountryId;
                      return localizedCountryKey(selectedCityPoint?.country_name || selectedCityPoint?.periphery_name || selectedCityPoint?.city_name || "") === localizedCountryKey(city.country_name || city.periphery_name || city.city_name || "");
                    })()
                  : normalizeKey(selectedCityPoint?.city_name || "") === normalizeKey(city.city_name || "") && Number(selectedCityPoint?.country_region_id || selectedCityPoint?.periphery_id || 0) === Number(city.country_region_id || city.periphery_id || 0);
                const openCity = () => {
                  setSelectedCityPoint(city);
                  if (city.periphery_id) {
                    const hit = items.find((item) => item.periphery_id === city.periphery_id);
                    if (hit) setSelected(hit);
                  }
                };
                if (mapScope === "greece") {
                  return (
                    <Marker
                      key={mapCityKey(city)}
                      position={[latitude, longitude]}
                      icon={bubbleLabelIcon(city, mapMetric, activeCity, shouldShowMarkerLabel(city), mt)}
                      eventHandlers={{
                        click: openCity,
                        popupclose: () => setSelectedCityPoint(null),
                      }}
                    >
                      <Popup minWidth={300} maxWidth={360} autoPan closeButton>
                        {activeCity ? renderCityPopupContent() : <div style={{ minWidth: 280 }} />}
                      </Popup>
                    </Marker>
                  );
                }
                return (
                  <Marker
                    key={mapCityKey(city)}
                    position={[latitude, longitude]}
                    icon={bubbleLabelIcon(city, mapMetric, activeCity, shouldShowMarkerLabel(city), mt)}
                    eventHandlers={{
                      click: openCity,
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

          {inlineMapLoading ? (
            <div className="map-loading-overlay">
              <div className="map-loading-overlay-card">{ct("loading", { defaultValue: "Φόρτωση..." })}</div>
            </div>
          ) : null}

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
              maxWidth: 260,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              {mt("legend", { defaultValue: "Υπόμνημα" })}
            </div>
            <div className="muted" style={{ marginBottom: 8 }}>
              {mapScope === "greece" ? mt("export.count", { defaultValue: "Απόφοιτοι ανά πόλη" }) : metricOptions[mapMetric].legend}
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {renderedLegendEntries.map((entry) => (
                <div
                  key={entry.key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px 1fr",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      width: Math.max(10, Number((entry as any).radius || (mapScope === "greece" ? 10 : 16))),
                      height: Math.max(10, Number((entry as any).radius || (mapScope === "greece" ? 10 : 16))),
                      borderRadius: 999,
                      background: entry.color,
                      opacity: entry.opacity,
                      border: "1px solid rgba(51,65,85,.18)",
                    }}
                  />
                  <span>{entry.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {mapScope === "greece" ? (
        selected ? (
          <div className="card map-combined-details-card">
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              {mt("infoTitle", { defaultValue: "Πληροφορίες" })}
            </div>
            <InfoBox
              title={selected.periphery_name}
              totalText={mt("totalGraduatesLine", {
                total: selected.count,
                defaultValue: "Σύνολο αποφοίτων: {{total}}",
              })}
              groups={detailGroups(selected)}
            />
            <div style={{ fontWeight: 700 }}>
              {mt("citiesTitle", { defaultValue: "Πόλεις" })} ({selectedCityStats.length})
            </div>
            {cityStatsLoading ? (
              <div className="muted">
                {ct("loading", { defaultValue: "Φόρτωση..." })}
              </div>
            ) : selectedCityStats.length ? (
              <div className="map-city-cards-inline">
                {selectedCityStats.map((city) => (
                  <InfoBox
                    key={city.city}
                    title={city.city}
                    totalText={mt("totalGraduatesLine", {
                      total: city.count,
                      defaultValue: "Σύνολο αποφοίτων: {{total}}",
                    })}
                    groups={detailGroups(city)}
                  />
                ))}
              </div>
            ) : (
              <div className="muted">
                {mt("noCities", {
                  defaultValue:
                    "Δεν υπάρχουν διαθέσιμες πόλεις για την τρέχουσα περιφέρεια.",
                })}
              </div>
            )}
          </div>
        ) : items.length ? (
          <div className="card map-combined-details-card">
            <div className="muted">
              {mt("detailsHint", {
                defaultValue: "Κάνε κλικ σε έναν marker πόλης για λεπτομέρειες.",
              })}
            </div>
          </div>
        ) : (
          <div className="card map-combined-details-card">
            <div className="muted">
              {mt("noResults", {
                defaultValue: "Δεν βρέθηκαν απόφοιτοι με τα συγκεκριμένα φίλτρα.",
              })}
            </div>
          </div>
        )
      ) : selectedCityPoint ? (
        <div className="card map-combined-details-card">
          <div style={{ fontWeight: 800, fontSize: 18 }}>
            {mt("infoTitle", { defaultValue: "Πληροφορίες" })}
          </div>
          <InfoBox
            title={selectedCityPoint.city_name}
            totalText={mt("totalGraduatesLine", {
              total: Number(cityDetail?.total ?? selectedCityPoint.count ?? 0),
              defaultValue: "Σύνολο αποφοίτων: {{total}}",
            })}
            groups={detailGroups(cityDetail || selectedCityPoint)}
          />
        </div>
      ) : cityPoints.length ? (
        <div className="card map-combined-details-card">
          <div className="muted">
            {mt("detailsHintAbroad", {
              defaultValue: "Κάνε κλικ σε έναν marker για λεπτομέρειες πόλης του εξωτερικού.",
            })}
          </div>
        </div>
      ) : (
        <div className="card map-combined-details-card">
          <div className="muted">
            {mt("noResults", {
              defaultValue: "Δεν βρέθηκαν απόφοιτοι με τα συγκεκριμένα φίλτρα.",
            })}
          </div>
        </div>
      )}

      {selectedExportFormat ? (
        <MapExportSelectionModal
          mt={mt}
          ct={ct}
          selectedExportFormat={selectedExportFormat}
          exportCategoryOptions={exportCategoryOptions}
          selectedExportCategories={selectedExportCategories}
          exportingSelection={exportingSelection}
          onClose={closeExportSelection}
          onToggleAllCategories={toggleAllExportCategories}
          onToggleCategory={toggleExportCategory}
          onConfirm={() => void handleExportSelection()}
        />
      ) : null}
    </div>
  );
}
