const GREECE_TIME_ZONE = "Europe/Athens";

function dateTimePartMap(date: Date) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: GREECE_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

function exportTimestamp(date = new Date()) {
  const parts = dateTimePartMap(date);
  return `${parts.year}-${parts.month}-${parts.day}-${parts.hour}-${parts.minute}-${parts.second}`;
}

function exportFilenamePart(value: unknown) {
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
