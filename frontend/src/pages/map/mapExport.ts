import * as XLSX from "xlsx";

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function excelCellValue(v: any) {
  return v === null || v === undefined || v === "" ? "" : v;
}

function copyComputedStyles(source: Element, target: Element) {
  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);
  const computed = window.getComputedStyle(source as HTMLElement);
  const styleText = Array.from(computed)
    .map((name) => `${name}:${computed.getPropertyValue(name)};`)
    .join("");
  target.setAttribute("style", styleText);
  for (let i = 0; i < sourceChildren.length; i += 1) {
    if (targetChildren[i]) copyComputedStyles(sourceChildren[i], targetChildren[i]);
  }
}

export async function exportElementAsPng(element: HTMLElement, filename: string) {
  const rect = element.getBoundingClientRect();
  const clone = element.cloneNode(true) as HTMLElement;
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  copyComputedStyles(element, clone);
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
        downloadBlob(filename, blob);
        resolve();
      }, "image/png");
    };

    img.onerror = () => reject(new Error("image_error"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

export function exportWorkbook(filename: string, workbook: XLSX.WorkBook) {
  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array", compression: true });
  downloadBlob(filename, new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}

export function exportCsvText(filename: string, text: string) {
  downloadBlob(filename, new Blob([text], { type: "text/csv;charset=utf-8" }));
}
