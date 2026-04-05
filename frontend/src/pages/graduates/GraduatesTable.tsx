import React from "react";
import { Link } from "react-router-dom";
import type { Graduate } from "../../lib/api";
import { formatValue, getGraduateOriginCountryDisplay, getGraduateOriginMunicipalityDisplay, getGraduateOriginRegionDisplay, type SortKey } from "./shared";

export function GraduatesTable(props: {
  visibleItems: Graduate[];
  selectedIds: number[];
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
  directionNameById: Map<number, string>;
  regionNameById: Map<number, string>;
  t: (key: string, options?: Record<string, unknown>) => string;
  onDelete: (graduate: Graduate) => Promise<void>;
}) {
  const { visibleItems, selectedIds, allVisibleSelected, selectAllRef, tableWrapRef, floatingScrollbarRef, floatingScrollbarInnerRef, headerButtonStyle, wideCardStyle, toggleAllVisible, toggleSelected, toggleSort, getSortIndicator, renderGender, programNameById, directionNameById, regionNameById, t, onDelete } = props;

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
        <table className="table" style={{ minWidth: 2140 }}>
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
              <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("birth_date")}>{t("table.birthDate")}{getSortIndicator("birth_date")}</button></th>
              <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("degree_grade")}>{t("table.degreeGrade")}{getSortIndicator("degree_grade")}</button></th>
              <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("graduation_date")}>{t("table.graduationDate")}{getSortIndicator("graduation_date")}</button></th>
              <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("oath_date")}>{t("table.oathDate")}{getSortIndicator("oath_date")}</button></th>
              <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("study_program")}>{t("table.studyProgram")}{getSortIndicator("study_program")}</button></th>
              <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("direction")}>{t("table.direction")}{getSortIndicator("direction")}</button></th>
              <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("origin_country")}>{t("table.country")}{getSortIndicator("origin_country")}</button></th>
              <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("origin_region")}>{t("table.region")}{getSortIndicator("origin_region")}</button></th>
              <th><button type="button" style={headerButtonStyle} onClick={() => toggleSort("origin_municipality")}>{t("table.originMunicipality")}{getSortIndicator("origin_municipality")}</button></th>
              <th className="row-actions">{t("table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((graduate) => {
              const id = Number(graduate.id);
              return (
                <tr key={graduate.id}>
                  <td>
                    <input type="checkbox" checked={selectedIds.includes(id)} onChange={() => toggleSelected(id)} />
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
                  <td>{directionNameById.get(Number(graduate.program_direction_id)) ?? ""}</td>
                  <td>{formatValue(getGraduateOriginTypeDisplay(graduate, t))}</td>
                  <td>{formatValue(getGraduateOriginCountryDisplay(graduate, regionNameById, t))}</td>
                  <td>{formatValue(getGraduateOriginRegionDisplay(graduate, regionNameById))}</td>
                  <td>{formatValue(getGraduateOriginMunicipalityDisplay(graduate))}</td>
                  <td>
                    <div className="row-actions">
                      <Link className="btn" to={`/graduates/${graduate.id}`} style={{ textDecoration: "none" }}>
                        {t("table.edit")}
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
                  {t("table.empty")}
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
