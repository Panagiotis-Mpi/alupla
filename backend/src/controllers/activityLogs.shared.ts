import type { Request } from "express";
import { Op } from "sequelize";
import type { ActivityLog } from "../models/ActivityLog";

export type RoleFilter = "all" | "secretariat" | "super_admin" | "visitor";
export type LogPage = "graduates" | "academicData" | "statistics" | "map" | "logs";
export type LogOperation = "import" | "export";
export type LogFileType = "excel" | "csv" | "pdf" | "png";

type LogLike = Partial<ActivityLog> & {
  user?: { role?: string | null; first_name?: string | null; last_name?: string | null; email?: string | null } | null;
  details?: unknown;
};

type LooseWhere = Record<string, unknown>;

function readWhereArray(where: LooseWhere, key: symbol) {
  const current = (where as any)[key];
  return Array.isArray(current) ? [...current] : [];
}

function appendWhere(where: LooseWhere, key: symbol, clause: unknown) {
  const current = readWhereArray(where, key);
  current.push(clause);
  (where as any)[key] = current;
}

export function nonEmptyString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : undefined;
}

export function parseLogDetails(value: unknown) {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getRoleFilter(req: Request): RoleFilter {
  const role = String(req.query.role ?? "all").trim().toLowerCase();
  if (role === "secretariat" || role === "super_admin" || role === "visitor") return role;
  return "all";
}

export function buildLogFilters(req: Request) {
  const where: LooseWhere = {};
  const userId = req.query.user_id;
  const action = nonEmptyString(req.query.action);
  const entityType = nonEmptyString(req.query.entity_type);
  const keyword = nonEmptyString(req.query.q);

  if (userId !== undefined && userId !== "") where.user_id = Number(userId);

  if (action === "export_logs") {
    appendWhere(where, Op.and, {
      [Op.or]: [
        { action: "export_csv", entity_type: "logs" },
        { action: "export_xlsx", entity_type: "logs" },
      ],
    });
  } else if (action) {
    where.action = { [Op.like]: `%${action}%` };
  }

  if (entityType) where.entity_type = entityType;
  if (keyword) {
    (where as any)[Op.or] = [
      { action: { [Op.like]: `%${keyword}%` } },
      { entity_type: { [Op.like]: `%${keyword}%` } },
    ];
  }

  appendWhere(where, Op.and, { action: { [Op.notIn]: ["create_program_direction", "update_program_direction", "delete_program_direction", "import_program_directions"] } });
  appendWhere(where, Op.and, { entity_type: { [Op.ne]: "program_direction" } });

  return where;
}

export function addActorFilter(where: LooseWhere, actor: string) {
  const parts = actor.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? actor;
  const last = parts.slice(1).join(" ") || actor;

  appendWhere(where, Op.and, {
    [Op.or]: [
      { "$user.first_name$": { [Op.like]: `%${actor}%` } },
      { "$user.last_name$": { [Op.like]: `%${actor}%` } },
      { "$user.email$": { [Op.like]: `%${actor}%` } },
      {
        [Op.and]: [
          { "$user.first_name$": { [Op.like]: `%${first}%` } },
          { "$user.last_name$": { [Op.like]: `%${last}%` } },
        ],
      },
    ],
  });

  return where;
}

export function addRoleFilter(where: LooseWhere, role: RoleFilter) {
  if (role === "all") return where;
  if (role === "visitor") {
    appendWhere(where, Op.and, { user_id: null });
    return where;
  }

  appendWhere(where, Op.and, { "$user.role$": role });
  return where;
}

export function getRoleBucket(row: LogLike) {
  const details = parseLogDetails(row?.details);
  const detailRole = String((details as any)?.actor_role ?? "").trim().toLowerCase();
  if (detailRole === "secretariat") return "secretariat";
  if (detailRole === "super_admin") return "super_admin";
  if (detailRole === "visitor") return "visitor";

  const userRole = String(row?.user?.role ?? "").trim().toLowerCase();
  if (userRole === "secretariat") return "secretariat";
  if (userRole === "super_admin") return "super_admin";
  if (row?.user_id == null) return "visitor";
  return "unknown";
}

export function matchesRole(row: LogLike, roleFilter: RoleFilter) {
  return roleFilter === "all" ? true : getRoleBucket(row) === roleFilter;
}

export function getOperation(row: LogLike): LogOperation | null {
  const action = String(row?.action ?? "").trim();
  if (action.startsWith("import_") || action === "upload") return "import";
  if (action.includes("export") || action === "map_export" || action === "statistics_export") return "export";
  return null;
}

export function getLogPage(row: LogLike): LogPage | null {
  const action = String(row?.action ?? "").trim();
  const entityType = String(row?.entity_type ?? "").trim();

  if (action === "import_graduates" || action === "export_graduates" || entityType === "graduate") return "graduates";
  if (["import_study_programs", "import_region_peripheries", "import_region_cities"].includes(action) || ["study_program", "region", "regions"].includes(entityType)) return "academicData";
  if (action === "statistics_export" || entityType === "statistics") return "statistics";
  if (action === "map_export" || entityType === "map") return "map";
  if (entityType === "logs") return "logs";
  return null;
}

function getFormatFromFilename(name: string): LogFileType | null {
  const normalized = String(name ?? "").trim().toLowerCase();
  if (!normalized.includes(".")) return null;
  const ext = normalized.split(".").pop() || "";
  if (ext === "xls" || ext === "xlsx") return "excel";
  if (ext === "csv" || ext === "tsv") return "csv";
  if (ext === "pdf") return "pdf";
  if (ext === "png") return "png";
  return null;
}

export function getFileType(row: LogLike): LogFileType | null {
  const action = String(row?.action ?? "").trim();
  const details = parseLogDetails(row?.details) ?? {};
  const detailFormat = String((details as any).format ?? "").trim().toLowerCase();
  const detailFile = String((details as any).file ?? (details as any).filename ?? "").trim();

  if (["xls", "xlsx", "excel"].includes(detailFormat)) return "excel";
  if (["csv", "tsv"].includes(detailFormat)) return "csv";
  if (detailFormat === "pdf") return "pdf";
  if (detailFormat === "png") return "png";

  const byFilename = getFormatFromFilename(detailFile);
  if (byFilename) return byFilename;
  if (["import_graduates", "import_study_programs", "import_region_peripheries", "import_region_cities"].includes(action)) return "excel";
  if (action === "export_xlsx") return "excel";
  if (action === "export_csv") return "csv";
  if (action === "export_pdf") return "pdf";
  return null;
}
