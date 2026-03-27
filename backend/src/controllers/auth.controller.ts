import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Op } from "sequelize";
import { User } from "../models/User";
import { signToken } from "../utils/jwt";
import { logAction } from "../services/log.service";
import { sendVerificationEmail } from "../services/mail.service";
import { env } from "../config/env";

function fail(res: Response, status: number, message: string) {
  return res.status(status).json({ ok: false, error: { message } });
}

function isStrongPassword(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);
}

function safeUser(user: User) {
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
    email_verified: user.email_verified,
    admin_approved: user.admin_approved,
    created_at: (user as any).created_at,
    updated_at: (user as any).updated_at
  };
}

function createHexToken() {
  return crypto.randomBytes(32).toString("hex");
}

const EMAIL_VERIFICATION_MINUTES = 15;

function addHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function addMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function buildVerificationUrl(email: string, token: string) {
  const query = new URLSearchParams({ token, email });
  return `${env.appUrl}/verify?${query.toString()}`;
}

async function findActiveUserByEmail(email: unknown) {
  const user = await User.findOne({ where: { email } });
  if (!user || !user.is_active) {
    return null;
  }
  return user;
}

async function deliverVerificationEmail(user: User, verificationToken: string) {
  await sendVerificationEmail({
    to: user.email,
    firstName: user.first_name,
    verificationUrl: buildVerificationUrl(user.email, verificationToken),
    expiresInMinutes: EMAIL_VERIFICATION_MINUTES
  });
}

async function refreshVerificationToken(user: User) {
  const previousToken = user.email_verification_token;
  const previousExpires = user.email_verification_expires;
  const verificationToken = createHexToken();
  const verificationExpires = addMinutes(EMAIL_VERIFICATION_MINUTES);

  user.email_verification_token = verificationToken;
  user.email_verification_expires = verificationExpires;
  await user.save();

  try {
    await deliverVerificationEmail(user, verificationToken);
    return { verificationToken, verificationExpires, verificationSent: true };
  } catch (error) {
    user.email_verification_token = previousToken;
    user.email_verification_expires = previousExpires;
    await user.save();
    return { verificationToken: previousToken, verificationExpires: previousExpires, verificationSent: false, error };
  }
}

export async function register(req: Request, res: Response) {
  const { first_name, last_name, email, password } = req.body ?? {};

  if (!first_name || !last_name || !email || !password) {
    return fail(res, 400, "Missing fields");
  }

  if (!isStrongPassword(String(password))) {
    return fail(res, 400, "Weak password (min 8, letter+number+symbol)");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  if (existingUser) {
    return fail(res, 409, "Email already exists");
  }

  const verificationToken = createHexToken();
  const verificationExpires = addMinutes(EMAIL_VERIFICATION_MINUTES);
  const password_hash = await bcrypt.hash(String(password), 10);

  const user = await User.create({
    first_name: String(first_name).trim(),
    last_name: String(last_name).trim(),
    email: normalizedEmail,
    password_hash,
    role: "secretariat",
    is_active: true,
    email_verified: false,
    admin_approved: false,
    email_verification_token: verificationToken,
    email_verification_expires: verificationExpires
  });

  let verificationSent = true;

  try {
    await deliverVerificationEmail(user, verificationToken);
  } catch (error) {
    verificationSent = false;
    console.error("register verification email failed", error);
  }

  await logAction({ user_id: user.id, action: "register", entity_type: "user", entity_id: user.id });

  return res.json({
    ok: true,
    user: safeUser(user),
    verification_expires: verificationExpires,
    verification_sent: verificationSent
  });
}

export async function verifyEmail(req: Request, res: Response) {
  const token = String(req.query.token ?? "");
  if (!token) {
    return fail(res, 400, "Missing token");
  }

  const matchingUser = await User.findOne({
    where: {
      email_verification_token: token
    }
  });

  if (!matchingUser) {
    return fail(res, 400, "Invalid verification link");
  }

  if (matchingUser.email_verified) {
    return res.json({ ok: true, already_verified: true });
  }

  const expiresAt = matchingUser.email_verification_expires;
  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    return fail(res, 410, "Verification link expired. Request a new email.");
  }

  const user = matchingUser;

  user.email_verified = true;
  user.email_verification_token = null;
  user.email_verification_expires = null;
  await user.save();

  await logAction({ user_id: user.id, action: "verify_email", entity_type: "user", entity_id: user.id });

  return res.json({ ok: true });
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

  if (!user.email_verified) {
    return fail(res, 403, "Email not verified");
  }

  if (!user.admin_approved) {
    return fail(res, 403, "Account pending admin approval");
  }

  const token = signToken({ sub: user.id, role: user.role });
  user.last_seen_at = new Date();
  await user.save();

  await logAction({ user_id: user.id, action: "login", entity_type: "system", entity_id: null });

  return res.json({ ok: true, token, user: safeUser(user) });
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

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = await User.findOne({
    where: {
      email: normalizedEmail,
      id: { [Op.ne]: user.id }
    }
  });

  if (existingUser) {
    return fail(res, 409, "Email already exists");
  }

  user.first_name = String(first_name).trim();
  user.last_name = String(last_name).trim();
  user.email = normalizedEmail;
  await user.save();

  await logAction({ user_id: user.id, action: "update_profile", entity_type: "user", entity_id: user.id });

  return res.json({ ok: true, user: safeUser(user) });
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

  user.password_hash = await bcrypt.hash(String(new_password), 10);
  await user.save();

  await logAction({ user_id: user.id, action: "change_password", entity_type: "user", entity_id: user.id });

  return res.json({ ok: true });
}

export async function resendVerification(req: Request, res: Response) {
  const { email } = req.body ?? {};
  if (!email) {
    return fail(res, 400, "Missing email");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await findActiveUserByEmail(normalizedEmail);
  if (!user) {
    return res.json({ ok: true });
  }

  if (user.email_verified) {
    return res.json({ ok: true, already_verified: true });
  }

  const { verificationExpires, verificationSent, error } = await refreshVerificationToken(user);

  if (!verificationSent && error) {
    console.error("resend verification email failed", error);
  }

  await logAction({ user_id: user.id, action: "resend_verify_email", entity_type: "user", entity_id: user.id });

  return res.json({
    ok: true,
    verification_expires: verificationExpires,
    verification_sent: verificationSent
  });
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
  const resetExpires = addHours(1);

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
  if (!user) {
    return fail(res, 404, "Not found");
  }
  return res.json({ ok: true, user: safeUser(user) });
}
