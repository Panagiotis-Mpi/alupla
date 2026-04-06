import type React from "react";
import type { ProgramDirection, StudyProgram } from "../../lib/api";

export type StudyProgramForm = {
  code: string;
  name_el: string;
  name_en: string;
  is_active: boolean;
};

export type DirectionForm = {
  study_program_id: string;
  code: string;
  name_el: string;
  name_en: string;
  is_active: boolean;
};

export type ProgramSortKey = "code" | "name" | "status";
export type DirectionSortKey = "code" | "name" | "status";
export type SortState<T extends string> = {
  key: T;
  direction: "asc" | "desc";
};
export type AcademicTab = "programs" | "directions";
export type ImportMenu = "programs" | "directions" | null;

export const emptyProgramForm: StudyProgramForm = {
  code: "",
  name_el: "",
  name_en: "",
  is_active: true,
};

export const emptyDirectionForm: DirectionForm = {
  study_program_id: "",
  code: "",
  name_el: "",
  name_en: "",
  is_active: true,
};

export const sectionGapStyle: React.CSSProperties = { gap: 14 };
export const sectionTopStyle: React.CSSProperties = { marginTop: 12 };
export const errorCardStyle: React.CSSProperties = {
  borderColor: "#b00020",
  color: "#b00020",
};
export const sortableHeaderStyle: React.CSSProperties = {
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
export const pageMenuCardStyle: React.CSSProperties = { padding: 16 };
export const pageMenuTitleStyle: React.CSSProperties = { margin: 0 };
export const pageMenuStatsStyle: React.CSSProperties = {
  color: "#334155",
  fontSize: 16,
};
export const pageMenuButtonsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
  alignItems: "stretch",
  marginTop: 16,
  width: "100%",
};
export const pageMenuButtonStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 42,
  padding: "0 18px",
  fontSize: 15,
  justifyContent: "center",
};
export const menuWrapStyle: React.CSSProperties = {
  position: "relative",
  display: "block",
  minWidth: 0,
};
export const popoverStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  border: "1px solid var(--border)",
  borderRadius: 14,
  background: "var(--surface)",
  boxShadow: "var(--shadow)",
  padding: 8,
  zIndex: 20,
};
export const popoverItemStyle: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  marginBottom: 6,
};

export function getSortMark(active: boolean, direction: "asc" | "desc") {
  if (!active) return "";
  return direction === "asc" ? " ▲" : " ▼";
}

export function sortPrograms(items: StudyProgram[], sort: SortState<ProgramSortKey>, lang: "en" | "gr", getProgramName: (program: StudyProgram) => string) {
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...items].sort((left, right) => {
    let a = "";
    let b = "";

    if (sort.key === "code") {
      a = left.code ?? "";
      b = right.code ?? "";
    } else if (sort.key === "name") {
      a = getProgramName(left) ?? "";
      b = getProgramName(right) ?? "";
    } else {
      a = left.is_active ? "1" : "0";
      b = right.is_active ? "1" : "0";
    }

    return a.localeCompare(b, lang === "en" ? "en" : "el", { numeric: true, sensitivity: "base" }) * factor;
  });
}

export function sortDirections(items: ProgramDirection[], sort: SortState<DirectionSortKey>, lang: "en" | "gr") {
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...items].sort((left, right) => {
    let a = "";
    let b = "";

    if (sort.key === "code") {
      a = left.code ?? "";
      b = right.code ?? "";
    } else if (sort.key === "name") {
      a = lang === "en" && left.name_en ? left.name_en : left.name_el;
      b = lang === "en" && right.name_en ? right.name_en : right.name_el;
    } else {
      a = left.is_active ? "1" : "0";
      b = right.is_active ? "1" : "0";
    }

    return a.localeCompare(b, lang === "en" ? "en" : "el", { numeric: true, sensitivity: "base" }) * factor;
  });
}
