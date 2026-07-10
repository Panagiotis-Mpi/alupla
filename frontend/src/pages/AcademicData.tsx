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
import { buildExportFilename } from "../lib/exportFilenames";
import Icon from "../components/Icon";
import arrowDownIcon from "../assets/icons/arrow-down-to-line.svg";
import arrowUpIcon from "../assets/icons/arrow-up-to-line.svg";
import graduationCapIcon from "../assets/icons/graduation-cap.svg";
import xIcon from "../assets/icons/x.svg";

type StudyProgramForm = {
  name_el: string;
  name_en: string;
};

const emptyProgramForm: StudyProgramForm = {
  name_el: "",
  name_en: "",
};

const errorCardStyle: React.CSSProperties = {
  borderColor: "#b00020",
  color: "#b00020",
};

const menuGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
  alignItems: "stretch",
  marginTop: 16,
  width: "100%",
};

const menuButtonStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  padding: "0 18px",
  fontSize: 16,
  fontWeight: 700,
  justifyContent: "center",
  lineHeight: 1.25,
};

function programName(program: StudyProgram, lang: "gr" | "en") {
  if (lang === "en" && program.name_en) return program.name_en;
  return program.name_el;
}

function formFromProgram(program: StudyProgram): StudyProgramForm {
  return {
    name_el: program.name_el,
    name_en: program.name_en ?? "",
  };
}

export default function AcademicData() {
  const { t, i18n } = useTranslation("academicData");
  const lang = i18n.language?.startsWith("en") ? "en" : "gr";

  const [programs, setPrograms] = React.useState<StudyProgram[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [programForm, setProgramForm] =
    React.useState<StudyProgramForm>(emptyProgramForm);
  const [editingProgramId, setEditingProgramId] = React.useState<number | null>(
    null,
  );

  const importFileRef = React.useRef<HTMLInputElement | null>(null);
  const inFlight = React.useRef(false);

  function errorText(error: unknown) {
    if (error && typeof error === "object" && "message" in error) {
      const message = String(
        (error as { message?: unknown }).message ?? "",
      ).trim();
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
      const items = result.items ?? [];
      setPrograms([...items].sort((left, right) => left.id - right.id));
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

  const hasProgramDraft = Boolean(
    editingProgramId || programForm.name_el || programForm.name_en,
  );

  function setProgramField<K extends keyof StudyProgramForm>(
    key: K,
    value: StudyProgramForm[K],
  ) {
    setProgramForm((current) => ({ ...current, [key]: value }));
  }

  function clearProgramForm() {
    setEditingProgramId(null);
    setProgramForm(emptyProgramForm);
  }

  async function saveProgram() {
    try {
      if (editingProgramId) {
        await updateStudyProgram(editingProgramId, {
          name_el: programForm.name_el,
          name_en: programForm.name_en,
        });
      } else {
        await createStudyProgram({
          name_el: programForm.name_el,
          name_en: programForm.name_en,
        });
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
      downloadBlob(blob, buildExportFilename("study_programs", ["import", "template"], "xlsx", { timestamp: false }));
    } catch (error) {
      alert(errorText(error));
    }
  }

  function startProgramEdit(item: StudyProgram) {
    setEditingProgramId(item.id);
    setProgramForm(formFromProgram(item));
  }

  async function removeProgram(item: StudyProgram) {
    if (!confirm(t("confirm.deleteProgram", { name: programName(item, lang) })))
      return;
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
      <div className="card page-central-menu-card" style={{ padding: 16 }}>
        <div
          className="topbar page-central-menu-title-row"
          style={{
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 14,
          }}
        >
          <h2 style={{ margin: 0 }}>{t("title")}</h2>
        </div>

        <div className="topbar page-central-menu-actions page-central-menu-actions-two" style={menuGridStyle}>
          <button
            className="btn"
            style={menuButtonStyle}
            onClick={() => void downloadTemplate()}
          >
            <Icon src={arrowDownIcon} size={18} />
            <span>{t("menu.template")}</span>
          </button>
          <button
            className="btn"
            style={menuButtonStyle}
            onClick={() => importFileRef.current?.click()}
          >
            <Icon src={arrowUpIcon} size={18} />
            <span>{t("menu.import")}</span>
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: "none" }}
            onChange={importPrograms}
          />
        </div>
      </div>

      {error && (
        <div className="card" style={errorCardStyle}>
          {error}
        </div>
      )}

      <div className="card">
        <div className="topbar">
          <h3 style={{ margin: 0 }}>{t("programs.title")}</h3>
        </div>

        <div className="grid cols2" style={{ marginTop: 12 }}>
          <div>
            <label className="label">{t("programs.labels.nameEl")}</label>
            <input
              className="input"
              value={programForm.name_el}
              onChange={(event) =>
                setProgramField("name_el", event.target.value)
              }
            />
          </div>
          <div>
            <label className="label">{t("programs.labels.nameEn")}</label>
            <input
              className="input"
              value={programForm.name_en}
              onChange={(event) =>
                setProgramField("name_en", event.target.value)
              }
            />
          </div>
        </div>

        <div className="row-actions" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={() => void saveProgram()}>
            <Icon src={graduationCapIcon} size={18} />
            <span>{editingProgramId ? t("actions.save") : t("actions.add")}</span>
          </button>
          {hasProgramDraft && (
            <button className="btn" onClick={clearProgramForm}>
              <Icon src={xIcon} size={17} />
              <span>{t("actions.cancel")}</span>
            </button>
          )}
        </div>

        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table className="table">
            <thead>
              <tr>
                <th>{t("table.name")}</th>
                <th>{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((item) => (
                <tr key={item.id}>
                  <td>{programName(item, lang)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn"
                        onClick={() => startProgramEdit(item)}
                      >
                        {t("actions.edit")}
                      </button>
                      <button
                        className="btn danger"
                        onClick={() => void removeProgram(item)}
                      >
                        {t("actions.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!programs.length && (
                <tr>
                  <td colSpan={2} className="muted">
                    {loading ? t("table.loading") : t("table.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
