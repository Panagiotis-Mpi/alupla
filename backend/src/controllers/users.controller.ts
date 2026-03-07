function computeIsOnline(lastSeen: Date | null | undefined) {
  if (!lastSeen) return false;
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  return diffMs <= 60_000; // online if seen in last 60s
}

import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { logAction } from "../services/log.service";

function bad(res: Response, message: string) {
  return res.status(400).json({ ok: false, error: { message } });
}

function isStrongPassword(pw: string) {
  if (pw.length < 8) return false;
  if (!/[A-Za-z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  if (!/[^A-Za-z0-9]/.test(pw)) return false;
  return true;
}

function safeUser(u: User) {
  return {
    id: u.id,
    first_name: u.first_name,
    last_name: u.last_name,
    email: u.email,
    role: u.role,
    is_active: u.is_active,
    email_verified: u.email_verified,
    admin_approved: (u as any).admin_approved,
    created_at: (u as any).created_at,
    updated_at: (u as any).updated_at,
    last_seen_at: (u as any).last_seen_at,
    is_online: computeIsOnline((u as any).last_seen_at)
  };
}

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await User.findAll({ order: [["id", "ASC"]] });
    res.json({ ok: true, items: items.map(safeUser) });
  } catch (e) {
    next(e);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { first_name, last_name, email, role, password } = req.body ?? {};
    if (!first_name || !last_name || !email || !role || !password) return bad(res, "Missing fields");

    if (role !== "super_admin" && role !== "secretariat") return bad(res, "Invalid role");
    if (!isStrongPassword(String(password))) {
      return bad(res, "Weak password (min 8, letter+number+symbol)");
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(409).json({ ok: false, error: { message: "Email already exists" } });

    const password_hash = await bcrypt.hash(String(password), 10);

    const u = await User.create({
      first_name,
      last_name,
      email,
      password_hash,
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
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, "Invalid id");

    const u = await User.findByPk(id);
    if (!u) return res.status(404).json({ ok: false, error: { message: "Not found" } });

    const body = req.body ?? {};

    if (body.first_name !== undefined) u.first_name = String(body.first_name).trim();
    if (body.last_name !== undefined) u.last_name = String(body.last_name).trim();
    if (body.email !== undefined) u.email = String(body.email).trim();

    if (body.role !== undefined) {
      const role = String(body.role);
      if (role !== "super_admin" && role !== "secretariat") return bad(res, "Invalid role");
      u.role = role as any;
    }

    if (body.is_active !== undefined) u.is_active = Boolean(body.is_active);
    if (body.email_verified !== undefined) u.email_verified = Boolean(body.email_verified);
    if (body.admin_approved !== undefined) u.admin_approved = Boolean(body.admin_approved);

    if (body.password !== undefined && String(body.password).length) {
      if (!isStrongPassword(String(body.password))) {
        return bad(res, "Weak password (min 8, letter+number+symbol)");
      }
      u.password_hash = await bcrypt.hash(String(body.password), 10);
    }

    if (!u.first_name.trim() || !u.last_name.trim() || !u.email.trim()) return bad(res, "Invalid name/email");

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
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, "Invalid id");

    const u = await User.findByPk(id);
    if (!u) return res.status(404).json({ ok: false, error: { message: "Not found" } });

    if (req.auth!.id === u.id) return bad(res, "Cannot deactivate yourself");

    u.is_active = false;
    await u.save();

    await logAction({ user_id: req.auth!.id, action: "deactivate_user", entity_type: "user", entity_id: u.id });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}
