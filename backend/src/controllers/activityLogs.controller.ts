import type { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import { ActivityLog } from "../models/ActivityLog";
import { User } from "../models/User";

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
    where.action = action;
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

export async function listActivityLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const page = clamp(toInteger(req.query.page, DEFAULT_PAGE), 1, MAX_PAGE);
    const pageSize = clamp(toInteger(req.query.pageSize, DEFAULT_PAGE_SIZE), 1, MAX_PAGE_SIZE);
    const offset = (page - 1) * pageSize;

    const { rows, count } = await ActivityLog.findAndCountAll({
      where: buildLogFilters(req),
      limit: pageSize,
      offset,
      order: [["created_at", "DESC"]],
      include: [{ model: User, as: "user", attributes: ["id", "email", "first_name", "last_name", "role"] }]
    });

    res.json({ ok: true, page, pageSize, total: count, items: rows });
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

    const header = ["id", "created_at", "user_id", "action", "entity_type", "entity_id", "details"].join(",") + "\n";
    const body = rows.map(toCsvRow).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=activity_logs.csv");
    res.send(header + body);
  } catch (error) {
    next(error);
  }
}
