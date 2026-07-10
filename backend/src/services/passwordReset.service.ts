import crypto from "crypto";
import { User } from "../models/User";

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
export const USER_INVITATION_TTL_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createPasswordResetTokenData(ttlMs = PASSWORD_RESET_TTL_MS) {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + ttlMs),
  };
}

export async function findPasswordResetUser(token: unknown) {
  const normalizedToken = String(token ?? "").trim();
  if (!normalizedToken) return null;

  const user = await User.findOne({
    where: { password_reset_token_hash: hashToken(normalizedToken) },
  });

  if (!user?.is_active || !user.password_reset_expires_at) return null;

  if (new Date(user.password_reset_expires_at).getTime() < Date.now()) {
    user.password_reset_token_hash = null;
    user.password_reset_expires_at = null;
    await user.save();
    return null;
  }

  return user;
}
