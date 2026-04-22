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


export function decodeTextBuffer(buffer: Buffer): string {
  if (!buffer.length) return "";

  if (buffer.length >= 2) {
    const b0 = buffer[0];
    const b1 = buffer[1];
    if (b0 === 0xff && b1 === 0xfe) return buffer.slice(2).toString("utf16le");
    if (b0 === 0xfe && b1 === 0xff) {
      const swapped = Buffer.allocUnsafe(buffer.length - 2);
      for (let i = 2; i < buffer.length; i += 2) {
        const target = i - 2;
        swapped[target] = buffer[i + 1] ?? 0;
        swapped[target + 1] = buffer[i] ?? 0;
      }
      return swapped.toString("utf16le");
    }
  }

  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.slice(3).toString("utf8");
  }

  let zeroEven = 0;
  let zeroOdd = 0;
  const sampleSize = Math.min(buffer.length, 4096);
  for (let i = 0; i < sampleSize; i += 1) {
    if (buffer[i] !== 0) continue;
    if (i % 2 === 0) zeroEven += 1;
    else zeroOdd += 1;
  }

  if (zeroOdd > sampleSize * 0.1 || zeroEven > sampleSize * 0.1) {
    return buffer.toString("utf16le");
  }

  return buffer.toString("utf8");
}

export function parseDelimitedTextRows(text: string): string[][] {
  const input = String(text ?? "").replace(/^\ufeff/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!input.trim()) return [];

  const firstLine = input.split("\n", 1)[0] ?? "";
  const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };

  const pushRow = () => {
    pushCell();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (char === '"') {
      const next = input[i + 1];
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === delimiter) {
      pushCell();
      continue;
    }

    if (!inQuotes && char === "\n") {
      pushRow();
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0 || input.endsWith(delimiter) || input.endsWith("\n")) {
    pushRow();
  }

  return rows.filter((current, index, all) => {
    if (index < all.length - 1) return true;
    return current.some((value) => String(value ?? "").trim() !== "");
  });
}
