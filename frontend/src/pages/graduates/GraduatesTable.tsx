// Πίνακας αποφοίτων με στήλες, επιλογή γραμμών και actions.
import React from "react";
import { Link } from "react-router-dom";
import type { Graduate } from "../../lib/api";
import { formatValue, getGraduateOriginCountryDisplay, getGraduateOriginMunicipalityDisplay, getGraduateOriginNomosDisplay, getGraduateOriginRegionDisplay, type SortKey } from "./shared";

const graduateSortColumns: Array<{ sortKey: SortKey; labelKey: string }> = [
  { sortKey: "ad_code", labelKey: "table.ad" },
  { sortKey: "student_number", labelKey: "table.am" },
  { sortKey: "last_name", labelKey: "table.lastName" },
  { sortKey: "first_name", labelKey: "table.firstName" },
  { sortKey: "father_name", labelKey: "table.fatherName" },
  { sortKey: "gender", labelKey: "table.gender" },
  { sortKey: "entry_year", labelKey: "table.entryYear" },
  { sortKey: "birth_date", labelKey: "table.birthDate" },
  { sortKey: "degree_grade", labelKey: "table.degreeGrade" },
  { sortKey: "graduation_date", labelKey: "table.graduationDate" },
  { sortKey: "oath_date", labelKey: "table.oathDate" },
  { sortKey: "study_program", labelKey: "table.studyProgram" },
  { sortKey: "origin_country", labelKey: "table.country" },
  { sortKey: "origin_region", labelKey: "table.region" },
  { sortKey: "origin_nomos", labelKey: "table.nomos" },
  { sortKey: "origin_municipality", labelKey: "table.originMunicipality" },
];

// Εμφανίζει αποφοίτους σε πίνακα και ενημερώνει την επιλογή γραμμών.
export function GraduatesTable(props: {
  visibleItems: Graduate[];
  loading: boolean;
  selectedIds: number[];
  selectedIdSet: Set<number>;
  allVisibleSelected: boolean;
  selectAllRef: React.RefObject<HTMLInputElement>;
  tableWrapRef: React.RefObject<HTMLDivElement>;
  floatingScrollbarRef: React.RefObject<HTMLDivElement>;
  floatingScrollbarInnerRef: React.RefObject<HTMLDivElement>;
  headerButtonStyle: React.CSSProperties;
  wideCardStyle: React.CSSProperties;
  toggleAllVisible: () => void;
  toggleSelected: (id: number) => void;
  toggleSort: (key: SortKey) => void;
  getSortIndicator: (key: SortKey) => string;
  renderGender: (value: unknown) => string;
  programNameById: Map<number, string>;
  regionNameById: Map<number, string>;
  activeLang: "gr" | "en";
  t: (key: string, options?: Record<string, unknown>) => string;
  onDelete: (graduate: Graduate) => Promise<void>;
}) {
  const { visibleItems, loading, selectedIdSet, allVisibleSelected, selectAllRef, tableWrapRef, floatingScrollbarRef, floatingScrollbarInnerRef, headerButtonStyle, wideCardStyle, toggleAllVisible, toggleSelected, toggleSort, getSortIndicator, renderGender, programNameById, regionNameById, activeLang, t, onDelete } = props;

  return (
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
        <table className="table" style={{ minWidth: 2380 }}>
          <thead>
            <tr>
              <th style={{ width: 44 }}><input ref={selectAllRef} type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} /></th>
              {graduateSortColumns.map((column) => (
                <th key={column.sortKey}>
                  <button type="button" style={headerButtonStyle} onClick={() => toggleSort(column.sortKey)}>
                    {t(column.labelKey)}{getSortIndicator(column.sortKey)}
                  </button>
                </th>
              ))}
              <th className="row-actions">{t("table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((graduate) => {
              const id = Number(graduate.id);
              const selected = selectedIdSet.has(id);
              return (
                <tr key={graduate.id} className={selected ? "is-selected-row" : undefined} aria-selected={selected}>
                  <td>
                    <input type="checkbox" checked={selected} onChange={() => toggleSelected(id)} />
                  </td>
                  <td>{formatValue(graduate.ad_code)}</td>
                  <td>{formatValue(graduate.student_number ?? (graduate as unknown as Record<string, unknown>).student_nuad_code ?? (graduate as unknown as Record<string, unknown>).am ?? (graduate as unknown as Record<string, unknown>).student_id)}</td>
                  <td>{formatValue(graduate.last_name)}</td>
                  <td>{formatValue(graduate.first_name)}</td>
                  <td>{formatValue(graduate.father_name)}</td>
                  <td>{renderGender(graduate.gender)}</td>
                  <td>{formatValue(graduate.entry_year)}</td>
                  <td>{formatValue(graduate.birth_date, "date")}</td>
                  <td>{formatValue(graduate.degree_grade)}</td>
                  <td>{formatValue(graduate.graduation_date, "date")}</td>
                  <td>{formatValue(graduate.oath_date, "date")}</td>
                  <td>{programNameById.get(Number(graduate.study_program_id)) ?? ""}</td>
                  <td>{formatValue(getGraduateOriginCountryDisplay(graduate, regionNameById, t, activeLang))}</td>
                  <td>{formatValue(getGraduateOriginRegionDisplay(graduate, regionNameById, activeLang))}</td>
                  <td>{formatValue(getGraduateOriginNomosDisplay(graduate, regionNameById, activeLang))}</td>
                  <td>{formatValue(getGraduateOriginMunicipalityDisplay(graduate, regionNameById, activeLang))}</td>
                  <td>
                    <div className="row-actions">
                      <Link className="btn" to={`/graduates/${graduate.id}`} style={{ textDecoration: "none" }}>
                        <span>{t("table.edit")}</span>
                      </Link>
                      <button className="btn danger" onClick={() => void onDelete(graduate)}>
                        {t("table.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!visibleItems.length ? (
              <tr>
                <td colSpan={19} className="muted">
                  {loading ? t("table.loading", { defaultValue: t("topbar.loading") }) : t("table.empty")}
                </td>
              </tr>
            ) : null}
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
  );
}
