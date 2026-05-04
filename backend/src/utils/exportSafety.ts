// Προστατεύει CSV/XLSX exports από κελιά που θα μπορούσαν να εκτελεστούν σαν formulas.
const FORMULA_LIKE_RE = /^[\s\t\r\n]*[=+\-@]/;

// Κάνει ασφαλή ένα κελί export για να μη θεωρηθεί formula.
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
