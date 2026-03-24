export function normalizeKey(value: string): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const REGION_ALIASES: Record<string, string[]> = {
  [normalizeKey("Στερεά Ελλάδα")]: ["Κεντρική Ελλάδα"],
  [normalizeKey("Κεντρική Ελλάδα")]: ["Στερεά Ελλάδα"],
  [normalizeKey("Ιόνιοι Νήσοι")]: ["Ιόνια Νησιά"],
  [normalizeKey("Ιόνια Νησιά")]: ["Ιόνιοι Νήσοι"],
};

export function regionKeys(name: string) {
  const base = normalizeKey(name);
  const aliases = REGION_ALIASES[base] || [];
  return [base, ...aliases.map(normalizeKey)];
}

export function regionMatches(left: string, right: string) {
  const leftKeys = new Set(regionKeys(left));
  return regionKeys(right).some((key) => leftKeys.has(key));
}
