import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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
  exportCombinedSnapshots,
  renderMapSnapshot,
  waitForMapFrame,
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
type ExportFormat = "png";
type ExportCategoryKey = MapMetric;
type ExportScopeSelection = { category: ExportCategoryKey; scope: MapScope };

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

function sameMapSelection(scope: MapScope, left: any, right: any) {
  if (!left || !right) return false;
  if (scope === "abroad") {
    const leftCountryId = Number(left.country_region_id || left.periphery_id || 0);
    const rightCountryId = Number(right.country_region_id || right.periphery_id || 0);
    if (leftCountryId && rightCountryId) return leftCountryId === rightCountryId;
    return localizedCountryKey(left.country_name || left.periphery_name || left.city_name || "") === localizedCountryKey(right.country_name || right.periphery_name || right.city_name || "");
  }
  return normalizeKey(left.city_name || "") === normalizeKey(right.city_name || "") && Number(left.country_region_id || left.periphery_id || 0) === Number(right.country_region_id || right.periphery_id || 0);
}


function bubbleLabelIcon(
  city: any,
  mapMetric: MapMetric,
  active: boolean,
  showLabel: boolean,
  mt: (key: string, options?: Record<string, unknown>) => string,
) {
  const baseRadius = Math.max(10, Number(city?.markerRadius || 10));
  const radius = active ? Math.round(baseRadius * 1.12) : baseRadius;
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
  const fontSize = active ? (size >= 34 ? 13 : size >= 28 ? 12 : 11) : (size >= 34 ? 12 : size >= 28 ? 11 : 10);
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
    html: `<div class="alupla-city-bubble-wrap" style="width:${wrapperWidth}px;height:${wrapperHeight}px;">${showLabel ? `<div class="alupla-city-bubble-label${active ? " active" : ""}" style="width:${labelWidth}px;">${label}</div>` : ""}${bubbleHtml}${summary}</div>`,
    iconSize: [wrapperWidth, wrapperHeight],
    iconAnchor: [wrapperWidth / 2, labelHeight + size / 2],
    popupAnchor: [0, -(size / 2 + 16)],
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
  const [selectedExportFormat, setSelectedExportFormat] =
    useState<ExportFormat | null>(null);
  const [selectedExportSelections, setSelectedExportSelections] = useState<ExportScopeSelection[]>([]);
  const [exportingSelection, setExportingSelection] = useState(false);
  const [mapZoom, setMapZoom] = useState(6.5);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [selected, setSelected] = useState<GraduatesMapItem | null>(null);
  const [selectedCityCards, setSelectedCityCards] = useState<any[]>([]);
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
  const { loading, items, cityPoints } =
    useMapData(params, selected?.periphery_id ?? null);

  const worldBounds = useMemo(() => L.latLngBounds(L.latLng(-60, -180), L.latLng(85, 180)), []);
  const greeceBounds = useMemo(() => L.latLngBounds(L.latLng(34.4, 19.8), L.latLng(41.9, 29.9)), []);

  const resetComparedSelections = useCallback(() => {
    setSelected(null);
    setSelectedCityCards([]);
  }, []);

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
    resetComparedSelections();
  }, [mapScope, resetComparedSelections]);

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
  const pageLoading = !initialPageReady;
  const inlineMapLoading = (!pageLoading && loading) || metricTransitionLoading || scopeTransitionLoading;
  const summaryLoading = !pageLoading && scopeTransitionLoading;

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
      if (!selectedCityCards.length) return false;
      return selectedCityCards.some((selectedCard) => sameMapSelection(mapScope, selectedCard, item));
    });
  }, [abroadCountryMarkers, greekCityMarkers.items, mapScope, selectedCityCards, shouldShowMarkerLabel]);
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


  function metricFilenameBase(metric: MapMetric, scope = mapScope) {
    const parts = ["alupla_map", slugPart(scope), slugPart(metric)];
    if (selectedGraduationYear) parts.push(slugPart(selectedGraduationYear));
    return parts.join("_");
  }

  function openExportSelection(format: ExportFormat = "png") {
    setSelectedExportSelections([]);
    setSelectedExportFormat(format);
  }

  function closeExportSelection() {
    if (exportingSelection) return;
    setSelectedExportFormat(null);
  }

  function toggleExportScopeSelection(category: ExportCategoryKey, scope: MapScope) {
    setSelectedExportSelections((prev) => {
      const exists = prev.some((entry) => entry.category === category && entry.scope === scope);
      if (exists) return prev.filter((entry) => !(entry.category === category && entry.scope === scope));
      return [...prev, { category, scope }];
    });
  }

  function toggleAllExportSelections() {
    const allSelections = exportCategoryOptions.flatMap((item) => ([
      { category: item.id, scope: "greece" as MapScope },
      { category: item.id, scope: "abroad" as MapScope },
    ]));
    setSelectedExportSelections((prev) => prev.length === allSelections.length ? [] : allSelections);
  }

  function removeSelectedCityCard(city: any) {
    setSelectedCityCards((prev) => prev.filter((entry) => !sameMapSelection(mapScope, entry, city)));
  }

  async function toggleSelectedCityCard(city: any) {
    const alreadySelected = selectedCityCards.some((entry) => sameMapSelection(mapScope, entry, city));
    if (alreadySelected) {
      removeSelectedCityCard(city);
      return;
    }

    const requestParams = {
      ...(city.city_id ? { city_id: city.city_id } : {}),
      ...(mapScope === "greece" && city.city_name ? { city_name: city.city_name } : {}),
      ...(city.country_region_id ? { country_region_id: city.country_region_id } : {}),
      mode: mapMetric,
      ...params,
    };

    let detail: MapCityDetailResponse | null = null;
    try {
      detail = await getMapCityDetail(requestParams);
    } catch {}

    const mergedCity = {
      ...city,
      ...(detail || {}),
      city_name: String(detail?.city_name || city.city_name || ""),
      count: Number(detail?.total ?? city.count ?? 0),
      total: Number(detail?.total ?? city.count ?? 0),
      male_count: detail?.male_count ?? city.male_count ?? 0,
      female_count: detail?.female_count ?? city.female_count ?? 0,
      male_pct: detail?.male_pct ?? city.male_pct ?? null,
      female_pct: detail?.female_pct ?? city.female_pct ?? null,
      avg_age: detail?.avg_age ?? city.avg_age ?? null,
      avg_grade: detail?.avg_grade ?? city.avg_grade ?? null,
      avg_graduation_years: detail?.avg_graduation_years ?? city.avg_graduation_years ?? null,
    };

    setSelectedCityCards((prev) => {
      const next = prev.filter((entry) => !sameMapSelection(mapScope, entry, mergedCity));
      next.push(mergedCity);
      return next.slice(-6);
    });
  }

  async function exportMapSelectionAsPng() {
    const previousMetric = mapMetric;
    const previousScope = mapScope;
    const previousSelected = selected;
    const previousSelectedCityCards = selectedCityCards;

    setSelected(null);
    setSelectedCityCards([]);
    await waitForMapFrame(mapRef);

    try {
      for (const selection of selectedExportSelections) {
        setMapScope(selection.scope);
        setMapMetric(selection.category);
        await waitForMapFrame(mapRef);
        if (!mapCanvasRef.current) continue;
        const snapshot = await renderMapSnapshot(mapCanvasRef.current);
        const scopeLabel = selection.scope === "greece"
          ? mt("scope.greece", { defaultValue: "Ελλάδα" })
          : mt("scope.abroad", { defaultValue: "Εξωτερικό" });
        const option = exportCategoryOptions.find((item) => item.id === selection.category);
        await exportCombinedSnapshots(
          `${metricFilenameBase(selection.category, selection.scope)}.png`,
          `${option?.label || selection.category} · ${scopeLabel}`,
          [{ ...snapshot, caption: scopeLabel }],
        );
      }
    } finally {
      setMapScope(previousScope);
      setMapMetric(previousMetric);
      setSelected(previousSelected);
      setSelectedCityCards(previousSelectedCityCards);
      await waitForMapFrame(mapRef);
    }
  }

  async function handleExportSelection() {
    if (!selectedExportSelections.length) return;
    setExportingSelection(true);
    try {
      await exportMapSelectionAsPng();
      try {
        await logPublicExport("map_export", "png");
      } catch {}
      setSelectedExportFormat(null);
    } finally {
      setExportingSelection(false);
    }
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


  if (pageLoading) {
    return <div className="card">{mt("loadingLabel", { defaultValue: "φορτώση" })}</div>;
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
        .alupla-city-bubble-label.active { font-size: 13px; font-weight: 800; }
        .alupla-city-bubble { position: relative; display: flex; align-items: center; justify-content: center; border-radius: 999px; color: #fff; font-weight: 800; }
        .alupla-city-bubble-number { line-height: 1; color: #fff; text-shadow: 0 1px 1px rgba(15,23,42,.35); }
        .alupla-city-bubble-count .alupla-city-bubble-number { color: #0f172a; text-shadow: 0 1px 1px rgba(255,255,255,.45); }
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
        .map-top-controls-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; width: 100%; align-items: stretch; }
        .map-top-control-slot { position: relative; min-width: 0; }
        .map-metric-button, .map-action-button, .map-program-button { width: 100%; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; }
        .map-metric-button.active, .map-program-button.active { background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 700; }
        .map-scope-button { background: #fff; border-color: var(--border); color: #0f172a; font-weight: 700; }
        .map-scope-button:hover { background: #f8fafc; }
        .map-program-button { gap: 8px; }
        .map-dropdown-button { justify-content: space-between; padding-inline: 14px; }
        .map-dropdown-caret { font-size: 13px; transition: transform .18s ease; }
        .map-dropdown-caret.open { transform: rotate(180deg); }
        .map-menu { position: absolute; top: calc(100% + 8px); right: 0; width: 220px; background: #fff; border: 1px solid var(--border); border-radius: 14px; box-shadow: 0 18px 40px rgba(15,23,42,.16); padding: 8px; z-index: 3000; display: grid; gap: 6px; }
        .map-scope-menu { width: 100%; min-width: 100%; }
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
        .map-compare-hint { margin: 12px auto 0; max-width: 1080px; padding: 12px 16px; font-size: 14px; color: #475569; }
        .map-info-box { position: relative; }
        .map-info-box-close { position: absolute; top: 10px; right: 10px; width: 28px; height: 28px; border: 1px solid rgba(148,163,184,.35); background: #fff; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; cursor: pointer; color: #334155; }
        .map-map-wrap { position: relative; padding: 8px 8px 12px; }
        .map-loading-overlay { position: absolute; inset: 8px 8px 12px; border-radius: 18px; background: rgba(255,255,255,.08); backdrop-filter: blur(2px); display: grid; place-items: center; z-index: 450; pointer-events: none; }
        .map-loading-overlay-card { min-width: 180px; min-height: 88px; padding: 16px 20px; border-radius: 18px; border: 0; background: transparent; box-shadow: none; display: grid; place-items: center; font-size: 18px; font-weight: 800; color: #0f172a; text-align: center; }
        .map-summary-shell, .map-timeline-shell, .map-details-shell { position: relative; }
        .map-summary-overlay, .map-details-overlay { inset: 0; border-radius: 18px; }
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
        .map-city-cards-inline { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; align-items: stretch; }
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
        @media (max-width: 1100px) { .map-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .map-city-cards-inline { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 780px) { .map-top-controls-row { grid-template-columns: 1fr; } }
        @media (max-width: 640px) { .map-summary-grid, .map-city-cards-inline { grid-template-columns: 1fr; } .map-timeline-actions { width: 100%; } .map-timeline-current, .map-timeline-all-button { width: 100%; justify-content: center; } }
      `}</style>

      <MapTopControls
        mt={mt}
        ct={ct}
        loading={loading}
        total={total}
        mapMetric={mapMetric}
        mapScope={mapScope}
        metricOptions={metricOptions}
        onMetricChange={(metric) => {
          if (metric === mapMetric) return;
          resetComparedSelections();
          setMetricTransitionLoading(true);
          setMapMetric(metric);
        }}
        onScopeChange={(scope) => {
          if (scope === mapScope) return;
          resetComparedSelections();
          setScopeTransitionLoading(true);
          setMapScope(scope);
        }}
        onExportClick={() => openExportSelection("png")}
      />

      <div className="map-summary-shell">
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
        {summaryLoading ? (
          <div className="map-loading-overlay map-summary-overlay">
            <div className="map-loading-overlay-card">{mt("loadingLabel", { defaultValue: "φορτώση" })}</div>
          </div>
        ) : null}
      </div>

      <div className="map-timeline-shell">
        <MapYearTimeline
          mt={mt}
          years={availableYears}
          selectedYear={selectedGraduationYear}
          isAllYears={isAllYearsSelected}
          loading={yearRangeLoading}
          onSelectAllYears={() => {
            resetComparedSelections();
            setSelectedGraduationYear("");
          }}
          onSliderChange={(year) => {
            resetComparedSelections();
            setSelectedGraduationYear(year);
          }}
        />
      </div>

      <div className="card map-compare-hint">
        {mt("compareHint", { defaultValue: "Μπορείς να επιλέξεις έως 6 πόλεις για σύγκριση." })}
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
                const activeCity = selectedCityCards.some((selectedCard) => sameMapSelection(mapScope, selectedCard, city));
                return (
                    <Marker
                      key={mapCityKey(city)}
                      position={[latitude, longitude]}
                      icon={bubbleLabelIcon(city, mapMetric, activeCity, shouldShowMarkerLabel(city), mt)}
                      eventHandlers={{
                        click: () => {
                          void toggleSelectedCityCard(city);
                          if (city.periphery_id) {
                            const hit = items.find((item) => item.periphery_id === city.periphery_id);
                            if (hit) setSelected(hit);
                          }
                        },
                      }}
                    />
                  );
              })}
            </MapContainer>
          </div>

          {inlineMapLoading ? (
            <div className="map-loading-overlay">
              <div className="map-loading-overlay-card">{mt("loadingLabel", { defaultValue: "φορτώση" })}</div>
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

      <div className="map-details-shell">
        {selectedCityCards.length ? (
          <div className="card map-combined-details-card">
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              {mt("infoTitle", { defaultValue: "Πληροφορίες" })}
            </div>
            <div className="map-city-cards-inline">
              {selectedCityCards.map((city) => (
                <InfoBox
                  key={mapCityKey(city)}
                  title={city.city_name}
                  totalText={mt("totalGraduatesLine", {
                    total: Number(city.total ?? city.count ?? 0),
                    defaultValue: "Σύνολο αποφοίτων: {{total}}",
                  })}
                  groups={detailGroups(city)}
                  onRemove={() => removeSelectedCityCard(city)}
                  removeLabel={mt("removeSelection", { defaultValue: "Αφαίρεση επιλογής" })}
                />
              ))}
            </div>
          </div>
        ) : items.length || cityPoints.length ? (
          <div className="card map-combined-details-card">
            <div className="muted">
              {mapScope === "abroad"
                ? mt("detailsHintAbroad", {
                    defaultValue: "Επίλεξε έως 6 χώρες για σύγκριση.",
                  })
                : mt("detailsHint", {
                    defaultValue: "Επίλεξε έως 6 πόλεις για σύγκριση.",
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
        {summaryLoading ? (
          <div className="map-loading-overlay map-details-overlay">
            <div className="map-loading-overlay-card">{mt("loadingLabel", { defaultValue: "φορτώση" })}</div>
          </div>
        ) : null}
      </div>

      {selectedExportFormat ? (
        <MapExportSelectionModal
          mt={mt}
          ct={ct}
          selectedExportFormat={selectedExportFormat}
          exportCategoryOptions={exportCategoryOptions}
          selectedExportSelections={selectedExportSelections}
          exportingSelection={exportingSelection}
          onClose={closeExportSelection}
          onToggleAllSelections={toggleAllExportSelections}
          onToggleScopeSelection={toggleExportScopeSelection}
          onConfirm={() => void handleExportSelection()}
        />
      ) : null}
    </div>
  );
}
