import type { NextFunction, Request, Response } from "express";
import { Graduate } from "../models/Graduate";
import { ProgramDirection } from "../models/ProgramDirection";
import { StudyProgram } from "../models/StudyProgram";
import { Region } from "../models/Region";
import { buildGraduateWhere } from "../utils/buildGraduateWhere";
import { clamp, toInt } from "../utils/pagination";
import { logAction } from "../services/log.service";
import * as XLSX from "xlsx";
import { normHeader, toDateOnly, toInt, toNumber } from "../utils/importUtils";

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




export async function exportGraduates(req: Request, res: Response, next: NextFunction) {
  try {
    const where = buildGraduateWhere(req.query as Record<string, unknown>);
    const order = parseSort(req.query.sort);

    // Safety cap
    const limit = clamp(toInt(req.query.limit, 5000), 1, 10000);
    const rows = await Graduate.findAll({ where, order, limit });

    const data = rows.map((g) => ({
      id: (g as any).id,
      student_number: (g as any).student_number ?? "",
      ad_code: (g as any).ad_code ?? "",
      last_name: (g as any).last_name ?? "",
      first_name: (g as any).first_name ?? "",
      gender: (g as any).gender ?? "",
      entry_year: (g as any).entry_year ?? "",
      graduation_date: (g as any).graduation_date ?? "",
      oath_date: (g as any).oath_date ?? "",
      degree_grade: (g as any).degree_grade ?? "",
      birth_year: (g as any).birth_year ?? "",
      study_program_id: (g as any).study_program_id ?? "",
      program_direction_id: (g as any).program_direction_id ?? "",
      origin_region_id: (g as any).origin_region_id ?? "",
      origin_municipality: (g as any).origin_municipality ?? ""
    }));

    await logAction({
      user_id: req.user?.id ?? null,
      action: "export_graduates",
      entity_type: "graduate",
      entity_id: null,
      details: { format: "xlsx", limit, count: data.length }
    });

    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "graduates");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="graduates-${ts}.xlsx"`);
    return res.send(buf);
  } catch (err) {
    next(err);
  }
}




export async function importGraduates(req: Request, res: Response, next: NextFunction) {
  try {
    const file = (req as any).file as { buffer: Buffer; originalname: string; mimetype: string } | undefined;
    if (!file?.buffer) return res.status(400).json({ error: { message: "Missing file" } });

    const wb = XLSX.read(file.buffer, { type: "buffer", cellDates: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return res.status(400).json({ error: { message: "Empty workbook" } });
    const ws = wb.Sheets[sheetName];

    // Get raw rows as arrays to normalize headers ourselves
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
    if (rows.length < 2) return res.status(400).json({ error: { message: "No data rows" } });

    const headerRow = rows[0];
    const headers = headerRow.map((h) => normHeader(h));

    const col = (name: string) => headers.indexOf(normHeader(name));

    // Accept multiple header aliases (Greek/English)
    const idx = {
      student_number: firstIndex(headers, ["student_number","am","a_m","a.m","αμ","α.μ"]),
      ad_code: firstIndex(headers, ["ad_code","aa","a_a","a.a","αα","α.α"]),
      last_name: firstIndex(headers, ["last_name","επωνυμο","surname"]),
      first_name: firstIndex(headers, ["first_name","ονομα","name"]),
      father_name: firstIndex(headers, ["father_name","πατρωνυμο","father"]),
      gender: firstIndex(headers, ["gender","φυλο","sex"]),
      entry_year: firstIndex(headers, ["entry_year","ετος_εισαγωγης","entryyear"]),
      graduation_date: firstIndex(headers, ["graduation_date","ημ_αποφοιτησης","graduation"]),
      oath_date: firstIndex(headers, ["oath_date","ημ_ορκωμοσιας","oath"]),
      degree_grade: firstIndex(headers, ["degree_grade","βαθμος","grade"]),
      birth_year: firstIndex(headers, ["birth_year","ετος_γεννησης","birthyear"]),
      study_program_id: firstIndex(headers, ["study_program_id","study_prog","program_id","προγραμμα","program"]),
      program_direction_id: firstIndex(headers, ["program_direction_id","program_dir","direction_id","κατευθυνση","direction"]),
      origin_region_id: firstIndex(headers, ["origin_region_id","origin_regio","region_id","περιοχη","region"]),
      origin_municipality: firstIndex(headers, ["origin_municipality","δημος","municipality"]),
    };

    const required = ["student_number","ad_code","last_name","first_name","father_name","gender","entry_year","graduation_date","oath_date","degree_grade","birth_year","study_program_id"];
    const missingRequired = required.filter((k) => (idx as any)[k] === -1);
    if (missingRequired.length) {
      return res.status(400).json({
        error: { message: "Missing required columns", details: { missing: missingRequired } }
      });
    }

    type RowError = { row: number; column?: string; message: string; value?: any };
    const errors: RowError[] = [];
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (let r = 1; r < rows.length; r++) {
      const arr = rows[r];
      // skip completely empty rows
      if (arr.every((v) => String(v ?? "").trim() === "")) continue;

      const rowNum = r + 1; // excel row number
      const get = (key: keyof typeof idx) => (idx[key] >= 0 ? arr[idx[key]] : "");

      const student_number = String(get("student_number")).trim();
      const ad_code = String(get("ad_code")).trim();
      const last_name = String(get("last_name")).trim();
      const first_name = String(get("first_name")).trim();
      const father_name = String(get("father_name")).trim();
      const genderRaw = String(get("gender")).trim().toUpperCase();
      const gender = genderRaw === "M" || genderRaw === "F" ? genderRaw : null;
      const entry_year = toInt(get("entry_year"));
      const graduation_date = toDateOnly(get("graduation_date"));
      const oath_date = toDateOnly(get("oath_date"));
      const degree_grade = toNumber(get("degree_grade"));
      const birth_year = toInt(get("birth_year"));
      const study_program_id = toInt(get("study_program_id"));
      const program_direction_id = toInt(get("program_direction_id"));
      const origin_region_id = toInt(get("origin_region_id"));
      const origin_municipality = String(get("origin_municipality")).trim() || null;

      const rowProblems: RowError[] = [];
      const reqStr = (val: string, colName: string) => { if (!val) rowProblems.push({ row: rowNum, column: colName, message: "Required" }); };
      reqStr(student_number, "student_number");
      reqStr(ad_code, "ad_code");
      reqStr(last_name, "last_name");
      reqStr(first_name, "first_name");
      reqStr(father_name, "father_name");
      if (!gender) rowProblems.push({ row: rowNum, column: "gender", message: "Must be M or F", value: genderRaw });
      if (!entry_year) rowProblems.push({ row: rowNum, column: "entry_year", message: "Invalid integer", value: get("entry_year") });
      if (!graduation_date) rowProblems.push({ row: rowNum, column: "graduation_date", message: "Invalid date", value: get("graduation_date") });
      if (!oath_date) rowProblems.push({ row: rowNum, column: "oath_date", message: "Invalid date", value: get("oath_date") });
      if (degree_grade === null) rowProblems.push({ row: rowNum, column: "degree_grade", message: "Invalid number", value: get("degree_grade") });
      if (!birth_year) rowProblems.push({ row: rowNum, column: "birth_year", message: "Invalid integer", value: get("birth_year") });
      if (!study_program_id) rowProblems.push({ row: rowNum, column: "study_program_id", message: "Invalid integer", value: get("study_program_id") });

      if (rowProblems.length) {
        errors.push(...rowProblems);
        skipped++;
        continue;
      }

      const payload: any = {
        student_number,
        ad_code,
        last_name,
        first_name,
        father_name,
        gender,
        entry_year,
        graduation_date,
        oath_date,
        degree_grade,
        birth_year,
        study_program_id,
        program_direction_id: program_direction_id ?? null,
        origin_region_id: origin_region_id ?? null,
        origin_municipality
      };

      // Upsert by student_number (common stable identifier)
      const existing = await Graduate.findOne({ where: { student_number } });
      if (existing) {
        await existing.update(payload);
        updated++;
      } else {
        await Graduate.create(payload);
        inserted++;
      }
    }

    await logAction({
      user_id: req.user?.id ?? null,
      action: "import_graduates",
      entity_type: "graduate",
      entity_id: null,
      details: {
        file: file.originalname,
        total_rows: rows.length - 1,
        inserted,
        updated,
        skipped,
        errors: errors.length
      }
    });

    return res.json({
      ok: true,
      summary: {
        file: file.originalname,
        sheet: sheetName,
        total: rows.length - 1,
        inserted,
        updated,
        skipped,
        error_count: errors.length
      },
      errors: errors.slice(0, 500) // cap response size
    });
  } catch (err) {
    next(err);
  }
}

function firstIndex(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const i = headers.indexOf(normHeader(c));
    if (i >= 0) return i;
  }
  return -1;
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
      user_id: req.user?.id ?? null,
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
      user_id: req.user?.id ?? null,
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
      user_id: req.user?.id ?? null,
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
