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

type UnmatchedCityItem = {
  name: string;
  count: number;
  periphery_id: number | null;
  periphery_name: string | null;
};

const emptyForm: RegionFormState = {
  id: null,
  name: "",
  parent_id: "",
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

function toFormState(city: Region): RegionFormState {
  return {
    id: city.id,
    name: city.name,
    parent_id: city.parent_id != null ? String(city.parent_id) : "",
    latitude: city.latitude != null ? String(city.latitude) : "",
    longitude: city.longitude != null ? String(city.longitude) : "",
  };
}

export default function Regions() {
  const { t } = useTranslation("regions");

  const [peripheries, setPeripheries] = useState<Region[]>([]);
  const [cities, setCities] = useState<Region[]>([]);
  const [cityQuery, setCityQuery] = useState("");
  const [unmatchedQuery, setUnmatchedQuery] = useState("");
  const [unmatchedItems, setUnmatchedItems] = useState<UnmatchedCityItem[]>([]);
  const [form, setForm] = useState<RegionFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const setFormValue = <K extends keyof RegionFormState>(key: K, value: RegionFormState[K]) => {
    setForm((state) => ({ ...state, [key]: value }));
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

  const cityRows = useMemo(() => {
    return [...cities].sort((a, b) => {
      const parentA = peripheryNameById.get(Number(a.parent_id)) ?? "";
      const parentB = peripheryNameById.get(Number(b.parent_id)) ?? "";
      if (parentA !== parentB) return parentA.localeCompare(parentB, "el");
      return a.name.localeCompare(b.name, "el");
    });
  }, [cities, peripheryNameById]);

  function clearFeedback() {
    setError("");
    setMessage("");
  }

  function resetForm() {
    setForm(emptyForm);
    clearFeedback();
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onEdit(city: Region) {
    setForm(toFormState(city));
    clearFeedback();
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
                <th>{t("table.number")}</th>
                <th>{t("unmatched.columns.name")}</th>
                <th>{t("unmatched.columns.count")}</th>
                <th>{t("unmatched.columns.periphery")}</th>
                <th>{t("unmatched.columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {unmatchedItems.map((item, index) => (
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
              {!unmatchedItems.length && (
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
          <h3 style={zeroMarginStyle}>{t("peripheries.title")}</h3>
        </div>

        <div style={tableWrapStyle}>
          <table className="table">
            <thead>
              <tr>
                <th>{t("table.number")}</th>
                <th>{t("table.name")}</th>
                <th>{t("manage.fields.latitude")}</th>
                <th>{t("manage.fields.longitude")}</th>
              </tr>
            </thead>
            <tbody>
              {peripheries.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.name}</td>
                  <td>{item.latitude ?? "-"}</td>
                  <td>{item.longitude ?? "-"}</td>
                </tr>
              ))}
              {!peripheries.length && (
                <tr>
                  <td colSpan={4} className="muted">{t("peripheries.empty")}</td>
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
                <th>{t("table.number")}</th>
                <th>{t("table.name")}</th>
                <th>{t("manage.fields.periphery")}</th>
                <th>{t("manage.fields.latitude")}</th>
                <th>{t("manage.fields.longitude")}</th>
                <th>{t("manage.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {cityRows.map((city, index) => (
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
