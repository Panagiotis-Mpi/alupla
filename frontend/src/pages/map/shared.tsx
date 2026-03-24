import React, { useEffect } from "react";
import { useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { MapCityPoint } from "../../lib/api";

export type AgeGroup = "" | "18-22" | "23-26" | "27-30" | "31+";

export type MapFiltersState = {
  ad_code_like: string;
  student_number_like: string;
  last_name_like: string;
  first_name_like: string;
  father_name_like: string;
  gender: string;
  entry_year_min: string;
  entry_year_max: string;
  birth_year_min: string;
  birth_year_max: string;
  degree_grade_min: string;
  degree_grade_max: string;
  graduation_year: string;
  graduation_date_from: string;
  graduation_date_to: string;
  oath_date_from: string;
  oath_date_to: string;
  study_program_id: string;
  program_direction_id: string;
  origin_region_id: string;
  origin_municipality_like: string;
  age_group: AgeGroup;
};

export const EMPTY_MAP_FILTERS: MapFiltersState = {
  ad_code_like: "",
  student_number_like: "",
  last_name_like: "",
  first_name_like: "",
  father_name_like: "",
  gender: "",
  entry_year_min: "",
  entry_year_max: "",
  birth_year_min: "",
  birth_year_max: "",
  degree_grade_min: "",
  degree_grade_max: "",
  graduation_year: "",
  graduation_date_from: "",
  graduation_date_to: "",
  oath_date_from: "",
  oath_date_to: "",
  study_program_id: "",
  program_direction_id: "",
  origin_region_id: "",
  origin_municipality_like: "",
  age_group: "",
};

export function cityLabelIcon(label: string) {
  return L.divIcon({
    className: "alupla-city-label-icon",
    html: `<span class="alupla-city-point"><span class="alupla-city-label-text">${label}</span><span class="alupla-city-label-dot"></span></span>`,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  });
}

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
}) {
  return (
    <div style={{ padding: "14px", border: "1px solid var(--border)", borderRadius: 12, background: "rgba(248,250,252,.8)", display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontWeight: 700 }}>{props.title}</div>
        <div className="muted">{props.totalText}</div>
      </div>

      <div className="grid cols2">
        <div>
          <label className="label">{props.totalLabel}</label>
          <div style={{ fontWeight: 700 }}>{props.total}</div>
        </div>
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
        <div>
          <label className="label">{props.avgGradeLabel}</label>
          <div style={{ fontWeight: 700 }}>{props.avgGrade ?? "-"}</div>
        </div>
        <div>
          <label className="label">{props.avgGraduationYearsLabel}</label>
          <div style={{ fontWeight: 700 }}>{props.avgGraduationYears ?? "-"}</div>
        </div>
      </div>
    </div>
  );
}

export function normalizeKey(value: string): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapCityLatitude(city: MapCityPoint): number | null {
  if ("latitude" in city) {
    const value = Number(city.latitude);
    return Number.isFinite(value) ? value : null;
  }
  const value = Number((city as any).lat);
  return Number.isFinite(value) ? value : null;
}

export function mapCityLongitude(city: MapCityPoint): number | null {
  if ("longitude" in city) {
    const value = Number(city.longitude);
    return Number.isFinite(value) ? value : null;
  }
  const value = Number((city as any).lng);
  return Number.isFinite(value) ? value : null;
}

export function mapCityLabel(city: MapCityPoint) {
  return city.city_name;
}

export function mapCityKey(city: MapCityPoint) {
  return `db-${city.city_id}`;
}

export function tryParseGeoJson(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function excelCellValue(value: unknown) {
  return value === null || value === undefined || value === "" ? "" : value;
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
          <input className="input" type={props.type ?? "text"} value={props.fromValue} min={props.min} max={props.max} step={props.step} onChange={(event) => props.onFromChange(event.target.value)} />
        </div>
        <div>
          <label className="label" style={{ fontSize: 12, marginBottom: 6 }}>{props.toLabel}</label>
          <input className="input" type={props.type ?? "text"} value={props.toValue} min={props.min} max={props.max} step={props.step} onChange={(event) => props.onToChange(event.target.value)} />
        </div>
      </div>
    </Field>
  );
}

export function MapViewportWatcher(props: {
  onZoomChange: (zoom: number) => void;
  onBoundsChange: (bounds: L.LatLngBounds) => void;
}) {
  const map = useMapEvents({
    zoomend() {
      props.onZoomChange(map.getZoom());
      props.onBoundsChange(map.getBounds());
    },
    moveend() {
      props.onZoomChange(map.getZoom());
      props.onBoundsChange(map.getBounds());
    },
    resize() {
      props.onZoomChange(map.getZoom());
      props.onBoundsChange(map.getBounds());
    },
  });

  useEffect(() => {
    props.onZoomChange(map.getZoom());
    props.onBoundsChange(map.getBounds());
  }, [map, props.onBoundsChange, props.onZoomChange]);

  return null;
}
