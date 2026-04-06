import type { NextFunction, Request, Response } from "express";
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
  applySheetLayout,
  buildDelimitedText,
  buildUtf16CsvBuffer,
  clamp,
  getFileType,
  getLanguage,
  getLogPage,
  getOperation,
  getRoleFilter,
  localValue,
  matchesRole,
  toInteger,
} from "./activityLogs.helpers";
import {
  buildActivityLogExportRows,
  buildActivityLogWhere,
  findActivityLogsForExport,
} from "./activityLogs.shared";

export async function listActivityLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const page = clamp(toInteger(req.query.page, DEFAULT_PAGE), 1, MAX_PAGE);
    const pageSize = clamp(toInteger(req.query.pageSize, DEFAULT_PAGE_SIZE), 1, MAX_PAGE_SIZE);
    const offset = (page - 1) * pageSize;
    const where = buildActivityLogWhere(req);

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


export async function exportActivityLogsCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const lang = getLanguage(req);
    const rows = await findActivityLogsForExport(req);

    await logAction({
      user_id: req.user?.id ?? null,
      action: "export_csv",
      entity_type: "logs",
      entity_id: null,
      details: { format: "csv", count: rows.length }
    });

    const exportRows = buildActivityLogExportRows(lang, rows as any[]);
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
    const rows = await findActivityLogsForExport(req);

    await logAction({
      user_id: req.user?.id ?? null,
      action: "export_xlsx",
      entity_type: "logs",
      entity_id: null,
      details: { format: "xlsx", count: rows.length }
    });

    const workbook = XLSX.utils.book_new();
    const exportRows = buildActivityLogExportRows(lang, rows as any[]);
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
