export type AccessibilitySettings = {
  fontScale: -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5;
  highContrast: boolean;
  underlineLinks: boolean;
};

const STORAGE_KEY = "alupla.accessibility";

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
  root.classList.add(`accessibility-font-scale-${settings.fontScale}`.replace("--", "--"));
  root.classList.toggle("accessibility-high-contrast", settings.highContrast);
  root.classList.toggle("accessibility-underline-links", settings.underlineLinks);
}

export function resetAccessibilitySettings() {
  writeAccessibilitySettings(defaultAccessibilitySettings);
  applyAccessibilitySettings(defaultAccessibilitySettings);
  return defaultAccessibilitySettings;
}
