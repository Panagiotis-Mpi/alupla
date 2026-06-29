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
