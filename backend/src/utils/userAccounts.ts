// Helpers για email, password rules, online status και ασφαλή δεδομένα χρήστη.
import bcrypt from "bcryptjs";
import type { Response } from "express";
import type { User } from "../models/User";

const STRONG_PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const PASSWORD_HASH_ROUNDS = 10;
export const ONLINE_WINDOW_MS = 90_000;

// Φτιάχνει response error με status/message.
export function fail(res: Response, status: number, message: string) {
  return res.status(status).json({ ok: false, error: { message } });
}

// Επιστρέφει 400 validation error.
export function badRequest(res: Response, message: string) {
  return fail(res, 400, message);
}

// Επιστρέφει 404 not found error.
export function notFound(res: Response, message = "Not found") {
  return fail(res, 404, message);
}

// Καθαρίζει γενικό κείμενο χρήστη.
export function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

// Καθαρίζει email σε lowercase.
export function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

// Ελέγχει αν ο κωδικός περνά τον κανόνα ισχύος.
export function isStrongPassword(value: string) {
  return STRONG_PASSWORD_RULE.test(String(value ?? ""));
}

// Ελέγχει βασική μορφή email.
export function isValidEmail(value: unknown) {
  const email = normalizeEmail(value);
  if (!email || email.length > 254 || email.includes("..")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Υπολογίζει αν ο χρήστης θεωρείται online από last_seen_at.
export function computeIsOnline(lastSeen: Date | null | undefined) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() <= ONLINE_WINDOW_MS;
}

// Αφαιρεί ευαίσθητα στοιχεία πριν σταλεί χρήστης στο frontend.
export function toSafeUser(user: User) {
  const lastSeenAt = (user as any).last_seen_at;
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
    created_at: (user as any).created_at,
    updated_at: (user as any).updated_at,
    ...(lastSeenAt !== undefined ? { last_seen_at: lastSeenAt, is_online: computeIsOnline(lastSeenAt) } : {}),
  };
}

// Κάνει bcrypt hash για αποθήκευση κωδικού.
export async function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
}
