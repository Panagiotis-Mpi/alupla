import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useTranslation } from "react-i18next";
import {
  createRegion,
  deleteRegion,
  dismissUnmatchedCities,
  importRegionsFile,
  listRegions,
  listUnmatchedCities,
  resolveUnmatchedCity,
  searchRegions,
  updateRegion,
  type Region,
} from "../lib/api";

import {
  applyDirection,
  CitySortKey,
  compareNullableNumber,
  compareText,
  countBadgeStyle,
  countTextStyle,
  downloadBlob,
  dualGridStyle,
  emptyForm,
  emptyPeripheryForm,
  errorStyle,
  fieldLabelStyle,
  formGridStyle,
  formatImportSummary,
  menuStyle,
  menuWrapStyle,
  nextDirection,
  pageGapStyle,
  PeripheryFormState,
  PeripherySortKey,
  replaceVisibleSelection,
  RegionFormState,
  RegionSection,
  sectionLabel,
  searchInputStyle,
  sortableHeaderStyle,
  SortDirection,
  sortIndicator,
  successStyle,
  tableWrapStyle,
  toFormState,
  toPeripheryFormState,
  topButtonStyle,
  toggleIdSelection,
  toggleKeySelection,
  unmatchedStorageKey,
  UnmatchedCityItem,
  UnmatchedSortKey,
  zeroMarginStyle,
} from "./regions/shared";

export default function Regions() {
  const { t, i18n } = useTranslation("regions");
  const activeLang: "gr" | "en" = (i18n.resolvedLanguage || i18n.language || "gr").toLowerCase().startsWith("en") ? "en" : "gr";

  const [activeSection, setActiveSection] = useState<RegionSection>("peripheries");
  const [peripheries, setPeripheries] = useState<Region[]>([]);
  const [cities, setCities] = useState<Region[]>([]);
  const [cityQuery, setCityQuery] = useState("");
  const [unmatchedQuery, setUnmatchedQuery] = useState("");
  const [unmatchedItems, setUnmatchedItems] = useState<UnmatchedCityItem[]>([]);
  const [pendingUnmatchedItem, setPendingUnmatchedItem] = useState<UnmatchedCityItem | null>(null);
  const [form, setForm] = useState<RegionFormState>(emptyForm);
  const [peripheryForm, setPeripheryForm] = useState<PeripheryFormState>(emptyPeripheryForm);
  const [saving, setSaving] = useState(false);
  const [peripherySaving, setPeripherySaving] = useState(false);
  const [cityImporting, setCityImporting] = useState(false);
  const [peripheryImporting, setPeripheryImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [peripheryMessage, setPeripheryMessage] = useState("");
  const [peripheryError, setPeripheryError] = useState("");
  const [unmatchedMessage, setUnmatchedMessage] = useState("");
  const [unmatchedError, setUnmatchedError] = useState("");
  const [unmatchedSortKey, setUnmatchedSortKey] = useState<UnmatchedSortKey>("count");
  const [unmatchedSortDirection, setUnmatchedSortDirection] = useState<SortDirection>("desc");
  const [peripherySortKey, setPeripherySortKey] = useState<PeripherySortKey>("name");
  const [peripherySortDirection, setPeripherySortDirection] = useState<SortDirection>("asc");
  const [citySortKey, setCitySortKey] = useState<CitySortKey>("periphery");
  const [citySortDirection, setCitySortDirection] = useState<SortDirection>("asc");
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [selectedPeripheryIds, setSelectedPeripheryIds] = useState<number[]>([]);
  const [selectedCityIds, setSelectedCityIds] = useState<number[]>([]);
  const [selectedUnmatchedKeys, setSelectedUnmatchedKeys] = useState<string[]>([]);

  const cityImportRef = useRef<HTMLInputElement | null>(null);
  const peripheryImportRef = useRef<HTMLInputElement | null>(null);
  const importMenuRef = useRef<HTMLDivElement | null>(null);
  const templateMenuRef = useRef<HTMLDivElement | null>(null);
  const selectAllPeripheriesRef = useRef<HTMLInputElement | null>(null);
  const selectAllCitiesRef = useRef<HTMLInputElement | null>(null);
  const selectAllUnmatchedRef = useRef<HTMLInputElement | null>(null);

  const setFormValue = <K extends keyof RegionFormState>(key: K, value: RegionFormState[K]) => {
    setForm((state) => ({ ...state, [key]: value }));
  };

  const setPeripheryFormValue = <K extends keyof PeripheryFormState>(key: K, value: PeripheryFormState[K]) => {
    setPeripheryForm((state) => ({ ...state, [key]: value }));
  };

  async function loadPeripheries() {
    const response = await listRegions({ type: "PERIPHERY" });
    setPeripheries(response.items);
  }

  async function loadCities(query?: string) {
    const value = (query ?? cityQuery).trim();
    if (value) {
      const response = await searchRegions({ q: value, type: "CITY" });
      setCities(response.items);
      return;
    }
    const response = await listRegions({ type: "CITY" });
    setCities(response.items);
  }

  async function loadUnmatched(query?: string) {
    const value = (query ?? unmatchedQuery).trim();
    const response = await listUnmatchedCities({ q: value });
    setUnmatchedItems(response.items);
  }

  useEffect(() => {
    void loadPeripheries();
    void loadCities("");
    void loadUnmatched("");
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (importMenuRef.current && !importMenuRef.current.contains(target)) setImportMenuOpen(false);
      if (templateMenuRef.current && !templateMenuRef.current.contains(target)) setTemplateMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const peripheryNameById = useMemo(() => {
    const names = new Map<number, string>();
    peripheries.forEach((item) => names.set(item.id, item.name));
    return names;
  }, [peripheries]);

  const unmatchedRows = useMemo(() => {
    return [...unmatchedItems]
      .map((item, index) => ({ item, index }))
      .sort((left, right) => {
        let result = 0;
        if (unmatchedSortKey === "number") {
          result = left.index - right.index;
        } else if (unmatchedSortKey === "name") {
          result = compareText(left.item.name, right.item.name);
        } else if (unmatchedSortKey === "count") {
          result = left.item.count - right.item.count;
        } else if (unmatchedSortKey === "periphery") {
          result = compareText(left.item.periphery_name ?? "", right.item.periphery_name ?? "");
          if (!result) result = compareText(left.item.name, right.item.name);
        }
        return applyDirection(result, unmatchedSortDirection);
      });
  }, [unmatchedItems, unmatchedSortDirection, unmatchedSortKey]);

  const peripheryRows = useMemo(() => {
    return [...peripheries]
      .map((item, index) => ({ item, index }))
      .sort((left, right) => {
        let result = 0;
        if (peripherySortKey === "number") {
          result = left.index - right.index;
        } else if (peripherySortKey === "name") {
          result = compareText(left.item.name, right.item.name);
        } else if (peripherySortKey === "latitude") {
          result = compareNullableNumber(left.item.latitude, right.item.latitude);
        } else if (peripherySortKey === "longitude") {
          result = compareNullableNumber(left.item.longitude, right.item.longitude);
        }
        return applyDirection(result, peripherySortDirection);
      });
  }, [peripheries, peripherySortDirection, peripherySortKey]);

  const cityRows = useMemo(() => {
    return [...cities]
      .map((item, index) => ({ item, index }))
      .sort((left, right) => {
        const leftPeriphery = peripheryNameById.get(Number(left.item.parent_id)) ?? "";
        const rightPeriphery = peripheryNameById.get(Number(right.item.parent_id)) ?? "";
        let result = 0;
        if (citySortKey === "number") {
          result = left.index - right.index;
        } else if (citySortKey === "name") {
          result = compareText(left.item.name, right.item.name);
        } else if (citySortKey === "periphery") {
          result = compareText(leftPeriphery, rightPeriphery);
          if (!result) result = compareText(left.item.name, right.item.name);
        } else if (citySortKey === "latitude") {
          result = compareNullableNumber(left.item.latitude, right.item.latitude);
        } else if (citySortKey === "longitude") {
          result = compareNullableNumber(left.item.longitude, right.item.longitude);
        }
        return applyDirection(result, citySortDirection);
      });
  }, [cities, citySortDirection, citySortKey, peripheryNameById]);

  const currentSelectedCount = activeSection === "peripheries" ? selectedPeripheryIds.length : activeSection === "cities" ? selectedCityIds.length : selectedUnmatchedKeys.length;

  const allVisiblePeripheriesSelected = peripheryRows.length > 0 && peripheryRows.every(({ item }) => selectedPeripheryIds.includes(item.id));
  const allVisibleCitiesSelected = cityRows.length > 0 && cityRows.every(({ item }) => selectedCityIds.includes(item.id));
  const allVisibleUnmatchedSelected = unmatchedRows.length > 0 && unmatchedRows.every(({ item }) => selectedUnmatchedKeys.includes(unmatchedStorageKey(item.name, item.periphery_id)));

  useEffect(() => {
    if (selectAllPeripheriesRef.current) {
      selectAllPeripheriesRef.current.indeterminate = !!selectedPeripheryIds.length && !allVisiblePeripheriesSelected;
    }
  }, [allVisiblePeripheriesSelected, selectedPeripheryIds.length]);

  useEffect(() => {
    if (selectAllCitiesRef.current) {
      selectAllCitiesRef.current.indeterminate = !!selectedCityIds.length && !allVisibleCitiesSelected;
    }
  }, [allVisibleCitiesSelected, selectedCityIds.length]);

  useEffect(() => {
    if (selectAllUnmatchedRef.current) {
      selectAllUnmatchedRef.current.indeterminate = !!selectedUnmatchedKeys.length && !allVisibleUnmatchedSelected;
    }
  }, [allVisibleUnmatchedSelected, selectedUnmatchedKeys.length]);

  useEffect(() => {
    setSelectedPeripheryIds((current) => current.filter((id) => peripheries.some((item) => item.id === id)));
  }, [peripheries]);

  useEffect(() => {
    setSelectedCityIds((current) => current.filter((id) => cities.some((item) => item.id === id)));
  }, [cities]);

  useEffect(() => {
    setSelectedUnmatchedKeys((current) => current.filter((key) => unmatchedRows.some(({ item }) => unmatchedStorageKey(item.name, item.periphery_id) === key)));
  }, [unmatchedRows]);

  function clearFeedback() {
    setError("");
    setMessage("");
  }

  function clearPeripheryFeedback() {
    setPeripheryError("");
    setPeripheryMessage("");
  }

  function clearUnmatchedFeedback() {
    setUnmatchedError("");
    setUnmatchedMessage("");
  }

  function resetForm() {
    setForm(emptyForm);
    clearFeedback();
  }

  function resetPeripheryForm() {
    setPeripheryForm(emptyPeripheryForm);
    clearPeripheryFeedback();
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onEdit(city: Region) {
    setActiveSection("cities");
    setForm(toFormState(city));
    clearFeedback();
    scrollToTop();
  }

  function onEditPeriphery(item: Region) {
    setActiveSection("peripheries");
    setPeripheryForm(toPeripheryFormState(item));
    clearPeripheryFeedback();
    scrollToTop();
  }

  function useUnmatchedCity(item: UnmatchedCityItem) {
    setPendingUnmatchedItem(item);
    setForm((state) => ({
      ...state,
      id: null,
      name: item.name,
      parent_id: item.periphery_id != null ? String(item.periphery_id) : state.parent_id,
    }));
    clearFeedback();
    setActiveSection("cities");
    scrollToTop();
  }

  async function refreshLists() {
    await Promise.all([loadCities(), loadPeripheries(), loadUnmatched()]);
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    clearFeedback();
    try {
      const payload = {
        name: form.name.trim(),
        type: "CITY" as const,
        parent_id: Number(form.parent_id),
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),
      };

      const response = form.id ? await updateRegion(form.id, payload) : await createRegion(payload);
      const canonicalRegionId = Number(response?.item?.id ?? form.id ?? 0);

      if (pendingUnmatchedItem && canonicalRegionId > 0) {
        const unresolved = unmatchedItems.find((item) => item.name === pendingUnmatchedItem.name && item.periphery_id === pendingUnmatchedItem.periphery_id);
        if (unresolved && (unresolved as any).id) {
          await resolveUnmatchedCity({ unresolved_id: Number((unresolved as any).id), canonical_region_id: canonicalRegionId, create_alias: true });
        }
      }

      setMessage(form.id ? t("messages.updated") : t("messages.created"));
      setPendingUnmatchedItem(null);
      resetForm();
      await refreshLists();
    } catch (err: any) {
      setError(err?.message || t("messages.error"));
    } finally {
      setSaving(false);
    }
  };

  const onPeripherySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPeripherySaving(true);
    clearPeripheryFeedback();
    try {
      const payload = {
        name: peripheryForm.name.trim(),
        type: "PERIPHERY" as const,
        parent_id: null,
        latitude: peripheryForm.latitude === "" ? null : Number(peripheryForm.latitude),
        longitude: peripheryForm.longitude === "" ? null : Number(peripheryForm.longitude),
      };

      if (peripheryForm.id) {
        await updateRegion(peripheryForm.id, payload);
        setPeripheryMessage(t("messages.updated"));
      } else {
        await createRegion(payload);
        setPeripheryMessage(t("messages.peripheryCreated"));
      }
      resetPeripheryForm();
      await refreshLists();
    } catch (err: any) {
      setPeripheryError(err?.message || t("messages.error"));
    } finally {
      setPeripherySaving(false);
    }
  };

  const onImport = async (file: File, mode: "PERIPHERY" | "CITY") => {
    setImportMenuOpen(false);
    if (mode === "PERIPHERY") {
      setPeripheryImporting(true);
      clearPeripheryFeedback();
    } else {
      setCityImporting(true);
      clearFeedback();
    }
    clearUnmatchedFeedback();

    try {
      const response = await importRegionsFile(file, mode);
      const text = formatImportSummary(response?.summary, t);
      if (mode === "PERIPHERY") {
        setPeripheryMessage(text);
        setActiveSection("peripheries");
      } else {
        setMessage(text);
        setActiveSection("cities");
      }
      await refreshLists();
    } catch (err: any) {
      if (mode === "PERIPHERY") {
        setPeripheryError(err?.message || t("messages.importError"));
        setActiveSection("peripheries");
      } else {
        setError(err?.message || t("messages.importError"));
        setActiveSection("cities");
      }
    } finally {
      if (mode === "PERIPHERY") {
        setPeripheryImporting(false);
      } else {
        setCityImporting(false);
      }
    }
  };

  async function removePeriphery(id: number) {
    clearPeripheryFeedback();
    try {
      await deleteRegion(id);
      setPeripheryMessage(t("messages.deleted"));
      if (peripheryForm.id === id) resetPeripheryForm();
      setSelectedPeripheryIds((current) => current.filter((item) => item !== id));
      await refreshLists();
    } catch (err: any) {
      setPeripheryError(err?.message || t("messages.error"));
    }
  }

  async function removeCity(id: number) {
    clearFeedback();
    try {
      await deleteRegion(id);
      setMessage(t("messages.deleted"));
      if (form.id === id) resetForm();
      setPendingUnmatchedItem((current) => (current && Number(current.periphery_id ?? 0) === 0 ? null : current));
      setSelectedCityIds((current) => current.filter((item) => item !== id));
      await refreshLists();
    } catch (err: any) {
      setError(err?.message || t("messages.error"));
    }
  }

  async function hideUnmatched(keys: string[]) {
    if (!keys.length) return;
    clearUnmatchedFeedback();
    const ids = unmatchedRows
      .filter(({ item }) => keys.includes(unmatchedStorageKey(item.name, item.periphery_id)))
      .map(({ item }) => Number((item as any).id))
      .filter((id) => Number.isFinite(id) && id > 0);
    if (!ids.length) return;
    await dismissUnmatchedCities(ids);
    setSelectedUnmatchedKeys((current) => current.filter((item) => !keys.includes(item)));
    setUnmatchedMessage(keys.length === 1 ? t("messages.unmatchedDeletedSingle") : t("messages.unmatchedDeletedMany", { count: keys.length }));
    await loadUnmatched();
  }

  async function onDeleteSelected() {
    if (activeSection === "peripheries") {
      if (!selectedPeripheryIds.length) return;
      if (!window.confirm(t("confirm.bulkDelete", { count: selectedPeripheryIds.length }))) return;
      clearPeripheryFeedback();
      for (const id of selectedPeripheryIds) {
        try {
          await deleteRegion(id);
        } catch (err: any) {
          setPeripheryError(err?.message || t("messages.error"));
          await refreshLists();
          return;
        }
      }
      setPeripheryMessage(t("messages.bulkDeleted", { count: selectedPeripheryIds.length }));
      setSelectedPeripheryIds([]);
      if (peripheryForm.id && selectedPeripheryIds.includes(peripheryForm.id)) resetPeripheryForm();
      await refreshLists();
      return;
    }

    if (activeSection === "cities") {
      if (!selectedCityIds.length) return;
      if (!window.confirm(t("confirm.bulkDelete", { count: selectedCityIds.length }))) return;
      clearFeedback();
      for (const id of selectedCityIds) {
        try {
          await deleteRegion(id);
        } catch (err: any) {
          setError(err?.message || t("messages.error"));
          await refreshLists();
          return;
        }
      }
      setMessage(t("messages.bulkDeleted", { count: selectedCityIds.length }));
      if (form.id && selectedCityIds.includes(form.id)) resetForm();
      setSelectedCityIds([]);
      await refreshLists();
      return;
    }

    if (!selectedUnmatchedKeys.length) return;
    if (!window.confirm(t("confirm.bulkDelete", { count: selectedUnmatchedKeys.length }))) return;
    await hideUnmatched(selectedUnmatchedKeys);
  }

  function togglePeripherySelection(id: number) {
    setSelectedPeripheryIds((current) => toggleIdSelection(current, id));
  }

  function toggleCitySelection(id: number) {
    setSelectedCityIds((current) => toggleIdSelection(current, id));
  }

  function toggleUnmatchedSelection(key: string) {
    setSelectedUnmatchedKeys((current) => toggleKeySelection(current, key));
  }

  function toggleAllPeripheries() {
    setSelectedPeripheryIds(replaceVisibleSelection(peripheryRows.map(({ item }) => item.id), allVisiblePeripheriesSelected));
  }

  function toggleAllCities() {
    setSelectedCityIds(replaceVisibleSelection(cityRows.map(({ item }) => item.id), allVisibleCitiesSelected));
  }

  function toggleAllUnmatched() {
    setSelectedUnmatchedKeys(replaceVisibleSelection(unmatchedRows.map(({ item }) => unmatchedStorageKey(item.name, item.periphery_id)), allVisibleUnmatchedSelected));
  }

  function countText(section: RegionSection) {
    if (section === "peripheries") return t("summary.peripheries", { count: peripheryRows.length });
    if (section === "cities") return t("summary.cities", { count: cityRows.length });
    return t("summary.unmatched", { count: unmatchedRows.length });
  }

  function deleteButtonLabel(section: RegionSection) {
    if (section === "peripheries") return t("topbar.deletePeripheries");
    if (section === "cities") return t("topbar.deleteCities");
    return t("topbar.deleteUnmatched");
  }

  function buildTemplateRows(kind: "PERIPHERY" | "CITY") {
    const latitudeLabel = t("manage.fields.latitude");
    const longitudeLabel = t("manage.fields.longitude");

    if (kind === "PERIPHERY") {
      return [{ [t("table.name")]: "", [latitudeLabel]: "", [longitudeLabel]: "" }];
    }

    return [{ [t("templates.cityName")]: "", [t("manage.fields.periphery")]: "", [latitudeLabel]: "", [longitudeLabel]: "" }];
  }

  function downloadTemplate(kind: "PERIPHERY" | "CITY") {
    setTemplateMenuOpen(false);
    const workbook = XLSX.utils.book_new();
    const rows = buildTemplateRows(kind);
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, kind === "PERIPHERY" ? t("templates.sheetPeripheries") : t("templates.sheetCities"));
    const output = XLSX.write(workbook, { bookType: "xlsx", type: "array", compression: true });
    const filename = kind === "PERIPHERY" ? t("templates.filePeripheries") : t("templates.fileCities");
    downloadBlob(new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
  }

  function closeMenus() {
    setImportMenuOpen(false);
    setTemplateMenuOpen(false);
  }

  function toggleMenu(name: "import" | "template") {
    setImportMenuOpen((current) => (name === "import" ? !current : false));
    setTemplateMenuOpen((current) => (name === "template" ? !current : false));
  }

  const importActions = [
    { key: "peripheries", label: t("topbar.importPeripheries"), onClick: () => { closeMenus(); peripheryImportRef.current?.click(); } },
    { key: "cities", label: t("topbar.importCities"), onClick: () => { closeMenus(); cityImportRef.current?.click(); } },
  ];

  const templateActions = [
    { key: "peripheries", label: t("topbar.templatePeripheries"), onClick: () => { closeMenus(); downloadTemplate("PERIPHERY"); } },
    { key: "cities", label: t("topbar.templateCities"), onClick: () => { closeMenus(); downloadTemplate("CITY"); } },
  ];

  const sectionButtons: RegionSection[] = ["peripheries", "cities", "unmatched"];

  return (
    <div className="grid" style={pageGapStyle}>
      <input
        ref={peripheryImportRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onImport(file, "PERIPHERY");
          e.currentTarget.value = "";
        }}
      />
      <input
        ref={cityImportRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onImport(file, "CITY");
          e.currentTarget.value = "";
        }}
      />

      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>{t("title")}</h2>
              <span style={countTextStyle}>{countText(activeSection)}</span>
              {currentSelectedCount ? <span style={countBadgeStyle}>{t("summary.selected", { count: currentSelectedCount })}</span> : null}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", width: "100%" }}>
            {sectionButtons.map((section) => (
              <button
                key={section}
                type="button"
                className={`btn${activeSection === section ? " primary" : ""}`}
                style={topButtonStyle}
                onClick={() => setActiveSection(section)}
              >
                {sectionLabel(section, t)}
              </button>
            ))}

            <div ref={importMenuRef} style={menuWrapStyle}>
              <button className="btn" type="button" style={topButtonStyle} onClick={() => toggleMenu("import")}>
                {cityImporting || peripheryImporting ? t("topbar.importing") : t("topbar.import")}
              </button>
              {importMenuOpen ? (
                <div style={menuStyle}>
{importActions.map((action) => <button key={action.key} className="btn" type="button" onClick={action.onClick}>{action.label}</button>)}
                </div>
              ) : null}
            </div>

            <div ref={templateMenuRef} style={menuWrapStyle}>
              <button className="btn" type="button" style={topButtonStyle} onClick={() => toggleMenu("template")}>
                {t("topbar.downloadTemplate")}
              </button>
              {templateMenuOpen ? (
                <div style={menuStyle}>
{templateActions.map((action) => <button key={action.key} className="btn" type="button" onClick={action.onClick}>{action.label}</button>)}
                </div>
              ) : null}
            </div>

            <button
              className="btn danger"
              type="button"
              style={topButtonStyle}
              onClick={() => void onDeleteSelected()}
              disabled={!currentSelectedCount}
            >
              {deleteButtonLabel(activeSection)}
            </button>
          </div>
        </div>
      </div>

      {activeSection === "peripheries" ? (
        <div className="card">
          <div className="topbar">
            <h3 style={zeroMarginStyle}>{t("peripheries.title")}</h3>
          </div>

          <form className="grid" style={formGridStyle} onSubmit={onPeripherySubmit}>
            <div>
              <div className="muted" style={fieldLabelStyle}>{t("table.name")}</div>
              <input className="input" value={peripheryForm.name} onChange={(e) => setPeripheryFormValue("name", e.target.value)} />
            </div>
            <div className="grid cols2" style={dualGridStyle}>
              <div>
                <div className="muted" style={fieldLabelStyle}>{t("manage.fields.latitude")}</div>
                <input className="input" value={peripheryForm.latitude} onChange={(e) => setPeripheryFormValue("latitude", e.target.value)} />
              </div>
              <div>
                <div className="muted" style={fieldLabelStyle}>{t("manage.fields.longitude")}</div>
                <input className="input" value={peripheryForm.longitude} onChange={(e) => setPeripheryFormValue("longitude", e.target.value)} />
              </div>
            </div>
            {peripheryError ? <div style={errorStyle}>{peripheryError}</div> : null}
            {peripheryMessage ? <div style={successStyle}>{peripheryMessage}</div> : null}
            <div className="row-actions">
              <button className="btn primary" type="submit" disabled={peripherySaving}>
                {peripheryForm.id ? t("manage.save") : t("manage.create")}
              </button>
              <button className="btn" type="button" onClick={resetPeripheryForm} disabled={peripherySaving}>
                {t("manage.clear")}
              </button>
            </div>
          </form>

          <div style={tableWrapStyle}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 42 }}>
                    <input ref={selectAllPeripheriesRef} type="checkbox" checked={allVisiblePeripheriesSelected} onChange={toggleAllPeripheries} />
                  </th>
                  <th style={sortableHeaderStyle} onClick={() => {
                    const direction = nextDirection(peripherySortKey, "number", peripherySortDirection);
                    setPeripherySortKey("number");
                    setPeripherySortDirection(direction);
                  }}>{t("table.number")}{sortIndicator(peripherySortKey === "number", peripherySortDirection)}</th>
                  <th style={sortableHeaderStyle} onClick={() => {
                    const direction = nextDirection(peripherySortKey, "name", peripherySortDirection);
                    setPeripherySortKey("name");
                    setPeripherySortDirection(direction);
                  }}>{t("table.name")}{sortIndicator(peripherySortKey === "name", peripherySortDirection)}</th>
                  <th style={sortableHeaderStyle} onClick={() => {
                    const direction = nextDirection(peripherySortKey, "latitude", peripherySortDirection);
                    setPeripherySortKey("latitude");
                    setPeripherySortDirection(direction);
                  }}>{t("manage.fields.latitude")}{sortIndicator(peripherySortKey === "latitude", peripherySortDirection)}</th>
                  <th style={sortableHeaderStyle} onClick={() => {
                    const direction = nextDirection(peripherySortKey, "longitude", peripherySortDirection);
                    setPeripherySortKey("longitude");
                    setPeripherySortDirection(direction);
                  }}>{t("manage.fields.longitude")}{sortIndicator(peripherySortKey === "longitude", peripherySortDirection)}</th>
                  <th aria-label={t("manage.actions")}></th>
                </tr>
              </thead>
              <tbody>
                {peripheryRows.map(({ item }, index) => (
                  <tr key={item.id}>
                    <td>
                      <input type="checkbox" checked={selectedPeripheryIds.includes(item.id)} onChange={() => togglePeripherySelection(item.id)} />
                    </td>
                    <td>{index + 1}</td>
                    <td>{item.name}</td>
                    <td>{item.latitude ?? "-"}</td>
                    <td>{item.longitude ?? "-"}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn" type="button" onClick={() => onEditPeriphery(item)}>{t("manage.edit")}</button>
                        <button className="btn danger" type="button" onClick={() => {
                          if (window.confirm(t("confirm.singleDelete"))) void removePeriphery(item.id);
                        }}>{t("manage.delete")}</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!peripheryRows.length && (
                  <tr>
                    <td colSpan={6} className="muted">{t("peripheries.empty")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {activeSection === "cities" ? (
        <div className="card">
          <div className="topbar">
            <h3 style={zeroMarginStyle}>{t("manage.title")}</h3>
            <div className="spacer" />
            {form.id ? (
              <button className="btn" type="button" onClick={resetForm}>
                {t("manage.new")}
              </button>
            ) : null}
          </div>

          <form className="grid" style={formGridStyle} onSubmit={onSubmit}>
            <div>
              <div className="muted" style={fieldLabelStyle}>{t("manage.fields.name")}</div>
              <input className="input" value={form.name} onChange={(e) => setFormValue("name", e.target.value)} />
            </div>
            <div>
              <div className="muted" style={fieldLabelStyle}>{t("manage.fields.periphery")}</div>
              <select className="input" value={form.parent_id} onChange={(e) => setFormValue("parent_id", e.target.value)}>
                <option value="">{t("manage.placeholders.periphery")}</option>
                {peripheries.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div className="grid cols2" style={dualGridStyle}>
              <div>
                <div className="muted" style={fieldLabelStyle}>{t("manage.fields.latitude")}</div>
                <input className="input" value={form.latitude} onChange={(e) => setFormValue("latitude", e.target.value)} />
              </div>
              <div>
                <div className="muted" style={fieldLabelStyle}>{t("manage.fields.longitude")}</div>
                <input className="input" value={form.longitude} onChange={(e) => setFormValue("longitude", e.target.value)} />
              </div>
            </div>
            {error ? <div style={errorStyle}>{error}</div> : null}
            {message ? <div style={successStyle}>{message}</div> : null}
            <div className="row-actions">
              <button className="btn primary" type="submit" disabled={saving}>
                {form.id ? t("manage.save") : t("manage.create")}
              </button>
              <button className="btn" type="button" onClick={resetForm} disabled={saving}>
                {t("manage.clear")}
              </button>
            </div>
          </form>

          <div className="topbar" style={{ marginTop: 16 }}>
            <h3 style={zeroMarginStyle}>{t("manage.listTitle")}</h3>
            <div className="spacer" />
            <input className="input" style={searchInputStyle} value={cityQuery} placeholder={t("manage.search")} onChange={(e) => setCityQuery(e.target.value)} />
            <button className="btn" type="button" onClick={() => void loadCities()}>{t("manage.searchButton")}</button>
          </div>

          <div style={tableWrapStyle}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 42 }}>
                    <input ref={selectAllCitiesRef} type="checkbox" checked={allVisibleCitiesSelected} onChange={toggleAllCities} />
                  </th>
                  <th style={sortableHeaderStyle} onClick={() => {
                    const direction = nextDirection(citySortKey, "number", citySortDirection);
                    setCitySortKey("number");
                    setCitySortDirection(direction);
                  }}>{t("table.number")}{sortIndicator(citySortKey === "number", citySortDirection)}</th>
                  <th style={sortableHeaderStyle} onClick={() => {
                    const direction = nextDirection(citySortKey, "name", citySortDirection);
                    setCitySortKey("name");
                    setCitySortDirection(direction);
                  }}>{t("table.name")}{sortIndicator(citySortKey === "name", citySortDirection)}</th>
                  <th style={sortableHeaderStyle} onClick={() => {
                    const direction = nextDirection(citySortKey, "periphery", citySortDirection);
                    setCitySortKey("periphery");
                    setCitySortDirection(direction);
                  }}>{t("manage.fields.periphery")}{sortIndicator(citySortKey === "periphery", citySortDirection)}</th>
                  <th style={sortableHeaderStyle} onClick={() => {
                    const direction = nextDirection(citySortKey, "latitude", citySortDirection);
                    setCitySortKey("latitude");
                    setCitySortDirection(direction);
                  }}>{t("manage.fields.latitude")}{sortIndicator(citySortKey === "latitude", citySortDirection)}</th>
                  <th style={sortableHeaderStyle} onClick={() => {
                    const direction = nextDirection(citySortKey, "longitude", citySortDirection);
                    setCitySortKey("longitude");
                    setCitySortDirection(direction);
                  }}>{t("manage.fields.longitude")}{sortIndicator(citySortKey === "longitude", citySortDirection)}</th>
                  <th aria-label={t("manage.actions")}></th>
                </tr>
              </thead>
              <tbody>
                {cityRows.map(({ item: city }, index) => (
                  <tr key={city.id}>
                    <td>
                      <input type="checkbox" checked={selectedCityIds.includes(city.id)} onChange={() => toggleCitySelection(city.id)} />
                    </td>
                    <td>{index + 1}</td>
                    <td>{city.name}</td>
                    <td>{peripheryNameById.get(Number(city.parent_id)) ?? "-"}</td>
                    <td>{city.latitude ?? "-"}</td>
                    <td>{city.longitude ?? "-"}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn" type="button" onClick={() => onEdit(city)}>{t("manage.edit")}</button>
                        <button className="btn danger" type="button" onClick={() => {
                          if (window.confirm(t("confirm.singleDelete"))) void removeCity(city.id);
                        }}>{t("manage.delete")}</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!cityRows.length && (
                  <tr>
                    <td colSpan={7} className="muted">{t("manage.emptyCities")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {activeSection === "unmatched" ? (
        <div className="card">
          <div className="topbar">
            <h3 style={zeroMarginStyle}>{t("unmatched.title")}</h3>
            <div className="spacer" />
            <input className="input" style={searchInputStyle} value={unmatchedQuery} placeholder={t("unmatched.search")} onChange={(e) => setUnmatchedQuery(e.target.value)} />
            <button className="btn" type="button" onClick={() => void loadUnmatched()}>{t("unmatched.searchButton")}</button>
          </div>

          {unmatchedError ? <div style={{ ...errorStyle, marginTop: 12 }}>{unmatchedError}</div> : null}
          {unmatchedMessage ? <div style={{ ...successStyle, marginTop: 12 }}>{unmatchedMessage}</div> : null}

          <div style={tableWrapStyle}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 42 }}>
                    <input ref={selectAllUnmatchedRef} type="checkbox" checked={allVisibleUnmatchedSelected} onChange={toggleAllUnmatched} />
                  </th>
                  <th style={sortableHeaderStyle} onClick={() => {
                    const direction = nextDirection(unmatchedSortKey, "number", unmatchedSortDirection);
                    setUnmatchedSortKey("number");
                    setUnmatchedSortDirection(direction);
                  }}>{t("table.number")}{sortIndicator(unmatchedSortKey === "number", unmatchedSortDirection)}</th>
                  <th style={sortableHeaderStyle} onClick={() => {
                    const direction = nextDirection(unmatchedSortKey, "name", unmatchedSortDirection);
                    setUnmatchedSortKey("name");
                    setUnmatchedSortDirection(direction);
                  }}>{t("unmatched.columns.name")}{sortIndicator(unmatchedSortKey === "name", unmatchedSortDirection)}</th>
                  <th style={sortableHeaderStyle} onClick={() => {
                    const direction = nextDirection(unmatchedSortKey, "count", unmatchedSortDirection);
                    setUnmatchedSortKey("count");
                    setUnmatchedSortDirection(direction);
                  }}>{t("unmatched.columns.count")}{sortIndicator(unmatchedSortKey === "count", unmatchedSortDirection)}</th>
                  <th style={sortableHeaderStyle} onClick={() => {
                    const direction = nextDirection(unmatchedSortKey, "periphery", unmatchedSortDirection);
                    setUnmatchedSortKey("periphery");
                    setUnmatchedSortDirection(direction);
                  }}>{t("unmatched.columns.periphery")}{sortIndicator(unmatchedSortKey === "periphery", unmatchedSortDirection)}</th>
                  <th aria-label={t("unmatched.columns.actions")}></th>
                </tr>
              </thead>
              <tbody>
                {unmatchedRows.map(({ item }, index) => {
                  const rowKey = unmatchedStorageKey(item.name, item.periphery_id);
                  return (
                    <tr key={rowKey}>
                      <td>
                        <input type="checkbox" checked={selectedUnmatchedKeys.includes(rowKey)} onChange={() => toggleUnmatchedSelection(rowKey)} />
                      </td>
                      <td>{index + 1}</td>
                      <td>{item.name}</td>
                      <td>{item.count}</td>
                      <td>{item.periphery_name ?? "-"}</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn" type="button" onClick={() => useUnmatchedCity(item)}>{t("unmatched.useInForm")}</button>
                          <button className="btn danger" type="button" onClick={() => {
                            if (window.confirm(t("confirm.singleDelete"))) hideUnmatched([rowKey]);
                          }}>{t("manage.delete")}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!unmatchedRows.length && (
                  <tr>
                    <td colSpan={6} className="muted">{t("unmatched.empty")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
