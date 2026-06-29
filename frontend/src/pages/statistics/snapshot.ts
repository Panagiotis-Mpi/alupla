// Παίρνει snapshot από τα στατιστικά για export εικόνας/PDF.
import { prepareSnapshotClone, waitForRenderableImages } from "../../lib/domSnapshot";

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

function getNodePairs(sourceRoot: HTMLElement, cloneRoot: HTMLElement) {
  const sourceNodes = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll<HTMLElement>("*"))];
  const cloneNodes = [cloneRoot, ...Array.from(cloneRoot.querySelectorAll<HTMLElement>("*"))];

  return sourceNodes
    .map((sourceNode, index) => {
      const cloneNode = cloneNodes[index];
      if (!cloneNode) return null;
      return { sourceNode, cloneNode };
    })
    .filter((entry): entry is { sourceNode: HTMLElement; cloneNode: HTMLElement } => !!entry);
}

function findPrimaryHorizontalOverflowPair(sourceRoot: HTMLElement, cloneRoot: HTMLElement) {
  const pairs = getNodePairs(sourceRoot, cloneRoot);

  return pairs
    .filter(({ sourceNode }) => {
      if (sourceNode === sourceRoot) return false;
      if (!(sourceNode.scrollWidth > sourceNode.clientWidth + 24)) return false;
      const computed = window.getComputedStyle(sourceNode);
      return computed.overflowX === "auto" || computed.overflowX === "scroll" || computed.overflowX === "hidden";
    })
    .sort((left, right) => {
      const leftOverflow = left.sourceNode.scrollWidth - left.sourceNode.clientWidth;
      const rightOverflow = right.sourceNode.scrollWidth - right.sourceNode.clientWidth;
      return rightOverflow - leftOverflow;
    })[0] ?? null;
}

async function renderSnapshotClone(clone: HTMLElement, width: number, height: number) {
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


async function renderElementSnapshot(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const width = Math.ceil(Math.max(rect.width, element.scrollWidth));
  const height = Math.ceil(Math.max(rect.height, element.scrollHeight));
  await waitForRenderableImages(element);
  const clone = await prepareSnapshotClone(element);
  expandSnapshotClone(element, clone);
  clone.style.margin = "0";
  clone.style.width = `${width}px`;
  clone.style.maxWidth = "none";
  clone.style.minWidth = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.maxHeight = "none";

  return renderSnapshotClone(clone, width, height);
}

export async function renderSegmentedElementSnapshots(element: HTMLElement) {
  await waitForRenderableImages(element);

  if (element.closest('[data-stat-export-single="true"]')) {
    return [await renderElementSnapshot(element)];
  }

  const baseClone = await prepareSnapshotClone(element);
  const overflowPair = findPrimaryHorizontalOverflowPair(element, baseClone);

  if (!overflowPair) {
    return [await renderElementSnapshot(element)];
  }

  const { sourceNode } = overflowPair;
  const viewportWidth = Math.ceil(Math.max(sourceNode.clientWidth, 640));
  const fullWidth = Math.ceil(Math.max(sourceNode.scrollWidth, viewportWidth));

  if (!(fullWidth > viewportWidth + 24)) {
    return [await renderElementSnapshot(element)];
  }

  const segmentCount = Math.max(2, Math.ceil(fullWidth / viewportWidth));
  const snapshots: Array<{ image: HTMLImageElement; width: number; height: number; segmentIndex: number; segmentCount: number }> = [];

  for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
    const clone = await prepareSnapshotClone(element);
    const pair = findPrimaryHorizontalOverflowPair(element, clone);
    if (!pair) {
      snapshots.push({ ...(await renderElementSnapshot(element)), segmentIndex: 0, segmentCount: 1 });
      break;
    }

    const sliceStart = Math.min(segmentIndex * viewportWidth, Math.max(0, fullWidth - viewportWidth));
    const width = Math.ceil(Math.max(element.getBoundingClientRect().width, element.clientWidth || 0));
    const height = Math.ceil(Math.max(element.getBoundingClientRect().height, element.scrollHeight || 0));

    clone.style.margin = "0";
    clone.style.width = `${width}px`;
    clone.style.minWidth = `${width}px`;
    clone.style.maxWidth = "none";
    clone.style.height = `${height}px`;
    clone.style.maxHeight = "none";

    const segmentedCloneNode = pair.cloneNode;
    segmentedCloneNode.style.overflowX = "hidden";
    segmentedCloneNode.style.overflowY = "visible";
    segmentedCloneNode.style.width = `${viewportWidth}px`;
    segmentedCloneNode.style.minWidth = `${viewportWidth}px`;
    segmentedCloneNode.style.maxWidth = `${viewportWidth}px`;
    segmentedCloneNode.style.scrollBehavior = "auto";

    const inner = segmentedCloneNode.firstElementChild as HTMLElement | null;
    if (inner) {
      inner.style.width = `${fullWidth}px`;
      inner.style.minWidth = `${fullWidth}px`;
      inner.style.maxWidth = "none";
      inner.style.transform = `translateX(-${sliceStart}px)`;
      inner.style.transformOrigin = "top left";
      inner.style.willChange = "auto";
    }

    snapshots.push({ ...(await renderSnapshotClone(clone, width, height)), segmentIndex, segmentCount });
  }

  return snapshots;
}

export async function snapshotToPngBlob(snapshot: { image: HTMLImageElement; width: number; height: number }) {
  const padding = 18;
  const width = snapshot.width + padding * 2;
  const height = snapshot.height + padding * 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = height * 2;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.scale(2, 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(snapshot.image, padding, padding, snapshot.width, snapshot.height);

  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
