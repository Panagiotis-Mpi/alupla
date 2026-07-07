import React from "react";
import type { StatisticsChartId } from "../statisticsExport";
import {
  AcademicCharts,
  DemographicsCharts,
  ExportChartsSurface,
  GeographyCharts,
  StatisticsGroupMenu,
  StatisticsSummaryCards,
} from "./sections";
import { StatisticsExportMenu, StatisticsExportSelectionModal } from "./exportSelection";

export function StatisticsPageView(props: any) {
  const {
    abroadByYear,
    abroadCount,
    activeGroup,
    allChartsSelected,
    avgAge,
    avgGrade,
    avgGradesByRegion,
    avgGradesByYear,
    avgStudyYears,
    birthYears,
    busiestCity,
    busiestCityCount,
    busiestYear,
    cardInnerStyle,
    changeExportCompareRange,
    changeExportGroupRange,
    chartGroups,
    closeExportSelection,
    compactTopbarStyle,
    compareAEnd,
    compareAStart,
    compareBEnd,
    compareBStart,
    compareRows,
    compareSelect,
    compareYearOptions,
    countChartData,
    countChartOptions,
    countries,
    data,
    entryYearOptions,
    entryYears,
    err,
    exportCompareRanges,
    exportCompareRows,
    exportFormatLabel,
    exportGroupRanges,
    exportMenuRef,
    exportOpen,
    exportSurfaceRef,
    exportViewData,
    femaleCount,
    genderByMunicipality,
    genderByRegion,
    genderChartData,
    genderChartOptions,
    genderDistributionPie,
    gradeBins,
    gradeBinsByGender,
    handleExportAction,
    i18n,
    loadedGroups,
    loading,
    maleCount,
    maxAge,
    maxGrade,
    maxStudyYears,
    metricBottomRowStyle,
    metricGridStyle,
    metricTopRowStyle,
    minAge,
    minGrade,
    minStudyYears,
    mobileSummaryOpen,
    municipalities,
    openExportSelection,
    pageRef,
    quietestYear,
    regions,
    sectionButtonsStyle,
    sectionMenuStyle,
    sectionWrapStyle,
    selectedChartIds,
    selectedExportFormat,
    selectedExportGenderEntryYears,
    selectionCheckboxStyle,
    selectionRowStyle,
    setActiveGroup,
    setCompareAEnd,
    setCompareAStart,
    setCompareBEnd,
    setCompareBStart,
    setExportOpen,
    setMobileSummaryOpen,
    t,
    toggleAllCharts,
    toggleAllExportGenderEntryYears,
    toggleExportGenderEntryYear,
    toggleGroupCharts,
    toggleSingleChart,
    topButtonStyle,
    total,
    yearsToDegree,
    yearsToDegreeByNomos,
    yearsToDegreeByRegion,
    yearsToDegreeDistribution,
  } = props;

const renderCompareExportCard = (
    chartId: StatisticsChartId,
    rows: typeof compareRows,
    firstRange: { from: string; to: string },
    secondRange: { from: string; to: string },
  ) => (
    <div className="card statistics-compare-card" data-stat-chart-card="true" data-export-chart-id={chartId}>
      <div className="statistics-compare-head">
        <div className="statistics-compare-title">
          <h3>{t("compare.title")}</h3>
          <p>{t("compare.subtitle")}</p>
        </div>
      </div>
      <div className="statistics-compare-ranges">
        <div className="statistics-compare-range-control">
          <span className="statistics-compare-panel-title">{t("compare.periodA")}</span>
          <span className="statistics-compare-selects">
            <select defaultValue={firstRange.from}><option value={firstRange.from}>{firstRange.from}</option></select>
            <span>–</span>
            <select defaultValue={firstRange.to}><option value={firstRange.to}>{firstRange.to}</option></select>
          </span>
        </div>
        <div className="statistics-compare-range-control">
          <span className="statistics-compare-panel-title">{t("compare.periodB")}</span>
          <span className="statistics-compare-selects">
            <select defaultValue={secondRange.from}><option value={secondRange.from}>{secondRange.from}</option></select>
            <span>–</span>
            <select defaultValue={secondRange.to}><option value={secondRange.to}>{secondRange.to}</option></select>
          </span>
        </div>
      </div>
      <div className="statistics-compare-rows">
        {rows.map((row: any) => (
          <div className="statistics-compare-row" key={row.key}>
            <div className="statistics-compare-metric statistics-compare-row-metric">
              <strong>{row.a}</strong>
              <span>{row.label}</span>
            </div>
            <div className="statistics-compare-arrow" aria-hidden="true">→</div>
            <div className="statistics-compare-metric statistics-compare-row-metric">
              <strong>{row.b}</strong>
              <span>{row.label}</span>
            </div>
            <div className={`statistics-compare-change ${row.direction > 0 ? "is-up" : row.direction < 0 ? "is-down" : "is-neutral"}`}>
              <strong>
                <span className="statistics-compare-change-arrow" aria-hidden="true">{row.direction > 0 ? "↑" : row.direction < 0 ? "↓" : "–"}</span>
                <span className="statistics-compare-change-values">
                  <span className="statistics-compare-change-value">{row.deltaValue ?? row.delta}</span>
                  {row.deltaPercent && row.deltaPercent !== "-" ? <span className="statistics-compare-change-percent">({row.deltaPercent})</span> : null}
                </span>
              </strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (err && !data) return <div className="card">{err}</div>;

  const loadingLabel = t("loading");
  const loadingLabelStyle = { "--statistics-loading-label": JSON.stringify(loadingLabel) } as React.CSSProperties;
  const activeGroupLoading = loading || (activeGroup === "compare" ? !loadedGroups.academic || !loadedGroups.geography : activeGroup !== "demographics" && !loadedGroups[activeGroup]);

  return (
    <>
      <style>{`
        .statistics-chart-loading-region [data-stat-chart-plot] { position: relative; }
        .statistics-chart-loading-region [data-stat-chart-plot] > * { filter: blur(3px); opacity: .72; pointer-events: none; user-select: none; transition: filter .18s ease, opacity .18s ease; }
        .statistics-chart-loading-region [data-stat-chart-plot]::after { content: var(--statistics-loading-label); position: absolute; inset: 0; border-radius: 14px; display: grid; place-items: center; font-size: 18px; font-weight: 800; color: #0f172a; background: rgba(255,255,255,.08); backdrop-filter: blur(2px); pointer-events: none; z-index: 5; }
        html.accessibility-high-contrast .statistics-chart-loading-region [data-stat-chart-plot]::after { background: #fff; color: #000; border: 2px solid #000; }
      `}</style>
      <div className="page-stable-shell statistics-page" ref={pageRef}>
        <div className="card page-header-card page-central-menu-card" style={{ padding: 14 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gap: 14 }}>
              <div className="mobile-summary-title-row page-central-menu-title-row">
                <h2 style={{ margin: 0 }}>{t("pageTitle")}</h2>
              </div>
              <StatisticsGroupMenu
                t={t}
                activeGroup={activeGroup}
                setActiveGroup={setActiveGroup}
                topButtonStyle={topButtonStyle}
                sectionMenuStyle={sectionMenuStyle}
                sectionButtonsStyle={sectionButtonsStyle}
                exportButton={(
                  <>
                    <div ref={exportMenuRef}>
                      <StatisticsExportMenu
                        t={t}
                        open={exportOpen}
                        topButtonStyle={topButtonStyle}
                        onToggle={() => setExportOpen((open: boolean) => !open)}
                        onPick={openExportSelection}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn mobile-summary-toggle statistics-mobile-summary-grid-button"
                      style={topButtonStyle}
                      onClick={() => setMobileSummaryOpen((open: boolean) => !open)}
                    >
                      {mobileSummaryOpen
                        ? t("summary.hide", { defaultValue: i18n.language?.startsWith("en") ? "Hide summary" : "Απόκρυψη" })
                        : t("summary.show", { defaultValue: i18n.language?.startsWith("en") ? "Brief info" : "Σύντομες πληροφορίες" })}
                    </button>
                  </>
                )}
              />
            </div>
          </div>
        </div>

        {activeGroup === "compare" ? (
          <div className="card statistics-compare-card">
            <div className="statistics-compare-head">
              <div className="statistics-compare-title">
                <h3>{t("compare.title")}</h3>
                <p>{t("compare.subtitle")}</p>
              </div>
            </div>
            <div className="statistics-compare-ranges">
              <div className="statistics-compare-range-control">
                <span className="statistics-compare-panel-title">{t("compare.periodA")}</span>
                <span className="statistics-compare-selects">
                  {compareSelect(compareAStart, setCompareAStart)}
                  <span>–</span>
                  {compareSelect(compareAEnd, setCompareAEnd)}
                </span>
              </div>
              <div className="statistics-compare-range-control">
                <span className="statistics-compare-panel-title">{t("compare.periodB")}</span>
                <span className="statistics-compare-selects">
                  {compareSelect(compareBStart, setCompareBStart)}
                  <span>–</span>
                  {compareSelect(compareBEnd, setCompareBEnd)}
                </span>
              </div>
            </div>
            <div className="statistics-compare-rows">
              {compareRows.map((row: any) => (
                <div className="statistics-compare-row" key={row.key}>
                  <div className="statistics-compare-metric statistics-compare-row-metric">
                    <strong>{row.a}</strong>
                    <span>{row.label}</span>
                  </div>
                  <div className="statistics-compare-arrow" aria-hidden="true">→</div>
                  <div className="statistics-compare-metric statistics-compare-row-metric">
                    <strong>{row.b}</strong>
                    <span>{row.label}</span>
                  </div>
                  <div className={`statistics-compare-change ${row.direction > 0 ? "is-up" : row.direction < 0 ? "is-down" : "is-neutral"}`}>
                    <strong>
                      <span className="statistics-compare-change-arrow" aria-hidden="true">{row.direction > 0 ? "↑" : row.direction < 0 ? "↓" : "–"}</span>
                      <span className="statistics-compare-change-values">
                        <span className="statistics-compare-change-value">{row.deltaValue ?? row.delta}</span>
                        {row.deltaPercent && row.deltaPercent !== "-" ? <span className="statistics-compare-change-percent">({row.deltaPercent})</span> : null}
                      </span>
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {activeGroup !== "compare" ? (
        <div className={`mobile-summary-panel${mobileSummaryOpen ? " open" : ""}`}>
          <StatisticsSummaryCards
            t={t}
            total={total}
            maleCount={maleCount}
            femaleCount={femaleCount}
            avgAge={avgAge}
            minAge={minAge}
            maxAge={maxAge}
            avgGrade={avgGrade}
            minGrade={minGrade}
            maxGrade={maxGrade}
            avgStudyYears={avgStudyYears}
            minStudyYears={minStudyYears}
            maxStudyYears={maxStudyYears}
            busiestYear={busiestYear}
            quietestYear={quietestYear}
            busiestCity={busiestCity}
            busiestCityCount={busiestCityCount}
            sectionWrapStyle={sectionWrapStyle}
            metricGridStyle={metricGridStyle}
            metricTopRowStyle={metricTopRowStyle}
            metricBottomRowStyle={metricBottomRowStyle}
            loading={activeGroupLoading}
          />
        </div>
        ) : null}

        {activeGroup !== "compare" ? (
        <div className={activeGroupLoading ? "statistics-chart-loading-region" : undefined} style={activeGroupLoading ? loadingLabelStyle : undefined}>
          {activeGroup === "demographics" ? (
          <DemographicsCharts
            t={t}
            cardInnerStyle={cardInnerStyle}
            compactTopbarStyle={compactTopbarStyle}
            genderChartData={genderChartData}
            genderChartOptions={genderChartOptions}
            countChartData={countChartData}
            countChartOptions={countChartOptions}
            entryYears={entryYears}
            birthYears={birthYears}
            genderDistributionPie={genderDistributionPie}
            gradeBinsByGender={gradeBinsByGender}
            abroadByYear={abroadByYear}
            yearsToDegreeByNomos={yearsToDegreeByNomos}
            avgGradesByYear={avgGradesByYear}
            avgGradesByRegion={avgGradesByRegion}
            gradeBins={gradeBins}
            yearsToDegree={yearsToDegree}
            yearsToDegreeDistribution={yearsToDegreeDistribution}
            yearsToDegreeByRegion={yearsToDegreeByRegion}
            regions={regions}
            genderByRegion={genderByRegion}
            genderByMunicipality={genderByMunicipality}
            municipalities={municipalities}
            countries={countries}
            total={total}
            abroadCount={abroadCount}
          />
        ) : null}

          {activeGroup === "academic" ? (
          <AcademicCharts
            t={t}
            cardInnerStyle={cardInnerStyle}
            compactTopbarStyle={compactTopbarStyle}
            genderChartData={genderChartData}
            genderChartOptions={genderChartOptions}
            countChartData={countChartData}
            countChartOptions={countChartOptions}
            entryYears={entryYears}
            birthYears={birthYears}
            genderDistributionPie={genderDistributionPie}
            gradeBinsByGender={gradeBinsByGender}
            abroadByYear={abroadByYear}
            yearsToDegreeByNomos={yearsToDegreeByNomos}
            avgGradesByYear={avgGradesByYear}
            avgGradesByRegion={avgGradesByRegion}
            gradeBins={gradeBins}
            yearsToDegree={yearsToDegree}
            yearsToDegreeDistribution={yearsToDegreeDistribution}
            yearsToDegreeByRegion={yearsToDegreeByRegion}
            regions={regions}
            genderByRegion={genderByRegion}
            genderByMunicipality={genderByMunicipality}
            municipalities={municipalities}
            countries={countries}
            total={total}
            abroadCount={abroadCount}
          />
        ) : null}

          {activeGroup === "geography" ? (
          <GeographyCharts
            t={t}
            cardInnerStyle={cardInnerStyle}
            compactTopbarStyle={compactTopbarStyle}
            genderChartData={genderChartData}
            genderChartOptions={genderChartOptions}
            countChartData={countChartData}
            countChartOptions={countChartOptions}
            entryYears={entryYears}
            birthYears={birthYears}
            genderDistributionPie={genderDistributionPie}
            gradeBinsByGender={gradeBinsByGender}
            abroadByYear={abroadByYear}
            yearsToDegreeByNomos={yearsToDegreeByNomos}
            avgGradesByYear={avgGradesByYear}
            avgGradesByRegion={avgGradesByRegion}
            gradeBins={gradeBins}
            yearsToDegree={yearsToDegree}
            yearsToDegreeDistribution={yearsToDegreeDistribution}
            yearsToDegreeByRegion={yearsToDegreeByRegion}
            regions={regions}
            genderByRegion={genderByRegion}
            genderByMunicipality={genderByMunicipality}
            municipalities={municipalities}
            countries={countries}
            total={total}
            abroadCount={abroadCount}
          />
          ) : null}
        </div>
        ) : null}
      </div>

      {selectedExportFormat ? (
        <StatisticsExportSelectionModal
          t={t}
          exportFormatLabel={exportFormatLabel}
          chartGroups={chartGroups}
          selectedChartIds={selectedChartIds}
          allChartsSelected={allChartsSelected}
          yearOptions={compareYearOptions}
          groupRanges={exportGroupRanges}
          compareRanges={exportCompareRanges}
          selectionRowStyle={selectionRowStyle}
          selectionCheckboxStyle={selectionCheckboxStyle}
          onClose={closeExportSelection}
          onToggleAll={toggleAllCharts}
          onToggleGroup={toggleGroupCharts}
          onToggleChart={toggleSingleChart}
          onChangeGroupRange={changeExportGroupRange}
          onChangeCompareRange={changeExportCompareRange}
          onConfirm={() => void handleExportAction()}
          isPngExport={selectedExportFormat === "png"}
          genderEntryYearOptions={entryYearOptions}
          selectedGenderEntryYears={selectedExportGenderEntryYears}
          onToggleGenderEntryYear={toggleExportGenderEntryYear}
          onToggleAllGenderEntryYears={toggleAllExportGenderEntryYears}
        />
      ) : null}

      {selectedExportFormat === "png" ? (
        <div
        ref={exportSurfaceRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          left: -20000,
          top: 0,
          width: 1200,
          padding: 24,
          pointerEvents: "none",
          opacity: 1,
          zIndex: 0,
          background: "#ffffff",
        }}
        >
        <ExportChartsSurface
          t={t}
          cardInnerStyle={cardInnerStyle}
          compactTopbarStyle={compactTopbarStyle}
          genderChartData={exportViewData.genderChartData}
          genderChartOptions={genderChartOptions}
          countChartData={exportViewData.countChartData}
          countChartOptions={countChartOptions}
          entryYears={exportViewData.entryYears}
          birthYears={exportViewData.birthYears}
          genderDistributionPie={exportViewData.genderDistributionPie}
          gradeBinsByGender={exportViewData.gradeBinsByGender}
          abroadByYear={exportViewData.abroadByYear}
          yearsToDegreeByNomos={exportViewData.yearsToDegreeByNomos}
          avgGradesByYear={exportViewData.avgGradesByYear}
          avgGradesByRegion={exportViewData.avgGradesByRegion}
          gradeBins={exportViewData.gradeBins}
          yearsToDegree={exportViewData.yearsToDegree}
          yearsToDegreeDistribution={exportViewData.yearsToDegreeDistribution}
          yearsToDegreeByRegion={exportViewData.yearsToDegreeByRegion}
          regions={exportViewData.regions}
          genderByRegion={exportViewData.genderByRegion}
          genderByMunicipality={exportViewData.genderByMunicipality}
          municipalities={exportViewData.municipalities}
          countries={exportViewData.countries}
          total={exportViewData.total}
          abroadCount={exportViewData.abroadCount}
          exportMode
        />
        {renderCompareExportCard("compare", exportCompareRows, exportCompareRanges.a, exportCompareRanges.b)}
        </div>
      ) : null}
    </>
  );
}
