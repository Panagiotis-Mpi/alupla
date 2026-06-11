// Controls του χάρτη: φίλτρα, mode, κουμπιά και επιλογές export.
import React from "react";
import Icon from "../../components/Icon";
import arrowDownIcon from "../../assets/icons/arrow-down-to-line.svg";
import globeIcon from "../../assets/icons/globe.svg";
import marsIcon from "../../assets/icons/mars.svg";
import usersIcon from "../../assets/icons/users.svg";
import venusIcon from "../../assets/icons/venus.svg";
import xIcon from "../../assets/icons/x.svg";

type MetricOption = { label: string; legend: string };
type MapMetric = "count" | "dominant_gender";
type MapScope = "greece" | "abroad";
type ExportCategoryKey = MapMetric;
type ExportScopeOption = MapScope;

type Translate = (key: string, options?: Record<string, unknown>) => string;

type ExportCategoryOption = { id: ExportCategoryKey; label: string };
type ExportScopeSelection = { category: ExportCategoryKey; scope: ExportScopeOption };
type ExportYearRange = { from: string; to: string };
type ExportCategoryRanges = Record<ExportCategoryKey, ExportYearRange>;

export function MapTopControls(props: {
  mt: Translate;
  ct: Translate;
  loading: boolean;
  mapMetric: MapMetric;
  mapScope: MapScope;
  metricOptions: Record<MapMetric, MetricOption>;
  summaryToggle?: React.ReactNode;
  timelineToggle?: React.ReactNode;
  onMetricChange: (metric: MapMetric) => void;
  onScopeChange: (scope: MapScope) => void;
  onExportClick: () => void;
}) {
  const [showScopeMenu, setShowScopeMenu] = React.useState(false);
  const scopeMenuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!scopeMenuRef.current?.contains(event.target as Node)) setShowScopeMenu(false);
    }

    if (!showScopeMenu) return;
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showScopeMenu]);

  React.useEffect(() => {
    setShowScopeMenu(false);
  }, [props.mapScope]);

  const scopeTitle = props.mt("scope.title", { defaultValue: "Χώρα καταγωγής" });
  const scopeLabel =
    props.mapScope === "greece"
      ? props.mt("scope.greece", { defaultValue: "Ελλάδα" })
      : props.mt("scope.abroad", { defaultValue: "Εξωτερικό" });

  return (
    <div className="card map-top-menu-card">
      <div className="map-top-menu-title">
        <h2>{props.mt("title", { defaultValue: "Χάρτης" })}</h2>
        <span className="map-top-menu-title-spacer" />
      </div>
      <div className="map-top-controls-row">
        {(["count", "dominant_gender"] as MapMetric[]).map((option) => (
          <button key={option} type="button" className={`btn map-metric-button ${props.mapMetric === option ? "active primary" : ""}`} onClick={() => props.onMetricChange(option)}>
            {option === "count" ? (
              <Icon src={usersIcon} size={18} />
            ) : (
              <span className="map-gender-icons" aria-hidden="true">
                <Icon src={marsIcon} size={18} />
                <Icon src={venusIcon} size={18} />
              </span>
            )}
            <span>{props.metricOptions[option].label}</span>
          </button>
        ))}
        <div className="map-top-control-slot" ref={scopeMenuRef}>
          <button
            type="button"
            className="btn map-metric-button map-dropdown-button map-scope-button"
            onClick={() => setShowScopeMenu((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={showScopeMenu}
            aria-label={`${scopeTitle}: ${scopeLabel}`}
          >
            <Icon src={globeIcon} size={18} />
            <span>{scopeTitle}</span>
            <span className={`map-dropdown-caret ${showScopeMenu ? "open" : ""}`} aria-hidden="true" />
          </button>
          {showScopeMenu ? (
            <div className="map-menu map-scope-menu" role="menu">
              {(["greece", "abroad"] as MapScope[]).map((option) => {
                const optionLabel = option === "greece"
                  ? props.mt("scope.greece", { defaultValue: "Ελλάδα" })
                  : props.mt("scope.abroad", { defaultValue: "Εξωτερικό" });
                const isActive = option === props.mapScope;
                return (
                  <button
                    key={option}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    className={`map-menu-item map-scope-menu-item ${isActive ? "active" : ""}`}
                    onClick={() => {
                      setShowScopeMenu(false);
                      if (!isActive) props.onScopeChange(option);
                    }}
                  >
                    <span>{optionLabel}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="map-top-control-slot">
          <button className="btn map-action-button" type="button" style={{ width: "100%" }} onClick={props.onExportClick}>
            <Icon src={arrowDownIcon} size={18} />
            <span>{props.mt("downloadMap", { defaultValue: "Λήψη χάρτη" })}</span>
          </button>
        </div>
      </div>
      <div className="mobile-submenu-toggle-row map-mobile-submenu-toggle-row">
        {props.summaryToggle}
        {props.timelineToggle}
      </div>
    </div>
  );
}

export function MapYearTimeline(props: {
  mt: Translate;
  years: number[];
  selectedStartYear: string;
  selectedEndYear: string;
  loading: boolean;
  onRangeChange: (startYear: string, endYear: string) => void;
}) {
  const [isCompactTimeline, setIsCompactTimeline] = React.useState(() => typeof window !== "undefined" ? window.innerWidth <= 520 : false);

  React.useEffect(() => {
    const update = () => setIsCompactTimeline(window.innerWidth <= 520);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const sortedYears = Array.from(new Set(props.years)).sort((left, right) => left - right);
  const minYear = sortedYears[0] || new Date().getFullYear();
  const maxYear = sortedYears[sortedYears.length - 1] || minYear;
  const startValue = props.selectedStartYear ? Number(props.selectedStartYear) : minYear;
  const endValue = props.selectedEndYear ? Number(props.selectedEndYear) : maxYear;
  const safeStart = Math.min(Math.max(Number.isFinite(startValue) ? startValue : minYear, minYear), maxYear);
  const safeEnd = Math.min(Math.max(Number.isFinite(endValue) ? endValue : maxYear, minYear), maxYear);
  const leftYear = Math.min(safeStart, safeEnd);
  const rightYear = Math.max(safeStart, safeEnd);
  const yearSpan = Math.max(maxYear - minYear, 1);
  const leftPercent = ((leftYear - minYear) / yearSpan) * 100;
  const rightPercent = ((rightYear - minYear) / yearSpan) * 100;
  const tickStep = isCompactTimeline ? 10 : yearSpan > 45 ? 10 : 5;
  const endpointGap = isCompactTimeline ? Math.max(7, Math.round(yearSpan * 0.12)) : 1;
  const firstTick = Math.ceil(minYear / tickStep) * tickStep;
  const ticks = [minYear];
  for (let year = firstTick; year < maxYear; year += tickStep) {
    if (year > minYear + endpointGap && year < maxYear - endpointGap) ticks.push(year);
  }
  if (!ticks.includes(maxYear)) ticks.push(maxYear);
  const isAllYears = leftYear === minYear && rightYear === maxYear;
  const selectedLabel = isAllYears
    ? props.mt("timeline.allYears", { defaultValue: "Όλες οι χρονιές" })
    : leftYear === rightYear
      ? String(leftYear)
      : `${leftYear} - ${rightYear}`;

  const emitRange = (start: number, end: number) => {
    const nextStart = Math.min(start, end);
    const nextEnd = Math.max(start, end);
    if (nextStart === minYear && nextEnd === maxYear) {
      props.onRangeChange("", "");
      return;
    }
    props.onRangeChange(String(nextStart), String(nextEnd));
  };

  return (
    <div className="card map-timeline-card">
      <div className="map-timeline-header">
        <div>
          <div className="map-timeline-title">{props.mt("timeline.title", { defaultValue: "Φίλτρο χρονιάς" })}</div>
          <div className="map-timeline-subtitle">{props.mt("timeline.subtitle", { defaultValue: "Σύρε τα δύο άκρα για να επιλέξεις εύρος χρονιών στον χάρτη." })}</div>
        </div>
        <div className="map-timeline-actions">
          <div className="map-timeline-current">{selectedLabel}</div>
        </div>
      </div>

      {sortedYears.length ? (
        <div className="map-timeline-slider-wrap">
          <div className="map-year-ruler" style={{ "--range-left": `${leftPercent}%`, "--range-right": `${100 - rightPercent}%` } as React.CSSProperties}>
            <div className="map-year-ruler-track" />
            <div className="map-year-ruler-fill" />
            <input
              type="range"
              min={minYear}
              max={maxYear}
              step={1}
              value={leftYear}
              className="map-timeline-slider map-timeline-slider-start"
              style={{ zIndex: leftYear === rightYear && leftYear > minYear ? 5 : 3 }}
              disabled={props.loading || minYear === maxYear}
              onChange={(event) => {
                const nextYear = Math.min(Number(event.target.value), rightYear);
                emitRange(nextYear, rightYear);
              }}
              aria-label={props.mt("timeline.startYear", { defaultValue: "Παλαιότερη χρονιά" })}
            />
            <input
              type="range"
              min={minYear}
              max={maxYear}
              step={1}
              value={rightYear}
              className="map-timeline-slider map-timeline-slider-end"
              style={{ zIndex: leftYear === rightYear && leftYear === minYear ? 5 : 4 }}
              disabled={props.loading || minYear === maxYear}
              onChange={(event) => {
                const nextYear = Math.max(Number(event.target.value), leftYear);
                emitRange(leftYear, nextYear);
              }}
              aria-label={props.mt("timeline.endYear", { defaultValue: "Πιο πρόσφατη χρονιά" })}
            />
          </div>
          <div className="map-timeline-scale">
            {ticks.map((year) => {
              const tickPercent = ((year - minYear) / yearSpan) * 100;
              return (
                <span key={year} style={{ left: `${tickPercent}%`, "--tick-position": `${tickPercent}%` } as React.CSSProperties}>{year}</span>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="muted">{props.loading ? props.mt("loading", { defaultValue: "Φόρτωση..." }) : props.mt("timeline.noYears", { defaultValue: "Δεν βρέθηκαν χρονιές αποφοίτησης." })}</div>
      )}
    </div>
  );
}
type ExportFormat = "png";

export function MapExportSelectionModal(props: {
  mt: Translate;
  ct: Translate;
  selectedExportFormat: ExportFormat;
  exportCategoryOptions: ExportCategoryOption[];
  selectedExportSelections: ExportScopeSelection[];
  exportingSelection: boolean;
  yearOptions: string[];
  categoryRanges: ExportCategoryRanges;
  onClose: () => void;
  onToggleAllSelections: () => void;
  onToggleScopeSelection: (category: ExportCategoryKey, scope: ExportScopeOption) => void;
  onToggleCategorySelections: (category: ExportCategoryKey) => void;
  onChangeCategoryRange: (category: ExportCategoryKey, field: keyof ExportYearRange, value: string) => void;
  onConfirm: () => void;
}) {
  const scopeOptions: ExportScopeOption[] = ["greece", "abroad"];
  const totalSelectionCount = props.exportCategoryOptions.length * scopeOptions.length;
  const allSelected = totalSelectionCount > 0 && props.selectedExportSelections.length === totalSelectionCount;
  const canSubmit = props.selectedExportSelections.length > 0 && !props.exportingSelection;
  const [openCategories, setOpenCategories] = React.useState<Record<ExportCategoryKey, boolean>>({
    count: false,
    dominant_gender: false,
  });

  function toggleCategoryOpen(category: ExportCategoryKey) {
    setOpenCategories((current) => ({ ...current, [category]: !current[category] }));
  }

  const selectionRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(148, 163, 184, 0.2)",
    background: "#fff",
    color: "#0f172a",
    cursor: "pointer",
    minHeight: 42,
    lineHeight: 1.3,
  };

  const selectionCheckboxStyle: React.CSSProperties = {
    width: 16,
    height: 16,
    margin: 0,
    flex: "0 0 auto",
    accentColor: "#2563eb",
  };
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
  const categoryRangeStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "end",
    justifyContent: "flex-end",
    gap: 6,
    flex: "0 0 auto",
    marginLeft: "auto",
    flexWrap: "nowrap",
  };

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
        zIndex: 1000,
      }}
    >
      <div
        className="card"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "fit-content",
          maxWidth: "calc(100vw - 32px)",
          minWidth: "min(400px, calc(100vw - 32px))",
          maxHeight: "min(68vh, 620px)",
          minHeight: 0,
          height: "auto",
          display: "grid",
          gridTemplateRows: "auto minmax(0, 1fr) auto",
          alignContent: "start",
          gap: 10,
          padding: 12,
          overflow: "hidden",
          background: "#ffffff",
          opacity: 1,
        }}
      >
        <div className="topbar" style={{ marginBottom: 0, gap: 8, alignItems: "flex-start" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17 }}>{props.mt("export.selectionTitle", { defaultValue: "Επιλογή κατηγοριών εξαγωγής" })}</h3>
            <div className="muted" style={{ marginTop: 3, fontSize: 12 }}>
              {props.mt("export.selectionSubtitle", { defaultValue: "Επίλεξε ποιες κατηγορίες θέλεις να κατεβάσεις" })} · {props.selectedExportFormat.toUpperCase()}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, alignContent: "start", overflowY: "auto", maxHeight: "min(52vh, 500px)", minHeight: 0, paddingRight: 4, minWidth: 0 }}>
          <label style={{ ...selectionRowStyle, fontWeight: 700 }}>
            <input type="checkbox" style={selectionCheckboxStyle} checked={allSelected} onChange={props.onToggleAllSelections} />
            <span>{props.ct("all", { defaultValue: "Όλα" })}</span>
          </label>

          {props.exportCategoryOptions.map((category) => {
            const categorySelections = props.selectedExportSelections.filter((entry) => entry.category === category.id);
            const categoryChecked = categorySelections.length === scopeOptions.length;
            const categoryOpen = openCategories[category.id];
            const range = props.categoryRanges[category.id];

            return (
              <div key={category.id} style={{ display: "grid", gap: categoryOpen ? 6 : 0, border: "1px solid rgba(148, 163, 184, 0.2)", borderRadius: 14, padding: 8, background: "rgba(248, 250, 252, 0.76)" }}>
                <div style={{ ...selectionRowStyle, fontWeight: 700, padding: "0 10px", flexWrap: "wrap", gap: 10 }}>
                  <input type="checkbox" style={selectionCheckboxStyle} checked={categoryChecked} onChange={() => props.onToggleCategorySelections(category.id)} />
                  <button
                    type="button"
                    onClick={() => toggleCategoryOpen(category.id)}
                    aria-expanded={categoryOpen}
                    style={{
                      flex: "0 1 auto",
                      minHeight: 40,
                      minWidth: 0,
                      border: 0,
                      background: "transparent",
                      color: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      gap: 10,
                      padding: 0,
                      font: "inherit",
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span>{category.label}</span>
                    <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1, marginLeft: 4 }}>{categoryOpen ? "⌃" : "⌄"}</span>
                  </button>
                  {props.yearOptions.length ? (
                    <div onClick={(event) => event.stopPropagation()} style={categoryRangeStyle}>
                      <label style={{ display: "grid", gap: 3 }}>
                        <span style={rangeLabelStyle}>{props.mt("export.from", { defaultValue: "Από" })}</span>
                        <select
                          value={range.from}
                          onChange={(event) => props.onChangeCategoryRange(category.id, "from", event.target.value)}
                          style={rangeSelectStyle}
                          aria-label={`${category.label} ${props.mt("export.from", { defaultValue: "Από" })}`}
                        >
                          {props.yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                        </select>
                      </label>
                      <label style={{ display: "grid", gap: 3 }}>
                        <span style={rangeLabelStyle}>{props.mt("export.to", { defaultValue: "Έως" })}</span>
                        <select
                          value={range.to}
                          onChange={(event) => props.onChangeCategoryRange(category.id, "to", event.target.value)}
                          style={rangeSelectStyle}
                          aria-label={`${category.label} ${props.mt("export.to", { defaultValue: "Έως" })}`}
                        >
                          {props.yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                        </select>
                      </label>
                    </div>
                  ) : null}
                </div>
                {categoryOpen ? (
                  <div style={{ display: "grid", gap: 6 }}>
                    {scopeOptions.map((scope) => {
                      const checked = props.selectedExportSelections.some((entry) => entry.category === category.id && entry.scope === scope);
                      const scopeLabel = scope === "greece"
                        ? props.mt("scope.greece", { defaultValue: "Ελλάδα" })
                        : props.mt("scope.abroad", { defaultValue: "Εξωτερικό" });
                      return (
                        <label key={`${category.id}-${scope}`} style={{ ...selectionRowStyle, flex: "1 1 auto", minWidth: 0 }}>
                          <input type="checkbox" style={selectionCheckboxStyle} checked={checked} onChange={() => props.onToggleScopeSelection(category.id, scope)} />
                          <span>{scopeLabel}</span>
                        </label>
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
            <span>{props.ct("cancel", { defaultValue: "Ακύρωση" })}</span>
          </button>
          <button type="button" className="btn primary" disabled={!canSubmit} style={{ opacity: canSubmit ? 1 : 0.55 }} onClick={props.onConfirm}>
            <Icon src={arrowDownIcon} size={17} />
            <span>{props.exportingSelection ? props.ct("loading", { defaultValue: "Φόρτωση..." }) : props.mt("export.exportSelected", { defaultValue: "Εξαγωγή επιλεγμένων" })}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
