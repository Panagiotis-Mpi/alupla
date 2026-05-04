// Helpers του χάρτη για φίλτρα, ηλικίες, Ελλάδα/εξωτερικό και επιλογή top ονομάτων.
import type { Request } from "express";
import type { Graduate } from "../models/Graduate";
import { Op } from "sequelize";
import { buildGraduateWhere } from "../utils/buildGraduateWhere";
import { Region } from "../models/Region";

export type AgeGroup = "23-26" | "27-30" | "31+";

type RegionNode = Pick<Region, "id" | "name" | "name_el" | "name_en" | "type" | "parent_id" | "latitude" | "longitude">;
type MapGraduateSource = Pick<Graduate, "origin_country" | "origin_foreign_city" | "origin_country_region_id">;
type GraduateWhere = ReturnType<typeof buildGraduateWhere> & { [Op.and]?: unknown[] };

// Φορτώνει regions που χρειάζονται για mapping χάρτη.
export async function loadRegions() {
  const regions = await Region.findAll({
    attributes: ["id", "name", "name_el", "name_en", "type", "parent_id", "latitude", "longitude"],
    order: [["name", "ASC"]],
  });

  const byId = new Map<number, RegionNode>();
  for (const region of regions) {
    byId.set(Number(region.id), region as RegionNode);
  }

  return {
    regions,
    findRegion(regionId: number | null | undefined) {
      return regionId ? byId.get(Number(regionId)) || null : null;
    },
    findPeriphery(regionId: number | null | undefined) {
      let current = regionId ? byId.get(Number(regionId)) || null : null;
      while (current) {
        if (String(current.type) === "PERIPHERY") return current;
        const parentId = Number(current.parent_id) || 0;
        current = parentId ? byId.get(parentId) || null : null;
      }
      return null;
    },
  };
}

// Μετατρέπει input σε αριθμό ή fallback.
export function toInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

// Καθαρίζει κείμενο ώστε να χρησιμοποιείται σαν σταθερό key.
export function normalizeKey(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Ελέγχει αν μία χώρα/τιμή σημαίνει Ελλάδα.
export function isGreeceOriginValue(value: unknown) {
  const normalized = normalizeKey(String(value ?? ""));
  return normalized === normalizeKey("Ελλάδα") || normalized === normalizeKey("Greece");
}

// Ελέγχει αν ο απόφοιτος μετράει στο ελληνικό scope χάρτη.
export function isGreekMapGraduate(graduate: MapGraduateSource) {
  const explicitCountry = String(graduate?.origin_country ?? "").trim();
  if (explicitCountry) return isGreeceOriginValue(explicitCountry);
  if (String(graduate?.origin_foreign_city ?? "").trim()) return false;
  return !!graduate?.origin_country_region_id;
}

// Ελέγχει αν ο απόφοιτος μετράει στο scope εξωτερικού.
export function isAbroadMapGraduate(graduate: MapGraduateSource) {
  const explicitCountry = String(graduate?.origin_country ?? "").trim();
  if (explicitCountry) return !isGreeceOriginValue(explicitCountry);
  if (String(graduate?.origin_foreign_city ?? "").trim()) return true;
  return false;
}

// Μετατρέπει τιμή ημερομηνίας σε Date για υπολογισμούς.
function parseDateValue(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

// Υπολογίζει ηλικία αποφοίτου τη μέρα αποφοίτησης.
export function calculateAgeAtDate(birthValue: unknown, referenceValue: unknown): number | null {
  const birthDate = parseDateValue(birthValue);
  const referenceDate = parseDateValue(referenceValue);
  if (!birthDate || !referenceDate || referenceDate < birthDate) return null;
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

// Μετατρέπει ηλικιακή ομάδα φίλτρου σε min/max ηλικία.
function ageGroupToRange(value: AgeGroup): [number, number | null] {
  if (value === "23-26") return [23, 26];
  if (value === "27-30") return [27, 30];
  return [31, null];
}

// Μετατρέπει φίλτρα χάρτη σε Sequelize where query.
export function buildMapWhere(req: Request) {
  const graduationYear = toInt(req.query.graduation_year);
  const ageGroup = (req.query.age_group as string | undefined) as AgeGroup | undefined;
  const where = buildGraduateWhere(req.query as Record<string, unknown>) as GraduateWhere;
  const currentYear = new Date().getFullYear();
  const rawAnd = where[Op.and];
  const andParts: unknown[] = Array.isArray(rawAnd) ? [...(rawAnd as unknown[])] : [];

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

// Διαλέγει το πιο συχνό όνομα από μετρητή εμφανίσεων.
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

