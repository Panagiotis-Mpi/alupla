import type { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import { Region } from "../models/Region";

export async function listRegions(req: Request, res: Response, next: NextFunction) {
  try {
    const parentRaw = req.query.parent_id;
    const typeRaw = req.query.type;

    const where: any = {};

    if (parentRaw === "null" || parentRaw === "") {
      where.parent_id = null;
    } else if (typeof parentRaw === "string" && parentRaw.trim().length) {
      const n = Number(parentRaw);
      if (Number.isFinite(n)) where.parent_id = n;
    }

    if (typeof typeRaw === "string" && ["PERIPHERY", "NOMOS", "DIMOS", "CITY"].includes(typeRaw)) {
      where.type = typeRaw;
    }

    const items = await Region.findAll({
      where,
      order: [["name", "ASC"]]
    });

    res.json({ ok: true, items });
  } catch (err) {
    next(err);
  }
}

export async function getRegion(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: { message: "Invalid id" } });

    const item = await Region.findByPk(id);
    if (!item) return res.status(404).json({ ok: false, error: { message: "Not found" } });

    res.json({ ok: true, item });
  } catch (err) {
    next(err);
  }
}

export async function searchRegions(req: Request, res: Response, next: NextFunction) {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!q) return res.json({ ok: true, items: [] });

    const items = await Region.findAll({
      where: { name: { [Op.like]: `%${q}%` } },
      order: [["name", "ASC"]],
      limit: 50
    });

    res.json({ ok: true, items });
  } catch (err) {
    next(err);
  }
}
