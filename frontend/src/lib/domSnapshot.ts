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

export function prepareSnapshotClone(source: HTMLElement) {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");

  // Keep the exported image faithful to the visible UI instead of relying on app CSS at export time.
  copyComputedStyles(source, clone);
  replaceCanvasNodes(source, clone);

  return clone;
}
