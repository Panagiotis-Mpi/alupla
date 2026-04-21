import React from "react";

type MetricOption = { label: string; legend: string };
type MapMetric = "count" | "dominant_gender";
type MapScope = "greece" | "abroad";
type ExportCategoryKey = MapMetric;

type Translate = (key: string, options?: Record<string, unknown>) => string;

type ExportCategoryOption = { id: ExportCategoryKey; label: string };

export function MapTopControls(props: {
  mt: Translate;
  ct: Translate;
  loading: boolean;
  total: number;
  mapMetric: MapMetric;
  mapScope: MapScope;
  metricOptions: Record<MapMetric, MetricOption>;
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
        <h2>{props.mt("title", { defaultValue: "Χάρτης αποφοίτων" })}</h2>
        <span className="badge">{props.loading ? props.ct("loading", { defaultValue: "Φόρτωση..." }) : `${props.total} ${props.mt("totalInline", { defaultValue: "σύνολο" })}`}</span>
      </div>
      <div className="map-top-controls-row">
        <div className="map-top-control-slot" ref={scopeMenuRef}>
          <button
            type="button"
            className="btn map-metric-button map-dropdown-button map-scope-button"
            onClick={() => setShowScopeMenu((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={showScopeMenu}
          >
            <span>{scopeLabel}</span>
            <span className={`map-dropdown-caret ${showScopeMenu ? "open" : ""}`}>▾</span>
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
        {(["count", "dominant_gender"] as MapMetric[]).map((option) => (
          <button key={option} type="button" className={`btn map-metric-button ${props.mapMetric === option ? "active primary" : ""}`} onClick={() => props.onMetricChange(option)}>
            {props.metricOptions[option].label}
          </button>
        ))}
        <div className="map-top-control-slot">
          <button className="btn map-action-button" type="button" style={{ width: "100%" }} onClick={props.onExportClick}>
            {props.mt("downloadMap", { defaultValue: "Λήψη χάρτη" })}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MapYearTimeline(props: {
  mt: Translate;
  years: number[];
  selectedYear: string;
  isAllYears: boolean;
  loading: boolean;
  onSelectAllYears: () => void;
  onSliderChange: (year: string) => void;
}) {
  const minIndex = 0;
  const maxIndex = Math.max(props.years.length - 1, 0);
  const selectedIndex = props.isAllYears
    ? maxIndex
    : Math.max(props.years.findIndex((year) => String(year) === props.selectedYear), 0);
  const selectedLabel = props.isAllYears
    ? props.mt("timeline.allYears", { defaultValue: "Όλες οι χρονιές" })
    : props.selectedYear || "-";

  return (
    <div className="card map-timeline-card">
      <div className="map-timeline-header">
        <div>
          <div className="map-timeline-title">{props.mt("timeline.title", { defaultValue: "Φίλτρο χρονιάς" })}</div>
          <div className="map-timeline-subtitle">{props.mt("timeline.subtitle", { defaultValue: "Σύρε τη μπάρα για να αλλάξεις γρήγορα χρονιά στον χάρτη." })}</div>
        </div>
        <div className="map-timeline-actions">
          <button
            type="button"
            className={`btn map-timeline-all-button ${props.isAllYears ? "active primary" : ""}`}
            onClick={props.onSelectAllYears}
          >
            {props.mt("timeline.allYears", { defaultValue: "Όλες οι χρονιές" })}
          </button>
          <div className="map-timeline-current">{selectedLabel}</div>
        </div>
      </div>

      {props.years.length ? (
        <div className="map-timeline-slider-wrap">
          <input
            type="range"
            min={minIndex}
            max={maxIndex}
            step={1}
            value={selectedIndex}
            className="map-timeline-slider"
            disabled={props.loading || props.years.length < 2}
            onChange={(event) => {
              const nextIndex = Number(event.target.value);
              const nextYear = props.years[nextIndex];
              if (nextYear) props.onSliderChange(String(nextYear));
            }}
            aria-label={props.mt("filters.graduationYear", { defaultValue: "Χρονιά αποφοίτησης" })}
          />
          <div className="map-timeline-scale">
            <span>{props.years[0]}</span>
            <span>{props.years[props.years.length - 1]}</span>
          </div>
        </div>
      ) : (
        <div className="muted">{props.loading ? props.mt("loading", { defaultValue: "Φόρτωση..." }) : props.mt("timeline.noYears", { defaultValue: "Δεν βρέθηκαν χρονιές αποφοίτησης." })}</div>
      )}
    </div>
  );
}

export function MapExportSelectionModal(props: {
  mt: Translate;
  ct: Translate;
  selectedExportFormat: ExportFormat;
  exportCategoryOptions: ExportCategoryOption[];
  selectedExportCategories: ExportCategoryKey[];
  exportingSelection: boolean;
  onClose: () => void;
  onToggleAllCategories: () => void;
  onToggleCategory: (category: ExportCategoryKey) => void;
  onConfirm: () => void;
}) {
  const canSubmit = props.selectedExportCategories.length > 0 && !props.exportingSelection;

  return (
    <div
      onClick={props.onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.34)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 1000,
      }}
    >
      <div
        className="card"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(680px, 100%)",
          maxHeight: "min(78vh, 760px)",
          display: "grid",
          gridTemplateRows: "auto minmax(0, 1fr) auto",
          gap: 12,
          padding: 14,
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

        <div style={{ display: "grid", gap: 10, overflowY: "auto", minHeight: 0, paddingRight: 4 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
            <input type="checkbox" checked={props.selectedExportCategories.length === props.exportCategoryOptions.length && props.exportCategoryOptions.length > 0} onChange={props.onToggleAllCategories} />
            <span>{props.ct("all", { defaultValue: "Όλα" })}</span>
          </label>

          {props.exportCategoryOptions.map((category) => {
            const isSelected = props.selectedExportCategories.includes(category.id);
            return (
              <div key={category.id} style={{ display: "grid", gap: 8, border: "1px solid rgba(148, 163, 184, 0.2)", borderRadius: 14, padding: 10, background: "#f8fafc" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
                  <input type="checkbox" checked={isSelected} onChange={() => props.onToggleCategory(category.id)} />
                  <span>{category.label}</span>
                </label>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", paddingTop: 2 }}>
          <button type="button" className="btn" style={{ minHeight: 40, padding: "0 14px" }} onClick={props.onClose}>
            {props.ct("cancel", { defaultValue: "Ακύρωση" })}
          </button>
          <button type="button" className="btn primary" disabled={!canSubmit} style={{ opacity: canSubmit ? 1 : 0.55 }} onClick={props.onConfirm}>
            {props.exportingSelection ? props.ct("loading", { defaultValue: "Φόρτωση..." }) : props.mt("export.exportSelected", { defaultValue: "Εξαγωγή επιλεγμένων" })}
          </button>
        </div>
      </div>
    </div>
  );
}
