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

type LogWhere = Record<string | symbol, unknown>;
type LogLanguage = "gr" | "en";

const logUserInclude = [
  {
    model: User,
    as: "user",
    attributes: ["id", "email", "first_name", "last_name", "role"],
    required: false,
  },
];

function addAndFilter(
  where: LogWhere,
  filter: Record<string | symbol, unknown>,
) {
  where[Op.and] = [
    ...(Array.isArray(where[Op.and]) ? (where[Op.and] as unknown[]) : []),
    filter,
  ];
}

function addActorFilter(where: LogWhere, actor: string | undefined) {
  if (!actor) return;

  const parts = actor.split(/\s+/);
  const firstPart = parts[0] ?? actor;
  const rest = parts.slice(1).join(" ") || actor;

  addAndFilter(where, {
    [Op.or]: [
      { "$user.first_name$": { [Op.like]: `%${actor}%` } },
      { "$user.last_name$": { [Op.like]: `%${actor}%` } },
      { "$user.email$": { [Op.like]: `%${actor}%` } },
      {
        [Op.and]: [
          { "$user.first_name$": { [Op.like]: `%${firstPart}%` } },
          { "$user.last_name$": { [Op.like]: `%${rest}%` } },
        ],
      },
    ],
  });
}

function addRoleFilter(where: LogWhere, role: string) {
  if (role === "visitor") {
    addAndFilter(where, { user_id: null });
  } else if (role !== "all") {
    addAndFilter(where, { "$user.role$": role });
  }
}

function buildActivityLogWhere(req: Request) {
  const where = buildLogFilters(req) as LogWhere;
  addActorFilter(where, nonEmptyString(req.query.actor));
  addRoleFilter(where, getRoleFilter(req));
  return where;
}

export async function listActivityLogs(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = clamp(toInteger(req.query.page, DEFAULT_PAGE), 1, MAX_PAGE);
    const pageSize = clamp(
      toInteger(req.query.pageSize, DEFAULT_PAGE_SIZE),
      1,
      MAX_PAGE_SIZE,
    );

    const { rows, count } = await ActivityLog.findAndCountAll({
      where: buildActivityLogWhere(req),
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order: [["created_at", "DESC"]],
      include: logUserInclude,
    });

    res.json({ ok: true, page, pageSize, total: count, items: rows });
  } catch (error) {
    next(error);
  }
}

export async function getActivityLogFileSummary(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const rows = await ActivityLog.findAll({
      attributes: [
        "id",
        "user_id",
        "action",
        "entity_type",
        "details",
        "created_at",
      ],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "role"],
          required: false,
        },
      ],
    });

    const roleFilter = getRoleFilter(req);
    const pages = [
      "graduates",
      "users",
      "academicData",
      "statistics",
      "map",
      "logs",
    ];
    const fileTypes = ["excel", "csv", "pdf", "png"];
    const baseCell = () => ({ excel: 0, csv: 0, pdf: 0, png: 0 });
    const summary = pages.map((page) => ({
      page,
      import: baseCell(),
      export: baseCell(),
    }));
    const byPage = new Map(summary.map((entry) => [entry.page, entry]));

    for (const row of rows) {
      if (!matchesRole(row, roleFilter)) continue;

      const page = getLogPage(row);
      const operation = getOperation(row);
      const fileType = getFileType(row);

      if (!page || !operation || !fileType) continue;

      const pageEntry = byPage.get(page);
      if (!pageEntry || !fileTypes.includes(fileType)) continue;

      pageEntry[operation][fileType] += 1;
    }

    res.json({ ok: true, role: roleFilter, items: summary });
  } catch (error) {
    next(error);
  }
}

function getActorLabel(lang: LogLanguage, row: any) {
  const fn = String(row?.user?.first_name ?? "").trim();
  const ln = String(row?.user?.last_name ?? "").trim();
  const full = `${fn} ${ln}`.trim();
  if (full) return full;
  return lang === "en" ? "Visitor" : "Επισκέπτης";
}

function formatDateTime(lang: LogLanguage, value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return String(value ?? "");

  const locale = lang === "en" ? "en-GB" : "el-GR";
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
}

async function findLogsForExport(req: Request) {
  return ActivityLog.findAll({
    where: buildActivityLogWhere(req),
    order: [["created_at", "DESC"]],
    limit: EXPORT_LIMIT,
    include: logUserInclude,
  });
}

function getExportRows(lang: LogLanguage, rows: any[]) {
  return rows.map((row) => ({
    [lang === "en" ? "#" : "#"]: row.id,
    [lang === "en" ? "Time, Date" : "Ώρα, Ημερομηνία"]: formatDateTime(
      lang,
      row.created_at,
    ),
    [lang === "en" ? "User" : "Χρήστης"]: getActorLabel(lang, row),
    [lang === "en" ? "Action" : "Ενέργεια"]: getLocalizedAction(
      lang,
      row.action,
      row,
    ),
    [lang === "en" ? "Details" : "Λεπτομέρειες"]: getLocalizedDetails(
      lang,
      row,
    ),
  }));
}

async function writeExportLog(
  req: Request,
  action: "export_csv" | "export_xlsx",
  count: number,
) {
  await logAction({
    user_id: req.user?.id ?? null,
    action,
    entity_type: "logs",
    entity_id: null,
    details: { format: action === "export_csv" ? "csv" : "xlsx", count },
  });
}

export async function exportActivityLogsCsv(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const lang = getLanguage(req);
    const rows = await findLogsForExport(req);

    await writeExportLog(req, "export_csv", rows.length);

    const exportRows = sanitizeExportRows(getExportRows(lang, rows as any[]));
    const csv = buildDelimitedText(exportRows, "\t");
    const buffer = buildUtf16CsvBuffer(csv);
    res.setHeader(
      "Content-Type",
      "text/tab-separated-values; charset=utf-16le",
    );
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="alupla_system_logs_${rows.length}_logs_${ts}.csv"`,
    );
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

export async function exportActivityLogsXlsx(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const lang = getLanguage(req);
    const rows = await findLogsForExport(req);

    await writeExportLog(req, "export_xlsx", rows.length);

    const workbook = XLSX.utils.book_new();
    const exportRows = sanitizeExportRows(getExportRows(lang, rows as any[]));
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    applySheetLayout(worksheet, exportRows);
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      lang === "en" ? "Logs" : "Καταγραφές",
    );
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="alupla_system_logs_${rows.length}_logs_${ts}.xlsx"`,
    );
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}
