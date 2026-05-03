import type { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import XLSX from "xlsx";
import { ActivityLog } from "../models/ActivityLog";
import { User } from "../models/User";
import { logAction } from "../services/log.service";
import { sanitizeExportRows } from "../utils/exportSafety";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE,
  MAX_PAGE_SIZE,
  EXPORT_LIMIT,
  applySheetLayout,
  buildDelimitedText,
  buildLogFilters,
  buildUtf16CsvBuffer,
  clamp,
  getFileType,
  getLanguage,
  getLocalizedAction,
  getLocalizedDetails,
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



function getActorLabel(lang: "gr" | "en", row: any) {
  const fn = String(row?.user?.first_name ?? "").trim();
  const ln = String(row?.user?.last_name ?? "").trim();
  const full = `${fn} ${ln}`.trim();
  if (full) return full;
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

    const exportRows = sanitizeExportRows(getExportRows(lang, rows as any[]));
    const csv = buildDelimitedText(exportRows, "	");
    const buffer = buildUtf16CsvBuffer(csv);
    res.setHeader("Content-Type", "text/tab-separated-values; charset=utf-16le");
    res.setHeader("Content-Disposition", "attachment; filename=alupla_system_logs_export.csv");
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
    const exportRows = sanitizeExportRows(getExportRows(lang, rows as any[]));
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    applySheetLayout(worksheet, exportRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, lang === "en" ? "Logs" : "Καταγραφές");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=alupla_system_logs_export.xlsx");
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}
