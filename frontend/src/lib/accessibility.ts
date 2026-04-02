export type AccessibilitySettings = {
  fontScale: -1 | 0 | 1;
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
  if (value === -1 || value === 0 || value === 1) {
    return value;
  }

  if (typeof value === "number") {
    if (value < 0) {
      return -1;
    }
    if (value > 0) {
      return 1;
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
  root.classList.toggle("accessibility-font-small", settings.fontScale === -1);
  root.classList.toggle("accessibility-font-large", settings.fontScale === 1);
  root.classList.toggle("accessibility-high-contrast", settings.highContrast);
  root.classList.toggle("accessibility-underline-links", settings.underlineLinks);
}

export function resetAccessibilitySettings() {
  writeAccessibilitySettings(defaultAccessibilitySettings);
  applyAccessibilitySettings(defaultAccessibilitySettings);
  return defaultAccessibilitySettings;
}
