import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useTranslation } from "react-i18next";
import {
  createRegion,
  deleteRegion,
  importRegionsFile,
  listRegions,
  listUnmatchedCities,
  searchRegions,
  updateRegion,
  type Region,
} from "../lib/api";

type RegionFormState = {
  id: number | null;
  name: string;
  parent_id: string;
  latitude: string;
  longitude: string;
};

type PeripheryFormState = {
  id: number | null;
  name: string;
  latitude: string;
  longitude: string;
};

type UnmatchedCityItem = {
  name: string;
  count: number;
  periphery_id: number | null;
  periphery_name: string | null;
};

type SortDirection = "asc" | "desc";
type RegionSection = "peripheries" | "cities" | "unmatched";

type UnmatchedSortKey = "number" | "name" | "count" | "periphery";
type PeripherySortKey = "number" | "name" | "latitude" | "longitude";
type CitySortKey = "number" | "name" | "periphery" | "latitude" | "longitude";

type ImportSummary = {
  inserted?: number;
  updated?: number;
  skipped?: number;
};

const emptyForm: RegionFormState = {
  id: null,
  name: "",
  parent_id: "",
  latitude: "",
  longitude: "",
};

const emptyPeripheryForm: PeripheryFormState = {
  id: null,
  name: "",
  latitude: "",
  longitude: "",
};

const pageGapStyle: React.CSSProperties = { gap: 14 };
const zeroMarginStyle: React.CSSProperties = { margin: 0 };
const formGridStyle: React.CSSProperties = { marginTop: 12, gap: 10 };
const fieldLabelStyle: React.CSSProperties = { marginBottom: 6 };
const dualGridStyle: React.CSSProperties = { gap: 10 };
const searchInputStyle: React.CSSProperties = { maxWidth: 280 };
const tableWrapStyle: React.CSSProperties = { overflowX: "auto", marginTop: 12 };
const errorStyle: React.CSSProperties = { color: "#b91c1c" };
const successStyle: React.CSSProperties = { color: "#166534" };
const sortableHeaderStyle: React.CSSProperties = { cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" };
const countBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid #e2e8f0",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 13,
  color: "#334155",
  background: "#fff",
};
const topButtonStyle: React.CSSProperties = {
  minWidth: 136,
  height: 40,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
  padding: "0 12px",
  fontSize: 14,
};
const menuWrapStyle: React.CSSProperties = { position: "relative", display: "inline-flex" };
const menuStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  minWidth: 220,
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  boxShadow: "0 12px 32px rgba(15,23,42,.12)",
  padding: 8,
  display: "grid",
  gap: 8,
  zIndex: 40,
};

function toFormState(city: Region): RegionFormState {
  return {
    id: city.id,
    name: city.name,
    parent_id: city.parent_id != null ? String(city.parent_id) : "",
    latitude: city.latitude != null ? String(city.latitude) : "",
    longitude: city.longitude != null ? String(city.longitude) : "",
  };
}

function toPeripheryFormState(item: Region): PeripheryFormState {
  return {
    id: item.id,
    name: item.name,
    latitude: item.latitude != null ? String(item.latitude) : "",
    longitude: item.longitude != null ? String(item.longitude) : "",
  };
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, "el");
}

function compareNullableNumber(a: number | null | undefined, b: number | null | undefined) {
  const left = a ?? Number.NEGATIVE_INFINITY;
  const right = b ?? Number.NEGATIVE_INFINITY;
  return left - right;
}

function applyDirection(value: number, direction: SortDirection) {
  return direction === "asc" ? value : -value;
}

function nextDirection(currentKey: string, activeKey: string, currentDirection: SortDirection): SortDirection {
  if (currentKey !== activeKey) return "asc";
  return currentDirection === "asc" ? "desc" : "asc";
}

function sortIndicator(active: boolean, direction: SortDirection) {
  if (!active) return "";
  return direction === "asc" ? " ▲" : " ▼";
}

function sectionLabel(section: RegionSection, t: ReturnType<typeof useTranslation>["t"]) {
  if (section === "peripheries") return t("sections.peripheries");
  if (section === "cities") return t("sections.cities");
  return t("sections.unmatched");
}

function formatImportSummary(summary: ImportSummary | undefined, t: ReturnType<typeof useTranslation>["t"]) {
  const inserted = Number(summary?.inserted ?? 0);
  const updated = Number(summary?.updated ?? 0);
  const skipped = Number(summary?.skipped ?? 0);
  return t("messages.importDone", { inserted, updated, skipped });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function normalizeKey(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function unmatchedStorageKey(name: string, peripheryId: number | null) {
  return `${normalizeKey(name)}::${peripheryId ?? "none"}`;
}

function readIgnoredUnmatched() {
  try {
    const raw = localStorage.getItem("alupla_regions_hidden_unmatched");
    if (!raw) return [] as string[];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((value) => String(value)) : [];
  } catch {
    return [];
  }
}

function writeIgnoredUnmatched(keys: string[]) {
  try {
    localStorage.setItem("alupla_regions_hidden_unmatched", JSON.stringify(Array.from(new Set(keys))));
  } catch {
  }
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export default function Regions() {
  const { t, i18n } = useTranslation("regions");
  const activeLang: "gr" | "en" = (i18n.resolvedLanguage || i18n.language || "gr").toLowerCase().startsWith("en") ? "en" : "gr";

  const [activeSection, setActiveSection] = useState<RegionSection>("peripheries");
  const [peripheries, setPeripheries] = useState<Region[]>([]);
  const [cities, setCities] = useState<Region[]>([]);
  const [cityQuery, setCityQuery] = useState("");
  const [unmatchedQuery, setUnmatchedQuery] = useState("");
  const [unmatchedItems, setUnmatchedItems] = useState<UnmatchedCityItem[]>([]);
  const [ignoredUnmatchedKeys, setIgnoredUnmatchedKeys] = useState<string[]>(() => readIgnoredUnmatched());
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
    writeIgnoredUnmatched(ignoredUnmatchedKeys);
  }, [ignoredUnmatchedKeys]);

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
      .filter((item) => !ignoredUnmatchedKeys.includes(unmatchedStorageKey(item.name, item.periphery_id)))
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
  }, [ignoredUnmatchedKeys, unmatchedItems, unmatchedSortDirection, unmatchedSortKey]);

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

  const currentSectionCount = activeSection === "peripheries" ? peripheryRows.length : activeSection === "cities" ? cityRows.length : unmatchedRows.length;
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

      if (form.id) {
        await updateRegion(form.id, payload);
        setMessage(t("messages.updated"));
      } else {
        await createRegion(payload);
        setMessage(t("messages.created"));
      }

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
      setSelectedCityIds((current) => current.filter((item) => item !== id));
      await refreshLists();
    } catch (err: any) {
      setError(err?.message || t("messages.error"));
    }
  }

  function hideUnmatched(keys: string[]) {
    if (!keys.length) return;
    clearUnmatchedFeedback();
    setIgnoredUnmatchedKeys((current) => Array.from(new Set([...current, ...keys])));
    setSelectedUnmatchedKeys((current) => current.filter((item) => !keys.includes(item)));
    setUnmatchedMessage(keys.length === 1 ? t("messages.unmatchedDeletedSingle") : t("messages.unmatchedDeletedMany", { count: keys.length }));
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
    hideUnmatched(selectedUnmatchedKeys);
  }

  function togglePeripherySelection(id: number) {
    setSelectedPeripheryIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleCitySelection(id: number) {
    setSelectedCityIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleUnmatchedSelection(key: string) {
    setSelectedUnmatchedKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  function toggleAllPeripheries() {
    if (allVisiblePeripheriesSelected) {
      setSelectedPeripheryIds([]);
      return;
    }
    setSelectedPeripheryIds(peripheryRows.map(({ item }) => item.id));
  }

  function toggleAllCities() {
    if (allVisibleCitiesSelected) {
      setSelectedCityIds([]);
      return;
    }
    setSelectedCityIds(cityRows.map(({ item }) => item.id));
  }

  function toggleAllUnmatched() {
    if (allVisibleUnmatchedSelected) {
      setSelectedUnmatchedKeys([]);
      return;
    }
    setSelectedUnmatchedKeys(unmatchedRows.map(({ item }) => unmatchedStorageKey(item.name, item.periphery_id)));
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
    if (kind === "PERIPHERY") {
      if (activeLang === "en") return [{ Name: "", Latitude: "", Longitude: "" }];
      return [{ Όνομα: "", Latitude: "", Longitude: "" }];
    }
    if (activeLang === "en") return [{ Name: "", Periphery: "", Latitude: "", Longitude: "" }];
    return [{ "Όνομα πόλης": "", Περιφέρεια: "", Latitude: "", Longitude: "" }];
  }

  function downloadTemplate(kind: "PERIPHERY" | "CITY") {
    setTemplateMenuOpen(false);
    const workbook = XLSX.utils.book_new();
    const rows = buildTemplateRows(kind);
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, kind === "PERIPHERY" ? "Peripheries" : "Cities");
    const output = XLSX.write(workbook, { bookType: "xlsx", type: "array", compression: true });
    const filename = kind === "PERIPHERY"
      ? activeLang === "en" ? "regions-peripheries-template.xlsx" : "regions-peripheries-template-gr.xlsx"
      : activeLang === "en" ? "regions-cities-template.xlsx" : "regions-cities-template-gr.xlsx";
    downloadBlob(new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
  }

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
              <span style={countBadgeStyle}>{countText(activeSection)}</span>
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
              <button className="btn" type="button" style={topButtonStyle} onClick={() => {
                setTemplateMenuOpen(false);
                setImportMenuOpen((open) => !open);
              }}>
                {cityImporting || peripheryImporting ? t("topbar.importing") : t("topbar.import")}
              </button>
              {importMenuOpen ? (
                <div style={menuStyle}>
                  <button className="btn" type="button" onClick={() => peripheryImportRef.current?.click()}>{t("topbar.importPeripheries")}</button>
                  <button className="btn" type="button" onClick={() => cityImportRef.current?.click()}>{t("topbar.importCities")}</button>
                </div>
              ) : null}
            </div>

            <div ref={templateMenuRef} style={menuWrapStyle}>
              <button className="btn" type="button" style={topButtonStyle} onClick={() => {
                setImportMenuOpen(false);
                setTemplateMenuOpen((open) => !open);
              }}>
                {t("topbar.downloadTemplate")}
              </button>
              {templateMenuOpen ? (
                <div style={menuStyle}>
                  <button className="btn" type="button" onClick={() => downloadTemplate("PERIPHERY")}>{t("topbar.templatePeripheries")}</button>
                  <button className="btn" type="button" onClick={() => downloadTemplate("CITY")}>{t("topbar.templateCities")}</button>
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
