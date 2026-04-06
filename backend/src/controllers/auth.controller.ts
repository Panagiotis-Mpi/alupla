import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Op } from "sequelize";
import { User } from "../models/User";
import { logAction } from "../services/log.service";
import { signToken } from "../utils/jwt";
import { fail, hashPassword, isStrongPassword, isValidEmail, normalizeEmail, normalizeText, toSafeUser } from "../utils/userAccounts";

function createHexToken() {
  return crypto.randomBytes(32).toString("hex");
}

const PASSWORD_RESET_HOURS = 1;

function addHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

async function findActiveUserByEmail(email: unknown) {
  const user = await User.findOne({ where: { email } });
  if (!user || !user.is_active) {
    return null;
  }
  return user;
}

export async function register(req: Request, res: Response) {
  const { first_name, last_name, email, password } = req.body ?? {};

  if (!first_name || !last_name || !email || !password) {
    return fail(res, 400, "Missing fields");
  }

  if (!isStrongPassword(String(password))) {
    return fail(res, 400, "Weak password (min 8, letter+number+symbol)");
  }

  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    return fail(res, 400, "Invalid email");
  }
  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  if (existingUser) {
    return fail(res, 409, "Email already exists");
  }

  const password_hash = await hashPassword(String(password));

  const user = await User.create({
    first_name: normalizeText(first_name),
    last_name: normalizeText(last_name),
    email: normalizedEmail,
    password_hash,
    role: "secretariat",
    is_active: true,
    email_verified: true,
    admin_approved: true,
    email_verification_token: null,
    email_verification_expires: null
  });

  const token = signToken({ sub: user.id, role: user.role });
  user.last_seen_at = new Date();
  await user.save();

  await logAction({ user_id: user.id, action: "register", entity_type: "user", entity_id: user.id });

  return res.json({
    ok: true,
    token,
    user: toSafeUser(user)
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return fail(res, 400, "Missing fields");
  }

  const user = await findActiveUserByEmail(email);
  if (!user) {
    return fail(res, 401, "Invalid credentials");
  }

  const passwordMatches = await bcrypt.compare(String(password), user.password_hash);
  if (!passwordMatches) {
    return fail(res, 401, "Invalid credentials");
  }

  const token = signToken({ sub: user.id, role: user.role });
  user.last_seen_at = new Date();
  await user.save();

  await logAction({ user_id: user.id, action: "login", entity_type: "system", entity_id: null });

  return res.json({ ok: true, token, user: toSafeUser(user) });
}

export async function updateProfile(req: Request, res: Response) {
  const auth = req.auth!;
  const { first_name, last_name, email } = req.body ?? {};

  if (!first_name || !last_name || !email) {
    return fail(res, 400, "Missing fields");
  }

  const user = await User.findByPk(auth.id);
  if (!user) {
    return fail(res, 404, "Not found");
  }

  const normalizedEmail = normalizeEmail(email);
  const existingUser = await User.findOne({
    where: {
      email: normalizedEmail,
      id: { [Op.ne]: user.id }
    }
  });

  if (existingUser) {
    return fail(res, 409, "Email already exists");
  }

  user.first_name = normalizeText(first_name);
  user.last_name = normalizeText(last_name);
  user.email = normalizedEmail;
  await user.save();

  await logAction({ user_id: user.id, action: "update_profile", entity_type: "user", entity_id: user.id });

  return res.json({ ok: true, user: toSafeUser(user) });
}

export async function changePassword(req: Request, res: Response) {
  const auth = req.auth!;
  const { current_password, new_password } = req.body ?? {};

  if (!current_password || !new_password) {
    return fail(res, 400, "Missing fields");
  }

  if (!isStrongPassword(String(new_password))) {
    return fail(res, 400, "Weak password (min 8, letter+number+symbol)");
  }

  const user = await User.findByPk(auth.id);
  if (!user) {
    return fail(res, 404, "Not found");
  }

  const currentPasswordMatches = await bcrypt.compare(String(current_password), user.password_hash);
  if (!currentPasswordMatches) {
    return fail(res, 401, "Wrong current password");
  }

  user.password_hash = await hashPassword(String(new_password));
  await user.save();

  await logAction({ user_id: user.id, action: "change_password", entity_type: "user", entity_id: user.id });

  return res.json({ ok: true });
}

export async function requestPasswordReset(req: Request, res: Response) {
  const { email } = req.body ?? {};
  if (!email) {
    return fail(res, 400, "Missing email");
  }

  const user = await findActiveUserByEmail(email);
  if (!user) {
    return res.json({ ok: true });
  }

  const resetToken = createHexToken();
  const resetExpires = addHours(PASSWORD_RESET_HOURS);

  user.password_reset_token = resetToken;
  user.password_reset_expires = resetExpires;
  await user.save();

  await logAction({ user_id: user.id, action: "request_password_reset", entity_type: "user", entity_id: user.id });

  return res.json({ ok: true, reset_token: resetToken, reset_expires: resetExpires });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, new_password } = req.body ?? {};

  if (!token || !new_password) {
    return fail(res, 400, "Missing fields");
  }

  if (!isStrongPassword(String(new_password))) {
    return fail(res, 400, "Weak password (min 8, letter+number+symbol)");
  }

  const user = await User.findOne({
    where: {
      password_reset_token: String(token),
      password_reset_expires: { [Op.gt]: new Date() }
    }
  });

  if (!user) {
    return fail(res, 400, "Invalid/expired token");
  }

  user.password_hash = await hashPassword(String(new_password));
  user.password_reset_token = null;
  user.password_reset_expires = null;
  await user.save();

  await logAction({ user_id: user.id, action: "reset_password", entity_type: "user", entity_id: user.id });

  return res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  const auth = req.auth!;
  const user = await User.findByPk(auth.id);
  if (!user) {
    return fail(res, 404, "Not found");
  }
  return res.json({ ok: true, user: toSafeUser(user) });
}
