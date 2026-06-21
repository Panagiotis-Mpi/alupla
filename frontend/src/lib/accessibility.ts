// Κρατά τις ρυθμίσεις προσβασιμότητας και τις εφαρμόζει στο document.
export type AccessibilitySettings = {
  fontScale: -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5;
  highContrast: boolean;
  underlineLinks: boolean;
};

const STORAGE_KEY = "alupla.accessibility";
const FONT_TARGET_SELECTOR = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "span",
  "label",
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "option",
  "small",
  "strong",
  "em",
  "li",
  "dt",
  "dd",
  "legend",
  "summary",
  "code",
  "pre",
  "td",
  "th",
  "caption",
  "figcaption",
  "blockquote",
  "cite",
  "time",
  "div",
].join(",");
const FONT_SCALE_MULTIPLIERS: Record<AccessibilitySettings["fontScale"], number> = {
  [-3]: 0.82,
  [-2]: 0.88,
  [-1]: 0.94,
  0: 1,
  1: 1.08,
  2: 1.16,
  3: 1.24,
  4: 1.32,
  5: 1.4,
};

let fontObserver: MutationObserver | null = null;
let scheduledAnimationFrame = 0;

export const defaultAccessibilitySettings: AccessibilitySettings = {
  fontScale: 0,
  highContrast: false,
  underlineLinks: false,
};

function canUseDom() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function clampFontScale(value: unknown): AccessibilitySettings["fontScale"] {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value < -3) {
      return -3;
    }
    if (value > 5) {
      return 5;
    }

    const rounded = Math.round(value);
    if (rounded >= -3 && rounded <= 5) {
      return rounded as AccessibilitySettings["fontScale"];
    }
  }

  return 0;
}

function normalizeSettings(value: Record<string, unknown> | null | undefined): AccessibilitySettings {
  const fontScale = value?.fontScale;
  const legacyLargeText = Boolean(value?.largeText);

  return {
    fontScale: fontScale == null ? (legacyLargeText ? 1 : 0) : clampFontScale(fontScale),
    highContrast: Boolean(value?.highContrast),
    underlineLinks: Boolean(value?.underlineLinks),
  };
}


function getFontScaleMultiplier(fontScale: AccessibilitySettings["fontScale"]) {
  return FONT_SCALE_MULTIPLIERS[fontScale] ?? 1;
}

function applyFontSizeToElement(element: HTMLElement, multiplier: number) {
  if (!canUseDom()) {
    return;
  }

  const computedFontSize = Number.parseFloat(window.getComputedStyle(element).fontSize || "0");
  if (!Number.isFinite(computedFontSize) || computedFontSize <= 0) {
    return;
  }

  const storedBaseSize = Number.parseFloat(element.dataset.a11yBaseFontSize || "");
  const baseSize = Number.isFinite(storedBaseSize) && storedBaseSize > 0
    ? storedBaseSize
    : computedFontSize / multiplier;

  element.dataset.a11yBaseFontSize = String(baseSize);

  if (Math.abs(multiplier - 1) < 0.001) {
    element.style.removeProperty("font-size");
    return;
  }

  element.style.setProperty("font-size", `${Math.max(baseSize * multiplier, 10)}px`, "important");
}

function applyFontScaleToSubtree(root: ParentNode, multiplier: number) {
  if (!(root instanceof Element || root instanceof Document || root instanceof DocumentFragment)) {
    return;
  }

  const nodes: HTMLElement[] = [];

  if (root instanceof Element && root.matches(FONT_TARGET_SELECTOR)) {
    nodes.push(root as HTMLElement);
  }

  if ("querySelectorAll" in root) {
    nodes.push(...Array.from(root.querySelectorAll<HTMLElement>(FONT_TARGET_SELECTOR)));
  }

  for (const element of nodes) {
    if (element.closest("svg")) {
      continue;
    }

    applyFontSizeToElement(element, multiplier);
  }
}

function scheduleFullFontRefresh(multiplier: number) {
  if (!canUseDom()) {
    return;
  }

  if (scheduledAnimationFrame) {
    window.cancelAnimationFrame(scheduledAnimationFrame);
  }

  scheduledAnimationFrame = window.requestAnimationFrame(() => {
    scheduledAnimationFrame = 0;
    applyFontScaleToSubtree(document.body, multiplier);
  });
}

export function initAccessibility() {
  if (!canUseDom() || fontObserver) {
    return;
  }

  const syncAddedNodes = () => {
    const settings = readAccessibilitySettings();
    const multiplier = getFontScaleMultiplier(settings.fontScale);

    if (Math.abs(multiplier - 1) < 0.001) {
      return;
    }

    scheduleFullFontRefresh(multiplier);
  };

  fontObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList" || !mutation.addedNodes.length) {
        continue;
      }

      syncAddedNodes();
      return;
    }
  });

  fontObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

export function readAccessibilitySettings(): AccessibilitySettings {
  if (!canUseDom()) {
    return defaultAccessibilitySettings;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultAccessibilitySettings;
    }

    return normalizeSettings(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return defaultAccessibilitySettings;
  }
}

export function writeAccessibilitySettings(settings: AccessibilitySettings) {
  if (!canUseDom()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function applyAccessibilitySettings(settings: AccessibilitySettings) {
  if (!canUseDom()) {
    return;
  }

  const root = document.documentElement;
  const multiplier = getFontScaleMultiplier(settings.fontScale);
  root.classList.remove(
    "accessibility-font-scale--3",
    "accessibility-font-scale--2",
    "accessibility-font-scale--1",
    "accessibility-font-scale-0",
    "accessibility-font-scale-1",
    "accessibility-font-scale-2",
    "accessibility-font-scale-3",
    "accessibility-font-scale-4",
    "accessibility-font-scale-5",
  );
  root.classList.add(`accessibility-font-scale-${settings.fontScale}`);
  root.classList.toggle("accessibility-high-contrast", settings.highContrast);
  root.classList.toggle("accessibility-underline-links", settings.underlineLinks);
  root.style.setProperty("--accessibility-font-multiplier", String(multiplier));

  if (document.body) {
    applyFontScaleToSubtree(document.body, multiplier);
  }
}

export function resetAccessibilitySettings() {
  writeAccessibilitySettings(defaultAccessibilitySettings);
  applyAccessibilitySettings(defaultAccessibilitySettings);
  return defaultAccessibilitySettings;
}
