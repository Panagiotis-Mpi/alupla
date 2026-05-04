// Κατεβάζει αρχείο στον browser.
export async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  await new Promise<void>((resolve) => window.setTimeout(resolve, 180));
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
