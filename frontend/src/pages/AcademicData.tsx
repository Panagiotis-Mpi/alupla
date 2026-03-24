import React from "react";
import { useTranslation } from "react-i18next";
import {
  createProgramDirection,
  createStudyProgram,
  deleteProgramDirection,
  deleteStudyProgram,
  listProgramDirections,
  listStudyPrograms,
  updateProgramDirection,
  updateStudyProgram,
  type ProgramDirection,
  type StudyProgram,
} from "../lib/api";

type StudyProgramForm = {
  code: string;
  name_el: string;
  name_en: string;
  is_active: boolean;
};

type DirectionForm = {
  study_program_id: string;
  code: string;
  name_el: string;
  name_en: string;
  is_active: boolean;
};

const emptyProgramForm: StudyProgramForm = {
  code: "",
  name_el: "",
  name_en: "",
  is_active: true,
};

const emptyDirectionForm: DirectionForm = {
  study_program_id: "",
  code: "",
  name_el: "",
  name_en: "",
  is_active: true,
};

const sectionGapStyle: React.CSSProperties = { gap: 14 };
const sectionTopStyle: React.CSSProperties = { marginTop: 12 };
const errorCardStyle: React.CSSProperties = {
  borderColor: "#b00020",
  color: "#b00020",
};
const sortableHeaderStyle: React.CSSProperties = {
  background: "transparent",
  border: 0,
  padding: 0,
  font: "inherit",
  fontWeight: 600,
  color: "inherit",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

type ProgramSortKey = "code" | "name" | "status";
type DirectionSortKey = "code" | "name" | "status";
type SortState<T extends string> = {
  key: T;
  direction: "asc" | "desc";
};

export default function AcademicData() {
  const { t, i18n } = useTranslation("academicData");
  const lang = i18n.language?.startsWith("en") ? "en" : "gr";

  const [programs, setPrograms] = React.useState<StudyProgram[]>([]);
  const [directions, setDirections] = React.useState<ProgramDirection[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [programForm, setProgramForm] =
    React.useState<StudyProgramForm>(emptyProgramForm);
  const [directionForm, setDirectionForm] =
    React.useState<DirectionForm>(emptyDirectionForm);

  const [editingProgramId, setEditingProgramId] = React.useState<number | null>(
    null,
  );
  const [editingDirectionId, setEditingDirectionId] = React.useState<
    number | null
  >(null);
  const [selectedProgramId, setSelectedProgramId] = React.useState<string>("");
  const [programSort, setProgramSort] = React.useState<SortState<ProgramSortKey>>({
    key: "code",
    direction: "asc",
  });
  const [directionSort, setDirectionSort] = React.useState<SortState<DirectionSortKey>>({
    key: "code",
    direction: "asc",
  });

  const inFlight = React.useRef(false);

  const getProgramName = React.useCallback(
    (program: StudyProgram) => {
      if (lang === "en" && program.name_en) return program.name_en;
      return program.name_el;
    },
    [lang],
  );

  async function load() {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      const [programsResult, directionsResult] = await Promise.all([
        listStudyPrograms(),
        listProgramDirections(),
      ]);
      const nextPrograms = programsResult.items ?? [];
      const nextDirections = directionsResult.items ?? [];
      setPrograms(nextPrograms);
      setDirections(nextDirections);
      setSelectedProgramId((current) => {
        if (
          current &&
          nextPrograms.some(
            (item: StudyProgram) => Number(item.id) === Number(current),
          )
        )
          return current;
        return nextPrograms[0] ? String(nextPrograms[0].id) : "";
      });
      setDirectionForm((current) => {
        if (current.study_program_id) return current;
        return {
          ...current,
          study_program_id: nextPrograms[0] ? String(nextPrograms[0].id) : "",
        };
      });
    } catch (e: any) {
      setError(e?.message ?? t("error"));
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  const filteredDirections = React.useMemo(() => {
    if (!selectedProgramId) return directions;
    return directions.filter(
      (item) => Number(item.study_program_id) === Number(selectedProgramId),
    );
  }, [directions, selectedProgramId]);

  const sortedPrograms = React.useMemo(() => {
    const items = [...programs];
    const factor = programSort.direction === "asc" ? 1 : -1;
    items.sort((left, right) => {
      let a = "";
      let b = "";
      if (programSort.key === "code") {
        a = left.code ?? "";
        b = right.code ?? "";
      } else if (programSort.key === "name") {
        a = getProgramName(left) ?? "";
        b = getProgramName(right) ?? "";
      } else {
        a = left.is_active ? "1" : "0";
        b = right.is_active ? "1" : "0";
      }
      return a.localeCompare(b, lang === "en" ? "en" : "el", {
        numeric: true,
        sensitivity: "base",
      }) * factor;
    });
    return items;
  }, [getProgramName, lang, programSort, programs]);

  const sortedDirections = React.useMemo(() => {
    const items = [...filteredDirections];
    const factor = directionSort.direction === "asc" ? 1 : -1;
    items.sort((left, right) => {
      let a = "";
      let b = "";
      if (directionSort.key === "code") {
        a = left.code ?? "";
        b = right.code ?? "";
      } else if (directionSort.key === "name") {
        a = lang === "en" && left.name_en ? left.name_en : left.name_el;
        b = lang === "en" && right.name_en ? right.name_en : right.name_el;
      } else {
        a = left.is_active ? "1" : "0";
        b = right.is_active ? "1" : "0";
      }
      return a.localeCompare(b, lang === "en" ? "en" : "el", {
        numeric: true,
        sensitivity: "base",
      }) * factor;
    });
    return items;
  }, [directionSort, filteredDirections, lang]);

  function toggleProgramSort(key: ProgramSortKey) {
    setProgramSort((current) =>
      current.key === key
        ? {
            key,
            direction: current.direction === "asc" ? "desc" : "asc",
          }
        : { key, direction: "asc" },
    );
  }

  function toggleDirectionSort(key: DirectionSortKey) {
    setDirectionSort((current) =>
      current.key === key
        ? {
            key,
            direction: current.direction === "asc" ? "desc" : "asc",
          }
        : { key, direction: "asc" },
    );
  }

  function sortMark(active: boolean, direction: "asc" | "desc") {
    if (!active) return "";
    return direction === "asc" ? " ▲" : " ▼";
  }

  const hasProgramDraft = Boolean(
    editingProgramId ||
    programForm.code ||
    programForm.name_el ||
    programForm.name_en,
  );
  const hasDirectionDraft = Boolean(
    editingDirectionId ||
    directionForm.code ||
    directionForm.name_el ||
    directionForm.name_en,
  );

  function updateProgramForm<K extends keyof StudyProgramForm>(
    key: K,
    value: StudyProgramForm[K],
  ) {
    setProgramForm((current) => ({ ...current, [key]: value }));
  }

  function updateDirectionForm<K extends keyof DirectionForm>(
    key: K,
    value: DirectionForm[K],
  ) {
    setDirectionForm((current) => ({ ...current, [key]: value }));
  }

  function resetProgramForm() {
    setEditingProgramId(null);
    setProgramForm(emptyProgramForm);
  }

  function resetDirectionForm(nextProgramId?: string) {
    setEditingDirectionId(null);
    setDirectionForm({
      ...emptyDirectionForm,
      study_program_id:
        (nextProgramId ?? selectedProgramId) ||
        programs[0]?.id?.toString?.() ||
        "",
    });
  }

  async function handleProgramSubmit() {
    try {
      if (editingProgramId) {
        await updateStudyProgram(editingProgramId, programForm);
      } else {
        await createStudyProgram(programForm);
      }
      resetProgramForm();
      await load();
    } catch (e: any) {
      alert(e?.message ?? t("error"));
    }
  }

  async function handleDirectionSubmit() {
    try {
      const payload = {
        ...directionForm,
        study_program_id: Number(directionForm.study_program_id),
      };
      if (editingDirectionId) {
        await updateProgramDirection(editingDirectionId, payload);
      } else {
        await createProgramDirection(payload);
      }
      setDirectionForm((current) => ({
        ...emptyDirectionForm,
        study_program_id: current.study_program_id || selectedProgramId,
      }));
      setEditingDirectionId(null);
      await load();
    } catch (e: any) {
      alert(e?.message ?? t("error"));
    }
  }

  return (
    <div className="grid" style={sectionGapStyle}>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>{t("title")}</h2>
        <span className="badge">
          {loading ? t("badgeLoading") : t("badgeReady")}
        </span>
      </div>

      {error && (
        <div className="card" style={errorCardStyle}>
          {error}
        </div>
      )}

      <div className="grid" style={sectionGapStyle}>
        <div className="card">
          <div className="topbar" style={{ justifyContent: "space-between" }}>
            <h3 style={{ margin: 0 }}>{t("programs.title")}</h3>
            <span className="badge">
              {t("programs.count", { count: sortedPrograms.length })}
            </span>
          </div>

          <div className="grid cols2" style={sectionTopStyle}>
            <div>
              <label className="label">{t("programs.labels.code")}</label>
              <input
                className="input"
                value={programForm.code}
                onChange={(e) => updateProgramForm("code", e.target.value)}
              />
            </div>
            <div>
              <label className="label">{t("programs.labels.status")}</label>
              <select
                className="input"
                value={programForm.is_active ? "1" : "0"}
                onChange={(e) =>
                  updateProgramForm("is_active", e.target.value === "1")
                }
              >
                <option value="1">{t("status.active")}</option>
                <option value="0">{t("status.inactive")}</option>
              </select>
            </div>
            <div>
              <label className="label">{t("programs.labels.nameEl")}</label>
              <input
                className="input"
                value={programForm.name_el}
                onChange={(e) => updateProgramForm("name_el", e.target.value)}
              />
            </div>
            <div>
              <label className="label">{t("programs.labels.nameEn")}</label>
              <input
                className="input"
                value={programForm.name_en}
                onChange={(e) => updateProgramForm("name_en", e.target.value)}
              />
            </div>
          </div>

          <div className="row-actions" style={sectionTopStyle}>
            <button className="btn primary" onClick={handleProgramSubmit}>
              {editingProgramId ? t("actions.save") : t("actions.add")}
            </button>
            {hasProgramDraft && (
              <button className="btn" onClick={resetProgramForm}>
                {t("actions.cancel")}
              </button>
            )}
          </div>

          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>
                    <button
                      type="button"
                      style={sortableHeaderStyle}
                      onClick={() => toggleProgramSort("code")}
                    >
                      {t("table.code")}
                      {sortMark(programSort.key === "code", programSort.direction)}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      style={sortableHeaderStyle}
                      onClick={() => toggleProgramSort("name")}
                    >
                      {t("table.name")}
                      {sortMark(programSort.key === "name", programSort.direction)}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      style={sortableHeaderStyle}
                      onClick={() => toggleProgramSort("status")}
                    >
                      {t("table.status")}
                      {sortMark(programSort.key === "status", programSort.direction)}
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
                    <td>
                      {item.is_active
                        ? t("status.active")
                        : t("status.inactive")}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn"
                          onClick={() => {
                            setEditingProgramId(item.id);
                            setProgramForm({
                              code: item.code,
                              name_el: item.name_el,
                              name_en: item.name_en ?? "",
                              is_active: Boolean(item.is_active),
                            });
                          }}
                        >
                          {t("actions.edit")}
                        </button>
                        <button
                          className="btn danger"
                          onClick={async () => {
                            if (
                              !confirm(
                                t("confirm.deleteProgram", {
                                  name: getProgramName(item),
                                }),
                              )
                            )
                              return;
                            try {
                              await deleteStudyProgram(item.id);
                              if (editingProgramId === item.id) {
                                resetProgramForm();
                              }
                              await load();
                            } catch (e: any) {
                              alert(e?.message ?? t("error"));
                            }
                          }}
                        >
                          {t("actions.delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!programs.length && (
                  <tr>
                    <td colSpan={4} className="muted">
                      {t("table.empty")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="topbar" style={{ justifyContent: "space-between" }}>
            <h3 style={{ margin: 0 }}>{t("directions.title")}</h3>
            <span className="badge">
              {t("directions.count", { count: sortedDirections.length })}
            </span>
          </div>

          <div style={sectionTopStyle}>
            <label className="label">{t("directions.filterProgram")}</label>
            <select
              className="input"
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
            >
              {programs.map((item) => (
                <option key={item.id} value={item.id}>
                  {getProgramName(item)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid cols2" style={sectionTopStyle}>
            <div>
              <label className="label">{t("directions.labels.program")}</label>
              <select
                className="input"
                value={directionForm.study_program_id}
                onChange={(e) =>
                  updateDirectionForm("study_program_id", e.target.value)
                }
              >
                <option value="">{t("directions.selectProgram")}</option>
                {programs.map((item) => (
                  <option key={item.id} value={item.id}>
                    {getProgramName(item)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("directions.labels.status")}</label>
              <select
                className="input"
                value={directionForm.is_active ? "1" : "0"}
                onChange={(e) =>
                  updateDirectionForm("is_active", e.target.value === "1")
                }
              >
                <option value="1">{t("status.active")}</option>
                <option value="0">{t("status.inactive")}</option>
              </select>
            </div>
            <div>
              <label className="label">{t("directions.labels.code")}</label>
              <input
                className="input"
                value={directionForm.code}
                onChange={(e) => updateDirectionForm("code", e.target.value)}
              />
            </div>
            <div>
              <label className="label">{t("directions.labels.nameEl")}</label>
              <input
                className="input"
                value={directionForm.name_el}
                onChange={(e) => updateDirectionForm("name_el", e.target.value)}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="label">{t("directions.labels.nameEn")}</label>
              <input
                className="input"
                value={directionForm.name_en}
                onChange={(e) => updateDirectionForm("name_en", e.target.value)}
              />
            </div>
          </div>

          <div className="row-actions" style={sectionTopStyle}>
            <button className="btn primary" onClick={handleDirectionSubmit}>
              {editingDirectionId ? t("actions.save") : t("actions.add")}
            </button>
            {hasDirectionDraft && (
              <button className="btn" onClick={() => resetDirectionForm()}>
                {t("actions.cancel")}
              </button>
            )}
          </div>

          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>
                    <button
                      type="button"
                      style={sortableHeaderStyle}
                      onClick={() => toggleDirectionSort("code")}
                    >
                      {t("table.code")}
                      {sortMark(directionSort.key === "code", directionSort.direction)}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      style={sortableHeaderStyle}
                      onClick={() => toggleDirectionSort("name")}
                    >
                      {t("table.name")}
                      {sortMark(directionSort.key === "name", directionSort.direction)}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      style={sortableHeaderStyle}
                      onClick={() => toggleDirectionSort("status")}
                    >
                      {t("table.status")}
                      {sortMark(directionSort.key === "status", directionSort.direction)}
                    </button>
                  </th>
                  <th>{t("table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedDirections.map((item) => (
                  <tr key={item.id}>
                    <td>{item.code}</td>
                    <td>
                      {lang === "en" && item.name_en
                        ? item.name_en
                        : item.name_el}
                    </td>
                    <td>
                      {item.is_active
                        ? t("status.active")
                        : t("status.inactive")}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn"
                          onClick={() => {
                            setEditingDirectionId(item.id);
                            setDirectionForm({
                              study_program_id: String(item.study_program_id),
                              code: item.code,
                              name_el: item.name_el,
                              name_en: item.name_en ?? "",
                              is_active: Boolean(item.is_active),
                            });
                          }}
                        >
                          {t("actions.edit")}
                        </button>
                        <button
                          className="btn danger"
                          onClick={async () => {
                            if (
                              !confirm(
                                t("confirm.deleteDirection", {
                                  name:
                                    lang === "en" && item.name_en
                                      ? item.name_en
                                      : item.name_el,
                                }),
                              )
                            )
                              return;
                            try {
                              await deleteProgramDirection(item.id);
                              if (editingDirectionId === item.id) {
                                resetDirectionForm(selectedProgramId || "");
                              }
                              await load();
                            } catch (e: any) {
                              alert(e?.message ?? t("error"));
                            }
                          }}
                        >
                          {t("actions.delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!sortedDirections.length && (
                  <tr>
                    <td colSpan={4} className="muted">
                      {t("table.empty")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
