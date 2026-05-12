// Controls του χάρτη: φίλτρα, mode, κουμπιά και επιλογές export.
import React from "react";

type MetricOption = { label: string; legend: string };
type MapMetric = "count" | "dominant_gender";
type MapScope = "greece" | "abroad";
type ExportCategoryKey = MapMetric;
type ExportScopeOption = MapScope;

type Translate = (key: string, options?: Record<string, unknown>) => string;

type ExportCategoryOption = { id: ExportCategoryKey; label: string };
type ExportScopeSelection = { category: ExportCategoryKey; scope: ExportScopeOption };

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
            {props.metricOptions[option].label}
          </button>
        ))}
        <div className="map-top-control-slot" ref={scopeMenuRef}>
          <button
            type="button"
            className="btn map-metric-button map-dropdown-button map-scope-button"
            onClick={() => setShowScopeMenu((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={showScopeMenu}
          >
            <span className="map-scope-button-label">{scopeLabel}</span>
            <span className={`map-dropdown-caret ${showScopeMenu ? "open" : ""}`} aria-hidden="true" />
          </button>
          {showScopeMenu ? (
            <div className="map-menu map-scope-menu">
              {(["greece", "abroad"] as MapScope[])
                .filter((option) => option !== props.mapScope)
                .map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="map-menu-item"
                    onClick={() => {
                      setShowScopeMenu(false);
                      props.onScopeChange(option);
                    }}
                  >
                    <span>
                      {option === "greece"
                        ? props.mt("scope.greece", { defaultValue: "Ελλάδα" })
                        : props.mt("scope.abroad", { defaultValue: "Εξωτερικό" })}
                    </span>
                  </button>
                ))}
            </div>
          ) : null}
        </div>
        <div className="map-top-control-slot">
          <button className="btn map-action-button" type="button" style={{ width: "100%" }} onClick={props.onExportClick}>
            {props.mt("downloadMap", { defaultValue: "Λήψη χάρτη" })}
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
            {ticks.map((year) => (
              <span key={year} style={{ left: `${((year - minYear) / yearSpan) * 100}%` }}>{year}</span>
            ))}
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
  onClose: () => void;
  onToggleAllSelections: () => void;
  onToggleScopeSelection: (category: ExportCategoryKey, scope: ExportScopeOption) => void;
  onToggleCategorySelections: (category: ExportCategoryKey) => void;
  onConfirm: () => void;
}) {
  const scopeOptions: ExportScopeOption[] = ["greece", "abroad"];
  const totalSelectionCount = props.exportCategoryOptions.length * scopeOptions.length;
  const canSubmit = props.selectedExportSelections.length > 0 && !props.exportingSelection;
  const [isCompactExportModal, setIsCompactExportModal] = React.useState(() => typeof window !== "undefined" ? window.innerWidth <= 560 : false);

  React.useEffect(() => {
    const update = () => setIsCompactExportModal(window.innerWidth <= 560);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div
      onClick={props.onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.34)",
        display: "grid",
        placeItems: "center",
        padding: isCompactExportModal ? 12 : 16,
        zIndex: 1000,
      }}
    >
      <div
        className="card"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: isCompactExportModal ? "min(520px, 100%)" : "min(560px, 100%)",
          maxHeight: isCompactExportModal ? "min(82dvh, 680px)" : "min(68vh, 680px)",
          display: "grid",
          gridTemplateRows: "auto minmax(0, 1fr) auto",
          gap: isCompactExportModal ? 8 : 10,
          padding: isCompactExportModal ? 12 : 14,
          overflow: "hidden",
          background: "#ffffff",
          opacity: 1,
        }}
      >
        <div className="topbar" style={{ marginBottom: 0, gap: 10, alignItems: "flex-start" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18 }}>{props.mt("export.selectionTitle", { defaultValue: "Επιλογή κατηγοριών εξαγωγής" })}</h3>
            <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
              {props.mt("export.selectionSubtitle", { defaultValue: "Επίλεξε ποιες κατηγορίες θέλεις να κατεβάσεις" })} · {props.selectedExportFormat.toUpperCase()}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: isCompactExportModal ? 10 : 10, overflowY: "auto", minHeight: 0, paddingRight: isCompactExportModal ? 2 : 4, paddingBottom: 2 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, minHeight: isCompactExportModal ? 42 : undefined }}>
            <input type="checkbox" checked={props.selectedExportSelections.length === totalSelectionCount && totalSelectionCount > 0} onChange={props.onToggleAllSelections} />
            <span>{props.ct("all", { defaultValue: "Όλα" })}</span>
          </label>

          {props.exportCategoryOptions.map((category) => {
            const categorySelections = props.selectedExportSelections.filter((entry) => entry.category === category.id);
            const categoryChecked = categorySelections.length === scopeOptions.length;

            return (
              <div key={category.id} style={{ display: "grid", gap: isCompactExportModal ? 10 : 8, border: "1px solid rgba(148, 163, 184, 0.2)", borderRadius: 14, padding: isCompactExportModal ? 12 : 12, background: "#f8fafc" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, minHeight: isCompactExportModal ? 34 : undefined }}>
                  <input type="checkbox" checked={categoryChecked} onChange={() => props.onToggleCategorySelections(category.id)} />
                  <span>{category.label}</span>
                </label>
                <div style={{ display: "grid", gap: 6, paddingLeft: 18 }}>
                  {scopeOptions.map((scope) => {
                    const checked = props.selectedExportSelections.some((entry) => entry.category === category.id && entry.scope === scope);
                    const scopeLabel = scope === "greece"
                      ? props.mt("scope.greece", { defaultValue: "Ελλάδα" })
                      : props.mt("scope.abroad", { defaultValue: "Εξωτερικό" });
                    return (
                      <label key={`${category.id}-${scope}`} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: isCompactExportModal ? 34 : undefined }}>
                        <input type="checkbox" checked={checked} onChange={() => props.onToggleScopeSelection(category.id, scope)} />
                        <span>{scopeLabel}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, paddingTop: 10, borderTop: "1px solid rgba(148, 163, 184, 0.18)", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn primary"
            disabled={!canSubmit}
            style={{ minHeight: isCompactExportModal ? 46 : 42, padding: "0 16px", width: 210, opacity: canSubmit ? 1 : 0.55 }}
            onClick={props.onConfirm}
          >
            {props.exportingSelection ? props.ct("loading", { defaultValue: "Φόρτωση..." }) : props.mt("export.exportSelected", { defaultValue: "Εξαγωγή επιλεγμένων" })}
          </button>
          <button type="button" className="btn" style={{ minHeight: isCompactExportModal ? 44 : 40, padding: "0 16px", width: 210 }} onClick={props.onClose}>
            {props.ct("cancel", { defaultValue: "Ακύρωση" })}
          </button>
        </div>
      </div>
    </div>
  );
}
