import type { NextFunction, Request, Response } from "express";
import { StudyProgram } from "../models/StudyProgram";

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
