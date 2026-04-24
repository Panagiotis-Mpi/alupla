import type { Request } from "express";
import { Op } from "sequelize";
import XLSX from "xlsx";

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
  const text = value === null || value === undefined ? "" : String(value);
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

  where[Op.and] = [
    ...(Array.isArray(where[Op.and]) ? where[Op.and] as any[] : []),
    { action: { [Op.notIn]: ["create_program_direction", "update_program_direction", "delete_program_direction", "import_program_directions"] } },
    { entity_type: { [Op.ne]: "program_direction" } }
  ];

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
    ? { file: "File", format: "Type", count: "Rows", total_rows: "Total rows", inserted: "New", updated: "Updated", skipped: "Skipped", deleted: "Deleted", exported: "Exported", page: "Page", years: "Years", role: "Role", status: "Status", study_program: "Study program", reason: "Reason" }
    : { file: "Αρχείο", format: "Τύπος", count: "Γραμμές", total_rows: "Σύνολο γραμμών", inserted: "Νέες", updated: "Ενημερωμένες", skipped: "Παραλείφθηκαν", deleted: "Διαγράφηκαν", exported: "Εξήχθησαν", page: "Σελίδα", years: "Έτη", role: "Ρόλος", status: "Κατάσταση", study_program: "Πρόγραμμα σπουδών", reason: "Λόγος" };
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
  if (["login", "logout", "register", "change_password"].includes(action)) {
    return "";
  }

  const details = parseDetails(log?.details);
  if (!details) return "";
  if (typeof details === "string") return details;

  if (["διαγραφή χρήστη", "delete_user", "deactivate_user"].includes(action)) {
    return String((details as any).target_name ?? "").trim();
  }

  if ((action === "export_csv" || action === "export_xlsx") && String(log?.entity_type ?? "").trim() === "logs") {
    const format = upperFileType(String((details as any).format ?? "").trim());
    const count = (details as any).count ?? (details as any).exported;
    const parts: string[] = [];
    if (format) parts.push(format);
    if (count !== null && count !== undefined && count !== "") {
      parts.push(lang === "en" ? `${count} records` : `${count} εγγραφές`);
    }
    return parts.join(", ");
  }

  const rawFile = String(details.file ?? details.filename ?? "").trim();
  const format = String(details.format ?? "").trim();
  const parts: string[] = [];

  if (rawFile) parts.push(`${localDetailLabel(lang, "file")}: ${rawFile}`);
  if (format) parts.push(`${localDetailLabel(lang, "format")}: ${upperFileType(format)}`);

  const orderedKeys = [
    "count",
    "total_rows",
    "inserted",
    "updated",
    "skipped",
    "deleted",
    "exported",
    "page",
    "years",
    "role",
    "status",
    "study_program",
    "study_program_id",
    "reason",
    "changed",
    "errors",
    "selected",
    "limit",
    "missing",
    "name",
    "name_el",
    "parent_id",
    "code",
    "city",
    "city_id",
    "periphery",
    "periphery_id",
    "country",
  ];

  const seen = new Set<string>(["file", "filename", "format"]);
  for (const key of orderedKeys) {
    if (!(key in details) || seen.has(key)) continue;
    seen.add(key);
    const value = (details as any)[key];
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      const rendered = value.map((item) => String(item ?? "").trim()).filter(Boolean).join(", ");
      if (rendered) parts.push(`${localDetailLabel(lang, key)}: ${rendered}`);
      continue;
    }
    const rendered = typeof value === "string" ? localValue(lang, value) || value : String(value);
    parts.push(`${localDetailLabel(lang, key)}: ${rendered}`);
  }

  for (const [key, value] of Object.entries(details)) {
    if (seen.has(key) || value === null || value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      const rendered = value.map((item) => String(item ?? "").trim()).filter(Boolean).join(", ");
      if (rendered) parts.push(`${localDetailLabel(lang, key)}: ${rendered}`);
      continue;
    }
    const rendered = typeof value === "string" ? localValue(lang, value) || value : String(value);
    parts.push(`${localDetailLabel(lang, key)}: ${rendered}`);
  }

  return parts.join(", ");
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
