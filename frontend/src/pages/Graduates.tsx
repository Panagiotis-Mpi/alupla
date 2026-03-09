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
  | "origin_municipality";

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
  const [items, setItems] = useState<Graduate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sortState, setSortState] = useState<{ key: SortKey; dir: SortDir }>({ key: "ad_code", dir: "asc" });
  const [filters, setFilters] = useState({
    last_name_like: "",
    first_name_like: "",
    gender: "",
    study_program_id: "",
  });
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const floatingScrollbarRef = useRef<HTMLDivElement | null>(null);
  const floatingScrollbarInnerRef = useRef<HTMLDivElement | null>(null);

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
    if (filters.last_name_like.trim()) p.last_name_like = filters.last_name_like.trim();
    if (filters.first_name_like.trim()) p.first_name_like = filters.first_name_like.trim();
    if (filters.gender) p.gender = filters.gender;
    if (filters.study_program_id) p.study_program_id = Number(filters.study_program_id);
    return p;
  }, [filters]);

  const programNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of programs || []) {
      m.set(Number((p as any).id), String((p as any).name_el ?? (p as any).name_en ?? (p as any).code ?? (p as any).id));
    }
    return m;
  }, [programs]);

  const directionNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const d of directions || []) {
      m.set(Number((d as any).id), String((d as any).name_el ?? (d as any).name_en ?? (d as any).code ?? (d as any).id));
    }
    return m;
  }, [directions]);

  const fmt = (v: any) => (v === null || v === undefined ? "" : String(v));

  async function load() {
    setLoading(true);
    try {
      const [sp, gr] = await Promise.all([listStudyPrograms(), listGraduates(params)]);
      setPrograms(sp.items);
      setItems(gr.items);
      setTotal(gr.total);
      const programIds = Array.from(
        new Set(
          (gr.items ?? [])
            .map((g: any) => Number(g?.study_program_id))
            .filter((x) => Number.isFinite(x) && x > 0)
        )
      );
      const dirsResults = await Promise.all(
        programIds.map(async (pid) => {
          try {
            return await listProgramDirections(pid);
          } catch {
            return { items: [] as any[] };
          }
        })
      );
      const merged: any[] = [];
      for (const r of dirsResults) {
        for (const d of (r as any)?.items ?? []) merged.push(d);
      }
      setDirections(merged);
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
  }, [items, selectionMode, sortState, programs, directions]);

  function normalizeValue(value: any) {
    if (value === null || value === undefined) return "";
    return String(value).toLocaleLowerCase("el-GR");
  }

  function getSortValue(g: any, key: SortKey) {
    if (key === "birth_year") return String((g?.birth_date ?? "")).slice(0, 4);
    if (key === "study_program") {
      const name = programNameById.get(Number(g?.study_program_id)) ?? "";
      return `${g?.study_program_id ?? ""} ${name}`;
    }
    if (key === "direction") return directionNameById.get(Number(g?.program_direction_id)) ?? "";
    return g?.[key] ?? "";
  }

  const visibleItems = useMemo(() => {
    const list = [...items];
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
    return list;
  }, [items, sortState, programNameById, directionNameById]);

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

      <div className="topbar" style={{ alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0 }}>{t("pageTitle")}</h2>
        <span className="badge">{loading ? t("topbar.loading") : t("topbar.total", { total })}</span>
        <div className="spacer" />
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
          onClick={() => (document.getElementById("import-xlsx") as HTMLInputElement | null)?.click()}
          disabled={importBusy}
        >
          {importBusy ? t("topbar.importing") : t("topbar.importExcel")}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13 }}>{t("topbar.importTemplateHelp")}</span>
          <button className="btn" type="button" onClick={() => void onDownloadTemplate()}>
            {t("topbar.downloadTemplate")}
          </button>
        </div>
        <button className="btn" type="button" onClick={() => void onExportXlsx()}>
          {t("topbar.exportExcel")}
        </button>
        <button className={`btn${selectionMode ? " primary" : ""}`} type="button" onClick={() => setSelectionMode((v) => !v)}>
          {t("topbar.selectGraduates")}
        </button>
        {selectionMode ? (
          <button className="btn" type="button" onClick={() => void onExportXlsx(selectedIds)} disabled={!selectedIds.length}>
            {t("topbar.exportSelected")}
          </button>
        ) : null}
        <Link className="btn primary" to="/graduates/new">
          {t("topbar.newGraduate")}
        </Link>
      </div>

      <div className="card">
        <div className="grid cols3">
          <div>
            <label className="label">{t("filters.lastNameLike")}</label>
            <input className="input" value={filters.last_name_like} onChange={(e) => setFilters((f) => ({ ...f, last_name_like: e.target.value }))} />
          </div>
          <div>
            <label className="label">{t("filters.firstNameLike")}</label>
            <input className="input" value={filters.first_name_like} onChange={(e) => setFilters((f) => ({ ...f, first_name_like: e.target.value }))} />
          </div>
          <div>
            <label className="label">{t("filters.gender")}</label>
            <select className="input" value={filters.gender} onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value }))}>
              <option value="">{t("filters.all")}</option>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>
          <div>
            <label className="label">{t("filters.studyProgram")}</label>
            <select className="input" value={filters.study_program_id} onChange={(e) => setFilters((f) => ({ ...f, study_program_id: e.target.value }))}>
              <option value="">{t("filters.all")}</option>
              {programs.map((p) => (
                <option key={(p as any).id} value={(p as any).id}>
                  {(p as any).code} - {(p as any).name_el}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button className="btn" onClick={() => void load()}>
            {t("filters.search")}
          </button>
          <button
            className="btn"
            onClick={() => {
              setFilters({ last_name_like: "", first_name_like: "", gender: "", study_program_id: "" });
              setTimeout(() => void load(), 0);
            }}
          >
            {t("filters.reset")}
          </button>
        </div>
      </div>

      <div className="card" style={wideCardStyle}>
        <div className="table-wrap" ref={tableWrapRef} style={{ overflowX: "hidden" }}>
          <table className="table" style={{ minWidth: 2000 }}>
            <thead>
              <tr>
                {selectionMode ? <th style={{ width: 44 }} /> : null}
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
                <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("origin_municipality")}>{t("table.originMunicipality")}{getSortIndicator("origin_municipality")}</button></th>
                <th className="row-actions">{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((g: any) => {
                const id = Number(g.id);
                return (
                  <tr key={g.id}>
                    {selectionMode ? (
                      <td>
                        <input type="checkbox" checked={selectedIds.includes(id)} onChange={() => toggleSelected(id)} />
                      </td>
                    ) : null}
                    <td>{fmt(g.ad_code)}</td>
                    <td>{fmt(g.student_number ?? g.student_nuad_code ?? g.am ?? g.student_id)}</td>
                    <td>{fmt(g.last_name)}</td>
                    <td>{fmt(g.first_name)}</td>
                    <td>{fmt(g.father_name)}</td>
                    <td>{fmt(g.gender)}</td>
                    <td>{fmt(g.entry_year)}</td>
                    <td>{fmt(String((g as any).birth_date ?? "").slice(0, 4))}</td>
                    <td>{fmt(g.degree_grade)}</td>
                    <td>{fmt(g.graduation_date)}</td>
                    <td>{fmt(g.oath_date)}</td>
                    <td>
                      {g.study_program_id
                        ? `${g.study_program_id}${programNameById.get(Number(g.study_program_id)) ? ` (${programNameById.get(Number(g.study_program_id))})` : ""}`
                        : ""}
                    </td>
                    <td>{directionNameById.get(Number(g.program_direction_id)) ?? ""}</td>
                    <td>{fmt(g.origin_municipality)}</td>
                    <td>
                      <div className="row-actions">
                        <Link className="btn" to={`/graduates/${g.id}`}>
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
                  <td colSpan={selectionMode ? 16 : 15} className="muted">
                    {t("table.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        ref={floatingScrollbarRef}
        style={{
          position: "fixed",
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
        }}
      >
        <div ref={floatingScrollbarInnerRef} style={{ height: 1 }} />
      </div>
    </div>
  );
}
