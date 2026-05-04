// Διαχειρίζεται ποιες ενότητες του χάρτη θα μπουν σε export.
import type { RefObject } from "react";
import L from "leaflet";
import { prepareSnapshotClone, waitForRenderableImages } from "../../lib/domSnapshot";

export async function waitForMapFrame(mapRef: RefObject<L.Map | null>) {
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => window.setTimeout(resolve, 240));
  mapRef.current?.invalidateSize();
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

export async function renderMapSnapshot(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(rect.height);
  await waitForRenderableImages(element);
  const clone = await prepareSnapshotClone(element);
  clone.style.margin = "0";
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${height}px`;
  wrapper.style.background = "#ffffff";
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

export async function exportCombinedSnapshots(filename: string, title: string, snapshots: Array<{ image: HTMLImageElement; width: number; height: number; caption?: string }>) {
  if (!snapshots.length) return;
  const padding = 20;
  const gap = 18;
  const titleHeight = 42;
  const captionHeight = 28;
  const width = Math.max(...snapshots.map((snapshot) => snapshot.width)) + padding * 2;
  const height = titleHeight + padding + snapshots.reduce((sum, snapshot) => sum + snapshot.height + (snapshot.caption ? captionHeight : 0), 0) + gap * Math.max(0, snapshots.length - 1) + padding;
  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(2, 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#0f172a";
  ctx.font = '700 22px Arial, sans-serif';
  ctx.fillText(title, padding, 30);
  let offsetY = titleHeight;

  snapshots.forEach((snapshot, index) => {
    if (snapshot.caption) {
      ctx.fillStyle = "#334155";
      ctx.font = '700 16px Arial, sans-serif';
      ctx.fillText(snapshot.caption, padding, offsetY + 18);
      offsetY += captionHeight;
    }
    ctx.drawImage(snapshot.image, padding, offsetY, snapshot.width, snapshot.height);
    offsetY += snapshot.height;
    if (index < snapshots.length - 1) offsetY += gap;
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
