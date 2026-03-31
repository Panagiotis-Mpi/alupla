import type { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import { ActivityLog } from "../models/ActivityLog";
import { User } from "../models/User";
import { logAction } from "../services/log.service";

const MAX_PAGE = 1_000_000;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const EXPORT_LIMIT = 5000;

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

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
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
    .map(csvEscape)
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
  const role = String(row?.user?.role ?? "").trim().toLowerCase();
  if (role === "secretariat") return "secretariat";
  if (role === "super_admin") return "super_admin";
  return "visitor";
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
  if (action === "import_region_peripheries" || action === "import_region_cities") return "regions";
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
      order: [["created_at", "DESC"]],
      limit: EXPORT_LIMIT,
      include: [{ model: User, as: "user", attributes: ["id", "role"] }]
    });

    const roleFilter = getRoleFilter(req);
    const pages = ["graduates", "academicData", "regions", "statistics", "map", "logs"];
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
    const rows = await ActivityLog.findAll({
      where: buildLogFilters(req),
      order: [["created_at", "DESC"]],
      limit: EXPORT_LIMIT
    });

    await logAction({
      user_id: req.user?.id ?? null,
      action: "export_csv",
      entity_type: "logs",
      entity_id: null,
      details: { format: "csv", count: rows.length }
    });

    const header = ["id", "created_at", "user_id", "action", "entity_type", "entity_id", "details"].join(",") + "\n";
    const body = rows.map(toCsvRow).join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=activity_logs.csv");
    res.send(header + body);
  } catch (error) {
    next(error);
  }
}
