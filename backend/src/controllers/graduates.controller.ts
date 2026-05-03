import type { NextFunction, Request, Response } from "express";
import { Graduate } from "../models/Graduate";
import { StudyProgram } from "../models/StudyProgram";
import { buildGraduateWhere } from "../utils/buildGraduateWhere";
import { clamp, toInt as toIntParam } from "../utils/pagination";
import { logAction } from "../services/log.service";
import * as XLSX from "xlsx";
import { decodeTextBuffer, normHeader, parseDelimitedTextRows, toDateOnly, toInt, toNumber } from "../utils/importUtils";
import { Op, Transaction } from "sequelize";
import { sequelize } from "../config/sequelize";
import {
  DATE_ONLY_RE,
  type RuleViolationCode,
  applySheetLayout,
  applyTemplateSheetLayout,
  bad,
  buildDelimitedText,
  buildImportViolationSummary,
  buildUtf16CsvBuffer,
  csvEscape,
  getExportLang,
  getGraduateFileFormat,
  getGraduateRuleViolations,
  getGreeceRegionId,
  getMatchedTemplateHeaderKeys,
  getRuleLang,
  notFound,
  parseIds,
  parseImportGender,
  parseSort,
  parseStoredGender,
  requireDateOnly,
  requireNonEmptyString,
  requireNumberField,
  isGreeceCountryValue,
  trimNullableText,
} from "./graduates.helpers";
import { applyOriginPatch, buildCreateOriginPayload, buildExportRows, buildResolvedOriginSnapshot, ensureManagedOrigin, getReferenceMaps, getTemplateHeaders, resolveRegionId, resolveStudyProgramId } from "./graduates.shared";
import { normalizeOriginLocation, type NormalizedOriginResult } from "../utils/resolvePeripheryRegionId";
import { clearRouteCaches } from "../utils/routeCache";
import { clearPublicStatsCache } from "./public.controller";
import { sanitizeExportRows } from "../utils/exportSafety";

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
    const { programsById, regionsById } = await getReferenceMaps();
    const data = sanitizeExportRows(buildExportRows(rows as any[], lang, programsById, regionsById));

    await logAction({
      user_id: req.user?.id ?? null,
      action: "export_graduates",
      entity_type: "graduate",
      entity_id: null,
      details: { format, limit: ids.length ? null : limit, count: data.length, selected: ids.length || 0 }
    });

    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    if (format === "csv") {
      const csv = buildDelimitedText(data, "\t");
      const buf = buildUtf16CsvBuffer(csv);
      res.setHeader("Content-Type", "text/tab-separated-values; charset=utf-16le");
      res.setHeader("Content-Disposition", `attachment; filename="alupla_graduates_export_${ts}.csv"`);
      return res.send(buf);
    }



    const ws = XLSX.utils.json_to_sheet(data);
    applySheetLayout(ws, data as Array<Record<string, unknown>>);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "graduates");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="alupla_graduates_export_${ts}.xlsx"`);
    return res.send(buf);
  } catch (err) {
    next(err);
  }
}

export async function logGraduatesPdfExport(req: Request, res: Response, next: NextFunction) {
  try {
    const where = buildGraduateWhere(req.body as Record<string, unknown>);
    const ids = parseIds((req.body as Record<string, unknown>)?.ids);

    if (ids.length) {
      (where as any).id = ids;
    }

    const count = ids.length ? ids.length : await Graduate.count({ where });

    await logAction({
      user_id: req.user?.id ?? null,
      action: "export_graduates",
      entity_type: "graduate",
      entity_id: null,
      details: { format: "pdf", limit: null, count, selected: ids.length || 0 }
    });

    res.json({ ok: true, count });
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
      const csv = headers.map((row) => row.map((cell) => csvEscape(cell, "\t")).join("\t")).join("\r\n");
      const buf = buildUtf16CsvBuffer(csv);
      res.setHeader("Content-Type", "text/tab-separated-values; charset=utf-16le");
      res.setHeader("Content-Disposition", 'attachment; filename="alupla_graduates_import_template.csv"');
      return res.send(buf);
    }

    const ws = XLSX.utils.aoa_to_sheet(headers);
    applyTemplateSheetLayout(ws, headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "graduates_import_template");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="alupla_graduates_import_template.xlsx"');
    return res.send(buf);
  } catch (err) {
    next(err);
  }
}

export async function importGraduates(req: Request, res: Response, next: NextFunction) {
  try {
    const file = (req as any).file as { buffer: Buffer; originalname: string; mimetype: string } | undefined;
    if (!file?.buffer) return res.status(400).json({ error: { message: "Missing file" } });

    const sourceName = String(file.originalname ?? "").trim();
    const isDelimitedImport = /\.(csv|tsv|txt)$/i.test(sourceName) || /(csv|tsv|tab-separated-values|text\/csv|text\/plain)/i.test(String(file.mimetype ?? ""));
    const workbook = isDelimitedImport ? null : XLSX.read(file.buffer, { type: "buffer", cellDates: true, raw: false, cellFormula: false, cellHTML: false, cellNF: false, cellStyles: false, bookVBA: false, WTF: false } as any);
    const sheetName = isDelimitedImport ? sourceName || "delimited-import" : String(workbook?.SheetNames?.[0] ?? "");
    const rows: any[][] = isDelimitedImport
      ? parseDelimitedTextRows(decodeTextBuffer(file.buffer))
      : (() => {
          if (!sheetName) return [];
          const ws = workbook?.Sheets?.[sheetName];
          if (!ws) return [];
          return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false }) as any[][];
        })();
    const { programsById, regionsById } = await getReferenceMaps();
    if (rows.length === 0) return res.status(400).json({ error: { message: "Empty workbook" } });
    if (rows.length < 2) return res.status(400).json({ error: { message: "No data rows" } });

    const headerRow = rows[0];
    const headers = headerRow.map((header) => String(header ?? "").trim());
    const matchedHeaderKeys = getMatchedTemplateHeaderKeys(headers);

    if (!matchedHeaderKeys) {
      return res.status(400).json({
        error: {
          message: "Invalid import template columns. Use the exact graduate import template header order in Greek or English.",
        }
      });
    }

    const idx = {
      ad_code: matchedHeaderKeys.ad_code,
      student_number: matchedHeaderKeys.student_number,
      last_name: matchedHeaderKeys.last_name,
      first_name: matchedHeaderKeys.first_name,
      father_name: matchedHeaderKeys.father_name,
      gender: matchedHeaderKeys.gender,
      entry_year: matchedHeaderKeys.entry_year,
      birth_date: matchedHeaderKeys.birth_date,
      degree_grade: matchedHeaderKeys.degree_grade,
      graduation_date: matchedHeaderKeys.graduation_date,
      oath_date: matchedHeaderKeys.oath_date,
      study_program: matchedHeaderKeys.study_program,
      origin_country: matchedHeaderKeys.origin_country,
      origin_region: matchedHeaderKeys.origin_region,
      origin_municipality: matchedHeaderKeys.origin_municipality,
    };

    type RowError = { row: number; column?: string; message: string; value?: any; details?: string[]; violation_codes?: RuleViolationCode[] };
    type PreparedRow = {
      rowNum: number;
      student_number: string;
      payload: any;
    };

    const importLang = getRuleLang((req.body as any)?.lang);
    const errors: RowError[] = [];
    const preparedRows: PreparedRow[] = [];
    const studentNumbers: string[] = [];
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    const defaultGreeceId = getGreeceRegionId(regionsById);

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
      const birth_date = toDateOnly(get("birth_date" as any));
      const study_program_source = get("study_program");
      const study_program_id = resolveStudyProgramId(study_program_source, programsById);
      const origin_country_source = get("origin_country");
      const matchedOriginCountryRegionId = resolveRegionId(origin_country_source, regionsById) ?? null;
      const origin_country_name = trimNullableText(origin_country_source) ?? (matchedOriginCountryRegionId ? String(regionsById.get(matchedOriginCountryRegionId)?.name ?? "").trim() : null);
      const is_abroad = !!(origin_country_name && !isGreeceCountryValue(origin_country_name));
      const origin_country_region_id = is_abroad ? matchedOriginCountryRegionId : (matchedOriginCountryRegionId ?? defaultGreeceId);
      const origin_region_source = get("origin_region");
      const raw_origin_municipality = trimNullableText(get("origin_municipality"));
      const raw_origin_region = trimNullableText(origin_region_source);
      const origin_periphery_region_id = is_abroad ? null : resolveRegionId(origin_region_source, regionsById);
      const origin_foreign_city = is_abroad ? (raw_origin_municipality ?? raw_origin_region ?? null) : null;
      const origin_municipality = is_abroad ? origin_foreign_city : raw_origin_municipality;

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
      if (!birth_date) rowProblems.push({ row: rowNum, column: "birth_date", message: "Invalid date", value: get("birth_date" as any) });
      if (!study_program_id) rowProblems.push({ row: rowNum, column: "study_program", message: "Invalid value", value: study_program_source });
      if (!origin_country_name) rowProblems.push({ row: rowNum, column: "origin_country", message: "Required", value: origin_country_source });
      if (is_abroad) {
        if (!origin_foreign_city) rowProblems.push({ row: rowNum, column: "origin_municipality", message: "Required", value: get("origin_municipality") || origin_region_source });
      } else {
        if (!origin_country_region_id) rowProblems.push({ row: rowNum, column: "origin_country", message: "Invalid value", value: origin_country_source });
        if (!origin_periphery_region_id && String(origin_region_source ?? "").trim()) rowProblems.push({ row: rowNum, column: "origin_region", message: "Invalid value", value: origin_region_source });
      }

      if (rowProblems.length) {
        errors.push(...rowProblems);
        skipped++;
        continue;
      }

      let normalizedOrigin: NormalizedOriginResult | null = null;
      if (!is_abroad) {
        normalizedOrigin = await normalizeOriginLocation({
          origin_country_region_id: origin_country_region_id ?? null,
          origin_periphery_region_id: origin_periphery_region_id ?? null,
          origin_region_id: origin_periphery_region_id ?? null,
          origin_city_region_id: null,
          origin_municipality,
        });

        const managedOriginError = ensureManagedOrigin(normalizedOrigin, origin_country_region_id ?? null, origin_periphery_region_id ?? null, origin_municipality, regionsById);
        if (managedOriginError) {
          errors.push({ row: rowNum, column: "origin_municipality", message: managedOriginError, value: origin_municipality });
          skipped++;
          continue;
        }
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

      preparedRows.push({
        rowNum,
        student_number,
        payload: {
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
          origin_country: is_abroad ? origin_country_name : "Ελλάδα",
          origin_foreign_city: is_abroad ? origin_foreign_city : null,
          origin_country_region_id: is_abroad ? origin_country_region_id : normalizedOrigin?.origin_country_region_id ?? null,
          origin_periphery_region_id: is_abroad ? null : normalizedOrigin?.origin_periphery_region_id ?? null,
          origin_region_id: is_abroad ? null : normalizedOrigin?.origin_region_id ?? null,
          origin_city_region_id: is_abroad ? null : normalizedOrigin?.origin_city_region_id ?? null,
          origin_municipality: is_abroad ? null : normalizedOrigin?.origin_municipality ?? null,
        }
      });
      studentNumbers.push(student_number);
    }

    if (preparedRows.length) {
      const existingRows = await Graduate.findAll({
        where: { student_number: { [Op.in]: Array.from(new Set(studentNumbers)) } },
        attributes: ["id", "student_number"]
      });
      const existingByStudentNumber = new Map(existingRows.map((item: any) => [String(item.student_number), Number(item.id)]));

      await sequelize.transaction(async (transaction: Transaction) => {
        for (const item of preparedRows) {
          const existingId = existingByStudentNumber.get(item.student_number);
          if (existingId) {
            await Graduate.update(item.payload, { where: { id: existingId }, transaction });
            updated++;
            continue;
          }
          await Graduate.create(item.payload, { transaction });
          inserted++;
        }
      });
    }

    try {
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
    } catch {}

    clearRouteCaches(["graduates", "map"]);
    clearPublicStatsCache();

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
      errors: errors.slice(0, 500)
    });
  } catch (err: any) {
    if (err?.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        ok: false,
        error: { message: err?.errors?.[0]?.message || err?.message || "Duplicate value detected during import." }
      });
    }

    if (err?.name === "MulterError") {
      return res.status(400).json({
        ok: false,
        error: { message: err?.message || "File upload failed." }
      });
    }

    next(err);
  }
}

export async function getGraduate(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, "Invalid id");

    const item = await Graduate.findByPk(id);
    if (!item) return notFound(res);

    const { regionsById } = await getReferenceMaps();
    const resolvedItem = buildResolvedOriginSnapshot(item.toJSON() as any, regionsById);

    res.json({ ok: true, item: resolvedItem });
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

    const { regionsById } = await getReferenceMaps();
    const originResult = await buildCreateOriginPayload(body, regionsById);
    if (originResult.error) return bad(res, originResult.error);
    const originPayload = originResult.payload;

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
      ...originPayload
    } as any);

    await logAction({
      user_id: req.user?.id ?? null,
      action: "create_graduate",
      entity_type: "graduate",
      entity_id: (created as any).id,
      details: { student_number }
    });

    clearRouteCaches(["graduates", "map"]);
    clearPublicStatsCache();

    res.status(201).json({ ok: true, item: created });
  } catch (err) {
    next(err);
  }
}



const graduateLoggedFields = [
  "ad_code",
  "student_number",
  "last_name",
  "first_name",
  "father_name",
  "gender",
  "entry_year",
  "birth_date",
  "degree_grade",
  "graduation_date",
  "oath_date",
  "study_program_id",
  "origin_country_region_id",
  "origin_periphery_region_id",
  "origin_city_region_id",
  "origin_municipality",
  "origin_foreign_city"
];

const graduateNumericLogFields = new Set([
  "entry_year",
  "degree_grade",
  "study_program_id",
  "origin_country_region_id",
  "origin_periphery_region_id",
  "origin_city_region_id"
]);

const graduateDateLogFields = new Set(["birth_date", "graduation_date", "oath_date"]);

function dateOnlyLogValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, 10);
}

function graduateLogValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (graduateDateLogFields.has(field)) return dateOnlyLogValue(value);
  if (graduateNumericLogFields.has(field)) {
    const num = Number(value);
    return Number.isFinite(num) ? num : String(value ?? "").trim();
  }
  return String(value ?? "").trim();
}

function getChangedGraduateFields(before: Record<string, unknown>, after: Record<string, unknown>) {
  return graduateLoggedFields.filter((field) => graduateLogValue(field, before[field]) !== graduateLogValue(field, after[field]));
}

export async function updateGraduate(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, "Invalid id");

    const item = await Graduate.findByPk(id);
    if (!item) return notFound(res);

    const beforeLogSnapshot = item.get({ plain: true }) as Record<string, unknown>;
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

    const { regionsById } = await getReferenceMaps();

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

    const originError = await applyOriginPatch(item as any, body, regionsById);
    if (originError) return bad(res, originError);

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

    const changed = getChangedGraduateFields(beforeLogSnapshot, item.get({ plain: true }) as Record<string, unknown>);

    await logAction({
      user_id: req.user?.id ?? null,
      action: "update_graduate",
      entity_type: "graduate",
      entity_id: id,
      details: { changed }
    });

    clearRouteCaches(["graduates", "map"]);
    clearPublicStatsCache();

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
      details: { student_number: String((item as any).student_number ?? "").trim() }
    });

    clearRouteCaches(["graduates", "map"]);
    clearPublicStatsCache();

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

