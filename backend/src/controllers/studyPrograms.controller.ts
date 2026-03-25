import type { NextFunction, Request, Response } from "express";
import XLSX from "xlsx";
import { Op } from "sequelize";
import { Graduate } from "../models/Graduate";
import { ProgramDirection } from "../models/ProgramDirection";
import { StudyProgram } from "../models/StudyProgram";
import { logAction } from "../services/log.service";
import { normHeader } from "../utils/importUtils";

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
    return [["Code", "Name (EL)", "Name (EN)", "Status"]];
  }
  return [["Κωδικός", "Ονομασία (EL)", "Ονομασία (EN)", "Κατάσταση"]];
}

function plainKey(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function firstFilled(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value === undefined || value === null) continue;
    if (String(value).trim() === "") continue;
    return value;
  }
  return undefined;
}

function asRows(file: Express.Multer.File | undefined) {
  if (!file) return [] as Record<string, unknown>[];
  const workbook = XLSX.read(file.buffer, { type: "buffer", cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [] as Record<string, unknown>[];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], { defval: "" });
}

function readStatus(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return true;
  if (["1", "true", "yes", "y", "active", "ενεργό", "ενεργη", "ενεργο"].includes(text)) return true;
  if (["0", "false", "no", "n", "inactive", "ανενεργό", "ανενεργη", "ανενεργο"].includes(text)) return false;
  return true;
}

function normalizeProgramRow(input: Record<string, unknown>) {
  const row = Object.fromEntries(Object.entries(input).map(([key, value]) => {
    const normalized = normHeader(key);
    return [plainKey(normalized), value];
  }));
  const code = String(firstFilled(row, ["code", "κωδικος"]) ?? "").trim();
  const nameEl = String(firstFilled(row, ["name_(el)", "name_el", "ονομασια_(el)", "ονομασια_el", "ονομασια", "name"]) ?? "").trim();
  const nameEn = String(firstFilled(row, ["name_(en)", "name_en", "ονομασια_(en)", "ονομασια_en"]) ?? "").trim();
  const statusValue = firstFilled(row, ["status", "κατασταση"]);
  return {
    code,
    name_el: nameEl,
    name_en: nameEn || null,
    is_active: readStatus(statusValue),
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
    const ws = XLSX.utils.aoa_to_sheet(getTemplateHeaders(lang));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "study_programs_template");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="study-programs-template.xlsx"');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

export async function importStudyPrograms(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = asRows(req.file);
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
