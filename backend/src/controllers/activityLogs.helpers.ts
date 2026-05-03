import type { Request } from "express";
import { Op } from "sequelize";
import XLSX from "xlsx";
import { sanitizeExportCell } from "../utils/exportSafety";

export const MAX_PAGE = 1_000_000;
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;
export const EXPORT_LIMIT = 5000;

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
    import_region_cities: "Εισαγωγή πόλεων"
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
    import_region_cities: "City import"
  }
} as const;

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function toInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

export function nonEmptyString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function parseLogDetails(value: unknown) {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function csvEscape(value: unknown, delimiter = ",") {
  const text = value === null || value === undefined ? "" : String(sanitizeExportCell(value));
  const shouldQuote = text.includes('"') || text.includes("\n") || text.includes("\r") || text.includes(delimiter);
  return shouldQuote ? '"' + text.replace(/"/g, '""') + '"' : text;
}

export function buildDelimitedText(rows: Array<Record<string, unknown>>, delimiter = "\t") {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0] ?? {});
  const lines = [headers.map((header) => csvEscape(header, delimiter)).join(delimiter)];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row?.[header], delimiter)).join(delimiter));
  }
  return lines.join("\r\n");
}

export function buildUtf16CsvBuffer(text: string) {
  return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")]);
}

export function applySheetLayout(ws: XLSX.WorkSheet, rows: Array<Record<string, unknown>>) {
  const headers = rows.length ? Object.keys(rows[0] ?? {}) : [];
  ws["!cols"] = headers.map((header) => {
    let width = String(header ?? "").length;
    for (const row of rows) {
      const value = row?.[header];
      const cellText = value == null ? "" : String(value);
      if (cellText.length > width) width = cellText.length;
    }
    const isDetails = String(header).toLowerCase().includes("details") || String(header).includes("Λεπτομέρειες");
    return { wch: Math.min(Math.max(width + 2, 12), isDetails ? 90 : 42) };
  });

  if (!ws["!ref"]) return;

  const range = XLSX.utils.decode_range(ws["!ref"]);
  ws["!autofilter"] = { ref: ws["!ref"] };
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: XLSX.utils.encode_cell({ r: 1, c: 0 }), activePane: "bottomLeft", state: "frozen" } as any;

  for (let c = range.s.c; c <= range.e.c; c += 1) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c });
    const cell = ws[cellRef];
    if (!cell) continue;
    cell.s = { ...(cell.s || {}), font: { ...(cell.s?.font || {}), bold: true }, alignment: { ...(cell.s?.alignment || {}), vertical: "center", wrapText: true } } as any;
  }
}

export function buildLogFilters(req: Request) {
  const where: Record<string | symbol, unknown> = {};
  const userId = req.query.user_id;
  const action = nonEmptyString(req.query.action);
  const entityType = nonEmptyString(req.query.entity_type);
  const keyword = nonEmptyString(req.query.q);

  if (userId !== undefined && userId !== "") where.user_id = Number(userId);

  if (action === "export_logs") {
    where[Op.and] = [
      ...(Array.isArray(where[Op.and]) ? where[Op.and] as any[] : []),
      { [Op.or]: [{ action: "export_csv", entity_type: "logs" }, { action: "export_xlsx", entity_type: "logs" }] }
    ];
  } else if (action) {
    where.action = { [Op.like]: `%${action}%` };
  }

  if (entityType) where.entity_type = entityType;
  if (keyword) {
    where[Op.or] = [{ action: { [Op.like]: `%${keyword}%` } }, { entity_type: { [Op.like]: `%${keyword}%` } }];
  }


  return where;
}

export function toCsvRow(row: any) {
  return [row.id, row.created_at, row.user_id ?? "", row.action ?? "", row.entity_type ?? "", row.entity_id ?? "", JSON.stringify(row.details ?? null)]
    .map((value) => csvEscape(value))
    .join(",");
}

export function getRoleFilter(req: Request) {
  const role = String(req.query.role ?? "all").trim().toLowerCase();
  if (role === "secretariat" || role === "super_admin" || role === "visitor") return role;
  return "all";
}

export function getRoleBucket(row: any) {
  const details = parseLogDetails(row?.details);
  const detailRole = String((details as any)?.actor_role ?? "").trim().toLowerCase();
  if (detailRole === "secretariat") return "secretariat";
  if (detailRole === "super_admin") return "super_admin";
  if (detailRole === "visitor") return "visitor";

  const role = String(row?.user?.role ?? "").trim().toLowerCase();
  if (role === "secretariat") return "secretariat";
  if (role === "super_admin") return "super_admin";
  if (row?.user_id == null) return "visitor";
  return "unknown";
}

export function matchesRole(row: any, roleFilter: string) {
  return roleFilter === "all" ? true : getRoleBucket(row) === roleFilter;
}

export function getLogPage(row: any) {
  const action = String(row?.action ?? "").trim();
  const entityType = String(row?.entity_type ?? "").trim();

  if (action === "import_graduates" || action === "export_graduates" || entityType === "graduate") return "graduates";
  if (["import_study_programs", "import_region_peripheries", "import_region_cities"].includes(action) || ["study_program", "region", "regions"].includes(entityType)) return "academicData";
  if (action === "statistics_export" || entityType === "statistics") return "statistics";
  if (action === "map_export" || entityType === "map") return "map";
  if (entityType === "logs") return "logs";
  return null;
}

export function getOperation(row: any) {
  const action = String(row?.action ?? "").trim();
  if (action.startsWith("import_") || action === "upload") return "import";
  if (action.includes("export") || action === "map_export" || action === "statistics_export") return "export";
  return null;
}

export function getFormatFromFilename(name: string) {
  const normalized = String(name ?? "").trim().toLowerCase();
  if (!normalized.includes(".")) return null;
  const ext = normalized.split(".").pop() || "";
  if (ext === "xls" || ext === "xlsx") return "excel";
  if (ext === "csv" || ext === "tsv") return "csv";
  if (ext === "pdf") return "pdf";
  if (ext === "png") return "png";
  return null;
}

export function getFileType(row: any) {
  const action = String(row?.action ?? "").trim();
  const details = row?.details && typeof row.details === "object" ? row.details : {};
  const detailFormat = String((details as any)?.format ?? "").trim().toLowerCase();
  const detailFile = String((details as any)?.file ?? (details as any)?.filename ?? "").trim();

  if (["xls", "xlsx", "excel"].includes(detailFormat)) return "excel";
  if (["csv", "tsv"].includes(detailFormat)) return "csv";
  if (detailFormat === "pdf") return "pdf";
  if (detailFormat === "png") return "png";

  const byFile = getFormatFromFilename(detailFile);
  if (byFile) return byFile;
  if (["import_graduates", "import_study_programs", "import_region_peripheries", "import_region_cities"].includes(action)) return "excel";
  if (action === "export_xlsx") return "excel";
  if (action === "export_csv") return "csv";
  if (action === "export_pdf") return "pdf";
  return null;
}

export function getLanguage(req: Request) {
  const lang = String(req.query.lang ?? "gr").trim().toLowerCase();
  return lang.startsWith("en") ? "en" : "gr";
}

export function localDetailLabel(lang: "gr" | "en", key: string) {
  const labels = lang === "en"
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
        study_program_id: "Study program",
        reason: "Reason",
        changed: "Changed fields",
        errors: "Errors",
        selected: "Selected",
        limit: "Limit",
        missing: "Missing",
        name: "Name",
        name_el: "Name (Greek)",
        parent_id: "Parent region",
        unresolved_id: "Unresolved item",
        raw_name: "Original name",
        ids: "IDs",
        student_number: "Student number",
        first_name: "First name",
        last_name: "Last name",
        father_name: "Father name",
        degree_grade: "Degree grade",
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
        study_program_id: "Πρόγραμμα σπουδών",
        reason: "Λόγος",
        changed: "Αλλαγμένα πεδία",
        errors: "Σφάλματα",
        selected: "Επιλεγμένα",
        limit: "Όριο",
        missing: "Λείπουν",
        name: "Όνομα",
        name_el: "Όνομα (Ελληνικά)",
        parent_id: "Γονική περιοχή",
        unresolved_id: "Εκκρεμότητα",
        raw_name: "Αρχικό όνομα",
        ids: "IDs",
        student_number: "Αριθμός μητρώου",
        first_name: "Όνομα",
        last_name: "Επώνυμο",
        father_name: "Πατρώνυμο",
        degree_grade: "Βαθμός πτυχίου",
        graduation_date: "Ημερομηνία λήψης διπλώματος",
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
}

export function upperFileType(value: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "xlsx" || normalized === "xls") return "Excel";
  if (normalized === "csv") return "CSV";
  if (normalized === "pdf") return "PDF";
  if (normalized === "png") return "PNG";
  return value;
}

export function localValue(lang: "gr" | "en", value: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  if (normalized === "visitor") return lang === "en" ? "Visitor" : "Επισκέπτης";
  if (normalized === "secretariat") return lang === "en" ? "Secretariat" : "Γραμματεία";
  if (normalized === "super_admin") return lang === "en" ? "Administrator" : "Διαχειριστής";
  if (normalized === "graduates") return lang === "en" ? "Graduates" : "Απόφοιτοι";
  if (normalized === "academicData") return lang === "en" ? "Academic data" : "Ακαδημαϊκά δεδομένα";
  if (normalized === "regions") return lang === "en" ? "Regions" : "Περιοχές";
  if (normalized === "statistics") return lang === "en" ? "Statistics" : "Στατιστικά";
  if (normalized === "map") return lang === "en" ? "Map" : "Χάρτης";
  if (normalized === "logs") return lang === "en" ? "Logs" : "Καταγραφές";
  return normalized;
}

export function parseDetails(value: unknown) {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return trimmed;
  }
}

export function getLocalizedAction(lang: "gr" | "en", value: unknown, log?: any) {
  const key = String(value ?? "").trim();
  if ((key === "export_csv" || key === "export_xlsx") && String(log?.entity_type ?? "").trim() === "logs") {
    return lang === "en" ? "Log export" : "Εξαγωγή καταγραφών";
  }
  return actionLabels[lang][key as keyof typeof actionLabels.gr] ?? key.replace(/_/g, " ");
}

export function getLocalizedDetails(lang: "gr" | "en", log: any) {
  const action = String(log?.action ?? "").trim();
  if (["login", "logout", "register", "change_password"].includes(action)) return "";

  const details = parseDetails(log?.details);
  if (!details) return "";
  if (typeof details === "string") return localValue(lang, details);

  if (["διαγραφή χρήστη", "delete_user", "deactivate_user"].includes(action)) {
    return String((details as any).target_name ?? "").trim();
  }

  const studentNumber = String((details as any).student_number ?? "").trim();
  if (studentNumber) return `${localDetailLabel(lang, "student_number")}: ${studentNumber}`;

  if (action === "import_graduates") {
    const file = String((details as any).file ?? (details as any).filename ?? "").trim();
    const parts: string[] = [];
    if (file) parts.push(`${localDetailLabel(lang, "file")}: ${file}`);
    for (const key of ["total_rows", "inserted", "updated", "skipped", "errors"]) {
      const value = (details as any)[key];
      if (value !== null && value !== undefined && value !== "") parts.push(`${localDetailLabel(lang, key)}: ${value}`);
    }
    return parts.join(", ");
  }

  if (["export_graduates", "export_csv", "export_xlsx", "export_pdf", "statistics_export", "map_export"].includes(action)) {
    const format = upperFileType(String((details as any).format ?? (details as any).file_type ?? "").trim());
    const count = (details as any).count ?? (details as any).exported;
    const selected = (details as any).selected;
    const page = localValue(lang, String((details as any).page ?? ""));
    const parts: string[] = [];
    if (format) parts.push(format);
    if (count !== null && count !== undefined && count !== "") parts.push(lang === "en" ? `${count} records` : `${count} εγγραφές`);
    if (selected !== null && selected !== undefined && selected !== "" && Number(selected) > 0) parts.push(lang === "en" ? `${selected} selected` : `${selected} επιλεγμένα`);
    if (page) parts.push(lang === "en" ? `Page: ${page}` : `Σελίδα: ${page}`);
    if (parts.length) return parts.join(", ");
  }

  const changed = (details as any).changed;
  if (changed !== null && changed !== undefined && changed !== "") {
    const items = Array.isArray(changed) ? changed : [changed];
    const names = items.map((item) => localDetailLabel(lang, String(item ?? "").trim())).filter(Boolean);
    if (names.length) return lang === "en" ? `Changed fields: ${names.join(", ")}` : `Αλλαγμένα πεδία: ${names.join(", ")}`;
  }

  if ((details as any).code || (details as any).name || (details as any).name_el) {
    const code = String((details as any).code ?? "").trim();
    const name = String((details as any).name ?? (details as any).name_el ?? "").trim();
    return [code ? `${localDetailLabel(lang, "code")}: ${code}` : "", name ? `${localDetailLabel(lang, "name")}: ${name}` : ""].filter(Boolean).join(", ");
  }

  const plainPairs: Array<[string, any]> = [
    ["file", (details as any).file ?? (details as any).filename],
    ["role", (details as any).role],
    ["status", (details as any).status],
    ["page", (details as any).page],
    ["study_program", (details as any).study_program],
    ["study_program_id", (details as any).study_program_id],
    ["reason", (details as any).reason],
    ["parent_id", (details as any).parent_id],
    ["unresolved_id", (details as any).unresolved_id],
    ["raw_name", (details as any).raw_name],
    ["missing", (details as any).missing]
  ];

  const counterPairs: Array<[string, any]> = [
    ["count", (details as any).count],
    ["total_rows", (details as any).total_rows],
    ["inserted", (details as any).inserted],
    ["updated", (details as any).updated],
    ["skipped", (details as any).skipped],
    ["deleted", (details as any).deleted],
    ["exported", (details as any).exported],
    ["errors", (details as any).errors],
    ["selected", (details as any).selected],
    ["limit", (details as any).limit]
  ];

  const parts: string[] = [];

  for (const [key, value] of plainPairs) {
    if (value === null || value === undefined || value === "") continue;
    const rendered = Array.isArray(value)
      ? value.map((item) => localValue(lang, String(item))).filter(Boolean).join(", ")
      : localValue(lang, String(value)) || String(value);
    if (rendered) parts.push(`${localDetailLabel(lang, key)}: ${rendered}`);
  }

  for (const [key, value] of counterPairs) {
    if (value === null || value === undefined || value === "") continue;
    parts.push(`${localDetailLabel(lang, key)}: ${value}`);
  }

  const ids = (details as any).ids;
  if (ids !== null && ids !== undefined && ids !== "") {
    const rendered = Array.isArray(ids) ? ids.map((item) => String(item ?? "").trim()).filter(Boolean).join(", ") : String(ids);
    if (rendered) parts.push(`${localDetailLabel(lang, "ids")}: ${rendered}`);
  }

  if (parts.length) return parts.join(", ");

  return Object.entries(details)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 5)
    .map(([key, value]) => {
      if (Array.isArray(value)) return `${localDetailLabel(lang, key)}: ${value.map((item) => String(item ?? "").trim()).filter(Boolean).join(", ")}`;
      const rendered = typeof value === "string" ? (localValue(lang, value) || value) : String(value);
      return `${localDetailLabel(lang, key)}: ${rendered}`;
    })
    .join(", ");
}

export function getActorLabel(log: any) {
  const firstName = String(log?.user?.first_name ?? "").trim();
  const lastName = String(log?.user?.last_name ?? "").trim();
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) return fullName;
  if (log?.user?.email) return String(log.user.email);
  return log?.user_id == null ? "Visitor" : "";
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const locale = "en-GB";
  const time = new Intl.DateTimeFormat(locale, { timeZone: "Europe/Athens", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date);
  const day = new Intl.DateTimeFormat(locale, { timeZone: "Europe/Athens", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return `${day} ${time}`;
}

export function findLogsForExport(rows: any[], roleFilter: string) {
  return rows.filter((row) => matchesRole(row, roleFilter)).slice(0, EXPORT_LIMIT);
}

export function getExportRows(rows: any[], lang: "gr" | "en") {
  return rows.map((row) => ({
    [lang === "en" ? "Date" : "Ημερομηνία"]: formatDateTime(String(row.created_at ?? "")),
    [lang === "en" ? "User" : "Χρήστης"]: getActorLabel(row),
    [lang === "en" ? "Role" : "Ρόλος"]: localValue(lang, String(row?.user?.role ?? row?.details?.actor_role ?? row?.user_id == null ? "visitor" : "")),
    [lang === "en" ? "Action" : "Ενέργεια"]: getLocalizedAction(lang, row.action, row),
    [lang === "en" ? "Entity" : "Αντικείμενο"]: localValue(lang, String(row.entity_type ?? "")),
    [lang === "en" ? "Details" : "Λεπτομέρειες"]: getLocalizedDetails(lang, row),
  }));
}
