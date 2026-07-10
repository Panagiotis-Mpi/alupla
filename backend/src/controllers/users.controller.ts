import type { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import type { Transaction } from "sequelize";
import XLSX from "xlsx";
import { User } from "../models/User";
import { logAction } from "../services/log.service";
import { badRequest, hashPassword, isStrongPassword, normalizeEmail, normalizeText, notFound, toSafeUser } from "../utils/userAccounts";
import { clearRouteCaches } from "../utils/routeCache";
import { sanitizeExportRows } from "../utils/exportSafety";
import { applySheetLayout, buildDelimitedText, buildUtf16CsvBuffer } from "./activityLogs.helpers";
import { passwordResetUrl, sendNewUserAccountEmail } from "../services/userNotification.service";
import { createPasswordResetTokenData, USER_INVITATION_TTL_MS } from "../services/passwordReset.service";
import { buildExportFilename } from "../utils/exportFilename";
import { sequelize } from "../config/sequelize";

type AllowedRole = "super_admin" | "secretariat";

type UserCreateInput = {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
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
    language: normalizeText(body?.language ?? body?.lang ?? "")
  };
}

async function findUserByParamId(req: Request, res: Response, transaction?: Transaction) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    badRequest(res, "Invalid id");
    return null;
  }

  const user = await User.findByPk(id, transaction ? { transaction, lock: transaction.LOCK.UPDATE } : undefined);
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

function lastAdminMessage(req: Request, action: "role" | "deactivate" | "delete") {
  const lang = getExportLang(req);
  if (lang === "en") {
    if (action === "role") return "The last administrator cannot be changed to Secretariat.";
    if (action === "deactivate") return "The last administrator cannot be deactivated.";
    return "The last administrator cannot be deleted.";
  }

  if (action === "role") return "Ο τελευταίος διαχειριστής δεν μπορεί να αλλάξει σε Γραμματεία.";
  if (action === "deactivate") return "Ο τελευταίος διαχειριστής δεν μπορεί να απενεργοποιηθεί.";
  return "Ο τελευταίος διαχειριστής δεν μπορεί να διαγραφεί.";
}

function lastAdminConflict(res: Response, message: string) {
  return res.status(409).json({ ok: false, error: { message } });
}

async function lockActiveSuperAdmins(transaction: Transaction) {
  return User.findAll({
    attributes: ["id"],
    where: { role: "super_admin", is_active: true },
    order: [["id", "ASC"]],
    transaction,
    lock: transaction.LOCK.UPDATE
  });
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

    if (!input.first_name || !input.last_name || !input.email || !input.role) {
      return badRequest(res, "Missing fields");
    }

    if (!isAllowedRole(input.role)) return badRequest(res, "Invalid role");
    const exists = await User.findOne({ where: { email: input.email } });
    if (exists) return res.status(409).json({ ok: false, error: { message: "Email already exists" } });

    const invitation = createPasswordResetTokenData(USER_INVITATION_TTL_MS);
    const placeholderPassword = crypto.randomBytes(48).toString("base64url");
    const user = await User.create({
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      password_hash: await hashPassword(placeholderPassword),
      role: input.role,
      is_active: true,
      password_reset_token_hash: invitation.tokenHash,
      password_reset_expires_at: invitation.expiresAt
    });

    let mailSent = false;
    let mailError = "";

    try {
      mailSent = await sendNewUserAccountEmail({
        firstName: input.first_name,
        lastName: input.last_name,
        email: input.email,
        role: input.role,
        setupUrl: passwordResetUrl(invitation.token),
        language: input.language
      });
    } catch (error) {
      mailError = error instanceof Error ? error.message : "Email notification failed";
      console.error("ALUPLA user email notification failed:", mailError);
    }

    await writeUserLog(req, "create_user", user, { target_name: userDisplayName(user), target_role: input.role, invitation_sent: mailSent, ...(mailError ? { mail_error: mailError } : {}) });
    await clearRouteCaches(["users"]);

    res.status(201).json({ ok: true, item: toSafeUser(user), mail_sent: mailSent });
  } catch (e) {
    next(e);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body ?? {};

    const user = await sequelize.transaction(async (transaction) => {
      const activeSuperAdmins = await lockActiveSuperAdmins(transaction);
      const currentUser = await findUserByParamId(req, res, transaction);
      if (!currentUser) return null;

      let nextRole = currentUser.role;
      if (body.role !== undefined) {
        const role = normalizeText(body.role);
        if (!isAllowedRole(role)) {
          badRequest(res, "Invalid role");
          return null;
        }
        nextRole = role;
      }

      const nextIsActive = body.is_active !== undefined ? Boolean(body.is_active) : currentUser.is_active;
      const removesLastActiveSuperAdmin =
        currentUser.role === "super_admin" &&
        currentUser.is_active &&
        activeSuperAdmins.length === 1 &&
        (nextRole !== "super_admin" || !nextIsActive);

      if (removesLastActiveSuperAdmin) {
        const action = nextRole !== "super_admin" ? "role" : "deactivate";
        lastAdminConflict(res, lastAdminMessage(req, action));
        return null;
      }

      if (body.first_name !== undefined) currentUser.first_name = normalizeText(body.first_name);
      if (body.last_name !== undefined) currentUser.last_name = normalizeText(body.last_name);
      if (body.email !== undefined) currentUser.email = normalizeEmail(body.email);
      currentUser.role = nextRole;
      currentUser.is_active = nextIsActive;

      if (body.password !== undefined && String(body.password).length) {
        const password = String(body.password);
        if (!isStrongPassword(password)) {
          badRequest(res, "Weak password (min 8, letter+number+symbol)");
          return null;
        }
        currentUser.password_hash = await hashPassword(password);
      }

      if (!currentUser.first_name || !currentUser.last_name || !currentUser.email) {
        badRequest(res, "Invalid name/email");
        return null;
      }

      await currentUser.save({ transaction });
      return currentUser;
    });

    if (!user) return;

    await writeUserLog(req, "update_user", user, { changed: Object.keys(body) });
    await clearRouteCaches(["users"]);

    res.json({ ok: true, item: toSafeUser(user) });
  } catch (e) {
    next(e);
  }
}

export async function deactivateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await sequelize.transaction(async (transaction) => {
      const activeSuperAdmins = await lockActiveSuperAdmins(transaction);
      const currentUser = await findUserByParamId(req, res, transaction);
      if (!currentUser) return null;

      if (currentUser.role === "super_admin" && currentUser.is_active && activeSuperAdmins.length === 1) {
        lastAdminConflict(res, lastAdminMessage(req, "delete"));
        return null;
      }

      if (req.auth!.id === currentUser.id) {
        badRequest(res, "Cannot deactivate yourself");
        return null;
      }

      await writeUserLog(req, "διαγραφή χρήστη", currentUser, { target_name: userDisplayName(currentUser) });
      await currentUser.destroy({ transaction });
      return currentUser;
    });

    if (!user) return;

    await clearRouteCaches(["users"]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}
