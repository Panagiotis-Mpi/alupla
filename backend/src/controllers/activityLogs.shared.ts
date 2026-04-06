import type { Request } from "express";
import { Op } from "sequelize";
import { ActivityLog } from "../models/ActivityLog";
import { User } from "../models/User";
import {
  EXPORT_LIMIT,
  buildLogFilters,
  getLocalizedAction,
  getLocalizedDetails,
  getRoleFilter,
  nonEmptyString,
  parseDetails,
} from "./activityLogs.helpers";

function appendAnd(where: Record<any, any>, clause: Record<string, unknown>) {
  where[Op.and] = [
    ...(Array.isArray(where[Op.and]) ? (where[Op.and] as any[]) : []),
    clause,
  ];
}

function buildActorSearch(actor: string) {
  const parts = actor.split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? actor;
  const lastName = parts.slice(1).join(" ") || actor;

  return {
    [Op.or]: [
      { "$user.first_name$": { [Op.like]: `%${actor}%` } },
      { "$user.last_name$": { [Op.like]: `%${actor}%` } },
      { "$user.email$": { [Op.like]: `%${actor}%` } },
      {
        [Op.and]: [
          { "$user.first_name$": { [Op.like]: `%${firstName}%` } },
          { "$user.last_name$": { [Op.like]: `%${lastName}%` } },
        ],
      },
    ],
  };
}

export function buildActivityLogWhere(req: Request) {
  const where = buildLogFilters(req);
  const actor = nonEmptyString(req.query.actor);
  const role = getRoleFilter(req);

  if (actor) {
    appendAnd(where, buildActorSearch(actor));
  }

  if (role === "visitor") {
    appendAnd(where, { user_id: null });
  } else if (role !== "all") {
    appendAnd(where, { "$user.role$": role });
  }

  return where;
}

export function getActivityLogActorLabel(lang: "gr" | "en", row: any) {
  const firstName = String(row?.user?.first_name ?? "").trim();
  const lastName = String(row?.user?.last_name ?? "").trim();
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) return fullName;

  const details = parseDetails(row?.details);
  if (details && typeof details === "object") {
    const actorName = String((details as any).actor_name ?? "").trim();
    if (actorName) return actorName;

    const actorEmail = String((details as any).actor_email ?? "").trim();
    if (actorEmail) return actorEmail;
  }

  return lang === "en" ? "Visitor" : "Επισκέπτης";
}

export function formatActivityLogDateTime(lang: "gr" | "en", value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return String(value ?? "");

  const locale = lang === "en" ? "en-GB" : "el-GR";
  const formatOptions = { timeZone: "Europe/Athens" } as const;
  const time = new Intl.DateTimeFormat(locale, {
    ...formatOptions,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
  const day = new Intl.DateTimeFormat(locale, {
    ...formatOptions,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return `${time}, ${day}`;
}

export function buildActivityLogExportRows(lang: "gr" | "en", rows: any[]) {
  const timeLabel = lang === "en" ? "Time, Date" : "Ώρα, Ημερομηνία";
  const userLabel = lang === "en" ? "User" : "Χρήστης";
  const actionLabel = lang === "en" ? "Action" : "Ενέργεια";
  const detailsLabel = lang === "en" ? "Details" : "Λεπτομέρειες";

  return rows.map((row) => ({
    "#": row.id,
    [timeLabel]: formatActivityLogDateTime(lang, row.created_at),
    [userLabel]: getActivityLogActorLabel(lang, row),
    [actionLabel]: getLocalizedAction(lang, row.action, row),
    [detailsLabel]: getLocalizedDetails(lang, row),
  }));
}

export async function findActivityLogsForExport(req: Request) {
  return ActivityLog.findAll({
    where: buildActivityLogWhere(req),
    order: [["created_at", "DESC"]],
    limit: EXPORT_LIMIT,
    include: [{ model: User, as: "user", attributes: ["id", "email", "first_name", "last_name", "role"], required: false }],
  });
}
