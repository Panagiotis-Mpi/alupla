// Κοινά μικρά helpers για CRUD ακαδημαϊκών δεδομένων και validation.
import type { Response } from "express";

// Διαβάζει καθαρό κείμενο από request body.
export function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

// Μετατρέπει id input σε number ή null.
export function parseId(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// Ελέγχει αν υπάρχουν πραγματικές αλλαγές στο patch.
export function hasPatchChanges(patch: Record<string, unknown>) {
  return Object.keys(patch).length > 0;
}

// Φτιάχνει τυποποιημένο validation error.
export function invalid(res: Response, message: string) {
  return res.status(400).json({ ok: false, error: { message } });
}

// Φτιάχνει τυποποιημένο missing-field error.
export function missing(res: Response, message: string) {
  return res.status(404).json({ ok: false, error: { message } });
}
