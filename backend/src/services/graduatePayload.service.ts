import {
  DATE_ONLY_RE,
  parseStoredGender,
} from "../controllers/graduates.helpers";

export type ManualGraduateValidationInput = {
  entry_year: number;
  birth_date: string;
  graduation_date: string;
  oath_date: string;
  degree_grade: number;
};

export type CreateGraduateValues = {
  ad_code_in: string;
  last_name: string;
  first_name: string;
  father_name: string;
  student_number: string;
  gender: string;
  study_program_id: number;
  entry_year: number;
  degree_grade: number;
  graduation_date: string;
  oath_date: string;
  birth_date: string;
};

function parsedDate(value: unknown) {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? null : date;
}

function ageLimitDate(birthDate: Date, years: number) {
  const date = new Date(birthDate);
  date.setFullYear(date.getFullYear() + years);
  return date;
}

export function getManualGraduateValidationMessage(
  input: ManualGraduateValidationInput,
) {
  const birthYear = Number(String(input.birth_date ?? "").slice(0, 4));
  const birthDate = parsedDate(input.birth_date);
  const graduationDate = parsedDate(input.graduation_date);
  const oathDate = parsedDate(input.oath_date);

  if (
    Number.isFinite(input.entry_year) &&
    Number.isFinite(birthYear) &&
    input.entry_year - birthYear < 18
  )
    return "Ο απόφοιτος πρέπει να είναι τουλάχιστον 18 ετών στο έτος εισαγωγής.";
  if (
    !Number.isFinite(input.degree_grade) ||
    input.degree_grade < 5 ||
    input.degree_grade > 10
  )
    return "Ο βαθμός πτυχίου πρέπει να είναι από 5 έως 10.";
  if (
    birthDate &&
    graduationDate &&
    graduationDate < ageLimitDate(birthDate, 23)
  )
    return "Ο απόφοιτος πρέπει να είναι τουλάχιστον 23 ετών στη λήψη διπλώματος.";
  if (birthDate && oathDate && oathDate < ageLimitDate(birthDate, 23))
    return "Ο απόφοιτος πρέπει να είναι τουλάχιστον 23 ετών στην ορκωμοσία.";
  return null;
}

export function readCreateGraduateValues(
  body: Record<string, any>,
): CreateGraduateValues {
  return {
    ad_code_in: String(body.ad_code ?? "").trim(),
    last_name: String(body.last_name ?? "").trim(),
    first_name: String(body.first_name ?? "").trim(),
    father_name: String(body.father_name ?? "").trim(),
    student_number: String(body.student_number ?? "").trim(),
    gender: String(body.gender ?? "").trim(),
    study_program_id: Number(body.study_program_id),
    entry_year: Number(body.entry_year),
    degree_grade: Number(body.degree_grade),
    graduation_date: String(body.graduation_date ?? "").trim(),
    oath_date: String(body.oath_date ?? "").trim(),
    birth_date: String(body.birth_date ?? "").trim(),
  };
}

export function getGraduateBasePayload(values: CreateGraduateValues) {
  return {
    ad_code: values.ad_code_in || `AD-${values.student_number}`,
    last_name: values.last_name,
    first_name: values.first_name,
    father_name: values.father_name,
    degree_grade: values.degree_grade,
    graduation_date: values.graduation_date,
    oath_date: values.oath_date,
    entry_year: values.entry_year,
    student_number: values.student_number,
    birth_date: values.birth_date,
    gender: values.gender,
    study_program_id: values.study_program_id,
  };
}

export function applyGraduateScalarPatch(item: any, body: Record<string, any>) {
  const setIf = (key: string, fn?: (v: any) => any) => {
    if (body[key] !== undefined) item[key] = fn ? fn(body[key]) : body[key];
  };

  setIf("last_name", (v) => String(v ?? "").trim());
  setIf("first_name", (v) => String(v ?? "").trim());
  setIf("father_name", (v) => String(v ?? "").trim());
  setIf("ad_code", (v) => String(v ?? "").trim());
  setIf("student_number", (v) => String(v ?? "").trim());
  setIf("degree_grade", (v) => (v === "" ? NaN : Number(v)));
  setIf("graduation_date", (v) => String(v ?? "").trim());
  setIf("oath_date", (v) => String(v ?? "").trim());
  setIf("entry_year", (v) => (v === "" ? NaN : Number(v)));
  setIf("birth_date", (v) => String(v ?? "").trim());
}

export function validateGraduateReadyForSave(item: any) {
  if (!String(item.ad_code ?? "").trim()) return "ad_code cannot be empty";
  if (!String(item.last_name ?? "").trim()) return "last_name cannot be empty";
  if (!String(item.first_name ?? "").trim())
    return "first_name cannot be empty";
  if (!String(item.father_name ?? "").trim())
    return "father_name cannot be empty";
  if (!String(item.student_number ?? "").trim())
    return "student_number cannot be empty";
  if (!parseStoredGender(item.gender)) return "gender must be 'M' or 'F'";
  if (!Number.isFinite(Number(item.entry_year)))
    return "entry_year must be a number";
  if (!Number.isFinite(Number(item.degree_grade)))
    return "degree_grade must be a number";
  if (!Number.isFinite(Number(item.study_program_id)))
    return "study_program_id must be a number";
  if ("origin_location_id" in item && !Number.isFinite(Number(item.origin_location_id)))
    return "origin_location_id must be a number";
  if (!DATE_ONLY_RE.test(String(item.graduation_date ?? "")))
    return "graduation_date must be YYYY-MM-DD";
  if (!DATE_ONLY_RE.test(String(item.oath_date ?? "")))
    return "oath_date must be YYYY-MM-DD";
  if (!DATE_ONLY_RE.test(String(item.birth_date ?? "")))
    return "birth_date must be YYYY-MM-DD";
  return getManualGraduateValidationMessage({
    entry_year: Number(item.entry_year),
    birth_date: String(item.birth_date ?? ""),
    graduation_date: String(item.graduation_date ?? ""),
    oath_date: String(item.oath_date ?? ""),
    degree_grade: Number(item.degree_grade),
  });
}

const graduateLoggedFields = [
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
  "study_program_id",
  "origin_location_id",
];

const graduateNumericLogFields = new Set([
  "entry_year",
  "degree_grade",
  "study_program_id",
  "origin_location_id",
]);

const graduateDateLogFields = new Set([
  "birth_date",
  "graduation_date",
  "oath_date",
]);

function dateOnlyLogValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime()))
    return value.toISOString().slice(0, 10);
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, 10);
}

function graduateLogValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (graduateDateLogFields.has(field)) return dateOnlyLogValue(value);
  if (graduateNumericLogFields.has(field)) {
    const num = Number(value);
    return Number.isFinite(num) ? num : String(value ?? "").trim();
  }
  return String(value ?? "").trim();
}

export function getGraduateLogSnapshot(values: Record<string, unknown>) {
  return Object.fromEntries(
    graduateLoggedFields.map((field) => [
      field,
      graduateLogValue(field, values[field]),
    ]),
  );
}

export function getChangedGraduateFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  return graduateLoggedFields.filter((field) => before[field] !== after[field]);
}
