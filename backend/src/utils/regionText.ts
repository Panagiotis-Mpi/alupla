export function normalizeRegionText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanRegionText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}
