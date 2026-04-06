import {
  DATE_ONLY_RE,
  getGraduateRuleViolations,
  parseStoredGender,
  toNullableNumber,
} from "./graduates.helpers";

export type GraduateEditable = Record<string, any>;

export type CreateGraduateInput = {
  ad_code: string;
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

export function readCreateGraduateInput(body: Record<string, unknown>): CreateGraduateInput {
  return {
    ad_code: String(body.ad_code ?? "").trim(),
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

export function validateCreateGraduateInput(input: CreateGraduateInput) {
  const requiredTextFields: Array<keyof Pick<CreateGraduateInput, "last_name" | "first_name" | "father_name" | "student_number">> = [
    "last_name",
    "first_name",
    "father_name",
    "student_number",
  ];

  for (const field of requiredTextFields) {
    if (!input[field]) return `${field} is required`;
  }

  if (!parseStoredGender(input.gender)) {
    return "gender must be 'M' or 'F'";
  }

  const requiredNumberFields: Array<keyof Pick<CreateGraduateInput, "study_program_id" | "entry_year" | "degree_grade">> = [
    "study_program_id",
    "entry_year",
    "degree_grade",
  ];

  for (const field of requiredNumberFields) {
    if (!Number.isFinite(input[field])) return `${field} is required (number)`;
  }

  const dateFields: Array<keyof Pick<CreateGraduateInput, "graduation_date" | "oath_date" | "birth_date">> = [
    "graduation_date",
    "oath_date",
    "birth_date",
  ];

  for (const field of dateFields) {
    if (!DATE_ONLY_RE.test(input[field])) return `${field} must be YYYY-MM-DD`;
  }

  const ruleViolation = getGraduateRuleViolations({
    entry_year: input.entry_year,
    birth_date: input.birth_date,
    graduation_date: input.graduation_date,
  }, "en")[0];

  return ruleViolation?.message ?? null;
}

export function applyGraduateScalarPatch(item: GraduateEditable, body: Record<string, unknown>) {
  const scalarPatches: Array<[string, (value: unknown) => unknown]> = [
    ["last_name", (value) => String(value ?? "").trim()],
    ["first_name", (value) => String(value ?? "").trim()],
    ["father_name", (value) => String(value ?? "").trim()],
    ["ad_code", (value) => String(value ?? "").trim()],
    ["student_number", (value) => String(value ?? "").trim()],
    ["degree_grade", (value) => (value === "" ? NaN : Number(value))],
    ["graduation_date", (value) => String(value ?? "").trim()],
    ["oath_date", (value) => String(value ?? "").trim()],
    ["entry_year", (value) => (value === "" ? NaN : Number(value))],
    ["birth_date", (value) => String(value ?? "").trim()],
  ];

  for (const [field, transform] of scalarPatches) {
    if (body[field] !== undefined) {
      item[field] = transform(body[field]);
    }
  }
}

export function readProgramDirectionId(raw: unknown) {
  return toNullableNumber(raw);
}

export function validateStoredGraduate(item: GraduateEditable) {
  const requiredTextFields = ["ad_code", "last_name", "first_name", "father_name", "student_number"] as const;
  for (const field of requiredTextFields) {
    if (!String(item[field] ?? "").trim()) return `${field} cannot be empty`;
  }

  if (!Number.isFinite(Number(item.entry_year))) return "entry_year must be a number";
  if (!Number.isFinite(Number(item.degree_grade))) return "degree_grade must be a number";

  const dateFields = ["graduation_date", "oath_date", "birth_date"] as const;
  for (const field of dateFields) {
    if (!DATE_ONLY_RE.test(String(item[field] ?? ""))) return `${field} must be YYYY-MM-DD`;
  }

  const ruleViolation = getGraduateRuleViolations({
    entry_year: Number(item.entry_year),
    birth_date: String(item.birth_date ?? ""),
    graduation_date: String(item.graduation_date ?? ""),
  }, "en")[0];

  return ruleViolation?.message ?? null;
}
