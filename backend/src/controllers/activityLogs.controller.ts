import type { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import XLSX from "xlsx";
import { ActivityLog } from "../models/ActivityLog";
import { User } from "../models/User";
import { logAction } from "../services/log.service";

const MAX_PAGE = 1_000_000;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const EXPORT_LIMIT = 5000;

const actionLabels = {
  gr: {
    login: "Σύνδεση",
    logout: "Αποσύνδεση",
    register: "Εγγραφή",
    request_password_reset: "Αίτημα αλλαγής κωδικού",
    reset_password: "Επαναφορά κωδικού",
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
    create_program_direction: "Δημιουργία κατεύθυνσης",
    update_program_direction: "Ενημέρωση κατεύθυνσης",
    delete_program_direction: "Διαγραφή κατεύθυνσης",
    import_program_directions: "Εισαγωγή κατευθύνσεων",
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
    request_password_reset: "Password reset request",
    reset_password: "Password reset",
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
    create_program_direction: "Direction creation",
    update_program_direction: "Direction update",
    delete_program_direction: "Direction deletion",
    import_program_directions: "Direction import",
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function nonEmptyString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : undefined;
}
function parseLogDetails(value: unknown) {
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


function csvEscape(value: unknown, delimiter = ",") {
  const text = value === null || value === undefined ? "" : String(value);
  const shouldQuote = text.includes('"') || text.includes("\n") || text.includes("\r") || text.includes(delimiter);
  if (shouldQuote) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

function buildDelimitedText(rows: Array<Record<string, unknown>>, delimiter = "\t") {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0] ?? {});
  const lines = [headers.map((header) => csvEscape(header, delimiter)).join(delimiter)];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row?.[header], delimiter)).join(delimiter));
  }
  return lines.join("\r\n");
}

function buildUtf16CsvBuffer(text: string) {
  return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")]);
}

function applySheetLayout(ws: XLSX.WorkSheet, rows: Array<Record<string, unknown>>) {
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

  if (ws["!ref"]) {
    const range = XLSX.utils.decode_range(ws["!ref"]);
    ws["!autofilter"] = { ref: ws["!ref"] };
    ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: XLSX.utils.encode_cell({ r: 1, c: 0 }), activePane: "bottomLeft", state: "frozen" } as any;
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c });
      const cell = ws[cellRef];
      if (cell) {
        cell.s = { ...(cell.s || {}), font: { ...(cell.s?.font || {}), bold: true }, alignment: { ...(cell.s?.alignment || {}), vertical: "center", wrapText: true } } as any;
      }
    }
  }
}

function buildLogFilters(req: Request) {
  const where: Record<string | symbol, unknown> = {};
  const userId = req.query.user_id;
  const action = nonEmptyString(req.query.action);
  const entityType = nonEmptyString(req.query.entity_type);
  const keyword = nonEmptyString(req.query.q);

  if (userId !== undefined && userId !== "") {
    where.user_id = Number(userId);
  }

  if (action) {
    where.action = { [Op.like]: `%${action}%` };
  }

  if (entityType) {
    where.entity_type = entityType;
  }

  if (keyword) {
    where[Op.or] = [
      { action: { [Op.like]: `%${keyword}%` } },
      { entity_type: { [Op.like]: `%${keyword}%` } }
    ];
  }

  return where;
}

function toCsvRow(row: any) {
  return [
    row.id,
    row.created_at,
    row.user_id ?? "",
    row.action ?? "",
    row.entity_type ?? "",
    row.entity_id ?? "",
    JSON.stringify(row.details ?? null)
  ]
    .map((value) => csvEscape(value))
    .join(",");
}

function getRoleFilter(req: Request) {
  const role = String(req.query.role ?? "all").trim().toLowerCase();
  if (role === "secretariat" || role === "super_admin" || role === "visitor") {
    return role;
  }
  return "all";
}

function getRoleBucket(row: any) {
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

function matchesRole(row: any, roleFilter: string) {
  if (roleFilter === "all") return true;
  return getRoleBucket(row) === roleFilter;
}

function getLogPage(row: any) {
  const action = String(row?.action ?? "").trim();
  const entityType = String(row?.entity_type ?? "").trim();

  if (action === "import_graduates" || action === "export_graduates") return "graduates";
  if (action === "import_study_programs" || action === "import_program_directions") return "academicData";
  if (action === "statistics_export" || entityType === "statistics") return "statistics";
  if (action === "map_export" || entityType === "map") return "map";
  if ((action === "export_csv" || action === "export_pdf") && entityType === "logs") return "logs";

  return null;
}

function getOperation(row: any) {
  const action = String(row?.action ?? "").trim();
  if (action.startsWith("import_") || action === "upload") return "import";
  if (action.includes("export") || action === "map_export" || action === "statistics_export") return "export";
  return null;
}

function getFormatFromFilename(name: string) {
  const normalized = String(name ?? "").trim().toLowerCase();
  if (!normalized.includes(".")) return null;
  const ext = normalized.split(".").pop() || "";
  if (ext === "xls" || ext === "xlsx") return "excel";
  if (ext === "csv" || ext === "tsv") return "csv";
  if (ext === "pdf") return "pdf";
  if (ext === "png") return "png";
  return null;
}

function getFileType(row: any) {
  const action = String(row?.action ?? "").trim();
  const details = row?.details && typeof row.details === "object" ? row.details : {};
  const detailFormat = String((details as any)?.format ?? "").trim().toLowerCase();
  const detailFile = String((details as any)?.file ?? (details as any)?.filename ?? "").trim();

  if (detailFormat === "xls" || detailFormat === "xlsx" || detailFormat === "excel") return "excel";
  if (detailFormat === "csv" || detailFormat === "tsv") return "csv";
  if (detailFormat === "pdf") return "pdf";
  if (detailFormat === "png") return "png";

  const byFile = getFormatFromFilename(detailFile);
  if (byFile) return byFile;

  if (action === "import_graduates" || action === "import_study_programs" || action === "import_program_directions" || action === "import_region_peripheries" || action === "import_region_cities") {
    return "excel";
  }

  if (action === "export_csv") return "csv";
  if (action === "export_pdf") return "pdf";

  return null;
}

export async function listActivityLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const page = clamp(toInteger(req.query.page, DEFAULT_PAGE), 1, MAX_PAGE);
    const pageSize = clamp(toInteger(req.query.pageSize, DEFAULT_PAGE_SIZE), 1, MAX_PAGE_SIZE);
    const offset = (page - 1) * pageSize;

    const actor = nonEmptyString(req.query.actor);
    const role = getRoleFilter(req);
    const where = buildLogFilters(req);

    if (actor) {
      where[Op.and] = [
        ...(Array.isArray(where[Op.and]) ? where[Op.and] as any[] : []),
        {
          [Op.or]: [
            { "$user.first_name$": { [Op.like]: `%${actor}%` } },
            { "$user.last_name$": { [Op.like]: `%${actor}%` } },
            { "$user.email$": { [Op.like]: `%${actor}%` } },
            { [Op.and]: [{ "$user.first_name$": { [Op.like]: `%${actor.split(/\s+/)[0] ?? actor}%` } }, { "$user.last_name$": { [Op.like]: `%${actor.split(/\s+/).slice(1).join(" ") || actor}%` } }] }
          ]
        }
      ];
    }

    if (role === "visitor") {
      where[Op.and] = [
        ...(Array.isArray(where[Op.and]) ? where[Op.and] as any[] : []),
        { user_id: null }
      ];
    } else if (role !== "all") {
      where[Op.and] = [
        ...(Array.isArray(where[Op.and]) ? where[Op.and] as any[] : []),
        { "$user.role$": role }
      ];
    }

    const { rows, count } = await ActivityLog.findAndCountAll({
      where,
      limit: pageSize,
      offset,
      order: [["created_at", "DESC"]],
      include: [{ model: User, as: "user", attributes: ["id", "email", "first_name", "last_name", "role"], required: false }]
    });

    res.json({ ok: true, page, pageSize, total: count, items: rows });
  } catch (error) {
    next(error);
  }
}

export async function getActivityLogFileSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await ActivityLog.findAll({
      attributes: ["id", "user_id", "action", "entity_type", "details", "created_at"],
      include: [{ model: User, as: "user", attributes: ["id", "role"], required: false }]
    });

    const roleFilter = getRoleFilter(req);
    const pages = ["graduates", "academicData", "statistics", "map", "logs"];
    const fileTypes = ["excel", "csv", "pdf", "png"];
    const baseCell = () => ({ excel: 0, csv: 0, pdf: 0, png: 0 });
    const summary = pages.map((page) => ({
      page,
      import: baseCell(),
      export: baseCell()
    }));
    const byPage = new Map(summary.map((entry) => [entry.page, entry]));

    for (const row of rows) {
      if (!matchesRole(row, roleFilter)) continue;

      const page = getLogPage(row);
      const operation = getOperation(row);
      const fileType = getFileType(row);

      if (!page || !operation || !fileType) continue;

      const pageEntry = byPage.get(page);
      if (!pageEntry) continue;
      if (!fileTypes.includes(fileType)) continue;

      pageEntry[operation][fileType] += 1;
    }

    res.json({ ok: true, role: roleFilter, items: summary });
  } catch (error) {
    next(error);
  }
}


function getLanguage(req: Request) {
  const lang = String(req.query.lang ?? "gr").trim().toLowerCase();
  return lang.startsWith("en") ? "en" : "gr";
}

function localDetailLabel(lang: "gr" | "en", key: string) {
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
        direction: "Direction",
        reason: "Reason"
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
        direction: "Κατεύθυνση",
        reason: "Λόγος"
      };

  return labels[key as keyof typeof labels] ?? key;
}

function upperFileType(value: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "xlsx" || normalized === "xls") return "Excel";
  if (normalized === "csv") return "CSV";
  if (normalized === "pdf") return "PDF";
  if (normalized === "png") return "PNG";
  return value;
}

function localValue(lang: "gr" | "en", value: string) {
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

function parseDetails(value: unknown) {
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

function getLocalizedAction(lang: "gr" | "en", value: unknown) {
  const key = String(value ?? "").trim();
  return actionLabels[lang][key as keyof typeof actionLabels.gr] ?? key.replace(/_/g, " ");
}

function getLocalizedDetails(lang: "gr" | "en", log: any) {
  const action = String(log?.action ?? "").trim();
  if (["login", "logout", "register", "request_password_reset", "reset_password", "change_password"].includes(action)) {
    return "";
  }

  const details = parseDetails(log?.details);
  if (!details) return "";
  if (typeof details === "string") return details;

  const rawFile = String(details.file ?? details.filename ?? "").trim();
  const format = String(details.format ?? "").trim();
  const parts: string[] = [];

  if (rawFile) parts.push(`${localDetailLabel(lang, "file")}: ${rawFile}`);
  if (format) parts.push(`${localDetailLabel(lang, "format")}: ${upperFileType(format)}`);

  for (const [key, value] of [["count", details.count], ["total_rows", details.total_rows], ["inserted", details.inserted], ["updated", details.updated], ["skipped", details.skipped], ["deleted", details.deleted], ["exported", details.exported]] as Array<[string, unknown]>) {
    if (value === null || value === undefined || value === "") continue;
    parts.push(`${localDetailLabel(lang, key)}: ${value}`);
  }

  for (const [key, value] of [["page", details.page], ["role", details.role], ["status", details.status], ["study_program", details.study_program], ["direction", details.direction], ["reason", details.reason]] as Array<[string, unknown]>) {
    if (value === null || value === undefined || value === "") continue;
    parts.push(`${localDetailLabel(lang, key)}: ${localValue(lang, String(value))}`);
  }

  if (parts.length) return parts.join(" • ");

  return Object.entries(details)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 5)
    .map(([key, value]) => `${localDetailLabel(lang, key)}: ${typeof value === "string" ? localValue(lang, value) : String(value)}`)
    .join(" • ");
}

function getActorLabel(lang: "gr" | "en", row: any) {
  const fn = String(row?.user?.first_name ?? "").trim();
  const ln = String(row?.user?.last_name ?? "").trim();
  const full = `${fn} ${ln}`.trim();
  if (full) return full;

  const details = parseDetails(row?.details);
  if (details && typeof details === "object") {
    const actorName = String((details as any).actor_name ?? "").trim();
    if (actorName) return actorName;
    const actorEmail = String((details as any).actor_email ?? "").trim();
    if (actorEmail) return actorEmail;
  }

  return lang === "en" ? "Visitor" : "Επισκέπτης";
}

function formatDateTime(lang: "gr" | "en", value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return String(value ?? "");
  const locale = lang === "en" ? "en-GB" : "el-GR";
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date);
  const day = new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return `${time}, ${day}`;
}

async function findLogsForExport(req: Request) {
  const actor = nonEmptyString(req.query.actor);
  const role = getRoleFilter(req);
  const where = buildLogFilters(req);

  if (actor) {
    where[Op.and] = [
      ...(Array.isArray(where[Op.and]) ? where[Op.and] as any[] : []),
      {
        [Op.or]: [
          { "$user.first_name$": { [Op.like]: `%${actor}%` } },
          { "$user.last_name$": { [Op.like]: `%${actor}%` } },
          { "$user.email$": { [Op.like]: `%${actor}%` } },
          { [Op.and]: [{ "$user.first_name$": { [Op.like]: `%${actor.split(/\s+/)[0] ?? actor}%` } }, { "$user.last_name$": { [Op.like]: `%${actor.split(/\s+/).slice(1).join(" ") || actor}%` } }] }
        ]
      }
    ];
  }

  if (role === "visitor") {
    where[Op.and] = [
      ...(Array.isArray(where[Op.and]) ? where[Op.and] as any[] : []),
      { user_id: null }
    ];
  } else if (role !== "all") {
    where[Op.and] = [
      ...(Array.isArray(where[Op.and]) ? where[Op.and] as any[] : []),
      { "$user.role$": role }
    ];
  }

  return ActivityLog.findAll({
    where,
    order: [["created_at", "DESC"]],
    limit: EXPORT_LIMIT,
    include: [{ model: User, as: "user", attributes: ["id", "email", "first_name", "last_name", "role"], required: false }]
  });
}

function getExportRows(lang: "gr" | "en", rows: any[]) {
  return rows.map((row) => ({
    [lang === "en" ? "#" : "#"]: row.id,
    [lang === "en" ? "Time, Date" : "Ώρα, Ημερομηνία"]: formatDateTime(lang, row.created_at),
    [lang === "en" ? "User" : "Χρήστης"]: getActorLabel(lang, row),
    [lang === "en" ? "Action" : "Ενέργεια"]: getLocalizedAction(lang, row.action),
    [lang === "en" ? "Details" : "Λεπτομέρειες"]: getLocalizedDetails(lang, row)
  }));
}

export async function exportActivityLogsCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const lang = getLanguage(req);
    const rows = await findLogsForExport(req);

    await logAction({
      user_id: req.user?.id ?? null,
      action: "export_csv",
      entity_type: "logs",
      entity_id: null,
      details: { format: "csv", count: rows.length }
    });

    const exportRows = getExportRows(lang, rows as any[]);
    const csv = buildDelimitedText(exportRows, "	");
    const buffer = buildUtf16CsvBuffer(csv);
    res.setHeader("Content-Type", "text/tab-separated-values; charset=utf-16le");
    res.setHeader("Content-Disposition", "attachment; filename=activity_logs.csv");
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

export async function exportActivityLogsXlsx(req: Request, res: Response, next: NextFunction) {
  try {
    const lang = getLanguage(req);
    const rows = await findLogsForExport(req);

    await logAction({
      user_id: req.user?.id ?? null,
      action: "export_xlsx",
      entity_type: "logs",
      entity_id: null,
      details: { format: "xlsx", count: rows.length }
    });

    const workbook = XLSX.utils.book_new();
    const exportRows = getExportRows(lang, rows as any[]);
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    applySheetLayout(worksheet, exportRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, lang === "en" ? "Logs" : "Καταγραφές");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=activity_logs.xlsx");
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}
