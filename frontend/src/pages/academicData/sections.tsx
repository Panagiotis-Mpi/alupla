import type { TFunction } from "i18next";
import type { StudyProgram } from "../../lib/api";
import { getSortMark, sectionTopStyle, sortableHeaderStyle, type SortState, type StudyProgramForm, type ProgramSortKey } from "./shared";

type ProgramsProps = {
  t: TFunction<"academicData", undefined>;
  programs: StudyProgram[];
  sortedPrograms: StudyProgram[];
  programForm: StudyProgramForm;
  programSort: SortState<ProgramSortKey>;
  editingProgramId: number | null;
  hasProgramDraft: boolean;
  getProgramName: (program: StudyProgram) => string;
  updateProgramForm: <K extends keyof StudyProgramForm>(key: K, value: StudyProgramForm[K]) => void;
  toggleProgramSort: (key: ProgramSortKey) => void;
  handleProgramSubmit: () => Promise<void>;
  resetProgramForm: () => void;
  startEditProgram: (program: StudyProgram) => void;
  deleteProgram: (program: StudyProgram) => Promise<void>;
};

export function ProgramsSection({
  t,
  programs,
  sortedPrograms,
  programForm,
  programSort,
  editingProgramId,
  hasProgramDraft,
  getProgramName,
  updateProgramForm,
  toggleProgramSort,
  handleProgramSubmit,
  resetProgramForm,
  startEditProgram,
  deleteProgram,
}: ProgramsProps) {
  return (
    <div className="card">
      <div className="topbar">
        <h3 style={{ margin: 0 }}>{t("programs.title")}</h3>
      </div>

      <div className="grid cols2" style={sectionTopStyle}>
        <div>
          <label className="label">{t("programs.labels.code")}</label>
          <input className="input" value={programForm.code} onChange={(event) => updateProgramForm("code", event.target.value)} />
        </div>
        <div>
          <label className="label">{t("programs.labels.status")}</label>
          <select className="input" value={programForm.is_active ? "1" : "0"} onChange={(event) => updateProgramForm("is_active", event.target.value === "1")}>
            <option value="1">{t("status.active")}</option>
            <option value="0">{t("status.inactive")}</option>
          </select>
        </div>
        <div>
          <label className="label">{t("programs.labels.nameEl")}</label>
          <input className="input" value={programForm.name_el} onChange={(event) => updateProgramForm("name_el", event.target.value)} />
        </div>
        <div>
          <label className="label">{t("programs.labels.nameEn")}</label>
          <input className="input" value={programForm.name_en} onChange={(event) => updateProgramForm("name_en", event.target.value)} />
        </div>
      </div>

      <div className="row-actions" style={sectionTopStyle}>
        <button className="btn primary" onClick={() => void handleProgramSubmit()}>{editingProgramId ? t("actions.save") : t("actions.add")}</button>
        {hasProgramDraft && <button className="btn" onClick={resetProgramForm}>{t("actions.cancel")}</button>}
      </div>

      <div className="table-wrap" style={{ marginTop: 14 }}>
        <table className="table">
          <thead>
            <tr>
              <th>
                <button type="button" style={sortableHeaderStyle} onClick={() => toggleProgramSort("code")}>
                  {t("table.code")}{getSortMark(programSort.key === "code", programSort.direction)}
                </button>
              </th>
              <th>
                <button type="button" style={sortableHeaderStyle} onClick={() => toggleProgramSort("name")}>
                  {t("table.name")}{getSortMark(programSort.key === "name", programSort.direction)}
                </button>
              </th>
              <th>
                <button type="button" style={sortableHeaderStyle} onClick={() => toggleProgramSort("status")}>
                  {t("table.status")}{getSortMark(programSort.key === "status", programSort.direction)}
                </button>
              </th>
              <th>{t("table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {sortedPrograms.map((item) => (
              <tr key={item.id}>
                <td>{item.code}</td>
                <td>{getProgramName(item)}</td>
                <td>{item.is_active ? t("status.active") : t("status.inactive")}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn" onClick={() => startEditProgram(item)}>{t("actions.edit")}</button>
                    <button className="btn danger" onClick={() => void deleteProgram(item)}>{t("actions.delete")}</button>
                  </div>
                </td>
              </tr>
            ))}
            {!programs.length && (
              <tr>
                <td colSpan={4} className="muted">{t("table.empty")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
