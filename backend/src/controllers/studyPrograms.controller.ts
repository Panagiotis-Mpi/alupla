import type { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import { StudyProgram } from "../models/StudyProgram";
import { ProgramDirection } from "../models/ProgramDirection";
import { Graduate } from "../models/Graduate";
import { logAction } from "../services/log.service";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function listStudyPrograms(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await StudyProgram.findAll({
      order: [["id", "ASC"]]
    });

    res.json({ ok: true, items });
  } catch (err) {
    next(err);
  }
}

export async function createStudyProgram(req: Request, res: Response, next: NextFunction) {
  try {
    const code = normalizeString(req.body?.code);
    const name_el = normalizeString(req.body?.name_el);
    const name_en = normalizeString(req.body?.name_en) || null;
    const is_active = req.body?.is_active === undefined ? true : Boolean(req.body.is_active);

    if (!code || !name_el) {
      return res.status(400).json({ ok: false, error: { message: "code and name_el are required" } });
    }

    const existing = await StudyProgram.findOne({
      where: {
        [Op.or]: [{ code }, { name_el }]
      }
    });

    if (existing) {
      return res.status(400).json({ ok: false, error: { message: "Study program already exists" } });
    }

    const item = await StudyProgram.create({ code, name_el, name_en, is_active });

    await logAction({
      user_id: req.user?.id ?? null,
      action: "create_study_program",
      entity_type: "study_program",
      entity_id: item.id,
      details: { code, name_el }
    });

    res.status(201).json({ ok: true, item });
  } catch (err) {
    next(err);
  }
}

export async function updateStudyProgram(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, error: { message: "Invalid id" } });
    }

    const item = await StudyProgram.findByPk(id);
    if (!item) {
      return res.status(404).json({ ok: false, error: { message: "Study program not found" } });
    }

    const patch: Record<string, unknown> = {};

    if (req.body?.code !== undefined) {
      const code = normalizeString(req.body.code);
      if (!code) return res.status(400).json({ ok: false, error: { message: "code is required" } });
      patch.code = code;
    }

    if (req.body?.name_el !== undefined) {
      const name_el = normalizeString(req.body.name_el);
      if (!name_el) return res.status(400).json({ ok: false, error: { message: "name_el is required" } });
      patch.name_el = name_el;
    }

    if (req.body?.name_en !== undefined) {
      patch.name_en = normalizeString(req.body.name_en) || null;
    }

    if (req.body?.is_active !== undefined) {
      patch.is_active = Boolean(req.body.is_active);
    }

    if (!Object.keys(patch).length) {
      return res.status(400).json({ ok: false, error: { message: "No changes provided" } });
    }

    const nextCode = (patch.code as string | undefined) ?? item.code;
    const nextNameEl = (patch.name_el as string | undefined) ?? item.name_el;

    const existing = await StudyProgram.findOne({
      where: {
        id: { [Op.ne]: id },
        [Op.or]: [{ code: nextCode }, { name_el: nextNameEl }]
      }
    });

    if (existing) {
      return res.status(400).json({ ok: false, error: { message: "Study program already exists" } });
    }

    await item.update(patch);

    await logAction({
      user_id: req.user?.id ?? null,
      action: "update_study_program",
      entity_type: "study_program",
      entity_id: item.id,
      details: patch
    });

    res.json({ ok: true, item });
  } catch (err) {
    next(err);
  }
}

export async function deleteStudyProgram(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, error: { message: "Invalid id" } });
    }

    const item = await StudyProgram.findByPk(id);
    if (!item) {
      return res.status(404).json({ ok: false, error: { message: "Study program not found" } });
    }

    const graduatesCount = await Graduate.count({ where: { study_program_id: id } });
    if (graduatesCount > 0) {
      return res.status(400).json({ ok: false, error: { message: "Το πρόγραμμα χρησιμοποιείται ήδη σε αποφοίτους" } });
    }

    const directionsCount = await ProgramDirection.count({ where: { study_program_id: id } });
    if (directionsCount > 0) {
      return res.status(400).json({ ok: false, error: { message: "Διαγράψτε πρώτα τις κατευθύνσεις του προγράμματος" } });
    }

    const details = { code: item.code, name_el: item.name_el };
    await item.destroy();

    await logAction({
      user_id: req.user?.id ?? null,
      action: "delete_study_program",
      entity_type: "study_program",
      entity_id: id,
      details
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
