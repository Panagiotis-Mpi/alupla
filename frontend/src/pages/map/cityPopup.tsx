import React from "react";
import { Line, Pie } from "react-chartjs-2";
import { colorWithAlpha, detailValue, directionColor, genderColors } from "./viewHelpers";

type Translate = (key: string, options?: Record<string, unknown>) => string;

type MapMetric = "count" | "dominant_gender";

type DirectionColorMap = Map<string, string>;

const chartPalette = ["#2563eb", "#dc2626", "#16a34a", "#f59e0b", "#7c3aed", "#0891b2", "#e11d48", "#65a30d", "#ea580c", "#4f46e5", "#db2777", "#0f766e", "#b91c1c", "#0284c7", "#a16207", "#9333ea", "#15803d", "#c2410c", "#1d4ed8", "#be123c"];

export function MapCityPopupContent(props: {
  ct: Translate;
  mt: Translate;
  mapMetric: MapMetric;
  cityDetailLoading: boolean;
  cityDetail: any;
  directionColorMap: DirectionColorMap;
}) {
  if (props.cityDetailLoading) return <div className="muted">{props.ct("loading", { defaultValue: "Φόρτωση..." })}</div>;
  if (!props.cityDetail) return <div className="muted">{props.mt("cityPopup.noData", { defaultValue: "Δεν υπάρχουν διαθέσιμα στοιχεία για την πόλη." })}</div>;

  if (props.mapMetric === "dominant_gender") {
    const pieData = {
      labels: [props.mt("maleCount", { defaultValue: "Άνδρες" }), props.mt("femaleCount", { defaultValue: "Γυναίκες" })],
      datasets: [
        {
          data: [Number(props.cityDetail.male_count ?? 0), Number(props.cityDetail.female_count ?? 0)],
          backgroundColor: [genderColors.male, genderColors.female],
          borderColor: [genderColors.male, genderColors.female],
          borderWidth: 1,
        },
      ],
    };
    const pieOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { position: "bottom" as const } },
    };

    return (
      <div className="map-city-popup-card">
        <div className="map-city-popup-title">{props.cityDetail.city_name}</div>
        <div className="map-city-popup-sub">{props.mt("totalGraduatesLine", { total: props.cityDetail.total, defaultValue: "Σύνολο αποφοίτων: {{total}}" })}</div>
        <div className="map-city-popup-chart">{Number(props.cityDetail.total) > 0 ? <Pie data={pieData as any} options={pieOptions as any} /> : <div className="muted">{props.mt("cityPopup.noData", { defaultValue: "Δεν υπάρχουν διαθέσιμα στοιχεία για την πόλη." })}</div>}</div>
        <div className="map-city-popup-grid">
          <div><div className="map-city-popup-label">{props.mt("maleCount", { defaultValue: "Άνδρες" })}</div><div className="map-city-popup-value">{detailValue(props.cityDetail.male_pct, "%")}</div></div>
          <div><div className="map-city-popup-label">{props.mt("femaleCount", { defaultValue: "Γυναίκες" })}</div><div className="map-city-popup-value">{detailValue(props.cityDetail.female_pct, "%")}</div></div>
        </div>
      </div>
    );
  }

  const popupLabels = props.cityDetail.labels?.length ? props.cityDetail.labels : Array.from({ length: 8 }, () => "");
  const lineData = {
    labels: popupLabels,
    datasets: (props.cityDetail.datasets?.length ? props.cityDetail.datasets : [{ key: "count", label: props.mt("export.count", { defaultValue: "Απόφοιτοι" }), values: popupLabels.map(() => null) }]).map((dataset: any, index: number) => {
      const color = directionColor(dataset.label || chartPalette[index % chartPalette.length], props.directionColorMap);
      return {
        label: dataset.label,
        data: dataset.values,
        borderColor: color,
        backgroundColor: colorWithAlpha(color, 0.18),
        pointBackgroundColor: color,
        pointBorderColor: color,
        fill: true,
        borderWidth: 2,
        pointRadius: props.cityDetail.datasets?.length ? 2 : 0,
        tension: 0.28,
      };
    }),
  };
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 as any }, grid: { color: "rgba(148,163,184,.18)" } },
      x: { ticks: { autoSkip: true, maxRotation: 0, minRotation: 0 }, grid: { color: "rgba(148,163,184,.18)" } },
    },
  };

  return (
    <div className="map-city-popup-card">
      <div className="map-city-popup-title">{props.cityDetail.city_name}</div>
      <div className="map-city-popup-sub">{props.mt("totalGraduatesLine", { total: props.cityDetail.total, defaultValue: "Σύνολο αποφοίτων: {{total}}" })}</div>
      <div className="map-city-popup-grid">
        <div><div className="map-city-popup-label">{props.mt("malePct", { defaultValue: "% Άνδρες" })}</div><div className="map-city-popup-value">{detailValue(props.cityDetail.male_pct, "%")}</div></div>
        <div><div className="map-city-popup-label">{props.mt("femalePct", { defaultValue: "% Γυναίκες" })}</div><div className="map-city-popup-value">{detailValue(props.cityDetail.female_pct, "%")}</div></div>
        <div><div className="map-city-popup-label">{props.mt("avgAge", { defaultValue: "Μέση ηλικία" })}</div><div className="map-city-popup-value">{detailValue(props.cityDetail.avg_age)}</div></div>
        <div><div className="map-city-popup-label">{props.mt("avgGrade", { defaultValue: "Μέσος βαθμός" })}</div><div className="map-city-popup-value">{detailValue(props.cityDetail.avg_grade)}</div></div>
      </div>
      <div className="map-city-popup-chart map-city-popup-line"><Line data={lineData as any} options={lineOptions as any} /></div>
    </div>
  );
}
