// Σελίδα χάρτη: φίλτρα, δεδομένα περιοχών, bubbles και exports.
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
import {
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
  mapCityKey,
  mapCityLatitude,
  mapCityLongitude,
} from "./map/utils";
import { MapResetControl, MapViewportWatcher } from "./map/shared";
import {
  MapTopControls,
  MapYearTimeline,
  MapExportSelectionModal,
} from "./map/controls";
import {
  InfoBox,
  compactNumber,
  detailValue,
  genderColors,
  slugPart,
  useCompactMapViewport,
} from "./map/viewHelpers";
import {
  exportCombinedSnapshots,
  renderMapSnapshot,
  waitForMapFrame,
} from "./map/exportSelection";

import {
  bubbleLabelIcon,
  buildCountMarkerScale,
  countMarkerPalette,
  genderLegendPattern,
  genderMarkerSymbol,
  highContrastMapTileUrl,
  lightMapTileUrl,
  localizedCityRecordName,
  localizedCountryRecordName,
  localizedCountryKey,
  localizedPeripheryRecordName,
  mapTileAttribution,
  markerDeclutterDistance,
  metroGroupForPoint,
  projectMarkerToViewport,
  sameMapSelection,
  shouldCollapseMetroAtZoom,
  type MapMetric,
  type MapScope,
} from "./map/markers";

type ExportFormat = "png";
type ExportCategoryKey = MapMetric;
type ExportScopeSelection = { category: ExportCategoryKey; scope: MapScope };

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

  const mapRef = useRef<L.Map | null>(null);
  const mapCanvasRef = useRef<HTMLDivElement | null>(null);
  const mapScopeRef = useRef<MapScope>("greece");
  const mapMetricRef = useRef<MapMetric>("count");
  const loadingRef = useRef(false);
  const scopeTransitionLoadingRef = useRef(false);
  const metricTransitionLoadingRef = useRef(false);
  const mapViewSettleTimerRef = useRef<number | null>(null);

  const [mapMetric, setMapMetric] = useState<MapMetric>("count");
  const [mapScope, setMapScope] = useState<MapScope>("greece");
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [mobileTimelineOpen, setMobileTimelineOpen] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] =
    useState<ExportFormat | null>(null);
  const [selectedExportSelections, setSelectedExportSelections] = useState<
    ExportScopeSelection[]
  >([]);
  const [exportingSelection, setExportingSelection] = useState(false);
  const [mapZoom, setMapZoom] = useState(6.5);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [mapViewSettling, setMapViewSettling] = useState(false);
  const [selected, setSelected] = useState<GraduatesMapItem | null>(null);
  const [selectedCityCards, setSelectedCityCards] = useState<any[]>([]);
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
        ...EMPTY_FILTERS,
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
        ...EMPTY_FILTERS,
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

  const activeMapTileUrl = highContrastEnabled
    ? highContrastMapTileUrl
    : lightMapTileUrl;
  const countMarkerRadii = useMemo(
    () =>
      isCompactViewport
        ? [8, 10, 12, 15, 18, 21, 24]
        : [10, 13, 16, 20, 24, 29, 34],
    [isCompactViewport],
  );

  const resetComparedSelections = useCallback(() => {
    setSelected(null);
    setSelectedCityCards([]);
  }, []);

  const activeBounds = mapScope === "abroad" ? worldBounds : greeceBounds;
  const activeFitMaxZoom =
    mapScope === "abroad" ? (isCompactViewport ? 1.9 : 2.15) : fitMaxZoom;
  const activeInitialZoom = mapScope === "abroad" ? 2 : initialZoom;
  const activeMinZoom = mapScope === "abroad" ? 1.5 : minMapZoom;

  const greekCityMarkers = useMemo(() => {
    const palette = countMarkerPalette;
    const radii = countMarkerRadii;
    const grouped = new Map<string, any>();

    for (const city of cityPoints) {
      const latitude = mapCityLatitude(city);
      const longitude = mapCityLongitude(city);
      const count = Math.max(0, Number(city.count) || 0);
      if (latitude === null || longitude === null || count <= 0) continue;

      const groupKey = String((city as any).map_group_key || "").trim();
      const key = groupKey
        ? `group:${groupKey}`
        : `city:${mapCityKey(city as any)}`;
      const current = grouped.get(key) || {
        ...city,
        raw_city_name: (city as any).city_name,
        city_name: localizedCityRecordName(city, mapLanguage),
        latitude,
        longitude,
        map_group_key: groupKey || (city as any).map_group_key || null,
        male_count: 0,
        female_count: 0,
        avg_age_weighted_sum: 0,
        avg_age_weight: 0,
        min_age: null,
        max_age: null,
        avg_grade_weighted_sum: 0,
        avg_grade_weight: 0,
        avg_graduation_weighted_sum: 0,
        avg_graduation_weight: 0,
        count: 0,
      };

      current.count += count;
      current.male_count =
        Math.max(0, Number(current.male_count || 0)) +
        Math.max(0, Number((city as any).male_count || 0));
      current.female_count =
        Math.max(0, Number(current.female_count || 0)) +
        Math.max(0, Number((city as any).female_count || 0));

      const avgAge = Number((city as any).avg_age);
      if (Number.isFinite(avgAge)) {
        current.avg_age_weighted_sum =
          Number(current.avg_age_weighted_sum || 0) + avgAge * count;
        current.avg_age_weight = Number(current.avg_age_weight || 0) + count;
      }
      const minAge = Number((city as any).min_age);
      const maxAge = Number((city as any).max_age);
      if (Number.isFinite(minAge)) {
        current.min_age = current.min_age === null ? minAge : Math.min(current.min_age, minAge);
      }
      if (Number.isFinite(maxAge)) {
        current.max_age = current.max_age === null ? maxAge : Math.max(current.max_age, maxAge);
      }
      const avgGrade = Number((city as any).avg_grade);
      if (Number.isFinite(avgGrade)) {
        current.avg_grade_weighted_sum =
          Number(current.avg_grade_weighted_sum || 0) + avgGrade * count;
        current.avg_grade_weight =
          Number(current.avg_grade_weight || 0) + count;
      }
      const avgGraduationYears = Number((city as any).avg_graduation_years);
      if (Number.isFinite(avgGraduationYears)) {
        current.avg_graduation_weighted_sum =
          Number(current.avg_graduation_weighted_sum || 0) +
          avgGraduationYears * count;
        current.avg_graduation_weight =
          Number(current.avg_graduation_weight || 0) + count;
      }

      grouped.set(key, current);
    }

    const points = Array.from(grouped.values()).map((item) => ({
      ...item,
      avg_age:
        Number(item.avg_age_weight || 0) > 0
          ? Number(item.avg_age_weighted_sum || 0) /
            Number(item.avg_age_weight || 1)
          : item.avg_age,
      avg_grade:
        Number(item.avg_grade_weight || 0) > 0
          ? Number(item.avg_grade_weighted_sum || 0) /
            Number(item.avg_grade_weight || 1)
          : item.avg_grade,
      avg_graduation_years:
        Number(item.avg_graduation_weight || 0) > 0
          ? Number(item.avg_graduation_weighted_sum || 0) /
            Number(item.avg_graduation_weight || 1)
          : item.avg_graduation_years,
    }));

    const counts = points.map((item) => Math.max(0, Number(item.count) || 0));
    if (!counts.length)
      return { items: [] as Array<any>, legend: [] as Array<any>, maxCount: 0 };
    const sortedCounts = counts
      .filter((value) => value > 0)
      .sort((left, right) => left - right);
    if (!sortedCounts.length)
      return { items: [] as Array<any>, legend: [] as Array<any>, maxCount: 0 };
    const { breaks, bucketForCount } = buildCountMarkerScale(
      sortedCounts,
      palette,
      radii,
    );

    const legend = breaks.map((limit, index) => {
      const from = index === 0 ? 1 : breaks[index - 1] + 1;
      return {
        key: `city-${index}`,
        label: mt("legendLabels.countRange", {
          from,
          to: limit,
          defaultValue: `${from}–${limit} ${mt("legendLabels.graduatesUnit", { defaultValue: "απόφοιτοι" })}`,
        }),
        color: palette[Math.min(index, palette.length - 1)],
        radius: radii[Math.min(index, radii.length - 1)],
        opacity: 0.8,
      };
    });

    return {
      items: points.map((item) => {
        const bucket = bucketForCount(Math.max(0, Number(item.count) || 0));
        return {
          ...item,
          markerRadius: radii[Math.min(bucket, radii.length - 1)],
          markerFill: palette[Math.min(bucket, palette.length - 1)],
          markerStroke: bucket >= palette.length - 2 ? "#2563eb" : "#3b82f6",
          markerOpacity: bucket >= palette.length - 2 ? 0.92 : 0.8,
        };
      }),
      legend,
      maxCount: sortedCounts[sortedCounts.length - 1],
    };
  }, [cityPoints, countMarkerRadii, mapLanguage, mapZoom, mt]);

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
    !pageLoading &&
    (activeDataLoading || metricTransitionLoading || scopeTransitionLoading);

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

  const abroadCountryMarkers = useMemo(() => {
    const palette = countMarkerPalette;
    const radii = countMarkerRadii;
    const grouped = new Map<string, any>();

    for (const city of cityPoints) {
      const latitude = mapCityLatitude(city as any);
      const longitude = mapCityLongitude(city as any);
      const rawCountryName = String(
        (city as any).country_name || (city as any).periphery_name || "",
      ).trim();
      const localizedName = localizedCountryRecordName(city, mapLanguage);
      const countryId = Number(
        (city as any).country_region_id || (city as any).periphery_id || 0,
      );
      if (!localizedName || latitude === null || longitude === null) continue;
      const key =
        countryId > 0
          ? `country:${countryId}`
          : `country:${localizedCountryKey(rawCountryName)}`;
      const current = grouped.get(key) || {
        city_id: 0,
        city_name: localizedName,
        periphery_id:
          countryId || Number((city as any).periphery_id || 0) || null,
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
      current.female_count += Math.max(
        0,
        Number((city as any).female_count) || 0,
      );
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
      .filter(
        (item) =>
          Number.isFinite(Number(item.latitude)) &&
          Number.isFinite(Number(item.longitude)),
      );

    const counts = points
      .map((item) => Math.max(0, Number(item.count) || 0))
      .filter((value) => value > 0)
      .sort((left, right) => left - right);
    if (!counts.length) return [] as Array<any>;
    const { bucketForCount } = buildCountMarkerScale(counts, palette, radii);

    return points
      .map((item) => {
        const bucket = bucketForCount(Math.max(0, Number(item.count) || 0));
        return {
          ...item,
          markerRadius: radii[Math.min(bucket, radii.length - 1)],
          markerFill: palette[Math.min(bucket, palette.length - 1)],
          markerStroke: bucket >= palette.length - 2 ? "#2563eb" : "#3b82f6",
          markerOpacity: bucket >= palette.length - 2 ? 0.92 : 0.8,
        };
      })
      .sort((left, right) => {
        if ((right.count || 0) !== (left.count || 0))
          return (right.count || 0) - (left.count || 0);
        return String(left.country_name || "").localeCompare(
          String(right.country_name || ""),
          "el",
        );
      });
  }, [cityPoints, countMarkerRadii, mapLanguage]);
  const abroadLegendEntries = useMemo(() => {
    if (mapMetric === "dominant_gender") return genderLegendEntries;
    const counts = abroadCountryMarkers
      .map((item) => Math.max(0, Number(item.count) || 0))
      .filter((value) => value > 0)
      .sort((left, right) => left - right);
    if (!counts.length) return [] as Array<any>;
    const palette = countMarkerPalette;
    const sizes = countMarkerRadii;
    const { breaks } = buildCountMarkerScale(counts, palette, sizes);
    return breaks.map((limit, index) => {
      const from = index === 0 ? 1 : breaks[index - 1] + 1;
      return {
        key: `abroad-${index}`,
        label: mt("legendLabels.countRange", {
          from,
          to: limit,
          defaultValue: `${from}–${limit} ${mt("legendLabels.graduatesUnit", { defaultValue: "απόφοιτοι" })}`,
        }),
        color: palette[Math.min(index, palette.length - 1)],
        radius: sizes[Math.min(index, sizes.length - 1)],
        opacity: 0.8,
      };
    });
  }, [
    abroadCountryMarkers,
    countMarkerRadii,
    genderLegendEntries,
    mapMetric,
    mt,
  ]);

  const renderedLegendEntries = useMemo(() => {
    if (mapScope === "greece") {
      return mapMetric === "count"
        ? greekCityMarkers.legend
        : genderLegendEntries;
    }
    return abroadLegendEntries;
  }, [
    abroadLegendEntries,
    genderLegendEntries,
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
      mapScope === "abroad" ? abroadCountryMarkers : greekCityMarkers.items;
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
    abroadCountryMarkers,
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
      mapScope === "abroad" ? abroadCountryMarkers : greekCityMarkers.items;
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
  const topPeriphery = useMemo(() => items[0] || null, [items]);
  const topAbroadCountry = useMemo(() => {
    const source = mapScope === "abroad" ? items : counterpartItems;
    return source[0] || null;
  }, [counterpartItems, items, mapScope]);
  const topAbroadCountryLoading =
    summaryLoading ||
    (mapScope === "greece" && counterpartWarmupEnabled && counterpartLoading);
  const topCity = useMemo(() => cityPoints[0] || null, [cityPoints]);
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

  const ageRange = useMemo(() => {
    let minAge: number | null = null;
    let maxAge: number | null = null;
    items.forEach((item) => {
      const itemMinAge = Number((item as any).min_age ?? NaN);
      const itemMaxAge = Number((item as any).max_age ?? NaN);
      if (Number.isFinite(itemMinAge)) {
        minAge = minAge === null ? itemMinAge : Math.min(minAge, itemMinAge);
      }
      if (Number.isFinite(itemMaxAge)) {
        maxAge = maxAge === null ? itemMaxAge : Math.max(maxAge, itemMaxAge);
      }
    });
    return { minAge, maxAge };
  }, [items]);

  const comparisonHintText =
    mapScope === "abroad"
      ? mt("detailsHintAbroad", {
          defaultValue:
            "Μπορείτε να επιλέξετε έως 6 χώρες για να τις συγκρίνετε.",
        })
      : mt("detailsHint", {
          defaultValue:
            "Μπορείτε να επιλέξετε έως έξι πόλεις για να τις συγκρίνετε.",
        });

  async function waitForExportTarget(
    targetScope: MapScope,
    targetMetric: MapMetric,
  ) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 12000) {
      const scopeReady = mapScopeRef.current === targetScope;
      const metricReady = mapMetricRef.current === targetMetric;
      const loadingReady =
        !loadingRef.current &&
        !scopeTransitionLoadingRef.current &&
        !metricTransitionLoadingRef.current;
      if (scopeReady && metricReady && loadingReady) {
        await waitForMapFrame(mapRef);
        await new Promise((resolve) => window.setTimeout(resolve, 220));
        await waitForMapFrame(mapRef);
        return;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
    await waitForMapFrame(mapRef);
  }

  function metricFilenameBase(metric: MapMetric, scope = mapScope) {
    const parts = ["alupla_map_export", slugPart(scope), slugPart(metric)];
    if (selectedGraduationYearStart && selectedGraduationYearEnd) {
      parts.push(
        slugPart(
          selectedGraduationYearStart === selectedGraduationYearEnd
            ? selectedGraduationYearStart
            : selectedGraduationYearStart + "-" + selectedGraduationYearEnd,
        ),
      );
    }
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

  function removeSelectedCityCard(city: any) {
    setSelectedCityCards((prev) =>
      prev.filter((entry) => !sameMapSelection(mapScope, entry, city)),
    );
  }

  async function toggleSelectedCityCard(city: any) {
    const alreadySelected = selectedCityCards.some((entry) =>
      sameMapSelection(mapScope, entry, city),
    );
    if (alreadySelected) return;

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

    setSelectedCityCards((prev) => {
      const next = prev.filter(
        (entry) => !sameMapSelection(mapScope, entry, mergedCity),
      );
      next.push(mergedCity);
      return next.slice(-6);
    });
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
    const previousSelected = selected;
    const previousSelectedCityCards = selectedCityCards;

    setSelected(null);
    setSelectedCityCards([]);
    await waitForMapFrame(mapRef);

    try {
      for (const selection of selectedExportSelections) {
        setMapScope(selection.scope);
        setMapMetric(selection.category);
        await waitForExportTarget(selection.scope, selection.category);
        if (!mapCanvasRef.current) continue;
        const snapshot = await renderMapSnapshot(mapCanvasRef.current);
        const scopeLabel =
          selection.scope === "greece"
            ? mt("scope.greece", { defaultValue: "Ελλάδα" })
            : mt("scope.abroad", { defaultValue: "Εξωτερικό" });
        const option = exportCategoryOptions.find(
          (item) => item.id === selection.category,
        );
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

  return (
    <div className="container map-page-container">
      <style>{`
        .leaflet-container path:focus, .leaflet-interactive:focus, .leaflet-container:focus { outline: none !important; }
        .alupla-map .leaflet-container { background: transparent !important; }
        .alupla-map-card { padding: 0; overflow: hidden; position: relative; }
        .alupla-city-label-icon { background: transparent !important; border: 0 !important; }
        .alupla-city-bubble-icon { background: transparent !important; border: 0 !important; }
        .alupla-city-bubble-wrap { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; pointer-events: auto; overflow: visible; }
        .alupla-city-bubble-label, .alupla-city-label-text { text-align: center; color: #0f172a; font-size: 12px; font-weight: 700; line-height: 1.05; white-space: nowrap; text-shadow: 0 1px 2px rgba(255,255,255,.95), 0 0 6px rgba(255,255,255,.9); background: transparent !important; border: 0 !important; padding: 0; }
        .alupla-city-bubble-label { margin: 0 0 4px; }
        .alupla-city-bubble-label.active { font-size: 12px; font-weight: 700; }
        .alupla-city-bubble { position: relative; display: flex; align-items: center; justify-content: center; border-radius: 999px; color: #fff; font-weight: 800; border: 2px solid var(--alupla-bubble-border, rgba(51,65,85,.72)); background: var(--alupla-bubble-background, #60a5fa); opacity: var(--alupla-bubble-opacity, 1); box-shadow: var(--alupla-bubble-shadow, none); }
        .alupla-city-bubble-number { line-height: 1; color: #fff; text-shadow: 0 1px 1px rgba(15,23,42,.35); }
        .alupla-city-bubble-count .alupla-city-bubble-number { color: #0f172a; text-shadow: 0 1px 1px rgba(255,255,255,.45); }
        .alupla-city-bubble-number-gender { color: #0f172a; text-shadow: 0 1px 1px rgba(255,255,255,.5); }
        .alupla-city-gender-lines { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 999px; overflow: hidden; pointer-events: none; }
        .alupla-city-gender-lines line { stroke: #000; stroke-width: 3.2; stroke-linecap: round; vector-effect: non-scaling-stroke; }
        .alupla-city-gender-segment { position: absolute; transform: translate(-50%, -50%); border-radius: 999px; padding: 0; font-weight: 950; line-height: 1; white-space: nowrap; color: #000; text-shadow: 0 0 0 #000, 0 0 1px #000, 0 1px 0 #fff; font-family: Arial, Helvetica, sans-serif; z-index: 2; }
        .alupla-city-gender-segment-male, .alupla-city-gender-segment-female { color: #000; background: transparent; }
        .alupla-city-gender-balance-symbol { color: #000; font-weight: 950; line-height: 1; text-shadow: 0 0 0 #000, 0 0 1px #000, 0 1px 0 #fff; font-family: Arial, Helvetica, sans-serif; }
        .alupla-city-bubble-gender.is-high-contrast { border-color: #000000; background: var(--alupla-bubble-background, #ffd400); box-shadow: inset 0 0 0 1px #000, var(--alupla-bubble-shadow, none); overflow: hidden; }
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
        .map-top-menu-title-spacer { flex: 1; }
        .map-top-controls-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; width: 100%; align-items: stretch; }
        .map-top-control-slot { position: relative; min-width: 0; }
        .map-metric-button, .map-action-button, .map-program-button { width: 100%; min-height: 48px; display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; font-size: 16px; font-weight: 700; line-height: 1.25; letter-spacing: 0; }
        .map-scope-button { gap: 10px; position: relative; padding-inline: 14px 34px; justify-content: center; }
        .map-scope-button-title { flex: 1; min-width: 0; display: block; font-size: 16px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; }
        .map-scope-selected-pill { display: inline-flex; align-items: center; justify-content: center; min-width: 86px; padding: 7px 12px; border-radius: 999px; background: #ffffff; border: 1px solid #bfdbfe; color: #1d4ed8; font-size: 14px; font-weight: 800; line-height: 1; box-shadow: 0 6px 16px rgba(37,99,235,.12); white-space: nowrap; }
        .map-scope-button .map-dropdown-caret { position: absolute; right: 16px; margin-left: 0; }
        .map-program-button { gap: 8px; }
        .map-dropdown-button { justify-content: space-between; padding-inline: 14px; }
        .map-dropdown-caret { width: 7px; height: 7px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(45deg) translateY(-2px); display: inline-block; flex: 0 0 auto; transition: transform .18s ease; }
        .map-dropdown-caret.open { transform: rotate(225deg) translateY(-1px); }
        .map-menu { position: absolute; top: calc(100% + 8px); right: 0; width: 220px; background: #fff; border: 1px solid var(--border); border-radius: 14px; box-shadow: 0 18px 40px rgba(15,23,42,.16); padding: 8px; z-index: 3000; display: grid; gap: 6px; }
        .map-scope-menu { width: 100%; min-width: 100%; }
        .map-menu-item { width: 100%; border: 0; background: transparent; text-align: left; padding: 10px 12px; border-radius: 10px; cursor: pointer; font: inherit; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .map-menu-item:hover { background: #f8fafc; }
        .map-menu-item.active { background: #eff6ff; color: #1d4ed8; font-weight: 700; }
        .map-scope-menu-item { min-height: 42px; border: 1px solid transparent; font-weight: 700; }
        .map-scope-menu-item.active { border-color: #bfdbfe; box-shadow: inset 0 0 0 1px rgba(59,130,246,.08); }
        .map-scope-button > span:first-child { display:block; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .map-timeline-card { margin: 12px auto 0; max-width: 1080px; padding: 16px 18px; display: grid; gap: 14px; }
        .map-timeline-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .map-timeline-title { font-size: 18px; font-weight: 800; color: #0f172a; }
        .map-timeline-subtitle { color: #64748b; font-size: 13px; margin-top: 4px; }
        .map-timeline-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .map-timeline-current { min-height: 44px; padding: 0 16px; border-radius: 14px; border: 1px solid var(--border); background: rgba(248,250,252,.9); display: inline-flex; align-items: center; font-weight: 800; color: #0f172a; }
        .map-timeline-slider-wrap { display: grid; gap: 16px; padding-top: 4px; }
        .map-year-ruler { position: relative; height: 46px; margin: 0 10px; }
        .map-year-ruler-track, .map-year-ruler-fill { position: absolute; left: 0; right: 0; top: 22px; height: 8px; border-radius: 999px; }
        .map-year-ruler-track { background: repeating-linear-gradient(to right, #cbd5e1 0 1px, transparent 1px calc(100% / 12)), linear-gradient(#dbeafe, #dbeafe); box-shadow: inset 0 0 0 1px rgba(59,130,246,.16); }
        .map-year-ruler-fill { left: var(--range-left); right: var(--range-right); background: var(--primary); box-shadow: 0 8px 18px rgba(59,130,246,.22); }
        .map-timeline-slider { position: absolute; left: 0; right: 0; top: 8px; width: 100%; height: 34px; margin: 0; appearance: none; background: transparent; pointer-events: none; }
        .map-timeline-slider::-webkit-slider-thumb { appearance: none; width: 28px; height: 28px; border-radius: 999px; background: #ffffff; border: 7px solid var(--primary); box-shadow: 0 8px 18px rgba(15,23,42,.18); cursor: grab; pointer-events: auto; }
        .map-timeline-slider::-moz-range-thumb { width: 16px; height: 16px; border-radius: 999px; background: #ffffff; border: 7px solid var(--primary); box-shadow: 0 8px 18px rgba(15,23,42,.18); cursor: grab; pointer-events: auto; }
        .map-timeline-slider:disabled::-webkit-slider-thumb, .map-timeline-slider:disabled::-moz-range-thumb { cursor: default; opacity: .65; }
        .map-timeline-slider-start { z-index: 3; }
        .map-timeline-slider-end { z-index: 4; }
        .map-timeline-scale { position: relative; height: 28px; margin: 0 10px; color: #64748b; font-size: 13px; font-weight: 800; }
        .map-timeline-scale span { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; }
        .map-timeline-scale span:first-child { transform: translateX(0); }
        .map-timeline-scale span:last-child { transform: translateX(-100%); }
        .map-summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 12px 0 0; }
        .map-summary-value.is-loading, .map-summary-sub.is-loading, .map-summary-scope-list.is-loading { filter: blur(3px); opacity: .72; pointer-events: none; user-select: none; transition: filter .18s ease, opacity .18s ease; }
        .map-summary-card { min-height: 118px; padding: 16px; display: grid; align-content: space-between; gap: 8px; overflow: hidden; }
        .map-summary-label { color: #475569; font-size: clamp(14px, 1.5vw, 17px); line-height: 1.28; font-weight: 500; overflow-wrap: anywhere; }
        .map-summary-value { font-size: clamp(21px, 2.4vw, 28px); font-weight: 800; line-height: 1.12; color: #0f172a; overflow-wrap: anywhere; }
        .map-summary-sub { color: #64748b; font-size: clamp(12px, 1.2vw, 13px); line-height: 1.32; font-weight: 500; overflow-wrap: anywhere; }
        .map-summary-scope-list { display: grid; gap: 8px; }
        .map-summary-total-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 10px; color: #0f172a; line-height: 1.2; min-width: 0; }
        .map-summary-total-name { font-size: clamp(12px, 1.2vw, 13px); font-weight: 500; min-width: 0; overflow-wrap: anywhere; }
        .map-summary-total-number { font-size: clamp(21px, 2.4vw, 28px); font-weight: 800; line-height: 1.12; color: #0f172a; white-space: nowrap; }
        .map-summary-scope-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 10px; color: #64748b; line-height: 1.2; min-width: 0; }
        .map-summary-scope-name { font-size: clamp(12px, 1.2vw, 13px); font-weight: 500; min-width: 0; overflow-wrap: anywhere; }
        .map-summary-scope-number { font-size: clamp(21px, 2.4vw, 28px); font-weight: 800; line-height: 1.12; color: #0f172a; white-space: nowrap; }
        .map-summary-scope-row.active { color: #0f172a; }
        .map-summary-scope-row.active .map-summary-scope-name { font-size: clamp(12px, 1.2vw, 13px); font-weight: 500; }
        .map-summary-scope-row.active .map-summary-scope-number { font-size: clamp(21px, 2.4vw, 28px); font-weight: 800; color: #0f172a; }
        .map-page-container .map-main-card { margin: 12px auto 0; position: relative; left: auto; transform: none; max-width: 1120px; width: min(1120px, calc(100% - 32px)); border-left: 1px solid var(--border); border-right: 1px solid var(--border); border-radius: var(--radius); }
        .map-info-box { position: relative; }
        .map-info-box-close { position: absolute; top: 10px; right: 10px; width: 28px; height: 28px; border: 1px solid rgba(148,163,184,.35); background: #fff; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; cursor: pointer; color: #334155; }
        .map-map-wrap { position: relative; padding: 8px 8px 12px; overflow: hidden; border-radius: 0; }
        .map-custom-legend { position: absolute; left: 20px; bottom: 24px; z-index: 900; background: rgba(255,255,255,.94); border: 1px solid var(--border); border-radius: 14px; padding: 12px 14px; font-size: 12px; box-shadow: var(--shadow); max-width: 300px; pointer-events: none; transform: translateZ(0); backface-visibility: hidden; }
        .map-loading-overlay { position: absolute; inset: 8px 8px 12px; border-radius: 18px; background: rgba(255,255,255,.08); backdrop-filter: blur(2px); display: grid; place-items: center; z-index: 950; pointer-events: none; }
        .map-loading-overlay-card { min-width: 180px; min-height: 88px; padding: 16px 20px; border-radius: 18px; border: 0; background: transparent; box-shadow: none; display: grid; place-items: center; font-size: 18px; font-weight: 800; color: #0f172a; text-align: center; }
        .map-summary-shell, .map-timeline-shell { position: relative; }
        .map-main-card .map-canvas { height: clamp(760px, 80vh, 940px); min-height: 760px; }
        .map-trend-card, .map-combined-details-card { margin-top: 12px; padding: 16px; display: grid; gap: 12px; }
        .map-trend-canvas { height: 260px; min-height: 260px; width: 100%; }
        .map-trend-scroll { overflow: hidden; min-height: 260px; }
        .map-info-box { border: 1px solid var(--border); border-radius: 16px; background: rgba(248,250,252,.82); padding: 16px 18px; display: grid; gap: 14px; }
        .alupla-map-info-popup .leaflet-popup-content-wrapper { border-radius: 18px; padding: 0; box-shadow: 0 18px 40px rgba(15,23,42,.18); }
        .alupla-map-info-popup .leaflet-popup-content { margin: 0; min-width: 260px; max-width: min(420px, calc(100vw - 48px)); }
        .alupla-map-info-popup .leaflet-popup-close-button { top: 8px; right: 8px; width: 28px; height: 28px; border: 1px solid rgba(148,163,184,.35); background: #fff; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; color: #334155; font-size: 18px; line-height: 26px; z-index: 2; }
        .alupla-map-info-popup .map-info-box { border: 0; border-radius: 18px; background: rgba(248,250,252,.96); box-shadow: none; min-width: 260px; }
        .alupla-map-info-popup .map-info-groups { grid-template-columns: 1fr; }
        .map-info-box-header, .map-info-group, .map-info-metrics, .map-info-metric { display: grid; gap: 6px; }
        .map-info-box-title { font-size: 18px; font-weight: 800; color: #0f172a; }
        .map-info-total-line, .map-info-metric-label { color: #64748b; font-size: 13px; }
        .map-info-groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px; }
        .map-info-group-title, .map-info-metric-value { color: #0f172a; font-weight: 800; }
        .map-city-cards-inline { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; align-items: stretch; }
        .map-filter-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        @media (max-width: 1100px) { .map-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .map-city-cards-inline { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 780px) { .map-top-controls-row { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; } .map-top-menu-card { padding: 16px; gap: 12px; } .map-top-menu-title { gap: 10px; } .map-metric-button, .map-action-button, .map-program-button { min-height: 46px; font-size: 15px; } }
        @media (max-width: 640px) { .map-summary-grid, .map-city-cards-inline { grid-template-columns: 1fr; } .map-summary-grid { gap: 10px; } .map-summary-card { min-height: 88px; padding: 12px; gap: 6px; } .map-summary-label { font-size: 14px; line-height: 1.25; } .map-summary-value { font-size: 22px; line-height: 1.12; } .map-summary-sub { font-size: 12px; line-height: 1.28; } .map-summary-scope-list { gap: 6px; } .map-summary-total-name, .map-summary-scope-name { font-size: 12px; line-height: 1.22; } .map-summary-total-number, .map-summary-scope-number { font-size: 22px; } .map-summary-scope-row.active .map-summary-scope-name { font-size: 12px; } .map-summary-scope-row.active .map-summary-scope-number { font-size: 22px; } .map-timeline-actions { width: 100%; } .map-timeline-current { width: 100%; justify-content: center; } }
        @media (max-width: 520px) { .map-scope-button { gap: 6px; padding-inline: 10px 30px; } .map-timeline-card { gap: 18px; } .map-timeline-scale { margin: 0 18px; font-size: 12px; height: 24px; } .map-year-ruler { margin: 0 18px; } .map-timeline-slider::-webkit-slider-thumb { width: 30px; height: 30px; border-width: 7px; } .map-timeline-slider::-moz-range-thumb { width: 16px; height: 16px; border-width: 7px; } }
      `}</style>

      <MapTopControls
        summaryToggle={
          <button
            type="button"
            className="btn mobile-summary-toggle"
            onClick={() => setMobileSummaryOpen((open) => !open)}
          >
            {mobileSummaryOpen
              ? mt("summary.hide", {
                  defaultValue:
                    mapLanguage === "en" ? "Hide summary" : "Απόκρυψη",
                })
              : mt("summary.show", {
                  defaultValue:
                    mapLanguage === "en"
                      ? "Brief info"
                      : "Σύντομες πληροφορίες",
                })}
          </button>
        }
        timelineToggle={
          <button
            type="button"
            className="btn mobile-summary-toggle"
            onClick={() => setMobileTimelineOpen((open) => !open)}
          >
            {mobileTimelineOpen
              ? mt("timeline.hide", {
                  defaultValue:
                    mapLanguage === "en" ? "Hide period" : "Απόκρυψη",
                })
              : mt("timeline.show", {
                  defaultValue:
                    mapLanguage === "en" ? "Time period" : "Χρονικό διάστημα",
                })}
          </button>
        }
        mt={mt}
        ct={ct}
        loading={loading}
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

      <div
        className={`map-summary-shell mobile-summary-panel${mobileSummaryOpen ? " open" : ""}`}
      >
        <div className="map-summary-grid">
          <div className="card map-summary-card">
            <div
              className={`map-summary-scope-list${summaryLoading ? " is-loading" : ""}`}
            >
              <div className="map-summary-total-row">
                <span className="map-summary-total-name">
                  {mt("summary.total", { defaultValue: "Σύνολο αποφοίτων" })}
                </span>
                <span className="map-summary-total-number">
                  {summaryLoading ? "…" : overallSummaryTotal ?? "…"}
                </span>
              </div>
              <div
                className={`map-summary-scope-row${mapScope === "greece" ? " active" : ""}`}
              >
                <span className="map-summary-scope-name">
                  {mt("summary.fromGreece", {
                    defaultValue: "Απόφοιτοι από Ελλάδα",
                  })}
                </span>
                <span className="map-summary-scope-number">
                  {summaryLoading ? "…" : greeceSummaryTotal ?? "…"}
                </span>
              </div>
              <div
                className={`map-summary-scope-row${mapScope === "abroad" ? " active" : ""}`}
              >
                <span className="map-summary-scope-name">
                  {mt("summary.fromAbroad", {
                    defaultValue: "Απόφοιτοι από εξωτερικό",
                  })}
                </span>
                <span className="map-summary-scope-number">
                  {summaryLoading ? "…" : abroadSummaryTotal ?? "…"}
                </span>
              </div>
            </div>
          </div>
          <div className="card map-summary-card">
            <div className="map-summary-label">
              {mapScope === "abroad"
                ? mt("summary.topCountry", {
                    defaultValue: "Χώρα με τους περισσότερους αποφοίτους",
                  })
                : mt("summary.topPeriphery", {
                    defaultValue: "Περιφέρεια με τους περισσότερους αποφοίτους",
                  })}
            </div>
            <div
              className={`map-summary-value${summaryLoading ? " is-loading" : ""}`}
            >
              {summaryLoading
                ? "…"
                : topPeriphery
                  ? mapScope === "abroad"
                    ? localizedCountryRecordName(topPeriphery, mapLanguage)
                    : localizedPeripheryRecordName(topPeriphery, mapLanguage)
                  : "-"}
            </div>
            <div
              className={`map-summary-sub${summaryLoading ? " is-loading" : ""}`}
            >
              {summaryLoading
                ? "…"
                : topPeriphery
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
            <div
              className={`map-summary-value${summaryLoading ? " is-loading" : ""}`}
            >
              {summaryLoading ? "…" : topCityName || "-"}
            </div>
            <div
              className={`map-summary-sub${summaryLoading ? " is-loading" : ""}`}
            >
              {summaryLoading
                ? "…"
                : topCity
                  ? `${topCity.count} ${mt("export.count", { defaultValue: "Απόφοιτοι" })}`
                  : "-"}
            </div>
          </div>
          <div className="card map-summary-card">
            <div className="map-summary-label">
              {mt("summary.topAbroadCountry", {
                defaultValue: "Χώρα εκτός Ελλάδας με τους περισσότερους αποφοίτους",
              })}
            </div>
            <div
              className={`map-summary-value${topAbroadCountryLoading ? " is-loading" : ""}`}
            >
              {topAbroadCountryLoading
                ? "…"
                : topAbroadCountry
                  ? localizedCountryRecordName(topAbroadCountry, mapLanguage)
                  : "-"}
            </div>
            <div
              className={`map-summary-sub${topAbroadCountryLoading ? " is-loading" : ""}`}
            >
              {topAbroadCountryLoading
                ? "…"
                : topAbroadCountry
                  ? `${topAbroadCountry.count} ${mt("export.count", { defaultValue: "Απόφοιτοι" })}`
                  : "-"}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`map-timeline-shell mobile-timeline-panel${mobileTimelineOpen ? " open" : ""}`}
      >
        <MapYearTimeline
          mt={mt}
          years={availableYears}
          selectedStartYear={selectedGraduationYearStart}
          selectedEndYear={selectedGraduationYearEnd}
          loading={yearRangeLoading}
          onRangeChange={(startYear, endYear) => {
            resetComparedSelections();
            setScopeTotals({});
            setSelectedGraduationYearStart(startYear);
            setSelectedGraduationYearEnd(endYear);
          }}
        />
      </div>

      <div className="card alupla-map-card map-main-card">
        <div className="map-map-wrap">
          <div className="alupla-map map-canvas" ref={mapCanvasRef}>
            <MapContainer
              key={`map-${mapScope}`}
              center={
                mapScope === "abroad"
                  ? [20, 0]
                  : isCompactViewport
                    ? [37.9, 23.6]
                    : [38.6, 24.0]
              }
              zoom={activeInitialZoom as any}
              minZoom={activeMinZoom as any}
              zoomSnap={0.25}
              maxBounds={
                mapScope === "abroad" ? worldBounds.pad(0.05) : undefined
              }
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
                markMapViewReady();
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
                url={activeMapTileUrl}
                crossOrigin="anonymous"
              />
              <MapViewportWatcher
                onZoomChange={setMapZoom}
                onBoundsChange={setMapBounds}
                onViewChangeStart={markMapViewChanging}
                onViewChangeEnd={markMapViewReady}
              />
              {activeBounds ? (
                <MapResetControl
                  title={mt("mapReset", {
                    defaultValue: "Επαναφορά αρχικής προβολής",
                  })}
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
                const selectedCity = selectedCityCards.find((selectedCard) =>
                  sameMapSelection(mapScope, selectedCard, city),
                );
                const activeCity = false;
                const popupItem = selectedCity || city;
                return (
                  <Marker
                    key={mapCityKey(city)}
                    position={[latitude, longitude]}
                    icon={bubbleLabelIcon(
                      city,
                      mapMetric,
                      activeCity,
                      shouldShowMarkerLabel(city),
                      mt,
                      highContrastEnabled,
                    )}
                    eventHandlers={{
                      click: () => {
                        void toggleSelectedCityCard(city);
                        if (city.periphery_id) {
                          const hit = items.find(
                            (item) => item.periphery_id === city.periphery_id,
                          );
                          if (hit) setSelected(hit);
                        }
                      },
                    }}
                  >
                    <Popup
                      className="alupla-map-info-popup"
                      autoPan
                      minWidth={260}
                      maxWidth={420}
                      eventHandlers={{
                        remove: () => {
                          if (selectedCity)
                            removeSelectedCityCard(selectedCity);
                        },
                      }}
                    >
                      <InfoBox
                        title={mapPopupTitle(popupItem)}
                        totalText={mapPopupTotalText(popupItem)}
                        groups={detailGroups(popupItem)}
                      />
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {inlineMapLoading ? (
            <div className="map-loading-overlay">
              <div className="map-loading-overlay-card">
                {mt("loadingLabel", { defaultValue: "Φόρτωση" })}
              </div>
            </div>
          ) : null}

          {!inlineMapLoading &&
          !mapViewSettling &&
          renderedLegendEntries.length ? (
            <div className="map-custom-legend">
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                {mt("legend", { defaultValue: "Υπόμνημα" })}
              </div>
              <div className="muted" style={{ marginBottom: 8 }}>
                {legendDescription}
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {renderedLegendEntries.map((entry) => {
                  const isGenderLegendItem =
                    entry.key === "male" ||
                    entry.key === "female" ||
                    entry.key === "balanced";
                  const isCountLegendItem = !isGenderLegendItem;
                  const swatchSize = Math.max(
                    12,
                    Number(
                      (entry as any).radius ||
                        (isGenderLegendItem
                          ? 16
                          : mapScope === "greece"
                            ? 10
                            : 16),
                    ),
                  );
                  return (
                    <div
                      key={entry.key}
                      style={{
                        display: "grid",
                        gridTemplateColumns: isGenderLegendItem
                          ? "30px 1fr"
                          : `${Math.max(64, swatchSize + 18)}px 1fr`,
                        alignItems: "center",
                        gap: isGenderLegendItem ? 8 : 10,
                      }}
                    >
                      <span
                        className={`map-legend-swatch ${isCountLegendItem && highContrastEnabled ? "map-legend-swatch-count-high-contrast" : genderLegendPattern(entry.key, highContrastEnabled)}`}
                        style={{
                          width: swatchSize,
                          height: swatchSize,
                          borderRadius: 999,
                          background:
                            isCountLegendItem && highContrastEnabled
                              ? "#ffd400"
                              : highContrastEnabled
                                ? "#ffd400"
                                : entry.color,
                          opacity:
                            isCountLegendItem && highContrastEnabled
                              ? 1
                              : highContrastEnabled
                                ? 1
                                : entry.opacity,
                          border:
                            isCountLegendItem && highContrastEnabled
                              ? "2px solid #000"
                              : highContrastEnabled
                                ? "2px solid #000"
                                : "1px solid rgba(51,65,85,.18)",
                          justifySelf: "center",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isGenderLegendItem && highContrastEnabled ? (
                          <span className="map-legend-swatch-symbol">
                            {entry.key === "male"
                              ? "♂"
                              : entry.key === "female"
                                ? "♀"
                                : "≈"}
                          </span>
                        ) : null}
                      </span>
                      <span>{entry.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
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
          onToggleCategorySelections={toggleExportCategorySelections}
          onConfirm={() => void handleExportSelection()}
        />
      ) : null}
    </div>
  );
}
