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
import { normalizeOriginLocation, type NormalizedOriginResult } from "../utils/resolvePeripheryRegionId";
import { normalizeRegionText } from "../utils/regionText";
import { Op, Transaction } from "sequelize";
import { sequelize } from "../config/sequelize";
import {
  DATE_ONLY_RE,
  IMPORT_HEADER_ALIASES,
  type ExportLang,
  type RuleViolationCode,
  applySheetLayout,
  applyTemplateSheetLayout,
  bad,
  buildDelimitedText,
  buildImportViolationSummary,
  buildUtf16CsvBuffer,
  csvEscape,
  formatCountryValue,
  formatDateDisplay,
  formatGenderValue,
  getColumnLabels,
  isGreeceCountryValue,
  getExportLang,
  getGraduateFileFormat,
  getGraduateRuleViolations,
  getGreeceRegionId,
  getMatchedTemplateHeaderKeys,
  getRuleLang,
  getStrictTemplateHeaderRows,
  isAbroadOriginInput,
  notFound,
  parseIds,
  parseImportGender,
  parseSort,
  parseStoredGender,
  requireDateOnly,
  requireNonEmptyString,
  requireNumberField,
  toNullableNumber,
  trimNullableText,
} from "./graduates.helpers";

function buildExportRows(rows: any[], lang: ExportLang, programsById: Map<number, any>, directionsById: Map<number, any>, regionsById: Map<number, any>) {
  const labels = getColumnLabels(lang);

  return rows.map((g) => {
    const item = g as any;
    const studyProgram = programsById.get(Number(item.study_program_id));
    const direction = directionsById.get(Number(item.program_direction_id));
    const studyProgramName = studyProgram ? String(studyProgram.name_el ?? studyProgram.name_en ?? studyProgram.code ?? studyProgram.id) : "";
    const directionName = direction ? String(direction.name_el ?? direction.name_en ?? direction.code ?? direction.id) : "";
    const region = regionsById.get(Number(item.origin_periphery_region_id ?? item.origin_region_id));
    const country = regionsById.get(Number(item.origin_country_region_id));
    const rawCountryName = String(item.origin_country ?? country?.name ?? "");
    const isGreece = isGreeceCountryValue(rawCountryName) || (country ? isGreeceCountryValue(country.name) : false);
    const regionName = isGreece ? (region ? String(region.name ?? "") : "") : "";
    const countryName = formatCountryValue(rawCountryName || String(country?.name ?? ""));
    const municipalityName = isGreece ? (item.origin_municipality ?? "") : String(item.origin_foreign_city ?? item.origin_municipality ?? "");

    return {
      [labels.ad_code]: item.ad_code ?? "",
      [labels.student_number]: item.student_number ?? "",
      [labels.last_name]: item.last_name ?? "",
      [labels.first_name]: item.first_name ?? "",
      [labels.father_name]: item.father_name ?? "",
      [labels.gender]: formatGenderValue(item.gender),
      [labels.entry_year]: item.entry_year ?? "",
      [labels.birth_date]: formatDateDisplay(item.birth_date),
      [labels.degree_grade]: item.degree_grade ?? "",
      [labels.graduation_date]: formatDateDisplay(item.graduation_date),
      [labels.oath_date]: formatDateDisplay(item.oath_date),
      [labels.study_program]: studyProgramName,
      [labels.direction]: directionName,
      [labels.origin_country]: countryName,
      [labels.origin_region]: regionName,
      [labels.origin_municipality]: municipalityName
    };
  });
}

function getTemplateHeaders(lang: ExportLang) {
  return [getStrictTemplateHeaderRows(lang)];
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
    const candidates = [item?.name, item?.normalized_name, item?.external_ref_id]
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

function hasOriginValue(origin_country_region_id: number | null | undefined, origin_region_id: number | null | undefined, origin_municipality: string | null | undefined) {
  return origin_country_region_id != null || origin_region_id != null || String(origin_municipality ?? "").trim().length > 0;
}

function ensureManagedOrigin(
  normalizedOrigin: NormalizedOriginResult,
  origin_country_region_id: number | null | undefined,
  origin_region_id: number | null | undefined,
  origin_municipality: string | null | undefined,
  regionsById?: Map<number, any>
) {
  if (!hasOriginValue(origin_country_region_id, origin_region_id, origin_municipality)) return null;
  if (!normalizedOrigin.origin_country_region_id) return "origin_country_region_id is required";
  if (!normalizedOrigin.origin_municipality) return "origin_municipality is required";
  if (regionsById) {
    const country = regionsById.get(Number(normalizedOrigin.origin_country_region_id));
    const isGreece = normalizeRegionText(country?.name) === normalizeRegionText("Ελλάδα");
    if (isGreece && !normalizedOrigin.origin_periphery_region_id) return "origin_periphery_region_id is required for Greece";
    if (!isGreece && normalizedOrigin.origin_periphery_region_id) return "origin_periphery_region_id must be empty for foreign countries";
  }
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
      const csv = buildDelimitedText(data, "\t");
      const buf = buildUtf16CsvBuffer(csv);
      res.setHeader("Content-Type", "text/tab-separated-values; charset=utf-16le");
      res.setHeader("Content-Disposition", `attachment; filename="graduates-${ts}.csv"`);
      return res.send(buf);
    }



    const ws = XLSX.utils.json_to_sheet(data);
    applySheetLayout(ws, data as Array<Record<string, unknown>>);
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
      res.setHeader("Content-Disposition", 'attachment; filename="graduates-import-template.csv"');
      return res.send(buf);
    }

    const ws = XLSX.utils.aoa_to_sheet(headers);
    applyTemplateSheetLayout(ws, headers);
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
      program_direction: matchedHeaderKeys.direction,
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

    const defaultGreeceId = Array.from(regionsById.values()).find((item: any) => normalizeRegionText(item?.name) === normalizeRegionText("Ελλάδα"))?.id ?? null;

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
      const program_direction_source = get("program_direction");
      const program_direction_id = resolveProgramDirectionId(program_direction_source, directionsById, study_program_id);
      const origin_country_source = get("origin_country");
      const resolvedOriginCountryRegionId = resolveRegionId(origin_country_source, regionsById) ?? null;
      const origin_country_name = trimNullableText(origin_country_source) ?? (resolvedOriginCountryRegionId ? String(regionsById.get(resolvedOriginCountryRegionId)?.name ?? "").trim() : null);
      const is_abroad = !!(origin_country_name && !isGreeceCountryValue(origin_country_name));
      const origin_country_region_id = is_abroad ? null : (resolvedOriginCountryRegionId ?? defaultGreeceId);
      const origin_region_source = get("origin_region");
      const origin_periphery_region_id = is_abroad ? null : resolveRegionId(origin_region_source, regionsById);
      const origin_municipality = String(get("origin_municipality")).trim() || null;
      const origin_foreign_city = is_abroad ? origin_municipality : null;

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
        if (!origin_foreign_city) rowProblems.push({ row: rowNum, column: "origin_municipality", message: "Required", value: get("origin_municipality") });
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
          program_direction_id: program_direction_id ?? null,
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

    const { regionsById } = await getReferenceMaps();
    const defaultGreeceId = getGreeceRegionId(regionsById);
    const origin_country_region_id = toNullableNumber(body.origin_country_region_id) ?? defaultGreeceId;
    if (origin_country_region_id === null) return bad(res, "origin_country_region_id is required");
    if (Number.isNaN(origin_country_region_id as any)) return bad(res, "origin_country_region_id must be a number");
    const selectedCountryName = String(regionsById.get(Number(origin_country_region_id))?.name ?? "").trim();
    const origin_country_name = trimNullableText(body.origin_country) ?? trimNullableText(selectedCountryName);
    const origin_foreign_city = trimNullableText(body.origin_foreign_city);
    const is_abroad = isAbroadOriginInput(origin_country_name, origin_country_region_id, defaultGreeceId, origin_foreign_city);
    let originPayload: Record<string, unknown>;

    if (is_abroad) {
      const resolvedCountryName = origin_country_name ?? trimNullableText(selectedCountryName);
      if (!resolvedCountryName) return bad(res, "origin_country is required");
      if (!origin_foreign_city) return bad(res, "origin_foreign_city is required");

      originPayload = {
        origin_country: resolvedCountryName,
        origin_foreign_city,
        origin_country_region_id,
        origin_periphery_region_id: null,
        origin_region_id: null,
        origin_city_region_id: null,
        origin_municipality: null,
      };
    } else {
      if (origin_country_region_id === null) return bad(res, "origin_country_region_id is required");
      if (Number.isNaN(origin_country_region_id as any)) return bad(res, "origin_country_region_id must be a number");

      const origin_periphery_region_id = toNullableNumber(body.origin_periphery_region_id ?? body.origin_region_id);
      if (Number.isNaN(origin_periphery_region_id as any)) return bad(res, "origin_periphery_region_id must be a number");

      const origin_municipality = String(body.origin_municipality ?? "").trim();
      if (!origin_municipality) return bad(res, "origin_municipality is required");

      const normalizedOrigin = await normalizeOriginLocation({
        origin_country_region_id: origin_country_region_id ?? null,
        origin_periphery_region_id: origin_periphery_region_id ?? null,
        origin_region_id: origin_periphery_region_id ?? null,
        origin_city_region_id: toNullableNumber(body.origin_city_region_id),
        origin_municipality,
      });

      const managedOriginError = ensureManagedOrigin(normalizedOrigin, origin_country_region_id ?? null, origin_periphery_region_id ?? null, origin_municipality, regionsById);
      if (managedOriginError) return bad(res, managedOriginError);

      originPayload = {
        origin_country: "Ελλάδα",
        origin_foreign_city: null,
        origin_country_region_id: normalizedOrigin.origin_country_region_id,
        origin_periphery_region_id: normalizedOrigin.origin_periphery_region_id,
        origin_region_id: normalizedOrigin.origin_region_id,
        origin_city_region_id: normalizedOrigin.origin_city_region_id,
        origin_municipality: normalizedOrigin.origin_municipality,
      };
    }

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
      ...originPayload
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

    const { regionsById } = await getReferenceMaps();
    const defaultGreeceId = getGreeceRegionId(regionsById);

    let originRegionTouched = false;
    let foreignOriginTouched = false;
    if (body.origin_country_region_id !== undefined) {
      const origin_country_region_id = toNullableNumber(body.origin_country_region_id);
      if (Number.isNaN(origin_country_region_id as any)) return bad(res, "origin_country_region_id must be a number");
      (item as any).origin_country_region_id = origin_country_region_id;
      originRegionTouched = true;
    }

    if (body.origin_periphery_region_id !== undefined || body.origin_region_id !== undefined) {
      const origin_periphery_region_id = toNullableNumber(body.origin_periphery_region_id ?? body.origin_region_id);
      if (Number.isNaN(origin_periphery_region_id as any)) return bad(res, "origin_periphery_region_id must be a number");
      (item as any).origin_periphery_region_id = origin_periphery_region_id;
      (item as any).origin_region_id = origin_periphery_region_id;
      originRegionTouched = true;
    }

    if (body.origin_city_region_id !== undefined) {
      const origin_city_region_id = toNullableNumber(body.origin_city_region_id);
      if (Number.isNaN(origin_city_region_id as any)) return bad(res, "origin_city_region_id must be a number");
      (item as any).origin_city_region_id = origin_city_region_id;
      originRegionTouched = true;
    }

    if (body.origin_country !== undefined) {
      (item as any).origin_country = trimNullableText(body.origin_country);
      foreignOriginTouched = true;
    }

    if (body.origin_foreign_city !== undefined) {
      (item as any).origin_foreign_city = trimNullableText(body.origin_foreign_city);
      foreignOriginTouched = true;
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

    const selectedCountryName = String(regionsById.get(Number((item as any).origin_country_region_id))?.name ?? "").trim();
    const currentCountryName = trimNullableText((item as any).origin_country) ?? trimNullableText(selectedCountryName);
    const currentForeignCity = trimNullableText((item as any).origin_foreign_city);
    const isAbroad = isAbroadOriginInput(currentCountryName, (item as any).origin_country_region_id ?? null, defaultGreeceId, currentForeignCity);

    if (isAbroad) {
      (item as any).origin_country = currentCountryName ?? trimNullableText(selectedCountryName);
      if (!(item as any).origin_country) return bad(res, "origin_country is required");
      if (!currentForeignCity) return bad(res, "origin_foreign_city is required");
      (item as any).origin_foreign_city = currentForeignCity;
      (item as any).origin_periphery_region_id = null;
      (item as any).origin_region_id = null;
      (item as any).origin_city_region_id = null;
      (item as any).origin_municipality = null;
    } else if (originRegionTouched || foreignOriginTouched || body.origin_country_region_id !== undefined || body.origin_country !== undefined) {
      if (!(item as any).origin_country_region_id && defaultGreeceId != null) {
        (item as any).origin_country_region_id = defaultGreeceId;
      }
      const normalized = await normalizeOriginLocation({
        origin_country_region_id: (item as any).origin_country_region_id ?? null,
        origin_periphery_region_id: (item as any).origin_periphery_region_id ?? (item as any).origin_region_id ?? null,
        origin_region_id: (item as any).origin_periphery_region_id ?? (item as any).origin_region_id ?? null,
        origin_city_region_id: (item as any).origin_city_region_id ?? null,
        origin_municipality: (item as any).origin_municipality ?? null,
      });
      const managedOriginError = ensureManagedOrigin(
        normalized,
        (item as any).origin_country_region_id ?? null,
        (item as any).origin_periphery_region_id ?? (item as any).origin_region_id ?? null,
        (item as any).origin_municipality ?? null,
        regionsById
      );
      if (managedOriginError) return bad(res, managedOriginError);
      (item as any).origin_country = "Ελλάδα";
      (item as any).origin_foreign_city = null;
      (item as any).origin_country_region_id = normalized.origin_country_region_id;
      (item as any).origin_periphery_region_id = normalized.origin_periphery_region_id;
      (item as any).origin_region_id = normalized.origin_region_id;
      (item as any).origin_city_region_id = normalized.origin_city_region_id;
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
      details: { student_number: String((item as any).student_number ?? "").trim() }
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

