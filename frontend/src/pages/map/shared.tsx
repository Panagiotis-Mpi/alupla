import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapEvents } from "react-leaflet";

export function Field(props: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div style={{ gridColumn: `span ${props.span ?? 4}`, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <label className="label">{props.label}</label>
      {props.children}
    </div>
  );
}

export function RangeField(props: {
  label: string;
  fromLabel: string;
  toLabel: string;
  fromValue: string;
  toValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  type?: string;
  min?: string;
  max?: string;
  step?: string;
  span?: number;
}) {
  return (
    <Field label={props.label} span={props.span}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label className="label" style={{ fontSize: 12, marginBottom: 6 }}>{props.fromLabel}</label>
          <input className="input" type={props.type ?? "text"} value={props.fromValue} min={props.min} max={props.max} step={props.step} onChange={(e) => props.onFromChange(e.target.value)} />
        </div>
        <div>
          <label className="label" style={{ fontSize: 12, marginBottom: 6 }}>{props.toLabel}</label>
          <input className="input" type={props.type ?? "text"} value={props.toValue} min={props.min} max={props.max} step={props.step} onChange={(e) => props.onToChange(e.target.value)} />
        </div>
      </div>
    </Field>
  );
}

export function MapViewportWatcher({
  onZoomChange,
  onBoundsChange,
}: {
  onZoomChange: (zoom: number) => void;
  onBoundsChange: (bounds: L.LatLngBounds) => void;
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
    zoomend() {
      emitViewport(map);
    },
    moveend() {
      emitViewport(map);
    },
    resize() {
      emitViewport(map);
    },
  });

  useEffect(() => {
    emitViewport(map);
  }, [map, onZoomChange, onBoundsChange]);

  return null;
}
