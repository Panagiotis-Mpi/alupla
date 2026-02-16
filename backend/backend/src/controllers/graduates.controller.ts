import type { NextFunction, Request, Response } from "express";
import { Graduate } from "../models/Graduate";
import { ProgramDirection } from "../models/ProgramDirection";
import { StudyProgram } from "../models/StudyProgram";
import { Region } from "../models/Region";
import { buildGraduateWhere } from "../utils/buildGraduateWhere";
import { clamp, toInt } from "../utils/pagination";
import { logAction } from "../services/log.service";

function parseSort(sortRaw: unknown): Array<[string, "ASC" | "DESC"]> {
  const s = typeof sortRaw === "string" ? sortRaw.trim() : "";
  if (!s) return [["id", "ASC"]];

  const [field, dirRaw] = s.split(":");
  const dir = (dirRaw ?? "asc").toLowerCase() === "desc" ? "DESC" : "ASC";

  const allowed = new Set([
    "id",
    "last_name",
    "first_name",
    "entry_year",
    "graduation_date",
    "oath_date",
    "degree_grade",
    "birth_year",
    "study_program_id",
    "program_direction_id",
    "origin_region_id",
    "gender",
    "student_number",
    "ad_code"
  ]);

  if (!allowed.has(field)) return [["id", "ASC"]];
  return [[field, dir]];
}

function bad(res: Response, message: string) {
  return res.status(400).json({ ok: false, error: { message } });
}

function toNullableNumber(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export async function listGraduates(req: Request, res: Response, next: NextFunction) {
  try {
    const page = clamp(toInt(req.query.page, 1), 1, 1_000_000);
    const pageSize = clamp(toInt(req.query.pageSize, 20), 1, 200);
    const offset = (page - 1) * pageSize;

    const where = buildGraduateWhere(req.query as Record<string, unknown>);
    const order = parseSort(req.query.sort);

    const { rows, count } = await Graduate.findAndCountAll({
      where,
      order,
      limit: pageSize,
      offset
    });

    res.json({
      ok: true,
      page,
      pageSize,
      total: count,
      items: rows
    });
  } catch (err) {
    next(err);
  }
}

export async function getGraduate(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, "Invalid id");

    const item = await Graduate.findByPk(id);
    if (!item) return res.status(404).json({ ok: false, error: { message: "Not found" } });

    res.json({ ok: true, item });
  } catch (err) {
    next(err);
  }
}

export async function createGraduate(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body ?? {};

    const ad_code = String(body.ad_code ?? "").trim();
    const last_name = String(body.last_name ?? "").trim();
    const first_name = String(body.first_name ?? "").trim();
    const father_name = String(body.father_name ?? "").trim();
    const student_number = String(body.student_number ?? "").trim();
    const gender = String(body.gender ?? "").trim();

    const study_program_id = Number(body.study_program_id);
    const entry_year = Number(body.entry_year);
    const birth_year = Number(body.birth_year);
    const degree_grade = Number(body.degree_grade);

    const graduation_date = String(body.graduation_date ?? "").trim(); // YYYY-MM-DD
    const oath_date = String(body.oath_date ?? "").trim(); // YYYY-MM-DD

    if (!ad_code) return bad(res, "ad_code is required");
    if (!last_name) return bad(res, "last_name is required");
    if (!first_name) return bad(res, "first_name is required");
    if (!father_name) return bad(res, "father_name is required");
    if (!student_number) return bad(res, "student_number is required");
    if (gender !== "M" && gender !== "F") return bad(res, "gender must be 'M' or 'F'");

    if (!Number.isFinite(study_program_id)) return bad(res, "study_program_id is required (number)");
    if (!Number.isFinite(entry_year)) return bad(res, "entry_year is required (number)");
    if (!Number.isFinite(birth_year)) return bad(res, "birth_year is required (number)");
    if (!Number.isFinite(degree_grade)) return bad(res, "degree_grade is required (number)");

    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(graduation_date)) return bad(res, "graduation_date must be YYYY-MM-DD");
    if (!dateRe.test(oath_date)) return bad(res, "oath_date must be YYYY-MM-DD");

    const program = await StudyProgram.findByPk(study_program_id);
    if (!program) return bad(res, "study_program_id not found");

    const program_direction_id = toNullableNumber(body.program_direction_id);
    if (Number.isNaN(program_direction_id as any)) return bad(res, "program_direction_id must be a number");
    if (program_direction_id !== null) {
      const dir = await ProgramDirection.findByPk(program_direction_id);
      if (!dir) return bad(res, "program_direction_id not found");
      if ((dir as any).study_program_id !== study_program_id) {
        return bad(res, "program_direction_id does not belong to study_program_id");
      }
    }

    const origin_region_id = toNullableNumber(body.origin_region_id);
    if (Number.isNaN(origin_region_id as any)) return bad(res, "origin_region_id must be a number");

    if (origin_region_id !== null) {
      const region = await Region.findByPk(origin_region_id);
      if (!region) return bad(res, "origin_region_id not found");
    }

    const origin_municipality =
      body.origin_municipality === undefined || body.origin_municipality === null || body.origin_municipality === ""
        ? null
        : String(body.origin_municipality).trim();

    const created = await Graduate.create({
      ad_code,
      last_name,
      first_name,
      father_name,
      degree_grade,
      graduation_date,
      oath_date,
      entry_year,
      student_number,
      birth_year,
      gender,
      study_program_id,
      program_direction_id,
      origin_region_id,
      origin_municipality
    } as any);

    await logAction({
      user_id: null,
      action: "create_graduate",
      entity_type: "graduate",
      entity_id: (created as any).id,
      details: { student_number }
    });

    res.status(201).json({ ok: true, item: created });
  } catch (err) {
    next(err);
  }
}


export async function updateGraduate(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, "Invalid id");

    const item = await Graduate.findByPk(id);
    if (!item) return res.status(404).json({ ok: false, error: { message: "Not found" } });

    const body = req.body ?? {};

    // Determine next study_program_id (needed for direction validation)
    const nextStudyProgramId =
      body.study_program_id === undefined ? (item as any).study_program_id : Number(body.study_program_id);

    if (!Number.isFinite(nextStudyProgramId)) return bad(res, "study_program_id must be a number");

    // If changed (or provided), validate exists
    if (body.study_program_id !== undefined) {
      const program = await StudyProgram.findByPk(nextStudyProgramId);
      if (!program) return bad(res, "study_program_id not found");
    }

    // Validate gender if provided
    if (body.gender !== undefined) {
      const g = String(body.gender ?? "").trim();
      if (g !== "M" && g !== "F") return bad(res, "gender must be 'M' or 'F'");
      (item as any).gender = g;
    }

    // Validate direction if provided
    if (body.program_direction_id !== undefined) {
      const program_direction_id = toNullableNumber(body.program_direction_id);
      if (Number.isNaN(program_direction_id as any)) return bad(res, "program_direction_id must be a number");

      if (program_direction_id !== null) {
        const dir = await ProgramDirection.findByPk(program_direction_id);
        if (!dir) return bad(res, "program_direction_id not found");
        if ((dir as any).study_program_id !== nextStudyProgramId) {
          return bad(res, "program_direction_id does not belong to study_program_id");
        }
      }

      (item as any).program_direction_id = program_direction_id;
    }

    // Validate region if provided
    if (body.origin_region_id !== undefined) {
      const origin_region_id = toNullableNumber(body.origin_region_id);
      if (Number.isNaN(origin_region_id as any)) return bad(res, "origin_region_id must be a number");

      if (origin_region_id !== null) {
        const region = await Region.findByPk(origin_region_id);
        if (!region) return bad(res, "origin_region_id not found");
      }

      (item as any).origin_region_id = origin_region_id;
    }

    // Apply other fields (if present)
    const setIf = (key: string, fn?: (v: any) => any) => {
      if (body[key] !== undefined) (item as any)[key] = fn ? fn(body[key]) : body[key];
    };

    setIf("last_name", (v) => String(v ?? "").trim());
    setIf("first_name", (v) => String(v ?? "").trim());
    setIf("father_name", (v) => String(v ?? "").trim());
    setIf("ad_code", (v) => String(v ?? "").trim());
    setIf("student_number", (v) => String(v ?? "").trim());
    setIf("degree_grade", (v) => (v === "" ? NaN : Number(v)));
    setIf("graduation_date", (v) => String(v ?? "").trim());
    setIf("oath_date", (v) => String(v ?? "").trim());
    setIf("entry_year", (v) => (v === "" ? NaN : Number(v)));
    setIf("birth_year", (v) => (v === "" ? NaN : Number(v)));
    setIf("origin_municipality", (v) => (v === "" ? null : String(v ?? "").trim()));

    if (body.study_program_id !== undefined) (item as any).study_program_id = nextStudyProgramId;    // Required still after updates (basic sanity)
    if (!String((item as any).ad_code ?? "").trim()) return bad(res, "ad_code cannot be empty");
    if (!String((item as any).last_name ?? "").trim()) return bad(res, "last_name cannot be empty");
    if (!String((item as any).first_name ?? "").trim()) return bad(res, "first_name cannot be empty");
    if (!String((item as any).father_name ?? "").trim()) return bad(res, "father_name cannot be empty");
    if (!String((item as any).student_number ?? "").trim()) return bad(res, "student_number cannot be empty");

    if (!Number.isFinite(Number((item as any).entry_year))) return bad(res, "entry_year must be a number");
    if (!Number.isFinite(Number((item as any).birth_year))) return bad(res, "birth_year must be a number");
    if (!Number.isFinite(Number((item as any).degree_grade))) return bad(res, "degree_grade must be a number");

    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(String((item as any).graduation_date ?? ""))) return bad(res, "graduation_date must be YYYY-MM-DD");
    if (!dateRe.test(String((item as any).oath_date ?? ""))) return bad(res, "oath_date must be YYYY-MM-DD");

    await item.save();

    await logAction({
      user_id: null,
      action: "update_graduate",
      entity_type: "graduate",
      entity_id: id,
      details: { changed: Object.keys(body) }
    });

    res.json({ ok: true, item });
  } catch (err) {
    next(err);
  }
}

export async function deleteGraduate(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, "Invalid id");

    const item = await Graduate.findByPk(id);
    if (!item) return res.status(404).json({ ok: false, error: { message: "Not found" } });

    await item.destroy();

    await logAction({
      user_id: null,
      action: "delete_graduate",
      entity_type: "graduate",
      entity_id: id,
      details: null
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
