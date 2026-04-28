import React from "react";
import {
  BarChartCard,
  ChartCard,
  ChartLegendInset,
  DualPieChartCard,
  MetricCard,
  PieChartCard,
  ScrollableLineChart,
  SectionTitle,
} from "./ui";

type ChartSeries = { labels: string[]; values: number[] };
type PieSeries = { labels: string[]; values: number[] };
type GenderEntryYearPie = PieSeries & { key: string; title: string; control: React.ReactNode };
type Translate = (key: string, options?: Record<string, unknown>) => string;

type MenuGroup = "demographics" | "academic" | "geography";

type ChartBlockProps = {
  t: Translate;
  cardInnerStyle: React.CSSProperties;
  compactTopbarStyle: React.CSSProperties;
  genderChartData: any;
  genderChartOptions: any;
  countChartData: any;
  countChartOptions: any;
  birthYears: ChartSeries;
  genderByEntryYearPies: GenderEntryYearPie[];
  avgGradesByYear: ChartSeries;
  gradeBins: ChartSeries;
  yearsToDegree: ChartSeries;
  yearsToDegreeDistribution: ChartSeries;
  regions: ChartSeries;
  municipalities: ChartSeries;
  countries: ChartSeries;
  total: number;
  abroadCount: number;
};

export function StatisticsGroupMenu(props: {
  t: Translate;
  activeGroup: MenuGroup;
  setActiveGroup: (group: MenuGroup) => void;
  exportButton: React.ReactNode;
  topButtonStyle: React.CSSProperties;
  sectionMenuStyle: React.CSSProperties;
  sectionButtonsStyle: React.CSSProperties;
}) {
  return (
    <div style={props.sectionMenuStyle}>
      <div className="page-header-actions-grid" style={props.sectionButtonsStyle}>
        {(["demographics", "academic", "geography"] as const).map((groupKey) => (
          <button
            key={groupKey}
            type="button"
            className={props.activeGroup === groupKey ? "btn primary" : "btn"}
            style={props.topButtonStyle}
            onClick={() => props.setActiveGroup(groupKey)}
          >
            {props.t(`groups.${groupKey}`)}
          </button>
        ))}
        {props.exportButton}
      </div>
    </div>
  );
}

export function StatisticsSummaryCards(props: {
  t: Translate;
  total: number;
  avgAge: string | number;
  avgGrade: string | number;
  longestStudyYears: string | number;
  busiestYear: string | number;
  busiestCity: string | number;
  sectionWrapStyle: React.CSSProperties;
  metricGridStyle: React.CSSProperties;
  metricTopRowStyle: React.CSSProperties;
  metricBottomRowStyle: React.CSSProperties;
  loading?: boolean;
}) {
  return (
    <div className="statistics-summary-section" style={props.sectionWrapStyle}>
      <div className="statistics-summary-grid" style={props.metricGridStyle}>
        <div className="statistics-summary-row" style={props.metricTopRowStyle}>
          <MetricCard label={props.t("cards.total")} value={props.total} loading={props.loading} />
          <MetricCard label={props.t("cards.avgAge")} value={props.avgAge} loading={props.loading} />
          <MetricCard label={props.t("cards.avgGrade")} value={props.avgGrade} loading={props.loading} />
        </div>
        <div className="statistics-summary-row" style={props.metricBottomRowStyle}>
          <MetricCard label={props.t("cards.earliestYear")} value={props.longestStudyYears} loading={props.loading} />
          <MetricCard label={props.t("cards.topGraduationYear")} value={props.busiestYear} loading={props.loading} />
          <MetricCard label={props.t("cards.topCity")} value={props.busiestCity} loading={props.loading} />
        </div>
      </div>
    </div>
  );
}

function GenderLineCard(props: Pick<ChartBlockProps, "t" | "cardInnerStyle" | "compactTopbarStyle" | "genderChartData" | "genderChartOptions">) {
  return (
    <div className="card" style={props.cardInnerStyle} data-stat-chart-card="true" data-export-chart-id="gender">
      <div className="topbar" style={props.compactTopbarStyle}>
        <h3 style={{ margin: 0 }}>{props.t("sections.gender")}</h3>
      </div>
      <div className="chart-figure" role="img" aria-label={props.t("sections.gender")} style={{ position: "relative" }}>
        <ChartLegendInset items={[
          { label: props.t("table.male"), color: "#3b82f6", borderColor: "#3b82f6", pointStyle: "circle" },
          { label: props.t("table.female"), color: "#db2777", borderColor: "#db2777", pointStyle: "diamond", dashed: true },
        ]} />
        <ScrollableLineChart
          height={320}
          labels={props.genderChartData?.labels ?? []}
          datasetCount={(props.genderChartData?.datasets ?? []).length}
          data={props.genderChartData}
          options={props.genderChartOptions}
        />
      </div>
    </div>
  );
}

function GraduationLineCard(props: Pick<ChartBlockProps, "t" | "cardInnerStyle" | "compactTopbarStyle" | "countChartData" | "countChartOptions">) {
  return (
    <div className="card" style={props.cardInnerStyle} data-stat-chart-card="true" data-export-chart-id="byYear">
      <div className="topbar" style={props.compactTopbarStyle}>
        <h3 style={{ margin: 0 }}>{props.t("sections.byYear")}</h3>
      </div>
      <div className="chart-figure" role="img" aria-label={props.t("sections.byYear")} style={{ position: "relative" }}>
        <ChartLegendInset items={[{ label: props.t("sections.byYear"), color: "#2563eb", borderColor: "#2563eb", pointStyle: "circle" }]} />
        <ScrollableLineChart
          height={320}
          labels={props.countChartData?.labels ?? []}
          datasetCount={(props.countChartData?.datasets ?? []).length}
          data={props.countChartData}
          options={props.countChartOptions}
        />
      </div>
    </div>
  );
}

export function DemographicsCharts(props: ChartBlockProps) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <SectionTitle title={props.t("groups.demographics")} subtitle={props.t("groupText.demographics")} />
      <div className="grid cols1" style={{ gap: 14 }}>
        <GenderLineCard {...props} />
        <ChartCard chartId="birthYear" title={props.t("sections.birthYear")} labels={props.birthYears.labels} values={props.birthYears.values} height={320} />
        <DualPieChartCard chartId="genderByEntryYear" title={props.t("sections.genderByEntryYear")} pies={props.genderByEntryYearPies} height={300} colors={["#3b82f6", "#db2777"]} />
      </div>
    </div>
  );
}

export function AcademicCharts(props: ChartBlockProps) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <SectionTitle title={props.t("groups.academic")} subtitle={props.t("groupText.academic")} />
      <div className="grid cols1" style={{ gap: 14 }}>
        <GraduationLineCard {...props} />
        <BarChartCard chartId="gradeByYear" title={props.t("sections.gradeByYear")} labels={props.avgGradesByYear.labels} values={props.avgGradesByYear.values} height={320} minLabelWidth={76} maxLabelWidth={96} />
        <BarChartCard chartId="gradeDistribution" title={props.t("sections.gradeDistribution")} labels={props.gradeBins.labels} values={props.gradeBins.values} height={320} minLabelWidth={88} maxLabelWidth={128} />
        <BarChartCard chartId="timeToDegreeByEntryYear" title={props.t("sections.timeToDegreeByEntryYear")} labels={props.yearsToDegree.labels} values={props.yearsToDegree.values} height={320} minLabelWidth={76} maxLabelWidth={96} />
        <BarChartCard chartId="timeToDegreeDistribution" title={props.t("sections.timeToDegreeDistribution")} labels={props.yearsToDegreeDistribution.labels} values={props.yearsToDegreeDistribution.values} height={320} minLabelWidth={64} maxLabelWidth={88} scrollThreshold={18} />
      </div>
    </div>
  );
}

export function GeographyCharts(props: ChartBlockProps) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <SectionTitle title={props.t("groups.geography")} subtitle={props.t("groupText.geography")} />
      <div className="grid cols1" style={{ gap: 14 }}>
        <BarChartCard chartId="originRegion" title={props.t("sections.originRegion")} labels={props.regions.labels} values={props.regions.values} height={320} minLabelWidth={104} maxLabelWidth={156} />
        <BarChartCard chartId="originMunicipality" title={props.t("sections.originMunicipality")} labels={props.municipalities.labels} values={props.municipalities.values} height={320} minLabelWidth={104} maxLabelWidth={156} forceScrollable />
        <BarChartCard chartId="originCountry" title={props.t("sections.originCountry")} labels={props.countries.labels} values={props.countries.values} height={320} minLabelWidth={104} maxLabelWidth={156} forceScrollable />
        <PieChartCard chartId="abroadShare" title={props.t("sections.abroadShare")} labels={[props.t("table.greece"), props.t("table.abroad")]} values={[Math.max(0, props.total - props.abroadCount), props.abroadCount]} height={340} />
      </div>
    </div>
  );
}

export function ExportChartsSurface(props: ChartBlockProps) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <GenderLineCard {...props} />
      <ChartCard chartId="birthYear" title={props.t("sections.birthYear")} labels={props.birthYears.labels} values={props.birthYears.values} height={320} />
      <DualPieChartCard chartId="genderByEntryYear" title={props.t("sections.genderByEntryYear")} pies={props.genderByEntryYearPies} height={300} colors={["#3b82f6", "#db2777"]} />
      <GraduationLineCard {...props} />
      <BarChartCard chartId="gradeByYear" title={props.t("sections.gradeByYear")} labels={props.avgGradesByYear.labels} values={props.avgGradesByYear.values} height={320} minLabelWidth={76} maxLabelWidth={96} />
      <BarChartCard chartId="gradeDistribution" title={props.t("sections.gradeDistribution")} labels={props.gradeBins.labels} values={props.gradeBins.values} height={320} minLabelWidth={88} maxLabelWidth={128} />
      <BarChartCard chartId="timeToDegreeByEntryYear" title={props.t("sections.timeToDegreeByEntryYear")} labels={props.yearsToDegree.labels} values={props.yearsToDegree.values} height={320} minLabelWidth={76} maxLabelWidth={96} />
      <BarChartCard chartId="timeToDegreeDistribution" title={props.t("sections.timeToDegreeDistribution")} labels={props.yearsToDegreeDistribution.labels} values={props.yearsToDegreeDistribution.values} height={320} minLabelWidth={64} maxLabelWidth={88} scrollThreshold={18} />
      <BarChartCard chartId="originRegion" title={props.t("sections.originRegion")} labels={props.regions.labels} values={props.regions.values} height={320} minLabelWidth={104} maxLabelWidth={156} />
      <BarChartCard chartId="originMunicipality" title={props.t("sections.originMunicipality")} labels={props.municipalities.labels} values={props.municipalities.values} height={320} minLabelWidth={104} maxLabelWidth={156} forceScrollable />
      <BarChartCard chartId="originCountry" title={props.t("sections.originCountry")} labels={props.countries.labels} values={props.countries.values} height={320} minLabelWidth={104} maxLabelWidth={156} forceScrollable />
      <PieChartCard chartId="abroadShare" title={props.t("sections.abroadShare")} labels={[props.t("table.greece"), props.t("table.abroad")]} values={[Math.max(0, props.total - props.abroadCount), props.abroadCount]} height={340} />
    </div>
  );
}
