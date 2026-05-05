// Σελίδα διαχείρισης προγραμμάτων σπουδών και σχετικών ακαδημαϊκών δεδομένων.
import React from "react";
import { useTranslation } from "react-i18next";
import {
  createStudyProgram,
  deleteStudyProgram,
  downloadStudyProgramsTemplateXlsx,
  importStudyProgramsFile,
  listStudyPrograms,
  updateStudyProgram,
  type StudyProgram,
} from "../lib/api";
import { downloadBlob } from "../lib/download";
import { compareSortText, sortIndicator } from "./shared/sorting";

type StudyProgramForm = {
  code: string;
  name_el: string;
  name_en: string;
  is_active: boolean;
};

type ProgramSortKey = "code" | "name" | "status";

const emptyProgramForm: StudyProgramForm = {
  code: "",
  name_el: "",
  name_en: "",
  is_active: true,
};

const errorCardStyle: React.CSSProperties = {
  borderColor: "#b00020",
  color: "#b00020",
};

const sortableHeaderStyle: React.CSSProperties = {
  background: "transparent",
  border: 0,
  padding: 0,
  font: "inherit",
  fontWeight: 500,
  color: "inherit",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  lineHeight: 1.25,
};

export default function AcademicData() {
  const { t, i18n } = useTranslation("academicData");
  const lang = i18n.language?.startsWith("en") ? "en" : "gr";

  const [programs, setPrograms] = React.useState<StudyProgram[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [programForm, setProgramForm] = React.useState<StudyProgramForm>(emptyProgramForm);
  const [editingProgramId, setEditingProgramId] = React.useState<number | null>(null);
  const [programSort, setProgramSort] = React.useState<{ key: ProgramSortKey; direction: "asc" | "desc" }>({
    key: "code",
    direction: "asc",
  });

  const importFileRef = React.useRef<HTMLInputElement | null>(null);
  const inFlight = React.useRef(false);

  function programName(program: StudyProgram) {
    if (lang === "en" && program.name_en) return program.name_en;
    return program.name_el;
  }

  function errorText(error: unknown) {
    if (error && typeof error === "object" && "message" in error) {
      const message = String((error as { message?: unknown }).message ?? "").trim();
      if (message) return message;
    }
    return t("error");
  }

  async function load() {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await listStudyPrograms();
      setPrograms(result.items ?? []);
    } catch (error) {
      setError(errorText(error));
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  const sortedPrograms = React.useMemo(() => {
    return [...programs].sort((left, right) => {
      let a = "";
      let b = "";

      if (programSort.key === "code") {
        a = left.code ?? "";
        b = right.code ?? "";
      } else if (programSort.key === "name") {
        a = programName(left) ?? "";
        b = programName(right) ?? "";
      } else {
        a = left.is_active ? "1" : "0";
        b = right.is_active ? "1" : "0";
      }

      return compareSortText(a, b, programSort.direction, lang === "en" ? "en" : "el");
    });
  }, [lang, programSort, programs]);

  const hasProgramDraft = Boolean(editingProgramId || programForm.code || programForm.name_el || programForm.name_en);

  function setProgramField<K extends keyof StudyProgramForm>(key: K, value: StudyProgramForm[K]) {
    setProgramForm((current) => ({ ...current, [key]: value }));
  }

  function clearProgramForm() {
    setEditingProgramId(null);
    setProgramForm(emptyProgramForm);
  }

  function changeProgramSort(key: ProgramSortKey) {
    setProgramSort((current) =>
      current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" }
    );
  }

  function sortMark(key: ProgramSortKey) {
    return sortIndicator(programSort.key, key, programSort.direction);
  }

  async function saveProgram() {
    try {
      if (editingProgramId) {
        await updateStudyProgram(editingProgramId, programForm);
      } else {
        await createStudyProgram(programForm);
      }
      clearProgramForm();
      await load();
    } catch (error) {
      alert(errorText(error));
    }
  }

  async function importPrograms(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      await importStudyProgramsFile(file);
      await load();
    } catch (error) {
      alert(errorText(error));
    }
  }

  async function downloadTemplate() {
    try {
      const blob = await downloadStudyProgramsTemplateXlsx(lang);
      downloadBlob(blob, "alupla_study_programs_import_template.xlsx");
    } catch (error) {
      alert(errorText(error));
    }
  }

  function startProgramEdit(item: StudyProgram) {
    setEditingProgramId(item.id);
    setProgramForm({ code: item.code, name_el: item.name_el, name_en: item.name_en ?? "", is_active: Boolean(item.is_active) });
  }

  async function removeProgram(item: StudyProgram) {
    if (!confirm(t("confirm.deleteProgram", { name: programName(item) }))) return;
    try {
      await deleteStudyProgram(item.id);
      if (editingProgramId === item.id) clearProgramForm();
      await load();
    } catch (error) {
      alert(errorText(error));
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="card" style={{ padding: 16 }}>
        <div className="topbar" style={{ alignItems: "center", justifyContent: "flex-start", gap: 14 }}>
          <h2 style={{ margin: 0 }}>{t("title")}</h2>
        </div>

        <div
          className="topbar"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
            alignItems: "stretch",
            marginTop: 16,
            width: "100%",
          }}
        >
          <button className="btn" style={{ width: "100%", minHeight: 48, padding: "0 18px", fontSize: 16, fontWeight: 700, justifyContent: "center", lineHeight: 1.25 }} onClick={() => void downloadTemplate()}>
            {t("menu.template")}
          </button>
          <button className="btn" style={{ width: "100%", minHeight: 48, padding: "0 18px", fontSize: 16, fontWeight: 700, justifyContent: "center", lineHeight: 1.25 }} onClick={() => importFileRef.current?.click()}>
            {t("menu.import")}
          </button>
          <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={importPrograms} />
        </div>
      </div>

      {error && <div className="card" style={errorCardStyle}>{error}</div>}

      <div className="card">
        <div className="topbar">
          <h3 style={{ margin: 0 }}>{t("programs.title")}</h3>
        </div>

        <div className="grid cols2" style={{ marginTop: 12 }}>
          <div>
            <label className="label">{t("programs.labels.code")}</label>
            <input className="input" value={programForm.code} onChange={(event) => setProgramField("code", event.target.value)} />
          </div>
          <div>
            <label className="label">{t("programs.labels.status")}</label>
            <select className="input" value={programForm.is_active ? "1" : "0"} onChange={(event) => setProgramField("is_active", event.target.value === "1")}>
              <option value="1">{t("status.active")}</option>
              <option value="0">{t("status.inactive")}</option>
            </select>
          </div>
          <div>
            <label className="label">{t("programs.labels.nameEl")}</label>
            <input className="input" value={programForm.name_el} onChange={(event) => setProgramField("name_el", event.target.value)} />
          </div>
          <div>
            <label className="label">{t("programs.labels.nameEn")}</label>
            <input className="input" value={programForm.name_en} onChange={(event) => setProgramField("name_en", event.target.value)} />
          </div>
        </div>

        <div className="row-actions" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={() => void saveProgram()}>{editingProgramId ? t("actions.save") : t("actions.add")}</button>
          {hasProgramDraft && <button className="btn" onClick={clearProgramForm}>{t("actions.cancel")}</button>}
        </div>

        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table className="table">
            <thead>
              <tr>
                <th>
                  <button type="button" style={sortableHeaderStyle} onClick={() => changeProgramSort("code")}>
                    {t("table.code")}{sortMark("code")}
                  </button>
                </th>
                <th>
                  <button type="button" style={sortableHeaderStyle} onClick={() => changeProgramSort("name")}>
                    {t("table.name")}{sortMark("name")}
                  </button>
                </th>
                <th>
                  <button type="button" style={sortableHeaderStyle} onClick={() => changeProgramSort("status")}>
                    {t("table.status")}{sortMark("status")}
                  </button>
                </th>
                <th>{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedPrograms.map((item) => (
                <tr key={item.id}>
                  <td>{item.code}</td>
                  <td>{programName(item)}</td>
                  <td>{item.is_active ? t("status.active") : t("status.inactive")}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn" onClick={() => startProgramEdit(item)}>{t("actions.edit")}</button>
                      <button className="btn danger" onClick={() => void removeProgram(item)}>{t("actions.delete")}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!programs.length && (
                <tr>
                  <td colSpan={4} className="muted">{loading ? t("table.loading") : t("table.empty")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
