import type { NextFunction, Request, Response } from "express";
import XLSX from "xlsx";
import { Op } from "sequelize";
import { Graduate } from "../models/Graduate";
import { ProgramDirection } from "../models/ProgramDirection";
import { StudyProgram } from "../models/StudyProgram";
import { logAction } from "../services/log.service";
import { normHeader } from "../utils/importUtils";
import {
  encodeUtf16WithBom,
  escapeDelimitedCell,
  normalizeImportKey,
  parseActiveFlag,
  pickFirstFilled,
  readWorksheetRows,
  resolveTemplateFormat
} from "../utils/spreadsheetTemplate";

type StudyProgramPatch = {
  code?: string;
  name_el?: string;
  name_en?: string | null;
  is_active?: boolean;
};

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function invalid(res: Response, message: string) {
  return res.status(400).json({ ok: false, error: { message } });
}

function missing(res: Response, message: string) {
  return res.status(404).json({ ok: false, error: { message } });
}

function parseId(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function findStudyProgramOrFail(id: number, res: Response) {
  const item = await StudyProgram.findByPk(id);
  if (!item) {
    missing(res, "Study program not found");
    return null;
  }
  return item;
}

async function findDuplicateStudyProgram(code: string, nameEl: string, excludedId?: number) {
  return StudyProgram.findOne({
    where: {
      ...(excludedId !== undefined ? { id: { [Op.ne]: excludedId } } : {}),
      [Op.or]: [{ code }, { name_el: nameEl }]
    }
  });
}

function hasChanges(patch: StudyProgramPatch) {
  return Object.keys(patch).length > 0;
}

function getTemplateHeaders(lang: string) {
  if (lang === "en") {
    return [[
      "Study Program Code (required)",
      "Study Program Name in Greek (required)",
      "Study Program Name in English (optional)",
      "Study Program Status - Active or Inactive (optional)"
    ]];
  }
  return [[
    "Κωδικός Προγράμματος Σπουδών (υποχρεωτικό)",
    "Ονομασία Προγράμματος Σπουδών στα Ελληνικά (υποχρεωτικό)",
    "Ονομασία Προγράμματος Σπουδών στα Αγγλικά (προαιρετικό)",
    "Κατάσταση Προγράμματος Σπουδών - Ενεργό ή Ανενεργό (προαιρετικό)"
  ]];
}

function normalizeProgramRow(input: Record<string, unknown>) {
  const row = Object.fromEntries(Object.entries(input).map(([key, value]) => {
    const normalized = normHeader(key);
    return [normalizeImportKey(normalized), value];
  }));
  const code = String(pickFirstFilled(row, [
    "study_program_code_(required)",
    "study_program_code",
    "program_code",
    "code",
    "κωδικος_προγραμματος_σπουδων_(υποχρεωτικο)",
    "κωδικος_προγραμματος_σπουδων",
    "κωδικος_προγραμματος",
    "κωδικος"
  ]) ?? "").trim();
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
  const statusValue = pickFirstFilled(row, [
    "study_program_status_-_active_or_inactive_(optional)",
    "study_program_status",
    "program_status",
    "status",
    "κατασταση_προγραμματος_σπουδων_-_ενεργο_η_ανενεργο_(προαιρετικο)",
    "κατασταση_προγραμματος_σπουδων",
    "κατασταση_προγραμματος",
    "κατασταση"
  ]);
  return {
    code,
    name_el: nameEl,
    name_en: nameEn || null,
    is_active: parseActiveFlag(statusValue),
  };
}

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

export async function downloadStudyProgramsTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const lang = String(req.query.lang ?? "gr").toLowerCase().startsWith("en") ? "en" : "gr";
    const format = resolveTemplateFormat(req.query.format);
    const headers = getTemplateHeaders(lang);

    if (format === "csv") {
      const csv = headers.map((row) => row.map((cell) => escapeDelimitedCell(cell)).join("\t")).join("\r\n");
      const buffer = encodeUtf16WithBom(csv);
      res.setHeader("Content-Type", "text/tab-separated-values; charset=utf-16le");
      res.setHeader("Content-Disposition", 'attachment; filename="study-programs-template.csv"');
      return res.send(buffer);
    }

    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "study_programs_template");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="study-programs-template.xlsx"');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}

export async function importStudyPrograms(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = readWorksheetRows(req.file);
    if (!rows.length) {
      return invalid(res, "Empty file");
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const sourceRow of rows) {
      const row = normalizeProgramRow(sourceRow);
      if (!row.code || !row.name_el) {
        skipped += 1;
        continue;
      }

      const existing = await StudyProgram.findOne({
        where: {
          [Op.or]: [{ code: row.code }, { name_el: row.name_el }]
        }
      });

      if (existing) {
        await existing.update({
          code: row.code,
          name_el: row.name_el,
          name_en: row.name_en,
          is_active: row.is_active,
        });
        updated += 1;
        continue;
      }

      await StudyProgram.create(row as any);
      inserted += 1;
    }

    await logAction({
      user_id: req.user?.id ?? null,
      action: "import_study_programs",
      entity_type: "study_program",
      entity_id: null,
      details: { inserted, updated, skipped }
    });

    res.json({ ok: true, summary: { inserted, updated, skipped } });
  } catch (error) {
    next(error);
  }
}

export async function createStudyProgram(req: Request, res: Response, next: NextFunction) {
  try {
    const code = readText(req.body?.code);
    const nameEl = readText(req.body?.name_el);
    const nameEn = readText(req.body?.name_en) || null;
    const isActive = req.body?.is_active === undefined ? true : Boolean(req.body.is_active);

    if (!code || !nameEl) {
      return invalid(res, "code and name_el are required");
    }

    const existing = await findDuplicateStudyProgram(code, nameEl);
    if (existing) {
      return invalid(res, "Study program already exists");
    }

    const item = await StudyProgram.create({
      code,
      name_el: nameEl,
      name_en: nameEn,
      is_active: isActive
    });

    await logAction({
      user_id: req.user?.id ?? null,
      action: "create_study_program",
      entity_type: "study_program",
      entity_id: item.id,
      details: { code, name_el: nameEl }
    });

    res.status(201).json({ ok: true, item });
  } catch (error) {
    next(error);
  }
}

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

    if (req.body?.code !== undefined) {
      const code = readText(req.body.code);
      if (!code) {
        return invalid(res, "code is required");
      }
      patch.code = code;
    }

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

    if (req.body?.is_active !== undefined) {
      patch.is_active = Boolean(req.body.is_active);
    }

    if (!hasChanges(patch)) {
      return invalid(res, "No changes provided");
    }

    const nextCode = patch.code ?? item.code;
    const nextNameEl = patch.name_el ?? item.name_el;

    const existing = await findDuplicateStudyProgram(nextCode, nextNameEl, id);
    if (existing) {
      return invalid(res, "Study program already exists");
    }

    await item.update(patch);

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

    const directionsCount = await ProgramDirection.count({ where: { study_program_id: id } });
    if (directionsCount > 0) {
      return invalid(res, "Διαγράψτε πρώτα τις κατευθύνσεις του προγράμματος");
    }

    const details = {
      code: item.code,
      name_el: item.name_el
    };

    await item.destroy();

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
