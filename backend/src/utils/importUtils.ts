export function normHeader(h: any): string {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[\-\/]+/g, "_");
}

export function toInt(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function toNumber(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function toDateOnly(v: any): string | null {
  if (!v && v !== 0) return null;
  // XLSX may give Date objects if cellDates:true
  if (v instanceof Date && !isNaN(v.getTime())) {
    const yyyy = v.getFullYear();
    const mm = String(v.getMonth() + 1).padStart(2, "0");
    const dd = String(v.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  const s = String(v).trim();
  if (!s) return null;

  // Try YYYY-MM-DD or DD-MM-YY/ DD-MM-YYYY
  const m1 = s.match(/^\d{4}-\d{2}-\d{2}$/);
  if (m1) return s;

  const m2 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m2) {
    const dd = String(m2[1]).padStart(2, "0");
    const mm = String(m2[2]).padStart(2, "0");
    let yy = m2[3];
    if (yy.length === 2) yy = "20" + yy;
    return `${yy}-${mm}-${dd}`;
  }

  return null;
}
