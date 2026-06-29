// Χτίζει τις ενότητες KPIs και charts της σελίδας Στατιστικά.
import React from "react";
import Icon from "../../components/Icon";
import usersRoundIcon from "../../assets/icons/users-round.svg";
import bookOpenCheckIcon from "../../assets/icons/book-open-check.svg";
import mapPinnedIcon from "../../assets/icons/map-pinned.svg";
import arrowLeftRightIcon from "../../assets/icons/arrow-left-right.svg";
import {
  BarChartCard,
  ChartCard,
  ChartFullscreenButton,
  ChartLegendInset,
  MetricCard,
  MultiBarChartCard,
  PieChartCard,
  ScrollableLineChart,
  SectionTitle,
} from "./ui";

type ChartSeries = { labels: string[]; values: number[] };
type PieSeries = { labels: string[]; values: number[] };
type GenderDistributionPie = PieSeries & { control: React.ReactNode };
type Translate = (key: string, options?: Record<string, unknown>) => string;

type MenuGroup = "demographics" | "academic" | "geography" | "compare";

const greeceAbroadColors = { greece: "rgba(37, 99, 235, 0.72)", abroad: "#f59e0b" };
const groupIcons: Record<MenuGroup, string> = {
  demographics: usersRoundIcon,
  academic: bookOpenCheckIcon,
  geography: mapPinnedIcon,
  compare: arrowLeftRightIcon,
};

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
  genderDistributionPie: GenderDistributionPie;
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

type ExportBarDataset = {
  label: string;
  values: number[];
  color: string;
  borderColor?: string;
  dashed?: boolean;
  pointStyle?: "circle" | "square" | "diamond";
};

function exportChunkCapacity(labels: string[], datasetCount = 1) {
  const normalizedLabels = labels.map((label) => String(label ?? "").trim()).filter(Boolean);
  if (!normalizedLabels.length) return datasetCount > 1 ? 9 : 10;
  const longest = normalizedLabels.reduce((max, label) => Math.max(max, label.length), 0);
  const average = normalizedLabels.reduce((sum, label) => sum + label.length, 0) / normalizedLabels.length;

  if (longest > 30 || average > 18) return datasetCount > 1 ? 7 : 8;
  if (longest > 22 || average > 14) return datasetCount > 1 ? 8 : 9;
  return datasetCount > 1 ? 9 : 10;
}

function exportChunkRanges(labels: string[], datasetCount = 1) {
  const length = labels.length;
  if (length <= 0) return [] as Array<[number, number]>;
  const pageCount = Math.max(1, Math.ceil(length / exportChunkCapacity(labels, datasetCount)));
  const baseSize = Math.floor(length / pageCount);
  const remainder = length % pageCount;
  const ranges: Array<[number, number]> = [];
  let start = 0;

  for (let index = 0; index < pageCount; index += 1) {
    const chunkSize = baseSize + (index < remainder ? 1 : 0);
    ranges.push([start, start + chunkSize]);
    start += chunkSize;
  }

  return ranges;
}

function exportValueMax(values: number[], precision?: number) {
  const max = values.reduce((current, value) => Number.isFinite(Number(value)) ? Math.max(current, Number(value)) : current, 0);
  if (!(max > 0)) return undefined;
  const padded = max * 1.08;

  if (precision !== undefined) {
    const factor = 10 ** Math.max(0, precision);
    return Number((Math.ceil(padded * factor) / factor).toFixed(Math.max(0, precision)));
  }

  if (max <= 10) return Math.ceil(padded);
  const rawStep = padded / 8;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  return Math.ceil(padded / step) * step;
}

function ExportBarCards(props: {
  chartId: string;
  title: string;
  series: ChartSeries;
  yTickPrecision?: number;
}) {
  const ranges = exportChunkRanges(props.series.labels);
  const maxValue = exportValueMax(props.series.values, props.yTickPrecision);

  return (
    <>
      {ranges.map(([start, end], index) => {
        const labels = props.series.labels.slice(start, end);
        const values = props.series.values.slice(start, end);
        return (
          <BarChartCard
            key={`${props.chartId}-${index}`}
            chartId={props.chartId}
            title={props.title}
            labels={labels}
            values={values}
            height={380}
            minLabelWidth={82}
            maxLabelWidth={112}
            yTickPrecision={props.yTickPrecision}
            maxValue={maxValue}
            exportMode
          />
        );
      })}
    </>
  );
}

function ExportMultiBarCards(props: {
  chartId: string;
  title: string;
  labels: string[];
  datasets: ExportBarDataset[];
  yTickPrecision?: number;
}) {
  const ranges = exportChunkRanges(props.labels, props.datasets.length);
  const maxValue = exportValueMax(props.datasets.flatMap((dataset) => dataset.values), props.yTickPrecision);

  return (
    <>
      {ranges.map(([start, end], index) => {
        const labels = props.labels.slice(start, end);
        const datasets = props.datasets.map((dataset) => ({ ...dataset, values: dataset.values.slice(start, end) }));
        return (
          <MultiBarChartCard
            key={`${props.chartId}-${index}`}
            chartId={props.chartId}
            title={props.title}
            labels={labels}
            datasets={datasets}
            height={400}
            minLabelWidth={88}
            maxLabelWidth={120}
            yTickPrecision={props.yTickPrecision}
            maxValue={maxValue}
            exportMode
          />
        );
      })}
    </>
  );
}

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
            <Icon src={groupIcons[groupKey]} size={18} />
            <span>{props.t(`groups.${groupKey}`)}</span>
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
          <MetricCard label={props.t("cards.total")} value={props.total} loading={props.loading} detailsLabel={props.t("cards.details")} hideDetailsLabel={props.t("cards.hideDetails")} subItems={[{ label: props.t("table.male"), value: props.maleCount }, { label: props.t("table.female"), value: props.femaleCount }]} />
          <MetricCard label={props.t("cards.avgAge")} value={props.avgAge} loading={props.loading} detailsLabel={props.t("cards.details")} hideDetailsLabel={props.t("cards.hideDetails")} subItems={[{ label: props.t("cards.minAge"), value: props.minAge }, { label: props.t("cards.maxAge"), value: props.maxAge }]} />
          <MetricCard label={props.t("cards.avgGrade")} value={props.avgGrade} loading={props.loading} detailsLabel={props.t("cards.details")} hideDetailsLabel={props.t("cards.hideDetails")} subItems={[{ label: props.t("cards.minGrade"), value: props.minGrade }, { label: props.t("cards.maxGrade"), value: props.maxGrade }]} />
        </div>
        <div className="statistics-summary-row" style={props.metricBottomRowStyle}>
          <MetricCard label={props.t("cards.avgStudyYears")} value={props.avgStudyYears} loading={props.loading} detailsLabel={props.t("cards.details")} hideDetailsLabel={props.t("cards.hideDetails")} subItems={[{ label: props.t("cards.minStudyYears"), value: props.minStudyYears }, { label: props.t("cards.maxStudyYears"), value: props.maxStudyYears }]} />
          <MetricCard label={props.t("cards.topGraduationYear")} value={props.busiestYear} loading={props.loading} detailsLabel={props.t("cards.details")} hideDetailsLabel={props.t("cards.hideDetails")} subItems={[{ label: props.t("cards.minGraduationYear"), value: props.quietestYear }]} />
          <MetricCard label={props.t("cards.topCity")} value={props.busiestCity} loading={props.loading} detailsLabel={props.t("cards.details")} hideDetailsLabel={props.t("cards.hideDetails")} detail={props.busiestCityCount === "-" ? "-" : `${props.busiestCityCount} ${props.t("cards.graduatesCount")}`} />
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

function GraduationLineCard(props: Pick<ChartBlockProps, "t" | "cardInnerStyle" | "compactTopbarStyle" | "countChartData" | "countChartOptions" | "exportMode">) {
  return (
    <div className="card" style={props.cardInnerStyle} data-stat-chart-card="true" data-export-chart-id="byYear">
      <div className="topbar" style={props.compactTopbarStyle}>
        <h3 style={{ margin: 0, flex: "1 1 auto", minWidth: 0 }}>{props.t("sections.byYear")}</h3>
        {!props.exportMode ? <ChartFullscreenButton label={props.t("actions.fullscreen")} title={props.t("actions.fullscreen")} /> : null}
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
        <PieChartCard chartId="genderTotal" title={props.t("sections.genderTotal")} labels={props.genderDistributionPie.labels} values={props.genderDistributionPie.values} height={320} control={props.genderDistributionPie.control} colors={["#3b82f6", "#db2777"]} exportMode={props.exportMode} />
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
      <ChartCard chartId="countByEntryYear" title={props.t("sections.countByEntryYear")} labels={props.entryYears.labels} values={props.entryYears.values} height={320} exportMode />
      <ChartCard chartId="birthYear" title={props.t("sections.birthYear")} labels={props.birthYears.labels} values={props.birthYears.values} height={320} exportMode />
      <PieChartCard chartId="genderTotal" title={props.t("sections.genderTotal")} labels={props.genderDistributionPie.labels} values={props.genderDistributionPie.values} height={320} control={props.genderDistributionPie.control} colors={["#3b82f6", "#db2777"]} exportMode />
      <GenderLineCard {...props} exportMode />
      <BarChartCard chartId="gradeDistribution" title={props.t("sections.gradeDistribution")} labels={props.gradeBins.labels} values={props.gradeBins.values} height={320} minLabelWidth={88} maxLabelWidth={128} exportMode />
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
        exportMode
      />
      <BarChartCard chartId="timeToDegreeDistribution" title={props.t("sections.timeToDegreeDistribution")} labels={props.yearsToDegreeDistribution.labels} values={props.yearsToDegreeDistribution.values} height={320} minLabelWidth={64} maxLabelWidth={88} scrollThreshold={18} exportMode />
      <BarChartCard chartId="gradeByYear" title={props.t("sections.gradeByYear")} labels={props.avgGradesByYear.labels} values={props.avgGradesByYear.values} height={320} minLabelWidth={76} maxLabelWidth={96} yTickPrecision={2} exportMode />
      <ExportBarCards chartId="gradeByRegion" title={props.t("sections.gradeByRegion")} series={props.avgGradesByRegion} yTickPrecision={2} />
      <BarChartCard chartId="timeToDegreeByEntryYear" title={props.t("sections.timeToDegreeByEntryYear")} labels={props.yearsToDegree.labels} values={props.yearsToDegree.values} height={320} minLabelWidth={76} maxLabelWidth={96} yTickPrecision={1} exportMode />
      <ExportBarCards chartId="timeToDegreeByRegion" title={props.t("sections.timeToDegreeByRegion")} series={props.yearsToDegreeByRegion} yTickPrecision={1} />
      <ExportBarCards chartId="originRegion" title={props.t("sections.originRegion")} series={props.regions} />
      <ExportMultiBarCards
        chartId="genderByRegion"
        title={props.t("sections.genderByRegion")}
        labels={props.genderByRegion.labels}
        datasets={[
          { label: props.t("table.male"), values: props.genderByRegion.male, color: "#3b82f6", borderColor: "#3b82f6", pointStyle: "circle" },
          { label: props.t("table.female"), values: props.genderByRegion.female, color: "#db2777", borderColor: "#db2777", pointStyle: "diamond", dashed: true },
        ]}
      />
      <ExportBarCards chartId="originMunicipality" title={props.t("sections.originMunicipality")} series={props.municipalities} />
      <ExportMultiBarCards
        chartId="genderByMunicipality"
        title={props.t("sections.genderByMunicipality")}
        labels={props.genderByMunicipality.labels}
        datasets={[
          { label: props.t("table.male"), values: props.genderByMunicipality.male, color: "#3b82f6", borderColor: "#3b82f6", pointStyle: "circle" },
          { label: props.t("table.female"), values: props.genderByMunicipality.female, color: "#db2777", borderColor: "#db2777", pointStyle: "diamond", dashed: true },
        ]}
      />
      <ExportBarCards chartId="originCountry" title={props.t("sections.originCountry")} series={props.countries} />
      <PieChartCard chartId="abroadShare" title={props.t("sections.abroadShare")} labels={[props.t("table.greece"), props.t("table.abroad")]} values={[Math.max(0, props.total - props.abroadCount), props.abroadCount]} height={340} colors={[greeceAbroadColors.greece, greeceAbroadColors.abroad]} exportMode />
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
        exportMode
      />
      <ExportBarCards chartId="timeToDegreeByNomos" title={props.t("sections.timeToDegreeByNomos")} series={props.yearsToDegreeByNomos} yTickPrecision={1} />
    </div>
  );
}
