import React from "react";
import type { TFunction } from "i18next";
import {
  pageMenuButtonStyle,
  pageMenuButtonsStyle,
  pageMenuCardStyle,
  pageMenuTitleStyle,
} from "./shared";

type Props = {
  t: TFunction<"academicData", undefined>;
  importFileRef: React.RefObject<HTMLInputElement | null>;
  handleTemplateDownload: () => Promise<void>;
  handleImportChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export function AcademicDataMenu({
  t,
  importFileRef,
  handleTemplateDownload,
  handleImportChange,
}: Props) {
  return (
    <div className="card" style={pageMenuCardStyle}>
      <div className="topbar" style={{ alignItems: "center", justifyContent: "flex-start", gap: 14 }}>
        <h2 style={pageMenuTitleStyle}>{t("title")}</h2>
      </div>

      <div className="topbar" style={pageMenuButtonsStyle}>
        <button className="btn primary" style={pageMenuButtonStyle}>{t("menu.programs")}</button>
        <button className="btn" style={pageMenuButtonStyle} onClick={() => importFileRef.current?.click()}>{t("menu.import")}</button>
        <button className="btn" style={pageMenuButtonStyle} onClick={() => void handleTemplateDownload()}>{t("menu.template")}</button>
        <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleImportChange} />
      </div>
    </div>
  );
}
