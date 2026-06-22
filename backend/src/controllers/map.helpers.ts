import type { Request } from "express";
import { Op } from "sequelize";
import { buildGraduateWhere } from "../utils/buildGraduateWhere";

export type AgeGroup = "23-26" | "27-30" | "31+";

type GraduateWhere = ReturnType<typeof buildGraduateWhere> & { [Op.and]?: unknown[] };

export function toInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function normalizeKey(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isGreeceOriginValue(value: unknown) {
  const normalized = normalizeKey(String(value ?? ""));
  return normalized === normalizeKey("Ελλάδα") || normalized === normalizeKey("Greece");
}

function parseDateValue(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function calculateAgeAtDate(birthValue: unknown, referenceValue: unknown): number | null {
  const birthDate = parseDateValue(birthValue);
  const referenceDate = parseDateValue(referenceValue);
  if (!birthDate || !referenceDate || referenceDate < birthDate) return null;
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

function ageGroupToRange(value: AgeGroup): [number, number | null] {
  if (value === "23-26") return [23, 26];
  if (value === "27-30") return [27, 30];
  return [31, null];
}

export function buildMapWhere(req: Request) {
  const graduationYear = toInt(req.query.graduation_year);
  const ageGroup = req.query.age_group as AgeGroup | undefined;
  const where = buildGraduateWhere(req.query as Record<string, unknown>) as GraduateWhere;
  const currentYear = new Date().getFullYear();
  const rawAnd = where[Op.and];
  const andParts: unknown[] = Array.isArray(rawAnd) ? [...rawAnd] : [];

  if (graduationYear) {
    andParts.push({ graduation_date: { [Op.between]: [`${graduationYear}-01-01`, `${graduationYear}-12-31`] } });
  }

  if (ageGroup) {
    const [minAge, maxAge] = ageGroupToRange(ageGroup);
    const minBirth = currentYear - (maxAge ?? 120);
    const maxBirth = currentYear - minAge;
    andParts.push({ birth_date: { [Op.between]: [`${minBirth}-01-01`, `${maxBirth}-12-31`] } });
  }

  if (andParts.length) where[Op.and] = andParts;
  return { where, currentYear };
}

export function pickTopName(counts: Map<number, number>, labels: Map<number, string>) {
  let topCount = 0;
  let topLabel = "";
  for (const [id, count] of counts.entries()) {
    const label = labels.get(id) || String(id);
    if (count > topCount || (count === topCount && label.localeCompare(topLabel, "el") < 0)) {
      topCount = count;
      topLabel = label;
    }
  }
  return topCount > 0 ? topLabel : null;
}
