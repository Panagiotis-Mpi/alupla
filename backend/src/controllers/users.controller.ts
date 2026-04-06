import type { NextFunction, Request, Response } from "express";
import { User } from "../models/User";
import { logAction } from "../services/log.service";
import { badRequest, hashPassword, isStrongPassword, normalizeEmail, normalizeText, notFound, toSafeUser } from "../utils/userAccounts";

type AllowedRole = "super_admin" | "secretariat";

function isAllowedRole(role: string): role is AllowedRole {
  return role === "super_admin" || role === "secretariat";
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
    const body = req.body ?? {};
    const first_name = normalizeText(body.first_name);
    const last_name = normalizeText(body.last_name);
    const email = normalizeEmail(body.email);
    const role = normalizeText(body.role);
    const password = String(body.password ?? "");

    if (!first_name || !last_name || !email || !role || !password) {
      return badRequest(res, "Missing fields");
    }

    if (!isAllowedRole(role)) return badRequest(res, "Invalid role");
    if (!isStrongPassword(password)) {
      return badRequest(res, "Weak password (min 8, letter+number+symbol)");
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(409).json({ ok: false, error: { message: "Email already exists" } });

    const u = await User.create({
      first_name,
      last_name,
      email,
      password_hash: await hashPassword(password),
      role,
      is_active: true,
      email_verified: true,
      admin_approved: true
    });

    await logAction({ user_id: req.auth!.id, action: "create_user", entity_type: "user", entity_id: u.id });

    res.status(201).json({ ok: true, item: toSafeUser(u) });
  } catch (e) {
    next(e);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const u = await findUserByParamId(req, res);
    if (!u) return;

    const body = req.body ?? {};

    if (body.first_name !== undefined) u.first_name = normalizeText(body.first_name);
    if (body.last_name !== undefined) u.last_name = normalizeText(body.last_name);
    if (body.email !== undefined) u.email = normalizeEmail(body.email);

    if (body.role !== undefined) {
      const role = normalizeText(body.role);
      if (!isAllowedRole(role)) return badRequest(res, "Invalid role");
      u.role = role;
    }

    if (body.is_active !== undefined) u.is_active = Boolean(body.is_active);

    if (body.password !== undefined && String(body.password).length) {
      const password = String(body.password);
      if (!isStrongPassword(password)) {
        return badRequest(res, "Weak password (min 8, letter+number+symbol)");
      }
      u.password_hash = await hashPassword(password);
    }

    if (!u.first_name || !u.last_name || !u.email) return badRequest(res, "Invalid name/email");

    await u.save();

    await logAction({
      user_id: req.auth!.id,
      action: "update_user",
      entity_type: "user",
      entity_id: u.id,
      details: { changed: Object.keys(body) }
    });

    res.json({ ok: true, item: toSafeUser(u) });
  } catch (e) {
    next(e);
  }
}

export async function deactivateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const u = await findUserByParamId(req, res);
    if (!u) return;

    if (req.auth!.id === u.id) return badRequest(res, "Cannot deactivate yourself");

    const targetName = `${String(u.first_name ?? "").trim()} ${String(u.last_name ?? "").trim()}`.trim() || String(u.email ?? "").trim();
    await logAction({
      user_id: req.auth!.id,
      action: "διαγραφή χρήστη",
      entity_type: "user",
      entity_id: u.id,
      details: { target_name: targetName }
    });
    await u.destroy();

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

