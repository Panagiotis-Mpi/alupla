import React, { useMemo } from "react";
import { GeoJSON, MapContainer, Marker } from "react-leaflet";
import L from "leaflet";
import type { GraduatesMapItem, MapCityPoint } from "../../lib/api";
import { MapViewportWatcher, cityLabelIcon, mapCityKey, mapCityLabel, mapCityLatitude, mapCityLongitude, normalizeKey } from "./shared";

function featureGreekName(feature: any) {
  const props = feature?.properties || {};
  return String(props.name_greek || props.name_el || props.name || props.NAME || "");
}

function featureDisplayName(feature: any, activeLang: "gr" | "en") {
  const props = feature?.properties || {};
  if (activeLang === "en") return String(props.name_en || props.name || props.NAME || props.name_greek || "");
  return featureGreekName(feature);
}

function visibleMapCities(cityPoints: MapCityPoint[], mapBounds: L.LatLngBounds | null, mapZoom: number) {
  const grouped = new globalThis.Map<string, MapCityPoint[]>();

  for (const city of cityPoints) {
    const lat = mapCityLatitude(city);
    const lng = mapCityLongitude(city);
    if (lat === null || lng === null) continue;
    const key = normalizeKey(city.periphery_name);
    const current = grouped.get(key) || [];
    current.push(city);
    grouped.set(key, current);
  }

  const expanded = mapZoom >= 7;
  const visible: MapCityPoint[] = [];

  grouped.forEach((list) => {
    const sorted = [...list].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.city_name.localeCompare(b.city_name, "el");
    });

    if (!expanded) {
      if (sorted[0]) visible.push(sorted[0]);
      return;
    }

    const inBounds = mapBounds
      ? sorted.filter((city) => {
          const lat = mapCityLatitude(city);
          const lng = mapCityLongitude(city);
          return lat !== null && lng !== null && mapBounds.contains(L.latLng(lat, lng));
        })
      : sorted;

    visible.push(...(inBounds.length ? inBounds : sorted).slice(0, 3));
  });

  return visible;
}

function bucketIndexForCount(count: number, maxCount: number) {
  const safeMax = Math.max(1, maxCount || 1);
  const thresholds = [0, Math.ceil(safeMax * 0.2), Math.ceil(safeMax * 0.4), Math.ceil(safeMax * 0.6), Math.ceil(safeMax * 0.8), safeMax];
  for (let index = 0; index < 5; index += 1) {
    const from = thresholds[index];
    const to = thresholds[index + 1];
    if (count >= from && count <= to) return index;
  }
  return 4;
}

function fillColorForCount(count: number, maxCount: number, fillColors: string[]) {
  return fillColors[Math.max(0, Math.min(fillColors.length - 1, bucketIndexForCount(count, maxCount)))];
}

function fillOpacityForCount(count: number) {
  return count <= 0 ? 0.18 : 0.75;
}

export function MapCanvasCard(props: {
  mapCanvasRef: React.RefObject<HTMLDivElement>;
  mapRef: React.MutableRefObject<L.Map | null>;
  geojson: unknown;
  geoRenderKey: string;
  items: GraduatesMapItem[];
  itemsRef: React.MutableRefObject<GraduatesMapItem[]>;
  cityPoints: MapCityPoint[];
  mapBounds: L.LatLngBounds | null;
  mapZoom: number;
  buckets: number[];
  activeLang: "gr" | "en";
  t: (key: string, options?: Record<string, unknown>) => string;
  onZoomChange: (zoom: number) => void;
  onBoundsChange: (bounds: L.LatLngBounds) => void;
  setSelected: (value: GraduatesMapItem | null) => void;
  countsRef: React.MutableRefObject<Map<string, number>>;
  fillColors: string[];
}) {
  const visibleCities = useMemo(() => visibleMapCities(props.cityPoints, props.mapBounds, props.mapZoom), [props.cityPoints, props.mapBounds, props.mapZoom]);
  const maxCount = useMemo(() => {
    let currentMax = 1;
    for (const item of props.items) {
      const count = Number(item.count ?? 0) || 0;
      if (count > currentMax) currentMax = count;
    }
    return currentMax;
  }, [props.items]);

  function currentCountForFeature(feature: any) {
    return props.countsRef.current.get(normalizeKey(featureGreekName(feature))) ?? 0;
  }

  function renderTooltipHtml(feature: any) {
    const label = featureDisplayName(feature, props.activeLang);
    const count = currentCountForFeature(feature);
    const totalLabel = props.t("map.total", { total: count, defaultValue: "Σύνολο: {{total}}" });
    return `<div class="alupla-region-tip-title">${label}</div><div class="alupla-region-tip-sub">${totalLabel}</div>`;
  }

  return (
    <div className="card alupla-map-card">
      <div className="alupla-map map-canvas" ref={props.mapCanvasRef}>
        <MapContainer
          center={[38.6, 24.0]}
          zoom={6.5 as any}
          zoomSnap={0.5}
          whenCreated={(map) => {
            props.mapRef.current = map;
            props.onZoomChange(map.getZoom());
            props.onBoundsChange(map.getBounds());
          }}
          style={{ height: "100%", width: "100%", background: "transparent" }}
          scrollWheelZoom
        >
          <MapViewportWatcher onZoomChange={props.onZoomChange} onBoundsChange={props.onBoundsChange} />

          {props.geojson ? (
            <GeoJSON
              key={props.geoRenderKey}
              data={props.geojson as any}
              style={(feature: any) => {
                const count = currentCountForFeature(feature);
                return {
                  color: "#334155",
                  weight: 1,
                  fillColor: fillColorForCount(count, maxCount, props.fillColors),
                  fillOpacity: fillOpacityForCount(count),
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
                    const match = props.itemsRef.current.find((item) => normalizeKey(String(item.periphery_name || "")) === key) || null;
                    props.setSelected(match);
                    layer.setTooltipContent(renderTooltipHtml(feature));
                  },
                });
              }}
            />
          ) : null}

          {visibleCities.map((city) => {
            const lat = mapCityLatitude(city);
            const lng = mapCityLongitude(city);
            if (lat === null || lng === null) return null;
            return <Marker key={mapCityKey(city)} position={[lat, lng]} icon={cityLabelIcon(mapCityLabel(city))} interactive={false} />;
          })}
        </MapContainer>
      </div>

      <div style={{ position: "absolute", left: 12, bottom: 12, background: "rgba(255,255,255,.94)", border: "1px solid var(--border)", borderRadius: 14, padding: "10px 12px", fontSize: 12, boxShadow: "var(--shadow)", maxWidth: 220 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{props.t("map.legend", { defaultValue: "Υπόμνημα" })}</div>
        <div className="muted" style={{ marginBottom: 8 }}>
          {props.t("map.legendCounts", { defaultValue: "Αριθμός αποφοίτων" })}
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {Array.from({ length: 5 }).map((_, index) => {
            const from = props.buckets[index];
            const to = props.buckets[index + 1];
            const mid = (from + to) / 2;
            const opacity = fillOpacityForCount(mid);
            const color = fillColorForCount(mid, maxCount, props.fillColors);
            return (
              <div key={index} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 16, height: 12, display: "inline-block", border: "1px solid #334155", background: color, opacity, borderRadius: 3 }} />
                <span>{from}–{to}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
