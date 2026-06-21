import type { MapScope } from "./markers";

type MapTranslate = (key: string, options?: Record<string, unknown>) => string;

type ValueCardProps = {
  label: string;
  value: string;
  count: number | null;
  loading: boolean;
  graduatesLabel: string;
};

function ValueCard({ label, value, count, loading, graduatesLabel }: ValueCardProps) {
  return (
    <div className="card map-summary-card">
      <div className="map-summary-label">{label}</div>
      <div className={`map-summary-value${loading ? " is-loading" : ""}`}>
        {loading ? "…" : value || "-"}
      </div>
      <div className={`map-summary-sub${loading ? " is-loading" : ""}`}>
        {loading ? "…" : count === null ? "-" : `${count} ${graduatesLabel}`}
      </div>
    </div>
  );
}

export function MapSummary(props: {
  mt: MapTranslate;
  mapScope: MapScope;
  open: boolean;
  summaryLoading: boolean;
  overallTotal: number | null;
  greeceTotal: number | null | undefined;
  abroadTotal: number | null | undefined;
  topScopeName: string;
  topScopeCount: number | null;
  topCityName: string;
  topCityCount: number | null;
  topAbroadName: string;
  topAbroadCount: number | null;
  topAbroadLoading: boolean;
}) {
  const { mt, mapScope, summaryLoading } = props;
  const graduatesLabel = mt("export.count", { defaultValue: "Απόφοιτοι" });
  return (
    <div className={`map-summary-shell mobile-summary-panel${props.open ? " open" : ""}${summaryLoading ? " is-loading" : ""}`}>
      <div className="map-summary-grid">
        <div className="card map-summary-card">
          <div className={`map-summary-scope-list${summaryLoading ? " is-loading" : ""}`}>
            <div className="map-summary-total-row">
              <span className="map-summary-total-name">{mt("summary.total", { defaultValue: "Σύνολο αποφοίτων" })}</span>
              <span className="map-summary-total-number">{summaryLoading ? "…" : props.overallTotal ?? "…"}</span>
            </div>
            {([
              ["greece", "summary.fromGreece", "Απόφοιτοι από Ελλάδα", props.greeceTotal],
              ["abroad", "summary.fromAbroad", "Απόφοιτοι από εξωτερικό", props.abroadTotal],
            ] as const).map(([scope, key, fallback, total]) => (
              <div key={scope} className={`map-summary-scope-row${mapScope === scope ? " active" : ""}`}>
                <span className="map-summary-scope-name">{mt(key, { defaultValue: fallback })}</span>
                <span className="map-summary-scope-number">{summaryLoading ? "…" : total ?? "…"}</span>
              </div>
            ))}
          </div>
        </div>
        <ValueCard
          label={mapScope === "abroad"
            ? mt("summary.topCountry", { defaultValue: "Χώρα με τους περισσότερους αποφοίτους" })
            : mt("summary.topPeriphery", { defaultValue: "Περιφέρεια με τους περισσότερους αποφοίτους" })}
          value={props.topScopeName}
          count={props.topScopeCount}
          loading={summaryLoading}
          graduatesLabel={graduatesLabel}
        />
        <ValueCard
          label={mt("summary.topCity", { defaultValue: "Πόλη με τους περισσότερους αποφοίτους" })}
          value={props.topCityName}
          count={props.topCityCount}
          loading={summaryLoading}
          graduatesLabel={graduatesLabel}
        />
        <ValueCard
          label={mt("summary.topAbroadCountry", { defaultValue: "Χώρα εκτός Ελλάδας με τους περισσότερους αποφοίτους" })}
          value={props.topAbroadName}
          count={props.topAbroadCount}
          loading={props.topAbroadLoading}
          graduatesLabel={graduatesLabel}
        />
      </div>
    </div>
  );
}
