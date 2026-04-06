import XLSX from "xlsx";

export function resolveTemplateFormat(value: unknown) {
  return String(value ?? "xlsx").toLowerCase() === "csv" ? "csv" : "xlsx";
}

export function escapeDelimitedCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export function encodeUtf16WithBom(text: string) {
  return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")]);
}

export function readWorksheetRows(file: Express.Multer.File | undefined) {
  if (!file) return [] as Record<string, unknown>[];
  const workbook = XLSX.read(file.buffer, { type: "buffer", cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [] as Record<string, unknown>[];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], { defval: "" });
}

export function parseActiveFlag(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return true;
  if (["1", "true", "yes", "y", "active", "ενεργό", "ενεργη", "ενεργο"].includes(text)) return true;
  if (["0", "false", "no", "n", "inactive", "ανενεργό", "ανενεργη", "ανενεργο"].includes(text)) return false;
  return true;
}

export function normalizeImportKey(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function pickFirstFilled(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value === undefined || value === null) continue;
    if (String(value).trim() === "") continue;
    return value;
  }
  return undefined;
}
