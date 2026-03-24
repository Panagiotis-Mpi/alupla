import React from "react";
import { GeoJSON } from "react-leaflet";
import type { GraduatesMapItem } from "../../lib/api";
import { regionMatches } from "./regionNames";

export function MapRegionLayer(props: {
  geojson: unknown;
  geoRenderKey: string;
  items: GraduatesMapItem[];
  selectedPeripheryId: number | null;
  featureGreekName: (feature: any) => string;
  renderTooltipHtml: (feature: any) => string;
  currentCountForFeature: (feature: any) => number;
  fillColorForCount: (count: number) => string;
  fillOpacityForCount: (count: number) => number;
  onSelect: (item: GraduatesMapItem | null) => void;
}) {
  const { geojson, geoRenderKey, items, selectedPeripheryId, featureGreekName, renderTooltipHtml, currentCountForFeature, fillColorForCount, fillOpacityForCount, onSelect } = props;

  return (
    <GeoJSON
      key={geoRenderKey}
      data={geojson as any}
      style={(feature: any) => {
        const count = currentCountForFeature(feature);
        const selected = items.some((item) => item.periphery_id === selectedPeripheryId && regionMatches(String(item.periphery_name || ""), featureGreekName(feature)));
        return {
          color: selected ? "#0f172a" : "#334155",
          weight: selected ? 2.4 : 1,
          fillColor: fillColorForCount(count),
          fillOpacity: fillOpacityForCount(count),
        } as any;
      }}
      onEachFeature={(feature: any, layer: any) => {
        const syncTooltip = () => {
          layer.setTooltipContent(renderTooltipHtml(feature));
        };

        layer.bindTooltip(renderTooltipHtml(feature), { sticky: true, className: "alupla-region-tooltip" });
        layer.on({
          mouseover: () => {
            const count = currentCountForFeature(feature);
            layer.setStyle({
              weight: 2.4,
              color: "#0f172a",
              fillColor: fillColorForCount(count),
              fillOpacity: fillOpacityForCount(count),
            });
            layer.bringToFront();
            syncTooltip();
          },
          mouseout: () => {
            const count = currentCountForFeature(feature);
            const selected = items.some((item) => item.periphery_id === selectedPeripheryId && regionMatches(String(item.periphery_name || ""), featureGreekName(feature)));
            layer.setStyle({
              weight: selected ? 2.4 : 1,
              color: selected ? "#0f172a" : "#334155",
              fillColor: fillColorForCount(count),
              fillOpacity: fillOpacityForCount(count),
            });
          },
          click: () => {
            const match = items.find((item) => regionMatches(String(item.periphery_name || ""), featureGreekName(feature))) || null;
            onSelect(match);
            syncTooltip();
          },
        });
      }}
    />
  );
}
