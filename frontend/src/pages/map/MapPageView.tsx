import { MapTopControls, MapYearTimeline, MapExportSelectionModal } from "./controls";
import { detailValue } from "./viewHelpers";
import { localizedCountryRecordName, localizedPeripheryRecordName } from "./markers";
import { MapSummary } from "./MapSummary";
import { MapCanvas } from "./MapCanvas";

export function MapPageView(props: any) {
  const {
    mt,
    ct,
    loading,
    mapMetric,
    mapScope,
    mapLanguage,
    metricOptions,
    resetSelectedCityCard,
    setMetricTransitionLoading,
    setMapMetric,
    setScopeTransitionLoading,
    setMapScope,
    openExportSelection,
    mobileSummaryOpen,
    setMobileSummaryOpen,
    mobileTimelineOpen,
    setMobileTimelineOpen,
    summaryLoading,
    overallSummaryTotal,
    greeceSummaryTotal,
    abroadSummaryTotal,
    topPeriphery,
    topCityName,
    topCity,
    topAbroadCountry,
    topAbroadCountryLoading,
    timelineLoading,
    availableYears,
    selectedGraduationYearStart,
    selectedGraduationYearEnd,
    setScopeTotals,
    setSelectedGraduationYearStart,
    setSelectedGraduationYearEnd,
    isCompactViewport,
    worldBounds,
    activeBounds,
    activeInitialZoom,
    activeMinZoom,
    activeFitMaxZoom,
    fitPadding,
    mapRef,
    mapCanvasRef,
    renderedMarkers,
    selectedCityCard,
    highContrastEnabled,
    inlineMapLoading,
    mapViewSettling,
    renderedLegendEntries,
    legendDescription,
    setMapZoom,
    setMapBounds,
    markMapViewChanging,
    markMapViewReady,
    selectCityCard,
    clearSelectedCityCard,
    shouldShowMarkerLabel,
    mapPopupTitle,
    mapPopupTotalText,
    selectedExportFormat,
    exportCategoryOptions,
    selectedExportSelections,
    exportingSelection,
    exportYearOptions,
    exportCategoryRanges,
    closeExportSelection,
    toggleAllExportSelections,
    toggleExportScopeSelection,
    toggleExportCategorySelections,
    changeExportCategoryRange,
    handleExportSelection,
  } = props;

  function detailGroups(item: any) {
    if (mapMetric === "dominant_gender") {
      return [
        {
          title: mt("detailGroups.demographics", { defaultValue: "Δημογραφικά" }),
          rows: [
            { label: mt("maleCount", { defaultValue: "Άνδρες" }), value: detailValue(item.male_count ?? 0) },
            { label: mt("femaleCount", { defaultValue: "Γυναίκες" }), value: detailValue(item.female_count ?? 0) },
            { label: mt("malePct", { defaultValue: "% Άνδρες" }), value: detailValue(item.male_pct, "%") },
            { label: mt("femalePct", { defaultValue: "% Γυναίκες" }), value: detailValue(item.female_pct, "%") },
          ],
        },
      ];
    }
    return [
      {
        title: mt("detailGroups.demographics", { defaultValue: "Δημογραφικά" }),
        rows: [{ label: mt("avgAge", { defaultValue: "Μέση ηλικία" }), value: detailValue(item.avg_age) }],
      },
      {
        title: mt("detailGroups.academics", { defaultValue: "Ακαδημαϊκά" }),
        rows: [
          { label: mt("avgGrade", { defaultValue: "Μέσος βαθμός" }), value: detailValue(item.avg_grade) },
          {
            label: mt("avgGraduationYears", { defaultValue: "Μέσος χρόνος αποφοίτησης" }),
            value: detailValue(item.avg_graduation_years),
          },
        ],
      },
    ];
  }

  return (
    <div className="container map-page-container">
      <MapTopControls
        summaryToggle={
          <button type="button" className="btn mobile-summary-toggle" onClick={() => setMobileSummaryOpen((open: boolean) => !open)}>
            {mobileSummaryOpen
              ? mt("summary.hide", { defaultValue: mapLanguage === "en" ? "Hide summary" : "Απόκρυψη" })
              : mt("summary.show", { defaultValue: mapLanguage === "en" ? "Brief info" : "Σύντομες πληροφορίες" })}
          </button>
        }
        timelineToggle={
          <button type="button" className="btn mobile-summary-toggle" onClick={() => setMobileTimelineOpen((open: boolean) => !open)}>
            {mobileTimelineOpen
              ? mt("timeline.hide", { defaultValue: mapLanguage === "en" ? "Hide period" : "Απόκρυψη" })
              : mt("timeline.show", { defaultValue: mapLanguage === "en" ? "Time period" : "Χρονικό διάστημα" })}
          </button>
        }
        mt={mt}
        ct={ct}
        loading={loading}
        mapMetric={mapMetric}
        mapScope={mapScope}
        metricOptions={metricOptions}
        language={mapLanguage}
        onMetricChange={(metric) => {
          if (metric === mapMetric) return;
          resetSelectedCityCard();
          setMetricTransitionLoading(true);
          setMapMetric(metric);
        }}
        onScopeChange={(scope) => {
          if (scope === mapScope) return;
          resetSelectedCityCard();
          setScopeTransitionLoading(true);
          setMapScope(scope);
        }}
        onExportClick={() => openExportSelection("png")}
      />

      <MapSummary
        mt={mt}
        mapScope={mapScope}
        open={mobileSummaryOpen}
        summaryLoading={summaryLoading}
        overallTotal={overallSummaryTotal}
        greeceTotal={greeceSummaryTotal}
        abroadTotal={abroadSummaryTotal}
        topScopeName={
          topPeriphery
            ? mapScope === "abroad"
              ? localizedCountryRecordName(topPeriphery, mapLanguage)
              : localizedPeripheryRecordName(topPeriphery, mapLanguage)
            : ""
        }
        topScopeCount={topPeriphery ? Number(topPeriphery.count) : null}
        topCityName={topCityName}
        topCityCount={topCity ? Number(topCity.count) : null}
        topAbroadName={topAbroadCountry ? localizedCountryRecordName(topAbroadCountry, mapLanguage) : ""}
        topAbroadCount={topAbroadCountry ? Number(topAbroadCountry.count) : null}
        topAbroadLoading={topAbroadCountryLoading}
      />

      <div className={`map-timeline-shell mobile-timeline-panel${mobileTimelineOpen ? " open" : ""}${timelineLoading ? " is-loading" : ""}`}>
        <MapYearTimeline
          mt={mt}
          years={availableYears}
          selectedStartYear={selectedGraduationYearStart}
          selectedEndYear={selectedGraduationYearEnd}
          loading={timelineLoading}
          onRangeChange={(startYear, endYear) => {
            resetSelectedCityCard();
            setScopeTotals({});
            setSelectedGraduationYearStart(startYear);
            setSelectedGraduationYearEnd(endYear);
          }}
        />
      </div>

      <MapCanvas
        mt={mt}
        mapScope={mapScope}
        mapMetric={mapMetric}
        isCompactViewport={isCompactViewport}
        worldBounds={worldBounds}
        activeBounds={activeBounds}
        activeInitialZoom={activeInitialZoom}
        activeMinZoom={activeMinZoom}
        activeFitMaxZoom={activeFitMaxZoom}
        fitPadding={fitPadding}
        mapRef={mapRef}
        mapCanvasRef={mapCanvasRef}
        renderedMarkers={renderedMarkers}
        selectedCityCard={selectedCityCard}
        highContrastEnabled={highContrastEnabled}
        inlineMapLoading={inlineMapLoading}
        mapViewSettling={mapViewSettling}
        legendEntries={renderedLegendEntries}
        legendDescription={legendDescription}
        onZoomChange={setMapZoom}
        onBoundsChange={setMapBounds}
        onViewChangeStart={markMapViewChanging}
        onViewChangeEnd={markMapViewReady}
        onMarkerClick={(city) => void selectCityCard(city)}
        onPopupRemove={clearSelectedCityCard}
        shouldShowMarkerLabel={shouldShowMarkerLabel}
        popupTitle={mapPopupTitle}
        popupTotalText={mapPopupTotalText}
        detailGroups={detailGroups}
      />

      {selectedExportFormat ? (
        <MapExportSelectionModal
          mt={mt}
          ct={ct}
          selectedExportFormat={selectedExportFormat}
          exportCategoryOptions={exportCategoryOptions}
          selectedExportSelections={selectedExportSelections}
          exportingSelection={exportingSelection}
          yearOptions={exportYearOptions}
          categoryRanges={exportCategoryRanges}
          onClose={closeExportSelection}
          onToggleAllSelections={toggleAllExportSelections}
          onToggleScopeSelection={toggleExportScopeSelection}
          onToggleCategorySelections={toggleExportCategorySelections}
          onChangeCategoryRange={changeExportCategoryRange}
          onConfirm={() => void handleExportSelection()}
        />
      ) : null}
    </div>
  );
}
