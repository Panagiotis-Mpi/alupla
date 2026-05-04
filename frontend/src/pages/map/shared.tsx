// Κοινά UI στοιχεία και helpers για τον χάρτη.
import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap, useMapEvents } from "react-leaflet";

export function MapViewportWatcher({
  onZoomChange,
  onBoundsChange,
  onViewChangeStart,
  onViewChangeEnd,
}: {
  onZoomChange: (zoom: number) => void;
  onBoundsChange: (bounds: L.LatLngBounds) => void;
  onViewChangeStart?: () => void;
  onViewChangeEnd?: () => void;
}) {
  const lastZoomRef = useRef<number | null>(null);
  const lastBoundsRef = useRef<L.LatLngBounds | null>(null);

  const emitViewport = (map: L.Map) => {
    const nextZoom = map.getZoom();
    const nextBounds = map.getBounds();

    if (lastZoomRef.current === null || Math.abs(lastZoomRef.current - nextZoom) >= 0.001) {
      lastZoomRef.current = nextZoom;
      onZoomChange(nextZoom);
    }

    if (!lastBoundsRef.current || !lastBoundsRef.current.equals(nextBounds)) {
      lastBoundsRef.current = nextBounds;
      onBoundsChange(nextBounds);
    }
  };

  const map = useMapEvents({
    zoomstart() {
      onViewChangeStart?.();
    },
    movestart() {
      onViewChangeStart?.();
    },
    zoomend() {
      emitViewport(map);
      onViewChangeEnd?.();
    },
    moveend() {
      emitViewport(map);
      onViewChangeEnd?.();
    },
    resize() {
      emitViewport(map);
      onViewChangeEnd?.();
    },
  });

  useEffect(() => {
    emitViewport(map);
    onViewChangeEnd?.();
  }, [map, onZoomChange, onBoundsChange, onViewChangeEnd]);

  return null;
}

export function MapResetControl(props: {
  title: string;
  label: string;
  bounds: L.LatLngBounds;
  padding: [number, number];
  maxZoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const zoomControl = container.querySelector(".leaflet-control-zoom");
    if (!(zoomControl instanceof HTMLElement)) return;

    const button = L.DomUtil.create("a", "alupla-map-reset-button leaflet-control-zoom-reset", zoomControl);
    button.href = "#";
    button.title = props.title;
    button.setAttribute("role", "button");
    button.setAttribute("aria-label", props.title);
    const span = document.createElement("span");
    span.textContent = props.label;
    button.appendChild(span);

    const onClick = (event: Event) => {
      L.DomEvent.stop(event);
      map.fitBounds(props.bounds, {
        padding: props.padding,
        maxZoom: props.maxZoom,
      });
    };

    L.DomEvent.disableClickPropagation(button);
    L.DomEvent.disableScrollPropagation(button);
    L.DomEvent.on(button, "click", onClick);

    return () => {
      L.DomEvent.off(button, "click", onClick);
      button.remove();
    };
  }, [map, props.bounds, props.label, props.maxZoom, props.padding, props.title]);

  return null;
}
