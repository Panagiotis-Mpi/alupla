// Χειρίζεται διαχείριση προγραμμάτων σπουδών, κατευθύνσεων, template και import.
import type { NextFunction, Request, Response } from "express";
import XLSX from "xlsx";
import { Op } from "sequelize";
import { sequelize } from "../config/sequelize";
import { Graduate } from "../models/Graduate";
import { StudyProgram } from "../models/StudyProgram";
import { logAction } from "../services/log.service";
import { normHeader } from "../utils/importUtils";
import { hasPatchChanges, invalid, missing, parseId, readText } from "../utils/academicDataCrud";
import { buildExportFilename } from "../utils/exportFilename";
import {
  encodeUtf16WithBom,
  escapeDelimitedCell,
  normalizeImportKey,
  pickFirstFilled,
  readWorksheetRows,
  resolveTemplateFormat
} from "../utils/spreadsheetTemplate";

type StudyProgramPatch = {
  name_el?: string;
  name_en?: string | null;
};

// Βρίσκει πρόγραμμα σπουδών ή επιστρέφει 404-style error.
async function findStudyProgramOrFail(id: number, res: Response) {
  const item = await StudyProgram.findByPk(id);
  if (!item) {
    missing(res, "Study program not found");
    return null;
  }
  return item;
}

// Ελέγχει αν υπάρχει ήδη πρόγραμμα με ίδιο όνομα.
async function findDuplicateStudyProgram(nameEl: string, excludedId?: number) {
  return StudyProgram.findOne({
    where: {
      ...(excludedId !== undefined ? { id: { [Op.ne]: excludedId } } : {}),
      name_el: nameEl
    }
  });
}

// Επιστρέφει headers template για import προγραμμάτων σπουδών.
function getTemplateHeaders(lang: string) {
  if (lang === "en") {
    return [[
      "Study Program Name in Greek (required)",
      "Study Program Name in English (optional)"
    ]];
  }
  return [[
    "Ονομασία Προγράμματος Σπουδών στα Ελληνικά (υποχρεωτικό)",
    "Ονομασία Προγράμματος Σπουδών στα Αγγλικά (προαιρετικό)"
  ]];
}

function importedFileFormat(file: Express.Multer.File | undefined) {
  const name = String(file?.originalname ?? "").trim().toLowerCase();
  if (/\.(csv|tsv|txt)$/.test(name)) return "csv";
  return "xlsx";
}

// Μετατρέπει row import σε καθαρά πεδία προγράμματος σπουδών.
function normalizeProgramRow(input: Record<string, unknown>) {
  const row = Object.fromEntries(Object.entries(input).map(([key, value]) => {
    const normalized = normHeader(key);
    return [normalizeImportKey(normalized), value];
  }));
  const nameEl = String(pickFirstFilled(row, [
    "study_program_name_in_greek_(required)",
    "study_program_name_in_greek",
    "program_name_in_greek",
    "study_program_name_(greek)",
    "program_name_(greek)",
    "name_(el)",
    "name_el",
    "ονομασια_προγραμματος_σπουδων_στα_ελληνικα_(υποχρεωτικο)",
    "ονομασια_προγραμματος_σπουδων_στα_ελληνικα",
    "ονομασια_προγραμματος_στα_ελληνικα",
    "ονομασια_(el)",
    "ονομασια_el",
    "ονομασια",
    "name"
  ]) ?? "").trim();
  const nameEn = String(pickFirstFilled(row, [
    "study_program_name_in_english_(optional)",
    "study_program_name_in_english",
    "program_name_in_english",
    "study_program_name_(english)",
    "program_name_(english)",
    "name_(en)",
    "name_en",
    "ονομασια_προγραμματος_σπουδων_στα_αγγλικα_(προαιρετικο)",
    "ονομασια_προγραμματος_σπουδων_στα_αγγλικα",
    "ονομασια_προγραμματος_στα_αγγλικα",
    "ονομασια_(en)",
    "ονομασια_en"
  ]) ?? "").trim();
  return {
    name_el: nameEl,
    name_en: nameEn || null,
  };
}

// Επιστρέφει προγράμματα σπουδών και κατευθύνσεις για τη διαχείριση.
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

// Κατεβάζει template Excel/CSV για import προγραμμάτων.
export async function downloadStudyProgramsTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const lang = String(req.query.lang ?? "gr").toLowerCase().startsWith("en") ? "en" : "gr";
    const format = resolveTemplateFormat(req.query.format);
    const headers = getTemplateHeaders(lang);

    if (format === "csv") {
      const csv = headers.map((row) => row.map((cell) => escapeDelimitedCell(cell)).join("\t")).join("\r\n");
      const buffer = encodeUtf16WithBom(csv);
      res.setHeader("Content-Type", "text/tab-separated-values; charset=utf-16le");
      res.setHeader("Content-Disposition", `attachment; filename="${buildExportFilename("study_programs", ["import", "template"], "csv", { timestamp: false })}"`);
      return res.send(buffer);
    }

    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "study_programs_template");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${buildExportFilename("study_programs", ["import", "template"], "xlsx", { timestamp: false })}"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}

// Διαβάζει αρχείο και δημιουργεί/ενημερώνει προγράμματα σπουδών.
export async function importStudyPrograms(req: Request, res: Response, next: NextFunction) {
  try {
// Το αρχείο import μετατρέπεται σε rows για validation.
    const rows = readWorksheetRows(req.file);
    if (!rows.length) {
      return invalid(res, "Empty file");
    }

    const summary = await sequelize.transaction(async (transaction) => {
      let inserted = 0;
      let updated = 0;
      let skipped = 0;

      for (const sourceRow of rows) {
        const row = normalizeProgramRow(sourceRow);
        if (!row.name_el) {
          skipped += 1;
          continue;
        }

        const existing = await StudyProgram.findOne({
          where: { name_el: row.name_el },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (existing) {
          await existing.update({
            name_el: row.name_el,
            name_en: row.name_en,
          }, { transaction });
          updated += 1;
          continue;
        }

        await StudyProgram.create(row as any, { transaction });
        inserted += 1;
      }

      return { inserted, updated, skipped };
    });

// Οι αλλαγές προγραμμάτων γράφονται στα logs.
    await logAction({
      user_id: req.user?.id ?? null,
      action: "import_study_programs",
      entity_type: "study_program",
      entity_id: null,
      details: {
        file: req.file?.originalname ?? null,
        format: importedFileFormat(req.file),
        total_rows: rows.length,
        inserted: summary.inserted,
        updated: summary.updated,
        skipped: summary.skipped
      }
    });

    res.json({ ok: true, summary });
  } catch (error) {
    next(error);
  }
}

// Δημιουργεί πρόγραμμα σπουδών από τη φόρμα διαχείρισης.
export async function createStudyProgram(req: Request, res: Response, next: NextFunction) {
  try {
    const nameEl = readText(req.body?.name_el);
    const nameEn = readText(req.body?.name_en) || null;

    if (!nameEl) {
      return invalid(res, "name_el is required");
    }

    const existing = await findDuplicateStudyProgram(nameEl);
    if (existing) {
      return invalid(res, "Study program already exists");
    }

    const item = await StudyProgram.create({
      name_el: nameEl,
      name_en: nameEn
    });

// Οι αλλαγές προγραμμάτων γράφονται στα logs.
    await logAction({
      user_id: req.user?.id ?? null,
      action: "create_study_program",
      entity_type: "study_program",
      entity_id: item.id,
      details: { name_el: nameEl, name_en: nameEn }
    });

    res.status(201).json({ ok: true, item });
  } catch (error) {
    next(error);
  }
}

// Ενημερώνει πρόγραμμα σπουδών και γράφει log αλλαγής.
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

    if (!hasPatchChanges(patch)) {
      return invalid(res, "No changes provided");
    }

    const nextNameEl = patch.name_el ?? item.name_el;

    const existing = await findDuplicateStudyProgram(nextNameEl, id);
    if (existing) {
      return invalid(res, "Study program already exists");
    }

    await item.update(patch);

// Οι αλλαγές προγραμμάτων γράφονται στα logs.
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

// Απενεργοποιεί/διαγράφει πρόγραμμα σπουδών αν επιτρέπεται.
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


    const details = {
      name_el: item.name_el,
      name_en: item.name_en
    };

    await item.destroy();

// Οι αλλαγές προγραμμάτων γράφονται στα logs.
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
