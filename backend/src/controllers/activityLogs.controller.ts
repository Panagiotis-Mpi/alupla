import type { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import { ActivityLog } from "../models/ActivityLog";
import { User } from "../models/User";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function toInt(v: any, d: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : d;
}

function csvEscape(v: any) {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export async function listActivityLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const page = clamp(toInt(req.query.page, 1), 1, 1_000_000);
    const pageSize = clamp(toInt(req.query.pageSize, 50), 1, 200);
    const offset = (page - 1) * pageSize;

    const where: any = {};
    if (req.query.user_id) where.user_id = Number(req.query.user_id);
    if (req.query.action) where.action = String(req.query.action);
    if (req.query.entity_type) where.entity_type = String(req.query.entity_type);

    const q = String(req.query.q ?? "").trim();
    if (q) {
      where[Op.or] = [
        { action: { [Op.like]: `%${q}%` } },
        { entity_type: { [Op.like]: `%${q}%` } }
      ];
    }

    const { rows, count } = await ActivityLog.findAndCountAll({
      where,
      limit: pageSize,
      offset,
      order: [["created_at", "DESC"]],
      include: [{ model: User, as: "user", attributes: ["id", "email", "first_name", "last_name", "role"] }]
    });

    res.json({ ok: true, page, pageSize, total: count, items: rows });
  } catch (e) {
    next(e);
  }
}

export async function exportActivityLogsCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const where: any = {};
    if (req.query.user_id) where.user_id = Number(req.query.user_id);
    if (req.query.action) where.action = String(req.query.action);
    if (req.query.entity_type) where.entity_type = String(req.query.entity_type);
    const q = String(req.query.q ?? "").trim();
    if (q) {
      where[Op.or] = [
        { action: { [Op.like]: `%${q}%` } },
        { entity_type: { [Op.like]: `%${q}%` } }
      ];
    }

    const rows = await ActivityLog.findAll({
      where,
      order: [["created_at", "DESC"]],
      limit: 5000
    });

    const header = ["id","created_at","user_id","action","entity_type","entity_id","details"].join(",") + "\n";
    const lines = rows.map((r: any) =>
      [r.id, r.created_at, r.user_id ?? "", r.action ?? "", r.entity_type ?? "", r.entity_id ?? "", JSON.stringify(r.details ?? null)]
        .map(csvEscape)
        .join(",")
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=activity_logs.csv");
    res.send(header + lines.join("\n"));
  } catch (e) {
    next(e);
  }
}
