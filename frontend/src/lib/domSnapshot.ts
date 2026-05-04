// Παίρνει εικόνα από τμήμα της σελίδας για exports PNG/PDF.
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

function replaceCanvasNodes(sourceRoot: HTMLElement, cloneRoot: HTMLElement) {
  const sourceCanvases = Array.from(sourceRoot.querySelectorAll("canvas"));
  const cloneCanvases = Array.from(cloneRoot.querySelectorAll("canvas"));

  sourceCanvases.forEach((sourceCanvas, index) => {
    const cloneCanvas = cloneCanvases[index];
    if (!cloneCanvas) return;

    const image = document.createElement("img");

    try {
      image.src = sourceCanvas.toDataURL("image/png");
    } catch {
      return;
    }

    const width = sourceCanvas.width || sourceCanvas.clientWidth || cloneCanvas.clientWidth;
    const height = sourceCanvas.height || sourceCanvas.clientHeight || cloneCanvas.clientHeight;

    image.width = width;
    image.height = height;
    image.style.width = `${cloneCanvas.clientWidth || sourceCanvas.clientWidth || width}px`;
    image.style.height = `${cloneCanvas.clientHeight || sourceCanvas.clientHeight || height}px`;
    image.style.display = window.getComputedStyle(sourceCanvas).display;
    image.style.maxWidth = "100%";
    image.style.objectFit = "contain";

    cloneCanvas.replaceWith(image);
  });
}

async function blobToDataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("image_read_error"));
    };
    reader.onerror = () => reject(new Error("image_read_error"));
    reader.readAsDataURL(blob);
  });
}

async function inlineImageNodes(sourceRoot: HTMLElement, cloneRoot: HTMLElement) {
  const sourceImages = Array.from(sourceRoot.querySelectorAll("img"));
  const cloneImages = Array.from(cloneRoot.querySelectorAll("img"));

  await Promise.all(sourceImages.map(async (sourceImage, index) => {
    const cloneImage = cloneImages[index] as HTMLImageElement | undefined;
    if (!cloneImage) return;

    const source = sourceImage as HTMLImageElement;
    const src = source.currentSrc || source.src || cloneImage.currentSrc || cloneImage.src;
    if (!src) return;

    cloneImage.crossOrigin = "anonymous";
    cloneImage.referrerPolicy = "no-referrer";

    if (src.startsWith("data:")) {
      cloneImage.src = src;
      return;
    }

    try {
      const response = await fetch(src, { mode: "cors", credentials: "omit" });
      if (!response.ok) throw new Error("image_fetch_error");
      const blob = await response.blob();
      cloneImage.src = await blobToDataUrl(blob);
      return;
    } catch {}

    try {
      const canvas = document.createElement("canvas");
      const width = source.naturalWidth || source.width || source.clientWidth;
      const height = source.naturalHeight || source.height || source.clientHeight;
      if (!width || !height) return;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(source, 0, 0, width, height);
      cloneImage.src = canvas.toDataURL("image/png");
    } catch {}
  }));
}

export async function waitForRenderableImages(source: HTMLElement) {
  const images = Array.from(source.querySelectorAll("img")) as HTMLImageElement[];
  const pending = images.filter((image) => !image.complete || !(image.naturalWidth > 0));
  if (!pending.length) return;

  await Promise.race([
    Promise.all(pending.map((image) => new Promise<void>((resolve) => {
      const finish = () => resolve();
      image.addEventListener("load", finish, { once: true });
      image.addEventListener("error", finish, { once: true });
    }))),
    new Promise<void>((resolve) => window.setTimeout(resolve, 1800)),
  ]);
}

export async function prepareSnapshotClone(source: HTMLElement) {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");

  copyComputedStyles(source, clone);
  replaceCanvasNodes(source, clone);
  await inlineImageNodes(source, clone);

  return clone;
}
