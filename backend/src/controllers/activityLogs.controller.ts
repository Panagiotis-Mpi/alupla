import type { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import XLSX from "xlsx";
import { ActivityLog } from "../models/ActivityLog";
import { User } from "../models/User";
import { logAction } from "../services/log.service";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE,
  actionLabels,
  MAX_PAGE_SIZE,
  EXPORT_LIMIT,
  applySheetLayout,
  buildDelimitedText,
  buildLogFilters,
  buildUtf16CsvBuffer,
  clamp,
  getFileType,
  getLogPage,
  getOperation,
  getRoleFilter,
  matchesRole,
  nonEmptyString,
  toInteger,
} from "./activityLogs.helpers";

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

function getLocalizedAction(lang: "gr" | "en", value: unknown, log?: any) {
  const key = String(value ?? "").trim();
  if ((key === "export_csv" || key === "export_xlsx") && String(log?.entity_type ?? "").trim() === "logs") {
    return lang === "en" ? "Log export" : "Εξαγωγή καταγραφών";
  }
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

  for (const [key, value] of [["count", details.count], ["total_rows", details.total_rows], ["inserted", details.inserted], ["updated", details.updated], ["skipped", details.skipped], ["deleted", details.deleted], ["exported", details.exported]] as Array<[string, unknown]>) {
    if (value === null || value === undefined || value === "") continue;
    parts.push(`${localDetailLabel(lang, key)}: ${value}`);
  }

  for (const [key, value] of [["page", details.page], ["role", details.role], ["status", details.status], ["study_program", details.study_program], ["direction", details.direction], ["reason", details.reason]] as Array<[string, unknown]>) {
    if (value === null || value === undefined || value === "") continue;
    parts.push(`${localDetailLabel(lang, key)}: ${localValue(lang, String(value))}`);
  }

  if (parts.length) return parts.join(", ");

  return Object.entries(details)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 5)
    .map(([key, value]) => `${localDetailLabel(lang, key)}: ${typeof value === "string" ? localValue(lang, value) : String(value)}`)
    .join(", ");
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
  const baseOptions = { timeZone: "Europe/Athens" } as const;
  const time = new Intl.DateTimeFormat(locale, {
    ...baseOptions,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
  const day = new Intl.DateTimeFormat(locale, {
    ...baseOptions,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
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
    [lang === "en" ? "Action" : "Ενέργεια"]: getLocalizedAction(lang, row.action, row),
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
