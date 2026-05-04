// Χειρίζεται unresolved περιοχές/πόλεις που χρειάζονται αντιστοίχιση.
import type { NextFunction, Request, Response } from "express";
import { Region } from "../models/Region";

// Διαβάζει φίλτρα λίστας unresolved regions.
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

// Επιστρέφει unresolved regions που χρειάζονται έλεγχο/αντιστοίχιση.
export async function listRegions(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await Region.findAll({ where: parseListFilters(req), order: [["name", "ASC"]] });
    res.json({ ok: true, items });
  } catch (err) {
    next(err);
  }
}
