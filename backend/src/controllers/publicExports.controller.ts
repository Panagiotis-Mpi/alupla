import { Request, Response } from "express";
import { buildWhere, logPublicExportAction } from "./public.helpers";
import { buildAnonymousStatisticsWorkbook } from "./public.stats";
import { buildExportFilename, yearRangeFilenamePart } from "../utils/exportFilename";

export async function publicAnonymousGraduatesCsv(req: Request, res: Response) {
  const context = await buildWhere(req);
  const countsMode = req.query.counts_mode === "semester" ? "semester" : "year";
  const genderMode = req.query.gender_mode === "semester" ? "semester" : "year";
  const lang = String(req.query.lang ?? "").toLowerCase().startsWith("en") ? "en" : "gr";

  const { buffer, rowCount } = await buildAnonymousStatisticsWorkbook(context, countsMode, genderMode, lang);

  await logPublicExportAction(req, "statistics_export", "statistics", {
    format: "xlsx",
    graduation_year: req.query.graduation_year ?? null,
    study_program_id: req.query.study_program_id ?? null,
    gender: req.query.gender ?? null,
    age_group: req.query.age_group ?? null,
    counts_mode: countsMode,
    gender_mode: genderMode,
    lang,
    rows: rowCount,
  });

  const startYear = req.query.graduation_year_from ?? req.query.graduation_year ?? null;
  const endYear = req.query.graduation_year_to ?? req.query.graduation_year ?? null;
  const rangePart = yearRangeFilenamePart(String(startYear ?? ""), String(endYear ?? ""));

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${buildExportFilename("statistics", ["anonymous", rangePart], "xlsx")}"`);
  res.send(buffer);
}

export async function publicExportActivity(req: Request, res: Response) {
  const action = typeof req.body?.action === "string" ? req.body.action : "";
  const format = typeof req.body?.format === "string" ? req.body.format : null;

  if (action !== "map_export" && action !== "statistics_export") {
    return res.status(400).json({ ok: false, message: "Invalid action" });
  }

  const rawDetails =
    req.body?.details && typeof req.body.details === "object" && !Array.isArray(req.body.details)
      ? req.body.details
      : {};
  const readAllowedValues = (value: unknown, allowed: Set<string>) =>
    Array.isArray(value)
      ? Array.from(
          new Set(
            value
              .map((item) => String(item ?? "").trim())
              .filter((item) => allowed.has(item)),
          ),
        ).slice(0, 30)
      : [];
  const details: Record<string, unknown> = { format };

  if (action === "statistics_export") {
    const groups = readAllowedValues(
      (rawDetails as any).statistics_groups,
      new Set(["demographics", "academic", "geography", "compare"]),
    );
    if (groups.length) details.statistics_groups = groups;
  } else {
    const mapExports = readAllowedValues(
      (rawDetails as any).map_exports,
      new Set([
        "greece:count",
        "abroad:count",
        "greece:dominant_gender",
        "abroad:dominant_gender",
      ]),
    );
    if (mapExports.length) details.map_exports = mapExports;
  }

  const entityType = action === "map_export" ? "map" : "statistics";
  await logPublicExportAction(req, action, entityType, details);
  return res.json({ ok: true });
}
