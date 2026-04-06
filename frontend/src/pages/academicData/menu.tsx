import React from "react";
import type { TFunction } from "i18next";
import {
  menuWrapStyle,
  pageMenuButtonStyle,
  pageMenuButtonsStyle,
  pageMenuCardStyle,
  pageMenuStatsStyle,
  pageMenuTitleStyle,
  popoverItemStyle,
  popoverStyle,
  type AcademicTab,
  type ImportMenu,
} from "./shared";

type Props = {
  t: TFunction<"academicData", undefined>;
  activeTab: AcademicTab;
  activeCountLabel: string;
  openMenu: ImportMenu;
  menuAreaRef: React.RefObject<HTMLDivElement | null>;
  importFileRef: React.RefObject<HTMLInputElement | null>;
  setActiveTab: (tab: AcademicTab) => void;
  setOpenMenu: React.Dispatch<React.SetStateAction<ImportMenu>>;
  openImportPicker: (target: ImportMenu) => void;
  handleTemplateDownload: (target: Exclude<ImportMenu, null>) => Promise<void>;
  handleImportChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export function AcademicDataMenu({
  t,
  activeTab,
  activeCountLabel,
  openMenu,
  menuAreaRef,
  importFileRef,
  setActiveTab,
  setOpenMenu,
  openImportPicker,
  handleTemplateDownload,
  handleImportChange,
}: Props) {
  return (
    <div className="card" style={pageMenuCardStyle}>
      <div className="topbar" style={{ alignItems: "center", justifyContent: "flex-start", gap: 14 }}>
        <h2 style={pageMenuTitleStyle}>{t("title")}</h2>
        <span style={pageMenuStatsStyle}>{activeCountLabel}</span>
      </div>

      <div className="topbar" style={pageMenuButtonsStyle} ref={menuAreaRef}>
        <button className={`btn ${activeTab === "programs" ? "primary" : ""}`} style={pageMenuButtonStyle} onClick={() => setActiveTab("programs")}>{t("menu.programs")}</button>
        <button className={`btn ${activeTab === "directions" ? "primary" : ""}`} style={pageMenuButtonStyle} onClick={() => setActiveTab("directions")}>{t("menu.directions")}</button>

        <div style={menuWrapStyle}>
          <button className="btn" style={pageMenuButtonStyle} onClick={() => setOpenMenu((current) => current === "programs" ? null : "programs")}>{t("menu.import")}</button>
          {openMenu === "programs" && (
            <div style={popoverStyle}>
              <button className="btn" style={popoverItemStyle} onClick={() => openImportPicker("programs")}>{t("menu.importPrograms")}</button>
              <button className="btn" style={{ ...popoverItemStyle, marginBottom: 0 }} onClick={() => openImportPicker("directions")}>{t("menu.importDirections")}</button>
            </div>
          )}
        </div>

        <div style={menuWrapStyle}>
          <button className="btn" style={pageMenuButtonStyle} onClick={() => setOpenMenu((current) => current === "directions" ? null : "directions")}>{t("menu.template")}</button>
          {openMenu === "directions" && (
            <div style={popoverStyle}>
              <button className="btn" style={popoverItemStyle} onClick={() => void handleTemplateDownload("programs")}>{t("menu.templatePrograms")}</button>
              <button className="btn" style={{ ...popoverItemStyle, marginBottom: 0 }} onClick={() => void handleTemplateDownload("directions")}>{t("menu.templateDirections")}</button>
            </div>
          )}
        </div>

        <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleImportChange} />
      </div>
    </div>
  );
}
