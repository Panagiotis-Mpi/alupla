import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createRegion, listRegions, listUnmatchedCities, searchRegions, updateRegion, type Region } from "../lib/api";

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

type UnmatchedSortKey = "number" | "name" | "count" | "periphery";
type PeripherySortKey = "number" | "name" | "latitude" | "longitude";
type CitySortKey = "number" | "name" | "periphery" | "latitude" | "longitude";

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
const alignedTopbarStyle: React.CSSProperties = { alignItems: "center" };
const formGridStyle: React.CSSProperties = { marginTop: 12, gap: 10 };
const fieldLabelStyle: React.CSSProperties = { marginBottom: 6 };
const dualGridStyle: React.CSSProperties = { gap: 10 };
const searchInputStyle: React.CSSProperties = { maxWidth: 280 };
const tableWrapStyle: React.CSSProperties = { overflowX: "auto", marginTop: 12 };
const errorStyle: React.CSSProperties = { color: "#b91c1c" };
const successStyle: React.CSSProperties = { color: "#166534" };
const sortableHeaderStyle: React.CSSProperties = { cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" };

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

export default function Regions() {
  const { t } = useTranslation("regions");

  const [peripheries, setPeripheries] = useState<Region[]>([]);
  const [cities, setCities] = useState<Region[]>([]);
  const [cityQuery, setCityQuery] = useState("");
  const [unmatchedQuery, setUnmatchedQuery] = useState("");
  const [unmatchedItems, setUnmatchedItems] = useState<UnmatchedCityItem[]>([]);
  const [form, setForm] = useState<RegionFormState>(emptyForm);
  const [peripheryForm, setPeripheryForm] = useState<PeripheryFormState>(emptyPeripheryForm);
  const [saving, setSaving] = useState(false);
  const [peripherySaving, setPeripherySaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [peripheryMessage, setPeripheryMessage] = useState("");
  const [peripheryError, setPeripheryError] = useState("");
  const [unmatchedSortKey, setUnmatchedSortKey] = useState<UnmatchedSortKey>("count");
  const [unmatchedSortDirection, setUnmatchedSortDirection] = useState<SortDirection>("desc");
  const [peripherySortKey, setPeripherySortKey] = useState<PeripherySortKey>("name");
  const [peripherySortDirection, setPeripherySortDirection] = useState<SortDirection>("asc");
  const [citySortKey, setCitySortKey] = useState<CitySortKey>("periphery");
  const [citySortDirection, setCitySortDirection] = useState<SortDirection>("asc");

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

  function clearFeedback() {
    setError("");
    setMessage("");
  }

  function clearPeripheryFeedback() {
    setPeripheryError("");
    setPeripheryMessage("");
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
    setForm(toFormState(city));
    clearFeedback();
    scrollToTop();
  }

  function onEditPeriphery(item: Region) {
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
    scrollToTop();
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
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      };

      if (form.id) {
        await updateRegion(form.id, payload);
        setMessage(t("messages.updated"));
      } else {
        await createRegion(payload);
        setMessage(t("messages.created"));
      }

      resetForm();
      await Promise.all([loadCities(), loadPeripheries(), loadUnmatched()]);
    } catch (err: any) {
      setError(err?.message || t("messages.error"));
    } finally {
      setSaving(false);
    }
  };

  const onPeripherySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!peripheryForm.id) return;
    setPeripherySaving(true);
    clearPeripheryFeedback();
    try {
      await updateRegion(peripheryForm.id, {
        name: peripheryForm.name.trim(),
        type: "PERIPHERY",
        parent_id: null,
        latitude: peripheryForm.latitude === "" ? null : Number(peripheryForm.latitude),
        longitude: peripheryForm.longitude === "" ? null : Number(peripheryForm.longitude),
      });
      setPeripheryMessage(t("messages.updated"));
      await Promise.all([loadPeripheries(), loadCities(), loadUnmatched()]);
    } catch (err: any) {
      setPeripheryError(err?.message || t("messages.error"));
    } finally {
      setPeripherySaving(false);
    }
  };

  return (
    <div className="grid" style={pageGapStyle}>
      <div className="topbar">
        <h2 style={zeroMarginStyle}>{t("title")}</h2>
      </div>

      <div className="card">
        <div className="topbar" style={alignedTopbarStyle}>
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
      </div>

      <div className="card">
        <div className="topbar" style={alignedTopbarStyle}>
          <h3 style={zeroMarginStyle}>{t("peripheries.title")}</h3>
          <div className="spacer" />
          {peripheryForm.id ? (
            <button className="btn" type="button" onClick={resetPeripheryForm}>
              {t("manage.clear")}
            </button>
          ) : null}
        </div>

        <form className="grid" style={formGridStyle} onSubmit={onPeripherySubmit}>
          <div>
            <div className="muted" style={fieldLabelStyle}>{t("table.name")}</div>
            <input
              className="input"
              value={peripheryForm.name}
              onChange={(e) => setPeripheryFormValue("name", e.target.value)}
              disabled={!peripheryForm.id}
            />
          </div>
          <div className="grid cols2" style={dualGridStyle}>
            <div>
              <div className="muted" style={fieldLabelStyle}>{t("manage.fields.latitude")}</div>
              <input
                className="input"
                value={peripheryForm.latitude}
                onChange={(e) => setPeripheryFormValue("latitude", e.target.value)}
                disabled={!peripheryForm.id}
              />
            </div>
            <div>
              <div className="muted" style={fieldLabelStyle}>{t("manage.fields.longitude")}</div>
              <input
                className="input"
                value={peripheryForm.longitude}
                onChange={(e) => setPeripheryFormValue("longitude", e.target.value)}
                disabled={!peripheryForm.id}
              />
            </div>
          </div>
          {peripheryError ? <div style={errorStyle}>{peripheryError}</div> : null}
          {peripheryMessage ? <div style={successStyle}>{peripheryMessage}</div> : null}
          <div className="row-actions">
            <button className="btn primary" type="submit" disabled={peripherySaving || !peripheryForm.id}>
              {t("manage.save")}
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
                <th>{t("manage.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {peripheryRows.map(({ item }, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.name}</td>
                  <td>{item.latitude ?? "-"}</td>
                  <td>{item.longitude ?? "-"}</td>
                  <td>
                    <button className="btn" onClick={() => onEditPeriphery(item)}>{t("manage.edit")}</button>
                  </td>
                </tr>
              ))}
              {!peripheryRows.length && (
                <tr>
                  <td colSpan={5} className="muted">{t("peripheries.empty")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="topbar">
          <h3 style={zeroMarginStyle}>{t("unmatched.title")}</h3>
          <div className="spacer" />
          <input
            className="input"
            style={searchInputStyle}
            value={unmatchedQuery}
            placeholder={t("unmatched.search")}
            onChange={(e) => setUnmatchedQuery(e.target.value)}
          />
          <button className="btn" onClick={() => void loadUnmatched()}>{t("unmatched.searchButton")}</button>
        </div>

        <div style={tableWrapStyle}>
          <table className="table">
            <thead>
              <tr>
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
                <th>{t("unmatched.columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {unmatchedRows.map(({ item }, index) => (
                <tr key={`${item.name}-${item.periphery_id ?? "none"}`}>
                  <td>{index + 1}</td>
                  <td>{item.name}</td>
                  <td>{item.count}</td>
                  <td>{item.periphery_name ?? "-"}</td>
                  <td>
                    <button className="btn" onClick={() => useUnmatchedCity(item)}>
                      {t("unmatched.useInForm")}
                    </button>
                  </td>
                </tr>
              ))}
              {!unmatchedRows.length && (
                <tr>
                  <td colSpan={5} className="muted">{t("unmatched.empty")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="topbar">
          <h3 style={zeroMarginStyle}>{t("manage.listTitle")}</h3>
          <div className="spacer" />
          <input
            className="input"
            style={searchInputStyle}
            value={cityQuery}
            placeholder={t("manage.search")}
            onChange={(e) => setCityQuery(e.target.value)}
          />
          <button className="btn" onClick={() => void loadCities()}>{t("manage.searchButton")}</button>
        </div>

        <div style={tableWrapStyle}>
          <table className="table">
            <thead>
              <tr>
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
                <th>{t("manage.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {cityRows.map(({ item: city }, index) => (
                <tr key={city.id}>
                  <td>{index + 1}</td>
                  <td>{city.name}</td>
                  <td>{peripheryNameById.get(Number(city.parent_id)) ?? "-"}</td>
                  <td>{city.latitude ?? "-"}</td>
                  <td>{city.longitude ?? "-"}</td>
                  <td>
                    <button className="btn" onClick={() => onEdit(city)}>{t("manage.edit")}</button>
                  </td>
                </tr>
              ))}
              {!cityRows.length && (
                <tr>
                  <td colSpan={6} className="muted">{t("manage.emptyCities")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
