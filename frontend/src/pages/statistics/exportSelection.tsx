// Modal επιλογής ενοτήτων που θα μπουν στο export στατιστικών.
import React from "react";
import type { StatisticsChartId } from "../statisticsExport";

type Translate = (key: string, options?: Record<string, unknown>) => string;

type ChartGroup = {
  key: "demographics" | "academic" | "geography";
  label: string;
  charts: Array<{ id: StatisticsChartId; label: string }>;
};

export function StatisticsExportMenu(props: {
  t: Translate;
  open: boolean;
  topButtonStyle: React.CSSProperties;
  onToggle: () => void;
  onPick: (format: "xlsx" | "csv" | "png") => void;
}) {
  return (
    <div style={{ position: "relative" }}>
      <button className="btn" type="button" style={props.topButtonStyle} onClick={props.onToggle}>
        {props.t("actions.export", { defaultValue: "Εξαγωγή" })}
      </button>
      {props.open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 180,
            borderRadius: 14,
            border: "1px solid rgba(148, 163, 184, 0.28)",
            background: "#fff",
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.16)",
            padding: 8,
            zIndex: 20,
            display: "grid",
            gap: 6,
          }}
        >
          <button className="btn" type="button" style={{ ...props.topButtonStyle, justifyContent: "flex-start" }} onClick={() => props.onPick("xlsx")}>Excel</button>
          <button className="btn" type="button" style={{ ...props.topButtonStyle, justifyContent: "flex-start" }} onClick={() => props.onPick("csv")}>CSV</button>
          <button className="btn" type="button" style={{ ...props.topButtonStyle, justifyContent: "flex-start" }} onClick={() => props.onPick("png")}>PNG</button>
        </div>
      ) : null}
    </div>
  );
}

export function StatisticsExportSelectionModal(props: {
  t: Translate;
  exportFormatLabel: string;
  chartGroups: ChartGroup[];
  selectedChartIds: StatisticsChartId[];
  allChartsSelected: boolean;
  selectionRowStyle: React.CSSProperties;
  selectionCheckboxStyle: React.CSSProperties;
  onClose: () => void;
  onToggleAll: () => void;
  onToggleGroup: (chartIds: StatisticsChartId[]) => void;
  onToggleChart: (chartId: StatisticsChartId) => void;
  onConfirm: () => void;
}) {
  return (
    <div
      onClick={props.onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.34)",
        display: "grid",
        placeItems: "center",
        alignItems: "flex-start",
        justifyItems: "center",
        padding: "84px 16px 16px",
        zIndex: 60,
      }}
    >
      <div
        className="card"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(640px, 100%)",
          maxHeight: "min(68vh, 620px)",
          display: "grid",
          gridTemplateRows: "auto minmax(0, 1fr) auto",
          gap: 10,
          padding: 12,
          overflow: "hidden",
        }}
      >
        <div className="topbar" style={{ marginBottom: 0, gap: 8, alignItems: "flex-start" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17 }}>{props.t("actions.exportSelectionTitle", { defaultValue: "Επιλογή διαγραμμάτων" })}</h3>
            <div className="muted" style={{ marginTop: 3, fontSize: 12 }}>
              {props.t("actions.exportSelectionSubtitle", { defaultValue: "Επίλεξε ποια διαγράμματα θέλεις να κατεβάσεις" })} · {props.exportFormatLabel}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, overflowY: "auto", minHeight: 0, paddingRight: 4 }}>
          <label style={{ ...props.selectionRowStyle, fontWeight: 700 }}>
            <input type="checkbox" style={props.selectionCheckboxStyle} checked={props.allChartsSelected} onChange={props.onToggleAll} />
            <span>{props.t("actions.selectAll", { defaultValue: "Όλα" })}</span>
          </label>

          {props.chartGroups.map((group) => {
            const groupChartIds = group.charts.map((chart) => chart.id);
            const groupChecked = groupChartIds.every((id) => props.selectedChartIds.includes(id));

            return (
              <div key={group.key} style={{ display: "grid", gap: 6, border: "1px solid rgba(148, 163, 184, 0.2)", borderRadius: 14, padding: 8, background: "rgba(248, 250, 252, 0.76)" }}>
                <label style={{ ...props.selectionRowStyle, fontWeight: 700 }}>
                  <input type="checkbox" style={props.selectionCheckboxStyle} checked={groupChecked} onChange={() => props.onToggleGroup(groupChartIds)} />
                  <span>{group.label}</span>
                </label>
                <div style={{ display: "grid", gap: 6 }}>
                  {group.charts.map((chart) => (
                    <label key={chart.id} style={props.selectionRowStyle}>
                      <input type="checkbox" style={props.selectionCheckboxStyle} checked={props.selectedChartIds.includes(chart.id)} onChange={() => props.onToggleChart(chart.id)} />
                      <span>{chart.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", paddingTop: 0 }}>
          <button type="button" className="btn" style={{ minHeight: 40, padding: "0 14px" }} onClick={props.onClose}>
            {props.t("actions.cancel", { defaultValue: "Ακύρωση" })}
          </button>
          <button type="button" className="btn primary" disabled={!props.selectedChartIds.length} style={{ opacity: props.selectedChartIds.length ? 1 : 0.55 }} onClick={props.onConfirm}>
            {props.t("actions.exportSelected", { defaultValue: "Εξαγωγή επιλεγμένων" })}
          </button>
        </div>
      </div>
    </div>
  );
}

export function toggleChartSelection(current: StatisticsChartId[], chartId: StatisticsChartId) {
  return current.includes(chartId) ? current.filter((item) => item !== chartId) : [...current, chartId];
}

export function toggleChartGroupSelection(current: StatisticsChartId[], groupChartIds: StatisticsChartId[]) {
  const everySelected = groupChartIds.every((id) => current.includes(id));
  return everySelected
    ? current.filter((id) => !groupChartIds.includes(id))
    : [...new Set([...current, ...groupChartIds])];
}

export function toggleAllChartsSelection(current: StatisticsChartId[], allChartIds: StatisticsChartId[]) {
  return current.length === allChartIds.length ? [] : [...allChartIds];
}
