import type { Response } from "express";
import * as XLSX from "xlsx";
import { normHeader, toDateOnly } from "../utils/importUtils";
import { normalizeRegionText } from "../utils/regionText";
import { sanitizeExportCell } from "../utils/exportSafety";

// Κοινά βοηθητικά για exports, imports, validation και μορφοποίηση δεδομένων αποφοίτων.
export type ExportLang = "gr" | "en";
export type GraduateFileFormat = "xlsx" | "csv";

export function getExportLang(raw: unknown): ExportLang {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value.startsWith("en")) return "en";
  if (value.startsWith("gr") || value.startsWith("el")) return "gr";
  return "gr";
}

export function getGraduateFileFormat(raw: unknown): GraduateFileFormat {
  return String(raw ?? "").trim().toLowerCase() === "csv" ? "csv" : "xlsx";
}

// Ρυθμίζει βασική εμφάνιση Excel export χωρίς να αλλάζει τα δεδομένα.
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

// Κεντρικό σημείο για τα labels στηλών σε ελληνικά/αγγλικά.
export function getColumnLabels(lang: ExportLang) {
  return lang === "en"
    ? { ad_code: "Diploma number", student_number: "Student number", last_name: "Last name", first_name: "First name", father_name: "Father name", gender: "Gender", entry_year: "Entry year", birth_date: "Birth date", degree_grade: "Degree grade", graduation_date: "Graduation date", oath_date: "Oath date", study_program: "Study program", origin_country: "Country", origin_region: "Region", origin_nomos: "Regional unit", origin_municipality: "City" } as const
    : { ad_code: "Αριθμός διπλώματος", student_number: "Αριθμός μητρώου", last_name: "Επώνυμο", first_name: "Όνομα", father_name: "Πατρώνυμο", gender: "Φύλο", entry_year: "Έτος εισαγωγής", birth_date: "Ημερομηνία γέννησης", degree_grade: "Βαθμός πτυχίου", graduation_date: "Ημερομηνία λήψης διπλώματος", oath_date: "Ημερομηνία ορκωμοσίας", study_program: "Πρόγραμμα σπουδών", origin_country: "Χώρα", origin_region: "Περιφέρεια", origin_nomos: "Νομός", origin_municipality: "Πόλη" } as const;
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
  "origin_country",
  "origin_region",
  "origin_nomos",
  "origin_municipality",
] as const;

export function getStrictTemplateHeaderRows(lang: ExportLang) {
  const labels = getColumnLabels(lang);
  return GRADUATES_COLUMN_KEYS.map((key) => labels[key]);
}

// Το import δέχεται μόνο το επίσημο template, με ίδια σειρά στηλών.
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


const GRADUATE_SORT_FIELDS = new Set(["id", "last_name", "first_name", "entry_year", "graduation_date", "oath_date", "degree_grade", "birth_date", "study_program_id", "origin_location_id", "origin_region_id", "origin_city_region_id", "origin_country_region_id", "gender", "student_number", "ad_code"]);
const GRADUATE_SORT_ALIASES: Record<string, string> = { origin_region_id: "origin_location_id", origin_city_region_id: "origin_location_id", origin_country_region_id: "origin_location_id" };

export function toSortDirection(value: unknown): "ASC" | "DESC" {
  return String(value ?? "asc").trim().toLowerCase() === "desc" ? "DESC" : "ASC";
}

// Επιτρέπει ταξινόμηση μόνο σε γνωστά πεδία, ώστε να αποφεύγονται άκυρα sort params.
export function parseSort(sortRaw: unknown): Array<[string, "ASC" | "DESC"]> {
  const raw = typeof sortRaw === "string" ? sortRaw.trim() : "";
  if (!raw) return [["id", "ASC"]];
  const parts = raw.split(":");
  const field = String(parts[0] ?? "").trim();
  if (!GRADUATE_SORT_FIELDS.has(field)) return [["id", "ASC"]];
  return [[GRADUATE_SORT_ALIASES[field] || field, toSortDirection(parts[1])]];
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
const MIN_ENTRY_AGE = 18;
const MIN_GRADUATE_AGE = 23;
const MIN_GRADUATION_YEARS = 5;
export const MIN_DEGREE_GRADE = 5;
export const MAX_DEGREE_GRADE = 10;

export type RuleLang = "gr" | "en";
export type RuleViolationCode = "entry_age_under_minimum" | "age_under_minimum" | "graduation_duration_under_minimum" | "degree_grade_out_of_range" | "oath_not_after_graduation";
export type GraduateRuleViolation = { code: RuleViolationCode; message: string };

export function getRuleLang(raw: unknown): RuleLang {
  return typeof raw === "string" && String(raw).toLowerCase().startsWith("en") ? "en" : "gr";
}

export function getRuleViolationMessage(code: RuleViolationCode, lang: RuleLang) {
  if (lang === "en") {
    if (code === "entry_age_under_minimum") return "Graduate age must be at least 18 years in the entry year.";
    if (code === "age_under_minimum") return "Graduate age must be at least 23 years.";
    if (code === "degree_grade_out_of_range") return "Degree grade must be from 5 to 10.";
    if (code === "oath_not_after_graduation") return "Oath date must be after the diploma award date.";
    return "Study duration must be at least 5 years from entry year.";
  }
  if (code === "entry_age_under_minimum") return "Ο απόφοιτος πρέπει να είναι τουλάχιστον 18 ετών στο έτος εισαγωγής.";
  if (code === "age_under_minimum") return "Η ηλικία αποφοίτησης πρέπει να είναι τουλάχιστον 23 έτη.";
  if (code === "degree_grade_out_of_range") return "Ο βαθμός πτυχίου πρέπει να είναι από 5 έως 10.";
  if (code === "oath_not_after_graduation") return "Η ημερομηνία ορκωμοσίας πρέπει να είναι μετά την ημερομηνία λήψης διπλώματος.";
  return "Η διάρκεια σπουδών πρέπει να είναι τουλάχιστον 5 έτη από το έτος εισαγωγής.";
}

function parseRuleDate(value: unknown) {
  const text = String(value ?? "").trim();
  if (!DATE_ONLY_RE.test(text)) return null;
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return date;
}

function addRuleYears(date: Date, years: number) {
  const year = date.getUTCFullYear() + years;
  const month = date.getUTCMonth();
  const day = Math.min(
    date.getUTCDate(),
    new Date(Date.UTC(year, month + 1, 0)).getUTCDate(),
  );
  return new Date(Date.UTC(year, month, day));
}

export function isValidDateOnly(value: unknown) {
  return parseRuleDate(value) !== null;
}

// Κανόνες λογικής εγκυρότητας για ηλικία και ελάχιστη διάρκεια σπουδών.
export function getGraduateRuleViolations(input: { entry_year: number | null; birth_date: string | null; graduation_date: string | null; oath_date?: string | null; degree_grade?: number | null }, lang: RuleLang): GraduateRuleViolation[] {
  const violations: GraduateRuleViolation[] = [];
  const birthDate = parseRuleDate(input.birth_date);
  const graduationDate = parseRuleDate(input.graduation_date);
  const oathDate = parseRuleDate(input.oath_date);
  const birthYear = birthDate?.getUTCFullYear() ?? null;
  const graduationYear = graduationDate?.getUTCFullYear() ?? null;
  const minimumAgeDate = birthDate ? addRuleYears(birthDate, MIN_GRADUATE_AGE) : null;
  const degreeGrade = Number(input.degree_grade);
  if (input.entry_year && birthYear && input.entry_year - birthYear < MIN_ENTRY_AGE) {
    violations.push({ code: "entry_age_under_minimum", message: getRuleViolationMessage("entry_age_under_minimum", lang) });
  }
  if (input.degree_grade !== undefined && (!Number.isFinite(degreeGrade) || degreeGrade < MIN_DEGREE_GRADE || degreeGrade > MAX_DEGREE_GRADE)) {
    violations.push({ code: "degree_grade_out_of_range", message: getRuleViolationMessage("degree_grade_out_of_range", lang) });
  }
  if (minimumAgeDate && ((graduationDate && graduationDate < minimumAgeDate) || (oathDate && oathDate < minimumAgeDate))) {
    violations.push({ code: "age_under_minimum", message: getRuleViolationMessage("age_under_minimum", lang) });
  }
  if (graduationDate && oathDate) {
    if (oathDate <= graduationDate) {
      violations.push({ code: "oath_not_after_graduation", message: getRuleViolationMessage("oath_not_after_graduation", lang) });
    }
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


export function requireNonEmptyString(res: Response, value: string, field: string) {
  return value ? null : bad(res, `${field} is required`);
}


export function parseStoredGender(value: unknown) {
  const raw = String(value ?? "").trim();
  return raw === "M" || raw === "F" ? raw : null;
}

export function getGreeceRegionId(regionsById: Map<number, any>) {
  return Array.from(regionsById.values()).find((item: any) => item?.type === "COUNTRY" && String(item?.code ?? "").toUpperCase() === "GR")?.id ?? null;
}

export function trimNullableText(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

// Μετατρέπει διαφορετικές τιμές φύλου από import σε M/F.
export function parseImportGender(value: unknown) {
  const normalized = normHeader(String(value ?? "").trim()).replace(/\./g, "");
  if (["m", "male", "man", "άνδρας", "ανδρας"].includes(normalized)) return "M";
  if (["f", "female", "woman", "γυναίκα", "γυναικα"].includes(normalized)) return "F";
  return null;
}

// Καθαρίζει ids από query params και κρατά μόνο θετικούς ακέραιους.
export function parseIds(idsRaw: unknown): number[] {
  const values = Array.isArray(idsRaw) ? idsRaw : typeof idsRaw === "string" ? idsRaw.split(",") : idsRaw == null ? [] : [idsRaw];
  return Array.from(new Set(values.map((value) => Number(String(value).trim())).filter((value) => Number.isInteger(value) && value > 0)));
}

// Κάνει safe escaping για CSV/TSV και περνά πρώτα από export safety.
export function csvEscape(value: unknown, delimiter: string) {
  const text = String(sanitizeExportCell(value) ?? "");
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

// UTF-16LE με BOM για σωστό άνοιγμα ελληνικών χαρακτήρων στο Excel.
export function buildUtf16CsvBuffer(text: string) {
  return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")]);
}

export function formatDateDisplay(value: unknown) {
  const normalized = toDateOnly(value);
  if (!normalized) return value == null ? "" : String(value);
  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
}

// Εμφανίζει το φύλο στη γλώσσα του export/list.
export function formatGenderValue(value: unknown, lang: ExportLang = "gr") {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["m", "male", "man", "άνδρας", "ανδρας"].includes(normalized)) return lang === "en" ? "Male" : "Άνδρας";
  if (["f", "female", "woman", "γυναίκα", "γυναικα"].includes(normalized)) return lang === "en" ? "Female" : "Γυναίκα";
  return String(value ?? "").trim();
}

export function formatCountryValue(value: unknown, lang: ExportLang = "gr") {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const normalized = normalizeRegionText(text);
  if (normalized === normalizeRegionText("Ελλάδα") || normalized === normalizeRegionText("Greece")) return lang === "en" ? "Greece" : "Ελλάδα";
  return text;
}

export function isGreeceCountryValue(value: unknown) {
  const normalized = normalizeRegionText(String(value ?? "").trim());
  return normalized === normalizeRegionText("Ελλάδα") || normalized === normalizeRegionText("Greece");
}

// Αποφασίζει αν η καταγωγή πρέπει να αντιμετωπιστεί ως εξωτερικό.
export function isAbroadOriginInput(countryName: unknown, countryRegionId: unknown, greeceRegionId: number | null, foreignCity: unknown) {
  const normalizedCountry = trimNullableText(countryName);
  if (normalizedCountry) return !isGreeceCountryValue(normalizedCountry);
  const countryId = toNullableNumber(countryRegionId);
  if (countryId != null && greeceRegionId != null && countryId !== greeceRegionId) return true;
  return !!trimNullableText(foreignCity);
}
