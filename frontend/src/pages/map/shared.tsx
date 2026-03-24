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

export function mapCityLatitude(city: MapCityPoint): number | null {
  const value = Number(city.latitude);
  return Number.isFinite(value) ? value : null;
}

export function mapCityLongitude(city: MapCityPoint): number | null {
  const value = Number(city.longitude);
  return Number.isFinite(value) ? value : null;
}

export function mapCityLabel(city: MapCityPoint): string {
  return city.city_name;
}

export function mapCityKey(city: MapCityPoint): string {
  return `db-${city.city_id}`;
}

export function tryParseGeoJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function excelCellValue(value: unknown) {
  return value === null || value === undefined || value === "" ? "" : value;
}

function Field(props: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div style={{ gridColumn: `span ${props.span ?? 4}`, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <label className="label">{props.label}</label>
      {props.children}
    </div>
  );
}

function FilterSection(props: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "grid", gap: props.title ? 10 : 0 }}>
      {props.title ? <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", letterSpacing: ".01em" }}>{props.title}</div> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>{props.children}</div>
    </section>
  );
}

function RangeField(props: {
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

export function MapFiltersForm(props: {
  filters: MapFiltersState;
  regions: Array<{ id: number; name: string }>;
  studyPrograms: Array<{ id: number; code: string; name_el: string; name_en?: string | null }>;
  availableDirections: Array<{ id: number; code: string; name_el: string; name_en?: string | null }>;
  activeLang: "gr" | "en";
  t: (key: string, options?: Record<string, unknown>) => string;
  loading: boolean;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  onChange: <K extends keyof MapFiltersState>(key: K, value: MapFiltersState[K]) => void;
}) {
  const { filters, regions, studyPrograms, availableDirections, activeLang, t, loading, onClose, onApply, onReset, onChange } = props;

  return (
    <>
      <button className="map-filters-overlay" type="button" aria-label={t("common.close", { defaultValue: "Κλείσιμο" })} onClick={onClose} />
      <div className="card map-filters-modal">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h3 style={{ margin: 0 }}>{t("graduates.filters.toggle", { defaultValue: "Φίλτρα" })}</h3>
          <button className="btn" type="button" onClick={onClose}>
            {t("common.hide", { defaultValue: "Απόκρυψη" })}
          </button>
        </div>

        <div className="map-filters-grid">
          <FilterSection title="">
            <Field label={t("graduates.filters.adCode", { defaultValue: "Α.Δ." })} span={1}>
              <input className="input" value={filters.ad_code_like} onChange={(e) => onChange("ad_code_like", e.target.value)} />
            </Field>
            <Field label={t("graduates.filters.studentNumber", { defaultValue: "Α.Μ." })} span={1}>
              <input className="input" value={filters.student_number_like} onChange={(e) => onChange("student_number_like", e.target.value)} />
            </Field>
            <Field label={t("graduates.filters.lastName", { defaultValue: "Επώνυμο" })} span={1}>
              <input className="input" value={filters.last_name_like} onChange={(e) => onChange("last_name_like", e.target.value)} />
            </Field>
            <Field label={t("graduates.filters.firstName", { defaultValue: "Όνομα" })} span={1}>
              <input className="input" value={filters.first_name_like} onChange={(e) => onChange("first_name_like", e.target.value)} />
            </Field>
            <Field label={t("graduates.filters.fatherName", { defaultValue: "Πατρώνυμο" })} span={1}>
              <input className="input" value={filters.father_name_like} onChange={(e) => onChange("father_name_like", e.target.value)} />
            </Field>
            <Field label={t("graduates.filters.city", { defaultValue: "Πόλη" })} span={1}>
              <input className="input" value={filters.origin_municipality_like} onChange={(e) => onChange("origin_municipality_like", e.target.value)} />
            </Field>
          </FilterSection>

          <FilterSection title="">
            <Field label={t("graduates.filters.gender", { defaultValue: "Φύλο" })} span={1}>
              <select className="input" value={filters.gender} onChange={(e) => onChange("gender", e.target.value)}>
                <option value="">{t("common.all", { defaultValue: "Όλα" })}</option>
                <option value="M">{t("common.male", { defaultValue: "Άνδρας" })}</option>
                <option value="F">{t("common.female", { defaultValue: "Γυναίκα" })}</option>
              </select>
            </Field>
            <RangeField label={t("graduates.filters.birthYear", { defaultValue: "Έτος γέννησης" })} fromLabel={t("graduates.filters.from", { defaultValue: "Από" })} toLabel={t("graduates.filters.to", { defaultValue: "Έως" })} fromValue={filters.birth_year_min} toValue={filters.birth_year_max} onFromChange={(value) => onChange("birth_year_min", value)} onToChange={(value) => onChange("birth_year_max", value)} type="number" span={1} />
            <Field label={t("map.filters.ageGroup", { defaultValue: "Ηλικιακή ομάδα" })} span={1}>
              <select className="input" value={filters.age_group} onChange={(e) => onChange("age_group", e.target.value as AgeGroup)}>
                <option value="">{t("common.all", { defaultValue: "Όλα" })}</option>
                <option value="18-22">18-22</option>
                <option value="23-26">23-26</option>
                <option value="27-30">27-30</option>
                <option value="31+">31+</option>
              </select>
            </Field>
            <Field label={t("graduates.filters.region", { defaultValue: "Περιφέρεια" })} span={1}>
              <select className="input" value={filters.origin_region_id} onChange={(e) => onChange("origin_region_id", e.target.value)}>
                <option value="">{t("common.all", { defaultValue: "Όλα" })}</option>
                {regions.map((region) => (
                  <option key={region.id} value={String(region.id)}>{region.name}</option>
                ))}
              </select>
            </Field>
          </FilterSection>

          <FilterSection title="">
            <RangeField label={t("graduates.filters.entryYear", { defaultValue: "Έτος εισαγωγής" })} fromLabel={t("graduates.filters.from", { defaultValue: "Από" })} toLabel={t("graduates.filters.to", { defaultValue: "Έως" })} fromValue={filters.entry_year_min} toValue={filters.entry_year_max} onFromChange={(value) => onChange("entry_year_min", value)} onToChange={(value) => onChange("entry_year_max", value)} type="number" span={1} />
            <Field label={t("map.filters.year", { defaultValue: "Έτος αποφοίτησης" })} span={1}>
              <input className="input" value={filters.graduation_year} onChange={(e) => onChange("graduation_year", e.target.value)} />
            </Field>
            <RangeField label={t("graduates.filters.degreeGrade", { defaultValue: "Βαθμός πτυχίου" })} fromLabel={t("graduates.filters.from", { defaultValue: "Από" })} toLabel={t("graduates.filters.to", { defaultValue: "Έως" })} fromValue={filters.degree_grade_min} toValue={filters.degree_grade_max} onFromChange={(value) => onChange("degree_grade_min", value)} onToChange={(value) => onChange("degree_grade_max", value)} type="number" step="0.1" span={1} />
            <RangeField label={t("graduates.filters.graduationDate", { defaultValue: "Ημερομηνία αποφοίτησης" })} fromLabel={t("graduates.filters.from", { defaultValue: "Από" })} toLabel={t("graduates.filters.to", { defaultValue: "Έως" })} fromValue={filters.graduation_date_from} toValue={filters.graduation_date_to} onFromChange={(value) => onChange("graduation_date_from", value)} onToChange={(value) => onChange("graduation_date_to", value)} type="date" span={1} />
            <RangeField label={t("graduates.filters.oathDate", { defaultValue: "Ημερομηνία ορκωμοσίας" })} fromLabel={t("graduates.filters.from", { defaultValue: "Από" })} toLabel={t("graduates.filters.to", { defaultValue: "Έως" })} fromValue={filters.oath_date_from} toValue={filters.oath_date_to} onFromChange={(value) => onChange("oath_date_from", value)} onToChange={(value) => onChange("oath_date_to", value)} type="date" span={1} />
            <Field label={t("map.filters.studyProgram", { defaultValue: "Πρόγραμμα Σπουδών" })} span={1}>
              <select className="input" value={filters.study_program_id} onChange={(e) => onChange("study_program_id", e.target.value)}>
                <option value="">{t("common.all", { defaultValue: "Όλα" })}</option>
                {studyPrograms.map((program) => (
                  <option key={program.id} value={String(program.id)}>
                    {activeLang === "en" ? program.name_en || program.name_el || program.code : program.name_el || program.name_en || program.code}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("graduates.filters.direction", { defaultValue: "Κατεύθυνση" })} span={1}>
              <select className="input" value={filters.program_direction_id} onChange={(e) => onChange("program_direction_id", e.target.value)}>
                <option value="">{t("common.all", { defaultValue: "Όλα" })}</option>
                {availableDirections.map((direction) => (
                  <option key={direction.id} value={String(direction.id)}>
                    {activeLang === "en" ? direction.name_en || direction.name_el || direction.code : direction.name_el || direction.name_en || direction.code}
                  </option>
                ))}
              </select>
            </Field>
          </FilterSection>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="btn" type="button" onClick={onReset} disabled={loading}>
            {t("common.reset", { defaultValue: "Reset" })}
          </button>
          <button className="btn primary" type="button" onClick={onApply} disabled={loading}>
            {t("common.apply", { defaultValue: "Εφαρμογή" })}
          </button>
        </div>
      </div>
    </>
  );
}

