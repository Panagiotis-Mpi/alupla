import type { TFunction } from "i18next";
import type { ActivityLog } from "../../lib/api";

export const PAGE_SIZE = 200;

export type LogFilters = {
  actor: string;
  action: string;
};

export type FileSummaryRole = "secretariat" | "super_admin" | "visitor";
export type FileSummaryFileType = "excel" | "csv" | "pdf" | "png";
export type FileSummaryPage = "graduates" | "academicData" | "statistics" | "map" | "logs";
export type FileSummaryItem = {
  page: FileSummaryPage;
  import: Record<FileSummaryFileType, number>;
  export: Record<FileSummaryFileType, number>;
};

export type ActivityLogListResponse = {
  items?: ActivityLog[];
  total?: number;
  page?: number;
  pageSize?: number;
};

export type SummaryLayout = {
  pages: FileSummaryPage[];
  importTypes: FileSummaryFileType[];
  exportTypes: FileSummaryFileType[];
};

export const emptyFilters: LogFilters = {
  actor: "",
  action: "",
};

export const actionLabels = {
  gr: {
    login: "Σύνδεση",
    logout: "Αποσύνδεση",
    register: "Εγγραφή",
    change_password: "Αλλαγή κωδικού",
    update_profile: "Ενημέρωση προφίλ",
    upload: "Μεταφόρτωση αρχείου",
    import_graduates: "Εισαγωγή αποφοίτων",
    export_graduates: "Εξαγωγή αποφοίτων",
    export_csv: "Εξαγωγή CSV",
    export_xlsx: "Εξαγωγή Excel",
    export_pdf: "Εξαγωγή PDF",
    map_export: "Εξαγωγή χάρτη",
    statistics_export: "Εξαγωγή στατιστικών",
    create_user: "Δημιουργία χρήστη",
    update_user: "Ενημέρωση χρήστη",
    reject_user: "Απόρριψη χρήστη",
    approve_user: "Αποδοχή χρήστη",
    deactivate_user: "Διαγραφή χρήστη",
    delete_user: "Διαγραφή χρήστη",
    "διαγραφή χρήστη": "Διαγραφή χρήστη",
    create_graduate: "Δημιουργία αποφοίτου",
    update_graduate: "Ενημέρωση αποφοίτου",
    delete_graduate: "Διαγραφή αποφοίτου",
    create_study_program: "Δημιουργία προγράμματος σπουδών",
    update_study_program: "Ενημέρωση προγράμματος σπουδών",
    delete_study_program: "Διαγραφή προγράμματος σπουδών",
    import_study_programs: "Εισαγωγή προγραμμάτων σπουδών",
    create_region_periphery: "Δημιουργία περιφέρειας",
    update_region_periphery: "Ενημέρωση περιφέρειας",
    delete_region_periphery: "Διαγραφή περιφέρειας",
    import_region_peripheries: "Εισαγωγή περιφερειών",
    create_region_city: "Δημιουργία πόλης",
    update_region_city: "Ενημέρωση πόλης",
    delete_region_city: "Διαγραφή πόλης",
    import_region_cities: "Εισαγωγή πόλεων",
    resolve_unmatched_city: "Αντιστοίχιση μη αναγνωρισμένης πόλης",
    dismiss_unmatched_cities: "Απόρριψη μη αναγνωρισμένων πόλεων"
  },
  en: {
    login: "Login",
    logout: "Logout",
    register: "Registration",
    change_password: "Password change",
    update_profile: "Profile update",
    upload: "File upload",
    import_graduates: "Graduate import",
    export_graduates: "Graduate export",
    export_csv: "CSV export",
    export_xlsx: "Excel export",
    export_pdf: "PDF export",
    map_export: "Map export",
    statistics_export: "Statistics export",
    create_user: "User creation",
    update_user: "User update",
    reject_user: "User rejection",
    approve_user: "User approval",
    deactivate_user: "User deletion",
    delete_user: "User deletion",
    "διαγραφή χρήστη": "User deletion",
    create_graduate: "Graduate creation",
    update_graduate: "Graduate update",
    delete_graduate: "Graduate deletion",
    create_study_program: "Study program creation",
    update_study_program: "Study program update",
    delete_study_program: "Study program deletion",
    import_study_programs: "Study program import",
    create_region_periphery: "Periphery creation",
    update_region_periphery: "Periphery update",
    delete_region_periphery: "Periphery deletion",
    import_region_peripheries: "Periphery import",
    create_region_city: "City creation",
    update_region_city: "City update",
    delete_region_city: "City deletion",
    import_region_cities: "City import",
    resolve_unmatched_city: "Resolve unmatched city",
    dismiss_unmatched_cities: "Dismiss unmatched cities"
  }
} as const;

export const knownActionKeys = [
  "login",
  "register",
  "change_password",
  "update_profile",
  "create_user",
  "update_user",
  "διαγραφή χρήστη",
  "create_graduate",
  "update_graduate",
  "delete_graduate",
  "import_graduates",
  "export_graduates",
  "create_study_program",
  "update_study_program",
  "delete_study_program",
  "import_study_programs",
  "export_logs",
  "statistics_export",
  "map_export"
] as const;

export const detailFreeActions = new Set(["login", "logout", "register", "change_password"]);

type SummaryOperation = "import" | "export";

const summarySupportMatrix: Record<FileSummaryPage, { import: FileSummaryFileType[]; export: FileSummaryFileType[] }> = {
  graduates: { import: ["excel"], export: ["excel", "csv", "pdf"] },
  academicData: { import: ["excel"], export: [] },
  statistics: { import: [], export: ["excel", "csv", "png"] },
  map: { import: [], export: ["png"] },
  logs: { import: [], export: ["excel", "csv"] }
};

export function getSummaryLayout(role: FileSummaryRole): SummaryLayout {
  if (role === "visitor") {
    return { pages: ["statistics", "map"], importTypes: [], exportTypes: ["excel", "csv", "png"] };
  }

  if (role === "secretariat") {
    return { pages: ["graduates", "academicData", "statistics", "map"], importTypes: ["excel"], exportTypes: ["excel", "csv", "pdf", "png"] };
  }

  return { pages: ["graduates", "academicData", "statistics", "map", "logs"], importTypes: ["excel"], exportTypes: ["excel", "csv", "pdf", "png"] };
}

export function isSummaryCellSupported(page: FileSummaryPage, operation: SummaryOperation, fileType: FileSummaryFileType) {
  return summarySupportMatrix[page][operation].includes(fileType);
}

export function summaryCellValue(row: FileSummaryItem, operation: SummaryOperation, fileType: FileSummaryFileType) {
  if (!isSummaryCellSupported(row.page, operation, fileType)) return "-";
  return row[operation]?.[fileType] ?? 0;
}

export function upperFileType(value: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "xlsx" || normalized === "xls") return "Excel";
  if (normalized === "csv") return "CSV";
  if (normalized === "pdf") return "PDF";
  if (normalized === "png") return "PNG";
  return value;
}

type LocalizerArgs = {
  activeLang: "gr" | "en";
  t: TFunction;
};

export function createLogsLocalizer({ activeLang, t }: LocalizerArgs) {
  const toLocalizedAction = (value: unknown, log?: ActivityLog) => {
    const key = String(value ?? "").trim();
    if ((key === "export_csv" || key === "export_xlsx" || key === "export_logs") && String(log?.entity_type ?? "logs").trim() === "logs") {
      return activeLang === "en" ? "Log export" : "Εξαγωγή καταγραφών";
    }
    return actionLabels[activeLang][key as keyof (typeof actionLabels)["gr"]] ?? key.replace(/_/g, " ");
  };

  const localDetailLabel = (key: string) => {
    const labels = activeLang === "en"
      ? {
          file: "File",
          format: "Type",
          count: "Rows",
          total_rows: "Total rows",
          inserted: "New",
          updated: "Updated",
          skipped: "Skipped",
          deleted: "Deleted",
          exported: "Exported",
          page: "Page",
          years: "Years",
          role: "Role",
          status: "Status",
          study_program: "Study program",
          reason: "Reason",
          changed: "Changed fields",
          errors: "Errors",
          selected: "Selected",
          limit: "Limit",
          missing: "Missing",
          name: "Name",
          name_el: "Name (Greek)",
          parent_id: "Parent region",
          study_program_id: "Study program",
          unresolved_id: "Pending item",
          raw_name: "Raw name",
          ids: "IDs",
          student_number: "Student number",
          first_name: "First name",
          last_name: "Last name",
          father_name: "Father name",
          degree_grade: "Grade",
          graduation_date: "Graduation date",
          oath_date: "Oath date",
          entry_year: "Entry year",
          birth_date: "Birth date",
          gender: "Gender",
          origin_region_id: "Region",
          origin_city_region_id: "City",
          origin_municipality: "Municipality",
          email: "Email",
          role_id: "Role",
          is_active: "Active",
          approved: "Approved",
          code: "Code"
        }
      : {
          file: "Αρχείο",
          format: "Τύπος",
          count: "Γραμμές",
          total_rows: "Σύνολο γραμμών",
          inserted: "Νέες",
          updated: "Ενημερωμένες",
          skipped: "Παραλείφθηκαν",
          deleted: "Διαγράφηκαν",
          exported: "Εξήχθησαν",
          page: "Σελίδα",
          years: "Έτη",
          role: "Ρόλος",
          status: "Κατάσταση",
          study_program: "Πρόγραμμα σπουδών",
          reason: "Λόγος",
          changed: "Αλλαγμένα πεδία",
          errors: "Σφάλματα",
          selected: "Επιλεγμένα",
          limit: "Όριο",
          missing: "Λείπουν",
          name: "Όνομα",
          name_el: "Όνομα (Ελληνικά)",
          parent_id: "Γονική περιοχή",
          study_program_id: "Πρόγραμμα σπουδών",
          unresolved_id: "Εκκρεμότητα",
          raw_name: "Αρχικό όνομα",
          ids: "IDs",
          student_number: "Αριθμός Μητρώου",
          first_name: "Όνομα",
          last_name: "Επώνυμο",
          father_name: "Πατρώνυμο",
          degree_grade: "Βαθμός πτυχίου",
          graduation_date: "Ημερομηνία αποφοίτησης",
          oath_date: "Ημερομηνία ορκωμοσίας",
          entry_year: "Έτος εισαγωγής",
          birth_date: "Ημερομηνία γέννησης",
          gender: "Φύλο",
          origin_region_id: "Περιφέρεια",
          origin_city_region_id: "Πόλη",
          origin_municipality: "Δήμος",
          email: "Email",
          role_id: "Ρόλος",
          is_active: "Ενεργός",
          approved: "Εγκεκριμένος",
          code: "Κωδικός"
        };

    return labels[key as keyof typeof labels] ?? key;
  };

  const localFieldName = (value: string) => {
    const normalized = String(value ?? "").trim();
    if (!normalized) return "";
    return localDetailLabel(normalized);
  };

  const joinParts = (parts: Array<string | null | undefined>) => parts.map((part) => String(part ?? "").trim()).filter(Boolean).join(", ");

  const formatChangedFields = (value: unknown) => {
    const items = Array.isArray(value) ? value : [value];
    const names = items.map((item) => localFieldName(String(item ?? ""))).filter(Boolean);
    if (!names.length) return "";
    return activeLang === "en" ? `Changed fields: ${names.join(", ")}` : `Αλλαγμένα πεδία: ${names.join(", ")}`;
  };

  const localValue = (value: string) => {
    const normalized = String(value ?? "").trim();
    if (!normalized) return "";
    if (normalized === "visitor") return t("summary.roles.visitor");
    if (normalized === "secretariat") return t("summary.roles.secretariat");
    if (normalized === "super_admin") return t("summary.roles.admin");
    if (normalized === "graduates") return t("summary.pages.graduates");
    if (normalized === "academicData") return t("summary.pages.academicData");
    if (normalized === "statistics") return t("summary.pages.statistics");
    if (normalized === "map") return t("summary.pages.map");
    if (normalized === "logs") return t("summary.pages.logs");
    if (normalized === "pending") return activeLang === "en" ? "Pending" : "Σε εκκρεμότητα";
    if (normalized === "resolved") return activeLang === "en" ? "Resolved" : "Αντιστοιχισμένη";
    if (normalized === "dismissed") return activeLang === "en" ? "Dismissed" : "Απορρίφθηκε";
    if (normalized === "city") return activeLang === "en" ? "City" : "Πόλη";
    if (normalized === "periphery") return activeLang === "en" ? "Periphery" : "Περιφέρεια";
    if (["xls", "xlsx", "excel", "csv", "pdf", "png"].includes(normalized)) return upperFileType(normalized);
    return toLocalizedAction(normalized) || normalized;
  };

  const parseDetails = (value: any) => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "object") return value;
    const raw = String(value).trim();
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  };

  const formatExportDetails = (details: Record<string, any>) => {
    const format = upperFileType(String(details.format ?? details.file_type ?? "").trim());
    const count = details.count ?? details.exported;
    const selected = details.selected;
    const page = localValue(String(details.page ?? ""));
    const parts: string[] = [];

    if (format) parts.push(format);
    if (count !== null && count !== undefined && count !== "") parts.push(activeLang === "en" ? `${count} records` : `${count} εγγραφές`);
    if (selected !== null && selected !== undefined && selected !== "" && Number(selected) > 0) {
      parts.push(activeLang === "en" ? `${selected} selected` : `${selected} επιλεγμένα`);
    }
    if (page) parts.push(activeLang === "en" ? `Page: ${page}` : `Σελίδα: ${page}`);
    return parts.join(", ");
  };

  const formatImportDetails = (details: Record<string, any>) => {
    const file = String(details.file ?? details.filename ?? "").trim();
    const parts: string[] = [];
    if (file) parts.push(`${localDetailLabel("file")}: ${file}`);
    if (details.total_rows !== null && details.total_rows !== undefined && details.total_rows !== "") parts.push(activeLang === "en" ? `Total rows: ${details.total_rows}` : `Σύνολο γραμμών: ${details.total_rows}`);
    if (details.inserted !== null && details.inserted !== undefined && details.inserted !== "") parts.push(activeLang === "en" ? `New: ${details.inserted}` : `Νέες: ${details.inserted}`);
    if (details.updated !== null && details.updated !== undefined && details.updated !== "") parts.push(activeLang === "en" ? `Updated: ${details.updated}` : `Ενημερωμένες: ${details.updated}`);
    if (details.skipped !== null && details.skipped !== undefined && details.skipped !== "") parts.push(activeLang === "en" ? `Skipped: ${details.skipped}` : `Παραλείφθηκαν: ${details.skipped}`);
    if (details.errors !== null && details.errors !== undefined && details.errors !== "") parts.push(activeLang === "en" ? `Errors: ${details.errors}` : `Σφάλματα: ${details.errors}`);
    return parts.join(", ");
  };

  const formatLogDetails = (log: ActivityLog) => {
    const action = String(log.action || "").trim();
    if (detailFreeActions.has(action)) return "";

    const details = parseDetails(log.details);
    if (!details) return "";
    if (typeof details === "string") return localValue(details);

    if (["διαγραφή χρήστη", "delete_user", "deactivate_user"].includes(action)) {
      return String(details.target_name ?? "").trim();
    }

    const studentNumber = String(details.student_number ?? "").trim();
    if (studentNumber) return `${localDetailLabel("student_number")}: ${studentNumber}`;
    if (action === "import_graduates") return formatImportDetails(details);

    if (["export_graduates", "export_csv", "export_xlsx", "export_pdf", "statistics_export", "map_export"].includes(action)) {
      const exportText = formatExportDetails(details);
      if (exportText) return exportText;
    }

    if (details.changed !== null && details.changed !== undefined && details.changed !== "") {
      const changedText = formatChangedFields(details.changed);
      if (changedText) return changedText;
    }

    if (details.code || details.name || details.name_el) {
      const code = String(details.code ?? "").trim();
      const name = String(details.name ?? details.name_el ?? "").trim();
      return joinParts([code ? `${localDetailLabel("code")}: ${code}` : "", name ? `${localDetailLabel("name")}: ${name}` : ""]);
    }

    const plainPairs: Array<[string, any]> = [
      ["file", details.file ?? details.filename],
      ["role", details.role],
      ["status", details.status],
      ["page", details.page],
      ["study_program", details.study_program],
      ["study_program_id", details.study_program_id],
      ["reason", details.reason],
      ["parent_id", details.parent_id],
      ["unresolved_id", details.unresolved_id],
      ["raw_name", details.raw_name],
      ["missing", details.missing]
    ];

    const counterPairs: Array<[string, any]> = [
      ["count", details.count],
      ["total_rows", details.total_rows],
      ["inserted", details.inserted],
      ["updated", details.updated],
      ["skipped", details.skipped],
      ["deleted", details.deleted],
      ["exported", details.exported],
      ["errors", details.errors],
      ["selected", details.selected],
      ["limit", details.limit]
    ];

    const parts: string[] = [];

    for (const [key, value] of plainPairs) {
      if (value === null || value === undefined || value === "") continue;
      const rendered = Array.isArray(value)
        ? value.map((item) => localValue(String(item))).filter(Boolean).join(", ")
        : localValue(String(value)) || String(value);
      if (rendered) parts.push(`${localDetailLabel(key)}: ${rendered}`);
    }

    for (const [key, value] of counterPairs) {
      if (value === null || value === undefined || value === "") continue;
      parts.push(`${localDetailLabel(key)}: ${value}`);
    }

    if (details.ids !== null && details.ids !== undefined && details.ids !== "") {
      const rendered = Array.isArray(details.ids) ? details.ids.map((item: any) => String(item ?? "").trim()).filter(Boolean).join(", ") : String(details.ids);
      if (rendered) parts.push(`${localDetailLabel("ids")}: ${rendered}`);
    }

    if (parts.length) return parts.join(", ");

    return Object.entries(details)
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .slice(0, 5)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${localDetailLabel(key)}: ${value.map((item) => String(item ?? "").trim()).filter(Boolean).join(", ")}`;
        }
        return `${localDetailLabel(key)}: ${typeof value === "string" ? (localValue(value) || value) : String(value)}`;
      })
      .join(", ");
  };

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const locale = activeLang === "en" ? "en-GB" : "el-GR";
    const baseOptions = { timeZone: "Europe/Athens" } as const;
    const time = new Intl.DateTimeFormat(locale, { ...baseOptions, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date);
    const day = new Intl.DateTimeFormat(locale, { ...baseOptions, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
    return `${time}, ${day}`;
  };

  return { formatDateTime, formatLogDetails, localValue, pageLabel: (pageKey: FileSummaryPage) => {
    if (pageKey === "graduates") return t("summary.pages.graduates");
    if (pageKey === "academicData") return t("summary.pages.academicData");
    if (pageKey === "statistics") return t("summary.pages.statistics");
    if (pageKey === "map") return t("summary.pages.map");
    return t("summary.pages.logs");
  }, fileTypeLabel: (fileType: FileSummaryFileType) => {
    if (fileType === "excel") return t("summary.fileTypes.excel");
    if (fileType === "csv") return t("summary.fileTypes.csv");
    if (fileType === "pdf") return t("summary.fileTypes.pdf");
    return t("summary.fileTypes.png");
  }, toLocalizedAction };
}
