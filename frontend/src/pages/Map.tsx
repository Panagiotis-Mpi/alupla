// Σελίδα χάρτη: φίλτρα, δεδομένα περιοχών, bubbles και exports.
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import JSZip from "jszip";
import { useTranslation } from "react-i18next";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  getMapCityDetail,
  getMapYearRange,
  logPublicExport,
  type MapCityDetailResponse,
} from "../lib/api";
import { useMapData } from "./map/hooks";
import {
  createMapParams,
  mapCityKey,
  mapCityLatitude,
  mapCityLongitude,
} from "./map/utils";
import { genderColors, useCompactMapViewport } from "./map/viewHelpers";
import {
  combinedSnapshotsToBlob,
  renderMapSnapshot,
  waitForMapFrame,
} from "./map/exportSelection";
import { buildExportFilename, yearRangeFilenamePart } from "../lib/exportFilenames";
import { downloadBlob } from "../lib/download";
import {
  localizedCityRecordName,
  localizedCountryRecordName,
  markerDeclutterDistance,
  projectMarkerToViewport,
  sameMapSelection,
  type MapMetric,
  type MapScope,
} from "./map/markers";
import {
  buildAbroadCountryMarkers,
  buildGreekCityMarkers,
  type MapLegendEntry,
} from "./map/markerCollections";
import { MapPageView } from "./map/MapPageView";
import "./map/map.css";

type ExportFormat = "png";
type ExportCategoryKey = MapMetric;
type ExportScopeSelection = { category: ExportCategoryKey; scope: MapScope };
type ExportYearRange = { from: string; to: string };
type ExportCategoryRanges = Record<ExportCategoryKey, ExportYearRange>;

function getInitialMapScope(): MapScope {
  if (typeof window === "undefined") return "greece";
  const scope = new URLSearchParams(window.location.search).get("scope");
  return scope === "abroad" || scope === "world" ? "abroad" : "greece";
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
  const initialMapScope = useMemo(() => getInitialMapScope(), []);

  const mapRef = useRef<L.Map | null>(null);
  const mapCanvasRef = useRef<HTMLDivElement | null>(null);
  const mapScopeRef = useRef<MapScope>(initialMapScope);
  const mapMetricRef = useRef<MapMetric>("count");
  const loadingRef = useRef(false);
  const scopeTransitionLoadingRef = useRef(false);
  const metricTransitionLoadingRef = useRef(false);
  const mapViewSettleTimerRef = useRef<number | null>(null);
  const selectedGraduationYearStartRef = useRef("");
  const selectedGraduationYearEndRef = useRef("");
  const exportInFlightRef = useRef(false);

  const [mapMetric, setMapMetric] = useState<MapMetric>("count");
  const [mapScope, setMapScope] = useState<MapScope>(initialMapScope);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [mobileTimelineOpen, setMobileTimelineOpen] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] =
    useState<ExportFormat | null>(null);
  const [selectedExportSelections, setSelectedExportSelections] = useState<
    ExportScopeSelection[]
  >([]);
  const [exportCategoryRanges, setExportCategoryRanges] =
    useState<ExportCategoryRanges>({
      count: { from: "", to: "" },
      dominant_gender: { from: "", to: "" },
    });
  const [exportingSelection, setExportingSelection] = useState(false);
  const [mapZoom, setMapZoom] = useState(6.5);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [mapViewSettling, setMapViewSettling] = useState(false);
  const [selectedCityCard, setSelectedCityCard] = useState<any | null>(null);
  const [selectedGraduationYearStart, setSelectedGraduationYearStart] =
    useState<string>("");
  const [selectedGraduationYearEnd, setSelectedGraduationYearEnd] =
    useState<string>("");
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [yearRangeLoading, setYearRangeLoading] = useState(false);
  const [initialPageReady, setInitialPageReady] = useState(false);
  const [counterpartWarmupEnabled, setCounterpartWarmupEnabled] =
    useState(false);
  const [scopeTotals, setScopeTotals] = useState<
    Partial<Record<MapScope, number>>
  >({});
  const [scopeTransitionLoading, setScopeTransitionLoading] = useState(false);
  const [metricTransitionLoading, setMetricTransitionLoading] = useState(false);
  const [highContrastEnabled, setHighContrastEnabled] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains(
        "accessibility-high-contrast",
      ),
  );
  const mapLanguage = i18n.resolvedLanguage?.startsWith("en") ? "en" : "gr";
  const isCompactViewport = useCompactMapViewport();
  const fitPadding = isCompactViewport
    ? ([4, 4] as [number, number])
    : ([6, 6] as [number, number]);
  const fitMaxZoom = isCompactViewport ? 6.55 : 6.75;
  const initialZoom = isCompactViewport ? 6.45 : 6.75;
  const minMapZoom = isCompactViewport ? 5.45 : 5.8;

  const params = useMemo(
    () =>
      createMapParams({
        scope: mapScope,
        lang: mapLanguage,
        ...(selectedGraduationYearStart && selectedGraduationYearEnd
          ? selectedGraduationYearStart === selectedGraduationYearEnd
            ? { graduation_year: selectedGraduationYearStart }
            : {
                graduation_date_from: selectedGraduationYearStart + "-01-01",
                graduation_date_to: selectedGraduationYearEnd + "-12-31",
              }
          : {}),
      }),
    [
      mapScope,
      mapLanguage,
      selectedGraduationYearStart,
      selectedGraduationYearEnd,
    ],
  );
  const { loading, items, cityPoints } = useMapData(params);
  const hasActiveMapData = items.length > 0 || cityPoints.length > 0;

  const counterpartScope = mapScope === "greece" ? "abroad" : "greece";
  const counterpartParams = useMemo(
    () =>
      createMapParams({
        scope: counterpartScope,
        lang: mapLanguage,
        ...(selectedGraduationYearStart && selectedGraduationYearEnd
          ? selectedGraduationYearStart === selectedGraduationYearEnd
            ? { graduation_year: selectedGraduationYearStart }
            : {
                graduation_date_from: selectedGraduationYearStart + "-01-01",
                graduation_date_to: selectedGraduationYearEnd + "-12-31",
              }
          : {}),
      }),
    [
      counterpartScope,
      mapLanguage,
      selectedGraduationYearStart,
      selectedGraduationYearEnd,
    ],
  );

  useEffect(() => {
    setCounterpartWarmupEnabled(false);
  }, [counterpartParams]);

  useEffect(() => {
    if (!initialPageReady || loading || !hasActiveMapData) return;
    let cancelled = false;
    let idleId: number | null = null;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const startWarmup = () => {
        if (!cancelled) setCounterpartWarmupEnabled(true);
      };
      const requestIdle = (window as any).requestIdleCallback as
        | ((callback: () => void, options?: { timeout?: number }) => number)
        | undefined;
      if (requestIdle) idleId = requestIdle(startWarmup, { timeout: 1200 });
      else startWarmup();
    }, 700);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (idleId !== null) {
        const cancelIdle = (window as any).cancelIdleCallback as
          | ((id: number) => void)
          | undefined;
        if (cancelIdle) cancelIdle(idleId);
      }
    };
  }, [hasActiveMapData, initialPageReady, loading]);

  const { loading: counterpartLoading, items: counterpartItems } = useMapData(
    counterpartParams,
    { includeCities: false, enabled: counterpartWarmupEnabled },
  );

  const worldBounds = useMemo(
    () => L.latLngBounds(L.latLng(-60, -180), L.latLng(85, 180)),
    [],
  );
  const greeceBounds = useMemo(
    () =>
      isCompactViewport
        ? L.latLngBounds(L.latLng(34.1, 19.2), L.latLng(41.2, 29.5))
        : L.latLngBounds(L.latLng(34.4, 19.8), L.latLng(41.9, 29.9)),
    [isCompactViewport],
  );

  useEffect(() => {
    mapScopeRef.current = mapScope;
  }, [mapScope]);

  useEffect(() => {
    mapMetricRef.current = mapMetric;
  }, [mapMetric]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    selectedGraduationYearStartRef.current = selectedGraduationYearStart;
  }, [selectedGraduationYearStart]);

  useEffect(() => {
    selectedGraduationYearEndRef.current = selectedGraduationYearEnd;
  }, [selectedGraduationYearEnd]);

  useEffect(() => {
    scopeTransitionLoadingRef.current = scopeTransitionLoading;
  }, [scopeTransitionLoading]);

  useEffect(() => {
    metricTransitionLoadingRef.current = metricTransitionLoading;
  }, [metricTransitionLoading]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const sync = () =>
      setHighContrastEnabled(
        root.classList.contains("accessibility-high-contrast"),
      );
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      if (mapViewSettleTimerRef.current !== null) {
        window.clearTimeout(mapViewSettleTimerRef.current);
      }
    },
    [],
  );

  const markMapViewChanging = useCallback(() => {
    if (mapViewSettleTimerRef.current !== null) {
      window.clearTimeout(mapViewSettleTimerRef.current);
      mapViewSettleTimerRef.current = null;
    }
    setMapViewSettling(true);
  }, []);

  const markMapViewReady = useCallback(() => {
    if (mapViewSettleTimerRef.current !== null) {
      window.clearTimeout(mapViewSettleTimerRef.current);
    }
    mapViewSettleTimerRef.current = window.setTimeout(() => {
      setMapViewSettling(false);
      mapViewSettleTimerRef.current = null;
    }, 180);
  }, []);

  const countMarkerRadii = useMemo(
    () =>
      isCompactViewport
        ? [8, 10, 12, 15, 18, 21, 24]
        : [10, 13, 16, 20, 24, 29, 34],
    [isCompactViewport],
  );

  const resetSelectedCityCard = useCallback(() => {
    setSelectedCityCard(null);
  }, []);

  const activeBounds = mapScope === "abroad" ? worldBounds : greeceBounds;
  const activeFitMaxZoom =
    mapScope === "abroad" ? (isCompactViewport ? 1.9 : 2.15) : fitMaxZoom;
  const activeInitialZoom = mapScope === "abroad" ? 2 : initialZoom;
  const activeMinZoom = mapScope === "abroad" ? 1.5 : minMapZoom;

  const greekCityMarkers = useMemo(
    () => buildGreekCityMarkers(cityPoints, mapLanguage, countMarkerRadii, mt),
    [cityPoints, countMarkerRadii, mapLanguage, mt],
  );

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
  }, [activeBounds, activeFitMaxZoom, fitPadding, highContrastEnabled]);

  useEffect(() => {
    resetSelectedCityCard();
  }, [mapScope, resetSelectedCityCard]);



  useEffect(() => {
    let active = true;
    setYearRangeLoading(true);
    getMapYearRange()
      .then((response) => {
        if (!active) return;
        const nextYears = Array.isArray(response?.years)
          ? response.years.filter(
              (year) => Number.isFinite(year) && year > 1900,
            )
          : [];
        setAvailableYears(nextYears);
        if (
          (!selectedGraduationYearStart || !selectedGraduationYearEnd) &&
          nextYears.length
        )
          return;
        if (
          selectedGraduationYearStart &&
          !nextYears.includes(Number(selectedGraduationYearStart))
        ) {
          setSelectedGraduationYearStart("");
          setSelectedGraduationYearEnd("");
          return;
        }
        if (
          selectedGraduationYearEnd &&
          !nextYears.includes(Number(selectedGraduationYearEnd))
        ) {
          setSelectedGraduationYearStart("");
          setSelectedGraduationYearEnd("");
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
    if (initialPageReady) return;
    if (loading && !hasActiveMapData) return;
    const frame = window.requestAnimationFrame(() => setInitialPageReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, [hasActiveMapData, initialPageReady, loading]);

  useEffect(() => {
    if (loading && !hasActiveMapData) return;
    if (!mapRef.current || !activeBounds) return;
    const map = mapRef.current;
    const frame = window.requestAnimationFrame(() => {
      map.invalidateSize();
      setMapZoom(map.getZoom());
      setMapBounds(map.getBounds());
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeBounds, cityPoints, hasActiveMapData, items, loading]);

  useEffect(() => {
    if (!scopeTransitionLoading || loading) return;
    const frame = window.requestAnimationFrame(() =>
      setScopeTransitionLoading(false),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [loading, scopeTransitionLoading]);

  useEffect(() => {
    if (!metricTransitionLoading) return;
    const timer = window.setTimeout(
      () => setMetricTransitionLoading(false),
      220,
    );
    return () => window.clearTimeout(timer);
  }, [mapMetric, metricTransitionLoading]);

  const pageLoading = !initialPageReady;
  const activeDataLoading = loading;
  const inlineMapLoading =
    pageLoading || activeDataLoading || metricTransitionLoading || scopeTransitionLoading;
  const summaryLoading =
    pageLoading || activeDataLoading || metricTransitionLoading || scopeTransitionLoading;
  const timelineLoading =
    pageLoading ||
    yearRangeLoading ||
    activeDataLoading ||
    scopeTransitionLoading;

  const metricOptions = useMemo(
    () => ({
      count: {
        label: mt("metricOptions.count", { defaultValue: "Πλήθος αποφοίτων" }),
      },
      dominant_gender: {
        label: mt("metricOptions.dominantGender", { defaultValue: "Φύλο" }),
      },
    }),
    [mt],
  );

  const exportCategoryOptions = useMemo(
    () =>
      (Object.entries(metricOptions) as Array<
        [ExportCategoryKey, { label: string }]
      >).map(([id, option]) => ({ id, label: option.label })),
    [metricOptions],
  );

  const genderLegendEntries = useMemo(
    () => [
      {
        key: "male",
        label: mt("legendLabels.maleColor", { defaultValue: "Άνδρες" }),
        color: genderColors.male,
        opacity: 0.82,
      },
      {
        key: "female",
        label: mt("legendLabels.femaleColor", { defaultValue: "Γυναίκες" }),
        color: genderColors.female,
        opacity: 0.82,
      },
      {
        key: "balanced",
        label: mt("legendLabels.genderBalance", {
          defaultValue: "Ίση παρουσία ανδρών και γυναικών",
        }),
        color: genderColors.balanced,
        opacity: 0.82,
      },
    ],
    [mt],
  );

  const abroadCountryMarkers = useMemo(
    () => buildAbroadCountryMarkers(cityPoints, mapLanguage, countMarkerRadii, mt),
    [cityPoints, countMarkerRadii, mapLanguage, mt],
  );

  const renderedLegendEntries = useMemo<MapLegendEntry[]>(() => {
    if (mapScope === "greece") {
      return mapMetric === "count"
        ? greekCityMarkers.legend
        : genderLegendEntries;
    }
    return mapMetric === "count"
      ? abroadCountryMarkers.legend
      : genderLegendEntries;
  }, [
    genderLegendEntries,
    abroadCountryMarkers.legend,
    greekCityMarkers.legend,
    mapMetric,
    mapScope,
  ]);

  const legendDescription = useMemo(() => {
    if (mapMetric === "dominant_gender") {
      return mt("legendLabels.genderColors", {
        defaultValue: "Χρώμα που αντιστοιχεί στο φύλο",
      });
    }
    if (mapScope === "abroad") {
      return mt("legendLabels.countByCountry", {
        defaultValue: "Πλήθος αποφοίτων ανά χώρα",
      });
    }
    return mt("legendLabels.countByCity", {
      defaultValue: "Πλήθος αποφοίτων ανά πόλη στην Ελλάδα",
    });
  }, [mapMetric, mapScope, mt]);

  const declutteredMarkerMap = useMemo(() => {
    const source =
      mapScope === "abroad" ? abroadCountryMarkers.items : greekCityMarkers.items;
    if (!source.length || !mapBounds || !mapCanvasRef.current) {
      return new Map(
        source.map((item) => {
          const key = mapCityKey(item as any);
          return [key, { visible: true, showLabel: true }];
        }),
      );
    }

    const width = Math.max(1, mapCanvasRef.current.clientWidth || 0);
    const height = Math.max(1, mapCanvasRef.current.clientHeight || 0);
    const minDistance = markerDeclutterDistance(mapScope, mapZoom);
    const sorted = [...source].sort((left, right) => {
      const leftCount = Math.max(0, Number((left as any).count) || 0);
      const rightCount = Math.max(0, Number((right as any).count) || 0);
      if (rightCount !== leftCount) return rightCount - leftCount;
      return String((left as any).city_name || "").localeCompare(
        String((right as any).city_name || ""),
        "el",
      );
    });

    const placed: Array<{ x: number; y: number; key: string }> = [];
    const result = new Map<string, { visible: boolean; showLabel: boolean }>();

    for (const item of sorted) {
      const key = mapCityKey(item as any);
      const latitude = mapCityLatitude(item as any);
      const longitude = mapCityLongitude(item as any);
      const defaultLabel = true;
      if (latitude === null || longitude === null) {
        result.set(key, { visible: false, showLabel: false });
        continue;
      }
      const projected = projectMarkerToViewport(
        latitude,
        longitude,
        mapBounds,
        width,
        height,
      );
      if (!projected) {
        result.set(key, { visible: true, showLabel: defaultLabel });
        continue;
      }
      const collision = placed.some((entry) => {
        const dx = entry.x - projected.x;
        const dy = entry.y - projected.y;
        return Math.hypot(dx, dy) < minDistance;
      });
      const visible = !collision;
      result.set(key, { visible, showLabel: visible && defaultLabel });
      if (visible) placed.push({ x: projected.x, y: projected.y, key });
    }
    return result;
  }, [
    abroadCountryMarkers.items,
    greekCityMarkers.items,
    mapBounds,
    mapScope,
    mapZoom,
  ]);
  const shouldShowMarkerLabel = useCallback(
    (city: any) =>
      declutteredMarkerMap.get(mapCityKey(city as any))?.showLabel ?? true,
    [declutteredMarkerMap],
  );
  const renderedMarkers = useMemo(() => {
    if (mapScope === "abroad" && (loading || scopeTransitionLoading)) return [];
    const source =
      mapScope === "abroad" ? abroadCountryMarkers.items : greekCityMarkers.items;
    return source.filter(
      (item) =>
        declutteredMarkerMap.get(mapCityKey(item as any))?.visible ?? true,
    );
  }, [
    abroadCountryMarkers,
    declutteredMarkerMap,
    greekCityMarkers.items,
    loading,
    mapScope,
    scopeTransitionLoading,
  ]);
  const topPeriphery = items[0] || null;
  const topAbroadCountry =
    (mapScope === "abroad" ? items : counterpartItems)[0] || null;
  const topAbroadCountryLoading =
    summaryLoading ||
    (mapScope === "greece" && counterpartWarmupEnabled && counterpartLoading);
  const topCity = cityPoints[0] || null;
  const topCityName = topCity
    ? localizedCityRecordName(topCity, mapLanguage)
    : "";
  const total = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.count ?? 0) || 0), 0),
    [items],
  );
  const counterpartTotal = useMemo(
    () =>
      counterpartItems.reduce(
        (sum, item) => sum + (Number(item.count ?? 0) || 0),
        0,
      ),
    [counterpartItems],
  );
  const greeceSummaryTotal = summaryLoading
    ? null
    : mapScope === "greece"
      ? total
      : scopeTotals.greece;
  const abroadSummaryTotal = summaryLoading
    ? null
    : mapScope === "abroad"
      ? total
      : scopeTotals.abroad;
  const overallSummaryTotal =
    typeof greeceSummaryTotal === "number" &&
    typeof abroadSummaryTotal === "number"
      ? greeceSummaryTotal + abroadSummaryTotal
      : null;

  useEffect(() => {
    setScopeTotals({});
  }, [selectedGraduationYearStart, selectedGraduationYearEnd]);

  useEffect(() => {
    if (loading) return;
    setScopeTotals((prev) => ({ ...prev, [mapScope]: total }));
  }, [loading, mapScope, total]);

  useEffect(() => {
    if (!counterpartWarmupEnabled || counterpartLoading) return;
    setScopeTotals((prev) => ({
      ...prev,
      [counterpartScope]: counterpartTotal,
    }));
  }, [
    counterpartLoading,
    counterpartScope,
    counterpartTotal,
    counterpartWarmupEnabled,
  ]);

  async function waitForExportTarget(
    targetScope: MapScope,
    targetMetric: MapMetric,
    targetRange?: ExportYearRange,
  ) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 12000) {
      const scopeReady = mapScopeRef.current === targetScope;
      const metricReady = mapMetricRef.current === targetMetric;
      const rangeReady =
        !targetRange?.from ||
        !targetRange?.to ||
        (selectedGraduationYearStartRef.current === targetRange.from &&
          selectedGraduationYearEndRef.current === targetRange.to);
      const loadingReady =
        !loadingRef.current &&
        !scopeTransitionLoadingRef.current &&
        !metricTransitionLoadingRef.current;
      if (scopeReady && metricReady && rangeReady && loadingReady) {
        await waitForMapFrame(mapRef);
        await new Promise((resolve) => window.setTimeout(resolve, 220));
        await waitForMapFrame(mapRef);
        return;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
    await waitForMapFrame(mapRef);
  }

  const exportYearOptions = useMemo(
    () =>
      Array.from(new Set(availableYears))
        .sort((left, right) => left - right)
        .map((year) => String(year)),
    [availableYears],
  );

  const defaultExportCategoryRanges = useCallback((): ExportCategoryRanges => {
    const first = exportYearOptions[0] ?? "";
    const last = exportYearOptions[exportYearOptions.length - 1] ?? first;
    return {
      count: { from: first, to: last },
      dominant_gender: { from: first, to: last },
    };
  }, [exportYearOptions]);

  useEffect(() => {
    if (!exportYearOptions.length) return;
    setExportCategoryRanges((current) => {
      const defaults = defaultExportCategoryRanges();
      const valid = new Set(exportYearOptions);
      return {
        count: {
          from: valid.has(current.count.from) ? current.count.from : defaults.count.from,
          to: valid.has(current.count.to) ? current.count.to : defaults.count.to,
        },
        dominant_gender: {
          from: valid.has(current.dominant_gender.from) ? current.dominant_gender.from : defaults.dominant_gender.from,
          to: valid.has(current.dominant_gender.to) ? current.dominant_gender.to : defaults.dominant_gender.to,
        },
      };
    });
  }, [defaultExportCategoryRanges, exportYearOptions]);

  function normalizedExportCategoryRange(category: ExportCategoryKey) {
    const range = exportCategoryRanges[category] ?? defaultExportCategoryRanges()[category];
    const from = Number(range.from);
    const to = Number(range.to);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return { from: range.from, to: range.to };
    return { from: String(Math.min(from, to)), to: String(Math.max(from, to)) };
  }

  function changeExportCategoryRange(category: ExportCategoryKey, field: keyof ExportYearRange, value: string) {
    setExportCategoryRanges((current) => ({
      ...current,
      [category]: {
        ...current[category],
        [field]: value,
      },
    }));
  }

  function exportRangeLabel(range: ExportYearRange) {
    if (!range.from || !range.to) {
      return mt("timeline.allYears", { defaultValue: "Όλες οι χρονιές" });
    }
    return range.from === range.to ? range.from : `${range.from} - ${range.to}`;
  }

  function metricFilenameParts(metric: MapMetric, scope = mapScope, range?: ExportYearRange) {
    const metricName = metric === "dominant_gender" ? "gender_geo_distribution" : "graduate_count";
    const scopeName = scope === "abroad" ? "abroad" : "greece";
    const startYear = range?.from ?? selectedGraduationYearStart;
    const endYear = range?.to ?? selectedGraduationYearEnd;
    return [scopeName, metricName, yearRangeFilenamePart(startYear, endYear)];
  }

  function openExportSelection(format: ExportFormat = "png") {
    setSelectedExportSelections([]);
    setExportCategoryRanges(defaultExportCategoryRanges());
    setSelectedExportFormat(format);
  }

  function closeExportSelection() {
    if (exportingSelection) return;
    setSelectedExportFormat(null);
  }

  function toggleExportScopeSelection(
    category: ExportCategoryKey,
    scope: MapScope,
  ) {
    setSelectedExportSelections((prev) => {
      const exists = prev.some(
        (entry) => entry.category === category && entry.scope === scope,
      );
      if (exists)
        return prev.filter(
          (entry) => !(entry.category === category && entry.scope === scope),
        );
      return [...prev, { category, scope }];
    });
  }

  function toggleAllExportSelections() {
    const allSelections = exportCategoryOptions.flatMap((item) => [
      { category: item.id, scope: "greece" as MapScope },
      { category: item.id, scope: "abroad" as MapScope },
    ]);
    setSelectedExportSelections((prev) =>
      prev.length === allSelections.length ? [] : allSelections,
    );
  }

  function toggleExportCategorySelections(category: ExportCategoryKey) {
    setSelectedExportSelections((prev) => {
      const scopes: MapScope[] = ["greece", "abroad"];
      const allSelected = scopes.every((scope) =>
        prev.some(
          (entry) => entry.category === category && entry.scope === scope,
        ),
      );
      if (allSelected)
        return prev.filter((entry) => entry.category !== category);
      const withoutCategory = prev.filter(
        (entry) => entry.category !== category,
      );
      return [
        ...withoutCategory,
        ...scopes.map((scope) => ({ category, scope })),
      ];
    });
  }

  function clearSelectedCityCard(city: any) {
    setSelectedCityCard((current) =>
      current && sameMapSelection(mapScope, current, city) ? null : current,
    );
  }

  async function selectCityCard(city: any) {
    if (selectedCityCard && sameMapSelection(mapScope, selectedCityCard, city)) return;

    const requestParams = {
      ...(city.city_id ? { city_id: city.city_id } : {}),
      ...((city as any).map_group_key
        ? { map_group_key: (city as any).map_group_key }
        : {}),
      ...(mapScope === "greece" && (city.raw_city_name || city.city_name)
        ? { city_name: city.raw_city_name || city.city_name }
        : {}),
      ...(city.country_region_id
        ? { country_region_id: city.country_region_id }
        : {}),
      mode: mapMetric,
      lang: mapLanguage,
      ...params,
    };

    let detail: MapCityDetailResponse | null = null;
    try {
      detail = await getMapCityDetail(requestParams);
    } catch {}

    const localizedSource = { ...city, ...(detail || {}) };
    const mergedCity = {
      ...city,
      ...(detail || {}),
      city_name:
        mapScope === "abroad"
          ? localizedCountryRecordName(localizedSource, mapLanguage)
          : localizedCityRecordName(localizedSource, mapLanguage),
      count: Number(detail?.total ?? city.count ?? 0),
      total: Number(detail?.total ?? city.count ?? 0),
      male_count: detail?.male_count ?? city.male_count ?? 0,
      female_count: detail?.female_count ?? city.female_count ?? 0,
      male_pct: detail?.male_pct ?? city.male_pct ?? null,
      female_pct: detail?.female_pct ?? city.female_pct ?? null,
      map_group_key:
        (detail as any)?.map_group_key ?? (city as any).map_group_key ?? null,
      avg_age: detail?.avg_age ?? city.avg_age ?? null,
      avg_grade: detail?.avg_grade ?? city.avg_grade ?? null,
      avg_graduation_years:
        detail?.avg_graduation_years ?? city.avg_graduation_years ?? null,
    };

    setSelectedCityCard(mergedCity);
  }

  function mapPopupTitle(item: any) {
    return mapScope === "abroad"
      ? localizedCountryRecordName(item, mapLanguage)
      : localizedCityRecordName(item, mapLanguage);
  }

  function mapPopupTotalText(item: any) {
    return mt("totalGraduatesLine", {
      total: Number(item.total ?? item.count ?? 0),
      defaultValue: "Σύνολο αποφοίτων: {{total}}",
    });
  }

  async function exportMapSelectionAsPng() {
    const previousMetric = mapMetric;
    const previousScope = mapScope;
    const previousSelectedCityCard = selectedCityCard;
    const previousStartYear = selectedGraduationYearStartRef.current;
    const previousEndYear = selectedGraduationYearEndRef.current;
    const files: Array<{ filename: string; blob: Blob }> = [];

    setSelectedCityCard(null);
    await waitForMapFrame(mapRef);

    try {
      for (const selection of selectedExportSelections) {
        const range = normalizedExportCategoryRange(selection.category);
        if (range.from && range.to) {
          setSelectedGraduationYearStart(range.from);
          setSelectedGraduationYearEnd(range.to);
        }
        setMapScope(selection.scope);
        setMapMetric(selection.category);
        await waitForExportTarget(selection.scope, selection.category, range);
        if (!mapCanvasRef.current) continue;
        const snapshot = await renderMapSnapshot(mapCanvasRef.current);
        const scopeLabel =
          selection.scope === "greece"
            ? mt("scope.greece", { defaultValue: "Ελλάδα" })
            : mt("scope.abroad", { defaultValue: "Εξωτερικό" });
        const option = exportCategoryOptions.find(
          (item) => item.id === selection.category,
        );
        const selectedRangeLabel = exportRangeLabel(range);
        const filename = buildExportFilename(
          "map",
          metricFilenameParts(selection.category, selection.scope, range),
          "png",
        );
        const blob = await combinedSnapshotsToBlob(
          `${option?.label || selection.category} · ${scopeLabel} · ${selectedRangeLabel}`,
          [{ ...snapshot }],
        );
        if (blob) files.push({ filename, blob });
      }
    } finally {
      setMapScope(previousScope);
      setMapMetric(previousMetric);
      setSelectedGraduationYearStart(previousStartYear);
      setSelectedGraduationYearEnd(previousEndYear);
      setSelectedCityCard(previousSelectedCityCard);
      await waitForMapFrame(mapRef);
    }

    return files;
  }

  async function handleExportSelection() {
    if (!selectedExportSelections.length || exportInFlightRef.current) return;
    const exportedSelections = selectedExportSelections.map(
      (selection) => `${selection.scope}:${selection.category}`,
    );
    exportInFlightRef.current = true;
    setExportingSelection(true);
    try {
      const files = await exportMapSelectionAsPng();
      if (!files.length) return;
      if (files.length === 1) {
        const [file] = files;
        await downloadBlob(file.blob, file.filename);
      } else {
        const zip = new JSZip();
        files.forEach((file) => zip.file(file.filename, file.blob));
        const zipBlob = await zip.generateAsync({ type: "blob", compression: "STORE" });
        const zipFilename = buildExportFilename(
          "map",
          ["png", "exports", files.length, "files"],
          "zip",
        );
        await downloadBlob(zipBlob, zipFilename);
      }
      try {
        await logPublicExport("map_export", "png", {
          map_exports: exportedSelections,
        });
      } catch {}
      setSelectedExportFormat(null);
    } finally {
      exportInFlightRef.current = false;
      setExportingSelection(false);
    }
  }

  return (
    <MapPageView
      {...{
        mt, ct, loading, mapMetric, mapScope, mapLanguage, metricOptions, resetSelectedCityCard,
        setMetricTransitionLoading, setMapMetric, setScopeTransitionLoading, setMapScope, openExportSelection,
        mobileSummaryOpen, setMobileSummaryOpen, mobileTimelineOpen, setMobileTimelineOpen, summaryLoading,
        overallSummaryTotal, greeceSummaryTotal, abroadSummaryTotal, topPeriphery, topCityName, topCity,
        topAbroadCountry, topAbroadCountryLoading, timelineLoading, availableYears, selectedGraduationYearStart,
        selectedGraduationYearEnd, setScopeTotals, setSelectedGraduationYearStart, setSelectedGraduationYearEnd,
        isCompactViewport, worldBounds, activeBounds, activeInitialZoom, activeMinZoom, activeFitMaxZoom, fitPadding,
        mapRef, mapCanvasRef, renderedMarkers, selectedCityCard, highContrastEnabled, inlineMapLoading, mapViewSettling,
        renderedLegendEntries, legendDescription, setMapZoom, setMapBounds, markMapViewChanging, markMapViewReady,
        selectCityCard, clearSelectedCityCard, shouldShowMarkerLabel, mapPopupTitle, mapPopupTotalText,
        selectedExportFormat, exportCategoryOptions, selectedExportSelections, exportingSelection, exportYearOptions,
        exportCategoryRanges, closeExportSelection, toggleAllExportSelections, toggleExportScopeSelection,
        toggleExportCategorySelections, changeExportCategoryRange, handleExportSelection,
      }}
    />
  );
}
