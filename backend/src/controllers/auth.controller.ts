import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { logAction } from "../services/log.service";
import { signToken } from "../utils/jwt";
import { fail, hashPassword, isStrongPassword, isValidEmail, normalizeEmail, normalizeText, toSafeUser } from "../utils/userAccounts";

type SessionLog = {
  action: string;
  entity_type: string;
  entity_id: number | null;
};

async function findActiveUserByEmail(email: unknown) {
  const user = await User.findOne({ where: { email } });
  return user?.is_active ? user : null;
}

async function openSession(user: User, log: SessionLog) {
  const token = signToken({ sub: user.id, role: user.role });
  user.last_seen_at = new Date();
  await user.save();
  await logAction({ user_id: user.id, ...log });
  return { token, user: toSafeUser(user) };
}

function passwordError(password: unknown) {
  return isStrongPassword(String(password)) ? null : "Weak password (min 8, letter+number+symbol)";
}

export async function register(req: Request, res: Response) {
  const { first_name, last_name, email, password } = req.body ?? {};

  if (!first_name || !last_name || !email || !password) {
    return fail(res, 400, "Missing fields");
  }

  const weakPasswordMessage = passwordError(password);
  if (weakPasswordMessage) {
    return fail(res, 400, weakPasswordMessage);
  }

  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    return fail(res, 400, "Invalid email");
  }

  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  if (existingUser) {
    return fail(res, 409, "Email already exists");
  }

  const user = await User.create({
    first_name: normalizeText(first_name),
    last_name: normalizeText(last_name),
    email: normalizedEmail,
    password_hash: await hashPassword(String(password)),
    role: "secretariat",
    is_active: true
  });

  const session = await openSession(user, { action: "register", entity_type: "user", entity_id: user.id });
  return res.json({ ok: true, ...session });
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

  const session = await openSession(user, { action: "login", entity_type: "system", entity_id: null });
  return res.json({ ok: true, ...session });
}

export async function changePassword(req: Request, res: Response) {
  const auth = req.auth!;
  const { current_password, new_password } = req.body ?? {};

  if (!current_password || !new_password) {
    return fail(res, 400, "Missing fields");
  }

  const weakPasswordMessage = passwordError(new_password);
  if (weakPasswordMessage) {
    return fail(res, 400, weakPasswordMessage);
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

export async function me(req: Request, res: Response) {
  const auth = req.auth!;
  const user = await User.findByPk(auth.id);
  if (!user) {
    return fail(res, 404, "Not found");
  }
  return res.json({ ok: true, user: toSafeUser(user) });
}
