import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Op } from "sequelize";
import { User } from "../models/User";
import { signToken } from "../utils/jwt";
import { logAction } from "../services/log.service";

function isStrongPassword(pw: string) {
  // minimum: 8 chars, at least 1 letter, 1 number, 1 symbol
  if (pw.length < 8) return false;
  if (!/[A-Za-z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  if (!/[^A-Za-z0-9]/.test(pw)) return false;
  return true;
}

export async function register(req: Request, res: Response) {
  const { first_name, last_name, email, password } = req.body ?? {};
  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ ok: false, error: { message: "Missing fields" } });
  }
  if (!isStrongPassword(password)) {
    return res.status(400).json({
      ok: false,
      error: { message: "Weak password (min 8, letter+number+symbol)" }
    });
  }

  const existing = await User.findOne({ where: { email } });
  if (existing) return res.status(409).json({ ok: false, error: { message: "Email already exists" } });

  const password_hash = await bcrypt.hash(password, 10);

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

  const user = await User.create({
    first_name,
    last_name,
    email,
    password_hash,
    role: "secretariat",
    is_active: true,
    email_verified: false,
    email_verification_token: token,
    email_verification_expires: expires
  });

  await logAction({ user_id: user.id, action: "register", entity_type: "user", entity_id: user.id });

  // In real app: send email. For dev: return token.
  return res.json({ ok: true, user: safeUser(user), verification_token: token, verification_expires: expires });
}

export async function verifyEmail(req: Request, res: Response) {
  const token = String(req.query.token ?? "");
  if (!token) return res.status(400).json({ ok: false, error: { message: "Missing token" } });

  const user = await User.findOne({
    where: {
      email_verification_token: token,
      email_verification_expires: { [Op.gt]: new Date() }
    }
  });

  if (!user) return res.status(400).json({ ok: false, error: { message: "Invalid/expired token" } });

  user.email_verified = true;
  user.email_verification_token = null;
  user.email_verification_expires = null;
  await user.save();

  await logAction({ user_id: user.id, action: "verify_email", entity_type: "user", entity_id: user.id });

  return res.json({ ok: true });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ ok: false, error: { message: "Missing fields" } });

  const user = await User.findOne({ where: { email } });
  if (!user || !user.is_active) return res.status(401).json({ ok: false, error: { message: "Invalid credentials" } });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ ok: false, error: { message: "Invalid credentials" } });

  if (!user.email_verified) {
    return res.status(403).json({ ok: false, error: { message: "Email not verified" } });
  }

  const token = signToken({ sub: user.id, role: user.role });

  // mark user as online (db presence)
  await user.update({ last_seen_at: new Date() } as any);

  await logAction({ user_id: user.id, action: "login", entity_type: "system", entity_id: null });

  return res.json({ ok: true, token, user: safeUser(user) });
}


export async function changePassword(req: Request, res: Response) {
  const auth = req.auth!;
  const { current_password, new_password } = req.body ?? {};
  if (!current_password || !new_password) {
    return res.status(400).json({ ok: false, error: { message: "Missing fields" } });
  }
  if (!isStrongPassword(String(new_password))) {
    return res.status(400).json({
      ok: false,
      error: { message: "Weak password (min 8, letter+number+symbol)" }
    });
  }

  const user = await User.findByPk(auth.id);
  if (!user) return res.status(404).json({ ok: false, error: { message: "Not found" } });

  const ok = await bcrypt.compare(String(current_password), user.password_hash);
  if (!ok) return res.status(401).json({ ok: false, error: { message: "Wrong current password" } });

  user.password_hash = await bcrypt.hash(String(new_password), 10);
  await user.save();

  await logAction({ user_id: user.id, action: "change_password", entity_type: "user", entity_id: user.id });

  return res.json({ ok: true });
}



export async function requestPasswordReset(req: Request, res: Response) {
  const { email } = req.body ?? {};
  if (!email) return res.status(400).json({ ok: false, error: { message: "Missing email" } });

  const user = await User.findOne({ where: { email } });
  // Don't leak whether email exists; return ok anyway.
  if (!user || !user.is_active) {
    return res.json({ ok: true });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1h

  user.password_reset_token = token;
  user.password_reset_expires = expires;
  await user.save();

  await logAction({ user_id: user.id, action: "request_password_reset", entity_type: "user", entity_id: user.id });

  // In real app: send email. For dev: return token.
  return res.json({ ok: true, reset_token: token, reset_expires: expires });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, new_password } = req.body ?? {};
  if (!token || !new_password) {
    return res.status(400).json({ ok: false, error: { message: "Missing fields" } });
  }
  if (!isStrongPassword(String(new_password))) {
    return res.status(400).json({
      ok: false,
      error: { message: "Weak password (min 8, letter+number+symbol)" }
    });
  }

  const user = await User.findOne({
    where: {
      password_reset_token: String(token),
      password_reset_expires: { [Op.gt]: new Date() }
    }
  });

  if (!user) return res.status(400).json({ ok: false, error: { message: "Invalid/expired token" } });

  user.password_hash = await bcrypt.hash(String(new_password), 10);
  user.password_reset_token = null;
  user.password_reset_expires = null;
  await user.save();

  await logAction({ user_id: user.id, action: "reset_password", entity_type: "user", entity_id: user.id });

  return res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  const auth = req.auth!;
  const user = await User.findByPk(auth.id);
  if (!user) return res.status(404).json({ ok: false, error: { message: "Not found" } });
  return res.json({ ok: true, user: safeUser(user) });
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
    created_at: (u as any).created_at,
    updated_at: (u as any).updated_at
  };
}
