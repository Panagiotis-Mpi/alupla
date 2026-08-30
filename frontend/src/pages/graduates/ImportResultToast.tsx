import { useMemo } from "react";
import type { ImportReport } from "../../lib/api";
import {
  getImportColumnLabel,
  getImportIssueHint,
  groupImportErrors,
} from "./importFeedback";

export type GraduateToastState = {
  type: "success" | "error" | "loading";
  title: string;
  detail?: string;
};

export function ImportResultToast(props: {
  toast: GraduateToastState | null;
  report: ImportReport | null;
  showDetails: boolean;
  onToggleDetails: () => void;
  onClose: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const { toast, report, showDetails, onToggleDetails, onClose, t } = props;
  const issues = useMemo(() => groupImportErrors(report?.errors), [report]);

  if (!toast) return null;

  const accent = toast.type === "success" ? "#16a34a" : toast.type === "error" ? "#dc2626" : "#2563eb";

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 9999,
        width: 360,
        maxWidth: "calc(100vw - 32px)",
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.12)",
        borderLeft: `6px solid ${accent}`,
        borderRadius: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
        padding: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontWeight: 700 }}>{toast.title}</div>
          {toast.detail ? (
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
              {toast.detail}
            </div>
          ) : null}
        </div>
        {toast.type !== "loading" ? (
          <button
            className="btn"
            type="button"
            onClick={onClose}
            style={{ padding: "6px 10px" }}
            aria-label="Close"
          >
            ✕
          </button>
        ) : null}
      </div>
      {report?.summary ? (
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn" type="button" onClick={onToggleDetails}>
              {showDetails ? t("toast.less") : t("toast.more")}
            </button>
          </div>
          {showDetails ? (
            <div
              style={{
                maxHeight: 260,
                overflowY: "auto",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 10,
                padding: 10,
                background: "rgba(248,250,252,.9)",
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                <div>
                  {t("toast.detailsInserted", {
                    inserted: Number(report.summary.inserted ?? 0),
                  })}
                </div>
                <div>
                  {t("toast.detailsUpdated", {
                    updated: Number(report.summary.updated ?? 0),
                  })}
                </div>
                <div>
                  {t("toast.detailsSkipped", {
                    skipped: Number(report.summary.skipped ?? 0),
                  })}
                </div>
                <div style={{ marginTop: 2, opacity: 0.9 }}>
                  {issues.length
                    ? t("toast.detailsIssues", { count: issues.length })
                    : t("toast.detailsNoIssues")}
                </div>
              </div>
              {issues.length ? (
                <div
                  style={{
                    borderTop: "1px solid rgba(0,0,0,0.06)",
                    paddingTop: 10,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  {issues.map((issue, index) => {
                    const rowsPreview = issue.rows.slice(0, 8).join(", ");
                    return (
                      <div
                        key={issue.key}
                        style={{
                          borderBottom:
                            index === issues.length - 1
                              ? "none"
                              : "1px solid rgba(0,0,0,0.06)",
                          paddingBottom: 8,
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>
                          {t("toast.issueFieldTitle", {
                            field: getImportColumnLabel(issue.column, t),
                            count: issue.rows.length,
                          })}
                        </div>
                        <div style={{ fontSize: 13, marginTop: 4 }}>
                          {getImportIssueHint(issue.column, issue.reasons, t)}
                        </div>
                        {issue.rows.length ? (
                          <div
                            style={{
                              fontSize: 12,
                              opacity: 0.84,
                              marginTop: 6,
                            }}
                          >
                            {t("toast.issueRows", {
                              rows:
                                issue.rows.length > 8
                                  ? `${rowsPreview}…`
                                  : rowsPreview,
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
