import type { TFunction } from "i18next";
import type { ProgramDirection, StudyProgram } from "../../lib/api";
import { getSortMark, sectionTopStyle, sortableHeaderStyle, type DirectionForm, type DirectionSortKey, type SortState, type StudyProgramForm, type ProgramSortKey } from "./shared";

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

type DirectionsProps = {
  t: TFunction<"academicData", undefined>;
  lang: "en" | "gr";
  programs: StudyProgram[];
  sortedDirections: ProgramDirection[];
  selectedProgramId: string;
  directionForm: DirectionForm;
  directionSort: SortState<DirectionSortKey>;
  editingDirectionId: number | null;
  hasDirectionDraft: boolean;
  getProgramName: (program: StudyProgram) => string;
  updateDirectionForm: <K extends keyof DirectionForm>(key: K, value: DirectionForm[K]) => void;
  toggleDirectionSort: (key: DirectionSortKey) => void;
  handleDirectionSubmit: () => Promise<void>;
  resetDirectionForm: () => void;
  setSelectedProgramId: (value: string) => void;
  startEditDirection: (direction: ProgramDirection) => void;
  deleteDirection: (direction: ProgramDirection) => Promise<void>;
};

export function DirectionsSection({
  t,
  lang,
  programs,
  sortedDirections,
  selectedProgramId,
  directionForm,
  directionSort,
  editingDirectionId,
  hasDirectionDraft,
  getProgramName,
  updateDirectionForm,
  toggleDirectionSort,
  handleDirectionSubmit,
  resetDirectionForm,
  setSelectedProgramId,
  startEditDirection,
  deleteDirection,
}: DirectionsProps) {
  return (
    <div className="card">
      <div className="topbar">
        <h3 style={{ margin: 0 }}>{t("directions.title")}</h3>
      </div>

      <div className="grid cols2" style={sectionTopStyle}>
        <div>
          <label className="label">{t("directions.labels.program")}</label>
          <select className="input" value={directionForm.study_program_id} onChange={(event) => updateDirectionForm("study_program_id", event.target.value)}>
            <option value="">{t("directions.selectProgram")}</option>
            {programs.map((item) => (
              <option key={item.id} value={item.id}>{getProgramName(item)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t("directions.labels.status")}</label>
          <select className="input" value={directionForm.is_active ? "1" : "0"} onChange={(event) => updateDirectionForm("is_active", event.target.value === "1")}>
            <option value="1">{t("status.active")}</option>
            <option value="0">{t("status.inactive")}</option>
          </select>
        </div>
        <div>
          <label className="label">{t("directions.labels.code")}</label>
          <input className="input" value={directionForm.code} onChange={(event) => updateDirectionForm("code", event.target.value)} />
        </div>
        <div>
          <label className="label">{t("directions.labels.nameEl")}</label>
          <input className="input" value={directionForm.name_el} onChange={(event) => updateDirectionForm("name_el", event.target.value)} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="label">{t("directions.labels.nameEn")}</label>
          <input className="input" value={directionForm.name_en} onChange={(event) => updateDirectionForm("name_en", event.target.value)} />
        </div>
      </div>

      <div className="row-actions" style={sectionTopStyle}>
        <button className="btn primary" onClick={() => void handleDirectionSubmit()}>{editingDirectionId ? t("actions.save") : t("actions.add")}</button>
        {hasDirectionDraft && <button className="btn" onClick={resetDirectionForm}>{t("actions.cancel")}</button>}
      </div>

      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span className="label" style={{ margin: 0 }}>{t("directions.filterProgram")}</span>
        <select className="input" style={{ flex: "1 1 280px", minWidth: 0, width: "100%" }} value={selectedProgramId} onChange={(event) => setSelectedProgramId(event.target.value)}>
          {programs.map((item) => (
            <option key={item.id} value={item.id}>{getProgramName(item)}</option>
          ))}
        </select>
      </div>

      <div className="table-wrap" style={{ marginTop: 14 }}>
        <table className="table">
          <thead>
            <tr>
              <th>
                <button type="button" style={sortableHeaderStyle} onClick={() => toggleDirectionSort("code")}>
                  {t("table.code")}{getSortMark(directionSort.key === "code", directionSort.direction)}
                </button>
              </th>
              <th>
                <button type="button" style={sortableHeaderStyle} onClick={() => toggleDirectionSort("name")}>
                  {t("table.name")}{getSortMark(directionSort.key === "name", directionSort.direction)}
                </button>
              </th>
              <th>
                <button type="button" style={sortableHeaderStyle} onClick={() => toggleDirectionSort("status")}>
                  {t("table.status")}{getSortMark(directionSort.key === "status", directionSort.direction)}
                </button>
              </th>
              <th>{t("table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {sortedDirections.map((item) => (
              <tr key={item.id}>
                <td>{item.code}</td>
                <td>{lang === "en" && item.name_en ? item.name_en : item.name_el}</td>
                <td>{item.is_active ? t("status.active") : t("status.inactive")}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn" onClick={() => startEditDirection(item)}>{t("actions.edit")}</button>
                    <button className="btn danger" onClick={() => void deleteDirection(item)}>{t("actions.delete")}</button>
                  </div>
                </td>
              </tr>
            ))}
            {!sortedDirections.length && (
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
