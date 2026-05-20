// Χτίζει τις ενότητες KPIs και charts της σελίδας Στατιστικά.
import React from "react";
import {
  BarChartCard,
  ChartCard,
  ChartFullscreenButton,
  ChartLegendInset,
  DualPieChartCard,
  MetricCard,
  MultiBarChartCard,
  PieChartCard,
  ScrollableLineChart,
  SectionTitle,
} from "./ui";

type ChartSeries = { labels: string[]; values: number[] };
type PieSeries = { labels: string[]; values: number[] };
type GenderEntryYearPie = PieSeries & { key: string; title: string; control: React.ReactNode };
type Translate = (key: string, options?: Record<string, unknown>) => string;

type MenuGroup = "demographics" | "academic" | "geography" | "compare";

const greeceAbroadColors = { greece: "rgba(37, 99, 235, 0.72)", abroad: "#f59e0b" };

type ChartBlockProps = {
  t: Translate;
  cardInnerStyle: React.CSSProperties;
  compactTopbarStyle: React.CSSProperties;
  genderChartData: any;
  genderChartOptions: any;
  countChartData: any;
  countChartOptions: any;
  entryYears: ChartSeries;
  birthYears: ChartSeries;
  genderByEntryYearPies: GenderEntryYearPie[];
  genderTotal: PieSeries;
  gradeBinsByGender: { labels: string[]; male: number[]; female: number[] };
  abroadByYear: { labels: string[]; greece: number[]; abroad: number[] };
  yearsToDegreeByNomos: ChartSeries;
  avgGradesByYear: ChartSeries;
  avgGradesByRegion: ChartSeries;
  gradeBins: ChartSeries;
  yearsToDegree: ChartSeries;
  yearsToDegreeDistribution: ChartSeries;
  yearsToDegreeByRegion: ChartSeries;
  regions: ChartSeries;
  genderByRegion: { labels: string[]; male: number[]; female: number[] };
  genderByMunicipality: { labels: string[]; male: number[]; female: number[] };
  municipalities: ChartSeries;
  countries: ChartSeries;
  total: number;
  abroadCount: number;
  exportMode?: boolean;
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
        {(["demographics", "academic", "geography", "compare"] as const).map((groupKey) => (
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
  maleCount: string | number;
  femaleCount: string | number;
  avgAge: string | number;
  minAge: string | number;
  maxAge: string | number;
  avgGrade: string | number;
  minGrade: string | number;
  maxGrade: string | number;
  avgStudyYears: string | number;
  minStudyYears: string | number;
  maxStudyYears: string | number;
  busiestYear: string | number;
  quietestYear: string | number;
  busiestCity: string | number;
  busiestCityCount: string | number;
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
          <MetricCard label={props.t("cards.total")} value={props.total} loading={props.loading} subItems={[{ label: props.t("table.male"), value: props.maleCount }, { label: props.t("table.female"), value: props.femaleCount }]} inlineRows />
          <MetricCard label={props.t("cards.avgAge")} value={props.avgAge} loading={props.loading} subItems={[{ label: props.t("cards.minAge"), value: props.minAge }, { label: props.t("cards.maxAge"), value: props.maxAge }]} inlineRows />
          <MetricCard label={props.t("cards.avgGrade")} value={props.avgGrade} loading={props.loading} subItems={[{ label: props.t("cards.minGrade"), value: props.minGrade }, { label: props.t("cards.maxGrade"), value: props.maxGrade }]} inlineRows />
        </div>
        <div className="statistics-summary-row" style={props.metricBottomRowStyle}>
          <MetricCard label={props.t("cards.avgStudyYears")} value={props.avgStudyYears} loading={props.loading} subItems={[{ label: props.t("cards.minStudyYears"), value: props.minStudyYears }, { label: props.t("cards.maxStudyYears"), value: props.maxStudyYears }]} inlineRows />
          <MetricCard label={props.t("cards.topGraduationYear")} value={props.busiestYear} loading={props.loading} subItems={[{ label: props.t("cards.minGraduationYear"), value: props.quietestYear }]} inlineRows />
          <MetricCard label={props.t("cards.topCity")} value={props.busiestCity} loading={props.loading} detail={props.busiestCityCount === "-" ? "-" : `${props.busiestCityCount} ${props.t("cards.graduatesCount")}`} />
        </div>
      </div>
    </div>
  );
}

function GenderLineCard(props: Pick<ChartBlockProps, "t" | "cardInnerStyle" | "compactTopbarStyle" | "genderChartData" | "genderChartOptions" | "exportMode">) {
  return (
    <div className="card" style={props.cardInnerStyle} data-stat-chart-card="true" data-export-chart-id="gender">
      <div className="topbar" style={props.compactTopbarStyle}>
        <h3 style={{ margin: 0, flex: "1 1 auto", minWidth: 0 }}>{props.t("sections.gender")}</h3>
        {!props.exportMode ? <ChartFullscreenButton label={props.t("actions.fullscreen")} title={props.t("actions.fullscreen")} /> : null}
        <ChartLegendInset items={[
          { label: props.t("table.male"), color: "#3b82f6", borderColor: "#3b82f6", pointStyle: "circle" },
          { label: props.t("table.female"), color: "#db2777", borderColor: "#db2777", pointStyle: "diamond", dashed: true },
        ]} />
      </div>
      <div className="chart-figure" role="img" aria-label={props.t("sections.gender")} style={{ position: "relative" }}>
        <ScrollableLineChart
          height={320}
          labels={props.genderChartData?.labels ?? []}
          datasetCount={(props.genderChartData?.datasets ?? []).length}
          data={props.genderChartData}
          options={props.genderChartOptions}
          exportMode={props.exportMode}
        />
      </div>
    </div>
  );
}

function GraduationLineCard(props: Pick<ChartBlockProps, "t" | "cardInnerStyle" | "compactTopbarStyle" | "countChartData" | "countChartOptions">) {
  return (
    <div className="card" style={props.cardInnerStyle} data-stat-chart-card="true" data-export-chart-id="byYear">
      <div className="topbar" style={props.compactTopbarStyle}>
        <h3 style={{ margin: 0, flex: "1 1 auto", minWidth: 0 }}>{props.t("sections.byYear")}</h3>
        <ChartFullscreenButton label={props.t("actions.fullscreen")} title={props.t("actions.fullscreen")} />
        <ChartLegendInset items={[{ label: props.t("sections.byYear"), color: "#2563eb", borderColor: "#2563eb", pointStyle: "circle" }]} />
      </div>
      <div className="chart-figure" role="img" aria-label={props.t("sections.byYear")} style={{ position: "relative" }}>
        <ScrollableLineChart
          height={320}
          labels={props.countChartData?.labels ?? []}
          datasetCount={(props.countChartData?.datasets ?? []).length}
          data={props.countChartData}
          options={props.countChartOptions}
          exportMode={props.exportMode}
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
        <GraduationLineCard {...props} />
        <ChartCard chartId="countByEntryYear" title={props.t("sections.countByEntryYear")} labels={props.entryYears.labels} values={props.entryYears.values} height={320} exportMode={props.exportMode} />
        <ChartCard chartId="birthYear" title={props.t("sections.birthYear")} labels={props.birthYears.labels} values={props.birthYears.values} height={320} exportMode={props.exportMode} />
        <PieChartCard chartId="genderTotal" title={props.t("sections.genderTotal")} labels={props.genderTotal.labels} values={props.genderTotal.values} height={320} colors={["#3b82f6", "#db2777"]} exportMode={props.exportMode} />
        <DualPieChartCard chartId="genderByEntryYear" title={props.t("sections.genderByEntryYear")} pies={props.genderByEntryYearPies} height={300} colors={["#3b82f6", "#db2777"]} exportMode={props.exportMode} />
        <GenderLineCard {...props} exportMode={props.exportMode} />
      </div>
    </div>
  );
}

export function AcademicCharts(props: ChartBlockProps) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <SectionTitle title={props.t("groups.academic")} subtitle={props.t("groupText.academic")} />
      <div className="grid cols1" style={{ gap: 14 }}>
        <BarChartCard chartId="gradeDistribution" title={props.t("sections.gradeDistribution")} labels={props.gradeBins.labels} values={props.gradeBins.values} height={320} minLabelWidth={88} maxLabelWidth={128} exportMode={props.exportMode} />
        <MultiBarChartCard
          chartId="gradeDistributionByGender"
          title={props.t("sections.gradeDistributionByGender")}
          labels={props.gradeBinsByGender.labels}
          datasets={[
            { label: props.t("table.male"), values: props.gradeBinsByGender.male, color: "#3b82f6", borderColor: "#3b82f6", pointStyle: "circle" },
            { label: props.t("table.female"), values: props.gradeBinsByGender.female, color: "#db2777", borderColor: "#db2777", pointStyle: "diamond", dashed: true },
          ]}
          height={320}
          minLabelWidth={88}
          maxLabelWidth={128}
        
          exportMode={props.exportMode}/>
        <BarChartCard chartId="timeToDegreeDistribution" title={props.t("sections.timeToDegreeDistribution")} labels={props.yearsToDegreeDistribution.labels} values={props.yearsToDegreeDistribution.values} height={320} minLabelWidth={64} maxLabelWidth={88} scrollThreshold={18} exportMode={props.exportMode} />
        <BarChartCard chartId="gradeByYear" title={props.t("sections.gradeByYear")} labels={props.avgGradesByYear.labels} values={props.avgGradesByYear.values} height={320} minLabelWidth={76} maxLabelWidth={96} yTickPrecision={2} exportMode={props.exportMode} />
        <BarChartCard chartId="gradeByRegion" title={props.t("sections.gradeByRegion")} labels={props.avgGradesByRegion.labels} values={props.avgGradesByRegion.values} height={320} minLabelWidth={104} maxLabelWidth={156} forceScrollable yTickPrecision={2} exportMode={props.exportMode} />
        <BarChartCard chartId="timeToDegreeByEntryYear" title={props.t("sections.timeToDegreeByEntryYear")} labels={props.yearsToDegree.labels} values={props.yearsToDegree.values} height={320} minLabelWidth={76} maxLabelWidth={96} yTickPrecision={1} exportMode={props.exportMode} />
        <BarChartCard chartId="timeToDegreeByRegion" title={props.t("sections.timeToDegreeByRegion")} labels={props.yearsToDegreeByRegion.labels} values={props.yearsToDegreeByRegion.values} height={320} minLabelWidth={104} maxLabelWidth={156} forceScrollable yTickPrecision={1} exportMode={props.exportMode} />
      </div>
    </div>
  );
}

export function GeographyCharts(props: ChartBlockProps) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <SectionTitle title={props.t("groups.geography")} subtitle={props.t("groupText.geography")} />
      <div className="grid cols1" style={{ gap: 14 }}>
        <BarChartCard chartId="originRegion" title={props.t("sections.originRegion")} labels={props.regions.labels} values={props.regions.values} height={320} minLabelWidth={104} maxLabelWidth={156} exportMode={props.exportMode} />
        <MultiBarChartCard
          chartId="genderByRegion"
          title={props.t("sections.genderByRegion")}
          labels={props.genderByRegion.labels}
          datasets={[
            { label: props.t("table.male"), values: props.genderByRegion.male, color: "#3b82f6", borderColor: "#3b82f6", pointStyle: "circle" },
            { label: props.t("table.female"), values: props.genderByRegion.female, color: "#db2777", borderColor: "#db2777", pointStyle: "diamond", dashed: true },
          ]}
          height={320}
          minLabelWidth={104}
          maxLabelWidth={156}
          forceScrollable
        
          exportMode={props.exportMode}/>
        <BarChartCard chartId="originMunicipality" title={props.t("sections.originMunicipality")} labels={props.municipalities.labels} values={props.municipalities.values} height={320} minLabelWidth={104} maxLabelWidth={156} forceScrollable exportMode={props.exportMode} />
        <MultiBarChartCard
          chartId="genderByMunicipality"
          title={props.t("sections.genderByMunicipality")}
          labels={props.genderByMunicipality.labels}
          datasets={[
            { label: props.t("table.male"), values: props.genderByMunicipality.male, color: "#3b82f6", borderColor: "#3b82f6", pointStyle: "circle" },
            { label: props.t("table.female"), values: props.genderByMunicipality.female, color: "#db2777", borderColor: "#db2777", pointStyle: "diamond", dashed: true },
          ]}
          height={320}
          minLabelWidth={104}
          maxLabelWidth={156}
          forceScrollable
        
          exportMode={props.exportMode}/>
        <BarChartCard chartId="originCountry" title={props.t("sections.originCountry")} labels={props.countries.labels} values={props.countries.values} height={320} minLabelWidth={104} maxLabelWidth={156} forceScrollable exportMode={props.exportMode} />
        <PieChartCard chartId="abroadShare" title={props.t("sections.abroadShare")} labels={[props.t("table.greece"), props.t("table.abroad")]} values={[Math.max(0, props.total - props.abroadCount), props.abroadCount]} height={340} colors={[greeceAbroadColors.greece, greeceAbroadColors.abroad]} exportMode={props.exportMode} />
        <MultiBarChartCard
          chartId="abroadByYear"
          title={props.t("sections.abroadByYear")}
          labels={props.abroadByYear.labels}
          datasets={[
            { label: props.t("table.greece"), values: props.abroadByYear.greece, color: greeceAbroadColors.greece, borderColor: greeceAbroadColors.greece, pointStyle: "circle" },
            { label: props.t("table.abroad"), values: props.abroadByYear.abroad, color: greeceAbroadColors.abroad, borderColor: greeceAbroadColors.abroad, pointStyle: "square" },
          ]}
          height={320}
          minLabelWidth={76}
          maxLabelWidth={96}
          forceScrollable
        
          exportMode={props.exportMode}/>
        <BarChartCard chartId="timeToDegreeByNomos" title={props.t("sections.timeToDegreeByNomos")} labels={props.yearsToDegreeByNomos.labels} values={props.yearsToDegreeByNomos.values} height={320} minLabelWidth={104} maxLabelWidth={156} forceScrollable yTickPrecision={1} exportMode={props.exportMode} />
      </div>
    </div>
  );
}

export function ExportChartsSurface(props: ChartBlockProps) {
  return (
    <div style={{ display: "grid", gap: 14 }} data-stat-export-single="true">
      <GraduationLineCard {...props} exportMode />
      <ChartCard chartId="countByEntryYear" title={props.t("sections.countByEntryYear")} labels={props.entryYears.labels} values={props.entryYears.values} height={320} exportMode={props.exportMode} />
      <ChartCard chartId="birthYear" title={props.t("sections.birthYear")} labels={props.birthYears.labels} values={props.birthYears.values} height={320} exportMode={props.exportMode} />
      <PieChartCard chartId="genderTotal" title={props.t("sections.genderTotal")} labels={props.genderTotal.labels} values={props.genderTotal.values} height={320} colors={["#3b82f6", "#db2777"]} exportMode={props.exportMode} />
      <DualPieChartCard chartId="genderByEntryYear" title={props.t("sections.genderByEntryYear")} pies={props.genderByEntryYearPies} height={300} colors={["#3b82f6", "#db2777"]} exportMode={props.exportMode} />
      <GenderLineCard {...props} exportMode />
      <BarChartCard chartId="gradeDistribution" title={props.t("sections.gradeDistribution")} labels={props.gradeBins.labels} values={props.gradeBins.values} height={320} minLabelWidth={88} maxLabelWidth={128} exportMode={props.exportMode} />
      <MultiBarChartCard
        chartId="gradeDistributionByGender"
        title={props.t("sections.gradeDistributionByGender")}
        labels={props.gradeBinsByGender.labels}
        datasets={[
          { label: props.t("table.male"), values: props.gradeBinsByGender.male, color: "#3b82f6", borderColor: "#3b82f6", pointStyle: "circle" },
          { label: props.t("table.female"), values: props.gradeBinsByGender.female, color: "#db2777", borderColor: "#db2777", pointStyle: "diamond", dashed: true },
        ]}
        height={320}
        minLabelWidth={88}
        maxLabelWidth={128}
      
          exportMode={props.exportMode}/>
      <BarChartCard chartId="timeToDegreeDistribution" title={props.t("sections.timeToDegreeDistribution")} labels={props.yearsToDegreeDistribution.labels} values={props.yearsToDegreeDistribution.values} height={320} minLabelWidth={64} maxLabelWidth={88} scrollThreshold={18} exportMode={props.exportMode} />
      <BarChartCard chartId="gradeByYear" title={props.t("sections.gradeByYear")} labels={props.avgGradesByYear.labels} values={props.avgGradesByYear.values} height={320} minLabelWidth={76} maxLabelWidth={96} yTickPrecision={2} exportMode={props.exportMode} />
      <BarChartCard chartId="gradeByRegion" title={props.t("sections.gradeByRegion")} labels={props.avgGradesByRegion.labels} values={props.avgGradesByRegion.values} height={320} minLabelWidth={104} maxLabelWidth={156} forceScrollable yTickPrecision={2} exportMode={props.exportMode} />
      <BarChartCard chartId="timeToDegreeByEntryYear" title={props.t("sections.timeToDegreeByEntryYear")} labels={props.yearsToDegree.labels} values={props.yearsToDegree.values} height={320} minLabelWidth={76} maxLabelWidth={96} yTickPrecision={1} exportMode={props.exportMode} />
      <BarChartCard chartId="timeToDegreeByRegion" title={props.t("sections.timeToDegreeByRegion")} labels={props.yearsToDegreeByRegion.labels} values={props.yearsToDegreeByRegion.values} height={320} minLabelWidth={104} maxLabelWidth={156} forceScrollable yTickPrecision={1} exportMode={props.exportMode} />
      <BarChartCard chartId="originRegion" title={props.t("sections.originRegion")} labels={props.regions.labels} values={props.regions.values} height={320} minLabelWidth={104} maxLabelWidth={156} exportMode={props.exportMode} />
      <MultiBarChartCard
        chartId="genderByRegion"
        title={props.t("sections.genderByRegion")}
        labels={props.genderByRegion.labels}
        datasets={[
          { label: props.t("table.male"), values: props.genderByRegion.male, color: "#3b82f6", borderColor: "#3b82f6", pointStyle: "circle" },
          { label: props.t("table.female"), values: props.genderByRegion.female, color: "#db2777", borderColor: "#db2777", pointStyle: "diamond", dashed: true },
        ]}
        height={320}
        minLabelWidth={104}
        maxLabelWidth={156}
        forceScrollable
      
          exportMode={props.exportMode}/>
      <BarChartCard chartId="originMunicipality" title={props.t("sections.originMunicipality")} labels={props.municipalities.labels} values={props.municipalities.values} height={320} minLabelWidth={104} maxLabelWidth={156} forceScrollable exportMode={props.exportMode} />
      <MultiBarChartCard
        chartId="genderByMunicipality"
        title={props.t("sections.genderByMunicipality")}
        labels={props.genderByMunicipality.labels}
        datasets={[
          { label: props.t("table.male"), values: props.genderByMunicipality.male, color: "#3b82f6", borderColor: "#3b82f6", pointStyle: "circle" },
          { label: props.t("table.female"), values: props.genderByMunicipality.female, color: "#db2777", borderColor: "#db2777", pointStyle: "diamond", dashed: true },
        ]}
        height={320}
        minLabelWidth={104}
        maxLabelWidth={156}
        forceScrollable
      
          exportMode={props.exportMode}/>
      <BarChartCard chartId="originCountry" title={props.t("sections.originCountry")} labels={props.countries.labels} values={props.countries.values} height={320} minLabelWidth={104} maxLabelWidth={156} forceScrollable exportMode={props.exportMode} />
      <PieChartCard chartId="abroadShare" title={props.t("sections.abroadShare")} labels={[props.t("table.greece"), props.t("table.abroad")]} values={[Math.max(0, props.total - props.abroadCount), props.abroadCount]} height={340} colors={[greeceAbroadColors.greece, greeceAbroadColors.abroad]} exportMode={props.exportMode} />
      <MultiBarChartCard
        chartId="abroadByYear"
        title={props.t("sections.abroadByYear")}
        labels={props.abroadByYear.labels}
        datasets={[
          { label: props.t("table.greece"), values: props.abroadByYear.greece, color: greeceAbroadColors.greece, borderColor: greeceAbroadColors.greece, pointStyle: "circle" },
          { label: props.t("table.abroad"), values: props.abroadByYear.abroad, color: greeceAbroadColors.abroad, borderColor: greeceAbroadColors.abroad, pointStyle: "square" },
        ]}
        height={320}
        minLabelWidth={76}
        maxLabelWidth={96}
        forceScrollable
      
          exportMode={props.exportMode}/>
      <BarChartCard chartId="timeToDegreeByNomos" title={props.t("sections.timeToDegreeByNomos")} labels={props.yearsToDegreeByNomos.labels} values={props.yearsToDegreeByNomos.values} height={320} minLabelWidth={104} maxLabelWidth={156} forceScrollable yTickPrecision={1} exportMode={props.exportMode} />
    </div>
  );
}
