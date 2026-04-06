import type { NextFunction, Request, Response } from "express";
import XLSX from "xlsx";
import { Op } from "sequelize";
import { Graduate } from "../models/Graduate";
import { ProgramDirection } from "../models/ProgramDirection";
import { StudyProgram } from "../models/StudyProgram";
import { logAction } from "../services/log.service";
import { normHeader } from "../utils/importUtils";
import { hasPatchChanges, invalid, missing, parseId, readText } from "../utils/academicDataCrud";
import {
  encodeUtf16WithBom,
  escapeDelimitedCell,
  normalizeImportKey,
  parseActiveFlag,
  pickFirstFilled,
  readWorksheetRows,
  resolveTemplateFormat
} from "../utils/spreadsheetTemplate";

type DirectionPatch = {
  study_program_id?: number;
  code?: string;
  name_el?: string;
  name_en?: string | null;
  is_active?: boolean;
};

async function findStudyProgramOrFail(studyProgramId: number, res: Response) {
  const program = await StudyProgram.findByPk(studyProgramId);
  if (!program) {
    missing(res, "Study program not found");
    return null;
  }
  return program;
}

async function findDirectionOrFail(id: number, res: Response) {
  const item = await ProgramDirection.findByPk(id);
  if (!item) {
    missing(res, "Direction not found");
    return null;
  }
  return item;
}

async function findDuplicateDirection(studyProgramId: number, code: string, nameEl: string, excludedId?: number) {
  return ProgramDirection.findOne({
    where: {
      ...(excludedId !== undefined ? { id: { [Op.ne]: excludedId } } : {}),
      study_program_id: studyProgramId,
      [Op.or]: [{ code }, { name_el: nameEl }]
    }
  });
}

function getTemplateHeaders(lang: string) {
  if (lang === "en") {
    return [[
      "Study Program Code or Study Program Name (required)",
      "Direction Code (required)",
      "Direction Name in Greek (required)",
      "Direction Name in English (optional)",
      "Direction Status - Active or Inactive (optional)"
    ]];
  }
  return [[
    "Κωδικός ή Ονομασία Προγράμματος Σπουδών (υποχρεωτικό)",
    "Κωδικός Κατεύθυνσης (υποχρεωτικό)",
    "Ονομασία Κατεύθυνσης στα Ελληνικά (υποχρεωτικό)",
    "Ονομασία Κατεύθυνσης στα Αγγλικά (προαιρετικό)",
    "Κατάσταση Κατεύθυνσης - Ενεργό ή Ανενεργό (προαιρετικό)"
  ]];
}

function normalizeDirectionRow(input: Record<string, unknown>) {
  const row = Object.fromEntries(Object.entries(input).map(([key, value]) => {
    const normalized = normHeader(key);
    return [normalizeImportKey(normalized), value];
  }));
  const program = String(pickFirstFilled(row, [
    "study_program_code_or_study_program_name_(required)",
    "study_program",
    "study_program_name",
    "program_name",
    "κωδικος_η_ονομασια_προγραμματος_σπουδων_(υποχρεωτικο)",
    "προγραμμα_σπουδων",
    "ονομασια_προγραμματος_σπουδων",
    "προγραμμα",
    "program"
  ]) ?? "").trim();
  const code = String(pickFirstFilled(row, [
    "direction_code_(required)",
    "direction_code",
    "code",
    "κωδικος_κατευθυνσης_(υποχρεωτικο)",
    "κωδικος_κατευθυνσης",
    "κωδικος"
  ]) ?? "").trim();
  const nameEl = String(pickFirstFilled(row, [
    "direction_name_in_greek_(required)",
    "direction_name_in_greek",
    "direction_name_(greek)",
    "name_(el)",
    "name_el",
    "ονομασια_κατευθυνσης_στα_ελληνικα_(υποχρεωτικο)",
    "ονομασια_κατευθυνσης_στα_ελληνικα",
    "ονομασια_(el)",
    "ονομασια_el",
    "ονομασια",
    "name"
  ]) ?? "").trim();
  const nameEn = String(pickFirstFilled(row, [
    "direction_name_in_english_(optional)",
    "direction_name_in_english",
    "direction_name_(english)",
    "name_(en)",
    "name_en",
    "ονομασια_κατευθυνσης_στα_αγγλικα_(προαιρετικο)",
    "ονομασια_κατευθυνσης_στα_αγγλικα",
    "ονομασια_(en)",
    "ονομασια_en"
  ]) ?? "").trim();
  const statusValue = pickFirstFilled(row, [
    "direction_status_-_active_or_inactive_(optional)",
    "direction_status",
    "status",
    "κατασταση_κατευθυνσης_-_ενεργο_η_ανενεργο_(προαιρετικο)",
    "κατασταση_κατευθυνσης",
    "κατασταση"
  ]);
  return {
    program,
    code,
    name_el: nameEl,
    name_en: nameEn || null,
    is_active: parseActiveFlag(statusValue),
  };
}

async function resolveStudyProgramId(value: string) {
  const text = value.trim();
  if (!text) return null;
  const byId = parseId(text);
  if (byId !== undefined) {
    const found = await StudyProgram.findByPk(byId);
    if (found) return Number(found.id);
  }
  const items = await StudyProgram.findAll({ attributes: ["id", "code", "name_el", "name_en"] });
  const target = text.toLowerCase();
  for (const item of items as any[]) {
    const options = [String(item.code ?? ""), String(item.name_el ?? ""), String(item.name_en ?? "")]
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
    if (options.includes(target)) {
      return Number(item.id);
    }
  }
  return null;
}

export async function listProgramDirections(req: Request, res: Response, next: NextFunction) {
  try {
    const where: Record<string, number> = {};
    const studyProgramId = req.query.study_program_id;

    if (studyProgramId !== undefined && studyProgramId !== "") {
      const parsedStudyProgramId = parseId(studyProgramId);
      if (parsedStudyProgramId === undefined) {
        return invalid(res, "study_program_id must be a number");
      }
      where.study_program_id = parsedStudyProgramId;
    }

    const items = await ProgramDirection.findAll({
      where,
      order: [["study_program_id", "ASC"], ["name_el", "ASC"]]
    });

    res.json({ ok: true, items });
  } catch (error) {
    next(error);
  }
}

export async function downloadProgramDirectionsTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const lang = String(req.query.lang ?? "gr").toLowerCase().startsWith("en") ? "en" : "gr";
    const format = resolveTemplateFormat(req.query.format);
    const headers = getTemplateHeaders(lang);

    if (format === "csv") {
      const csv = headers.map((row) => row.map((cell) => escapeDelimitedCell(cell)).join("\t")).join("\r\n");
      const buffer = encodeUtf16WithBom(csv);
      res.setHeader("Content-Type", "text/tab-separated-values; charset=utf-16le");
      res.setHeader("Content-Disposition", 'attachment; filename="program-directions-template.csv"');
      return res.send(buffer);
    }

    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "program_directions_template");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="program-directions-template.xlsx"');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}

export async function importProgramDirections(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = readWorksheetRows(req.file);
    if (!rows.length) {
      return invalid(res, "Empty file");
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const sourceRow of rows) {
      const row = normalizeDirectionRow(sourceRow);
      if (!row.program || !row.code || !row.name_el) {
        skipped += 1;
        continue;
      }

      const studyProgramId = await resolveStudyProgramId(row.program);
      if (!studyProgramId) {
        skipped += 1;
        continue;
      }

      const existing = await ProgramDirection.findOne({
        where: {
          study_program_id: studyProgramId,
          [Op.or]: [{ code: row.code }, { name_el: row.name_el }]
        }
      });

      if (existing) {
        await existing.update({
          study_program_id: studyProgramId,
          code: row.code,
          name_el: row.name_el,
          name_en: row.name_en,
          is_active: row.is_active,
        });
        updated += 1;
        continue;
      }

      await ProgramDirection.create({
        study_program_id: studyProgramId,
        code: row.code,
        name_el: row.name_el,
        name_en: row.name_en,
        is_active: row.is_active,
      } as any);
      inserted += 1;
    }

    await logAction({
      user_id: req.user?.id ?? null,
      action: "import_program_directions",
      entity_type: "program_direction",
      entity_id: null,
      details: { inserted, updated, skipped }
    });

    res.json({ ok: true, summary: { inserted, updated, skipped } });
  } catch (error) {
    next(error);
  }
}

export async function createProgramDirection(req: Request, res: Response, next: NextFunction) {
  try {
    const studyProgramId = parseId(req.body?.study_program_id);
    const code = readText(req.body?.code);
    const nameEl = readText(req.body?.name_el);
    const nameEn = readText(req.body?.name_en) || null;
    const isActive = req.body?.is_active === undefined ? true : Boolean(req.body.is_active);

    if (studyProgramId === undefined || !code || !nameEl) {
      return invalid(res, "study_program_id, code and name_el are required");
    }

    const program = await findStudyProgramOrFail(studyProgramId, res);
    if (!program) {
      return;
    }

    const existing = await findDuplicateDirection(studyProgramId, code, nameEl);
    if (existing) {
      return invalid(res, "Direction already exists for this study program");
    }

    const item = await ProgramDirection.create({
      study_program_id: studyProgramId,
      code,
      name_el: nameEl,
      name_en: nameEn,
      is_active: isActive
    });

    await logAction({
      user_id: req.user?.id ?? null,
      action: "create_program_direction",
      entity_type: "program_direction",
      entity_id: item.id,
      details: { study_program_id: studyProgramId, code, name_el: nameEl }
    });

    res.status(201).json({ ok: true, item });
  } catch (error) {
    next(error);
  }
}

export async function updateProgramDirection(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseId(req.params.id);
    if (id === undefined) {
      return invalid(res, "Invalid id");
    }

    const item = await findDirectionOrFail(id, res);
    if (!item) {
      return;
    }

    const patch: DirectionPatch = {};

    if (req.body?.study_program_id !== undefined) {
      const studyProgramId = parseId(req.body.study_program_id);
      if (studyProgramId === undefined) {
        return invalid(res, "study_program_id must be a number");
      }
      const program = await findStudyProgramOrFail(studyProgramId, res);
      if (!program) {
        return;
      }
      patch.study_program_id = studyProgramId;
    }

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

    if (!hasPatchChanges(patch)) {
      return invalid(res, "No changes provided");
    }

    const nextStudyProgramId = patch.study_program_id ?? item.study_program_id;
    const nextCode = patch.code ?? item.code;
    const nextNameEl = patch.name_el ?? item.name_el;

    const existing = await findDuplicateDirection(nextStudyProgramId, nextCode, nextNameEl, id);
    if (existing) {
      return invalid(res, "Direction already exists for this study program");
    }

    await item.update(patch);

    await logAction({
      user_id: req.user?.id ?? null,
      action: "update_program_direction",
      entity_type: "program_direction",
      entity_id: item.id,
      details: patch
    });

    res.json({ ok: true, item });
  } catch (error) {
    next(error);
  }
}

export async function deleteProgramDirection(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseId(req.params.id);
    if (id === undefined) {
      return invalid(res, "Invalid id");
    }

    const item = await findDirectionOrFail(id, res);
    if (!item) {
      return;
    }

    const graduatesCount = await Graduate.count({ where: { program_direction_id: id } });
    if (graduatesCount > 0) {
      return invalid(res, "Η κατεύθυνση χρησιμοποιείται ήδη σε αποφοίτους");
    }

    const details = {
      code: item.code,
      name_el: item.name_el,
      study_program_id: item.study_program_id
    };

    await item.destroy();

    await logAction({
      user_id: req.user?.id ?? null,
      action: "delete_program_direction",
      entity_type: "program_direction",
      entity_id: id,
      details
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}
