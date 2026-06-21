import type { CSSProperties, ReactNode } from "react";
import Icon from "./Icon";
import arrowDownIcon from "../assets/icons/arrow-down-to-line.svg";
import xIcon from "../assets/icons/x.svg";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  zIndex?: number;
  minWidth?: string;
  cardStyle?: CSSProperties;
};

export default function ExportSelectionDialog(props: Props) {
  const canSubmit = !props.confirmDisabled;
  return (
    <div className="export-selection-backdrop" onClick={props.onClose} style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.34)", display: "grid", placeItems: "center", alignItems: "flex-start", justifyItems: "center", padding: "84px 16px 16px", zIndex: props.zIndex ?? 60 }}>
      <div className="card export-selection-card" onClick={(event) => event.stopPropagation()} style={{ width: "fit-content", maxWidth: "calc(100vw - 32px)", minWidth: props.minWidth ?? "min(420px, calc(100vw - 32px))", maxHeight: "min(68vh, 620px)", minHeight: 0, height: "auto", display: "grid", gridTemplateRows: "auto minmax(0, 1fr) auto", alignContent: "start", gap: 10, padding: 12, overflow: "hidden", ...props.cardStyle }}>
        <div className="topbar" style={{ marginBottom: 0, gap: 8, alignItems: "flex-start" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17 }}>{props.title}</h3>
            <div className="muted" style={{ marginTop: 3, fontSize: 12 }}>{props.subtitle}</div>
          </div>
        </div>
        <div style={{ display: "grid", gap: 8, alignContent: "start", overflowY: "auto", maxHeight: "min(52vh, 500px)", minHeight: 0, paddingRight: 4, minWidth: 0 }}>{props.children}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, flexWrap: "wrap", paddingTop: 0 }}>
          <button type="button" className="btn" style={{ minHeight: 40, padding: "0 14px" }} onClick={props.onClose}>
            <Icon src={xIcon} size={17} /><span>{props.cancelLabel}</span>
          </button>
          <button type="button" className="btn primary" disabled={!canSubmit} style={{ opacity: canSubmit ? 1 : 0.55 }} onClick={props.onConfirm}>
            <Icon src={arrowDownIcon} size={17} /><span>{props.confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
