import React from "react";
import Icon from "../../components/Icon";

export type GraduateDropdownAction = {
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
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            minWidth: 170,
            width: "max-content",
            maxWidth: "calc(100vw - 32px)",
            background: "#fff",
            border: "1px solid rgba(15,23,42,.12)",
            borderRadius: 12,
            boxShadow: "0 12px 30px rgba(15,23,42,.12)",
            padding: 8,
            display: "grid",
            gap: 8,
            zIndex: 30,
          }}
        >
          {actions.map((action) => (
            <button
              key={action.key}
              className="btn"
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
