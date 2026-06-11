// Κοινά helpers, labels και UI logic για τη σελίδα αποφοίτων.
import React from "react";
import type { Graduate, StudyProgram } from "../../lib/api";
import Icon from "../../components/Icon";
import listFilterIcon from "../../assets/icons/list-filter.svg";
import historyIcon from "../../assets/icons/history.svg";

export type SortDir = "asc" | "desc";
export type SortKey =
  | "ad_code"
  | "student_number"
  | "last_name"
  | "first_name"
  | "father_name"
  | "gender"
  | "entry_year"
  | "birth_date"
  | "degree_grade"
  | "graduation_date"
  | "oath_date"
  | "study_program"
  | "origin_country"
  | "origin_region"
  | "origin_nomos"
  | "origin_municipality";

export type GraduatesFiltersState = {
  ad_code_like: string;
  student_number_like: string;
  last_name_like: string;
  first_name_like: string;
  father_name_like: string;
  gender: string;
  entry_year_min: string;
  entry_year_max: string;
  birth_date_from: string;
  birth_date_to: string;
  degree_grade_min: string;
  degree_grade_max: string;
  graduation_date_from: string;
  graduation_date_to: string;
  oath_date_from: string;
  oath_date_to: string;
  study_program_id: string;
  origin_region_id: string;
  origin_nomos_region_id: string;
  origin_municipality_like: string;
  origin_country_like: string;
  origin_foreign_city_like: string;
};

export const EMPTY_GRADUATES_FILTERS: GraduatesFiltersState = {
  ad_code_like: "",
  student_number_like: "",
  last_name_like: "",
  first_name_like: "",
  father_name_like: "",
  gender: "",
  entry_year_min: "",
  entry_year_max: "",
  birth_date_from: "",
  birth_date_to: "",
  degree_grade_min: "",
  degree_grade_max: "",
  graduation_date_from: "",
  graduation_date_to: "",
  oath_date_from: "",
  oath_date_to: "",
  study_program_id: "",
  origin_region_id: "",
  origin_nomos_region_id: "",
  origin_municipality_like: "",
  origin_country_like: "",
  origin_foreign_city_like: "",
};

function Field(props: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div style={{ gridColumn: `span ${props.span ?? 4}`, display: "flex", flexDirection: "column", gap: 8, minHeight: 104 }}>
      <label className="label">{props.label}</label>
      {props.children}
    </div>
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
      <div className="range-field-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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

export function buildGraduatesParams(filters: GraduatesFiltersState) {
  const params: Record<string, string | number> = {};
  Object.entries(filters).forEach(([key, value]) => {
    const trimmed = typeof value === "string" ? value.trim() : value;
    if (trimmed === undefined || trimmed === null || trimmed === "") {
      return;
    }
    params[key] = trimmed;
  });
  return params;
}

export function formatDateValue(value: unknown) {
  const raw = value === null || value === undefined ? "" : String(value).trim();
  if (!raw) return "";

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return `${iso[3]}/${iso[2]}/${iso[1]}`;
  }

  const dayFirst = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dayFirst) {
    const day = String(dayFirst[1]).padStart(2, "0");
    const month = String(dayFirst[2]).padStart(2, "0");
    let year = dayFirst[3];
    if (year.length === 2) {
      year = Number(year) >= 50 ? `19${year}` : `20${year}`;
    }
    return `${day}/${month}/${year}`;
  }

  return raw;
}

export function formatValue(value: unknown, mode: "default" | "date" = "default") {
  if (mode === "date") {
    return formatDateValue(value);
  }
  return value === null || value === undefined ? "" : String(value);
}

export function normalizeValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).toLocaleLowerCase("el-GR");
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

export function createNameMap(items: Array<Record<string, unknown>>, activeLang: "gr" | "en") {
  const map = new Map<number, string>();
  for (const item of items || []) {
    const name = activeLang === "en"
      ? firstText(item.name_en, item.name_el, item.code, item.id)
      : firstText(item.name_el, item.name_en, item.code, item.id);
    map.set(Number(item.id), name);
  }
  return map;
}

function normalizeDisplayText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function createRegionMap(items: Array<Record<string, unknown>>, activeLang: "gr" | "en" = "gr") {
  const map = new Map<number, string>();
  for (const item of items || []) {
    const name = activeLang === "en"
      ? firstText(item.name_en, item.name_el, item.name, item.id)
      : firstText(item.name_el, item.name, item.name_en, item.id);
    map.set(Number(item.id), name);
  }
  return map;
}


export function getGraduateOriginRegionDisplay(graduate: Graduate, regionNameById: Map<number, string>, activeLang: "gr" | "en" = "gr") {
  if (String(graduate.origin_foreign_city ?? "").trim() && String(graduate.origin_country ?? "").trim() && !isGreeceDisplayValue(String(graduate.origin_country ?? ""))) {
    return "";
  }
  if (activeLang === "en") {
    const localized = String((graduate as any).origin_region_name_en ?? "").trim();
    if (localized) return localized;
  }
  return regionNameById.get(Number(graduate.origin_periphery_region_id ?? graduate.origin_region_id)) ?? "";
}

function isGreeceDisplayValue(value: string) {
  const normalized = normalizeDisplayText(value);
  return normalized === normalizeDisplayText("Ελλάδα") || normalized === normalizeDisplayText("Greece");
}

export function getGraduateOriginCountryDisplay(graduate: Graduate, regionNameById: Map<number, string>, t?: (key: string, options?: Record<string, unknown>) => string, activeLang: "gr" | "en" = "gr") {
  const greeceLabel = t ? t("filters.originTypeGreece") : activeLang === "en" ? "Greece" : "Ελλάδα";
  if (activeLang === "en") {
    const localized = String((graduate as any).origin_country_name_en ?? "").trim();
    if (localized) return isGreeceDisplayValue(localized) ? greeceLabel : localized;
    const countryName = regionNameById.get(Number(graduate.origin_country_region_id)) ?? "";
    if (countryName) return isGreeceDisplayValue(countryName) ? greeceLabel : countryName;
  }
  const explicitCountry = String(graduate.origin_country ?? "").trim();
  if (explicitCountry) {
    if (isGreeceDisplayValue(explicitCountry)) {
      return greeceLabel;
    }
    return explicitCountry;
  }
  const countryName = regionNameById.get(Number(graduate.origin_country_region_id)) ?? "";
  return isGreeceDisplayValue(countryName) ? greeceLabel : countryName;
}

export function getGraduateOriginNomosDisplay(graduate: Graduate, regionNameById: Map<number, string>, activeLang: "gr" | "en" = "gr") {
  if (String(graduate.origin_foreign_city ?? "").trim() && String(graduate.origin_country ?? "").trim() && !isGreeceDisplayValue(String(graduate.origin_country ?? ""))) {
    return "";
  }
  if (activeLang === "en") {
    const localized = String((graduate as any).origin_nomos_name_en ?? "").trim();
    if (localized) return localized;
  }
  return regionNameById.get(Number(graduate.origin_region_id)) ?? "";
}

export function getGraduateOriginMunicipalityDisplay(graduate: Graduate, regionNameById?: Map<number, string>, activeLang: "gr" | "en" = "gr") {
  if (activeLang === "en") {
    const localized = String((graduate as any).origin_city_name_en ?? "").trim();
    if (localized) return localized;
    if (regionNameById && graduate.origin_city_region_id != null) {
      const cityName = regionNameById.get(Number(graduate.origin_city_region_id)) ?? "";
      if (cityName) return cityName;
    }
  }
  const foreignCity = String(graduate.origin_foreign_city ?? "").trim();
  if (foreignCity) {
    return foreignCity;
  }
  const municipality = String(graduate.origin_municipality ?? "").trim();
  if (municipality) {
    return municipality;
  }
  if (regionNameById && graduate.origin_city_region_id != null) {
    const cityName = regionNameById.get(Number(graduate.origin_city_region_id)) ?? "";
    if (cityName) {
      return cityName;
    }
  }
  if (regionNameById && graduate.origin_region_id != null) {
    return regionNameById.get(Number(graduate.origin_region_id)) ?? "";
  }
  return "";
}

export function renderGenderValue(value: unknown, activeLang: "gr" | "en" = "gr") {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "F") return activeLang === "en" ? "Female" : "Γυναίκα";
  if (raw === "M") return activeLang === "en" ? "Male" : "Άνδρας";
  return formatValue(value);
}

export function getGraduateSortValue(args: {
  graduate: Graduate;
  key: SortKey;
  programNameById: Map<number, string>;
  regionNameById: Map<number, string>;
  renderGender: (value: unknown) => string;
  activeLang: "gr" | "en";
}) {
  const { graduate, key, programNameById, regionNameById, renderGender, activeLang } = args;
  if (key === "birth_date") {
    return graduate.birth_date ?? "";
  }
  if (key === "study_program") {
    return programNameById.get(Number(graduate.study_program_id)) ?? "";
  }
  if (key === "origin_country") {
    return getGraduateOriginCountryDisplay(graduate, regionNameById, undefined, activeLang);
  }
  if (key === "origin_region") {
    return getGraduateOriginRegionDisplay(graduate, regionNameById, activeLang);
  }
  if (key === "origin_nomos") {
    return getGraduateOriginNomosDisplay(graduate, regionNameById, activeLang);
  }
  if (key === "origin_municipality") {
    return getGraduateOriginMunicipalityDisplay(graduate, regionNameById, activeLang);
  }
  if (key === "gender") {
    return renderGender(graduate.gender);
  }
  return (graduate as unknown as Record<string, unknown>)[key] ?? "";
}

export function filterAndSortGraduates(args: {
  items: Graduate[];
  sortState: { key: SortKey; dir: SortDir };
  searchTerm: string;
  programNameById: Map<number, string>;
  regionNameById: Map<number, string>;
  renderGender: (value: unknown) => string;
  activeLang: "gr" | "en";
}) {
  const { items, sortState, searchTerm, programNameById, regionNameById, renderGender, activeLang } = args;
  const query = normalizeValue(searchTerm).trim();
  const list = [...items];

  list.sort((a, b) => {
    const aValue = getGraduateSortValue({ graduate: a, key: sortState.key, programNameById, regionNameById, renderGender, activeLang });
    const bValue = getGraduateSortValue({ graduate: b, key: sortState.key, programNameById, regionNameById, renderGender, activeLang });
    const directionFactor = sortState.dir === "asc" ? 1 : -1;
    const isDateKey = sortState.key === "birth_date" || sortState.key === "graduation_date" || sortState.key === "oath_date";
    const isNumericKey = sortState.key === "entry_year" || sortState.key === "degree_grade";

    if (isDateKey) {
      const aNumber = Date.parse(String(aValue || ""));
      const bNumber = Date.parse(String(bValue || ""));
      return (((Number.isFinite(aNumber) ? aNumber : 0) - (Number.isFinite(bNumber) ? bNumber : 0)) || 0) * directionFactor;
    }

    if (isNumericKey) {
      const aNumber = Number(aValue || 0);
      const bNumber = Number(bValue || 0);
      return ((aNumber - bNumber) || 0) * directionFactor;
    }

    return normalizeValue(aValue).localeCompare(normalizeValue(bValue), "el", { numeric: true, sensitivity: "base" }) * directionFactor;
  });

  if (!query) {
    return list;
  }

  return list.filter((graduate) => {
    const values = [
      graduate.ad_code,
      graduate.student_number,
      graduate.last_name,
      graduate.first_name,
      graduate.father_name,
      renderGender(graduate.gender),
      graduate.entry_year,
      formatDateValue(graduate.birth_date),
      graduate.degree_grade,
      formatDateValue(graduate.graduation_date),
      formatDateValue(graduate.oath_date),
      programNameById.get(Number(graduate.study_program_id)) ?? "",
      getGraduateOriginCountryDisplay(graduate, regionNameById, undefined, activeLang),
      getGraduateOriginRegionDisplay(graduate, regionNameById, activeLang),
      getGraduateOriginNomosDisplay(graduate, regionNameById, activeLang),
      getGraduateOriginMunicipalityDisplay(graduate, regionNameById, activeLang),
    ];
    return values.some((value) => normalizeValue(value).includes(query));
  });
}

export function GraduatesFilters(props: {
  t: (key: string) => string;
  filters: GraduatesFiltersState;
  programs: StudyProgram[];
  regions: any[];
  programNameById: Map<number, string>;
  regionNameById: Map<number, string>;
  setFilters: React.Dispatch<React.SetStateAction<GraduatesFiltersState>>;
  onSearch: () => void;
  onReset: () => void;
}) {
  const { t, filters, programs, regions, programNameById, regionNameById, setFilters, onSearch, onReset } = props;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: 14, alignItems: "stretch" }}>
      <Field label={t("table.ad")}>
        <input className="input" value={filters.ad_code_like} onChange={(e) => setFilters((current) => ({ ...current, ad_code_like: e.target.value }))} />
      </Field>
      <Field label={t("table.am")}>
        <input className="input" value={filters.student_number_like} onChange={(e) => setFilters((current) => ({ ...current, student_number_like: e.target.value }))} />
      </Field>
      <Field label={t("table.lastName")}>
        <input className="input" value={filters.last_name_like} onChange={(e) => setFilters((current) => ({ ...current, last_name_like: e.target.value }))} />
      </Field>
      <Field label={t("table.firstName")}>
        <input className="input" value={filters.first_name_like} onChange={(e) => setFilters((current) => ({ ...current, first_name_like: e.target.value }))} />
      </Field>
      <Field label={t("table.fatherName")}>
        <input className="input" value={filters.father_name_like} onChange={(e) => setFilters((current) => ({ ...current, father_name_like: e.target.value }))} />
      </Field>
      <Field label={t("table.gender")}>
        <select className="input" value={filters.gender} onChange={(e) => setFilters((current) => ({ ...current, gender: e.target.value }))}>
          <option value="">{t("filters.all")}</option>
          <option value="M">{t("filters.male")}</option>
          <option value="F">{t("filters.female")}</option>
        </select>
      </Field>
      <RangeField
        label={t("table.entryYear")}
        fromLabel={t("filters.from")}
        toLabel={t("filters.to")}
        fromValue={filters.entry_year_min}
        toValue={filters.entry_year_max}
        onFromChange={(value) => setFilters((current) => ({ ...current, entry_year_min: value }))}
        onToChange={(value) => setFilters((current) => ({ ...current, entry_year_max: value }))}
        type="number"
      />
      <RangeField
        label={t("table.birthDate")}
        fromLabel={t("filters.from")}
        toLabel={t("filters.to")}
        fromValue={filters.birth_date_from}
        toValue={filters.birth_date_to}
        onFromChange={(value) => setFilters((current) => ({ ...current, birth_date_from: value }))}
        onToChange={(value) => setFilters((current) => ({ ...current, birth_date_to: value }))}
        type="date"
      />
      <Field label={t("table.degreeGrade")}>
        <input className="input" type="number" step="0.01" value={filters.degree_grade_min || filters.degree_grade_max} onChange={(e) => {
          const value = e.target.value;
          setFilters((current) => ({ ...current, degree_grade_min: value, degree_grade_max: value }));
        }} />
      </Field>
      <RangeField
        label={t("table.graduationDate")}
        fromLabel={t("filters.from")}
        toLabel={t("filters.to")}
        fromValue={filters.graduation_date_from}
        toValue={filters.graduation_date_to}
        onFromChange={(value) => setFilters((current) => ({ ...current, graduation_date_from: value }))}
        onToChange={(value) => setFilters((current) => ({ ...current, graduation_date_to: value }))}
        type="date"
      />
      <RangeField
        label={t("table.oathDate")}
        fromLabel={t("filters.from")}
        toLabel={t("filters.to")}
        fromValue={filters.oath_date_from}
        toValue={filters.oath_date_to}
        onFromChange={(value) => setFilters((current) => ({ ...current, oath_date_from: value }))}
        onToChange={(value) => setFilters((current) => ({ ...current, oath_date_to: value }))}
        type="date"
      />
      <Field label={t("table.studyProgram")}>
        <select className="input" value={filters.study_program_id} onChange={(e) => setFilters((current) => ({ ...current, study_program_id: e.target.value }))}>
          <option value="">{t("filters.all")}</option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {programNameById.get(Number(program.id))}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("filters.region")}>
        <select className="input" value={filters.origin_region_id} onChange={(e) => setFilters((current) => ({ ...current, origin_region_id: e.target.value }))}>
          <option value="">{t("filters.all")}</option>
          {regions.filter((region) => String(region.type) === "PERIPHERY").map((region) => (
            <option key={Number(region.id)} value={Number(region.id)}>
              {regionNameById.get(Number(region.id)) ?? String(region.name ?? "")}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("filters.nomos")}>
        <select className="input" value={filters.origin_nomos_region_id} onChange={(e) => setFilters((current) => ({ ...current, origin_nomos_region_id: e.target.value }))}>
          <option value="">{t("filters.all")}</option>
          {regions.filter((region) => String(region.type) === "NOMOS").map((region) => (
            <option key={Number(region.id)} value={Number(region.id)}>
              {regionNameById.get(Number(region.id)) ?? String(region.name ?? "")}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("table.originMunicipality")}>
        <input className="input" value={filters.origin_municipality_like} onChange={(e) => setFilters((current) => ({ ...current, origin_municipality_like: e.target.value }))} />
      </Field>
      <Field label={t("table.country")}>
        <input className="input" value={filters.origin_country_like} onChange={(e) => setFilters((current) => ({ ...current, origin_country_like: e.target.value }))} />
      </Field>
      <Field label={t("filters.foreignCity")}>
        <input className="input" value={filters.origin_foreign_city_like} onChange={(e) => setFilters((current) => ({ ...current, origin_foreign_city_like: e.target.value }))} />
      </Field>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-start" }}>
        <button className="btn" onClick={onSearch}>
          <Icon src={listFilterIcon} size={17} />
          <span>{t("filters.search")}</span>
        </button>
        <button className="btn" onClick={onReset}>
          <Icon src={historyIcon} size={17} />
          <span>{t("filters.reset")}</span>
        </button>
      </div>
    </div>
  );
}
