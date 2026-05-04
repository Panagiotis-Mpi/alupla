// Helpers για spreadsheet templates και διάβασμα rows από CSV/XLSX.
import XLSX from "xlsx";
import { sanitizeExportCell } from "./exportSafety";

// Διαβάζει αν template/export ζητείται ως CSV ή XLSX.
export function resolveTemplateFormat(value: unknown) {
  return String(value ?? "xlsx").toLowerCase() === "csv" ? "csv" : "xlsx";
}

// Κάνει ασφαλές ένα κελί για CSV/TSV template.
export function escapeDelimitedCell(value: unknown) {
  const text = String(sanitizeExportCell(value) ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

// Κωδικοποιεί CSV με BOM για σωστά ελληνικά στο Excel.
export function encodeUtf16WithBom(text: string) {
  return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")]);
}

// Διαβάζει rows από CSV/XLSX upload.
export function readWorksheetRows(file: Express.Multer.File | undefined) {
  if (!file) return [] as Record<string, unknown>[];
  const workbook = XLSX.read(file.buffer, { type: "buffer", cellDates: true, cellFormula: false, cellHTML: false, cellNF: false, cellStyles: false, bookVBA: false, WTF: false } as any);
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [] as Record<string, unknown>[];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], { defval: "" });
}

// Μετατρέπει Ναι/Όχι/true/false σε boolean ενεργότητας.
export function parseActiveFlag(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return true;
  if (["1", "true", "yes", "y", "active", "ενεργό", "ενεργη", "ενεργο"].includes(text)) return true;
  if (["0", "false", "no", "n", "inactive", "ανενεργό", "ανενεργη", "ανενεργο"].includes(text)) return false;
  return true;
}

// Καθαρίζει key από import row.
export function normalizeImportKey(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

// Παίρνει την πρώτη μη κενή τιμή από πιθανές στήλες.
export function pickFirstFilled(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value === undefined || value === null) continue;
    if (String(value).trim() === "") continue;
    return value;
  }
  return undefined;
}
