import type { Response } from "express";
import * as XLSX from "xlsx";
import { normHeader, toDateOnly } from "../utils/importUtils";
import { normalizeRegionText } from "../utils/regionText";

export const EXPORT_LANGS = new Set(["gr", "en"]);
export type ExportLang = "gr" | "en";
export type GraduateFileFormat = "xlsx" | "csv";

export function getExportLang(raw: unknown): ExportLang {
  return typeof raw === "string" && EXPORT_LANGS.has(raw) ? (raw as ExportLang) : "gr";
}

export function getGraduateFileFormat(raw: unknown): GraduateFileFormat {
  return String(raw ?? "").trim().toLowerCase() === "csv" ? "csv" : "xlsx";
}

export function applySheetLayout(ws: XLSX.WorkSheet, rows: Array<Record<string, unknown>>) {
  const headers = rows.length ? Object.keys(rows[0] ?? {}) : [];
  ws["!cols"] = headers.map((header) => {
    let width = String(header ?? "").length;
    for (const row of rows) {
      const text = row?.[header] == null ? "" : String(row[header]);
      if (text.length > width) width = text.length;
    }
    return { wch: Math.min(Math.max(width + 2, 12), 40) };
  });

  if (!ws["!ref"]) return;
  const range = XLSX.utils.decode_range(ws["!ref"]);
  ws["!autofilter"] = { ref: ws["!ref"] };
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: XLSX.utils.encode_cell({ r: 1, c: 0 }), activePane: "bottomLeft", state: "frozen" } as any;
  for (let c = range.s.c; c <= range.e.c; c += 1) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c });
    const cell = ws[cellRef];
    if (!cell) continue;
    cell.s = { ...(cell.s || {}), font: { ...(cell.s?.font || {}), bold: true }, alignment: { ...(cell.s?.alignment || {}), vertical: "center" } } as any;
  }
}

export function applyTemplateSheetLayout(ws: XLSX.WorkSheet, headerRows: string[][]) {
  const widthByColumn: number[] = [];
  for (const row of headerRows) {
    row.forEach((value, index) => {
      const size = String(value ?? "").length;
      widthByColumn[index] = Math.max(widthByColumn[index] || 0, size);
    });
  }
  ws["!cols"] = widthByColumn.map((width) => ({ wch: Math.min(Math.max(width + 2, 12), 40) }));
  if (ws["!ref"]) {
    ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: XLSX.utils.encode_cell({ r: 1, c: 0 }), activePane: "bottomLeft", state: "frozen" } as any;
  }
}

export function getColumnLabels(lang: ExportLang) {
  return lang === "en"
    ? { ad_code: "A.D.", student_number: "Student No.", last_name: "Last name", first_name: "First name", father_name: "Father name", gender: "Gender", entry_year: "Entry year", birth_date: "Birth date", degree_grade: "Degree grade", graduation_date: "Graduation date", oath_date: "Oath date", study_program: "Study program", direction: "Direction", origin_country: "Country", origin_region: "Region", origin_municipality: "City" } as const
    : { ad_code: "Α.Δ.", student_number: "Α.Μ.", last_name: "Επώνυμο", first_name: "Όνομα", father_name: "Πατρώνυμο", gender: "Φύλο", entry_year: "Έτος εισαγωγής", birth_date: "Ημερομηνία γέννησης", degree_grade: "Βαθμός πτυχίου", graduation_date: "Ημ. αποφοίτησης", oath_date: "Ημ. ορκωμοσίας", study_program: "Πρόγραμμα σπουδών", direction: "Κατεύθυνση", origin_country: "Χώρα", origin_region: "Περιφέρεια", origin_municipality: "Πόλη" } as const;
}

export const GRADUATES_COLUMN_KEYS = [
  "ad_code",
  "student_number",
  "last_name",
  "first_name",
  "father_name",
  "gender",
  "entry_year",
  "birth_date",
  "degree_grade",
  "graduation_date",
  "oath_date",
  "study_program",
  "direction",
  "origin_country",
  "origin_region",
  "origin_municipality",
] as const;

export function getStrictTemplateHeaderRows(lang: ExportLang) {
  const labels = getColumnLabels(lang);
  return GRADUATES_COLUMN_KEYS.map((key) => labels[key]);
}

export function getMatchedTemplateHeaderKeys(headers: string[]) {
  const normalizedHeaders = headers.map((header) => normHeader(header));
  const gr = getStrictTemplateHeaderRows("gr").map((header) => normHeader(header));
  const en = getStrictTemplateHeaderRows("en").map((header) => normHeader(header));
  const same = (expected: string[]) => expected.length === normalizedHeaders.length && expected.every((value, index) => value === normalizedHeaders[index]);
  if (same(gr) || same(en)) {
    return Object.fromEntries(GRADUATES_COLUMN_KEYS.map((key, index) => [key, index])) as Record<(typeof GRADUATES_COLUMN_KEYS)[number], number>;
  }
  return null;
}

export const IMPORT_HEADER_ALIASES = {
  student_number: ["student_number","am","a_m","a.m","αμ","α.μ","student no.","student no","α.μ.","Α.Μ."],
  ad_code: ["ad_code","aa","a_a","a.a","αα","α.α","a.d.","a.d","α.δ.","α.δ","A.D.","Α.Δ."],
  last_name: ["last_name","επωνυμο","επώνυμο","surname","last name"],
  first_name: ["first_name","ονομα","όνομα","name","first name"],
  father_name: ["father_name","πατρωνυμο","πατρώνυμο","father","father name"],
  gender: ["gender","φυλο","φύλο","sex"],
  entry_year: ["entry_year","ετος_εισαγωγης","έτος_εισαγωγής","entryyear","έτος εισαγωγής","entry year"],
  graduation_date: ["graduation_date","ημ_αποφοιτησης","ημ._αποφοίτησης","graduation","ημ. αποφοίτησης","graduation date","Ημ. αποφοίτησης","ημερομηνία αποφοίτησης","ημερομηνια αποφοίτησης","ημερομηνία_αποφοίτησης","ημερομηνια_αποφοίτησης"],
  oath_date: ["oath_date","ημ_ορκωμοσιας","ημ._ορκωμοσίας","oath","ημ. ορκωμοσίας","oath date","Ημ. ορκωμοσίας","ημερομηνία ορκωμοσίας","ημερομηνια ορκωμοσίας","ημερομηνία_ορκωμοσίας","ημερομηνια_ορκωμοσίας"],
  degree_grade: ["degree_grade","βαθμος","βαθμός","grade","βαθμός πτυχίου","degree grade"],
  birth_year: ["birth_year","ετος_γεννησης","έτος_γεννησης","year_of_birth","yob","έτος γέννησης","birth year"],
  birth_date: ["birth_date","ημερομηνια_γεννησης","ημερομηνία_γέννησης","ημ_γεννησης","ημ._γέννησης","birthdate","dob","birth date","ημερομηνία γέννησης","ημερομηνια γεννησης"],
  study_program: ["study_program","study_program_id","study_prog","program_id","προγραμμα","πρόγραμμα","program","πρόγραμμα σπουδών","study program"],
  study_program_id: ["study_program_id","study_prog","program_id","προγραμμα","πρόγραμμα","program"],
  program_direction: ["program_direction","program_direction_id","program_dir","direction_id","κατευθυνση","κατεύθυνση","direction"],
  program_direction_id: ["program_direction_id","program_dir","direction_id","κατευθυνση","κατεύθυνση","direction"],
  origin_country: ["origin_country","origin_country_region_id","country","χώρα","χωρα"],
  origin_country_region_id: ["origin_country_region_id","origin_country","country_id","country","χώρα","χωρα"],
  origin_region: ["origin_region","origin_periphery_region_id","origin_region_id","origin_regio","region_id","περιοχη","περιοχή","περιφέρεια","region","periphery"],
  origin_region_id: ["origin_periphery_region_id","origin_region_id","origin_regio","region_id","περιοχη","περιοχή","περιφέρεια","region","periphery"],
  origin_municipality: ["origin_municipality","πόλη","municipality","city","foreign_city","city of origin"],
} as const;

const GRADUATE_SORT_FIELDS = new Set(["id", "last_name", "first_name", "entry_year", "graduation_date", "oath_date", "degree_grade", "birth_date", "study_program_id", "program_direction_id", "origin_region_id", "gender", "student_number", "ad_code"]);

export function toSortDirection(value: unknown): "ASC" | "DESC" {
  return String(value ?? "asc").trim().toLowerCase() === "desc" ? "DESC" : "ASC";
}

export function parseSort(sortRaw: unknown): Array<[string, "ASC" | "DESC"]> {
  const raw = typeof sortRaw === "string" ? sortRaw.trim() : "";
  if (!raw) return [["id", "ASC"]];
  const parts = raw.split(":");
  const field = String(parts[0] ?? "").trim();
  if (!GRADUATE_SORT_FIELDS.has(field)) return [["id", "ASC"]];
  return [[field, toSortDirection(parts[1])]];
}

export function bad(res: Response, message: string) {
  return res.status(400).json({ ok: false, error: { message } });
}

export function toNullableNumber(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_GRADUATE_AGE = 23;
const MIN_GRADUATION_YEARS = 5;

export type RuleLang = "gr" | "en";
export type RuleViolationCode = "age_under_minimum" | "graduation_duration_under_minimum";
export type GraduateRuleViolation = { code: RuleViolationCode; message: string };

export function getRuleLang(raw: unknown): RuleLang {
  return typeof raw === "string" && String(raw).toLowerCase().startsWith("en") ? "en" : "gr";
}

export function getRuleViolationMessage(code: RuleViolationCode, lang: RuleLang) {
  if (lang === "en") {
    return code === "age_under_minimum" ? "Graduate age must be at least 23 years." : "Graduation time must be at least 5 years from entry year.";
  }
  return code === "age_under_minimum" ? "Η ηλικία αποφοίτησης πρέπει να είναι τουλάχιστον 23 έτη." : "Ο χρόνος αποφοίτησης πρέπει να είναι τουλάχιστον 5 έτη από το έτος εισαγωγής.";
}

export function parseYear(value: unknown) {
  const year = Number(String(value ?? "").slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

export function getGraduateRuleViolations(input: { entry_year: number | null; birth_date: string | null; graduation_date: string | null }, lang: RuleLang): GraduateRuleViolation[] {
  const violations: GraduateRuleViolation[] = [];
  const birthYear = parseYear(input.birth_date);
  const graduationYear = parseYear(input.graduation_date);
  if (birthYear && graduationYear && graduationYear - birthYear < MIN_GRADUATE_AGE) {
    violations.push({ code: "age_under_minimum", message: getRuleViolationMessage("age_under_minimum", lang) });
  }
  if (input.entry_year && graduationYear && graduationYear - input.entry_year < MIN_GRADUATION_YEARS) {
    violations.push({ code: "graduation_duration_under_minimum", message: getRuleViolationMessage("graduation_duration_under_minimum", lang) });
  }
  return violations;
}

export function buildImportViolationSummary(violations: GraduateRuleViolation[], lang: RuleLang) {
  const uniqueCodes = Array.from(new Set(violations.map((item) => item.code)));
  const reasons = uniqueCodes.map((code) => getRuleViolationMessage(code, lang));
  return lang === "en" ? `Record skipped due to study regulation rules: ${reasons.join(" ")}` : `Η εγγραφή παραλείφθηκε λόγω παραβίασης των προβλεπόμενων κανονισμών: ${reasons.join(" ")}`;
}

export function notFound(res: Response) {
  return res.status(404).json({ ok: false, error: { message: "Not found" } });
}

export function requireNumberField(res: Response, value: number, field: string) {
  return Number.isFinite(value) ? null : bad(res, `${field} is required (number)`);
}

export function requireNonEmptyString(res: Response, value: string, field: string) {
  return value ? null : bad(res, `${field} is required`);
}

export function requireDateOnly(res: Response, value: string, field: string) {
  return DATE_ONLY_RE.test(value) ? null : bad(res, `${field} must be YYYY-MM-DD`);
}

export function parseStoredGender(value: unknown) {
  const raw = String(value ?? "").trim();
  return raw === "M" || raw === "F" ? raw : null;
}

export function getGreeceRegionId(regionsById: Map<number, any>) {
  return Array.from(regionsById.values()).find((item: any) => normalizeRegionText(item?.name) === normalizeRegionText("Ελλάδα"))?.id ?? null;
}

export function trimNullableText(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

export function parseImportGender(value: unknown) {
  const normalized = normHeader(String(value ?? "").trim()).replace(/\./g, "");
  if (["m", "male", "man", "άνδρας", "ανδρας"].includes(normalized)) return "M";
  if (["f", "female", "woman", "γυναίκα", "γυναικα"].includes(normalized)) return "F";
  return null;
}

export function parseIds(idsRaw: unknown): number[] {
  const values = Array.isArray(idsRaw) ? idsRaw : typeof idsRaw === "string" ? idsRaw.split(",") : idsRaw == null ? [] : [idsRaw];
  return Array.from(new Set(values.map((value) => Number(String(value).trim())).filter((value) => Number.isInteger(value) && value > 0)));
}

export function csvEscape(value: unknown, delimiter: string) {
  const text = String(value ?? "");
  const escaped = text.replace(/"/g, '""');
  if (!escaped || /["\r\n\t;,]/.test(escaped) || escaped.includes(delimiter)) return `"${escaped}"`;
  return escaped;
}

export function wrapDelimitedDisplayValue(value: unknown) {
  const text = String(value ?? "");
  if (!text || text.length <= 24 || !/\s/.test(text)) return text;
  const words = text.split(/\s+/).filter(Boolean);
  const parts: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= 24) current = candidate;
    else {
      if (current) parts.push(current);
      current = word;
    }
  }
  if (current) parts.push(current);
  return parts.join("\n");
}

export function buildDelimitedText(rows: Array<Record<string, unknown>>, delimiter: string) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.map((header) => csvEscape(wrapDelimitedDisplayValue(header), delimiter)).join(delimiter)];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(wrapDelimitedDisplayValue(row[header]), delimiter)).join(delimiter));
  }
  return lines.join("\r\n");
}

export function buildUtf16CsvBuffer(text: string) {
  return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")]);
}

export function formatDateDisplay(value: unknown) {
  const normalized = toDateOnly(value);
  if (!normalized) return value == null ? "" : String(value);
  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
}

export function formatGenderValue(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["m", "male", "man", "άνδρας", "ανδρας"].includes(normalized)) return "Άνδρας";
  if (["f", "female", "woman", "γυναίκα", "γυναικα"].includes(normalized)) return "Γυναίκα";
  return String(value ?? "").trim();
}

export function formatCountryValue(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const normalized = normalizeRegionText(text);
  if (normalized === normalizeRegionText("Ελλάδα") || normalized === normalizeRegionText("Greece")) return "Ελλάδα";
  return text;
}

export function isGreeceCountryValue(value: unknown) {
  const normalized = normalizeRegionText(String(value ?? "").trim());
  return normalized === normalizeRegionText("Ελλάδα") || normalized === normalizeRegionText("Greece");
}

export function isAbroadOriginInput(countryName: unknown, countryRegionId: unknown, greeceRegionId: number | null, foreignCity: unknown) {
  const normalizedCountry = trimNullableText(countryName);
  if (normalizedCountry) return !isGreeceCountryValue(normalizedCountry);
  const countryId = toNullableNumber(countryRegionId);
  if (countryId != null && greeceRegionId != null && countryId !== greeceRegionId) return true;
  return !!trimNullableText(foreignCity);
}
