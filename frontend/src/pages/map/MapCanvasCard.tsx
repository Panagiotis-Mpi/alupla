import React from "react";
import { GeoJSON, MapContainer, Marker } from "react-leaflet";
import type L from "leaflet";
import type { GraduatesMapItem, MapCityPoint } from "../../lib/api";
import { cityLabelIcon, mapCityKey, mapCityLabel, mapCityLatitude, mapCityLongitude, MapViewportWatcher, normalizeKey } from "./shared";

export function MapCanvasCard(props: {
  mapCanvasRef: React.RefObject<HTMLDivElement>;
  mapRef: React.MutableRefObject<L.Map | null>;
  geojson: unknown;
  geoRenderKey: string;
  itemsRef: React.MutableRefObject<GraduatesMapItem[]>;
  visibleCities: MapCityPoint[];
  buckets: number[];
  t: (key: string, options?: Record<string, unknown>) => string;
  onZoomChange: (zoom: number) => void;
  onBoundsChange: (bounds: L.LatLngBounds) => void;
  setSelected: (value: GraduatesMapItem | null) => void;
  featureGreekName: (feature: any) => string;
  currentCountForFeature: (feature: any) => number;
  renderTooltipHtml: (feature: any) => string;
  fillColorForCount: (count: number) => string;
  fillOpacityForCount: (count: number) => number;
}) {
  const { mapCanvasRef, mapRef, geojson, geoRenderKey, itemsRef, visibleCities, buckets, t, onZoomChange, onBoundsChange, setSelected, featureGreekName, currentCountForFeature, renderTooltipHtml, fillColorForCount, fillOpacityForCount } = props;

  return (
    <div className="card alupla-map-card">
      <div className="alupla-map map-canvas" ref={mapCanvasRef}>
        <MapContainer
          center={[38.6, 24.0]}
          zoom={6.5 as any}
          zoomSnap={0.5}
          whenCreated={(map) => {
            mapRef.current = map;
            onZoomChange(map.getZoom());
            onBoundsChange(map.getBounds());
          }}
          style={{ height: "100%", width: "100%", background: "transparent" }}
          scrollWheelZoom
        >
          <MapViewportWatcher onZoomChange={onZoomChange} onBoundsChange={onBoundsChange} />

          {geojson ? (
            <GeoJSON
              key={geoRenderKey}
              data={geojson as any}
              style={(feature: any) => {
                const count = currentCountForFeature(feature);
                return {
                  color: "#334155",
                  weight: 1,
                  fillColor: fillColorForCount(count),
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
                    const match = itemsRef.current.find((item) => normalizeKey(String(item.periphery_name || "")) === key) || null;
                    setSelected(match);
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
            return (
              <Marker
                key={mapCityKey(city)}
                position={[lat, lng]}
                icon={cityLabelIcon(mapCityLabel(city))}
                interactive={false}
              />
            );
          })}
        </MapContainer>
      </div>

      <div style={{ position: "absolute", left: 12, bottom: 12, background: "rgba(255,255,255,.94)", border: "1px solid var(--border)", borderRadius: 14, padding: "10px 12px", fontSize: 12, boxShadow: "var(--shadow)", maxWidth: 220 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{t("map.legend", { defaultValue: "Υπόμνημα" })}</div>
        <div className="muted" style={{ marginBottom: 8 }}>
          {t("map.legendCounts", { defaultValue: "Αριθμός αποφοίτων" })}
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {Array.from({ length: 5 }).map((_, index) => {
            const from = buckets[index];
            const to = buckets[index + 1];
            const mid = (from + to) / 2;
            const opacity = fillOpacityForCount(mid);
            const color = fillColorForCount(mid);
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
