import React, { useEffect } from "react";
import L from "leaflet";
import { useMapEvents } from "react-leaflet";

export function DetailStatsCard(props: {
  title: string;
  total: number | string;
  avgAge: number | string | null | undefined;
  malePct: number | string | null | undefined;
  femalePct: number | string | null | undefined;
  avgGrade: number | string | null | undefined;
  avgGraduationYears: number | string | null | undefined;
  totalText: string;
  totalLabel: string;
  avgAgeLabel: string;
  malePctLabel: string;
  femalePctLabel: string;
  avgGradeLabel: string;
  avgGraduationYearsLabel: string;
  basicsTitle?: string;
  demographicsTitle?: string;
  academicsTitle?: string;
}) {
  return (
    <div style={{ padding: "14px", border: "1px solid var(--border)", borderRadius: 12, background: "rgba(248,250,252,.8)", display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontWeight: 700 }}>{props.title}</div>
        <div className="muted">{props.totalText}</div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>{props.basicsTitle || "Βασικά στοιχεία"}</div>
          <div className="grid cols2">
            <div>
              <label className="label">{props.totalLabel}</label>
              <div style={{ fontWeight: 700 }}>{props.total}</div>
            </div>
            <div>
              <label className="label">{props.avgGradeLabel}</label>
              <div style={{ fontWeight: 700 }}>{props.avgGrade ?? "-"}</div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>{props.demographicsTitle || "Δημογραφικά"}</div>
          <div className="grid cols2">
            <div>
              <label className="label">{props.avgAgeLabel}</label>
              <div style={{ fontWeight: 700 }}>{props.avgAge ?? "-"}</div>
            </div>
            <div>
              <label className="label">{props.malePctLabel}</label>
              <div style={{ fontWeight: 700 }}>{props.malePct ?? 0}%</div>
            </div>
            <div>
              <label className="label">{props.femalePctLabel}</label>
              <div style={{ fontWeight: 700 }}>{props.femalePct ?? 0}%</div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>{props.academicsTitle || "Ακαδημαϊκά"}</div>
          <div className="grid cols2">
            <div>
              <label className="label">{props.avgGraduationYearsLabel}</label>
              <div style={{ fontWeight: 700 }}>{props.avgGraduationYears ?? "-"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Field(props: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div style={{ gridColumn: `span ${props.span ?? 4}`, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <label className="label">{props.label}</label>
      {props.children}
    </div>
  );
}

export function FilterSection(props: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "grid", gap: props.title ? 10 : 0 }}>
      {props.title ? <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", letterSpacing: ".01em" }}>{props.title}</div> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>{props.children}</div>
    </section>
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
  const map = useMapEvents({
    zoomend() {
      onZoomChange(map.getZoom());
      onBoundsChange(map.getBounds());
    },
    moveend() {
      onZoomChange(map.getZoom());
      onBoundsChange(map.getBounds());
    },
    resize() {
      onZoomChange(map.getZoom());
      onBoundsChange(map.getBounds());
    },
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
    onBoundsChange(map.getBounds());
  }, [map, onZoomChange, onBoundsChange]);

  return null;
}
