import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { logAction } from "../services/log.service";
import { passwordResetUrl, sendPasswordResetEmail } from "../services/userNotification.service";
import { createPasswordResetTokenData, findPasswordResetUser } from "../services/passwordReset.service";
import { passwordSessionKey, signToken } from "../utils/jwt";
import { fail, hashPassword, isStrongPassword, normalizeEmail, toSafeUser } from "../utils/userAccounts";

type SessionLog = {
  action: string;
  entity_type: string;
};

async function findActiveUserByEmail(email: unknown) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  const user = await User.findOne({ where: { email: normalizedEmail } });
  return user?.is_active ? user : null;
}

async function openSession(user: User, log: SessionLog) {
  const token = signToken({ sub: user.id, role: user.role, session_key: passwordSessionKey(user.password_hash) });
  user.last_seen_at = new Date();
  await user.save();
  await logAction({ user_id: user.id, ...log });
  return { token, user: toSafeUser(user) };
}

function passwordError(password: unknown) {
  return isStrongPassword(String(password)) ? null : "Weak password (min 8, letter+number+symbol)";
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

  const session = await openSession(user, { action: "login", entity_type: "system" });
  return res.json({ ok: true, ...session });
}

export async function requestPasswordReset(req: Request, res: Response, next: NextFunction) {
  try {
    const email = normalizeEmail(req.body?.email);
    const language = String(req.body?.language ?? req.body?.lang ?? "").trim();

    if (!email) {
      return fail(res, 400, "Missing fields");
    }

    const user = await findActiveUserByEmail(email);
    if (!user) {
      return res.json({ ok: true, mail_sent: true });
    }

    const resetToken = createPasswordResetTokenData();
    user.password_reset_token_hash = resetToken.tokenHash;
    user.password_reset_expires_at = resetToken.expiresAt;
    await user.save();

    let mailSent = false;
    let mailError = "";

    try {
      mailSent = await sendPasswordResetEmail({
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        resetUrl: passwordResetUrl(resetToken.token),
        language
      });
    } catch (error) {
      mailError = error instanceof Error ? error.message : "Password reset email failed";
      console.error("ALUPLA password reset email failed:", mailError);
    }

    await logAction({
      user_id: user.id,
      action: "request_password_reset",
      entity_type: "user",
      details: { mail_sent: mailSent, ...(mailError ? { mail_error: mailError } : {}) }
    });

    return res.json({ ok: true, mail_sent: mailSent });
  } catch (error) {
    next(error);
  }
}

export async function passwordResetAccount(req: Request, res: Response) {
  const user = await findPasswordResetUser(req.body?.token);
  if (!user) {
    return fail(res, 400, "Invalid or expired reset link");
  }

  return res.json({
    ok: true,
    account: {
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email
    }
  });
}

export async function resetPassword(req: Request, res: Response) {
  const token = String(req.body?.token ?? "").trim();
  const newPassword = String(req.body?.new_password ?? "");
  const repeatPassword = req.body?.repeat_new_password !== undefined ? String(req.body.repeat_new_password) : newPassword;

  if (!token || !newPassword || !repeatPassword) {
    return fail(res, 400, "Missing fields");
  }

  if (newPassword !== repeatPassword) {
    return fail(res, 400, "Passwords do not match");
  }

  const weakPasswordMessage = passwordError(newPassword);
  if (weakPasswordMessage) {
    return fail(res, 400, weakPasswordMessage);
  }

  const user = await findPasswordResetUser(token);
  if (!user) {
    return fail(res, 400, "Invalid or expired reset link");
  }

  user.password_hash = await hashPassword(newPassword);
  user.password_reset_token_hash = null;
  user.password_reset_expires_at = null;
  await user.save();
  await logAction({ user_id: user.id, action: "reset_password", entity_type: "user" });

  return res.json({ ok: true });
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
  await logAction({ user_id: user.id, action: "change_password", entity_type: "user" });

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
