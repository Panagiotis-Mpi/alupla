// Χειρίζεται το μενού προσβασιμότητας και εφαρμόζει τις επιλογές εμφάνισης στο UI.
import React from "react";
import { useTranslation } from "react-i18next";
import Icon from "./Icon";
import personStandingIcon from "../assets/icons/person-standing.svg";
import contrastIcon from "../assets/icons/contrast.svg";
import linkIcon from "../assets/icons/link.svg";
import aArrowDownIcon from "../assets/icons/a-arrow-down.svg";
import aArrowUpIcon from "../assets/icons/a-arrow-up.svg";
import rotateCcwIcon from "../assets/icons/rotate-ccw.svg";
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
          <Icon src={aArrowDownIcon} size={24} />
        </button>
        <button
          type="button"
          className={`accessibility-icon-btn${value === 0 ? " is-active" : ""}`}
          onClick={() => onChange(0)}
          aria-label={t("accessibility.resetText")}
          title={t("accessibility.resetText")}
        >
          <Icon src={rotateCcwIcon} size={24} />
        </button>
        <button
          type="button"
          className="accessibility-icon-btn"
          onClick={() => canIncrease && onChange((value + 1) as AccessibilitySettings["fontScale"])}
          aria-label={t("accessibility.increaseText")}
          title={t("accessibility.increaseText")}
          disabled={!canIncrease}
        >
          <Icon src={aArrowUpIcon} size={24} />
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
        <span className="accessibility-toggle-icon" aria-hidden="true"><Icon src={icon} size={22} /></span>
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

    const frameId = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])")?.focus();
    });

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


    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener("mousedown", handlePointerDown);
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
        <Icon src={personStandingIcon} size={32} className="accessibility-trigger-icon" />
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
                icon={contrastIcon}
                stateLabel={stateLabel(settings.highContrast)}
              />
            </div>

            <div className="accessibility-control-block">
              <ToggleButton
                label={t("accessibility.underlineLinks")}
                active={settings.underlineLinks}
                onClick={() => toggleSetting("underlineLinks")}
                icon={linkIcon}
                stateLabel={stateLabel(settings.underlineLinks)}
              />
            </div>
          </div>

          <div className="accessibility-panel-actions">
            <button type="button" className="btn" onClick={handleReset}>
              {t("accessibility.reset", { defaultValue: "Επαναφορά" })}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setOpen(false);
                window.requestAnimationFrame(() => buttonRef.current?.focus());
              }}
            >
              {t("common.close", { defaultValue: "Κλείσιμο" })}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
