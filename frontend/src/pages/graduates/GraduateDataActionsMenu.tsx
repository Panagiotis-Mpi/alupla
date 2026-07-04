import React from "react";
import Icon from "../../components/Icon";
import fileSpreadsheetIcon from "../../assets/icons/file-spreadsheet.svg";

type GraduateDataAction = {
  key: string;
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
};

type GraduateDataActionGroup = {
  key: string;
  label: string;
  actions: GraduateDataAction[];
  hint?: string;
};

export function GraduateDataActionsMenu(props: {
  containerRef: React.Ref<HTMLDivElement>;
  open: boolean;
  onToggle: () => void;
  buttonLabel: string;
  groups: GraduateDataActionGroup[];
}) {
  const { containerRef, open, onToggle, buttonLabel, groups } = props;

  return (
    <div ref={containerRef} className="graduates-data-menu">
      <button
        className="btn graduates-secondary-action dropdown-like"
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Icon src={fileSpreadsheetIcon} size={18} />
        <span>{buttonLabel}</span>
        <span className="btn-dropdown-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div className="graduates-data-menu-panel" role="menu">
          {groups.map((group) => (
            <section key={group.key} className="graduates-data-menu-group">
              <div className="graduates-data-menu-heading">{group.label}</div>
              <div className="graduates-data-menu-actions">
                {group.actions.map((action) => (
                  <button
                    key={action.key}
                    className="graduates-data-menu-action"
                    type="button"
                    onClick={action.onClick}
                    disabled={action.disabled}
                    role="menuitem"
                  >
                    <Icon src={action.icon} size={17} />
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
              {group.hint ? <div className="graduates-data-menu-hint">{group.hint}</div> : null}
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
