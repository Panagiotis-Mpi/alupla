// Helpers για logs: φίλτρα, ελληνικά/αγγλικά labels, μορφοποίηση και export rows.
import type { Request } from "express";
import { Op } from "sequelize";
import XLSX from "xlsx";
import { sanitizeExportCell } from "../utils/exportSafety";

export const MAX_PAGE = 1_000_000;
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;
export const EXPORT_LIMIT = 5000;

const hiddenDetailKeys = new Set(["actor_role", "actor_name", "actor_email"]);

const actionLabels = {
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

const exportDetailValueLabels = {
  gr: {
    demographics: "Πλήθος και φύλο",
    academic: "Ακαδημαϊκά στοιχεία",
    geography: "Γεωγραφική κατανομή",
    compare: "Σύγκριση",
    byYear: "Πλήθος αποφοίτων ανά έτος αποφοίτησης",
    countByEntryYear: "Πλήθος αποφοίτων ανά έτος εισαγωγής",
    birthYear: "Πλήθος αποφοίτων ανά έτος γέννησης",
    genderTotal: "Κατανομή φύλου",
    gender: "Κατανομή φύλου ανά έτος αποφοίτησης",
    gradeDistribution: "Κατανομή βαθμολογίας αποφοίτησης",
    gradeDistributionByGender: "Κατανομή βαθμολογίας αποφοίτησης ανά φύλο",
    timeToDegreeDistribution: "Κατανομή διάρκειας σπουδών",
    gradeByYear: "Μέση βαθμολογία αποφοίτησης ανά έτος",
    gradeByRegion: "Μέση βαθμολογία αποφοίτησης ανά περιφέρεια καταγωγής",
    timeToDegreeByEntryYear: "Μέση διάρκεια σπουδών ανά έτος εισαγωγής",
    timeToDegreeByRegion: "Μέση διάρκεια σπουδών ανά περιφέρεια καταγωγής",
    originRegion: "Πλήθος αποφοίτων ανά περιφέρεια καταγωγής",
    genderByRegion: "Κατανομή φύλου ανά περιφέρεια καταγωγής",
    originMunicipality: "Πλήθος αποφοίτων ανά πόλη καταγωγής",
    genderByMunicipality: "Κατανομή φύλου ανά πόλη καταγωγής",
    originCountry: "Πλήθος αποφοίτων ανά χώρα καταγωγής",
    abroadShare: "Κατανομή αποφοίτων Ελλάδας και εξωτερικού",
    abroadByYear: "Κατανομή αποφοίτων Ελλάδας και εξωτερικού ανά έτος αποφοίτησης",
    timeToDegreeByNomos: "Μέση διάρκεια σπουδών ανά νομό καταγωγής",
    "greece:count": "Ελλάδα, Πλήθος αποφοίτων",
    "abroad:count": "Εξωτερικό, Πλήθος αποφοίτων",
    "greece:dominant_gender": "Ελλάδα, Γεωκατανομή φύλου",
    "abroad:dominant_gender": "Εξωτερικό, Γεωκατανομή φύλου",
  },
  en: {
    demographics: "Counts and gender",
    academic: "Academic insights",
    geography: "Geographic distribution",
    compare: "Compare",
    byYear: "Graduates by graduation year",
    countByEntryYear: "Graduates by entry year",
    birthYear: "Graduates by birth year",
    genderTotal: "Gender distribution",
    gender: "Gender distribution by graduation year",
    gradeDistribution: "Graduation grade distribution",
    gradeDistributionByGender: "Graduation grade distribution by gender",
    timeToDegreeDistribution: "Study duration distribution",
    gradeByYear: "Average graduation grade by year",
    gradeByRegion: "Average graduation grade by region of origin",
    timeToDegreeByEntryYear: "Average study duration by entry year",
    timeToDegreeByRegion: "Average study duration by region of origin",
    originRegion: "Graduates by region of origin",
    genderByRegion: "Gender distribution by region of origin",
    originMunicipality: "Graduates by city of origin",
    genderByMunicipality: "Gender distribution by city of origin",
    originCountry: "Graduates by country of origin",
    abroadShare: "Greece and abroad graduate distribution",
    abroadByYear: "Greece and abroad graduates distribution by graduation year",
    timeToDegreeByNomos: "Average study duration by regional unit of origin",
    "greece:count": "Greece, Graduate count",
    "abroad:count": "Abroad, Graduate count",
    "greece:dominant_gender": "Greece, Gender geo distribution",
    "abroad:dominant_gender": "Abroad, Gender geo distribution",
  },
} as const;

// Περιορίζει έναν αριθμό μέσα σε ασφαλές min/max.
export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

// Μετατρέπει input σε ακέραιο με fallback.
export function toInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

// Επιστρέφει καθαρό string ή undefined αν είναι κενό.
export function nonEmptyString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : undefined;
}

// Διαβάζει details log είτε είναι JSON string είτε object.
function parseLogDetails(value: unknown) {
  if (value && typeof value === "object")
    return value as Record<string, unknown>;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// Κάνει ασφαλή τιμή CSV για να μη χαλάσει η γραμμή export.
function csvEscape(value: unknown, delimiter = ",") {
  const text =
    value === null || value === undefined
      ? ""
      : String(sanitizeExportCell(value));
  const shouldQuote =
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r") ||
    text.includes(delimiter);
  return shouldQuote ? '"' + text.replace(/"/g, '""') + '"' : text;
}

// Φτιάχνει CSV/TSV text από rows και delimiter.
export function buildDelimitedText(
  rows: Array<Record<string, unknown>>,
  delimiter = "\t",
) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0] ?? {});
  const lines = [
    headers.map((header) => csvEscape(header, delimiter)).join(delimiter),
  ];
  for (const row of rows) {
    lines.push(
      headers
        .map((header) => csvEscape(row?.[header], delimiter))
        .join(delimiter),
    );
  }
  return lines.join("\r\n");
}

// Μετατρέπει CSV text σε UTF-16 buffer για σωστά ελληνικά στο Excel.
export function buildUtf16CsvBuffer(text: string) {
  return Buffer.concat([
    Buffer.from([0xff, 0xfe]),
    Buffer.from(text, "utf16le"),
  ]);
}

// Ρυθμίζει πλάτη στηλών στο Excel export.
export function applySheetLayout(
  ws: XLSX.WorkSheet,
  rows: Array<Record<string, unknown>>,
) {
  const headers = rows.length ? Object.keys(rows[0] ?? {}) : [];
  ws["!cols"] = headers.map((header) => {
    let width = String(header ?? "").length;
    for (const row of rows) {
      const value = row?.[header];
      const cellText = value == null ? "" : String(value);
      if (cellText.length > width) width = cellText.length;
    }
    const isDetails =
      String(header).toLowerCase().includes("details") ||
      String(header).includes("Λεπτομέρειες");
    return { wch: Math.min(Math.max(width + 2, 12), isDetails ? 90 : 42) };
  });

  if (!ws["!ref"]) return;

  const range = XLSX.utils.decode_range(ws["!ref"]);
  ws["!autofilter"] = { ref: ws["!ref"] };
  ws["!freeze"] = {
    xSplit: 0,
    ySplit: 1,
    topLeftCell: XLSX.utils.encode_cell({ r: 1, c: 0 }),
    activePane: "bottomLeft",
    state: "frozen",
  } as any;

  for (let c = range.s.c; c <= range.e.c; c += 1) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c });
    const cell = ws[cellRef];
    if (!cell) continue;
    cell.s = {
      ...(cell.s || {}),
      font: { ...(cell.s?.font || {}), bold: true },
      alignment: {
        ...(cell.s?.alignment || {}),
        vertical: "center",
        wrapText: true,
      },
    } as any;
  }
}

// Μετατρέπει φίλτρα UI των logs σε Sequelize where query.
export function buildLogFilters(req: Request) {
  const where: Record<string | symbol, unknown> = {};
  const userId = req.query.user_id;
  const action = nonEmptyString(req.query.action);
  const entityType = nonEmptyString(req.query.entity_type);
  const keyword = nonEmptyString(req.query.q);

  if (userId !== undefined && userId !== "") where.user_id = Number(userId);

  if (action === "export_users") {
    where[Op.and] = [
      ...(Array.isArray(where[Op.and]) ? (where[Op.and] as any[]) : []),
      {
        [Op.or]: [
          { action: "export_users_csv" },
          { action: "export_users_xlsx" },
        ],
      },
    ];
  } else if (action === "export_logs") {
    where[Op.and] = [
      ...(Array.isArray(where[Op.and]) ? (where[Op.and] as any[]) : []),
      {
        [Op.or]: [
          { action: "export_csv", entity_type: "logs" },
          { action: "export_xlsx", entity_type: "logs" },
        ],
      },
    ];
  } else if (action) {
    where.action = { [Op.like]: `%${action}%` };
  }

  if (entityType) where.entity_type = entityType;
  if (keyword) {
    where[Op.or] = [
      { action: { [Op.like]: `%${keyword}%` } },
      { entity_type: { [Op.like]: `%${keyword}%` } },
    ];
  }

  return where;
}


// Διαβάζει φίλτρο ρόλου από το request.
export function getRoleFilter(req: Request) {
  const role = String(req.query.role ?? "all")
    .trim()
    .toLowerCase();
  if (role === "secretariat" || role === "super_admin" || role === "visitor")
    return role;
  return "all";
}

// Ομαδοποιεί log ανά ρόλο actor για φίλτρα/προβολή.
function getRoleBucket(row: any) {
  const details = parseLogDetails(row?.details);
  const detailRole = String((details as any)?.actor_role ?? "")
    .trim()
    .toLowerCase();
  if (detailRole === "secretariat") return "secretariat";
  if (detailRole === "super_admin") return "super_admin";
  if (detailRole === "visitor") return "visitor";

  const role = String(row?.user?.role ?? "")
    .trim()
    .toLowerCase();
  if (role === "secretariat") return "secretariat";
  if (role === "super_admin") return "super_admin";
  if (row?.user_id == null) return "visitor";
  return "unknown";
}

// Ελέγχει αν ένα log ανήκει στον ζητούμενο ρόλο.
export function matchesRole(row: any, roleFilter: string) {
  return roleFilter === "all" ? true : getRoleBucket(row) === roleFilter;
}

// Διαβάζει page/limit για τη λίστα logs.
export function getLogPage(row: any) {
  const action = String(row?.action ?? "").trim();
  const entityType = String(row?.entity_type ?? "").trim();

  if (
    action === "import_graduates" ||
    action === "export_graduates" ||
    entityType === "graduate"
  )
    return "graduates";
  if (action === "export_users_csv" || action === "export_users_xlsx")
    return "users";
  if (
    [
      "import_study_programs",
      "import_program_directions",
      "import_region_peripheries",
      "import_region_cities",
    ].includes(action) ||
    ["study_program", "program_direction", "region", "regions", "region_periphery", "region_city"].includes(entityType)
  )
    return "academicData";
  if (action === "statistics_export" || entityType === "statistics")
    return "statistics";
  if (action === "map_export" || entityType === "map") return "map";
  if (entityType === "logs") return "logs";
  return null;
}

// Εντοπίζει αν το log είναι import, export ή άλλη ενέργεια.
export function getOperation(row: any) {
  const action = String(row?.action ?? "").trim();
  if (action.startsWith("import_") || action === "upload") return "import";
  if (
    action.includes("export") ||
    action === "map_export" ||
    action === "statistics_export"
  )
    return "export";
  return null;
}

// Βρίσκει format αρχείου από filename.
function getFormatFromFilename(name: string) {
  const normalized = String(name ?? "")
    .trim()
    .toLowerCase();
  if (!normalized.includes(".")) return null;
  const ext = normalized.split(".").pop() || "";
  if (ext === "xls" || ext === "xlsx") return "excel";
  if (ext === "csv" || ext === "tsv" || ext === "txt") return "csv";
  if (ext === "pdf") return "pdf";
  if (ext === "png") return "png";
  return null;
}

// Επιστρέφει τύπο αρχείου που θα εμφανιστεί στα logs.
export function getFileType(row: any) {
  const action = String(row?.action ?? "").trim();
  const details =
    row?.details && typeof row.details === "object" ? row.details : {};
  const detailFormat = String((details as any)?.format ?? "")
    .trim()
    .toLowerCase();
  const detailFile = String(
    (details as any)?.file ?? (details as any)?.filename ?? "",
  ).trim();

  if (["xls", "xlsx", "excel"].includes(detailFormat)) return "excel";
  if (["csv", "tsv"].includes(detailFormat)) return "csv";
  if (detailFormat === "pdf") return "pdf";
  if (detailFormat === "png") return "png";

  const byFile = getFormatFromFilename(detailFile);
  if (byFile) return byFile;
  if (
    [
      "import_graduates",
      "import_study_programs",
      "import_program_directions",
      "import_region_peripheries",
      "import_region_cities",
    ].includes(action)
  )
    return "excel";
  if (action === "export_users_xlsx") return "excel";
  if (action === "export_users_csv") return "csv";
  if (action === "export_xlsx") return "excel";
  if (action === "export_csv") return "csv";
  if (action === "export_pdf") return "pdf";
  return null;
}

// Διαβάζει γλώσσα εμφάνισης από query/body.
export function getLanguage(req: Request) {
  const lang = String(req.query.lang ?? "gr")
    .trim()
    .toLowerCase();
  return lang.startsWith("en") ? "en" : "gr";
}

// Μεταφράζει labels details log στη σωστή γλώσσα.
function localDetailLabel(lang: "gr" | "en", key: string) {
  const labels =
    lang === "en"
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
          raw_name: "Original name",
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
          statistics_groups: "Categories",
          statistics_charts: "Statistics",
          map_exports: "Map content",
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
          statistics_groups: "Κατηγορίες",
          statistics_charts: "Στατιστικά",
          map_exports: "Περιεχόμενο χάρτη",
        };
  return labels[key as keyof typeof labels] ?? key;
}

// Επιστρέφει τύπο αρχείου με κεφαλαία για εμφάνιση.
function upperFileType(value: string) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "xlsx" || normalized === "xls") return "Excel";
  if (normalized === "csv") return "CSV";
  if (normalized === "pdf") return "PDF";
  if (normalized === "png") return "PNG";
  return value;
}

// Μεταφράζει γνωστές τιμές log για GR/EN εμφάνιση.
function localValue(lang: "gr" | "en", value: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  if (normalized === "visitor") return lang === "en" ? "Visitor" : "Επισκέπτης";
  if (normalized === "secretariat")
    return lang === "en" ? "Secretariat" : "Γραμματεία";
  if (normalized === "super_admin")
    return lang === "en" ? "Administrator" : "Διαχειριστής";
  if (normalized === "graduates")
    return lang === "en" ? "Graduates" : "Απόφοιτοι";
  if (normalized === "academicData")
    return lang === "en" ? "Academic data" : "Ακαδημαϊκά δεδομένα";
  if (normalized === "regions") return lang === "en" ? "Regions" : "Περιοχές";
  if (normalized === "statistics")
    return lang === "en" ? "Statistics" : "Στατιστικά";
  if (normalized === "map") return lang === "en" ? "Map" : "Χάρτης";
  if (normalized === "logs") return lang === "en" ? "Logs" : "Καταγραφές";
  const lower = normalized.toLowerCase();
  if (lower === "true") return lang === "en" ? "Yes" : "Ναι";
  if (lower === "false") return lang === "en" ? "No" : "Όχι";
  const exportDetailValue =
    exportDetailValueLabels[lang][normalized as keyof (typeof exportDetailValueLabels)[typeof lang]];
  if (exportDetailValue) return exportDetailValue;
  return getLocalizedAction(lang, normalized) || normalized;
}

function parseDetails(value: unknown) {
  if (value && typeof value === "object")
    return value as Record<string, unknown>;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return trimmed;
  }
}

// Παίρνει action code και το μετατρέπει σε κατανοητό μήνυμα για τον χρήστη.
export function getLocalizedAction(
  lang: "gr" | "en",
  value: unknown,
  log?: any,
) {
  const key = String(value ?? "").trim();
  if (
    (key === "export_csv" || key === "export_xlsx") &&
    String(log?.entity_type ?? "").trim() === "logs"
  ) {
    return lang === "en" ? "Log export" : "Εξαγωγή καταγραφών";
  }
  if (key === "bulk_delete_graduates") {
    const details = parseDetails(log?.details);
    const deleted =
      details && typeof details === "object"
        ? Number((details as any).deleted)
        : NaN;
    if (Number.isFinite(deleted) && deleted > 0)
      return lang === "en"
        ? `Deleted ${deleted} graduates`
        : `Διαγραφή ${deleted} αποφοίτων`;
    return lang === "en" ? "Graduate deletion" : "Διαγραφή αποφοίτων";
  }
  return (
    actionLabels[lang][key as keyof typeof actionLabels.gr] ??
    key.replace(/_/g, " ")
  );
}

function formatCreateUserDetails(
  lang: "gr" | "en",
  details: Record<string, unknown>,
) {
  const targetName = String(
    (details as any).target_name ?? (details as any).name ?? "",
  ).trim();
  const role = String(
    (details as any).target_role ?? (details as any).role ?? "",
  ).trim();
  const targetRole = role ? localValue(lang, role) || role : "";
  const parts =
    lang === "en"
      ? [
          targetName ? `New user: ${targetName}` : "",
          targetRole ? `Role: ${targetRole}` : "",
        ]
      : [
          targetName ? `Νέος χρήστης: ${targetName}` : "",
          targetRole ? `Ρόλος: ${targetRole}` : "",
        ];
  return parts.filter(Boolean).join(", ");
}

// Μετατρέπει τα details log σε σύντομο κείμενο για πίνακα/export.
export function getLocalizedDetails(lang: "gr" | "en", log: any) {
  const action = String(log?.action ?? "").trim();
  if (["login", "logout", "register", "change_password"].includes(action))
    return "";

  const details = parseDetails(log?.details);
  if (!details) return "";
  if (typeof details === "string") return localValue(lang, details);

  if (["διαγραφή χρήστη", "delete_user", "deactivate_user"].includes(action)) {
    return String((details as any).target_name ?? "").trim();
  }

  if (action === "create_user")
    return formatCreateUserDetails(lang, details as Record<string, unknown>);

  if (action === "bulk_delete_graduates") return "";

  const studentNumber = String((details as any).student_number ?? "").trim();
  if (studentNumber)
    return `${localDetailLabel(lang, "student_number")}: ${studentNumber}`;

  if (action === "import_graduates") {
    const file = String(
      (details as any).file ?? (details as any).filename ?? "",
    ).trim();
    const parts: string[] = [];
    if (file) parts.push(`${localDetailLabel(lang, "file")}: ${file}`);
    for (const key of [
      "total_rows",
      "inserted",
      "updated",
      "skipped",
      "errors",
    ]) {
      const value = (details as any)[key];
      if (value !== null && value !== undefined && value !== "")
        parts.push(`${localDetailLabel(lang, key)}: ${value}`);
    }
    return parts.join(", ");
  }

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
    const format = upperFileType(
      String(
        (details as any).format ?? (details as any).file_type ?? "",
      ).trim(),
    );
    const count = (details as any).count ?? (details as any).exported;
    const selected = (details as any).selected;
    const page = localValue(lang, String((details as any).page ?? ""));
    const parts: string[] = [];
    const detailList = (value: unknown) =>
      (Array.isArray(value) ? value : [value])
        .map((item) => localValue(lang, String(item ?? "")))
        .filter(Boolean)
        .join(", ");
    if (format) parts.push(format);
    if (action === "statistics_export") {
      const groups = detailList((details as any).statistics_groups);
      if (groups) parts.push(groups);
    }
    if (action === "map_export") {
      const mapExports = detailList((details as any).map_exports);
      if (mapExports) parts.push(mapExports);
    }
    if (count !== null && count !== undefined && count !== "")
      parts.push(lang === "en" ? `${count} records` : `${count} εγγραφές`);
    if (
      selected !== null &&
      selected !== undefined &&
      selected !== "" &&
      Number(selected) > 0
    )
      parts.push(
        lang === "en" ? `${selected} selected` : `${selected} επιλεγμένα`,
      );
    if (page) parts.push(lang === "en" ? `Page: ${page}` : `Σελίδα: ${page}`);
    if (parts.length) return parts.join(", ");
  }

  const changed = (details as any).changed;
  if (changed !== null && changed !== undefined && changed !== "") {
    const items = Array.isArray(changed) ? changed : [changed];
    const names = items
      .map((item) => localDetailLabel(lang, String(item ?? "").trim()))
      .filter(Boolean);
    if (names.length)
      return lang === "en"
        ? `Changed fields: ${names.join(", ")}`
        : `Αλλαγμένα πεδία: ${names.join(", ")}`;
  }

  if (action === "update_graduate") return "";

  if (
    (details as any).code ||
    (details as any).name ||
    (details as any).name_el ||
    (details as any).name_en
  ) {
    const code = String((details as any).code ?? "").trim();
    const name = String(
      lang === "en"
        ? ((details as any).name_en ??
            (details as any).name ??
            (details as any).name_el)
        : ((details as any).name_el ??
            (details as any).name ??
            (details as any).name_en ??
            ""),
    ).trim();
    return [
      code ? `${localDetailLabel(lang, "code")}: ${code}` : "",
      name ? `${localDetailLabel(lang, "name")}: ${name}` : "",
    ]
      .filter(Boolean)
      .join(", ");
  }

  const plainPairs: Array<[string, any]> = [
    ["file", (details as any).file ?? (details as any).filename],
    ["mail_sent", (details as any).mail_sent],
    ["mail_error", (details as any).mail_error],
    ["role", (details as any).role],
    ["status", (details as any).status],
    ["page", (details as any).page],
    ["study_program", (details as any).study_program],
    ["study_program_id", (details as any).study_program_id],
    ["reason", (details as any).reason],
    ["parent_id", (details as any).parent_id],
    ["raw_name", (details as any).raw_name],
    ["missing", (details as any).missing],
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
    ["limit", (details as any).limit],
  ];

  const parts: string[] = [];

  for (const [key, value] of plainPairs) {
    if (value === null || value === undefined || value === "") continue;
    const rendered = Array.isArray(value)
      ? value
          .map((item) => localValue(lang, String(item)))
          .filter(Boolean)
          .join(", ")
      : localValue(lang, String(value)) || String(value);
    if (rendered) parts.push(`${localDetailLabel(lang, key)}: ${rendered}`);
  }

  for (const [key, value] of counterPairs) {
    if (value === null || value === undefined || value === "") continue;
    parts.push(`${localDetailLabel(lang, key)}: ${value}`);
  }

  const ids = (details as any).ids;
  if (ids !== null && ids !== undefined && ids !== "") {
    const rendered = Array.isArray(ids)
      ? ids
          .map((item) => String(item ?? "").trim())
          .filter(Boolean)
          .join(", ")
      : String(ids);
    if (rendered) parts.push(`${localDetailLabel(lang, "ids")}: ${rendered}`);
  }

  if (parts.length) return parts.join(", ");

  return Object.entries(details)
    .filter(
      ([key, value]) => !hiddenDetailKeys.has(key) && value !== null && value !== undefined && value !== "",
    )
    .slice(0, 5)
    .map(([key, value]) => {
      if (Array.isArray(value))
        return `${localDetailLabel(lang, key)}: ${value
          .map((item) => String(item ?? "").trim())
          .filter(Boolean)
          .join(", ")}`;
      const rendered =
        typeof value === "string"
          ? localValue(lang, value) || value
          : String(value);
      return `${localDetailLabel(lang, key)}: ${rendered}`;
    })
    .join(", ");
}
