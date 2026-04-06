import React from "react";
import { useTranslation } from "react-i18next";
import {
  createProgramDirection,
  createStudyProgram,
  deleteProgramDirection,
  deleteStudyProgram,
  downloadProgramDirectionsTemplateXlsx,
  downloadStudyProgramsTemplateXlsx,
  importProgramDirectionsFile,
  importStudyProgramsFile,
  listProgramDirections,
  listStudyPrograms,
  updateProgramDirection,
  updateStudyProgram,
  type ProgramDirection,
  type StudyProgram,
} from "../lib/api";
import { downloadBlob } from "../lib/download";
import { AcademicDataMenu } from "./academicData/menu";
import { DirectionsSection, ProgramsSection } from "./academicData/sections";
import {
  emptyDirectionForm,
  emptyProgramForm,
  errorCardStyle,
  sectionGapStyle,
  sortDirections,
  sortPrograms,
  type AcademicTab,
  type DirectionForm,
  type DirectionSortKey,
  type ImportMenu,
  type ProgramSortKey,
  type SortState,
  type StudyProgramForm,
} from "./academicData/shared";

export default function AcademicData() {
  const { t, i18n } = useTranslation("academicData");
  const lang = i18n.language?.startsWith("en") ? "en" : "gr";

  const [programs, setPrograms] = React.useState<StudyProgram[]>([]);
  const [directions, setDirections] = React.useState<ProgramDirection[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<AcademicTab>("programs");
  const [openMenu, setOpenMenu] = React.useState<ImportMenu>(null);
  const [programForm, setProgramForm] = React.useState<StudyProgramForm>(emptyProgramForm);
  const [directionForm, setDirectionForm] = React.useState<DirectionForm>(emptyDirectionForm);
  const [editingProgramId, setEditingProgramId] = React.useState<number | null>(null);
  const [editingDirectionId, setEditingDirectionId] = React.useState<number | null>(null);
  const [selectedProgramId, setSelectedProgramId] = React.useState("");
  const [programSort, setProgramSort] = React.useState<SortState<ProgramSortKey>>({ key: "code", direction: "asc" });
  const [directionSort, setDirectionSort] = React.useState<SortState<DirectionSortKey>>({ key: "code", direction: "asc" });

  const importFileRef = React.useRef<HTMLInputElement | null>(null);
  const importTargetRef = React.useRef<ImportMenu>(null);
  const menuAreaRef = React.useRef<HTMLDivElement | null>(null);
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
      const [programsResult, directionsResult] = await Promise.all([listStudyPrograms(), listProgramDirections()]);
      const nextPrograms = programsResult.items ?? [];
      const nextDirections = directionsResult.items ?? [];

      setPrograms(nextPrograms);
      setDirections(nextDirections);
      setSelectedProgramId((current) => current && nextPrograms.some((item) => Number(item.id) === Number(current)) ? current : nextPrograms[0] ? String(nextPrograms[0].id) : "");
      setDirectionForm((current) => current.study_program_id ? current : { ...current, study_program_id: nextPrograms[0] ? String(nextPrograms[0].id) : "" });
    } catch (e: any) {
      setError(e?.message ?? t("error"));
    } finally {
      inFlight.current = false;
    }
  }, [t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!menuAreaRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  const filteredDirections = React.useMemo(() => {
    if (!selectedProgramId) return directions;
    return directions.filter((item) => Number(item.study_program_id) === Number(selectedProgramId));
  }, [directions, selectedProgramId]);

  const sortedPrograms = React.useMemo(() => sortPrograms(programs, programSort, lang, getProgramName), [getProgramName, lang, programSort, programs]);
  const sortedDirections = React.useMemo(() => sortDirections(filteredDirections, directionSort, lang), [directionSort, filteredDirections, lang]);
  const hasProgramDraft = Boolean(editingProgramId || programForm.code || programForm.name_el || programForm.name_en);
  const hasDirectionDraft = Boolean(editingDirectionId || directionForm.code || directionForm.name_el || directionForm.name_en);
  const activeCountLabel = activeTab === "programs" ? t("programs.summary", { count: sortedPrograms.length }) : t("directions.summary", { count: sortedDirections.length });

  const updateProgramForm = <K extends keyof StudyProgramForm>(key: K, value: StudyProgramForm[K]) => {
    setProgramForm((current) => ({ ...current, [key]: value }));
  };

  const updateDirectionForm = <K extends keyof DirectionForm>(key: K, value: DirectionForm[K]) => {
    setDirectionForm((current) => ({ ...current, [key]: value }));
  };

  const resetProgramForm = () => {
    setEditingProgramId(null);
    setProgramForm(emptyProgramForm);
  };

  const resetDirectionForm = (nextProgramId?: string) => {
    setEditingDirectionId(null);
    setDirectionForm({
      ...emptyDirectionForm,
      study_program_id: (nextProgramId ?? selectedProgramId) || programs[0]?.id?.toString?.() || "",
    });
  };

  const toggleProgramSort = (key: ProgramSortKey) => {
    setProgramSort((current) => current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" });
  };

  const toggleDirectionSort = (key: DirectionSortKey) => {
    setDirectionSort((current) => current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" });
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
    } catch (e: any) {
      alert(e?.message ?? t("error"));
    }
  };

  const handleDirectionSubmit = async () => {
    try {
      const payload = { ...directionForm, study_program_id: Number(directionForm.study_program_id) };
      if (editingDirectionId) {
        await updateProgramDirection(editingDirectionId, payload);
      } else {
        await createProgramDirection(payload);
      }
      setDirectionForm((current) => ({ ...emptyDirectionForm, study_program_id: current.study_program_id || selectedProgramId }));
      setEditingDirectionId(null);
      await load();
    } catch (e: any) {
      alert(e?.message ?? t("error"));
    }
  };

  const openImportPicker = (target: ImportMenu) => {
    importTargetRef.current = target;
    setOpenMenu(null);
    importFileRef.current?.click();
  };

  const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const target = importTargetRef.current;
    event.target.value = "";
    importTargetRef.current = null;
    if (!file || !target) return;

    try {
      if (target === "programs") {
        await importStudyProgramsFile(file);
      } else {
        await importProgramDirectionsFile(file);
      }
      await load();
    } catch (e: any) {
      alert(e?.message ?? t("error"));
    }
  };

  const handleTemplateDownload = async (target: Exclude<ImportMenu, null>) => {
    try {
      const blob = target === "programs" ? await downloadStudyProgramsTemplateXlsx(lang) : await downloadProgramDirectionsTemplateXlsx(lang);
      downloadBlob(blob, target === "programs" ? "study-programs-template.xlsx" : "program-directions-template.xlsx");
      setOpenMenu(null);
    } catch (e: any) {
      alert(e?.message ?? t("error"));
    }
  };

  const startEditProgram = (item: StudyProgram) => {
    setEditingProgramId(item.id);
    setProgramForm({ code: item.code, name_el: item.name_el, name_en: item.name_en ?? "", is_active: Boolean(item.is_active) });
  };

  const startEditDirection = (item: ProgramDirection) => {
    setEditingDirectionId(item.id);
    setDirectionForm({
      study_program_id: String(item.study_program_id),
      code: item.code,
      name_el: item.name_el,
      name_en: item.name_en ?? "",
      is_active: Boolean(item.is_active),
    });
  };

  const deleteProgram = async (item: StudyProgram) => {
    if (!confirm(t("confirm.deleteProgram", { name: getProgramName(item) }))) return;
    try {
      await deleteStudyProgram(item.id);
      if (editingProgramId === item.id) resetProgramForm();
      await load();
    } catch (e: any) {
      alert(e?.message ?? t("error"));
    }
  };

  const deleteDirection = async (item: ProgramDirection) => {
    const label = lang === "en" && item.name_en ? item.name_en : item.name_el;
    if (!confirm(t("confirm.deleteDirection", { name: label }))) return;
    try {
      await deleteProgramDirection(item.id);
      if (editingDirectionId === item.id) resetDirectionForm(selectedProgramId || "");
      await load();
    } catch (e: any) {
      alert(e?.message ?? t("error"));
    }
  };

  return (
    <div className="grid" style={sectionGapStyle}>
      <AcademicDataMenu
        t={t}
        activeTab={activeTab}
        activeCountLabel={activeCountLabel}
        openMenu={openMenu}
        menuAreaRef={menuAreaRef}
        importFileRef={importFileRef}
        setActiveTab={setActiveTab}
        setOpenMenu={setOpenMenu}
        openImportPicker={openImportPicker}
        handleTemplateDownload={handleTemplateDownload}
        handleImportChange={handleImportChange}
      />

      {error && <div className="card" style={errorCardStyle}>{error}</div>}

      {activeTab === "programs" ? (
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
      ) : (
        <DirectionsSection
          t={t}
          lang={lang}
          programs={programs}
          sortedDirections={sortedDirections}
          selectedProgramId={selectedProgramId}
          directionForm={directionForm}
          directionSort={directionSort}
          editingDirectionId={editingDirectionId}
          hasDirectionDraft={hasDirectionDraft}
          getProgramName={getProgramName}
          updateDirectionForm={updateDirectionForm}
          toggleDirectionSort={toggleDirectionSort}
          handleDirectionSubmit={handleDirectionSubmit}
          resetDirectionForm={() => resetDirectionForm()}
          setSelectedProgramId={setSelectedProgramId}
          startEditDirection={startEditDirection}
          deleteDirection={deleteDirection}
        />
      )}
    </div>
  );
}
