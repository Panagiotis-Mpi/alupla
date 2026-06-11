// Φτιάχνει PDF export της λίστας αποφοίτων από το frontend.
import type { Graduate } from "../../lib/api";
import {
  getGraduateOriginCountryDisplay,
  getGraduateOriginMunicipalityDisplay,
  getGraduateOriginNomosDisplay,
  getGraduateOriginRegionDisplay,
} from "./shared";

type ExportLang = "gr" | "en";

type PdfRow = Record<string, string>;

const PAGE_WIDTH = 1684;
const PAGE_HEIGHT = 1191;
const PDF_PAGE_WIDTH = 1191;
const PDF_PAGE_HEIGHT = 842;
const MARGIN_X = 40;
const TABLE_TOP = 124;
const TABLE_BOTTOM = 44;
const CELL_PADDING_X = 6;
const CELL_PADDING_Y = 6;
const HEADER_FONT = '600 16px "Segoe UI", Arial, sans-serif';
const META_FONT = '13px "Segoe UI", Arial, sans-serif';
const TABLE_HEADER_FONT = '600 10px "Segoe UI", Arial, sans-serif';
const TABLE_FONT = '10px "Segoe UI", Arial, sans-serif';
const TABLE_HEADER_LINE_HEIGHT = 14;
const TABLE_LINE_HEIGHT = 13;
const COLUMN_WIDTHS = [42, 54, 78, 76, 78, 52, 50, 58, 58, 66, 66, 128, 92, 88, 84, 94];

function formatGenderValue(value: unknown, lang: ExportLang) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["m", "male", "man", "άνδρας", "ανδρας"].includes(normalized)) return lang === "en" ? "Male" : "Άνδρας";
  if (["f", "female", "woman", "γυναίκα", "γυναικα"].includes(normalized)) return lang === "en" ? "Female" : "Γυναίκα";
  return String(value ?? "").trim();
}

function formatDateValue(value: unknown) {
  const raw = value === null || value === undefined ? "" : String(value).trim();
  if (!raw) return "";

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return `${iso[3]}/${iso[2]}/${iso[1]}`;
  }

  const dayFirst = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dayFirst) {
    const day = String(dayFirst[1]).padStart(2, "0");
    const month = String(dayFirst[2]).padStart(2, "0");
    let year = dayFirst[3];
    if (year.length === 2) {
      year = Number(year) >= 50 ? `19${year}` : `20${year}`;
    }
    return `${day}/${month}/${year}`;
  }

  return raw;
}

function compareDiplomaNumber(a: Graduate, b: Graduate) {
  const left = String(a.ad_code ?? "").trim();
  const right = String(b.ad_code ?? "").trim();
  const result = left.localeCompare(right, "el", { numeric: true, sensitivity: "base" });
  if (result !== 0) return result;
  return String(a.student_number ?? "").localeCompare(String(b.student_number ?? ""), "el", { numeric: true, sensitivity: "base" });
}

function getLabels(lang: ExportLang) {
  if (lang === "en") {
    return {
      ad_code: "Diploma number",
      student_number: "Student number",
      last_name: "Last name",
      first_name: "First name",
      father_name: "Father name",
      gender: "Gender",
      entry_year: "Entry year",
      birth_date: "Birth date",
      degree_grade: "Degree grade",
      graduation_date: "Graduation date",
      oath_date: "Oath date",
      study_program: "Study program",
      origin_country: "Country",
      origin_region: "Region",
      origin_nomos: "Regional unit",
      origin_municipality: "City"
    } as const;
  }

  return {
    ad_code: "Αριθμός διπλώματος",
    student_number: "Αριθμός μητρώου",
    last_name: "Επώνυμο",
    first_name: "Όνομα",
    father_name: "Πατρώνυμο",
    gender: "Φύλο",
    entry_year: "Έτος εισαγωγής",
    birth_date: "Ημερομηνία γέννησης",
    degree_grade: "Βαθμός πτυχίου",
    graduation_date: "Ημερομηνία λήψης διπλώματος",
    oath_date: "Ημερομηνία ορκωμοσίας",
    study_program: "Πρόγραμμα σπουδών",
    origin_country: "Χώρα",
    origin_region: "Περιφέρεια",
    origin_nomos: "Νομός",
    origin_municipality: "Πόλη"
  } as const;
}

function buildRows(args: {
  items: Graduate[];
  lang: ExportLang;
  programNameById: Map<number, string>;
  regionNameById: Map<number, string>;
}) {
  const { items, lang, programNameById, regionNameById } = args;
  const labels = getLabels(lang);

  return [...items].sort(compareDiplomaNumber).map((item) => {
    const studyProgramName = programNameById.get(Number(item.study_program_id)) ?? "";
    const countryName = getGraduateOriginCountryDisplay(item, regionNameById, undefined, lang);
    const regionName = getGraduateOriginRegionDisplay(item, regionNameById, lang);
    const nomosName = getGraduateOriginNomosDisplay(item, regionNameById, lang);
    const municipalityName = getGraduateOriginMunicipalityDisplay(item, regionNameById, lang);

    return {
      [labels.ad_code]: item.ad_code ?? "",
      [labels.student_number]: item.student_number ?? "",
      [labels.last_name]: item.last_name ?? "",
      [labels.first_name]: item.first_name ?? "",
      [labels.father_name]: item.father_name ?? "",
      [labels.gender]: formatGenderValue(item.gender, lang),
      [labels.entry_year]: item.entry_year == null ? "" : String(item.entry_year),
      [labels.birth_date]: formatDateValue(item.birth_date),
      [labels.degree_grade]: item.degree_grade == null ? "" : String(item.degree_grade),
      [labels.graduation_date]: formatDateValue(item.graduation_date),
      [labels.oath_date]: formatDateValue(item.oath_date),
      [labels.study_program]: studyProgramName,
      [labels.origin_country]: countryName,
      [labels.origin_region]: regionName,
      [labels.origin_nomos]: nomosName,
      [labels.origin_municipality]: municipalityName
    } satisfies PdfRow;
  });
}

function createCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_WIDTH;
  canvas.height = PAGE_HEIGHT;
  return canvas;
}

function wrapText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, maxLines: number, lineHeight: number) {
  const words = String(value ?? "").split(/\s+/).filter(Boolean);
  if (!words.length) return [""];

  const lines: string[] = [];
  let current = "";

  const pushCurrent = () => {
    lines.push(current || "");
    current = "";
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      pushCurrent();
      if (lines.length === maxLines) break;
    }

    if (ctx.measureText(word).width <= maxWidth) {
      current = word;
      continue;
    }

    let chunk = "";
    for (const char of word) {
      const next = `${chunk}${char}`;
      if (ctx.measureText(next).width <= maxWidth) {
        chunk = next;
        continue;
      }
      if (chunk) {
        lines.push(chunk);
        if (lines.length === maxLines) break;
      }
      chunk = char;
    }
    if (lines.length === maxLines) break;
    current = chunk;
  }

  if (lines.length < maxLines && current) {
    pushCurrent();
  }

  if (lines.length > maxLines) {
    lines.length = maxLines;
  }

  if (lines.length === maxLines) {
    const last = lines[maxLines - 1] ?? "";
    if (ctx.measureText(last).width > maxWidth) {
      let trimmed = last;
      while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
        trimmed = trimmed.slice(0, -1);
      }
      lines[maxLines - 1] = `${trimmed}…`;
    }
  }

  return lines;
}

function getRowHeight(ctx: CanvasRenderingContext2D, values: string[], isHeader: boolean) {
  ctx.font = isHeader ? TABLE_HEADER_FONT : TABLE_FONT;
  const lineHeight = isHeader ? TABLE_HEADER_LINE_HEIGHT : TABLE_LINE_HEIGHT;
  const maxLines = isHeader ? 3 : 3;

  let lines = 1;
  values.forEach((value, index) => {
    const wrapped = wrapText(ctx, value, COLUMN_WIDTHS[index] - CELL_PADDING_X * 2, maxLines, lineHeight);
    lines = Math.max(lines, wrapped.length);
  });

  return Math.max(lineHeight + CELL_PADDING_Y * 2, lines * lineHeight + CELL_PADDING_Y * 2);
}

function drawWrappedCell(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, width: number, height: number, isHeader: boolean) {
  ctx.font = isHeader ? TABLE_HEADER_FONT : TABLE_FONT;
  ctx.fillStyle = "#111827";
  const lineHeight = isHeader ? TABLE_HEADER_LINE_HEIGHT : TABLE_LINE_HEIGHT;
  const maxLines = isHeader ? 3 : 3;
  const lines = wrapText(ctx, value, width - CELL_PADDING_X * 2, maxLines, lineHeight);
  const textTop = y + CELL_PADDING_Y + 1;
  lines.forEach((line, index) => {
    ctx.fillText(line, x + CELL_PADDING_X, textTop + lineHeight * (index + 1) - 3, width - CELL_PADDING_X * 2);
  });
}

function drawPage(args: {
  pageRows: PdfRow[];
  pageIndex: number;
  pageCount: number;
  title: string;
  meta: string;
  headers: string[];
}) {
  const { pageRows, pageIndex, pageCount, title, meta, headers } = args;
  const canvas = createCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

  ctx.fillStyle = "#111827";
  ctx.font = HEADER_FONT;
  ctx.fillText(title, MARGIN_X, 56);

  ctx.fillStyle = "#4b5563";
  ctx.font = META_FONT;
  ctx.fillText(meta, MARGIN_X, 84);
  const pageText = `${pageIndex + 1}/${pageCount}`;
  const pageTextWidth = ctx.measureText(pageText).width;
  ctx.fillText(pageText, PAGE_WIDTH - MARGIN_X - pageTextWidth, 84);

  let currentY = TABLE_TOP;
  const headerHeight = getRowHeight(ctx, headers, true);

  ctx.fillStyle = "#f3f4f6";
  ctx.fillRect(MARGIN_X, currentY, COLUMN_WIDTHS.reduce((sum, value) => sum + value, 0), headerHeight);

  let currentX = MARGIN_X;
  headers.forEach((header, index) => {
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 1;
    ctx.strokeRect(currentX, currentY, COLUMN_WIDTHS[index], headerHeight);
    drawWrappedCell(ctx, header, currentX, currentY, COLUMN_WIDTHS[index], headerHeight, true);
    currentX += COLUMN_WIDTHS[index];
  });

  currentY += headerHeight;

  pageRows.forEach((row, rowIndex) => {
    const values = headers.map((header) => String(row[header] ?? ""));
    const rowHeight = getRowHeight(ctx, values, false);
    let x = MARGIN_X;
    if (rowIndex % 2 === 1) {
      ctx.fillStyle = "#fafafa";
      ctx.fillRect(MARGIN_X, currentY, COLUMN_WIDTHS.reduce((sum, value) => sum + value, 0), rowHeight);
    }
    values.forEach((value, index) => {
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, currentY, COLUMN_WIDTHS[index], rowHeight);
      drawWrappedCell(ctx, value, x, currentY, COLUMN_WIDTHS[index], rowHeight, false);
      x += COLUMN_WIDTHS[index];
    });
    currentY += rowHeight;
  });

  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 1;
  ctx.strokeRect(MARGIN_X, TABLE_TOP, COLUMN_WIDTHS.reduce((sum, value) => sum + value, 0), currentY - TABLE_TOP);

  return canvas;
}

function splitRowsIntoPages(rows: PdfRow[], headers: string[]) {
  const canvas = createCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");

  const pages: PdfRow[][] = [];
  let currentPage: PdfRow[] = [];
  let usedHeight = TABLE_TOP;
  const headerHeight = getRowHeight(ctx, headers, true);
  usedHeight += headerHeight;

  for (const row of rows) {
    const values = headers.map((header) => String(row[header] ?? ""));
    const rowHeight = getRowHeight(ctx, values, false);
    if (currentPage.length > 0 && usedHeight + rowHeight > PAGE_HEIGHT - TABLE_BOTTOM) {
      pages.push(currentPage);
      currentPage = [];
      usedHeight = TABLE_TOP + headerHeight;
    }
    currentPage.push(row);
    usedHeight += rowHeight;
  }

  if (!currentPage.length) {
    currentPage.push(Object.fromEntries(headers.map((header) => [header, "-"])));
  }

  pages.push(currentPage);
  return pages;
}

function dataUrlToUint8Array(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function createPdfFromJpegs(images: Uint8Array[]) {
  const encoder = new TextEncoder();
  const parts: BlobPart[] = [];
  let offset = 0;
  const offsets: number[] = [0];

  const pushText = (value: string) => {
    const bytes = encoder.encode(value);
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    parts.push(copy);
    offset += bytes.length;
  };

  const pushBinary = (value: Uint8Array) => {
    const copy = new Uint8Array(value.length);
    copy.set(value);
    parts.push(copy);
    offset += value.length;
  };

  const objectCount = 2 + images.length * 3;
  const pageIds = images.map((_, index) => 3 + index * 3);
  const contentIds = images.map((_, index) => 4 + index * 3);
  const imageIds = images.map((_, index) => 5 + index * 3);

  pushText("%PDF-1.4\n%\xC3\xA2\xC3\xA3\xC3\x8F\xC3\x93\n");

  offsets[1] = offset;
  pushText("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  offsets[2] = offset;
  pushText(`2 0 obj\n<< /Type /Pages /Count ${images.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>\nendobj\n`);

  images.forEach((imageBytes, index) => {
    const pageId = pageIds[index];
    const contentId = contentIds[index];
    const imageId = imageIds[index];
    const imageName = `Im${index + 1}`;
    const content = `q\n${PDF_PAGE_WIDTH} 0 0 ${PDF_PAGE_HEIGHT} 0 0 cm\n/${imageName} Do\nQ\n`;
    const contentBytes = encoder.encode(content);

    offsets[pageId] = offset;
    pushText(`${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /XObject << /${imageName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`);

    offsets[contentId] = offset;
    pushText(`${contentId} 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
    pushBinary(contentBytes);
    pushText(`\nendstream\nendobj\n`);

    offsets[imageId] = offset;
    pushText(`${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${PAGE_WIDTH} /Height ${PAGE_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`);
    pushBinary(imageBytes);
    pushText(`\nendstream\nendobj\n`);
  });

  const xrefOffset = offset;
  pushText(`xref\n0 ${objectCount + 1}\n`);
  pushText("0000000000 65535 f \n");
  for (let index = 1; index <= objectCount; index += 1) {
    pushText(`${String(offsets[index] ?? 0).padStart(10, "0")} 00000 n \n`);
  }
  pushText(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob(parts, { type: "application/pdf" });
}

// Δημιουργεί PDF από τα δεδομένα της λίστας και ενημερώνει το backend για log.
export async function exportGraduatesPdf(args: {
  items: Graduate[];
  lang: ExportLang;
  programNameById: Map<number, string>;
  regionNameById: Map<number, string>;
}) {
  const { items, lang, programNameById, regionNameById } = args;
  const title = lang === "en" ? "Graduates" : "Απόφοιτοι";
  const meta = lang === "en"
    ? `Export date: ${new Date().toLocaleString("en-GB")} • Records: ${items.length}`
    : `Ημερομηνία εξαγωγής: ${new Date().toLocaleString("el-GR")} • Εγγραφές: ${items.length}`;

  const rows = buildRows({ items, lang, programNameById, regionNameById });
  const headers = Object.values(getLabels(lang));
  const pages = splitRowsIntoPages(rows, headers);
  const images = pages.map((pageRows, index) => dataUrlToUint8Array(drawPage({ pageRows, pageIndex: index, pageCount: pages.length, title, meta, headers }).toDataURL("image/jpeg", 0.92)));
  return createPdfFromJpegs(images);
}
