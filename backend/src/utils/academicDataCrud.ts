import type { Response } from "express";

export function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseId(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function hasPatchChanges(patch: Record<string, unknown>) {
  return Object.keys(patch).length > 0;
}

export function invalid(res: Response, message: string) {
  return res.status(400).json({ ok: false, error: { message } });
}

export function missing(res: Response, message: string) {
  return res.status(404).json({ ok: false, error: { message } });
}
