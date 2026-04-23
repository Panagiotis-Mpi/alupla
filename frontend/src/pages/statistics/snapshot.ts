import { prepareSnapshotClone } from "../../lib/domSnapshot";

function expandSnapshotClone(sourceRoot: HTMLElement, cloneRoot: HTMLElement) {
  const sourceNodes = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll<HTMLElement>("*"))];
  const cloneNodes = [cloneRoot, ...Array.from(cloneRoot.querySelectorAll<HTMLElement>("*"))];

  sourceNodes.forEach((sourceNode, index) => {
    const cloneNode = cloneNodes[index];
    if (!cloneNode) return;

    const computed = window.getComputedStyle(sourceNode);
    const hasHorizontalOverflow = sourceNode.scrollWidth > sourceNode.clientWidth + 4;
    const hasVerticalOverflow = sourceNode.scrollHeight > sourceNode.clientHeight + 4;
    const overflowX = computed.overflowX;
    const overflowY = computed.overflowY;

    if (hasHorizontalOverflow && (overflowX === "auto" || overflowX === "scroll" || overflowX === "hidden")) {
      cloneNode.style.overflowX = "visible";
      cloneNode.style.width = `${Math.ceil(sourceNode.scrollWidth)}px`;
      cloneNode.style.maxWidth = "none";
      cloneNode.style.minWidth = `${Math.ceil(sourceNode.scrollWidth)}px`;
    }

    if (hasVerticalOverflow && (overflowY === "auto" || overflowY === "scroll" || overflowY === "hidden")) {
      cloneNode.style.overflowY = "visible";
      cloneNode.style.height = `${Math.ceil(sourceNode.scrollHeight)}px`;
      cloneNode.style.maxHeight = "none";
      cloneNode.style.minHeight = `${Math.ceil(sourceNode.scrollHeight)}px`;
    }
  });
}

export function fileSlug(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "chart";
}

export async function renderElementSnapshot(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const width = Math.ceil(Math.max(rect.width, element.scrollWidth));
  const height = Math.ceil(Math.max(rect.height, element.scrollHeight));
  const clone = prepareSnapshotClone(element);
  expandSnapshotClone(element, clone);
  clone.style.margin = "0";
  clone.style.width = `${width}px`;
  clone.style.maxWidth = "none";
  clone.style.minWidth = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.maxHeight = "none";

  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${height}px`;
  wrapper.style.background = "#ffffff";
  wrapper.style.overflow = "visible";
  wrapper.appendChild(clone);

  const serialized = new XMLSerializer().serializeToString(wrapper);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_error"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });

  return { image, width, height };
}


export async function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return false;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}
