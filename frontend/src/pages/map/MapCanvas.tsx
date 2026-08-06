import type { MutableRefObject, RefObject } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import {
  bubbleLabelIcon,
  lightMapTileUrl,
  mapTileAttribution,
  sameMapSelection,
  type MapMetric,
  type MapScope,
} from "./markers";
import { mapCityKey, mapCityLatitude, mapCityLongitude } from "./utils";
import { MapResetControl, MapViewportWatcher } from "./shared";
import { InfoBox } from "./viewHelpers";
import { MapLegend } from "./MapLegend";
import type { MapLegendEntry } from "./markerCollections";

const MapContainerAny = MapContainer as any;
type MapTranslate = (key: string, options?: Record<string, unknown>) => string;

export function MapCanvas({
  mt,
  mapScope,
  mapMetric,
  isCompactViewport,
  worldBounds,
  activeBounds,
  activeInitialZoom,
  activeMinZoom,
  activeFitMaxZoom,
  fitPadding,
  mapRef,
  mapCanvasRef,
  renderedMarkers,
  selectedCityCard,
  highContrastEnabled,
  inlineMapLoading,
  mapViewSettling,
  legendEntries,
  legendDescription,
  onZoomChange,
  onBoundsChange,
  onViewChangeStart,
  onViewChangeEnd,
  onMarkerClick,
  onPopupRemove,
  shouldShowMarkerLabel,
  popupTitle,
  popupTotalText,
  detailGroups,
}: {
  mt: MapTranslate;
  mapScope: MapScope;
  mapMetric: MapMetric;
  isCompactViewport: boolean;
  worldBounds: L.LatLngBounds;
  activeBounds: L.LatLngBounds;
  activeInitialZoom: number;
  activeMinZoom: number;
  activeFitMaxZoom: number;
  fitPadding: [number, number];
  mapRef: MutableRefObject<L.Map | null>;
  mapCanvasRef: RefObject<HTMLDivElement>;
  renderedMarkers: any[];
  selectedCityCard: any | null;
  highContrastEnabled: boolean;
  inlineMapLoading: boolean;
  mapViewSettling: boolean;
  legendEntries: MapLegendEntry[];
  legendDescription: string;
  onZoomChange: (zoom: number) => void;
  onBoundsChange: (bounds: L.LatLngBounds) => void;
  onViewChangeStart: () => void;
  onViewChangeEnd: () => void;
  onMarkerClick: (city: any) => void;
  onPopupRemove: (city: any) => void;
  shouldShowMarkerLabel: (city: any) => boolean;
  popupTitle: (item: any) => string;
  popupTotalText: (item: any) => string;
  detailGroups: (item: any) => Array<{
    title: string;
    rows: Array<{ label: string; value: string }>;
  }>;
}) {
  return (
    <div className="card alupla-map-card map-main-card">
      <div className="map-map-wrap">
        <div className="alupla-map map-canvas" ref={mapCanvasRef}>
          <MapContainerAny
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
            maxBounds={mapScope === "abroad" ? worldBounds.pad(0.05) : undefined}
            maxBoundsViscosity={mapScope === "abroad" ? 1 : undefined}
            worldCopyJump={mapScope === "abroad"}
            whenCreated={(map: L.Map) => {
              mapRef.current = map;
              map.fitBounds(activeBounds, {
                padding: fitPadding,
                maxZoom: activeFitMaxZoom,
                animate: false,
              });
              onZoomChange(map.getZoom());
              onBoundsChange(map.getBounds());
              onViewChangeEnd();
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
              url={lightMapTileUrl}
              crossOrigin="anonymous"
            />
            <MapViewportWatcher
              onZoomChange={onZoomChange}
              onBoundsChange={onBoundsChange}
              onViewChangeStart={onViewChangeStart}
              onViewChangeEnd={onViewChangeEnd}
            />
            <MapResetControl
              title={mt("mapReset", {
                defaultValue: "Επαναφορά αρχικής προβολής",
              })}
              label=""
              bounds={activeBounds}
              padding={fitPadding}
              maxZoom={activeFitMaxZoom}
            />
            {renderedMarkers.map((city) => {
              const latitude = mapCityLatitude(city);
              const longitude = mapCityLongitude(city);
              if (latitude === null || longitude === null) return null;
              const selectedCity =
                selectedCityCard && sameMapSelection(mapScope, selectedCityCard, city)
                  ? selectedCityCard
                  : null;
              const popupItem = selectedCity || city;
              return (
                <Marker
                  key={mapCityKey(city)}
                  position={[latitude, longitude]}
                  icon={bubbleLabelIcon(
                    city,
                    mapMetric,
                    shouldShowMarkerLabel(city),
                    highContrastEnabled,
                  )}
                  eventHandlers={{
                    click: () => onMarkerClick(city),
                  }}
                >
                  <Popup
                    className="alupla-map-info-popup"
                    autoPan
                    minWidth={260}
                    maxWidth={420}
                    eventHandlers={{
                      remove: () => {
                        if (selectedCity) onPopupRemove(selectedCity);
                      },
                    }}
                  >
                    <InfoBox
                      title={popupTitle(popupItem)}
                      totalText={popupTotalText(popupItem)}
                      groups={detailGroups(popupItem)}
                    />
                  </Popup>
                </Marker>
              );
            })}
          </MapContainerAny>
        </div>

        {inlineMapLoading ? (
          <div className="map-loading-overlay">
            <div className="map-loading-overlay-card">
              {mt("loadingLabel", { defaultValue: "Φόρτωση" })}
            </div>
          </div>
        ) : null}

        {!inlineMapLoading && !mapViewSettling && legendEntries.length ? (
          <MapLegend
            mt={mt}
            entries={legendEntries}
            description={legendDescription}
            mapScope={mapScope}
            highContrastEnabled={highContrastEnabled}
          />
        ) : null}
      </div>
    </div>
  );
}
