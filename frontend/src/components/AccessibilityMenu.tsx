import React from "react";
import { useTranslation } from "react-i18next";
import {
  applyAccessibilitySettings,
  defaultAccessibilitySettings,
  readAccessibilitySettings,
  resetAccessibilitySettings,
  type AccessibilitySettings,
  writeAccessibilitySettings,
} from "../lib/accessibility";

type ToggleKey = keyof AccessibilitySettings;

type ToggleItem = {
  key: ToggleKey;
  label: string;
};

function buildToggleItems(t: ReturnType<typeof useTranslation>["t"]): ToggleItem[] {
  return [
    {
      key: "largeText",
      label: t("accessibility.largeText", { defaultValue: "Μεγαλύτερο κείμενο" }),
    },
    {
      key: "highContrast",
      label: t("accessibility.highContrast", { defaultValue: "Υψηλή αντίθεση" }),
    },
    {
      key: "reduceMotion",
      label: t("accessibility.reduceMotion", { defaultValue: "Μείωση κίνησης" }),
    },
    {
      key: "underlineLinks",
      label: t("accessibility.underlineLinks", { defaultValue: "Υπογράμμιση συνδέσμων" }),
    },
  ];
}

export default function AccessibilityMenu() {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [settings, setSettings] = React.useState<AccessibilitySettings>(() => readAccessibilitySettings());
  const panelId = React.useId();
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    applyAccessibilitySettings(settings);
    writeAccessibilitySettings(settings);
  }, [settings]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const items = React.useMemo(() => buildToggleItems(t), [t]);

  const toggleSetting = React.useCallback((key: ToggleKey) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const handleReset = React.useCallback(() => {
    setSettings(resetAccessibilitySettings());
  }, []);

  return (
    <div className="accessibility-menu">
      <button
        ref={buttonRef}
        type="button"
        className="accessibility-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t("accessibility.open", { defaultValue: "Μενού προσβασιμότητας" })}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">A</span>
        <span>{t("accessibility.shortLabel", { defaultValue: "A" })}</span>
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          className="accessibility-panel"
          role="dialog"
          aria-label={t("accessibility.title", { defaultValue: "Προσβασιμότητα" })}
        >
          <div className="accessibility-panel-header">
            <strong>{t("accessibility.title", { defaultValue: "Προσβασιμότητα" })}</strong>
            <button type="button" className="btn" onClick={() => setOpen(false)}>
              {t("common.close", { defaultValue: "Κλείσιμο" })}
            </button>
          </div>

          <div className="accessibility-panel-note">
            {t("accessibility.note", { defaultValue: "Προσαρμογές για πιο άνετη ανάγνωση και πλοήγηση." })}
          </div>

          <div className="accessibility-options">
            {items.map((item) => (
              <label key={item.key} className="accessibility-option">
                <span>{item.label}</span>
                <input
                  type="checkbox"
                  checked={settings[item.key]}
                  onChange={() => toggleSetting(item.key)}
                />
              </label>
            ))}
          </div>

          <div className="accessibility-panel-actions">
            <button type="button" className="btn" onClick={handleReset}>
              {t("accessibility.reset", { defaultValue: "Επαναφορά" })}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
