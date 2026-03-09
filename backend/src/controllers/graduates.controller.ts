import type { NextFunction, Request, Response } from "express";
import { Graduate } from "../models/Graduate";
import { ProgramDirection } from "../models/ProgramDirection";
import { StudyProgram } from "../models/StudyProgram";
import { Region } from "../models/Region";
import { buildGraduateWhere } from "../utils/buildGraduateWhere";
import { clamp, toInt as toIntParam } from "../utils/pagination";
import { logAction } from "../services/log.service";
import * as XLSX from "xlsx";
import { normHeader, toDateOnly, toInt, toNumber } from "../utils/importUtils";
import { resolvePeripheryRegionId } from "../utils/resolvePeripheryRegionId";

const EXPORT_LANGS = new Set(["gr", "en"]);

type ExportLang = "gr" | "en";

function getExportLang(raw: unknown): ExportLang {
  return typeof raw === "string" && EXPORT_LANGS.has(raw) ? (raw as ExportLang) : "gr";
}

function getColumnLabels(lang: ExportLang) {
  if (lang === "en") {
    return {
      ad_code: "A.D.",
      student_number: "Student No.",
      last_name: "Last name",
      first_name: "First name",
      father_name: "Father name",
      gender: "Gender",
      entry_year: "Entry year",
      birth_year: "Birth year",
      degree_grade: "Degree grade",
      graduation_date: "Graduation date",
      oath_date: "Oath date",
      study_program: "Study program",
      direction: "Direction",
      origin_region: "Region",
      origin_municipality: "City"
    } as const;
  }

  return {
    ad_code: "Α.Δ.",
    student_number: "Α.Μ.",
    last_name: "Επώνυμο",
    first_name: "Όνομα",
    father_name: "Πατρώνυμο",
    gender: "Φύλο",
    entry_year: "Έτος εισαγωγής",
    birth_year: "Έτος γέννησης",
    degree_grade: "Βαθμός πτυχίου",
    graduation_date: "Ημ. αποφοίτησης",
    oath_date: "Ημ. ορκωμοσίας",
    study_program: "Πρόγραμμα σπουδών",
    direction: "Κατεύθυνση",
    origin_region: "Περιφέρεια",
    origin_municipality: "Πόλη"
  } as const;
}

const IMPORT_HEADER_ALIASES = {
  student_number: ["student_number","am","a_m","a.m","αμ","α.μ","student no.","student no","α.μ.","Α.Μ."],
  ad_code: ["ad_code","aa","a_a","a.a","αα","α.α","a.d.","a.d","α.δ.","α.δ","A.D.","Α.Δ."],
  last_name: ["last_name","επωνυμο","surname","last name"],
  first_name: ["first_name","ονομα","name","first name"],
  father_name: ["father_name","πατρωνυμο","father","father name"],
  gender: ["gender","φυλο","sex"],
  entry_year: ["entry_year","ετος_εισαγωγης","entryyear","έτος εισαγωγής","entry year"],
  graduation_date: ["graduation_date","ημ_αποφοιτησης","graduation","ημ. αποφοίτησης","graduation date","Ημ. αποφοίτησης"],
  oath_date: ["oath_date","ημ_ορκωμοσιας","oath","ημ. ορκωμοσίας","oath date","Ημ. ορκωμοσίας"],
  degree_grade: ["degree_grade","βαθμος","grade","βαθμός πτυχίου","degree grade"],
  birth_year: ["birth_year","ετος_γεννησης","έτος_γεννησης","year_of_birth","yob","έτος γέννησης","birth year"],
  birth_date: ["birth_date","ημερομηνια_γεννησης","ημ_γεννησης","birthdate","dob","birth date"],
  study_program: ["study_program","study_program_id","study_prog","program_id","προγραμμα","program","πρόγραμμα σπουδών","study program"],
  study_program_id: ["study_program_id","study_prog","program_id","προγραμμα","program"],
  program_direction: ["program_direction","program_direction_id","program_dir","direction_id","κατευθυνση","direction","κατεύθυνση"],
  program_direction_id: ["program_direction_id","program_dir","direction_id","κατευθυνση","direction"],
  origin_region_id: ["origin_region_id","origin_regio","region_id","περιοχη","region","περιφέρεια","origin region"],
  origin_municipality: ["origin_municipality","δημος","municipality","δήμος προέλευσης","municipality of origin","πόλη","city"],
} as const;

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
    "birth_date",
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

function parseIds(idsRaw: unknown): number[] {
  if (typeof idsRaw !== "string") return [];
  return Array.from(
    new Set(
      idsRaw
        .split(",")
        .map((v) => Number(String(v).trim()))
        .filter((v) => Number.isInteger(v) && v > 0)
    )
  );
}

function formatGenderValue(value: unknown, lang: ExportLang) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["m", "male", "man", "άνδρας", "ανδρας"].includes(normalized)) {
    return lang === "en" ? "Male" : "Άνδρας";
  }
  if (["f", "female", "woman", "γυναίκα", "γυναικα"].includes(normalized)) {
    return lang === "en" ? "Female" : "Γυναίκα";
  }
  return String(value ?? "").trim();
}

function buildExportRows(rows: any[], lang: ExportLang, programsById: Map<number, any>, directionsById: Map<number, any>, regionsById: Map<number, any>) {
  const labels = getColumnLabels(lang);

  return rows.map((g) => {
    const item = g as any;
    const studyProgram = programsById.get(Number(item.study_program_id));
    const direction = directionsById.get(Number(item.program_direction_id));
    const studyProgramName = studyProgram ? String(lang === "en" ? (studyProgram.name_en ?? studyProgram.name_el ?? studyProgram.code ?? studyProgram.id) : (studyProgram.name_el ?? studyProgram.name_en ?? studyProgram.code ?? studyProgram.id)) : "";
    const directionName = direction ? String(lang === "en" ? (direction.name_en ?? direction.name_el ?? direction.code ?? direction.id) : (direction.name_el ?? direction.name_en ?? direction.code ?? direction.id)) : "";
    const regionName = item.origin_region_id ? String(regionsById.get(Number(item.origin_region_id))?.name ?? "") : "";

    return {
      [labels.ad_code]: item.ad_code ?? "",
      [labels.student_number]: item.student_number ?? "",
      [labels.last_name]: item.last_name ?? "",
      [labels.first_name]: item.first_name ?? "",
      [labels.father_name]: item.father_name ?? "",
      [labels.gender]: formatGenderValue(item.gender, lang),
      [labels.entry_year]: item.entry_year ?? "",
      [labels.birth_year]: String(item.birth_date ?? "").slice(0, 4),
      [labels.degree_grade]: item.degree_grade ?? "",
      [labels.graduation_date]: item.graduation_date ?? "",
      [labels.oath_date]: item.oath_date ?? "",
      [labels.study_program]: item.study_program_id && studyProgramName ? `${item.study_program_id} (${studyProgramName})` : studyProgramName,
      [labels.direction]: directionName,
      [labels.origin_region]: regionName,
      [labels.origin_municipality]: item.origin_municipality ?? ""
    };
  });
}

function getTemplateHeaders(lang: ExportLang) {
  const labels = getColumnLabels(lang);
  return [[
    labels.ad_code,
    labels.student_number,
    labels.last_name,
    labels.first_name,
    labels.father_name,
    labels.gender,
    labels.entry_year,
    labels.birth_year,
    labels.degree_grade,
    labels.graduation_date,
    labels.oath_date,
    labels.study_program,
    labels.direction,
    labels.origin_region,
    labels.origin_municipality
  ]];
}

async function getProgramMaps() {
  const [programs, directions, regions] = await Promise.all([
    StudyProgram.findAll({ order: [["id", "ASC"]] }),
    ProgramDirection.findAll({ order: [["id", "ASC"]] }),
    Region.findAll({ where: { type: "PERIPHERY" }, order: [["id", "ASC"]] })
  ]);

  return {
    programsById: new Map(programs.map((item: any) => [Number(item.id), item])),
    directionsById: new Map(directions.map((item: any) => [Number(item.id), item])),
    regionsById: new Map(regions.map((item: any) => [Number(item.id), item]))
  };
}

function normalizeLookupValue(value: unknown) {
  return normHeader(String(value ?? "")).replace(/\./g, "").trim();
}

function resolveStudyProgramId(value: unknown, programsById: Map<number, any>) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const directId = toInt(raw);
  if (directId && programsById.has(directId)) return directId;

  const prefixId = raw.match(/^\s*(\d+)\s*(?:\(|-|$)/);
  if (prefixId) {
    const n = Number(prefixId[1]);
    if (programsById.has(n)) return n;
  }

  const normalized = normalizeLookupValue(raw);
  for (const [id, item] of programsById.entries()) {
    const candidates = [item.code, item.name_el, item.name_en, `${item.id} (${item.name_el ?? item.name_en ?? item.code ?? item.id})`, `${item.id} (${item.name_en ?? item.name_el ?? item.code ?? item.id})`]
      .filter(Boolean)
      .map(normalizeLookupValue);
    if (candidates.includes(normalized)) return id;
  }

  return null;
}

function resolveProgramDirectionId(value: unknown, directionsById: Map<number, any>, studyProgramId: number | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const directId = toInt(raw);
  if (directId && directionsById.has(directId)) {
    const item = directionsById.get(directId);
    if (!studyProgramId || Number(item?.study_program_id) === studyProgramId) return directId;
  }

  const prefixId = raw.match(/^\s*(\d+)\s*(?:\(|-|$)/);
  if (prefixId) {
    const n = Number(prefixId[1]);
    const item = directionsById.get(n);
    if (item && (!studyProgramId || Number(item.study_program_id) === studyProgramId)) return n;
  }

  const normalized = normalizeLookupValue(raw);
  for (const [id, item] of directionsById.entries()) {
    if (studyProgramId && Number(item.study_program_id) !== studyProgramId) continue;
    const candidates = [item.code, item.name_el, item.name_en].filter(Boolean).map(normalizeLookupValue);
    if (candidates.includes(normalized)) return id;
  }

  return null;
}
}

function resolveOriginRegionId(value: unknown, regionsById: Map<number, any>) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const directId = toInt(raw);
  if (directId && regionsById.has(directId)) return directId;

  const normalized = normalizeLookupValue(raw);
  for (const [id, item] of regionsById.entries()) {
    const candidates = [item.name].filter(Boolean).map(normalizeLookupValue);
    if (candidates.includes(normalized)) return id;
  }

  return null;
}

export async function listGraduates(req: Request, res: Response, next: NextFunction) {
  try {
    const page = clamp(toIntParam(req.query.page, 1), 1, 1_000_000);
    const pageSize = clamp(toIntParam(req.query.pageSize, 20), 1, 10000);
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
    const ids = parseIds(req.query.ids);
    const limit = clamp(toIntParam(req.query.limit, 5000), 1, 10000);
    const lang = getExportLang(req.query.lang);

    if (ids.length) {
      (where as any).id = ids;
    }

    const rows = await Graduate.findAll({ where, order, limit: ids.length ? undefined : limit });
    const { programsById, directionsById, regionsById } = await getProgramMaps();
    const data = buildExportRows(rows as any[], lang, programsById, directionsById, regionsById);

    await logAction({
      user_id: req.user?.id ?? null,
      action: "export_graduates",
      entity_type: "graduate",
      entity_id: null,
      details: { format: "xlsx", limit: ids.length ? null : limit, count: data.length, selected: ids.length || 0 }
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

export async function exportGraduatesImportTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const lang = getExportLang(req.query.lang);
    const ws = XLSX.utils.aoa_to_sheet(getTemplateHeaders(lang));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "graduates_import_template");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="graduates-import-template.xlsx"');
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
    const { programsById, directionsById, regionsById } = await getProgramMaps();
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return res.status(400).json({ error: { message: "Empty workbook" } });
    const ws = wb.Sheets[sheetName];

    
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
    if (rows.length < 2) return res.status(400).json({ error: { message: "No data rows" } });

    const headerRow = rows[0];
    const headers = headerRow.map((h) => normHeader(h));

    const col = (name: string) => headers.indexOf(normHeader(name));

    
    const idx = {
      student_number: firstIndex(headers, [...IMPORT_HEADER_ALIASES.student_number]),
      ad_code: firstIndex(headers, [...IMPORT_HEADER_ALIASES.ad_code]),
      last_name: firstIndex(headers, [...IMPORT_HEADER_ALIASES.last_name]),
      first_name: firstIndex(headers, [...IMPORT_HEADER_ALIASES.first_name]),
      father_name: firstIndex(headers, [...IMPORT_HEADER_ALIASES.father_name]),
      gender: firstIndex(headers, [...IMPORT_HEADER_ALIASES.gender]),
      entry_year: firstIndex(headers, [...IMPORT_HEADER_ALIASES.entry_year]),
      graduation_date: firstIndex(headers, [...IMPORT_HEADER_ALIASES.graduation_date]),
      oath_date: firstIndex(headers, [...IMPORT_HEADER_ALIASES.oath_date]),
      degree_grade: firstIndex(headers, [...IMPORT_HEADER_ALIASES.degree_grade]),
      
      birth_year: firstIndex(headers, [...IMPORT_HEADER_ALIASES.birth_year]),
      birth_date: firstIndex(headers, [...IMPORT_HEADER_ALIASES.birth_date]),
      study_program: firstIndex(headers, [...IMPORT_HEADER_ALIASES.study_program]),
      study_program_id: firstIndex(headers, [...IMPORT_HEADER_ALIASES.study_program_id]),
      program_direction: firstIndex(headers, [...IMPORT_HEADER_ALIASES.program_direction]),
      program_direction_id: firstIndex(headers, [...IMPORT_HEADER_ALIASES.program_direction_id]),
      origin_region_id: firstIndex(headers, [...IMPORT_HEADER_ALIASES.origin_region_id]),
      origin_municipality: firstIndex(headers, [...IMPORT_HEADER_ALIASES.origin_municipality]),
    };

    const required = ["student_number","ad_code","last_name","first_name","father_name","gender","entry_year","graduation_date","oath_date","degree_grade","study_program"];
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
      if (arr.every((v) => String(v ?? "").trim() === "")) continue;

      const rowNum = r + 1;
      const get = (key: keyof typeof idx) => (idx[key] >= 0 ? arr[idx[key]] : "");

      const student_number = String(get("student_number")).trim();
      const ad_code = String(get("ad_code")).trim();
      const last_name = String(get("last_name")).trim();
      const first_name = String(get("first_name")).trim();
      const father_name = String(get("father_name")).trim();
      const genderRaw = String(get("gender")).trim();
      const normalizedGender = normHeader(genderRaw).replace(/\./g, "");
      const gender = ["m", "male", "man", "άνδρας", "ανδρας"].includes(normalizedGender)
        ? "M"
        : ["f", "female", "woman", "γυναίκα", "γυναικα"].includes(normalizedGender)
          ? "F"
          : null;
      const entry_year = toInt(get("entry_year"));
      const graduation_date = toDateOnly(get("graduation_date"));
      const oath_date = toDateOnly(get("oath_date"));
      const degree_grade = toNumber(get("degree_grade"));
      const birth_year_raw = idx.birth_year >= 0 ? toInt(get("birth_year" as any)) : null;
      const birth_date_raw = idx.birth_date >= 0 ? toDateOnly(get("birth_date" as any)) : null;
      const birth_date = birth_date_raw || (birth_year_raw ? `${birth_year_raw}-01-01` : null);
      const study_program_source = idx.study_program >= 0 ? get("study_program") : get("study_program_id");
      const study_program_id = resolveStudyProgramId(study_program_source, programsById);
      const program_direction_source = idx.program_direction >= 0 ? get("program_direction") : get("program_direction_id");
      const program_direction_id = resolveProgramDirectionId(program_direction_source, directionsById, study_program_id);
      const origin_region_source = get("origin_region_id");
      const origin_region_id = resolveOriginRegionId(origin_region_source, regionsById);
      const origin_municipality = String(get("origin_municipality")).trim() || null;

      const rowProblems: RowError[] = [];
      const reqStr = (val: string, colName: string) => { if (!val) rowProblems.push({ row: rowNum, column: colName, message: "Required" }); };
      reqStr(student_number, "student_number");
      reqStr(ad_code, "ad_code");
      reqStr(last_name, "last_name");
      reqStr(first_name, "first_name");
      reqStr(father_name, "father_name");
      if (!gender) rowProblems.push({ row: rowNum, column: "gender", message: "Must be M/F or Άνδρας/Γυναίκα", value: genderRaw });
      if (!entry_year) rowProblems.push({ row: rowNum, column: "entry_year", message: "Invalid integer", value: get("entry_year") });
      if (!graduation_date) rowProblems.push({ row: rowNum, column: "graduation_date", message: "Invalid date", value: get("graduation_date") });
      if (!oath_date) rowProblems.push({ row: rowNum, column: "oath_date", message: "Invalid date", value: get("oath_date") });
      if (degree_grade === null) rowProblems.push({ row: rowNum, column: "degree_grade", message: "Invalid number", value: get("degree_grade") });
      if (!birth_date) rowProblems.push({ row: rowNum, column: "birth_date", message: "Invalid date", value: idx.birth_date >= 0 ? get("birth_date" as any) : get("birth_year" as any) });
      if (!study_program_id) rowProblems.push({ row: rowNum, column: "study_program", message: "Invalid value", value: study_program_source });

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
        birth_date,
        study_program_id,
        program_direction_id: program_direction_id ?? null,
        origin_region_id: await resolvePeripheryRegionId({
          origin_region_id: origin_region_id ?? null,
          origin_municipality,
        }),
        origin_municipality,
      };

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

    const ad_code_in = String(body.ad_code ?? "").trim();
    const last_name = String(body.last_name ?? "").trim();
    const first_name = String(body.first_name ?? "").trim();
    const father_name = String(body.father_name ?? "").trim();
    const student_number = String(body.student_number ?? "").trim();
    const gender = String(body.gender ?? "").trim();

    const study_program_id = Number(body.study_program_id);
    const entry_year = Number(body.entry_year);
    const degree_grade = Number(body.degree_grade);

    const graduation_date = String(body.graduation_date ?? "").trim(); // YYYY-MM-DD
    const oath_date = String(body.oath_date ?? "").trim(); // YYYY-MM-DD
    const birth_date = String(body.birth_date ?? "").trim(); // YYYY-MM-DD

    if (!last_name) return bad(res, "last_name is required");
    if (!first_name) return bad(res, "first_name is required");
    if (!father_name) return bad(res, "father_name is required");
    if (!student_number) return bad(res, "student_number is required");
    if (gender !== "M" && gender !== "F") return bad(res, "gender must be 'M' or 'F'");

    if (!Number.isFinite(study_program_id)) return bad(res, "study_program_id is required (number)");
    if (!Number.isFinite(entry_year)) return bad(res, "entry_year is required (number)");
    if (!Number.isFinite(degree_grade)) return bad(res, "degree_grade is required (number)");

    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(graduation_date)) return bad(res, "graduation_date must be YYYY-MM-DD");
    if (!dateRe.test(oath_date)) return bad(res, "oath_date must be YYYY-MM-DD");
    if (!dateRe.test(birth_date)) return bad(res, "birth_date must be YYYY-MM-DD");

    const program = await StudyProgram.findByPk(study_program_id);
    if (!program) return bad(res, "study_program_id not found");

    const program_direction_id = toNullableNumber(body.program_direction_id);
    if (program_direction_id === null) return bad(res, "program_direction_id is required");
    if (Number.isNaN(program_direction_id as any)) return bad(res, "program_direction_id must be a number");
    const dir = await ProgramDirection.findByPk(program_direction_id);
    if (!dir) return bad(res, "program_direction_id not found");
    if ((dir as any).study_program_id !== study_program_id) {
      return bad(res, "program_direction_id does not belong to study_program_id");
    }

    const origin_region_id = toNullableNumber(body.origin_region_id);
    if (origin_region_id === null) return bad(res, "origin_region_id is required");
    if (Number.isNaN(origin_region_id as any)) return bad(res, "origin_region_id must be a number");

    const origin_municipality = String(body.origin_municipality ?? "").trim();
    if (!origin_municipality) return bad(res, "origin_municipality is required");

    const periphery_origin_region_id = await resolvePeripheryRegionId({
      origin_region_id: origin_region_id ?? null,
      origin_municipality,
    });

    const created = await Graduate.create({
      ad_code: ad_code_in || `AD-${student_number}`,
      last_name,
      first_name,
      father_name,
      degree_grade,
      graduation_date,
      oath_date,
      entry_year,
      student_number,
      birth_date,
      gender,
      study_program_id,
      program_direction_id,
      origin_region_id: periphery_origin_region_id,
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

    const nextStudyProgramId =
      body.study_program_id === undefined ? (item as any).study_program_id : Number(body.study_program_id);

    if (!Number.isFinite(nextStudyProgramId)) return bad(res, "study_program_id must be a number");

    if (body.study_program_id !== undefined) {
      const program = await StudyProgram.findByPk(nextStudyProgramId);
      if (!program) return bad(res, "study_program_id not found");
    }

    if (body.gender !== undefined) {
      const g = String(body.gender ?? "").trim();
      if (g !== "M" && g !== "F") return bad(res, "gender must be 'M' or 'F'");
      (item as any).gender = g;
    }

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

    let originRegionTouched = false;
    if (body.origin_region_id !== undefined) {
      const origin_region_id = toNullableNumber(body.origin_region_id);
      if (Number.isNaN(origin_region_id as any)) return bad(res, "origin_region_id must be a number");
      (item as any).origin_region_id = origin_region_id;
      originRegionTouched = true;
    }

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
    setIf("birth_date", (v) => String(v ?? "").trim());
    if (body.origin_municipality !== undefined) originRegionTouched = true;
    setIf("origin_municipality", (v) => (v === "" ? null : String(v ?? "").trim()));

    if (originRegionTouched) {
      const normalized = await resolvePeripheryRegionId({
        origin_region_id: (item as any).origin_region_id ?? null,
        origin_municipality: (item as any).origin_municipality ?? null,
      });
      (item as any).origin_region_id = normalized;
    }

    if (body.study_program_id !== undefined) (item as any).study_program_id = nextStudyProgramId;    if (!String((item as any).ad_code ?? "").trim()) return bad(res, "ad_code cannot be empty");
    if (!String((item as any).last_name ?? "").trim()) return bad(res, "last_name cannot be empty");
    if (!String((item as any).first_name ?? "").trim()) return bad(res, "first_name cannot be empty");
    if (!String((item as any).father_name ?? "").trim()) return bad(res, "father_name cannot be empty");
    if (!String((item as any).student_number ?? "").trim()) return bad(res, "student_number cannot be empty");

    if (!Number.isFinite(Number((item as any).entry_year))) return bad(res, "entry_year must be a number");
    if (!Number.isFinite(Number((item as any).degree_grade))) return bad(res, "degree_grade must be a number");

    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(String((item as any).graduation_date ?? ""))) return bad(res, "graduation_date must be YYYY-MM-DD");
    if (!dateRe.test(String((item as any).oath_date ?? ""))) return bad(res, "oath_date must be YYYY-MM-DD");
    if (!dateRe.test(String((item as any).birth_date ?? ""))) return bad(res, "birth_date must be YYYY-MM-DD");

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

export async function normalizeGraduateOrigins(req: Request, res: Response, next: NextFunction) {
  try {

    const limit = clamp(toIntParam((req.query.limit as any) ?? 5000, 5000), 1, 20000);

    const grads = await Graduate.findAll({
      limit,
      attributes: ["id", "origin_region_id", "origin_municipality"],
    });

    let changed = 0;
    let unchanged = 0;

    for (const g of grads as any[]) {
      const normalized = await resolvePeripheryRegionId({
        origin_region_id: g.origin_region_id != null ? Number(g.origin_region_id) : null,
        origin_municipality: g.origin_municipality ? String(g.origin_municipality) : null,
      });

      const cur = g.origin_region_id != null ? Number(g.origin_region_id) : null;
      if (normalized !== cur) {
        await Graduate.update(
          { origin_region_id: normalized },
          { where: { id: Number(g.id) } }
        );
        changed++;
      } else {
        unchanged++;
      }
    }

    await logAction({
      user_id: req.user?.id ?? null,
      action: "normalize_graduate_origins",
      entity_type: "graduate",
      entity_id: null,
      details: { limit, changed, unchanged },
    });

    res.json({ ok: true, limit, changed, unchanged });
  } catch (err) {
    next(err);
  }
}
