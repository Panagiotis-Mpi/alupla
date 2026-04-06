import type { Request } from "express";
import { Op } from "sequelize";
import { buildGraduateWhere } from "../utils/buildGraduateWhere";

export type AgeGroup = "23-26" | "27-30" | "31+";

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

export function isGreekMapGraduate(graduate: any) {
  const explicitCountry = String(graduate?.origin_country ?? "").trim();
  if (explicitCountry) return isGreeceOriginValue(explicitCountry);
  if (String(graduate?.origin_foreign_city ?? "").trim()) return false;
  return !!graduate?.origin_country_region_id;
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
  const ageGroup = (req.query.age_group as string | undefined) as AgeGroup | undefined;
  const where: any = buildGraduateWhere(req.query as Record<string, unknown>);
  const currentYear = new Date().getFullYear();
  const andParts = Array.isArray(where[Op.and]) ? [...where[Op.and]] : [];

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
  let topId = 0;
  let topCount = 0;
  let topLabel = "";

  for (const [id, count] of counts.entries()) {
    const label = labels.get(id) || String(id);
    if (count > topCount || (count === topCount && label.localeCompare(topLabel, "el") < 0)) {
      topId = id;
      topCount = count;
      topLabel = label;
    }
  }

  return topCount > 0 ? topLabel : null;
}

export function collapseCountsByLabel(counts: Map<number, number>, labels: Map<number, string>) {
  const grouped = new Map<string, { id: number; label: string; count: number }>();

  for (const [id, count] of counts.entries()) {
    if (!count) continue;
    const label = labels.get(id) || String(id);
    const key = normalizeKey(label);
    const current = grouped.get(key);

    if (current) {
      current.count += count;
      if (label.localeCompare(current.label, "el") < 0) current.label = label;
      if (id < current.id) current.id = id;
      continue;
    }

    grouped.set(key, { id, label, count });
  }

  return Array.from(grouped.values()).sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return left.label.localeCompare(right.label, "el");
  });
}

function expandEntries(counts: Map<number, number>, labels: Map<number, string>, total: number) {
  return collapseCountsByLabel(counts, labels).map((entry) => ({
    id: entry.id,
    label: entry.label,
    count: entry.count,
    pct: total > 0 ? Math.round((entry.count / total) * 1000) / 10 : 0,
  }));
}

export function pickDirectionDisplay(counts: Map<number, number>, labels: Map<number, string>, total: number) {
  const entries = expandEntries(counts, labels, total);
  const top = entries[0] || null;
  return {
    label: top?.label || null,
    count: top?.count || 0,
    entries,
  };
}

export function matchesSelectedStudyProgram(
  graduateStudyProgramId: number,
  directionId: number,
  selectedStudyProgramId: number | null,
  directionProgramIds: Map<number, number>,
) {
  if (!selectedStudyProgramId) return true;
  if (graduateStudyProgramId === selectedStudyProgramId) return true;
  const directionProgramId = directionId ? (directionProgramIds.get(directionId) || 0) : 0;
  return directionProgramId === selectedStudyProgramId;
}

export function isDirectionAllowed(
  directionId: number,
  studyProgramId: number,
  selectedStudyProgramId: number | null,
  directionProgramIds: Map<number, number>,
) {
  if (!directionId) return false;
  if (!selectedStudyProgramId) return true;
  if (studyProgramId === selectedStudyProgramId) return true;
  return (directionProgramIds.get(directionId) || 0) === selectedStudyProgramId;
}
