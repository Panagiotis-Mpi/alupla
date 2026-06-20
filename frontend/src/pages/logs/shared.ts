// Κοινά helpers για εμφάνιση, φίλτρα και exports των logs.
import type { TFunction } from "i18next";
import type { ActivityLog, StudyProgram } from "../../lib/api";

export const PAGE_SIZE = 200;

export type LogFilters = {
  actor: string;
  action: string;
};

export type FileSummaryRole = "secretariat" | "super_admin" | "visitor";
export type FileSummaryFileType = "excel" | "csv" | "pdf" | "png";
export type FileSummaryPage =
  | "graduates"
  | "users"
  | "academicData"
  | "statistics"
  | "map"
  | "logs";
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

const hiddenDetailKeys = new Set(["actor_role", "actor_name", "actor_email"]);

export const actionLabels = {
  gr: {
    login: "Σύνδεση",
    logout: "Αποσύνδεση",
    register: "Εγγραφή",
    change_password: "Αλλαγή κωδικού",
    request_password_reset: "Αίτημα αλλαγής κωδικού",
    reset_password: "Επαναφορά κωδικού",
    update_profile: "Ενημέρωση προφίλ",
    upload: "Μεταφόρτωση αρχείου",
    import_graduates: "Εισαγωγή αποφοίτων",
    export_graduates: "Εξαγωγή αποφοίτων",
    export_users: "Εξαγωγή χρηστών",
    export_users_csv: "Εξαγωγή χρηστών CSV",
    export_users_xlsx: "Εξαγωγή χρηστών Excel",
    export_csv: "Εξαγωγή καταγραφών CSV",
    export_xlsx: "Εξαγωγή καταγραφών Excel",
    export_logs: "Εξαγωγή καταγραφών",
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
    bulk_delete_graduates: "Διαγραφή αποφοίτων",
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
  },
  en: {
    login: "Login",
    logout: "Logout",
    register: "Registration",
    change_password: "Password change",
    request_password_reset: "Password reset request",
    reset_password: "Password reset",
    update_profile: "Profile update",
    upload: "File upload",
    import_graduates: "Graduate import",
    export_graduates: "Graduate export",
    export_users: "User export",
    export_users_csv: "User CSV export",
    export_users_xlsx: "User Excel export",
    export_csv: "Log CSV export",
    export_xlsx: "Log Excel export",
    export_logs: "Log export",
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
    bulk_delete_graduates: "Graduate deletion",
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
  },
} as const;

export const knownActionKeys = [
  "login",
  "logout",
  "register",
  "change_password",
  "request_password_reset",
  "reset_password",
  "update_profile",
  "create_user",
  "update_user",
  "approve_user",
  "reject_user",
  "deactivate_user",
  "delete_user",
  "διαγραφή χρήστη",
  "create_graduate",
  "update_graduate",
  "delete_graduate",
  "bulk_delete_graduates",
  "import_graduates",
  "export_graduates",
  "export_users",
  "export_users_csv",
  "export_users_xlsx",
  "create_study_program",
  "update_study_program",
  "delete_study_program",
  "import_study_programs",
  "export_csv",
  "export_xlsx",
  "export_logs",
  "export_pdf",
  "statistics_export",
  "map_export",
  "create_region_periphery",
  "update_region_periphery",
  "delete_region_periphery",
  "import_region_peripheries",
  "create_region_city",
  "update_region_city",
  "delete_region_city",
  "import_region_cities",
  "upload",
] as const;

export const detailFreeActions = new Set([
  "login",
  "logout",
  "register",
  "change_password",
  "reset_password",
]);

type SummaryOperation = "import" | "export";

const summarySupportMatrix: Record<
  FileSummaryPage,
  { import: FileSummaryFileType[]; export: FileSummaryFileType[] }
> = {
  graduates: { import: ["excel", "csv"], export: ["excel", "csv", "pdf"] },
  users: { import: [], export: ["excel", "csv"] },
  academicData: { import: ["excel", "csv"], export: [] },
  statistics: { import: [], export: ["excel", "csv", "png"] },
  map: { import: [], export: ["png"] },
  logs: { import: [], export: ["excel", "csv"] },
};

export function getSummaryLayout(role: FileSummaryRole): SummaryLayout {
  if (role === "visitor") {
    return {
      pages: ["statistics", "map"],
      importTypes: [],
      exportTypes: ["excel", "csv", "png"],
    };
  }

  if (role === "secretariat") {
    return {
      pages: ["graduates", "academicData", "statistics", "map"],
      importTypes: ["excel", "csv"],
      exportTypes: ["excel", "csv", "pdf", "png"],
    };
  }

  return {
    pages: ["graduates", "users", "academicData", "statistics", "map", "logs"],
    importTypes: ["excel", "csv"],
    exportTypes: ["excel", "csv", "pdf", "png"],
  };
}

export function isSummaryCellSupported(
  page: FileSummaryPage,
  operation: SummaryOperation,
  fileType: FileSummaryFileType,
) {
  return summarySupportMatrix[page][operation].includes(fileType);
}

export function summaryCellValue(
  row: FileSummaryItem,
  operation: SummaryOperation,
  fileType: FileSummaryFileType,
) {
  if (!isSummaryCellSupported(row.page, operation, fileType)) return "-";
  return row[operation]?.[fileType] ?? 0;
}

export function upperFileType(value: string) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "xlsx" || normalized === "xls") return "Excel";
  if (normalized === "csv") return "CSV";
  if (normalized === "pdf") return "PDF";
  if (normalized === "png") return "PNG";
  return value;
}

type LocalizerArgs = {
  activeLang: "gr" | "en";
  t: TFunction;
  studyPrograms?: StudyProgram[];
};

export function createLogsLocalizer({
  activeLang,
  t,
  studyPrograms = [],
}: LocalizerArgs) {
  const toLocalizedAction = (value: unknown, log?: ActivityLog) => {
    const key = String(value ?? "").trim();
    if (
      (key === "export_csv" ||
        key === "export_xlsx" ||
        key === "export_logs") &&
      String(log?.entity_type ?? "logs").trim() === "logs"
    ) {
      return activeLang === "en" ? "Log export" : "Εξαγωγή καταγραφών";
    }
    if (key === "bulk_delete_graduates") {
      const details = parseDetails(log?.details);
      const deleted =
        details && typeof details === "object" ? Number(details.deleted) : NaN;
      if (Number.isFinite(deleted) && deleted > 0)
        return activeLang === "en"
          ? `Deleted ${deleted} graduates`
          : `Διαγραφή ${deleted} αποφοίτων`;
      return activeLang === "en" ? "Graduate deletion" : "Διαγραφή αποφοίτων";
    }
    return (
      actionLabels[activeLang][key as keyof (typeof actionLabels)["gr"]] ??
      key.replace(/_/g, " ")
    );
  };

  const localDetailLabel = (key: string) => {
    const labels =
      activeLang === "en"
        ? {
            file: "File",
            format: "Type",
            mail_sent: "Email sent",
            mail_error: "Email error",
            actor_role: "User role",
            actor_name: "User name",
            actor_email: "User email",
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
            raw_name: "Raw name",
            ids: "IDs",
            student_number: "Student number",
            ad_code: "Diploma number",
            first_name: "First name",
            last_name: "Last name",
            father_name: "Father name",
            degree_grade: "Degree grade",
            graduation_date: "Graduation date",
            oath_date: "Oath date",
            entry_year: "Entry year",
            birth_date: "Birth date",
            gender: "Gender",
            origin_country: "Country",
            origin_country_region_id: "Country",
            origin_periphery_region_id: "Region",
            origin_region_id: "Regional unit",
            origin_city_region_id: "Municipality",
            origin_municipality: "Municipality",
            origin_foreign_city: "Foreign city",
            email: "Email",
            target_name: "New user",
            target_role: "Role",
            role_id: "Role",
            is_active: "Active",
            approved: "Approved",
            code: "Code",
          }
        : {
            file: "Αρχείο",
            format: "Τύπος",
            mail_sent: "Στάλθηκε email",
            mail_error: "Σφάλμα email",
            actor_role: "Ρόλος χρήστη",
            actor_name: "Όνομα χρήστη",
            actor_email: "Email χρήστη",
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
            raw_name: "Αρχικό όνομα",
            ids: "IDs",
            student_number: "Αριθμός μητρώου",
            ad_code: "Αριθμός διπλώματος",
            first_name: "Όνομα",
            last_name: "Επώνυμο",
            father_name: "Πατρώνυμο",
            degree_grade: "Βαθμός πτυχίου",
            graduation_date: "Ημερομηνία λήψης διπλώματος",
            oath_date: "Ημερομηνία ορκωμοσίας",
            entry_year: "Έτος εισαγωγής",
            birth_date: "Ημερομηνία γέννησης",
            gender: "Φύλο",
            origin_country: "Χώρα",
            origin_country_region_id: "Χώρα",
            origin_periphery_region_id: "Περιφέρεια",
            origin_region_id: "Νομός",
            origin_city_region_id: "Δήμος",
            origin_municipality: "Δήμος",
            origin_foreign_city: "Πόλη εξωτερικού",
            email: "Email",
            target_name: "Νέος χρήστης",
            target_role: "Ρόλος",
            role_id: "Ρόλος",
            is_active: "Ενεργός",
            approved: "Εγκεκριμένος",
            code: "Κωδικός",
          };

    return labels[key as keyof typeof labels] ?? key;
  };

  const localFieldName = (value: string) => {
    const normalized = String(value ?? "").trim();
    if (!normalized) return "";
    return localDetailLabel(normalized);
  };

  const joinParts = (parts: Array<string | null | undefined>) =>
    parts
      .map((part) => String(part ?? "").trim())
      .filter(Boolean)
      .join(", ");

  const normalizeLookup = (value: unknown) =>
    String(value ?? "")
      .trim()
      .toLocaleLowerCase("el-GR");

  const studyProgramById = new Map(
    studyPrograms.map((program) => [Number(program.id), program]),
  );
  const studyProgramByCode = new Map(
    studyPrograms.map((program) => [normalizeLookup(program.code), program]),
  );
  const studyProgramByName = new Map<string, StudyProgram>();

  for (const program of studyPrograms) {
    for (const value of [program.name_el, program.name_en]) {
      const key = normalizeLookup(value);
      if (key && !studyProgramByName.has(key))
        studyProgramByName.set(key, program);
    }
  }

  const localizedStudyProgramName = (details: Record<string, any>) => {
    const directName = activeLang === "en" ? details.name_en : details.name_el;
    if (String(directName ?? "").trim()) return String(directName).trim();

    const id = Number(details.study_program_id);
    const byId = Number.isFinite(id) ? studyProgramById.get(id) : undefined;
    const byCode = studyProgramByCode.get(normalizeLookup(details.code));
    const byName = studyProgramByName.get(
      normalizeLookup(details.name ?? details.name_el ?? details.name_en),
    );
    const program = byId ?? byCode ?? byName;

    if (program) {
      const preferred = activeLang === "en" ? program.name_en : program.name_el;
      const fallback = activeLang === "en" ? program.name_el : program.name_en;
      return String(preferred ?? fallback ?? program.code ?? "").trim();
    }

    return String(
      details.name ?? details.name_el ?? details.name_en ?? "",
    ).trim();
  };

  const formatChangedFields = (value: unknown) => {
    const items = Array.isArray(value) ? value : [value];
    const names = items
      .map((item) => localFieldName(String(item ?? "")))
      .filter(Boolean);
    if (!names.length) return "";
    return activeLang === "en"
      ? `Changed fields: ${names.join(", ")}`
      : `Αλλαγμένα πεδία: ${names.join(", ")}`;
  };

  const localValue = (value: string) => {
    const normalized = String(value ?? "").trim();
    if (!normalized) return "";
    const lower = normalized.toLowerCase();
    if (lower === "true") return activeLang === "en" ? "Yes" : "Ναι";
    if (lower === "false") return activeLang === "en" ? "No" : "Όχι";
    if (normalized === "visitor") return t("summary.roles.visitor");
    if (normalized === "secretariat") return t("summary.roles.secretariat");
    if (normalized === "super_admin") return t("summary.roles.admin");
    if (normalized === "graduates") return t("summary.pages.graduates");
    if (normalized === "academicData") return t("summary.pages.academicData");
    if (normalized === "statistics") return t("summary.pages.statistics");
    if (normalized === "map") return t("summary.pages.map");
    if (normalized === "logs") return t("summary.pages.logs");
    if (normalized === "pending")
      return activeLang === "en" ? "Pending" : "Σε εκκρεμότητα";
    if (normalized === "resolved")
      return activeLang === "en" ? "Resolved" : "Αντιστοιχισμένη";
    if (normalized === "dismissed")
      return activeLang === "en" ? "Dismissed" : "Απορρίφθηκε";
    if (normalized === "city") return activeLang === "en" ? "City" : "Πόλη";
    if (normalized === "periphery")
      return activeLang === "en" ? "Periphery" : "Περιφέρεια";
    if (["xls", "xlsx", "excel", "csv", "pdf", "png"].includes(normalized))
      return upperFileType(normalized);
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
    const format = upperFileType(
      String(details.format ?? details.file_type ?? "").trim(),
    );
    const count = details.count ?? details.exported;
    const selected = details.selected;
    const page = localValue(String(details.page ?? ""));
    const parts: string[] = [];

    if (format) parts.push(format);
    if (count !== null && count !== undefined && count !== "")
      parts.push(
        activeLang === "en" ? `${count} records` : `${count} εγγραφές`,
      );
    if (
      selected !== null &&
      selected !== undefined &&
      selected !== "" &&
      Number(selected) > 0
    ) {
      parts.push(
        activeLang === "en" ? `${selected} selected` : `${selected} επιλεγμένα`,
      );
    }
    if (page)
      parts.push(activeLang === "en" ? `Page: ${page}` : `Σελίδα: ${page}`);
    return parts.join(", ");
  };

  const formatCreateUserDetails = (details: Record<string, any>) => {
    const targetName = String(details.target_name ?? details.name ?? "").trim();
    const role = String(details.target_role ?? details.role ?? "").trim();
    const targetRole = role ? localValue(role) || role : "";
    if (!targetName && !targetRole) return "";
    return activeLang === "en"
      ? joinParts([
          targetName ? `New user: ${targetName}` : "",
          targetRole ? `Role: ${targetRole}` : "",
        ])
      : joinParts([
          targetName ? `Νέος χρήστης: ${targetName}` : "",
          targetRole ? `Ρόλος: ${targetRole}` : "",
        ]);
  };

  const formatImportDetails = (details: Record<string, any>) => {
    const file = String(details.file ?? details.filename ?? "").trim();
    const parts: string[] = [];
    if (file) parts.push(`${localDetailLabel("file")}: ${file}`);
    if (
      details.total_rows !== null &&
      details.total_rows !== undefined &&
      details.total_rows !== ""
    )
      parts.push(
        activeLang === "en"
          ? `Total rows: ${details.total_rows}`
          : `Σύνολο γραμμών: ${details.total_rows}`,
      );
    if (
      details.inserted !== null &&
      details.inserted !== undefined &&
      details.inserted !== ""
    )
      parts.push(
        activeLang === "en"
          ? `New: ${details.inserted}`
          : `Νέες: ${details.inserted}`,
      );
    if (
      details.updated !== null &&
      details.updated !== undefined &&
      details.updated !== ""
    )
      parts.push(
        activeLang === "en"
          ? `Updated: ${details.updated}`
          : `Ενημερωμένες: ${details.updated}`,
      );
    if (
      details.skipped !== null &&
      details.skipped !== undefined &&
      details.skipped !== ""
    )
      parts.push(
        activeLang === "en"
          ? `Skipped: ${details.skipped}`
          : `Παραλείφθηκαν: ${details.skipped}`,
      );
    if (
      details.errors !== null &&
      details.errors !== undefined &&
      details.errors !== ""
    )
      parts.push(
        activeLang === "en"
          ? `Errors: ${details.errors}`
          : `Σφάλματα: ${details.errors}`,
      );
    return parts.join(", ");
  };

  const formatLogDetails = (log: ActivityLog) => {
    const action = String(log.action || "").trim();
    if (detailFreeActions.has(action)) return "";

    const details = parseDetails(log.details);
    if (!details) return "";
    if (typeof details === "string") return localValue(details);

    if (
      ["διαγραφή χρήστη", "delete_user", "deactivate_user"].includes(action)
    ) {
      return String(details.target_name ?? "").trim();
    }

    if (action === "create_user") return formatCreateUserDetails(details);

    if (action === "request_password_reset") {
      const parts: string[] = [];
      if (details.mail_sent !== null && details.mail_sent !== undefined && details.mail_sent !== "") {
        parts.push(`${localDetailLabel("mail_sent")}: ${localValue(String(details.mail_sent))}`);
      }
      if (details.mail_error !== null && details.mail_error !== undefined && details.mail_error !== "") {
        parts.push(`${localDetailLabel("mail_error")}: ${String(details.mail_error)}`);
      }
      return parts.join(", ");
    }

    if (action === "bulk_delete_graduates") return "";

    const studentNumber = String(details.student_number ?? "").trim();
    if (studentNumber)
      return `${localDetailLabel("student_number")}: ${studentNumber}`;
    if (action === "import_graduates") return formatImportDetails(details);

    if (
      [
        "export_graduates",
        "export_users_csv",
        "export_users_xlsx",
        "export_csv",
        "export_xlsx",
        "export_pdf",
        "statistics_export",
        "map_export",
      ].includes(action)
    ) {
      const exportText = formatExportDetails(details);
      if (exportText) return exportText;
    }

    if (
      details.changed !== null &&
      details.changed !== undefined &&
      details.changed !== ""
    ) {
      const changedText = formatChangedFields(details.changed);
      if (changedText) return changedText;
    }

    if (action === "update_graduate") return "";

    if (details.code || details.name || details.name_el || details.name_en) {
      const code = String(details.code ?? "").trim();
      const name = localizedStudyProgramName(details);
      return joinParts([
        code ? `${localDetailLabel("code")}: ${code}` : "",
        name ? `${localDetailLabel("name")}: ${name}` : "",
      ]);
    }

    const plainPairs: Array<[string, any]> = [
      ["file", details.file ?? details.filename],
      ["mail_sent", details.mail_sent],
      ["mail_error", details.mail_error],
      ["role", details.role],
      ["status", details.status],
      ["page", details.page],
      ["study_program", details.study_program],
      ["study_program_id", details.study_program_id],
      ["reason", details.reason],
      ["parent_id", details.parent_id],
      ["raw_name", details.raw_name],
      ["missing", details.missing],
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
      ["limit", details.limit],
    ];

    const parts: string[] = [];

    for (const [key, value] of plainPairs) {
      if (value === null || value === undefined || value === "") continue;
      const rendered = Array.isArray(value)
        ? value
            .map((item) => localValue(String(item)))
            .filter(Boolean)
            .join(", ")
        : localValue(String(value)) || String(value);
      if (rendered) parts.push(`${localDetailLabel(key)}: ${rendered}`);
    }

    for (const [key, value] of counterPairs) {
      if (value === null || value === undefined || value === "") continue;
      parts.push(`${localDetailLabel(key)}: ${value}`);
    }

    if (
      details.ids !== null &&
      details.ids !== undefined &&
      details.ids !== ""
    ) {
      const rendered = Array.isArray(details.ids)
        ? details.ids
            .map((item: any) => String(item ?? "").trim())
            .filter(Boolean)
            .join(", ")
        : String(details.ids);
      if (rendered) parts.push(`${localDetailLabel("ids")}: ${rendered}`);
    }

    if (parts.length) return parts.join(", ");

    return Object.entries(details)
      .filter(
        ([key, value]) => !hiddenDetailKeys.has(key) && value !== null && value !== undefined && value !== "",
      )
      .slice(0, 5)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${localDetailLabel(key)}: ${value
            .map((item) => String(item ?? "").trim())
            .filter(Boolean)
            .join(", ")}`;
        }
        return `${localDetailLabel(key)}: ${typeof value === "string" ? localValue(value) || value : String(value)}`;
      })
      .join(", ");
  };

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const locale = activeLang === "en" ? "en-GB" : "el-GR";
    const baseOptions = { timeZone: "Europe/Athens" } as const;
    const time = new Intl.DateTimeFormat(locale, {
      ...baseOptions,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
    const day = new Intl.DateTimeFormat(locale, {
      ...baseOptions,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
    return `${time}, ${day}`;
  };

  return {
    formatDateTime,
    formatLogDetails,
    localValue,
    pageLabel: (pageKey: FileSummaryPage) => {
      if (pageKey === "graduates") return t("summary.pages.graduates");
      if (pageKey === "users") return t("summary.pages.users");
      if (pageKey === "academicData") return t("summary.pages.academicData");
      if (pageKey === "statistics") return t("summary.pages.statistics");
      if (pageKey === "map") return t("summary.pages.map");
      return t("summary.pages.logs");
    },
    fileTypeLabel: (fileType: FileSummaryFileType) => {
      if (fileType === "excel") return t("summary.fileTypes.excel");
      if (fileType === "csv") return t("summary.fileTypes.csv");
      if (fileType === "pdf") return t("summary.fileTypes.pdf");
      return t("summary.fileTypes.png");
    },
    toLocalizedAction,
  };
}
