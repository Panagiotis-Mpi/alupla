// Modal επιλογής ενοτήτων που θα μπουν στο export στατιστικών.
import React from "react";
import Icon from "../../components/Icon";
import fileSpreadsheetIcon from "../../assets/icons/file-spreadsheet.svg";
import chartIcon from "../../assets/icons/chart-column-big.svg";
import arrowDownIcon from "../../assets/icons/arrow-down-to-line.svg";
import xIcon from "../../assets/icons/x.svg";
import type { StatisticsChartId } from "../statisticsExport";

type Translate = (key: string, options?: Record<string, unknown>) => string;

type ChartGroupKey = "demographics" | "academic" | "geography" | "compare";

type ChartGroup = {
  key: ChartGroupKey;
  label: string;
  charts: Array<{ id: StatisticsChartId; label: string }>;
};

type ExportYearRange = { from: string; to: string };

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
        <Icon src={fileSpreadsheetIcon} size={18} />
        <span>{props.t("actions.export", { defaultValue: "Εξαγωγή" })}</span>
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
          <button className="btn" type="button" style={{ ...props.topButtonStyle, justifyContent: "flex-start" }} onClick={() => props.onPick("xlsx")}><Icon src={fileSpreadsheetIcon} size={17} /><span>Excel</span></button>
          <button className="btn" type="button" style={{ ...props.topButtonStyle, justifyContent: "flex-start" }} onClick={() => props.onPick("csv")}><Icon src={fileSpreadsheetIcon} size={17} /><span>CSV</span></button>
          <button className="btn" type="button" style={{ ...props.topButtonStyle, justifyContent: "flex-start" }} onClick={() => props.onPick("png")}><Icon src={chartIcon} size={17} /><span>PNG</span></button>
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
  yearOptions: string[];
  groupRanges: Record<ChartGroupKey, ExportYearRange>;
  selectionRowStyle: React.CSSProperties;
  selectionCheckboxStyle: React.CSSProperties;
  onClose: () => void;
  onToggleAll: () => void;
  onToggleGroup: (chartIds: StatisticsChartId[]) => void;
  onToggleChart: (chartId: StatisticsChartId) => void;
  onChangeGroupRange: (groupKey: ChartGroupKey, field: keyof ExportYearRange, value: string) => void;
  onConfirm: () => void;
  isPngExport?: boolean;
  genderEntryYearOptions?: Array<{ value: string; label: string }>;
  selectedGenderEntryYears?: string[];
  onToggleGenderEntryYear?: (year: string) => void;
  onToggleAllGenderEntryYears?: () => void;
}) {
  const [openYearPicker, setOpenYearPicker] = React.useState(false);
  const [openGroups, setOpenGroups] = React.useState<Record<ChartGroup["key"], boolean>>({
    demographics: false,
    academic: false,
    geography: false,
    compare: false,
  });
  const confirmDisabled = !props.selectedChartIds.length || !!(props.isPngExport && props.selectedChartIds.includes("genderByEntryYear") && !props.selectedGenderEntryYears?.length);
  const rangeLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#64748b", lineHeight: 1 };
  const rangeSelectStyle: React.CSSProperties = {
    minHeight: 30,
    width: 78,
    borderRadius: 9,
    border: "1px solid rgba(148, 163, 184, 0.34)",
    background: "#fff",
    color: "#0f172a",
    fontSize: 12,
    fontWeight: 700,
    padding: "0 7px",
    outline: "none",
  };

  React.useEffect(() => {
    if (!props.isPngExport || !props.selectedChartIds.includes("genderByEntryYear")) {
      setOpenYearPicker(false);
    }
  }, [props.isPngExport, props.selectedChartIds]);

  function toggleGroupOpen(groupKey: ChartGroup["key"]) {
    setOpenGroups((current) => ({ ...current, [groupKey]: !current[groupKey] }));
  }

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
          minHeight: 0,
          height: "auto",
          display: "grid",
          gridTemplateRows: "auto minmax(0, 1fr) auto",
          alignContent: "start",
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

        <div style={{ display: "grid", gap: 8, alignContent: "start", overflowY: "auto", maxHeight: "min(52vh, 500px)", minHeight: 0, paddingRight: 4 }}>
          <label style={{ ...props.selectionRowStyle, fontWeight: 700 }}>
            <input type="checkbox" style={props.selectionCheckboxStyle} checked={props.allChartsSelected} onChange={props.onToggleAll} />
            <span>{props.t("actions.selectAll", { defaultValue: "Όλα" })}</span>
          </label>
          {props.chartGroups.map((group) => {
            const groupChartIds = group.charts.map((chart) => chart.id);
            const groupChecked = groupChartIds.every((id) => props.selectedChartIds.includes(id));
            const canExpand = group.key !== "compare" && group.charts.length > 0;
            const groupOpen = canExpand && openGroups[group.key];
            const range = props.groupRanges[group.key];

            return (
              <div key={group.key} style={{ display: "grid", gap: groupOpen ? 6 : 0, border: "1px solid rgba(148, 163, 184, 0.2)", borderRadius: 14, padding: 8, background: "rgba(248, 250, 252, 0.76)" }}>
                <div style={{ ...props.selectionRowStyle, fontWeight: 700, padding: "0 10px", flexWrap: "wrap", gap: 10 }}>
                  <input type="checkbox" style={props.selectionCheckboxStyle} checked={groupChecked} onChange={() => props.onToggleGroup(groupChartIds)} />
                  {canExpand ? (
                  <button
                    type="button"
                    onClick={() => toggleGroupOpen(group.key)}
                    aria-expanded={groupOpen}
                    style={{
                      flex: "1 1 180px",
                      minHeight: 40,
                      minWidth: 0,
                      border: 0,
                      background: "transparent",
                      color: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: 0,
                      font: "inherit",
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span>{group.label}</span>
                    <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>{groupOpen ? "⌃" : "⌄"}</span>
                  </button>
                  ) : (
                    <div style={{ flex: "1 1 180px", minHeight: 40, minWidth: 0, display: "flex", alignItems: "center", fontWeight: 700 }}>
                      <span>{group.label}</span>
                    </div>
                  )}
                  {props.yearOptions.length ? (
                    <div onClick={(event) => event.stopPropagation()} style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, flex: "0 0 auto", marginLeft: "auto" }}>
                      <label style={{ display: "grid", gap: 3 }}>
                        <span style={rangeLabelStyle}>{props.t("actions.from", { defaultValue: "Από" })}</span>
                        <select
                          value={range.from}
                          onChange={(event) => props.onChangeGroupRange(group.key, "from", event.target.value)}
                          style={rangeSelectStyle}
                          aria-label={`${group.label} ${props.t("actions.from", { defaultValue: "Από" })}`}
                        >
                          {props.yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                        </select>
                      </label>
                      <label style={{ display: "grid", gap: 3 }}>
                        <span style={rangeLabelStyle}>{props.t("actions.to", { defaultValue: "Έως" })}</span>
                        <select
                          value={range.to}
                          onChange={(event) => props.onChangeGroupRange(group.key, "to", event.target.value)}
                          style={rangeSelectStyle}
                          aria-label={`${group.label} ${props.t("actions.to", { defaultValue: "Έως" })}`}
                        >
                          {props.yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                        </select>
                      </label>
                    </div>
                  ) : null}
                </div>
                {groupOpen ? (
                <div style={{ display: "grid", gap: 6 }}>
                  {group.charts.map((chart) => {
                    const showYearOptions = props.isPngExport && chart.id === "genderByEntryYear" && props.selectedChartIds.includes(chart.id) && (props.genderEntryYearOptions?.length ?? 0) > 0;
                    const allYearsSelected = !!props.genderEntryYearOptions?.length && props.genderEntryYearOptions.every((option) => props.selectedGenderEntryYears?.includes(option.value));

                    const selectedYearsText = (props.selectedGenderEntryYears?.length ?? 0) === props.genderEntryYearOptions?.length
                      ? props.t("actions.allYearsSelected", { defaultValue: "Όλα τα έτη" })
                      : props.t("actions.selectedYearsCount", { defaultValue: "{{count}} έτη", count: props.selectedGenderEntryYears?.length ?? 0 });

                    return (
                      <div key={chart.id} style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, zIndex: showYearOptions && openYearPicker ? 8 : 1 }}>
                        <label style={{ ...props.selectionRowStyle, flex: "1 1 auto", minWidth: 0 }}>
                          <input type="checkbox" style={props.selectionCheckboxStyle} checked={props.selectedChartIds.includes(chart.id)} onChange={() => props.onToggleChart(chart.id)} />
                          <span>{chart.label}</span>
                        </label>
                        {showYearOptions ? (
                          <div style={{ position: "relative", flex: "0 0 auto" }}>
                            <button
                              type="button"
                              className="btn"
                              style={{
                                width: 132,
                                minHeight: 32,
                                justifyContent: "space-between",
                                padding: "0 9px",
                                fontSize: 12,
                                fontWeight: 600,
                                borderRadius: 10,
                              }}
                              onClick={() => setOpenYearPicker((value) => !value)}
                            >
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedYearsText}</span>
                              <span aria-hidden="true">⌄</span>
                            </button>
                            {openYearPicker ? (
                              <div
                                style={{
                                  position: "absolute",
                                  top: "calc(100% + 6px)",
                                  right: 0,
                                  width: 180,
                                  maxHeight: 220,
                                  overflowY: "auto",
                                  border: "1px solid rgba(148, 163, 184, 0.28)",
                                  borderRadius: 12,
                                  background: "#fff",
                                  boxShadow: "0 16px 32px rgba(15, 23, 42, 0.12)",
                                  padding: 6,
                                  display: "grid",
                                  gap: 4,
                                  zIndex: 30,
                                }}
                              >
                                <label style={{ ...props.selectionRowStyle, minHeight: 34, padding: "6px 8px", fontSize: 13, fontWeight: 700 }}>
                                  <input type="checkbox" style={props.selectionCheckboxStyle} checked={allYearsSelected} onChange={props.onToggleAllGenderEntryYears} />
                                  <span>{props.t("actions.selectAllYears", { defaultValue: "Όλα τα έτη" })}</span>
                                </label>
                                {props.genderEntryYearOptions?.map((option) => (
                                  <label key={option.value} style={{ ...props.selectionRowStyle, minHeight: 32, padding: "5px 8px", fontSize: 13 }}>
                                    <input type="checkbox" style={props.selectionCheckboxStyle} checked={props.selectedGenderEntryYears?.includes(option.value) ?? false} onChange={() => props.onToggleGenderEntryYear?.(option.value)} />
                                    <span>{option.label}</span>
                                  </label>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, flexWrap: "wrap", paddingTop: 0 }}>
          <button type="button" className="btn" style={{ minHeight: 40, padding: "0 14px" }} onClick={props.onClose}>
            <Icon src={xIcon} size={17} />
            <span>{props.t("actions.cancel", { defaultValue: "Ακύρωση" })}</span>
          </button>
          <button type="button" className="btn primary" disabled={confirmDisabled} style={{ opacity: confirmDisabled ? 0.55 : 1 }} onClick={props.onConfirm}>
            <Icon src={arrowDownIcon} size={17} />
            <span>{props.t("actions.exportSelected", { defaultValue: "Εξαγωγή επιλεγμένων" })}</span>
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
