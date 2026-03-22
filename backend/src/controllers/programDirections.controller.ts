import type { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import { Graduate } from "../models/Graduate";
import { ProgramDirection } from "../models/ProgramDirection";
import { StudyProgram } from "../models/StudyProgram";
import { logAction } from "../services/log.service";

type DirectionPatch = {
  study_program_id?: number;
  code?: string;
  name_el?: string;
  name_en?: string | null;
  is_active?: boolean;
};

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function invalid(res: Response, message: string) {
  return res.status(400).json({ ok: false, error: { message } });
}

function missing(res: Response, message: string) {
  return res.status(404).json({ ok: false, error: { message } });
}

function parseId(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function findStudyProgramOrFail(studyProgramId: number, res: Response) {
  const program = await StudyProgram.findByPk(studyProgramId);
  if (!program) {
    missing(res, "Study program not found");
    return null;
  }
  return program;
}

async function findDirectionOrFail(id: number, res: Response) {
  const item = await ProgramDirection.findByPk(id);
  if (!item) {
    missing(res, "Direction not found");
    return null;
  }
  return item;
}

async function findDuplicateDirection(studyProgramId: number, code: string, nameEl: string, excludedId?: number) {
  return ProgramDirection.findOne({
    where: {
      ...(excludedId !== undefined ? { id: { [Op.ne]: excludedId } } : {}),
      study_program_id: studyProgramId,
      [Op.or]: [{ code }, { name_el: nameEl }]
    }
  });
}

function hasChanges(patch: DirectionPatch) {
  return Object.keys(patch).length > 0;
}

export async function listProgramDirections(req: Request, res: Response, next: NextFunction) {
  try {
    const where: Record<string, number> = {};
    const studyProgramId = req.query.study_program_id;

    if (studyProgramId !== undefined && studyProgramId !== "") {
      const parsedStudyProgramId = parseId(studyProgramId);
      if (parsedStudyProgramId === undefined) {
        return invalid(res, "study_program_id must be a number");
      }
      where.study_program_id = parsedStudyProgramId;
    }

    const items = await ProgramDirection.findAll({
      where,
      order: [["study_program_id", "ASC"], ["name_el", "ASC"]]
    });

    res.json({ ok: true, items });
  } catch (error) {
    next(error);
  }
}

export async function createProgramDirection(req: Request, res: Response, next: NextFunction) {
  try {
    const studyProgramId = parseId(req.body?.study_program_id);
    const code = readText(req.body?.code);
    const nameEl = readText(req.body?.name_el);
    const nameEn = readText(req.body?.name_en) || null;
    const isActive = req.body?.is_active === undefined ? true : Boolean(req.body.is_active);

    if (studyProgramId === undefined || !code || !nameEl) {
      return invalid(res, "study_program_id, code and name_el are required");
    }

    const program = await findStudyProgramOrFail(studyProgramId, res);
    if (!program) {
      return;
    }

    const existing = await findDuplicateDirection(studyProgramId, code, nameEl);
    if (existing) {
      return invalid(res, "Direction already exists for this study program");
    }

    const item = await ProgramDirection.create({
      study_program_id: studyProgramId,
      code,
      name_el: nameEl,
      name_en: nameEn,
      is_active: isActive
    });

    await logAction({
      user_id: req.user?.id ?? null,
      action: "create_program_direction",
      entity_type: "program_direction",
      entity_id: item.id,
      details: { study_program_id: studyProgramId, code, name_el: nameEl }
    });

    res.status(201).json({ ok: true, item });
  } catch (error) {
    next(error);
  }
}

export async function updateProgramDirection(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseId(req.params.id);
    if (id === undefined) {
      return invalid(res, "Invalid id");
    }

    const item = await findDirectionOrFail(id, res);
    if (!item) {
      return;
    }

    const patch: DirectionPatch = {};

    if (req.body?.study_program_id !== undefined) {
      const studyProgramId = parseId(req.body.study_program_id);
      if (studyProgramId === undefined) {
        return invalid(res, "study_program_id must be a number");
      }
      const program = await findStudyProgramOrFail(studyProgramId, res);
      if (!program) {
        return;
      }
      patch.study_program_id = studyProgramId;
    }

    if (req.body?.code !== undefined) {
      const code = readText(req.body.code);
      if (!code) {
        return invalid(res, "code is required");
      }
      patch.code = code;
    }

    if (req.body?.name_el !== undefined) {
      const nameEl = readText(req.body.name_el);
      if (!nameEl) {
        return invalid(res, "name_el is required");
      }
      patch.name_el = nameEl;
    }

    if (req.body?.name_en !== undefined) {
      patch.name_en = readText(req.body.name_en) || null;
    }

    if (req.body?.is_active !== undefined) {
      patch.is_active = Boolean(req.body.is_active);
    }

    if (!hasChanges(patch)) {
      return invalid(res, "No changes provided");
    }

    const nextStudyProgramId = patch.study_program_id ?? item.study_program_id;
    const nextCode = patch.code ?? item.code;
    const nextNameEl = patch.name_el ?? item.name_el;

    const existing = await findDuplicateDirection(nextStudyProgramId, nextCode, nextNameEl, id);
    if (existing) {
      return invalid(res, "Direction already exists for this study program");
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
  } catch (error) {
    next(error);
  }
}

export async function deleteProgramDirection(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseId(req.params.id);
    if (id === undefined) {
      return invalid(res, "Invalid id");
    }

    const item = await findDirectionOrFail(id, res);
    if (!item) {
      return;
    }

    const graduatesCount = await Graduate.count({ where: { program_direction_id: id } });
    if (graduatesCount > 0) {
      return invalid(res, "Η κατεύθυνση χρησιμοποιείται ήδη σε αποφοίτους");
    }

    const details = {
      code: item.code,
      name_el: item.name_el,
      study_program_id: item.study_program_id
    };

    await item.destroy();

    await logAction({
      user_id: req.user?.id ?? null,
      action: "delete_program_direction",
      entity_type: "program_direction",
      entity_id: id,
      details
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}
