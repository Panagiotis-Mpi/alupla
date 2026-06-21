// Controller για τα backend endpoints των αποφοίτων.
import type { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import { Graduate } from "../models/Graduate";
import { StudyProgram } from "../models/StudyProgram";
import { buildGraduateWhere } from "../utils/buildGraduateWhere";
import { clamp, toInt as toIntParam } from "../utils/pagination";
import { logAction } from "../services/log.service";
import * as XLSX from "xlsx";
import { decodeTextBuffer, parseDelimitedTextRows } from "../utils/importUtils";
import {
  applySheetLayout,
  applyTemplateSheetLayout,
  bad,
  buildDelimitedText,
  buildUtf16CsvBuffer,
  csvEscape,
  getExportLang,
  getGraduateFileFormat,
  getMatchedTemplateHeaderKeys,
  getRuleLang,
  notFound,
  parseIds,
  parseSort,
  requireNonEmptyString,
} from "./graduates.helpers";
import {
  applyOriginPatch,
  buildCreateOriginPayload,
  buildExportRows,
  buildResolvedOriginSnapshot,
  getReferenceMaps,
  getTemplateHeaders,
} from "./graduates.shared";
import { clearRouteCaches } from "../utils/routeCache";
import { clearPublicStatsCache } from "./public.controller";
import { sanitizeExportRows } from "../utils/exportSafety";
import { buildExportFilename } from "../utils/exportFilename";
import {
  getLocalizedNamesForGraduates,
  serializeGraduateRows,
} from "../services/graduateLocalization.service";
import {
  applyGraduateScalarPatch,
  getChangedGraduateFields,
  getGraduateBasePayload,
  getGraduateLogSnapshot,
  readCreateGraduateValues,
  validateGraduateReadyForSave,
} from "../services/graduatePayload.service";
import {
  prepareGraduateImportRows,
  savePreparedGraduateImportRows,
} from "../services/graduateImport.service";

function hasGraduateExportFilters(source: Record<string, unknown>) {
  const ignored = new Set(["format", "lang", "limit", "page", "pageSize", "sort", "ids"]);
  return Object.entries(source).some(([key, value]) => !ignored.has(key) && value !== undefined && value !== null && String(value).trim() !== "");
}

// GET /graduates: επιστρέφει λίστα αποφοίτων, με φίλτρα, ταξινόμηση και προαιρετικό pagination.
export async function listGraduates(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const where = buildGraduateWhere(req.query as Record<string, unknown>);
    const order = parseSort(req.query.sort);
    const hasPaging = req.query.page != null || req.query.pageSize != null;

    // Αν δεν ζητηθεί pagination, επιστρέφονται όλα τα αποτελέσματα που ταιριάζουν στα φίλτρα.
    if (!hasPaging) {
      const rows = await Graduate.findAll({ where, order });
      const total = rows.length;
      res.json({
        ok: true,
        page: 1,
        pageSize: total,
        total,
        items: await serializeGraduateRows(
          rows as any[],
          String(req.query.lang ?? ""),
        ),
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
      offset,
    });

    res.json({
      ok: true,
      page,
      pageSize,
      total: count,
      items: await serializeGraduateRows(
        rows as any[],
        String(req.query.lang ?? ""),
      ),
    });
  } catch (err) {
    next(err);
  }
}

// GET /graduates/export: εξάγει αποφοίτους σε CSV ή XLSX, με τα ίδια φίλτρα/ids της λίστας.
export async function exportGraduates(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const source = req.method === "POST" ? { ...req.query, ...(req.body || {}) } : req.query;
    const where = buildGraduateWhere(source as Record<string, unknown>);
    const order = parseSort((source as Record<string, unknown>).sort);
    const ids = parseIds((source as Record<string, unknown>).ids);
    const limit = clamp(toIntParam((source as Record<string, unknown>).limit, 5000), 1, 10000);
    const lang = getExportLang((source as Record<string, unknown>).lang);
    const format = getGraduateFileFormat((source as Record<string, unknown>).format);

    // Όταν έχουν επιλεγεί συγκεκριμένοι απόφοιτοι, το export περιορίζεται μόνο σε αυτά τα ids.
    if (ids.length) {
      (where as any).id = ids;
    }

    const rows = await Graduate.findAll({
      where,
      order,
      limit: ids.length ? undefined : limit,
    });
    const { programsById, regionsById } = await getReferenceMaps();
    const localizedNamesById = await getLocalizedNamesForGraduates(
      rows as any[],
      lang,
    );
    // Πριν γραφτεί το αρχείο, καθαρίζονται τιμές που θα μπορούσαν να διαβαστούν ως Excel formulas.
    const data = sanitizeExportRows(
      buildExportRows(
        rows as any[],
        lang,
        programsById,
        regionsById,
        localizedNamesById,
      ),
    );

    await logAction({
      user_id: req.user?.id ?? null,
      action: "export_graduates",
      entity_type: "graduate",
      entity_id: null,
      details: {
        format,
        limit: ids.length ? null : limit,
        count: data.length,
        selected: ids.length || 0,
      },
    });

    const sourceFilters = source as Record<string, unknown>;
    const scopeParts = ids.length
      ? ["selected", data.length, "records"]
      : hasGraduateExportFilters(sourceFilters)
        ? ["filtered", data.length, "records"]
        : ["all", data.length, "records"];
    if (format === "csv") {
      const csv = buildDelimitedText(data, "\t");
      const buf = buildUtf16CsvBuffer(csv);
      res.setHeader(
        "Content-Type",
        "text/tab-separated-values; charset=utf-16le",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${buildExportFilename("graduates", scopeParts, "csv")}"`,
      );
      return res.send(buf);
    }

    const ws = XLSX.utils.json_to_sheet(data);
    applySheetLayout(ws, data as Array<Record<string, unknown>>);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "graduates");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${buildExportFilename("graduates", scopeParts, "xlsx")}"`,
    );
    return res.send(buf);
  } catch (err) {
    next(err);
  }
}

// Καταγράφει PDF exports που γίνονται από το frontend, επειδή το PDF παράγεται εκτός αυτού του endpoint.
export async function logGraduatesPdfExport(
  req: Request,
  res: Response,
  next: NextFunction,
) {
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
      details: { format: "pdf", limit: null, count, selected: ids.length || 0 },
    });

    res.json({ ok: true, count });
  } catch (err) {
    next(err);
  }
}

// Κατεβάζει πρότυπο αρχείο εισαγωγής αποφοίτων, σε CSV ή XLSX.
export async function exportGraduatesImportTemplate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const lang = getExportLang(req.query.lang);
    const format = getGraduateFileFormat(req.query.format);
    const headers = getTemplateHeaders(lang);

    if (format === "csv") {
      const csv = headers
        .map((row) => row.map((cell) => csvEscape(cell, "\t")).join("\t"))
        .join("\r\n");
      const buf = buildUtf16CsvBuffer(csv);
      res.setHeader(
        "Content-Type",
        "text/tab-separated-values; charset=utf-16le",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${buildExportFilename("graduates", ["import", "template"], "csv", { timestamp: false })}"`,
      );
      return res.send(buf);
    }

    const ws = XLSX.utils.aoa_to_sheet(headers);
    applyTemplateSheetLayout(ws, headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "graduates_import_template");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${buildExportFilename("graduates", ["import", "template"], "xlsx", { timestamp: false })}"`,
    );
    return res.send(buf);
  } catch (err) {
    next(err);
  }
}

// POST /graduates/import: διαβάζει αρχείο CSV/XLSX, ελέγχει κάθε γραμμή και κάνει insert ή update.
export async function importGraduates(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const file = (req as any).file as
      | { buffer: Buffer; originalname: string; mimetype: string }
      | undefined;
    if (!file?.buffer)
      return res.status(400).json({ error: { message: "Missing file" } });

    const sourceName = String(file.originalname ?? "").trim();
    const isDelimitedImport =
      /\.(csv|tsv|txt)$/i.test(sourceName) ||
      /(csv|tsv|tab-separated-values|text\/csv|text\/plain)/i.test(
        String(file.mimetype ?? ""),
      );
    const workbook = isDelimitedImport
      ? null
      : XLSX.read(file.buffer, {
          type: "buffer",
          cellDates: true,
          raw: false,
          cellFormula: false,
          cellHTML: false,
          cellNF: false,
          cellStyles: false,
          bookVBA: false,
          WTF: false,
        } as any);
    const sheetName = isDelimitedImport
      ? sourceName || "delimited-import"
      : String(workbook?.SheetNames?.[0] ?? "");
    const rows: any[][] = isDelimitedImport
      ? parseDelimitedTextRows(decodeTextBuffer(file.buffer))
      : (() => {
          if (!sheetName) return [];
          const ws = workbook?.Sheets?.[sheetName];
          if (!ws) return [];
          return XLSX.utils.sheet_to_json(ws, {
            header: 1,
            defval: "",
            raw: false,
          }) as any[][];
        })();
    const { programsById, regionsById } = await getReferenceMaps();
    if (rows.length === 0)
      return res.status(400).json({ error: { message: "Empty workbook" } });
    if (rows.length < 2)
      return res.status(400).json({ error: { message: "No data rows" } });

    const headerRow = rows[0];
    const headers = headerRow.map((header) => String(header ?? "").trim());
    // Το import επιτρέπεται μόνο αν οι στήλες ταιριάζουν με το επίσημο template.
    const matchedHeaderKeys = getMatchedTemplateHeaderKeys(headers);

    if (!matchedHeaderKeys) {
      return res.status(400).json({
        error: {
          message:
            "Invalid import template columns. Use the exact graduate import template header order in Greek or English.",
        },
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

    const importLang = getRuleLang((req.body as any)?.lang);
    const { errors, preparedRows, studentNumbers, skipped } =
      await prepareGraduateImportRows({
        rows,
        idx,
        importLang,
        programsById,
        regionsById,
      });
    const { inserted, updated } = await savePreparedGraduateImportRows(
      preparedRows,
      studentNumbers,
    );

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
          errors: errors.length,
        },
      });
    } catch {}

    // Μετά από import καθαρίζονται τα cached δεδομένα που επηρεάζονται από αλλαγές αποφοίτων.
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
        error_count: errors.length,
      },
      errors: errors.slice(0, 500),
    });
  } catch (err: any) {
    if (err?.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        ok: false,
        error: {
          message:
            err?.errors?.[0]?.message ||
            err?.message ||
            "Duplicate value detected during import.",
        },
      });
    }

    if (err?.name === "MulterError") {
      return res.status(400).json({
        ok: false,
        error: { message: err?.message || "File upload failed." },
      });
    }

    next(err);
  }
}

// GET /graduates/:id: φέρνει έναν απόφοιτο μαζί με καθαρό snapshot καταγωγής.
export async function getGraduate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, "Invalid id");

    const item = await Graduate.findByPk(id);
    if (!item) return notFound(res);

    const { regionsById } = await getReferenceMaps();
    const resolvedItem = buildResolvedOriginSnapshot(
      item.toJSON() as any,
      regionsById,
    );

    res.json({ ok: true, item: resolvedItem });
  } catch (err) {
    next(err);
  }
}

// POST /graduates: δημιουργεί έναν απόφοιτο από τη φόρμα.
export async function createGraduate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = req.body ?? {};
    const values = readCreateGraduateValues(body);

    const requiredStringError =
      requireNonEmptyString(res, values.last_name, "last_name") ??
      requireNonEmptyString(res, values.first_name, "first_name") ??
      requireNonEmptyString(res, values.father_name, "father_name") ??
      requireNonEmptyString(res, values.student_number, "student_number");
    if (requiredStringError) return requiredStringError;

    const basePayload = getGraduateBasePayload(values);
    const readyError = validateGraduateReadyForSave(basePayload);
    if (readyError) return bad(res, readyError);

    const program = await StudyProgram.findByPk(values.study_program_id);
    if (!program) return bad(res, "study_program_id not found");

    const { regionsById } = await getReferenceMaps();
    const originResult = await buildCreateOriginPayload(body, regionsById);
    if (originResult.error) return bad(res, originResult.error);

    const created = await Graduate.create({
      ...basePayload,
      ...originResult.payload,
    } as any);

    await logAction({
      user_id: req.user?.id ?? null,
      action: "create_graduate",
      entity_type: "graduate",
      entity_id: (created as any).id,
      details: { student_number: values.student_number },
    });

    clearRouteCaches(["graduates", "map"]);
    clearPublicStatsCache();

    res.status(201).json({ ok: true, item: created });
  } catch (err) {
    next(err);
  }
}

// PUT /graduates/:id: ενημερώνει απόφοιτο και γράφει log μόνο για τα πεδία που άλλαξαν.
export async function updateGraduate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, "Invalid id");

    const item = await Graduate.findByPk(id);
    if (!item) return notFound(res);

    // Κρατάμε την αρχική εικόνα πριν γίνουν αλλαγές, για να βγει σωστό diff στο log.
    const beforeLogSnapshot = getGraduateLogSnapshot(
      item.get({ plain: true }) as Record<string, unknown>,
    );
    const body = req.body ?? {};

    const nextStudyProgramId =
      body.study_program_id === undefined
        ? (item as any).study_program_id
        : Number(body.study_program_id);

    if (!Number.isFinite(nextStudyProgramId))
      return bad(res, "study_program_id must be a number");

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

    applyGraduateScalarPatch(item as any, body);

    const originError = await applyOriginPatch(item as any, body, regionsById);
    if (originError) return bad(res, originError);

    if (body.study_program_id !== undefined)
      (item as any).study_program_id = nextStudyProgramId;

    const readyError = validateGraduateReadyForSave(item as any);
    if (readyError) return bad(res, readyError);

    await item.save();

    const afterLogSnapshot = getGraduateLogSnapshot(
      item.get({ plain: true }) as Record<string, unknown>,
    );
    const changed = getChangedGraduateFields(
      beforeLogSnapshot,
      afterLogSnapshot,
    );

    await logAction({
      user_id: req.user?.id ?? null,
      action: "update_graduate",
      entity_type: "graduate",
      entity_id: id,
      details: changed.length ? { changed } : null,
    });

    clearRouteCaches(["graduates", "map"]);
    clearPublicStatsCache();

    res.json({ ok: true, item });
  } catch (err) {
    next(err);
  }
}

export async function deleteGraduates(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const rawIds = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const ids = Array.from(
      new Set(
        rawIds
          .map((value: unknown) => Number(value))
          .filter((value: number) => Number.isInteger(value) && value > 0),
      ),
    );

    if (!ids.length) return bad(res, "Invalid ids");

    const deleted = await Graduate.destroy({ where: { id: { [Op.in]: ids } } });

    if (deleted > 0) {
      await logAction({
        user_id: req.user?.id ?? null,
        action: "bulk_delete_graduates",
        entity_type: "graduate",
        entity_id: null,
        details: { deleted },
      });
    }

    clearRouteCaches(["graduates", "map"]);
    clearPublicStatsCache();

    res.json({ ok: true, deleted });
  } catch (err) {
    next(err);
  }
}

// DELETE /graduates/:id: διαγράφει απόφοιτο και κρατάει audit log με τον αριθμό μητρώου.
export async function deleteGraduate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
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
      details: {
        student_number: String((item as any).student_number ?? "").trim(),
      },
    });

    clearRouteCaches(["graduates", "map"]);
    clearPublicStatsCache();

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
