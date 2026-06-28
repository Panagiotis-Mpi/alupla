// Μετατρέπει τα αποτελέσματα import σε μηνύματα που καταλαβαίνει ο χρήστης.
type ImportIssueGroup = {
  key: string;
  column: string;
  rows: number[];
  reasons: string[];
};

type Translator = (key: string, options?: Record<string, unknown>) => string;

const DATE_COLUMNS = new Set(["graduation_date", "oath_date", "birth_date"]);
const TEXT_COLUMNS = new Set(["last_name", "first_name", "father_name"]);
const FOREIGN_CITY_COLUMNS = new Set(["origin_municipality", "origin_foreign_city"]);

export function getImportColumnLabel(column: string, t: Translator) {
  const labels: Record<string, string> = {
    student_number: t("table.am"),
    ad_code: t("table.ad"),
    last_name: t("table.lastName"),
    first_name: t("table.firstName"),
    father_name: t("table.fatherName"),
    gender: t("table.gender"),
    entry_year: t("table.entryYear"),
    birth_date: t("table.birthDate"),
    graduation_date: t("table.graduationDate"),
    oath_date: t("table.oathDate"),
    degree_grade: t("table.degreeGrade"),
    study_program: t("table.studyProgram"),
    origin_country: t("table.country"),
    origin_region: t("table.region"),
    origin_nomos: t("table.nomos"),
    origin_municipality: t("table.originMunicipality"),
    origin_foreign_city: t("filters.foreignCity"),
  };

  return labels[column] || column;
}

export function getImportIssueHint(column: string, reasons: string[], t: Translator) {
  const joinedReasons = reasons.join(" ");

  if (column === "gender") return t("toast.hintGender");
  if (DATE_COLUMNS.has(column)) return t("toast.hintDate");
  if (column === "entry_year") return t("toast.hintYear");
  if (column === "degree_grade") return t("toast.hintGrade");
  if (column === "study_program") return t("toast.hintStudyProgram");
  if (column === "origin_region" || column === "origin_nomos") return t("toast.hintRegion");
  if (column === "origin_country") return t("toast.hintForeignCountry");
  if (FOREIGN_CITY_COLUMNS.has(column)) return t("toast.hintForeignCity");

  if (column === "student_number") {
    return joinedReasons.includes("Duplicate") ? t("toast.hintAmDuplicate") : t("toast.hintAm");
  }

  if (column === "ad_code") {
    return joinedReasons.includes("Duplicate") ? t("toast.hintAdDuplicate") : t("toast.hintAd");
  }

  if (TEXT_COLUMNS.has(column)) return t("toast.hintText");

  return t("toast.hintGeneric");
}

export function groupImportErrors(errors: Array<Record<string, unknown>> | undefined) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return [] as ImportIssueGroup[];
  }

  const groupedByColumn = new Map<string, ImportIssueGroup>();

  for (const error of errors) {
    const column = String(error?.column || "general");
    const rowNumber = Number(error?.row);
    const primaryReason = String(error?.message || "").trim();
    const extraReasons = Array.isArray(error?.details)
      ? error.details.map((value) => String(value || "").trim()).filter(Boolean)
      : [];
    const reasons = [primaryReason, ...extraReasons].filter(Boolean);

    const existing = groupedByColumn.get(column);
    if (existing) {
      if (Number.isFinite(rowNumber) && !existing.rows.includes(rowNumber)) {
        existing.rows.push(rowNumber);
      }
      for (const reason of reasons) {
        if (!existing.reasons.includes(reason)) {
          existing.reasons.push(reason);
        }
      }
      continue;
    }

    groupedByColumn.set(column, {
      key: column,
      column,
      rows: Number.isFinite(rowNumber) ? [rowNumber] : [],
      reasons,
    });
  }

  return Array.from(groupedByColumn.values()).sort((left, right) => left.column.localeCompare(right.column));
}

export function buildImportDetail(t: Translator, inserted: number, updated: number, skipped: number) {
  return t("toast.importSummaryHuman", { inserted, updated, skipped });
}

export function normalizeImportErrorMessage(message: string, t: Translator) {
  const normalized = String(message || "").trim();

  if (!normalized) return t("toast.somethingWentWrong");
  if (normalized === "Column birth_year is no longer accepted. Use birth_date instead.") return t("toast.birthYearRemoved");
  if (normalized === "Invalid server response") return t("toast.somethingWentWrong");
  if (
    normalized === "Request failed" ||
    normalized === "Failed to fetch" ||
    normalized.startsWith("Import request failed (")
  ) {
    return t("toast.somethingWentWrong");
  }

  return normalized;
}

export function buildImportTitle(t: Translator, inserted: number, updated: number, skipped: number) {
  if (inserted > 0 && updated > 0) return t("toast.importCompletedMixed");
  if (inserted > 0) return t("toast.importCompletedInserted", { inserted });
  if (updated > 0) return t("toast.importCompletedUpdated", { updated });
  if (skipped > 0) return t("toast.importCompletedSkipped", { skipped });
  return t("toast.importCompleted");
}
