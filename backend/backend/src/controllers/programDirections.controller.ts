import type { NextFunction, Request, Response } from "express";
import { ProgramDirection } from "../models/ProgramDirection";

export async function listProgramDirections(req: Request, res: Response, next: NextFunction) {
  try {
    const sp = Number(req.query.study_program_id);
    if (!Number.isFinite(sp)) {
      return res.status(400).json({ ok: false, error: { message: "study_program_id is required (number)" } });
    }

    const items = await ProgramDirection.findAll({
      where: { study_program_id: sp },
      order: [["name_el", "ASC"]]
    });

    res.json({ ok: true, items });
  } catch (err) {
    next(err);
  }
}
