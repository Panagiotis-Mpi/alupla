import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { GeoJSON, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
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
  Tooltip,
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
import greeceRegionsRaw from "../assets/greece-regions.geojson?raw";
import {
  exportCsvText,
  exportElementAsPng,
  exportWorkbook,
} from "./map/mapExport";
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
  Tooltip,
  Legend,
  ArcElement,
);

type MapMetric = "count" | "dominant_gender";
type ExportFormat = "xlsx" | "csv" | "png";
type ExportCategoryKey = MapMetric;

const fillColors = ["#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#2563eb"];

const mapTileUrl = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const mapTileAttribution =
  "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors &copy; <a href=\"https://carto.com/attributions\">CARTO</a>";

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
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);

  const [mapMetric, setMapMetric] = useState<MapMetric>("count");
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
        ...(selectedGraduationYear
          ? { graduation_year: selectedGraduationYear }
          : {}),
      }),
    [selectedGraduationYear],
  );
  const { loading, items, cityPoints, cityStatsLoading, selectedCityStats } =
    useMapData(params, selected?.periphery_id ?? null);

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
      map.fitBounds(geojsonBounds, {
        padding: fitPadding,
        maxZoom: fitMaxZoom,
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
  }, [fitMaxZoom, fitPadding, geojsonBounds]);


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
      city_id: selectedCityPoint.city_id,
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
  }, [selectedCityPoint?.city_id, mapMetric, params]);

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

  const isAllYearsSelected = !selectedGraduationYear;
  const selectedYearLabel = isAllYearsSelected
    ? mt("timeline.allYears", { defaultValue: "Όλες οι χρονιές" })
    : selectedGraduationYear;

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

  const valuesByGreekName = useMemo(() => {
    const next = new Map<string, number>();
    const getter = metricOptions[mapMetric].value;
    items.forEach((item) =>
      next.set(normalizeKey(item.periphery_name || ""), getter(item)),
    );
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
        {
          label: mt("legendLabels.moreMen", {
            defaultValue: "Περισσότεροι άνδρες",
          }),
          color: genderColors.male,
        },
        {
          label: mt("legendLabels.moreWomen", {
            defaultValue: "Περισσότερες γυναίκες",
          }),
          color: genderColors.female,
        },
        {
          label: mt("legendLabels.balance", { defaultValue: "Ισορροπία" }),
          color: genderColors.balanced,
        },
      ].filter((entry) => !isPlaceholderLegendLabel(entry.label));
    }
    return [] as Array<{ label: string; color: string }>;
  }, [items, mapMetric, mt]);

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
        return [
          {
            key,
            label: `${from}–${to}`,
            color: fillColorForCount(mid, maxMetricValue, fillColors),
            opacity: fillOpacityForCount(mid),
          },
        ];
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
    return visibleLegendEntries.filter(
      (entry) => !isPlaceholderLegendLabel(entry.label),
    );
  }, [mapMetric, visibleLegendEntries]);

  const valuesRef = useRef(valuesByGreekName);
  const itemsRef = useRef(items);
  valuesRef.current = valuesByGreekName;
  itemsRef.current = items;

  function featureName(feature: any) {
    const properties = feature?.properties || {};
    return String(
      properties.name_greek ||
        properties.name_el ||
        properties.name ||
        properties.NAME ||
        "",
    );
  }

  function itemForFeature(feature: any) {
    return (
      itemsRef.current.find(
        (item) =>
          normalizeKey(item.periphery_name || "") ===
          normalizeKey(featureName(feature)),
      ) || null
    );
  }

  function styleForFeature(feature: any) {
    const match = itemForFeature(feature);
    if (mapMetric === "dominant_gender") {
      if (!match || !Number(match.count))
        return {
          color: "#334155",
          weight: 1,
          fillColor: genderColors.empty,
          fillOpacity: 0.18,
        };
      if (match.dominant_gender === "M")
        return {
          color: "#334155",
          weight: 1,
          fillColor: genderColors.male,
          fillOpacity: 0.82,
        };
      if (match.dominant_gender === "F")
        return {
          color: "#334155",
          weight: 1,
          fillColor: genderColors.female,
          fillOpacity: 0.82,
        };
      return {
        color: "#334155",
        weight: 1,
        fillColor: genderColors.balanced,
        fillOpacity: 0.82,
      };
    }
    const value =
      valuesRef.current.get(normalizeKey(featureName(feature))) ?? 0;
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
      const dominant =
        !match || !total
          ? mt("legendLabels.noData", { defaultValue: "Χωρίς δεδομένα" })
          : match.dominant_gender === "M"
            ? mt("legendLabels.moreMen", {
                defaultValue: "Περισσότεροι άνδρες",
              })
            : match.dominant_gender === "F"
              ? mt("legendLabels.moreWomen", {
                  defaultValue: "Περισσότερες γυναίκες",
                })
              : mt("legendLabels.balance", { defaultValue: "Ισορροπία" });
      return `<div class="alupla-region-tip-title">${label}</div><div class="alupla-region-tip-sub">${mt("tooltip.dominantGender", { defaultValue: "Κυρίαρχο φύλο" })}: ${dominant}</div><div class="alupla-region-tip-sub">${mt("malePct", { defaultValue: "% Άνδρες" })}: ${compactNumber(match?.male_pct)}%</div><div class="alupla-region-tip-sub">${mt("femalePct", { defaultValue: "% Γυναίκες" })}: ${compactNumber(match?.female_pct)}%</div><div class="alupla-region-tip-sub">${mt("total", { total, defaultValue: "Σύνολο: {{total}}" })}</div>`;
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
      if (entryLayer.getTooltip())
        entryLayer.setTooltipContent(tooltipHtml(feature));
    });
  }, [items, mapMetric, maxMetricValue, i18n.language]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.count) || 0), 0),
    [items],
  );
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
    return weightedCount
      ? Math.round((weightedSum / weightedCount) * 10) / 10
      : null;
  }, [items]);

  const buckets = useMemo(
    () => legendBuckets(maxMetricValue),
    [maxMetricValue],
  );
  const geoRenderKey = useMemo(
    () =>
      `${mapMetric}:${items.map((item) => `${item.periphery_id}:${metricOptions[mapMetric].value(item)}`).join("|")}`,
    [items, mapMetric, metricOptions],
  );

  function exportRows() {
    return buildBaseExportRows(items, mt);
  }

  function currentFilenameBase() {
    const parts = ["alupla_map", slugPart(mapMetric)];
    if (selectedGraduationYear) parts.push(slugPart(selectedGraduationYear));
    if (selected?.periphery_name) parts.push(slugPart(selected.periphery_name));
    return parts.join("_");
  }

  function metricFilenameBase(metric: MapMetric) {
    const parts = ["alupla_map", slugPart(metric)];
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
        .alupla-map .leaflet-control-zoom .alupla-map-reset-button { display: block; text-align: center; text-decoration: none; }
        .alupla-map .leaflet-control-zoom .alupla-map-reset-button:hover { text-decoration: none; }
        .alupla-map .leaflet-control-zoom .alupla-map-reset-button span { font-size: 18px; line-height: 1; font-weight: 800; }
        .alupla-region-tip-title { font-weight: 700; margin-bottom: 4px; }
        .alupla-region-tip-sub { color: #64748b; font-size: 12px; }
        .map-top-menu-card { padding: 20px 16px 16px; display: grid; gap: 14px; }
        .map-top-menu-title { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .map-top-menu-title h2 { margin: 0; }
        .map-metric-group { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; width: 100%; }
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
        metricOptions={metricOptions}
        showExportMenu={showExportMenu}
        onMetricChange={setMapMetric}
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
            {mt("summary.topPeriphery", {
              defaultValue: "Περιφέρεια με τους περισσότερους αποφοίτους",
            })}
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

      <MapYearTimeline
        mt={mt}
        years={availableYears}
        selectedYear={selectedGraduationYear}
        isAllYears={isAllYearsSelected}
        loading={yearRangeLoading}
        onSelectAllYears={() => setSelectedGraduationYear("")}
        onSliderChange={(year) => setSelectedGraduationYear(year)}
      />

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
                if (geojsonBounds)
                  map.fitBounds(geojsonBounds, {
                    padding: fitPadding,
                    maxZoom: fitMaxZoom,
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
              />
              <MapViewportWatcher
                onZoomChange={setMapZoom}
                onBoundsChange={setMapBounds}
              />
              {geojsonBounds ? (
                <MapResetControl
                  title={mt("mapReset", { defaultValue: "Επαναφορά αρχικής προβολής" })}
                  label="↺"
                  bounds={geojsonBounds}
                  padding={fitPadding}
                  maxZoom={fitMaxZoom}
                />
              ) : null}
              {geojson ? (
                <GeoJSON
                  key={geoRenderKey}
                  ref={(layer) => {
                    geoJsonLayerRef.current = layer;
                  }}
                  data={geojson as any}
                  style={(feature: any) => styleForFeature(feature) as any}
                  onEachFeature={(feature: any, layer: any) => {
                    layer.bindTooltip(tooltipHtml(feature), {
                      sticky: true,
                      className: "alupla-region-tooltip",
                    });
                    layer.on({
                      mouseover: () => {
                        layer.setStyle({ weight: 2 });
                        layer.bringToFront();
                        layer.setTooltipContent(tooltipHtml(feature));
                      },
                      mouseout: () => layer.setStyle({ weight: 1 }),
                      click: () => {
                        const hit = items.find(
                          (item) =>
                            normalizeKey(item.periphery_name || "") ===
                            normalizeKey(featureName(feature)),
                        );
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
                          const hit = items.find(
                            (item) => item.periphery_id === city.periphery_id,
                          );
                          if (hit) setSelected(hit);
                        }
                      },
                      popupclose: () => setSelectedCityPoint(null),
                    }}
                  >
                    <Popup minWidth={300} maxWidth={360} autoPan closeButton>
                      {activeCity ? (
                        renderCityPopupContent()
                      ) : (
                        <div style={{ minWidth: 280 }} />
                      )}
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

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
              {metricOptions[mapMetric].legend}
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {renderedLegendEntries.map((entry) => (
                <div
                  key={entry.key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "18px 1fr",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 12,
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

      {selected ? (
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
              defaultValue: "Κάνε κλικ σε μία περιφέρεια για λεπτομέρειες.",
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
