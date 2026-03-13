import type { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import { ProgramDirection } from "../models/ProgramDirection";
import { StudyProgram } from "../models/StudyProgram";
import { Graduate } from "../models/Graduate";
import { logAction } from "../services/log.service";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function listProgramDirections(req: Request, res: Response, next: NextFunction) {
  try {
    const studyProgramIdRaw = req.query.study_program_id;
    const where: Record<string, number> = {};

    if (studyProgramIdRaw !== undefined && studyProgramIdRaw !== "") {
      const study_program_id = Number(studyProgramIdRaw);
      if (!Number.isFinite(study_program_id)) {
        return res.status(400).json({ ok: false, error: { message: "study_program_id must be a number" } });
      }
      where.study_program_id = study_program_id;
    }

    const items = await ProgramDirection.findAll({
      where,
      order: [["study_program_id", "ASC"], ["name_el", "ASC"]]
    });

    res.json({ ok: true, items });
  } catch (err) {
    next(err);
  }
}

export async function createProgramDirection(req: Request, res: Response, next: NextFunction) {
  try {
    const study_program_id = Number(req.body?.study_program_id);
    const code = normalizeString(req.body?.code);
    const name_el = normalizeString(req.body?.name_el);
    const name_en = normalizeString(req.body?.name_en) || null;
    const is_active = req.body?.is_active === undefined ? true : Boolean(req.body.is_active);

    if (!Number.isFinite(study_program_id) || !code || !name_el) {
      return res.status(400).json({ ok: false, error: { message: "study_program_id, code and name_el are required" } });
    }

    const program = await StudyProgram.findByPk(study_program_id);
    if (!program) {
      return res.status(404).json({ ok: false, error: { message: "Study program not found" } });
    }

    const existing = await ProgramDirection.findOne({
      where: {
        study_program_id,
        [Op.or]: [{ code }, { name_el }]
      }
    });

    if (existing) {
      return res.status(400).json({ ok: false, error: { message: "Direction already exists for this study program" } });
    }

    const item = await ProgramDirection.create({ study_program_id, code, name_el, name_en, is_active });

    await logAction({
      user_id: req.user?.id ?? null,
      action: "create_program_direction",
      entity_type: "program_direction",
      entity_id: item.id,
      details: { study_program_id, code, name_el }
    });

    res.status(201).json({ ok: true, item });
  } catch (err) {
    next(err);
  }
}

export async function updateProgramDirection(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, error: { message: "Invalid id" } });
    }

    const item = await ProgramDirection.findByPk(id);
    if (!item) {
      return res.status(404).json({ ok: false, error: { message: "Direction not found" } });
    }

    const patch: Record<string, unknown> = {};

    if (req.body?.study_program_id !== undefined) {
      const study_program_id = Number(req.body.study_program_id);
      if (!Number.isFinite(study_program_id)) {
        return res.status(400).json({ ok: false, error: { message: "study_program_id must be a number" } });
      }
      const program = await StudyProgram.findByPk(study_program_id);
      if (!program) {
        return res.status(404).json({ ok: false, error: { message: "Study program not found" } });
      }
      patch.study_program_id = study_program_id;
    }

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

    const nextStudyProgramId = (patch.study_program_id as number | undefined) ?? item.study_program_id;
    const nextCode = (patch.code as string | undefined) ?? item.code;
    const nextNameEl = (patch.name_el as string | undefined) ?? item.name_el;

    const existing = await ProgramDirection.findOne({
      where: {
        id: { [Op.ne]: id },
        study_program_id: nextStudyProgramId,
        [Op.or]: [{ code: nextCode }, { name_el: nextNameEl }]
      }
    });

    if (existing) {
      return res.status(400).json({ ok: false, error: { message: "Direction already exists for this study program" } });
    }

    await item.update(patch);

    await logAction({
      user_id: req.user?.id ?? null,
      action: "update_program_direction",
      entity_type: "program_direction",
      entity_id: item.id,
      details: patch
    });

    res.json({ ok: true, item });
  } catch (err) {
    next(err);
  }
}

export async function deleteProgramDirection(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, error: { message: "Invalid id" } });
    }

    const item = await ProgramDirection.findByPk(id);
    if (!item) {
      return res.status(404).json({ ok: false, error: { message: "Direction not found" } });
    }

    const graduatesCount = await Graduate.count({ where: { program_direction_id: id } });
    if (graduatesCount > 0) {
      return res.status(400).json({ ok: false, error: { message: "Η κατεύθυνση χρησιμοποιείται ήδη σε αποφοίτους" } });
    }

    const details = { code: item.code, name_el: item.name_el, study_program_id: item.study_program_id };
    await item.destroy();

    await logAction({
      user_id: req.user?.id ?? null,
      action: "delete_program_direction",
      entity_type: "program_direction",
      entity_id: id,
      details
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
