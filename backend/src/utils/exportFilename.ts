export function exportTimestamp(date = new Date()) {
  return date.toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

export function exportFilenamePart(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function buildExportFilename(
  section: string,
  parts: unknown[],
  extension: string,
  options?: { timestamp?: boolean | string },
) {
  const ext = exportFilenamePart(extension).replace(/^_+|_+$/g, "") || "dat";
  const timestamp = options?.timestamp === false ? [] : [typeof options?.timestamp === "string" ? options.timestamp : exportTimestamp()];
  const filenameParts = ["alupla", section, ...parts, ...timestamp]
    .map(exportFilenamePart)
    .filter(Boolean);
  return `${filenameParts.join("_")}.${ext}`;
}

export function yearRangeFilenamePart(from?: string | number | null, to?: string | number | null) {
  const fromText = String(from ?? "").trim();
  const toText = String(to ?? "").trim();
  if (!fromText || !toText) return "all_years";
  const left = Number(fromText);
  const right = Number(toText);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return "all_years";
  const start = Math.min(left, right);
  const end = Math.max(left, right);
  return start === end ? `year_${start}` : `years_${start}-${end}`;
}
