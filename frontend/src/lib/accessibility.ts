export type AccessibilitySettings = {
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  underlineLinks: boolean;
};

const STORAGE_KEY = "alupla.accessibility";

export const defaultAccessibilitySettings: AccessibilitySettings = {
  largeText: false,
  highContrast: false,
  reduceMotion: false,
  underlineLinks: false,
};

function canUseDom() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function normalizeSettings(value: Partial<AccessibilitySettings> | null | undefined): AccessibilitySettings {
  return {
    largeText: Boolean(value?.largeText),
    highContrast: Boolean(value?.highContrast),
    reduceMotion: Boolean(value?.reduceMotion),
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

    return normalizeSettings(JSON.parse(raw) as Partial<AccessibilitySettings>);
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
  root.classList.toggle("a11y-large-text", settings.largeText);
  root.classList.toggle("a11y-high-contrast", settings.highContrast);
  root.classList.toggle("a11y-reduce-motion", settings.reduceMotion);
  root.classList.toggle("a11y-underline-links", settings.underlineLinks);
}

export function resetAccessibilitySettings() {
  writeAccessibilitySettings(defaultAccessibilitySettings);
  applyAccessibilitySettings(defaultAccessibilitySettings);
  return defaultAccessibilitySettings;
}
