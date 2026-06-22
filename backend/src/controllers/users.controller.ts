import type { NextFunction, Request, Response } from "express";
import XLSX from "xlsx";
import { User } from "../models/User";
import { logAction } from "../services/log.service";
import { badRequest, hashPassword, isStrongPassword, normalizeEmail, normalizeText, notFound, toSafeUser } from "../utils/userAccounts";
import { clearRouteCaches } from "../utils/routeCache";
import { sanitizeExportRows } from "../utils/exportSafety";
import { applySheetLayout, buildDelimitedText, buildUtf16CsvBuffer } from "./activityLogs.helpers";
import { sendNewUserAccountEmail } from "../services/userNotification.service";
import { buildExportFilename } from "../utils/exportFilename";

type AllowedRole = "super_admin" | "secretariat";

type UserCreateInput = {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  password: string;
  language: string;
};

function isAllowedRole(role: string): role is AllowedRole {
  return role === "super_admin" || role === "secretariat";
}

function readCreateInput(body: any): UserCreateInput {
  return {
    first_name: normalizeText(body?.first_name),
    last_name: normalizeText(body?.last_name),
    email: normalizeEmail(body?.email),
    role: normalizeText(body?.role),
    password: String(body?.password ?? ""),
    language: normalizeText(body?.language ?? body?.lang ?? "")
  };
}

async function findUserByParamId(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    badRequest(res, "Invalid id");
    return null;
  }

  const user = await User.findByPk(id);
  if (!user) {
    notFound(res);
    return null;
  }

  return user;
}

async function writeUserLog(req: Request, action: string, user: User, details?: Record<string, unknown>) {
  await logAction({
    user_id: req.auth!.id,
    action,
    entity_type: "user",
    entity_id: user.id,
    ...(details ? { details } : {})
  });
}

function userDisplayName(user: User) {
  return `${String(user.first_name ?? "").trim()} ${String(user.last_name ?? "").trim()}`.trim() || String(user.email ?? "").trim();
}


function getExportLang(req: Request) {
  const value = String(req.query.lang ?? "").trim().toLowerCase();
  return value.startsWith("en") ? "en" : "gr";
}

function formatDate(value: unknown, lang: "gr" | "en") {
  if (!value) return "";
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "el-GR", { timeZone: "Europe/Athens", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function roleLabel(role: string, lang: "gr" | "en") {
  if (role === "super_admin") return lang === "en" ? "Administrator" : "Διαχειριστής";
  return lang === "en" ? "Secretariat" : "Γραμματεία";
}

function userExportRows(users: User[], lang: "gr" | "en") {
  return users.map((user) => {
    const name = `${String(user.first_name ?? "").trim()} ${String(user.last_name ?? "").trim()}`.trim();
    return lang === "en"
      ? {
          ID: user.id,
          Email: user.email,
          Name: name,
          Role: roleLabel(user.role, lang),
          "Account creation date": formatDate(user.created_at, lang)
        }
      : {
          ID: user.id,
          Email: user.email,
          Όνομα: name,
          Ρόλος: roleLabel(user.role, lang),
          "Ημερομηνία δημιουργίας λογαριασμού": formatDate(user.created_at, lang)
        };
  });
}

async function writeUsersExportLog(req: Request, format: "csv" | "xlsx", count: number) {
  await logAction({
    user_id: req.auth!.id,
    action: format === "csv" ? "export_users_csv" : "export_users_xlsx",
    entity_type: "user",
    entity_id: null,
    details: { format, count }
  });
}

export async function exportUsersCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const lang = getExportLang(req);
    const users = await User.findAll({ order: [["id", "ASC"]] });
    await writeUsersExportLog(req, "csv", users.length);
    const rows = sanitizeExportRows(userExportRows(users, lang));
    const csv = buildDelimitedText(rows, "\t");
    const buffer = buildUtf16CsvBuffer(csv);
    res.setHeader("Content-Type", "text/tab-separated-values; charset=utf-16le");
    res.setHeader("Content-Disposition", `attachment; filename="${buildExportFilename("users", ["all", users.length, "records"], "csv")}"`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
}

export async function exportUsersXlsx(req: Request, res: Response, next: NextFunction) {
  try {
    const lang = getExportLang(req);
    const users = await User.findAll({ order: [["id", "ASC"]] });
    await writeUsersExportLog(req, "xlsx", users.length);
    const rows = sanitizeExportRows(userExportRows(users, lang));
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    applySheetLayout(worksheet, rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, lang === "en" ? "Users" : "Χρήστες");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${buildExportFilename("users", ["all", users.length, "records"], "xlsx")}"`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
}

export async function listUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await User.findAll({ order: [["id", "ASC"]] });
    res.json({ ok: true, items: items.map(toSafeUser) });
  } catch (e) {
    next(e);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const input = readCreateInput(req.body ?? {});

    if (!input.first_name || !input.last_name || !input.email || !input.role || !input.password) {
      return badRequest(res, "Missing fields");
    }

    if (!isAllowedRole(input.role)) return badRequest(res, "Invalid role");
    if (!isStrongPassword(input.password)) {
      return badRequest(res, "Weak password (min 8, letter+number+symbol)");
    }

    const exists = await User.findOne({ where: { email: input.email } });
    if (exists) return res.status(409).json({ ok: false, error: { message: "Email already exists" } });

    const user = await User.create({
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      password_hash: await hashPassword(input.password),
      role: input.role,
      is_active: true
    });

    let mailSent = false;
    let mailError = "";

    try {
      mailSent = await sendNewUserAccountEmail({
        firstName: input.first_name,
        lastName: input.last_name,
        email: input.email,
        role: input.role,
        password: input.password,
        language: input.language
      });
    } catch (error) {
      mailError = error instanceof Error ? error.message : "Email notification failed";
      console.error("ALUPLA user email notification failed:", mailError);
    }

    await writeUserLog(req, "create_user", user, { target_name: userDisplayName(user), target_role: input.role, mail_sent: mailSent, ...(mailError ? { mail_error: mailError } : {}) });
    clearRouteCaches(["users"]);

    res.status(201).json({ ok: true, item: toSafeUser(user), mail_sent: mailSent });
  } catch (e) {
    next(e);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await findUserByParamId(req, res);
    if (!user) return;

    const body = req.body ?? {};

    if (body.first_name !== undefined) user.first_name = normalizeText(body.first_name);
    if (body.last_name !== undefined) user.last_name = normalizeText(body.last_name);
    if (body.email !== undefined) user.email = normalizeEmail(body.email);

    if (body.role !== undefined) {
      const role = normalizeText(body.role);
      if (!isAllowedRole(role)) return badRequest(res, "Invalid role");
      user.role = role;
    }

    if (body.is_active !== undefined) user.is_active = Boolean(body.is_active);

    if (body.password !== undefined && String(body.password).length) {
      const password = String(body.password);
      if (!isStrongPassword(password)) {
        return badRequest(res, "Weak password (min 8, letter+number+symbol)");
      }
      user.password_hash = await hashPassword(password);
    }

    if (!user.first_name || !user.last_name || !user.email) return badRequest(res, "Invalid name/email");

    await user.save();
    await writeUserLog(req, "update_user", user, { changed: Object.keys(body) });
    clearRouteCaches(["users"]);

    res.json({ ok: true, item: toSafeUser(user) });
  } catch (e) {
    next(e);
  }
}

export async function deactivateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await findUserByParamId(req, res);
    if (!user) return;

    if (req.auth!.id === user.id) return badRequest(res, "Cannot deactivate yourself");

    await writeUserLog(req, "διαγραφή χρήστη", user, { target_name: userDisplayName(user) });
    await user.destroy();

    clearRouteCaches(["users"]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}
