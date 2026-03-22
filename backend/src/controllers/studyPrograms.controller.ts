import type { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import { Graduate } from "../models/Graduate";
import { ProgramDirection } from "../models/ProgramDirection";
import { StudyProgram } from "../models/StudyProgram";
import { logAction } from "../services/log.service";

type StudyProgramPatch = {
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

async function findStudyProgramOrFail(id: number, res: Response) {
  const item = await StudyProgram.findByPk(id);
  if (!item) {
    missing(res, "Study program not found");
    return null;
  }
  return item;
}

async function findDuplicateStudyProgram(code: string, nameEl: string, excludedId?: number) {
  return StudyProgram.findOne({
    where: {
      ...(excludedId !== undefined ? { id: { [Op.ne]: excludedId } } : {}),
      [Op.or]: [{ code }, { name_el: nameEl }]
    }
  });
}

function hasChanges(patch: StudyProgramPatch) {
  return Object.keys(patch).length > 0;
}

export async function listStudyPrograms(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await StudyProgram.findAll({
      order: [["id", "ASC"]]
    });

    res.json({ ok: true, items });
  } catch (error) {
    next(error);
  }
}

export async function createStudyProgram(req: Request, res: Response, next: NextFunction) {
  try {
    const code = readText(req.body?.code);
    const nameEl = readText(req.body?.name_el);
    const nameEn = readText(req.body?.name_en) || null;
    const isActive = req.body?.is_active === undefined ? true : Boolean(req.body.is_active);

    if (!code || !nameEl) {
      return invalid(res, "code and name_el are required");
    }

    const existing = await findDuplicateStudyProgram(code, nameEl);
    if (existing) {
      return invalid(res, "Study program already exists");
    }

    const item = await StudyProgram.create({
      code,
      name_el: nameEl,
      name_en: nameEn,
      is_active: isActive
    });

    await logAction({
      user_id: req.user?.id ?? null,
      action: "create_study_program",
      entity_type: "study_program",
      entity_id: item.id,
      details: { code, name_el: nameEl }
    });

    res.status(201).json({ ok: true, item });
  } catch (error) {
    next(error);
  }
}

export async function updateStudyProgram(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseId(req.params.id);
    if (id === undefined) {
      return invalid(res, "Invalid id");
    }

    const item = await findStudyProgramOrFail(id, res);
    if (!item) {
      return;
    }

    const patch: StudyProgramPatch = {};

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

    const nextCode = patch.code ?? item.code;
    const nextNameEl = patch.name_el ?? item.name_el;

    const existing = await findDuplicateStudyProgram(nextCode, nextNameEl, id);
    if (existing) {
      return invalid(res, "Study program already exists");
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
  } catch (error) {
    next(error);
  }
}

export async function deleteStudyProgram(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseId(req.params.id);
    if (id === undefined) {
      return invalid(res, "Invalid id");
    }

    const item = await findStudyProgramOrFail(id, res);
    if (!item) {
      return;
    }

    const graduatesCount = await Graduate.count({ where: { study_program_id: id } });
    if (graduatesCount > 0) {
      return invalid(res, "Το πρόγραμμα χρησιμοποιείται ήδη σε αποφοίτους");
    }

    const directionsCount = await ProgramDirection.count({ where: { study_program_id: id } });
    if (directionsCount > 0) {
      return invalid(res, "Διαγράψτε πρώτα τις κατευθύνσεις του προγράμματος");
    }

    const details = {
      code: item.code,
      name_el: item.name_el
    };

    await item.destroy();

    await logAction({
      user_id: req.user?.id ?? null,
      action: "delete_study_program",
      entity_type: "study_program",
      entity_id: id,
      details
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}
