import bcrypt from "bcryptjs";
import type { Response } from "express";
import type { User } from "../models/User";

const STRONG_PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const PASSWORD_HASH_ROUNDS = 10;
const ONLINE_WINDOW_MS = 90_000;

export function fail(res: Response, status: number, message: string) {
  return res.status(status).json({ ok: false, error: { message } });
}

export function badRequest(res: Response, message: string) {
  return fail(res, 400, message);
}

export function notFound(res: Response, message = "Not found") {
  return fail(res, 404, message);
}

export function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

export function isStrongPassword(value: string) {
  return STRONG_PASSWORD_RULE.test(String(value ?? ""));
}



function computeIsOnline(lastSeen: Date | null | undefined) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() <= ONLINE_WINDOW_MS;
}

export function toSafeUser(user: User) {
  const lastSeenAt = user.last_seen_at;
  const safeUser = {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };

  return lastSeenAt !== undefined
    ? { ...safeUser, last_seen_at: lastSeenAt, is_online: computeIsOnline(lastSeenAt) }
    : safeUser;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
}
