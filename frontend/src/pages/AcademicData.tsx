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
import { AcademicDataMenu } from "./academicData/menu";
import { ProgramsSection } from "./academicData/sections";
import {
  emptyProgramForm,
  errorCardStyle,
  sectionGapStyle,
  sortPrograms,
  type ProgramSortKey,
  type SortState,
  type StudyProgramForm,
} from "./academicData/shared";

export default function AcademicData() {
  const { t, i18n } = useTranslation("academicData");
  const lang = i18n.language?.startsWith("en") ? "en" : "gr";

  const [programs, setPrograms] = React.useState<StudyProgram[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [programForm, setProgramForm] = React.useState<StudyProgramForm>(emptyProgramForm);
  const [editingProgramId, setEditingProgramId] = React.useState<number | null>(null);
  const [programSort, setProgramSort] = React.useState<SortState<ProgramSortKey>>({ key: "code", direction: "asc" });

  const importFileRef = React.useRef<HTMLInputElement | null>(null);
  const inFlight = React.useRef(false);

  const getProgramName = React.useCallback((program: StudyProgram) => {
    if (lang === "en" && program.name_en) return program.name_en;
    return program.name_el;
  }, [lang]);

  const load = React.useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);

    try {
      const result = await listStudyPrograms();
      setPrograms(result.items ?? []);
    } catch (error) {
      setError(getErrorText(error, t("error")));
    } finally {
      inFlight.current = false;
    }
  }, [t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const sortedPrograms = React.useMemo(() => sortPrograms(programs, programSort, lang, getProgramName), [getProgramName, lang, programSort, programs]);
  const hasProgramDraft = Boolean(editingProgramId || programForm.code || programForm.name_el || programForm.name_en);

  const updateProgramForm = <K extends keyof StudyProgramForm>(key: K, value: StudyProgramForm[K]) => {
    setProgramForm((current) => ({ ...current, [key]: value }));
  };

  const resetProgramForm = () => {
    setEditingProgramId(null);
    setProgramForm(emptyProgramForm);
  };

  const toggleProgramSort = (key: ProgramSortKey) => {
    setProgramSort((current) => current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" });
  };

  const handleProgramSubmit = async () => {
    try {
      if (editingProgramId) {
        await updateStudyProgram(editingProgramId, programForm);
      } else {
        await createStudyProgram(programForm);
      }
      resetProgramForm();
      await load();
    } catch (error) {
      alert(getErrorText(error, t("error")));
    }
  };

  const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      await importStudyProgramsFile(file);
      await load();
    } catch (error) {
      alert(getErrorText(error, t("error")));
    }
  };

  const handleTemplateDownload = async () => {
    try {
      const blob = await downloadStudyProgramsTemplateXlsx(lang);
      downloadBlob(blob, "study-programs-template.xlsx");
    } catch (error) {
      alert(getErrorText(error, t("error")));
    }
  };

  const startEditProgram = (item: StudyProgram) => {
    setEditingProgramId(item.id);
    setProgramForm({ code: item.code, name_el: item.name_el, name_en: item.name_en ?? "", is_active: Boolean(item.is_active) });
  };

  const deleteProgram = async (item: StudyProgram) => {
    if (!confirm(t("confirm.deleteProgram", { name: getProgramName(item) }))) return;
    try {
      await deleteStudyProgram(item.id);
      if (editingProgramId === item.id) resetProgramForm();
      await load();
    } catch (error) {
      alert(getErrorText(error, t("error")));
    }
  };

  return (
    <div className="grid" style={sectionGapStyle}>
      <AcademicDataMenu
        t={t}
        importFileRef={importFileRef}
        handleTemplateDownload={handleTemplateDownload}
        handleImportChange={handleImportChange}
      />

      {error && <div className="card" style={errorCardStyle}>{error}</div>}

      <ProgramsSection
        t={t}
        programs={programs}
        sortedPrograms={sortedPrograms}
        programForm={programForm}
        programSort={programSort}
        editingProgramId={editingProgramId}
        hasProgramDraft={hasProgramDraft}
        getProgramName={getProgramName}
        updateProgramForm={updateProgramForm}
        toggleProgramSort={toggleProgramSort}
        handleProgramSubmit={handleProgramSubmit}
        resetProgramForm={resetProgramForm}
        startEditProgram={startEditProgram}
        deleteProgram={deleteProgram}
      />
    </div>
  );
}

function getErrorText(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "").trim();
    if (message) return message;
  }
  return fallback;
}
