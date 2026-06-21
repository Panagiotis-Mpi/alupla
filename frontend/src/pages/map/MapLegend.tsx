import type { MapLegendEntry } from "./markerCollections";
import type { MapScope } from "./markers";

type MapTranslate = (key: string, options?: Record<string, unknown>) => string;

export function MapLegend(props: {
  mt: MapTranslate;
  entries: MapLegendEntry[];
  description: string;
  mapScope: MapScope;
  highContrastEnabled: boolean;
}) {
  return (
    <div className="map-custom-legend">
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{props.mt("legend", { defaultValue: "Υπόμνημα" })}</div>
      <div className="muted" style={{ marginBottom: 8 }}>{props.description}</div>
      <div style={{ display: "grid", gap: 6 }}>
        {props.entries.map((entry) => {
          const gender = entry.key === "male" || entry.key === "female" || entry.key === "balanced";
          const size = Math.max(12, Number(entry.radius || (gender ? 16 : props.mapScope === "greece" ? 10 : 16)));
          return (
            <div key={entry.key} style={{ display: "grid", gridTemplateColumns: gender ? "30px 1fr" : `${Math.max(64, size + 18)}px 1fr`, alignItems: "center", gap: gender ? 8 : 10 }}>
              <span
                className={!gender && props.highContrastEnabled ? "map-legend-swatch map-legend-swatch-count-high-contrast" : "map-legend-swatch"}
                style={{ width: size, height: size, borderRadius: 999, background: props.highContrastEnabled ? "#ffd400" : entry.color, opacity: props.highContrastEnabled ? 1 : entry.opacity, border: props.highContrastEnabled ? "2px solid #000" : "1px solid rgba(51,65,85,.18)", justifySelf: "center", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                {gender && props.highContrastEnabled ? (
                  <span className="map-legend-swatch-symbol">{entry.key === "male" ? "♂" : entry.key === "female" ? "♀" : "≈"}</span>
                ) : null}
              </span>
              <span>{entry.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
