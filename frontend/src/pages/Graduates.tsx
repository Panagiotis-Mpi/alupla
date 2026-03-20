import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  deleteGraduate,
  downloadGraduatesImportTemplateXlsx,
  exportGraduatesXlsx,
  importGraduatesXlsx,
  listGraduates,
  listProgramDirections,
  listRegions,
  listStudyPrograms,
  type Graduate,
  type StudyProgram,
} from "../lib/api";

type SortDir = "asc" | "desc";
type SortKey =
  | "ad_code"
  | "student_number"
  | "last_name"
  | "first_name"
  | "father_name"
  | "gender"
  | "entry_year"
  | "birth_year"
  | "degree_grade"
  | "graduation_date"
  | "oath_date"
  | "study_program"
  | "direction"
  | "origin_region"
  | "origin_municipality";

type FiltersState = {
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
  graduation_date_from: string;
  graduation_date_to: string;
  oath_date_from: string;
  oath_date_to: string;
  study_program_id: string;
  program_direction_id: string;
  origin_region_id: string;
  origin_municipality_like: string;
};

const EMPTY_FILTERS: FiltersState = {
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
  graduation_date_from: "",
  graduation_date_to: "",
  oath_date_from: "",
  oath_date_to: "",
  study_program_id: "",
  program_direction_id: "",
  origin_region_id: "",
  origin_municipality_like: "",
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label className="label" style={{ fontSize: 12, marginBottom: 6 }}>{props.fromLabel}</label>
          <input
            className="input"
            type={props.type ?? "text"}
            value={props.fromValue}
            min={props.min}
            max={props.max}
            step={props.step}
            onChange={(e) => props.onFromChange(e.target.value)}
          />
        </div>
        <div>
          <label className="label" style={{ fontSize: 12, marginBottom: 6 }}>{props.toLabel}</label>
          <input
            className="input"
            type={props.type ?? "text"}
            value={props.toValue}
            min={props.min}
            max={props.max}
            step={props.step}
            onChange={(e) => props.onToChange(e.target.value)}
          />
        </div>
      </div>
    </Field>
  );
}

export default function Graduates() {
  const { t, i18n } = useTranslation("graduates");
  const [importBusy, setImportBusy] = useState(false);
  const [importReport, setImportReport] = useState<any | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    title: string;
    detail?: string;
    action?: "download_errors";
  } | null>(null);
  const [programs, setPrograms] = useState<StudyProgram[]>([]);
  const [directions, setDirections] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [items, setItems] = useState<Graduate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sortState, setSortState] = useState<{ key: SortKey; dir: SortDir }>({ key: "ad_code", dir: "asc" });
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState("");
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const floatingScrollbarRef = useRef<HTMLDivElement | null>(null);
  const floatingScrollbarInnerRef = useRef<HTMLDivElement | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  function showToast(tst: { type: "success" | "error"; title: string; detail?: string; action?: "download_errors" }) {
    setToast(tst);
    window.setTimeout(() => {
      setToast((cur) => (cur === tst ? null : cur));
    }, 6000);
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadErrorsCsv(errors: any[]) {
    const headers = ["row", "column", "message", "value"];
    const esc = (v: any) => {
      const s = String(v ?? "");
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [headers.join(","), ...(errors ?? []).map((e) => headers.map((h) => esc(e?.[h])).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadBlob(blob, `import-errors-${ts}.csv`);
  }

  const params = useMemo(() => {
    const p: any = { page: 1, pageSize: 10000 };
    Object.entries(filters).forEach(([key, value]) => {
      const trimmed = typeof value === "string" ? value.trim() : value;
      if (trimmed === undefined || trimmed === null || trimmed === "") return;
      p[key] = trimmed;
    });
    return p;
  }, [filters]);

  const activeLang = (i18n.resolvedLanguage || i18n.language || "gr").toLowerCase().startsWith("en") ? "en" : "gr";

  const programNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of programs || []) {
      const name = activeLang === "en"
        ? String((p as any).name_en ?? (p as any).name_el ?? (p as any).code ?? (p as any).id)
        : String((p as any).name_el ?? (p as any).name_en ?? (p as any).code ?? (p as any).id);
      m.set(Number((p as any).id), name);
    }
    return m;
  }, [activeLang, programs]);

  const directionNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const d of directions || []) {
      const name = activeLang === "en"
        ? String((d as any).name_en ?? (d as any).name_el ?? (d as any).code ?? (d as any).id)
        : String((d as any).name_el ?? (d as any).name_en ?? (d as any).code ?? (d as any).id);
      m.set(Number((d as any).id), name);
    }
    return m;
  }, [activeLang, directions]);

  const regionNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const r of regions || []) {
      m.set(Number((r as any).id), String((r as any).name ?? ""));
    }
    return m;
  }, [regions]);

  const availableDirections = useMemo(() => {
    if (!filters.study_program_id) return directions;
    return directions.filter((item: any) => Number(item?.study_program_id) === Number(filters.study_program_id));
  }, [directions, filters.study_program_id]);

  const fmt = (v: any) => (v === null || v === undefined ? "" : String(v));

  function renderGender(value: any) {
    return String(value ?? "") === "F" ? t("filters.female") : String(value ?? "") === "M" ? t("filters.male") : fmt(value);
  }

  async function load() {
    setLoading(true);
    try {
      const [sp, peripheryRegions, gr] = await Promise.all([
        listStudyPrograms(),
        listRegions({ type: "PERIPHERY" }),
        listGraduates(params),
      ]);

      setPrograms(sp.items ?? []);
      setRegions(peripheryRegions.items ?? []);
      setItems(gr.items ?? []);
      setTotal(gr.total ?? 0);

      const directionsResults = await Promise.all(
        (sp.items ?? []).map(async (program: any) => {
          try {
            return await listProgramDirections(Number(program?.id));
          } catch {
            return { items: [] as any[] };
          }
        })
      );

      const mergedDirections = directionsResults.flatMap((result: any) => result?.items ?? []);
      setDirections(mergedDirections);
      setSelectedIds((prev) => prev.filter((id) => (gr.items ?? []).some((g: any) => Number(g.id) === id)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const wrap = tableWrapRef.current;
    const bar = floatingScrollbarRef.current;
    const inner = floatingScrollbarInnerRef.current;
    if (!wrap || !bar || !inner) return;

    let syncing = false;

    const update = () => {
      inner.style.width = `${wrap.scrollWidth}px`;
      bar.style.display = wrap.scrollWidth > wrap.clientWidth ? "block" : "none";
      bar.scrollLeft = wrap.scrollLeft;
    };

    const onWrapScroll = () => {
      if (syncing) return;
      syncing = true;
      bar.scrollLeft = wrap.scrollLeft;
      syncing = false;
    };

    const onBarScroll = () => {
      if (syncing) return;
      syncing = true;
      wrap.scrollLeft = bar.scrollLeft;
      syncing = false;
    };

    update();
    wrap.addEventListener("scroll", onWrapScroll);
    bar.addEventListener("scroll", onBarScroll);
    window.addEventListener("resize", update);

    return () => {
      wrap.removeEventListener("scroll", onWrapScroll);
      bar.removeEventListener("scroll", onBarScroll);
      window.removeEventListener("resize", update);
    };
  }, [items, sortState, programs, directions, regions]);

  useEffect(() => {
    if (filters.program_direction_id && !availableDirections.some((item: any) => Number(item.id) === Number(filters.program_direction_id))) {
      setFilters((current) => ({ ...current, program_direction_id: "" }));
    }
  }, [availableDirections, filters.program_direction_id]);

  function normalizeValue(value: any) {
    if (value === null || value === undefined) return "";
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("el-GR")
      .trim();
  }

  function getSearchValue(g: any) {
    const firstName = fmt(g.first_name);
    const lastName = fmt(g.last_name);
    const fullName = `${firstName} ${lastName}`.trim();
    const reverseFullName = `${lastName} ${firstName}`.trim();
    return [
      g.ad_code,
      g.student_number ?? g.student_nuad_code ?? g.am ?? g.student_id,
      g.last_name,
      g.first_name,
      g.father_name,
      renderGender(g.gender),
      g.entry_year,
      String((g as any).birth_date ?? "").slice(0, 4),
      g.degree_grade,
      g.graduation_date,
      g.oath_date,
      programNameById.get(Number(g.study_program_id)) ?? "",
      directionNameById.get(Number(g.program_direction_id)) ?? "",
      regionNameById.get(Number(g.origin_region_id)) ?? "",
      g.origin_municipality,
      fullName,
      reverseFullName,
    ]
      .map((value) => normalizeValue(value))
      .join(" ");
  }

  function getSortValue(g: any, key: SortKey) {
    if (key === "birth_year") return String((g?.birth_date ?? "")).slice(0, 4);
    if (key === "study_program") {
      return programNameById.get(Number(g?.study_program_id)) ?? "";
    }
    if (key === "direction") return directionNameById.get(Number(g?.program_direction_id)) ?? "";
    if (key === "origin_region") return regionNameById.get(Number(g?.origin_region_id)) ?? "";
    if (key === "gender") return renderGender(g?.gender);
    return g?.[key] ?? "";
  }

  const visibleItems = useMemo(() => {
    const list = [...items];
    const normalizedSearchText = normalizeValue(searchText);

    list.sort((a: any, b: any) => {
      const av = getSortValue(a, sortState.key);
      const bv = getSortValue(b, sortState.key);
      const dirFactor = sortState.dir === "asc" ? 1 : -1;

      const isDateKey = sortState.key === "graduation_date" || sortState.key === "oath_date";
      const isNumericKey = sortState.key === "entry_year" || sortState.key === "birth_year" || sortState.key === "degree_grade";

      if (isDateKey) {
        const an = Date.parse(String(av || ""));
        const bn = Date.parse(String(bv || ""));
        return (((Number.isFinite(an) ? an : 0) - (Number.isFinite(bn) ? bn : 0)) || 0) * dirFactor;
      }

      if (isNumericKey) {
        const an = Number(av || 0);
        const bn = Number(bv || 0);
        return ((an - bn) || 0) * dirFactor;
      }

      return normalizeValue(av).localeCompare(normalizeValue(bv), "el", { numeric: true, sensitivity: "base" }) * dirFactor;
    });

    if (!normalizedSearchText) return list;

    return list.filter((item: any) => getSearchValue(item).includes(normalizedSearchText));
  }, [items, sortState, searchText, programNameById, directionNameById, regionNameById, activeLang]);

  function toggleSort(key: SortKey) {
    setSortState((cur) => (cur.key === key ? { key, dir: cur.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  function getSortIndicator(key: SortKey) {
    if (sortState.key !== key) return "";
    return sortState.dir === "asc" ? " ↑" : " ↓";
  }

  function toggleSelected(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const visibleIds = useMemo(() => visibleItems.map((g: any) => Number(g.id)).filter((id) => Number.isFinite(id)), [visibleItems]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.includes(id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = !allVisibleSelected && someVisibleSelected;
    }
  }, [allVisibleSelected, someVisibleSelected]);

  function toggleAllVisible() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) return prev.filter((id) => !visibleIds.includes(id));
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  }

  async function onExportXlsx(ids?: number[]) {
    const exportParams: any = { ...params };
    delete exportParams.page;
    delete exportParams.pageSize;
    if (ids?.length) exportParams.ids = ids;
    try {
      const blob = await exportGraduatesXlsx(exportParams, i18n.resolvedLanguage || i18n.language);
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      downloadBlob(blob, `graduates-${ts}.xlsx`);
    } catch (e: any) {
      alert(e?.message ?? t("export.failed"));
    }
  }

  async function onDownloadTemplate() {
    try {
      const blob = await downloadGraduatesImportTemplateXlsx(i18n.resolvedLanguage || i18n.language);
      downloadBlob(blob, "graduates-import-template.xlsx");
    } catch (e: any) {
      alert(e?.message ?? t("export.failed"));
    }
  }

  async function onImportXlsx(file: File) {
    setImportReport(null);
    setImportBusy(true);
    try {
      const rep = await importGraduatesXlsx(file, i18n.resolvedLanguage || i18n.language);
      setImportReport(rep);
      const inserted = Number(rep?.summary?.inserted ?? 0);
      const updated = Number(rep?.summary?.updated ?? 0);
      const skipped = Number(rep?.summary?.skipped ?? 0);
      const errCount = Array.isArray(rep?.errors) ? rep.errors.length : 0;
      if (errCount > 0) {
        showToast({
          type: "error",
          title: t("toast.importWithErrors", { count: errCount }),
          detail: `inserted: ${inserted}, updated: ${updated}, skipped: ${skipped}`,
          action: "download_errors",
        });
      } else {
        showToast({
          type: "success",
          title: t("toast.importCompleted"),
          detail: `inserted: ${inserted}, updated: ${updated}, skipped: ${skipped}`,
        });
      }
      await load();
    } catch (e: any) {
      showToast({
        type: "error",
        title: t("toast.importFailed"),
        detail: e?.message ?? t("toast.somethingWentWrong"),
      });
    } finally {
      setImportBusy(false);
    }
  }



  async function onDeleteSelected() {
    if (!selectedIds.length) return;
    if (!confirm(t("confirm.deleteSelectedGraduates"))) return;
    try {
      await Promise.all(selectedIds.map((id) => deleteGraduate(id)));
      setSelectedIds([]);
      await load();
    } catch (e: any) {
      alert(e?.message ?? t("toast.somethingWentWrong"));
    }
  }
  const wideCardStyle: React.CSSProperties = {
    width: "calc(100vw - 32px)",
    marginLeft: "calc(50% - 50vw + 16px)",
    marginRight: 0,
    boxSizing: "border-box",
    marginBottom: 48,
  };

  const headerButtonStyle: React.CSSProperties = {
    all: "unset",
    cursor: "pointer",
    fontWeight: 700,
    color: "inherit",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  };

  const topButtonStyle: React.CSSProperties = {
    minWidth: 136,
    height: 40,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    padding: "0 12px",
    fontSize: 14,
  };

  return (
    <div className="grid" style={{ gap: 14 }}>
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 9999,
            width: 360,
            maxWidth: "calc(100vw - 32px)",
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.12)",
            borderLeft: `6px solid ${toast.type === "success" ? "#16a34a" : "#dc2626"}`,
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            padding: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{toast.title}</div>
              {toast.detail ? <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{toast.detail}</div> : null}
            </div>
            <button className="btn" type="button" onClick={() => setToast(null)} style={{ padding: "6px 10px" }} aria-label="Close">
              ✕
            </button>
          </div>
          {toast.action === "download_errors" && Array.isArray(importReport?.errors) ? (
            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
              <button className="btn" type="button" onClick={() => downloadErrorsCsv(importReport.errors)}>
                {t("toast.downloadErrors")}
              </button>
            </div>
          ) : null}
        </div>
      )}

      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: "grid", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>{t("pageTitle")}</h2>
              <span className="badge">{loading ? t("topbar.loading") : t("topbar.total", { total })}</span>
            </div>

            <div style={{ width: "100%" }}>
              <input
                className="input"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={activeLang === "gr" ? "Αναζήτηση αποφοίτου" : "Search graduate"}
                style={{ width: "100%", maxWidth: 420 }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", width: "100%" }}>
              <Link className="btn primary" to="/graduates/new" style={topButtonStyle}>
                {t("topbar.newGraduate")}
              </Link>
              <input
                id="import-xlsx"
                type="file"
                accept=".xlsx,.xls"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onImportXlsx(f);
                  e.currentTarget.value = "";
                }}
              />
              <button
                className="btn"
                type="button"
                style={topButtonStyle}
                onClick={() => (document.getElementById("import-xlsx") as HTMLInputElement | null)?.click()}
                disabled={importBusy}
              >
                {importBusy ? t("topbar.importing") : t("topbar.importExcel")}
              </button>
              <button className="btn" type="button" style={topButtonStyle} onClick={() => void onDownloadTemplate()}>
                {t("topbar.downloadTemplate")}
              </button>
              <button className="btn" type="button" style={topButtonStyle} onClick={() => void onExportXlsx(selectedIds.length ? selectedIds : undefined)}>
                {t("topbar.exportExcel")}
              </button>
              <button className="btn" type="button" style={topButtonStyle} onClick={() => setShowFilters((v) => !v)}>
                {activeLang === "gr" ? "Φίλτρα" : "Filters"}
              </button>
              <button
                className="btn danger"
                type="button"
                style={topButtonStyle}
                onClick={() => void onDeleteSelected()}
                disabled={!selectedIds.length}
              >
                {t("topbar.delete")}
              </button>
            </div>
          </div>

          {showFilters ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: 14, alignItems: "stretch" }}>
            <Field label={t("table.ad")}>
              <input className="input" value={filters.ad_code_like} onChange={(e) => setFilters((f) => ({ ...f, ad_code_like: e.target.value }))} />
            </Field>
            <Field label={t("table.am")}>
              <input className="input" value={filters.student_number_like} onChange={(e) => setFilters((f) => ({ ...f, student_number_like: e.target.value }))} />
            </Field>
            <Field label={t("table.lastName")}>
              <input className="input" value={filters.last_name_like} onChange={(e) => setFilters((f) => ({ ...f, last_name_like: e.target.value }))} />
            </Field>
            <Field label={t("table.firstName")}>
              <input className="input" value={filters.first_name_like} onChange={(e) => setFilters((f) => ({ ...f, first_name_like: e.target.value }))} />
            </Field>
            <Field label={t("table.fatherName")}>
              <input className="input" value={filters.father_name_like} onChange={(e) => setFilters((f) => ({ ...f, father_name_like: e.target.value }))} />
            </Field>
            <Field label={t("table.gender")}>
              <select className="input" value={filters.gender} onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value }))}>
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
              onFromChange={(value) => setFilters((f) => ({ ...f, entry_year_min: value }))}
              onToChange={(value) => setFilters((f) => ({ ...f, entry_year_max: value }))}
              type="number"
            />
            <Field label={t("table.birthYear")}>
              <input
                className="input"
                type="number"
                value={filters.birth_year_min || filters.birth_year_max}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters((f) => ({ ...f, birth_year_min: value, birth_year_max: value }));
                }}
              />
            </Field>
            <Field label={t("table.degreeGrade")}>
              <input
                className="input"
                type="number"
                step="0.01"
                value={filters.degree_grade_min || filters.degree_grade_max}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters((f) => ({ ...f, degree_grade_min: value, degree_grade_max: value }));
                }}
              />
            </Field>
            <RangeField
              label={t("table.graduationDate")}
              fromLabel={t("filters.from")}
              toLabel={t("filters.to")}
              fromValue={filters.graduation_date_from}
              toValue={filters.graduation_date_to}
              onFromChange={(value) => setFilters((f) => ({ ...f, graduation_date_from: value }))}
              onToChange={(value) => setFilters((f) => ({ ...f, graduation_date_to: value }))}
              type="date"
            />
            <RangeField
              label={t("table.oathDate")}
              fromLabel={t("filters.from")}
              toLabel={t("filters.to")}
              fromValue={filters.oath_date_from}
              toValue={filters.oath_date_to}
              onFromChange={(value) => setFilters((f) => ({ ...f, oath_date_from: value }))}
              onToChange={(value) => setFilters((f) => ({ ...f, oath_date_to: value }))}
              type="date"
            />
            <Field label={t("table.studyProgram")}>
              <select className="input" value={filters.study_program_id} onChange={(e) => setFilters((f) => ({ ...f, study_program_id: e.target.value }))}>
                <option value="">{t("filters.all")}</option>
                {programs.map((p) => (
                  <option key={(p as any).id} value={(p as any).id}>
                    {programNameById.get(Number((p as any).id))}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("table.direction")}>
              <select className="input" value={filters.program_direction_id} onChange={(e) => setFilters((f) => ({ ...f, program_direction_id: e.target.value }))}>
                <option value="">{t("filters.all")}</option>
                {availableDirections.map((direction: any) => (
                  <option key={Number(direction.id)} value={Number(direction.id)}>
                    {directionNameById.get(Number(direction.id))}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("filters.region")}>
              <select className="input" value={filters.origin_region_id} onChange={(e) => setFilters((f) => ({ ...f, origin_region_id: e.target.value }))}>
                <option value="">{t("filters.all")}</option>
                {regions.map((region: any) => (
                  <option key={Number(region.id)} value={Number(region.id)}>
                    {region.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("table.originMunicipality")}>
              <input className="input" value={filters.origin_municipality_like} onChange={(e) => setFilters((f) => ({ ...f, origin_municipality_like: e.target.value }))} />
            </Field>
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-start" }}>
              <button className="btn" onClick={() => void load()}>
                {t("filters.search")}
              </button>
              <button
                className="btn"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setSelectedIds([]);
                  setTimeout(() => void load(), 0);
                }}
              >
                {t("filters.reset")}
              </button>
            </div>
          </div>
          ) : null}
        </div>
      </div>

      <div className="card" style={{ ...wideCardStyle, position: "relative" }}>
        <div
          className="table-wrap"
          ref={tableWrapRef}
          style={{
            overflowX: "auto",
            overflowY: "hidden",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-x pan-y",
            overscrollBehaviorX: "contain",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <table className="table" style={{ minWidth: 2000 }}>
            <thead>
              <tr>
                <th style={{ width: 44 }}><input ref={selectAllRef} type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} /></th>
                <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("ad_code")}>{t("table.ad")}{getSortIndicator("ad_code")}</button></th>
                <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("student_number")}>{t("table.am")}{getSortIndicator("student_number")}</button></th>
                <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("last_name")}>{t("table.lastName")}{getSortIndicator("last_name")}</button></th>
                <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("first_name")}>{t("table.firstName")}{getSortIndicator("first_name")}</button></th>
                <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("father_name")}>{t("table.fatherName")}{getSortIndicator("father_name")}</button></th>
                <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("gender")}>{t("table.gender")}{getSortIndicator("gender")}</button></th>
                <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("entry_year")}>{t("table.entryYear")}{getSortIndicator("entry_year")}</button></th>
                <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("birth_year")}>{t("table.birthYear")}{getSortIndicator("birth_year")}</button></th>
                <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("degree_grade")}>{t("table.degreeGrade")}{getSortIndicator("degree_grade")}</button></th>
                <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("graduation_date")}>{t("table.graduationDate")}{getSortIndicator("graduation_date")}</button></th>
                <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("oath_date")}>{t("table.oathDate")}{getSortIndicator("oath_date")}</button></th>
                <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("study_program")}>{t("table.studyProgram")}{getSortIndicator("study_program")}</button></th>
                <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("direction")}>{t("table.direction")}{getSortIndicator("direction")}</button></th>
                <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("origin_region")}>{t("table.region")}{getSortIndicator("origin_region")}</button></th>
                <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("origin_municipality")}>{t("table.originMunicipality")}{getSortIndicator("origin_municipality")}</button></th>
                <th className="row-actions">{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((g: any) => {
                const id = Number(g.id);
                return (
                  <tr key={g.id}>
                    <td>
                      <input type="checkbox" checked={selectedIds.includes(id)} onChange={() => toggleSelected(id)} />
                    </td>
                    <td>{fmt(g.ad_code)}</td>
                    <td>{fmt(g.student_number ?? g.student_nuad_code ?? g.am ?? g.student_id)}</td>
                    <td>{fmt(g.last_name)}</td>
                    <td>{fmt(g.first_name)}</td>
                    <td>{fmt(g.father_name)}</td>
                    <td>{renderGender(g.gender)}</td>
                    <td>{fmt(g.entry_year)}</td>
                    <td>{fmt(String((g as any).birth_date ?? "").slice(0, 4))}</td>
                    <td>{fmt(g.degree_grade)}</td>
                    <td>{fmt(g.graduation_date)}</td>
                    <td>{fmt(g.oath_date)}</td>
                    <td>{programNameById.get(Number(g.study_program_id)) ?? ""}</td>
                    <td>{directionNameById.get(Number(g.program_direction_id)) ?? ""}</td>
                    <td>{regionNameById.get(Number(g.origin_region_id)) ?? ""}</td>
                    <td>{fmt(g.origin_municipality)}</td>
                    <td>
                      <div className="row-actions">
                        <Link className="btn" to={`/graduates/${g.id}`} style={{ textDecoration: "none" }}>
                          {t("table.edit")}
                        </Link>
                        <button
                          className="btn danger"
                          onClick={async () => {
                            if (!confirm(t("confirm.deleteGraduate", { id: g.id }))) return;
                            await deleteGraduate(g.id);
                            await load();
                          }}
                        >
                          {t("table.delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!visibleItems.length && (
                <tr>
                  <td colSpan={17} className="muted">
                    {t("table.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div
          ref={floatingScrollbarRef}
          style={{
            position: "sticky",
            left: 16,
            right: 16,
            bottom: 8,
            overflowX: "auto",
            overflowY: "hidden",
            zIndex: 30,
            background: "rgba(255,255,255,0.96)",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 10,
            boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
            height: 18,
            marginTop: 8,
          }}
        >
          <div ref={floatingScrollbarInnerRef} style={{ height: 1 }} />
        </div>
      </div>
    </div>
  );
}
