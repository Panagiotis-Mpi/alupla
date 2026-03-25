import fs from "node:fs";
import type { NextFunction, Request, Response } from "express";
import { Graduate } from "../models/Graduate";
import { ProgramDirection } from "../models/ProgramDirection";
import { StudyProgram } from "../models/StudyProgram";
import { Region } from "../models/Region";
import { buildGraduateWhere } from "../utils/buildGraduateWhere";
import { clamp, toInt as toIntParam } from "../utils/pagination";
import { logAction } from "../services/log.service";
import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import { normHeader, toDateOnly, toInt, toNumber } from "../utils/importUtils";
import { normalizeOriginLocation, type NormalizedOriginResult } from "../utils/resolvePeripheryRegionId";

const EXPORT_LANGS = new Set(["gr", "en"]);

type ExportLang = "gr" | "en";
type GraduateFileFormat = "xlsx" | "csv" | "pdf";

function getExportLang(raw: unknown): ExportLang {
  return typeof raw === "string" && EXPORT_LANGS.has(raw) ? (raw as ExportLang) : "gr";
}

function getGraduateFileFormat(raw: unknown): GraduateFileFormat {
  const format = String(raw ?? "").trim().toLowerCase();
  if (format === "csv") return "csv";
  if (format === "pdf") return "pdf";
  return "xlsx";
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
  last_name: ["last_name","επωνυμο","επώνυμο","surname","last name"],
  first_name: ["first_name","ονομα","όνομα","name","first name"],
  father_name: ["father_name","πατρωνυμο","πατρώνυμο","father","father name"],
  gender: ["gender","φυλο","φύλο","sex"],
  entry_year: ["entry_year","ετος_εισαγωγης","έτος_εισαγωγής","entryyear","έτος εισαγωγής","entry year"],
  graduation_date: ["graduation_date","ημ_αποφοιτησης","ημ._αποφοίτησης","graduation","ημ. αποφοίτησης","graduation date","Ημ. αποφοίτησης"],
  oath_date: ["oath_date","ημ_ορκωμοσιας","ημ._ορκωμοσίας","oath","ημ. ορκωμοσίας","oath date","Ημ. ορκωμοσίας"],
  degree_grade: ["degree_grade","βαθμος","βαθμός","grade","βαθμός πτυχίου","degree grade"],
  birth_year: ["birth_year","ετος_γεννησης","έτος_γεννησης","year_of_birth","yob","έτος γέννησης","birth year"],
  birth_date: ["birth_date","ημερομηνια_γεννησης","ημερομηνία_γέννησης","ημ_γεννησης","ημ._γέννησης","birthdate","dob","birth date"],
  study_program: ["study_program","study_program_id","study_prog","program_id","προγραμμα","πρόγραμμα","program","πρόγραμμα σπουδών","study program"],
  study_program_id: ["study_program_id","study_prog","program_id","προγραμμα","πρόγραμμα","program"],
  program_direction: ["program_direction","program_direction_id","program_dir","direction_id","κατευθυνση","κατεύθυνση","direction"],
  program_direction_id: ["program_direction_id","program_dir","direction_id","κατευθυνση","κατεύθυνση","direction"],
  origin_region: ["origin_region","origin_region_id","origin_regio","region_id","περιοχη","περιοχή","περιφέρεια","region"],
  origin_region_id: ["origin_region_id","origin_regio","region_id","περιοχη","περιοχή","περιφέρεια","region"],
  origin_municipality: ["origin_municipality","δημος","δήμος","πόλη","municipality","city","δήμος προέλευσης","municipality of origin"],
} as const;

const GRADUATE_SORT_FIELDS = new Set([
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

function toSortDirection(value: unknown): "ASC" | "DESC" {
  return String(value ?? "asc").trim().toLowerCase() === "desc" ? "DESC" : "ASC";
}

function parseSort(sortRaw: unknown): Array<[string, "ASC" | "DESC"]> {
  const raw = typeof sortRaw === "string" ? sortRaw.trim() : "";
  if (!raw) return [["id", "ASC"]];

  const parts = raw.split(":");
  const field = String(parts[0] ?? "").trim();
  if (!GRADUATE_SORT_FIELDS.has(field)) return [["id", "ASC"]];

  return [[field, toSortDirection(parts[1])]];
}

function bad(res: Response, message: string) {
  return res.status(400).json({ ok: false, error: { message } });
}

function toNullableNumber(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_GRADUATE_AGE = 23;
const MIN_GRADUATION_YEARS = 5;

type RuleLang = "gr" | "en";

type RuleViolationCode = "age_under_minimum" | "graduation_duration_under_minimum";

type GraduateRuleViolation = {
  code: RuleViolationCode;
  message: string;
};

function getRuleLang(raw: unknown): RuleLang {
  return typeof raw === "string" && String(raw).toLowerCase().startsWith("en") ? "en" : "gr";
}

function getRuleViolationMessage(code: RuleViolationCode, lang: RuleLang) {
  if (lang === "en") {
    if (code === "age_under_minimum") return "Graduate age must be at least 23 years.";
    return "Graduation time must be at least 5 years from entry year.";
  }
  if (code === "age_under_minimum") return "Η ηλικία αποφοίτησης πρέπει να είναι τουλάχιστον 23 έτη.";
  return "Ο χρόνος αποφοίτησης πρέπει να είναι τουλάχιστον 5 έτη από το έτος εισαγωγής.";
}

function parseYear(value: unknown) {
  const year = Number(String(value ?? "").slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function getGraduateRuleViolations(input: { entry_year: number | null; birth_date: string | null; graduation_date: string | null }, lang: RuleLang): GraduateRuleViolation[] {
  const violations: GraduateRuleViolation[] = [];
  const entryYear = input.entry_year;
  const birthYear = parseYear(input.birth_date);
  const graduationYear = parseYear(input.graduation_date);

  if (birthYear && graduationYear && graduationYear - birthYear < MIN_GRADUATE_AGE) {
    violations.push({
      code: "age_under_minimum",
      message: getRuleViolationMessage("age_under_minimum", lang)
    });
  }

  if (entryYear && graduationYear && graduationYear - entryYear < MIN_GRADUATION_YEARS) {
    violations.push({
      code: "graduation_duration_under_minimum",
      message: getRuleViolationMessage("graduation_duration_under_minimum", lang)
    });
  }

  return violations;
}

function buildImportViolationSummary(violations: GraduateRuleViolation[], lang: RuleLang) {
  const uniqueCodes = Array.from(new Set(violations.map((item) => item.code)));
  const reasons = uniqueCodes.map((code) => getRuleViolationMessage(code, lang));
  if (lang === "en") {
    return `Record skipped due to study regulation rules: ${reasons.join(" ")}`;
  }
  return `Η εγγραφή παραλείφθηκε λόγω παραβίασης των προβλεπόμενων κανονισμών: ${reasons.join(" ")}`;
}

function notFound(res: Response) {
  return res.status(404).json({ ok: false, error: { message: "Not found" } });
}

function requireNumberField(res: Response, value: number, field: string) {
  if (!Number.isFinite(value)) return bad(res, `${field} is required (number)`);
  return null;
}

function requireNonEmptyString(res: Response, value: string, field: string) {
  if (!value) return bad(res, `${field} is required`);
  return null;
}

function requireDateOnly(res: Response, value: string, field: string) {
  if (!DATE_ONLY_RE.test(value)) return bad(res, `${field} must be YYYY-MM-DD`);
  return null;
}

function parseStoredGender(value: unknown) {
  const raw = String(value ?? "").trim();
  return raw === "M" || raw === "F" ? raw : null;
}

function parseImportGender(value: unknown) {
  const normalized = normHeader(String(value ?? "").trim()).replace(/\./g, "");
  if (["m", "male", "man", "άνδρας", "ανδρας"].includes(normalized)) return "M";
  if (["f", "female", "woman", "γυναίκα", "γυναικα"].includes(normalized)) return "F";
  return null;
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

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsvText(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }
  return lines.join("\n");
}

function buildPdfBuffer(title: string, meta: string, rows: Array<Record<string, unknown>>) {
  return new Promise<Buffer>((resolve, reject) => {
    const pageMarginX = 8;
    const pageMarginTop = 10;
    const pageMarginBottom = 10;
    const pageSize: [number, number] = [1191, 842];
    const createPageOptions = () => ({
      size: pageSize,
      layout: "landscape" as const,
      margins: { top: pageMarginTop, bottom: pageMarginBottom, left: pageMarginX, right: pageMarginX },
      compress: true,
    });
    const doc = new PDFDocument(createPageOptions());
    const chunks: Buffer[] = [];
    const fontPath = getPdfFontPath();

    doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    if (fontPath) {
      doc.font(fontPath);
    }

    doc.fontSize(17).text(title, { align: "left" });
    doc.moveDown(0.18);
    doc.fontSize(10.5).fillColor("#4b5563").text(meta, { align: "left" });
    doc.moveDown(0.45);
    doc.fillColor("#111827");

    if (!rows.length) {
      doc.fontSize(11).text("-");
      doc.end();
      return;
    }

    const headers = Object.keys(rows[0]);
    const columnWeights = [42, 56, 82, 76, 82, 58, 50, 54, 60, 68, 68, 138, 138, 92, 120];
    const cellPaddingX = 5;
    const cellPaddingY = 4;
    const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const baseWidth = columnWeights.reduce((sum, value) => sum + value, 0);
    const widthScale = availableWidth / baseWidth;
    const columnWidths = columnWeights.map((value) => value * widthScale);
    const offsetX = doc.page.margins.left;

    const measureRowHeight = (values: string[], fontSize: number) => {
      doc.fontSize(fontSize);
      let maxHeight = 0;
      values.forEach((value, index) => {
        const height = doc.heightOfString(value || " ", {
          width: Math.max(12, columnWidths[index] - cellPaddingX * 2),
          align: "left",
        });
        if (height > maxHeight) maxHeight = height;
      });
      return Math.max(fontSize + cellPaddingY * 2 + 1, maxHeight + cellPaddingY * 2 + 1);
    };

    const drawRow = (values: string[], top: number, fontSize: number, header = false) => {
      const rowHeight = measureRowHeight(values, fontSize);
      let left = offsetX;
      doc.lineWidth(0.5);
      values.forEach((value, index) => {
        const width = columnWidths[index];
        if (header) {
          doc.save();
          doc.rect(left, top, width, rowHeight).fill("#f3f4f6");
          doc.restore();
        }
        doc.rect(left, top, width, rowHeight).stroke("#d1d5db");
        doc.fontSize(fontSize).fillColor("#111827").text(value || " ", left + cellPaddingX, top + cellPaddingY, {
          width: Math.max(12, width - cellPaddingX * 2),
          align: "left",
        });
        left += width;
      });
      return rowHeight;
    };

    let currentY = doc.y;
    const ensureSpace = (needed: number) => {
      const bottom = doc.page.height - doc.page.margins.bottom;
      if (currentY + needed <= bottom) return;
      doc.addPage(createPageOptions());
      if (fontPath) {
        doc.font(fontPath);
      }
      currentY = doc.page.margins.top;
      currentY += drawRow(headers, currentY, 8.5, true);
    };

    currentY += drawRow(headers, currentY, 8.5, true);

    rows.forEach((row) => {
      const values = headers.map((header) => String(row[header] ?? ""));
      const rowHeight = measureRowHeight(values, 7.5);
      ensureSpace(rowHeight);
      currentY += drawRow(values, currentY, 7.5, false);
    });

    doc.end();
  });
}

function formatGenderValue(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["m", "male", "man", "άνδρας", "ανδρας"].includes(normalized)) {
    return "Άνδρας";
  }
  if (["f", "female", "woman", "γυναίκα", "γυναικα"].includes(normalized)) {
    return "Γυναίκα";
  }
  return String(value ?? "").trim();
}

const PDF_FONT_CANDIDATES = [
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"
];

function getPdfFontPath() {
  for (const candidate of PDF_FONT_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function buildExportRows(rows: any[], lang: ExportLang, programsById: Map<number, any>, directionsById: Map<number, any>, regionsById: Map<number, any>) {
  const labels = getColumnLabels(lang);

  return rows.map((g) => {
    const item = g as any;
    const studyProgram = programsById.get(Number(item.study_program_id));
    const direction = directionsById.get(Number(item.program_direction_id));
    const studyProgramName = studyProgram ? String(studyProgram.name_el ?? studyProgram.name_en ?? studyProgram.code ?? studyProgram.id) : "";
    const directionName = direction ? String(direction.name_el ?? direction.name_en ?? direction.code ?? direction.id) : "";
    const region = regionsById.get(Number(item.origin_region_id));
    const regionName = region ? String(region.name ?? "") : "";

    return {
      [labels.ad_code]: item.ad_code ?? "",
      [labels.student_number]: item.student_number ?? "",
      [labels.last_name]: item.last_name ?? "",
      [labels.first_name]: item.first_name ?? "",
      [labels.father_name]: item.father_name ?? "",
      [labels.gender]: formatGenderValue(item.gender),
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

async function getReferenceMaps() {
  const [programs, directions, regions] = await Promise.all([
    StudyProgram.findAll({ order: [["id", "ASC"]] }),
    ProgramDirection.findAll({ order: [["id", "ASC"]] }),
    Region.findAll({ order: [["id", "ASC"]] })
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

function resolveRegionId(value: unknown, regionsById: Map<number, any>) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const directId = toInt(raw);
  if (directId && regionsById.has(directId)) return directId;

  const normalized = normalizeLookupValue(raw);
  for (const [id, item] of regionsById.entries()) {
    const candidates = [item?.name];
    if (candidates.some((entry) => normalizeLookupValue(entry) === normalized)) return id;
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

function hasOriginValue(origin_region_id: number | null | undefined, origin_municipality: string | null | undefined) {
  return origin_region_id != null || String(origin_municipality ?? "").trim().length > 0;
}

function ensureManagedOrigin(
  normalizedOrigin: NormalizedOriginResult,
  origin_region_id: number | null | undefined,
  origin_municipality: string | null | undefined
) {
  void normalizedOrigin;
  if (!hasOriginValue(origin_region_id, origin_municipality)) return null;
  return null;
}

export async function listGraduates(req: Request, res: Response, next: NextFunction) {
  try {
    const where = buildGraduateWhere(req.query as Record<string, unknown>);
    const order = parseSort(req.query.sort);
    const hasPaging = req.query.page != null || req.query.pageSize != null;

    if (!hasPaging) {
      const rows = await Graduate.findAll({ where, order });
      const total = rows.length;
      res.json({
        ok: true,
        page: 1,
        pageSize: total,
        total,
        items: rows
      });
      return;
    }

    const page = clamp(toIntParam(req.query.page, 1), 1, 1_000_000);
    const pageSize = clamp(toIntParam(req.query.pageSize, 20), 1, 10000);
    const offset = (page - 1) * pageSize;

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
    const format = getGraduateFileFormat(req.query.format);

    if (ids.length) {
      (where as any).id = ids;
    }

    const rows = await Graduate.findAll({ where, order, limit: ids.length ? undefined : limit });
    const { programsById, directionsById, regionsById } = await getReferenceMaps();
    const data = buildExportRows(rows as any[], lang, programsById, directionsById, regionsById);

    await logAction({
      user_id: req.user?.id ?? null,
      action: "export_graduates",
      entity_type: "graduate",
      entity_id: null,
      details: { format, limit: ids.length ? null : limit, count: data.length, selected: ids.length || 0 }
    });

    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    if (format === "csv") {
      const csv = buildCsvText(data);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="graduates-${ts}.csv"`);
      return res.send(`﻿${csv}`);
    }

    if (format === "pdf") {
      const title = lang === "en" ? "Graduates" : "Απόφοιτοι";
      const meta = lang === "en"
        ? `Export date: ${new Date().toLocaleString("en-GB")} • Records: ${data.length}`
        : `Ημερομηνία εξαγωγής: ${new Date().toLocaleString("el-GR")} • Εγγραφές: ${data.length}`;
      const pdf = await buildPdfBuffer(title, meta, data);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="graduates-${ts}.pdf"`);
      return res.send(pdf);
    }

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
    const format = getGraduateFileFormat(req.query.format);
    const headers = getTemplateHeaders(lang);

    if (format === "csv") {
      const csv = headers.map((row) => row.map(csvEscape).join(",")).join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="graduates-import-template.csv"');
      return res.send(`﻿${csv}`);
    }

    const ws = XLSX.utils.aoa_to_sheet(headers);
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
    const { programsById, directionsById, regionsById } = await getReferenceMaps();
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
      origin_region: firstIndex(headers, [...IMPORT_HEADER_ALIASES.origin_region]),
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

    type RowError = { row: number; column?: string; message: string; value?: any; details?: string[]; violation_codes?: RuleViolationCode[] };
    const importLang = getRuleLang((req.body as any)?.lang);
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
      const gender = parseImportGender(genderRaw);
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
      const origin_region_source = idx.origin_region >= 0 ? get("origin_region") : get("origin_region_id");
      const origin_region_id = resolveRegionId(origin_region_source, regionsById) ?? toInt(get("origin_region_id"));
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
      if (!origin_region_id && String(origin_region_source ?? "").trim()) rowProblems.push({ row: rowNum, column: "origin_region", message: "Invalid value", value: origin_region_source });

      if (rowProblems.length) {
        errors.push(...rowProblems);
        skipped++;
        continue;
      }

      const normalizedOrigin = await normalizeOriginLocation({
        origin_region_id: origin_region_id ?? null,
        origin_municipality,
      });

      const managedOriginError = ensureManagedOrigin(normalizedOrigin, origin_region_id ?? null, origin_municipality);
      if (managedOriginError) {
        errors.push({ row: rowNum, column: "origin_municipality", message: managedOriginError, value: origin_municipality });
        skipped++;
        continue;
      }

      const ruleViolations = getGraduateRuleViolations({
        entry_year,
        birth_date,
        graduation_date,
      }, importLang);

      if (ruleViolations.length) {
        errors.push({
          row: rowNum,
          column: "graduation_date",
          message: buildImportViolationSummary(ruleViolations, importLang),
          details: ruleViolations.map((item) => item.message),
          violation_codes: ruleViolations.map((item) => item.code),
        });
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
        origin_region_id: normalizedOrigin.origin_region_id,
        origin_municipality: normalizedOrigin.origin_municipality,
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
    if (!item) return notFound(res);

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

    const requiredStringError =
      requireNonEmptyString(res, last_name, "last_name") ??
      requireNonEmptyString(res, first_name, "first_name") ??
      requireNonEmptyString(res, father_name, "father_name") ??
      requireNonEmptyString(res, student_number, "student_number");
    if (requiredStringError) return requiredStringError;

    if (!parseStoredGender(gender)) return bad(res, "gender must be 'M' or 'F'");

    const requiredNumberError =
      requireNumberField(res, study_program_id, "study_program_id") ??
      requireNumberField(res, entry_year, "entry_year") ??
      requireNumberField(res, degree_grade, "degree_grade");
    if (requiredNumberError) return requiredNumberError;

    const dateError =
      requireDateOnly(res, graduation_date, "graduation_date") ??
      requireDateOnly(res, oath_date, "oath_date") ??
      requireDateOnly(res, birth_date, "birth_date");
    if (dateError) return dateError;

    const createRuleViolation = getGraduateRuleViolations({
      entry_year,
      birth_date,
      graduation_date,
    }, "en")[0];
    if (createRuleViolation) return bad(res, createRuleViolation.message);

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

    const normalizedOrigin = await normalizeOriginLocation({
      origin_region_id: origin_region_id ?? null,
      origin_municipality,
    });

    const managedOriginError = ensureManagedOrigin(normalizedOrigin, origin_region_id ?? null, origin_municipality);
    if (managedOriginError) return bad(res, managedOriginError);

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
      origin_region_id: normalizedOrigin.origin_region_id,
      origin_municipality: normalizedOrigin.origin_municipality
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
    if (!item) return notFound(res);

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
      const normalized = await normalizeOriginLocation({
        origin_region_id: (item as any).origin_region_id ?? null,
        origin_municipality: (item as any).origin_municipality ?? null,
      });
      const managedOriginError = ensureManagedOrigin(
        normalized,
        (item as any).origin_region_id ?? null,
        (item as any).origin_municipality ?? null
      );
      if (managedOriginError) return bad(res, managedOriginError);
      (item as any).origin_region_id = normalized.origin_region_id;
      (item as any).origin_municipality = normalized.origin_municipality;
    }

    if (body.study_program_id !== undefined) (item as any).study_program_id = nextStudyProgramId;
    if (!String((item as any).ad_code ?? "").trim()) return bad(res, "ad_code cannot be empty");
    if (!String((item as any).last_name ?? "").trim()) return bad(res, "last_name cannot be empty");
    if (!String((item as any).first_name ?? "").trim()) return bad(res, "first_name cannot be empty");
    if (!String((item as any).father_name ?? "").trim()) return bad(res, "father_name cannot be empty");
    if (!String((item as any).student_number ?? "").trim()) return bad(res, "student_number cannot be empty");

    if (!Number.isFinite(Number((item as any).entry_year))) return bad(res, "entry_year must be a number");
    if (!Number.isFinite(Number((item as any).degree_grade))) return bad(res, "degree_grade must be a number");

    if (!DATE_ONLY_RE.test(String((item as any).graduation_date ?? ""))) return bad(res, "graduation_date must be YYYY-MM-DD");
    if (!DATE_ONLY_RE.test(String((item as any).oath_date ?? ""))) return bad(res, "oath_date must be YYYY-MM-DD");
    if (!DATE_ONLY_RE.test(String((item as any).birth_date ?? ""))) return bad(res, "birth_date must be YYYY-MM-DD");

    const updateRuleViolation = getGraduateRuleViolations({
      entry_year: Number((item as any).entry_year),
      birth_date: String((item as any).birth_date ?? ""),
      graduation_date: String((item as any).graduation_date ?? ""),
    }, "en")[0];
    if (updateRuleViolation) return bad(res, updateRuleViolation.message);

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
    if (!item) return notFound(res);

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
      const normalized = await normalizeOriginLocation({
        origin_region_id: g.origin_region_id != null ? Number(g.origin_region_id) : null,
        origin_municipality: g.origin_municipality ? String(g.origin_municipality) : null,
      });

      const curRegion = g.origin_region_id != null ? Number(g.origin_region_id) : null;
      const curMunicipality = g.origin_municipality ? String(g.origin_municipality) : null;
      if (normalized.origin_region_id !== curRegion || (normalized.origin_municipality ?? null) !== curMunicipality) {
        await Graduate.update(
          {
            origin_region_id: normalized.origin_region_id,
            origin_municipality: normalized.origin_municipality,
          },
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
