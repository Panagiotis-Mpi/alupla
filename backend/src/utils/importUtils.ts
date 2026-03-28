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

function padDatePart(value: number | string) {
  return String(value).padStart(2, "0");
}

function buildDateOnly(year: number | string, month: number | string, day: number | string) {
  const yyyy = String(year).padStart(4, "0");
  const mm = padDatePart(month);
  const dd = padDatePart(day);
  const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getUTCFullYear() !== Number(yyyy) || date.getUTCMonth() + 1 !== Number(mm) || date.getUTCDate() !== Number(dd)) return null;
  return `${yyyy}-${mm}-${dd}`;
}

function fromExcelSerial(value: number) {
  if (!Number.isFinite(value)) return null;
  const base = Date.UTC(1899, 11, 30);
  const millis = Math.round(value * 86400000);
  const date = new Date(base + millis);
  if (Number.isNaN(date.getTime())) return null;
  return buildDateOnly(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function toDateOnly(v: any): string | null {
  if (!v && v !== 0) return null;
  if (v instanceof Date && !isNaN(v.getTime())) {
    return buildDateOnly(v.getFullYear(), v.getMonth() + 1, v.getDate());
  }
  if (typeof v === "number") {
    return fromExcelSerial(v);
  }

  const s = String(v).trim();
  if (!s) return null;

  if (/^\d{5,}(?:\.\d+)?$/.test(s)) {
    return fromExcelSerial(Number(s));
  }

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return buildDateOnly(iso[1], iso[2], iso[3]);
  }

  const dayFirst = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dayFirst) {
    let year = dayFirst[3];
    if (year.length === 2) {
      year = Number(year) >= 50 ? `19${year}` : `20${year}`;
    }
    return buildDateOnly(year, dayFirst[2], dayFirst[1]);
  }

  return null;
}
