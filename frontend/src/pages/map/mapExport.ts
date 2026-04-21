import * as XLSX from "xlsx";
import { downloadBlob } from "../../lib/download";
import { prepareSnapshotClone, waitForRenderableImages } from "../../lib/domSnapshot";

export function excelCellValue(v: any) {
  return v === null || v === undefined || v === "" ? "" : v;
}

function utf16Blob(text: string) {
  const output = new Uint8Array(2 + text.length * 2);
  output[0] = 0xff;
  output[1] = 0xfe;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    output[2 + i * 2] = code & 0xff;
    output[3 + i * 2] = code >> 8;
  }
  return new Blob([output], { type: "text/csv;charset=utf-16le" });
}

export async function exportElementAsPng(element: HTMLElement, filename: string) {
  const rect = element.getBoundingClientRect();
  await waitForRenderableImages(element);
  const clone = await prepareSnapshotClone(element);
  clone.style.margin = "0";
  clone.style.width = `${Math.ceil(rect.width)}px`;
  clone.style.height = `${Math.ceil(rect.height)}px`;

  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.width = `${Math.ceil(rect.width)}px`;
  wrapper.style.height = `${Math.ceil(rect.height)}px`;
  wrapper.style.background = "#ffffff";
  wrapper.appendChild(clone);

  const serialized = new XMLSerializer().serializeToString(wrapper);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(rect.width)}" height="${Math.ceil(rect.height)}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;

  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(rect.width * 2);
    canvas.height = Math.ceil(rect.height * 2);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("canvas_error"));
      return;
    }

    img.onload = () => {
      ctx.scale(2, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, Math.ceil(rect.width), Math.ceil(rect.height));
      ctx.drawImage(img, 0, 0, Math.ceil(rect.width), Math.ceil(rect.height));
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("blob_error"));
          return;
        }
        downloadBlob(blob, filename);
        resolve();
      }, "image/png");
    };

    img.onerror = () => reject(new Error("image_error"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

export function exportWorkbook(filename: string, workbook: XLSX.WorkBook) {
  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array", compression: true });
  downloadBlob(new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}

export function exportCsvText(filename: string, text: string) {
  downloadBlob(utf16Blob(text), filename);
}
