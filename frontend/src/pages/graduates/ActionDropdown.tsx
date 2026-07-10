import React from "react";
import Icon from "../../components/Icon";

type GraduateDropdownAction = {
  key: string;
  label: string;
  icon: string;
  onClick: () => void;
};

export function ActionDropdown(props: {
  containerRef: React.Ref<HTMLDivElement>;
  open: boolean;
  onToggle: () => void;
  buttonIcon: string;
  buttonLabel: string;
  buttonStyle: React.CSSProperties;
  actions: GraduateDropdownAction[];
  disabled?: boolean;
}) {
  const {
    containerRef,
    open,
    onToggle,
    buttonIcon,
    buttonLabel,
    buttonStyle,
    actions,
    disabled,
  } = props;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        className="btn dropdown-like"
        type="button"
        style={{ ...buttonStyle, width: "100%", justifyContent: "center" }}
        onClick={onToggle}
        disabled={disabled}
      >
        <Icon src={buttonIcon} size={18} />
        <span>{buttonLabel}</span>
        <span className="btn-dropdown-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div className="central-menu-dropdown central-menu-dropdown-actions central-menu-dropdown-align-left">
          {actions.map((action) => (
            <button
              key={action.key}
              className="btn central-menu-dropdown-item"
              type="button"
              onClick={action.onClick}
            >
              <Icon src={action.icon} size={17} />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
