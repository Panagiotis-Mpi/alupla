import type { NextFunction, Request, Response } from "express";
import { Region } from "../models/Region";

function parseListFilters(req: Request) {
  const where: Record<string, unknown> = {};

  if (typeof req.query.type === "string" && req.query.type.trim()) {
    where.type = req.query.type.trim();
  }

  if (req.query.parent_id !== undefined) {
    if (req.query.parent_id === null || req.query.parent_id === "" || req.query.parent_id === "null") {
      where.parent_id = null;
    } else {
      const parsed = Number(req.query.parent_id);
      if (Number.isFinite(parsed)) {
        where.parent_id = parsed;
      }
    }
  }

  return where;
}

export async function listRegions(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await Region.findAll({ where: parseListFilters(req), order: [["name_el", "ASC"]] });
    const items = rows.map((row) => ({ ...row.get({ plain: true }), name: row.name_el }));
    res.json({ ok: true, items });
  } catch (err) {
    next(err);
  }
}
