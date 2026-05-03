const FORMULA_LIKE_RE = /^[\s\t\r\n]*[=+\-@]/;

export function sanitizeExportCell(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return FORMULA_LIKE_RE.test(value) ? `'${value}` : value;
}

export function sanitizeExportRow<T extends Record<string, unknown>>(row: T): T {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, sanitizeExportCell(value)])) as T;
}

export function sanitizeExportRows<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map((row) => sanitizeExportRow(row));
}
