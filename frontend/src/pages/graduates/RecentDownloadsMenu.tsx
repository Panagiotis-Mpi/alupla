import React from "react";
import Icon from "../../components/Icon";
import arrowDownIcon from "../../assets/icons/arrow-down-to-line.svg";
import historyIcon from "../../assets/icons/history.svg";
import {
  formatRecentGraduateDownloadDate,
  type RecentGraduateDownload,
} from "./recentDownloads";

export function RecentDownloadsMenu(props: {
  containerRef: React.Ref<HTMLDivElement>;
  open: boolean;
  onToggle: () => void;
  buttonStyle: React.CSSProperties;
  downloads: RecentGraduateDownload[];
  activeLang: "gr" | "en";
  t: (key: string, options?: Record<string, unknown>) => string;
  onDownload: (item: RecentGraduateDownload) => void;
  onRemove: (itemId: string) => void;
}) {
  const {
    containerRef,
    open,
    onToggle,
    buttonStyle,
    downloads,
    activeLang,
    t,
    onDownload,
    onRemove,
  } = props;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        className="btn dropdown-like"
        type="button"
        style={{ ...buttonStyle, width: "100%", justifyContent: "center" }}
        onClick={onToggle}
      >
        <Icon src={historyIcon} size={18} />
        <span>{t("topbar.myFrequentDownloads")}</span>
        <span className="btn-dropdown-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            width: 380,
            maxWidth: "calc(100vw - 32px)",
            background: "#fff",
            border: "1px solid rgba(15,23,42,.12)",
            borderRadius: 12,
            boxShadow: "0 12px 30px rgba(15,23,42,.12)",
            padding: 10,
            display: "grid",
            gap: 10,
            zIndex: 30,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 700 }}>
              {t("topbar.myFrequentDownloads")}
            </div>
            {downloads.length ? (
              <span className="badge">{downloads.length}</span>
            ) : null}
          </div>
          {downloads.length ? (
            <div
              style={{
                display: "grid",
                gap: 8,
                maxHeight: 420,
                overflowY: "auto",
              }}
            >
              {downloads.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: "1px solid rgba(15,23,42,.08)",
                    borderRadius: 12,
                    padding: 10,
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>
                      {item.format.toUpperCase()}
                    </div>
                    <span className="badge">
                      {t("topbar.downloadCount", { count: item.count })}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, wordBreak: "break-word" }}>
                    {item.fileName}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {item.filtersLabel}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {t("topbar.lastDownload", {
                      date: formatRecentGraduateDownloadDate(
                        item.lastDownloadedAt,
                        activeLang,
                      ),
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => onDownload(item)}
                    >
                      <Icon src={arrowDownIcon} size={17} />
                      <span>{t("topbar.downloadAgain")}</span>
                    </button>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => onRemove(item.id)}
                    >
                      {t("topbar.removeDownload")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="muted">{t("topbar.noDownloadsYet")}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
