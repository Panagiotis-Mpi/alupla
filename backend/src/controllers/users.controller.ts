import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { logAction } from "../services/log.service";

const ONLINE_WINDOW_MS = 90_000;
const SALT_ROUNDS = 10;

type AllowedRole = "super_admin" | "secretariat";

function computeIsOnline(lastSeen: Date | null | undefined) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() <= ONLINE_WINDOW_MS;
}

function bad(res: Response, message: string) {
  return res.status(400).json({ ok: false, error: { message } });
}

function notFound(res: Response) {
  return res.status(404).json({ ok: false, error: { message: "Not found" } });
}

function isStrongPassword(pw: string) {
  if (pw.length < 8) return false;
  if (!/[A-Za-z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  if (!/[^A-Za-z0-9]/.test(pw)) return false;
  return true;
}

function isAllowedRole(role: string): role is AllowedRole {
  return role === "super_admin" || role === "secretariat";
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function safeUser(u: User) {
  const lastSeenAt = (u as any).last_seen_at;
  return {
    id: u.id,
    first_name: u.first_name,
    last_name: u.last_name,
    email: u.email,
    role: u.role,
    is_active: u.is_active,
    created_at: (u as any).created_at,
    updated_at: (u as any).updated_at,
    last_seen_at: lastSeenAt,
    is_online: computeIsOnline(lastSeenAt)
  };
}

async function findUserByParamId(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    bad(res, "Invalid id");
    return null;
  }

  const user = await User.findByPk(id);
  if (!user) {
    notFound(res);
    return null;
  }

  return user;
}

async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function listUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await User.findAll({ order: [["id", "ASC"]] });
    res.json({ ok: true, items: items.map(safeUser) });
  } catch (e) {
    next(e);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body ?? {};
    const first_name = normalizeText(body.first_name);
    const last_name = normalizeText(body.last_name);
    const email = normalizeText(body.email);
    const role = normalizeText(body.role);
    const password = String(body.password ?? "");

    if (!first_name || !last_name || !email || !role || !password) {
      return bad(res, "Missing fields");
    }

    if (!isAllowedRole(role)) return bad(res, "Invalid role");
    if (!isStrongPassword(password)) {
      return bad(res, "Weak password (min 8, letter+number+symbol)");
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

    res.status(201).json({ ok: true, item: safeUser(u) });
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
    if (body.email !== undefined) u.email = normalizeText(body.email);

    if (body.role !== undefined) {
      const role = normalizeText(body.role);
      if (!isAllowedRole(role)) return bad(res, "Invalid role");
      u.role = role;
    }

    if (body.is_active !== undefined) u.is_active = Boolean(body.is_active);

    if (body.password !== undefined && String(body.password).length) {
      const password = String(body.password);
      if (!isStrongPassword(password)) {
        return bad(res, "Weak password (min 8, letter+number+symbol)");
      }
      u.password_hash = await hashPassword(password);
    }

    if (!u.first_name || !u.last_name || !u.email) return bad(res, "Invalid name/email");

    await u.save();

    await logAction({
      user_id: req.auth!.id,
      action: "update_user",
      entity_type: "user",
      entity_id: u.id,
      details: { changed: Object.keys(body) }
    });

    res.json({ ok: true, item: safeUser(u) });
  } catch (e) {
    next(e);
  }
}

export async function deactivateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const u = await findUserByParamId(req, res);
    if (!u) return;

    if (req.auth!.id === u.id) return bad(res, "Cannot deactivate yourself");

    const deletedName = `${String(u.first_name ?? "").trim()} ${String(u.last_name ?? "").trim()}`.trim() || String(u.email ?? "").trim();
    await logAction({ user_id: req.auth!.id, action: "διαγραφή χρήστη", entity_type: "user", entity_id: u.id, details: { name: deletedName } });
    await u.destroy();

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

