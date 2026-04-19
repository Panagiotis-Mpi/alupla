import React from "react";
import { useTranslation } from "react-i18next";
import {
  applyAccessibilitySettings,
  readAccessibilitySettings,
  resetAccessibilitySettings,
  type AccessibilitySettings,
  writeAccessibilitySettings,
} from "../lib/accessibility";

type ToggleKey = "highContrast" | "underlineLinks";

const MIN_FONT_SCALE = -3;
const MAX_FONT_SCALE = 5;

function FontSizeControls({
  value,
  onChange,
  t,
}: {
  value: AccessibilitySettings["fontScale"];
  onChange: (value: AccessibilitySettings["fontScale"]) => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const canDecrease = value > MIN_FONT_SCALE;
  const canIncrease = value < MAX_FONT_SCALE;

  return (
    <div className="accessibility-font-controls-wrap">
      <div className="accessibility-font-controls" role="group" aria-label={t("accessibility.fontSize")}>
        <button
          type="button"
          className="accessibility-icon-btn"
          onClick={() => canDecrease && onChange((value - 1) as AccessibilitySettings["fontScale"])}
          aria-label={t("accessibility.decreaseText")}
          title={t("accessibility.decreaseText")}
          disabled={!canDecrease}
        >
          <span aria-hidden="true">A−</span>
        </button>
        <button
          type="button"
          className={`accessibility-icon-btn${value === 0 ? " is-active" : ""}`}
          onClick={() => onChange(0)}
          aria-label={t("accessibility.resetText")}
          title={t("accessibility.resetText")}
        >
          <span aria-hidden="true">↺</span>
        </button>
        <button
          type="button"
          className="accessibility-icon-btn"
          onClick={() => canIncrease && onChange((value + 1) as AccessibilitySettings["fontScale"])}
          aria-label={t("accessibility.increaseText")}
          title={t("accessibility.increaseText")}
          disabled={!canIncrease}
        >
          <span aria-hidden="true">A+</span>
        </button>
      </div>
      <div className="accessibility-font-status" aria-live="polite">
        {t("accessibility.fontLevel", { current: value + 4, total: 9 })}
      </div>
    </div>
  );
}

function ToggleButton({
  label,
  active,
  onClick,
  icon,
  stateLabel,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: string;
  stateLabel: string;
}) {
  return (
    <div className="accessibility-toggle-block">
      <div className="accessibility-section-title">{label}</div>
      <button
        type="button"
        className={`accessibility-toggle-btn${active ? " is-active" : ""}`}
        onClick={onClick}
        aria-pressed={active}
      >
        <span className="accessibility-toggle-icon" aria-hidden="true">{icon}</span>
        <span>{stateLabel}</span>
      </button>
    </div>
  );
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

  const toggleSetting = React.useCallback((key: ToggleKey) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const setFontScale = React.useCallback((fontScale: AccessibilitySettings["fontScale"]) => {
    setSettings((current) => ({ ...current, fontScale }));
  }, []);

  const handleReset = React.useCallback(() => {
    setSettings(resetAccessibilitySettings());
  }, []);

  const stateLabel = React.useCallback(
    (active: boolean) => (active ? t("accessibility.enabled") : t("accessibility.disabled")),
    [t],
  );

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
        <svg
          className="accessibility-trigger-icon"
          viewBox="0 0 64 64"
          aria-hidden="true"
          focusable="false"
        >
          <circle className="accessibility-trigger-ring" cx="32" cy="32" r="27.5" />
          <circle className="accessibility-trigger-head" cx="32" cy="16.5" r="4.5" />
          <path className="accessibility-trigger-line" d="M17 24h30" />
          <path className="accessibility-trigger-line" d="M32 21v24" />
          <path className="accessibility-trigger-line" d="M24 45l8-11 8 11" />
          <path className="accessibility-trigger-line" d="M18 35l14-9 14 9" />
        </svg>
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
          </div>

          <div className="accessibility-options">
            <div className="accessibility-control-block accessibility-control-block-font">
              <div className="accessibility-section-title">{t("accessibility.fontSize")}</div>
              <FontSizeControls value={settings.fontScale} onChange={setFontScale} t={t} />
            </div>

            <div className="accessibility-control-block">
              <ToggleButton
                label={t("accessibility.highContrast")}
                active={settings.highContrast}
                onClick={() => toggleSetting("highContrast")}
                icon="◐"
                stateLabel={stateLabel(settings.highContrast)}
              />
            </div>

            <div className="accessibility-control-block">
              <ToggleButton
                label={t("accessibility.underlineLinks")}
                active={settings.underlineLinks}
                onClick={() => toggleSetting("underlineLinks")}
                icon="🔗"
                stateLabel={stateLabel(settings.underlineLinks)}
              />
            </div>
          </div>

          <div className="accessibility-panel-actions">
            <button type="button" className="btn" onClick={handleReset}>
              {t("accessibility.reset", { defaultValue: "Επαναφορά" })}
            </button>
            <button type="button" className="btn" onClick={() => setOpen(false)}>
              {t("common.close", { defaultValue: "Κλείσιμο" })}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
