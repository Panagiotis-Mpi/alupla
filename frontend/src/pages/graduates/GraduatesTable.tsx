import React from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import type { Graduate } from "../../lib/api";
import {
  formatValue,
  getGraduateOriginCountryDisplay,
  getGraduateOriginMunicipalityDisplay,
  getGraduateOriginNomosDisplay,
  getGraduateOriginRegionDisplay,
  type SortKey,
} from "./shared";

export const graduateSortColumns: Array<{ sortKey: SortKey; labelKey: string }> = [
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

export function GraduatesTable(props: {
  visibleItems: Graduate[];
  loading: boolean;
  emptyMessage: string;
  selectedIdSet: Set<number>;
  allVisibleSelected: boolean;
  selectAllRef: React.RefObject<HTMLInputElement>;
  tableWrapRef: React.RefObject<HTMLDivElement>;
  floatingScrollbarRef: React.RefObject<HTMLDivElement>;
  floatingScrollbarInnerRef: React.RefObject<HTMLDivElement>;
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
  const {
    visibleItems,
    loading,
    emptyMessage,
    selectedIdSet,
    allVisibleSelected,
    selectAllRef,
    tableWrapRef,
    floatingScrollbarRef,
    floatingScrollbarInnerRef,
    toggleAllVisible,
    toggleSelected,
    toggleSort,
    getSortIndicator,
    renderGender,
    programNameById,
    regionNameById,
    activeLang,
    t,
    onDelete,
  } = props;
  const [openActionMenu, setOpenActionMenu] = React.useState<{
    key: string;
    graduate: Graduate;
    top: number;
    left: number;
  } | null>(null);
  const actionMenuRef = React.useRef<HTMLDivElement | null>(null);
  const actionTriggerRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (actionMenuRef.current?.contains(target) || actionTriggerRef.current?.contains(target)) {
        return;
      }
      setOpenActionMenu(null);
    };
    const closeMenu = () => setOpenActionMenu(null);
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, []);

  React.useEffect(() => {
    setOpenActionMenu(null);
  }, [visibleItems]);

  const renderActions = (graduate: Graduate, context: "desktop" | "mobile") => {
    const actionKey = `${context}-${graduate.id}`;
    const open = openActionMenu?.key === actionKey;
    return (
      <div className="graduates-row-action-menu">
        <button
          ref={open ? actionTriggerRef : undefined}
          className="graduates-row-action-trigger"
          type="button"
          onClick={(event) => {
            if (open) {
              setOpenActionMenu(null);
              return;
            }
            const rect = event.currentTarget.getBoundingClientRect();
            const panelWidth = 170;
            const panelHeight = 92;
            const left = Math.max(8, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 8));
            const top = rect.bottom + 6 + panelHeight <= window.innerHeight
              ? rect.bottom + 6
              : Math.max(8, rect.top - panelHeight - 6);
            setOpenActionMenu({ key: actionKey, graduate, top, left });
          }}
          aria-label={t("table.moreActions")}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <span aria-hidden="true">⋯</span>
        </button>
      </div>
    );
  };

  return (
    <section className="card graduates-list-card">
      <div className="graduates-desktop-table">
        <div className="table-wrap graduates-table-wrap" ref={tableWrapRef}>
          <table className="table graduates-table">
            <thead>
              <tr>
                <th className="graduates-select-column">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    aria-label={t("table.selectPage")}
                  />
                </th>
                {graduateSortColumns.map((column) => (
                  <th key={column.sortKey} className={`graduates-col-${column.sortKey}`}>
                    <button
                      className="graduates-sort-button"
                      type="button"
                      onClick={() => toggleSort(column.sortKey)}
                    >
                      <span>{t(column.labelKey)}</span>
                      <span aria-hidden="true">{getSortIndicator(column.sortKey)}</span>
                    </button>
                  </th>
                ))}
                <th className="graduates-actions-column">{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((graduate) => {
                const id = Number(graduate.id);
                const selected = selectedIdSet.has(id);
                return (
                  <tr key={graduate.id} className={selected ? "is-selected-row" : undefined} aria-selected={selected}>
                    <td className="graduates-select-column">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelected(id)}
                        aria-label={t("table.selectGraduate", { name: `${graduate.first_name} ${graduate.last_name}` })}
                      />
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
                    <td className="graduates-actions-column">{renderActions(graduate, "desktop")}</td>
                  </tr>
                );
              })}
              {!visibleItems.length ? (
                <tr>
                  <td colSpan={18} className="graduates-table-empty">
                    {loading ? t("table.loading") : emptyMessage}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div ref={floatingScrollbarRef} className="graduates-floating-scrollbar">
          <div ref={floatingScrollbarInnerRef} />
        </div>
      </div>

      <div className="graduates-mobile-list">
        {visibleItems.map((graduate) => {
          const id = Number(graduate.id);
          const selected = selectedIdSet.has(id);
          const city = getGraduateOriginMunicipalityDisplay(graduate, regionNameById, activeLang);
          const country = getGraduateOriginCountryDisplay(graduate, regionNameById, t, activeLang);
          return (
            <article key={graduate.id} className={`graduate-mobile-card${selected ? " is-selected" : ""}`}>
              <div className="graduate-mobile-card-head">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleSelected(id)}
                  aria-label={t("table.selectGraduate", { name: `${graduate.first_name} ${graduate.last_name}` })}
                />
                <div className="graduate-mobile-identity">
                  <strong>{formatValue(graduate.last_name)} {formatValue(graduate.first_name)}</strong>
                  <span>{t("table.am")}: {formatValue(graduate.student_number)}</span>
                </div>
                {renderActions(graduate, "mobile")}
              </div>
              <dl className="graduate-mobile-details">
                <div>
                  <dt>{t("table.ad")}</dt>
                  <dd>{formatValue(graduate.ad_code)}</dd>
                </div>
                <div>
                  <dt>{t("table.graduationDate")}</dt>
                  <dd>{formatValue(graduate.graduation_date, "date")}</dd>
                </div>
                <div>
                  <dt>{t("table.studyProgram")}</dt>
                  <dd>{programNameById.get(Number(graduate.study_program_id)) ?? ""}</dd>
                </div>
                <div>
                  <dt>{t("table.gender")}</dt>
                  <dd>{renderGender(graduate.gender)}</dd>
                </div>
                <div>
                  <dt>{t("table.country")}</dt>
                  <dd>{country}</dd>
                </div>
                <div>
                  <dt>{t("table.originMunicipality")}</dt>
                  <dd>{city}</dd>
                </div>
              </dl>
              <Link className="btn graduate-mobile-details-link" to={`/graduates/${graduate.id}`}>
                {t("table.openDetails")}
              </Link>
            </article>
          );
        })}
        {!visibleItems.length ? (
          <div className="graduates-mobile-empty">
            {loading ? t("table.loading") : emptyMessage}
          </div>
        ) : null}
      </div>

      {openActionMenu && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={actionMenuRef}
              className="graduates-row-action-panel graduates-row-action-portal"
              style={{ top: openActionMenu.top, left: openActionMenu.left }}
              role="menu"
            >
              <Link
                className="graduates-row-action-item"
                to={`/graduates/${openActionMenu.graduate.id}`}
                onClick={() => setOpenActionMenu(null)}
                role="menuitem"
              >
                {t("table.edit")}
              </Link>
              <button
                className="graduates-row-action-item is-danger"
                type="button"
                onClick={() => {
                  const graduate = openActionMenu.graduate;
                  setOpenActionMenu(null);
                  void onDelete(graduate);
                }}
                role="menuitem"
              >
                {t("table.delete")}
              </button>
            </div>,
            document.body,
          )
        : null}

    </section>
  );
}
