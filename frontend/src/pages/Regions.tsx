import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createRegion, listRegions, listUnmatchedCities, searchRegions, updateRegion, type Region } from "../lib/api";

const emptyForm = {
  id: null as number | null,
  name: "",
  parent_id: "",
  latitude: "",
  longitude: "",
};

export default function Regions() {
  const { t } = useTranslation("regions");

  const [parentId, setParentId] = useState<number | null>(null);
  const [items, setItems] = useState<Region[]>([]);
  const [stack, setStack] = useState<Array<{ id: number | null; label: string }>>([{ id: null, label: "" }]);
  const [peripheries, setPeripheries] = useState<Region[]>([]);
  const [cities, setCities] = useState<Region[]>([]);
  const [cityQuery, setCityQuery] = useState("");
  const [unmatchedQuery, setUnmatchedQuery] = useState("");
  const [unmatchedItems, setUnmatchedItems] = useState<Array<{ name: string; count: number; periphery_id: number | null; periphery_name: string | null }>>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load(pid: number | null) {
    const r = await listRegions(pid);
    setItems(r.items);
  }

  async function loadPeripheries() {
    const r = await listRegions({ type: "PERIPHERY" });
    setPeripheries(r.items);
  }

  async function loadCities(query?: string) {
    const q = (query ?? cityQuery).trim();
    if (q) {
      const r = await searchRegions({ q, type: "CITY" });
      setCities(r.items);
      return;
    }
    const r = await listRegions({ type: "CITY" });
    setCities(r.items);
  }

  useEffect(() => {
    void load(parentId);
  }, [parentId]);

  async function loadUnmatched(query?: string) {
    const q = (query ?? unmatchedQuery).trim();
    const r = await listUnmatchedCities({ q });
    setUnmatchedItems(r.items);
  }

  useEffect(() => {
    void loadPeripheries();
    void loadCities("");
    void loadUnmatched("");
  }, []);

  const peripheryNameById = useMemo(() => {
    const map = new Map<number, string>();
    peripheries.forEach((item) => map.set(item.id, item.name));
    return map;
  }, [peripheries]);

  const cityRows = useMemo(() => {
    return [...cities].sort((a, b) => {
      const parentA = peripheryNameById.get(Number(a.parent_id)) ?? "";
      const parentB = peripheryNameById.get(Number(b.parent_id)) ?? "";
      if (parentA !== parentB) return parentA.localeCompare(parentB, "el");
      return a.name.localeCompare(b.name, "el");
    });
  }, [cities, peripheryNameById]);

  const resetForm = () => {
    setForm(emptyForm);
    setError("");
    setMessage("");
  };

  const onEdit = (city: Region) => {
    setForm({
      id: city.id,
      name: city.name,
      parent_id: city.parent_id != null ? String(city.parent_id) : "",
      latitude: city.latitude != null ? String(city.latitude) : "",
      longitude: city.longitude != null ? String(city.longitude) : "",
    });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
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
      await Promise.all([loadCities(), load(parentId), loadPeripheries(), loadUnmatched()]);
    } catch (err: any) {
      setError(err?.message || t("messages.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>{t("title")}</h2>
        <div className="spacer" />
        <span className="badge">
          {t("parentId")}: {parentId ?? t("null")}
        </span>
      </div>

      <div className="grid cols2" style={{ alignItems: "start" }}>
        <div className="card">
          <div className="muted">{t("breadcrumb")}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {stack.map((s, idx) => (
              <button
                key={idx}
                className="btn"
                onClick={() => {
                  setParentId(s.id);
                  setStack(stack.slice(0, idx + 1));
                }}
              >
                {s.id === null ? t("root") : s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="topbar" style={{ alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>{t("manage.title")}</h3>
            <div className="spacer" />
            {form.id ? (
              <button className="btn" type="button" onClick={resetForm}>
                {t("manage.new")}
              </button>
            ) : null}
          </div>

          <form className="grid" style={{ marginTop: 12, gap: 10 }} onSubmit={onSubmit}>
            <div>
              <div className="muted" style={{ marginBottom: 6 }}>{t("manage.fields.name")}</div>
              <input className="input" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <div>
              <div className="muted" style={{ marginBottom: 6 }}>{t("manage.fields.periphery")}</div>
              <select className="input" value={form.parent_id} onChange={(e) => setForm((s) => ({ ...s, parent_id: e.target.value }))}>
                <option value="">{t("manage.placeholders.periphery")}</option>
                {peripheries.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div className="grid cols2" style={{ gap: 10 }}>
              <div>
                <div className="muted" style={{ marginBottom: 6 }}>{t("manage.fields.latitude")}</div>
                <input className="input" value={form.latitude} onChange={(e) => setForm((s) => ({ ...s, latitude: e.target.value }))} />
              </div>
              <div>
                <div className="muted" style={{ marginBottom: 6 }}>{t("manage.fields.longitude")}</div>
                <input className="input" value={form.longitude} onChange={(e) => setForm((s) => ({ ...s, longitude: e.target.value }))} />
              </div>
            </div>
            {error ? <div style={{ color: "#b91c1c" }}>{error}</div> : null}
            {message ? <div style={{ color: "#166534" }}>{message}</div> : null}
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
      </div>

      <div className="card">
        <div className="topbar">
          <h3 style={{ margin: 0 }}>{t("unmatched.title")}</h3>
          <div className="spacer" />
          <input
            className="input"
            style={{ maxWidth: 280 }}
            value={unmatchedQuery}
            placeholder={t("unmatched.search")}
            onChange={(e) => setUnmatchedQuery(e.target.value)}
          />
          <button className="btn" onClick={() => void loadUnmatched()}>{t("unmatched.searchButton")}</button>
        </div>

        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>{t("unmatched.columns.name")}</th>
                <th>{t("unmatched.columns.count")}</th>
                <th>{t("unmatched.columns.periphery")}</th>
                <th>{t("unmatched.columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {unmatchedItems.map((item) => (
                <tr key={`${item.name}-${item.periphery_id ?? "none"}`}>
                  <td>{item.name}</td>
                  <td>{item.count}</td>
                  <td>{item.periphery_name ?? "-"}</td>
                  <td>
                    <button
                      className="btn"
                      onClick={() => {
                        setForm((s) => ({
                          ...s,
                          id: null,
                          name: item.name,
                          parent_id: item.periphery_id != null ? String(item.periphery_id) : s.parent_id,
                        }));
                        setError("");
                        setMessage("");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      {t("unmatched.useInForm")}
                    </button>
                  </td>
                </tr>
              ))}
              {!unmatchedItems.length && (
                <tr>
                  <td colSpan={4} className="muted">{t("unmatched.empty")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="topbar">
          <h3 style={{ margin: 0 }}>{t("manage.listTitle")}</h3>
          <div className="spacer" />
          <input
            className="input"
            style={{ maxWidth: 280 }}
            value={cityQuery}
            placeholder={t("manage.search")}
            onChange={(e) => setCityQuery(e.target.value)}
          />
          <button className="btn" onClick={() => void loadCities()}>{t("manage.searchButton")}</button>
        </div>

        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>{t("table.id")}</th>
                <th>{t("table.name")}</th>
                <th>{t("manage.fields.periphery")}</th>
                <th>{t("manage.fields.latitude")}</th>
                <th>{t("manage.fields.longitude")}</th>
                <th>{t("manage.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {cityRows.map((city) => (
                <tr key={city.id}>
                  <td>{city.id}</td>
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

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>{t("table.id")}</th>
              <th>{t("table.type")}</th>
              <th>{t("table.name")}</th>
              <th>{t("table.go")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.type}</td>
                <td>{r.name}</td>
                <td>
                  <button
                    className="btn"
                    onClick={() => {
                      setParentId(r.id);
                      setStack([...stack, { id: r.id, label: r.name }]);
                    }}
                  >
                    {t("children")}
                  </button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={4} className="muted">
                  {t("empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
