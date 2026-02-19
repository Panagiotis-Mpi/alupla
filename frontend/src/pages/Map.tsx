import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { getGraduatesMap, type GraduatesMapItem } from "../lib/api";
import greeceRegionsRaw from "../assets/greece-regions.geojson?raw";

type AgeGroup = "" | "18-22" | "23-26" | "27-30" | "31+";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeKey(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tryParseGeoJson(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function Map() {
  const { t, i18n } = useTranslation();

  const [year, setYear] = useState<string>("");
  const [studyProgramId, setStudyProgramId] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("");

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<GraduatesMapItem[]>([]);
  const [selected, setSelected] = useState<GraduatesMapItem | null>(null);

  const geojson = useMemo(() => tryParseGeoJson(greeceRegionsRaw), []);

  // Build counts map keyed by periphery_name (Greek), normalized.
  const countsByGreekName = useMemo(() => {
    const M = new (globalThis as any).Map<string, number>();
    for (const it of items) {
      const name = String((it as any).periphery_name ?? "");
      const c = Number((it as any).count ?? 0) || 0;
      if (name) M.set(normalizeKey(name), c);
    }
    return M as Map<string, number>;
  }, [items]);

  const maxCount = useMemo(() => {
    let m = 1;
    for (const it of items) {
      const c = Number((it as any).count ?? 0) || 0;
      if (c > m) m = c;
    }
    return m;
  }, [items]);

  // IMPORTANT: GeoJSON tooltips are bound once. Use refs so events always read latest counts/items.
  const countsRef = useRef<Map<string, number>>(countsByGreekName);
  const itemsRef = useRef<GraduatesMapItem[]>(items);

  useEffect(() => {
    countsRef.current = countsByGreekName;
  }, [countsByGreekName]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  async function onApply() {
    setLoading(true);
    setSelected(null);
    try {
      const res = await getGraduatesMap({
        year: year || undefined,
        study_program_id: studyProgramId || undefined,
        gender: gender || undefined,
        age_group: ageGroup || undefined,
      });
      setItems(res?.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  function onReset() {
    setYear("");
    setStudyProgramId("");
    setGender("");
    setAgeGroup("");
    setItems([]);
    setSelected(null);
  }

  function fillOpacityForCount(c: number) {
    const ratio = maxCount <= 0 ? 0 : c / maxCount;
    return clamp(0.15 + ratio * 0.65, 0.15, 0.8);
  }

  function featureGreekName(feature: any): string {
    // Prefer greek field if exists; fallback to "name" (might be English).
    const p = feature?.properties || {};
    return String(p.name_greek || p.name_el || p.name || p.NAME || "");
  }

  function featureDisplayName(feature: any): string {
    const p = feature?.properties || {};
    // If UI language is EN and we have English label, show it; otherwise show Greek.
    if (i18n.language?.toLowerCase().startsWith("en")) {
      return String(p.name_en || p.name || p.NAME || p.name_greek || "");
    }
    return featureGreekName(feature);
  }

  function currentCountForFeature(feature: any): number {
    const key = normalizeKey(featureGreekName(feature));
    return countsRef.current.get(key) ?? 0;
  }

  function renderTooltipHtml(feature: any): string {
    const label = featureDisplayName(feature);
    const c = currentCountForFeature(feature);
    const totalLabel = t("map.total", { total: c, defaultValue: "Σύνολο: {{total}}" });
    return `<div style="font-weight:700">${label}</div><div style="font-size:12px;opacity:.9">${totalLabel}</div>`;
  }

  const total = useMemo(() => items.reduce((s, it: any) => s + (Number(it.count) || 0), 0), [items]);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h2 style={{ margin: 0 }}>{t("map.title", { defaultValue: "Χάρτης αποφοίτων (Περιφέρειες)" })}</h2>
        <span className="badge">
          {loading
            ? t("common.loading", { defaultValue: "Φόρτωση..." })
            : `${t("common.ready", { defaultValue: "Έτοιμο" })} · ${t("map.totalInline", { defaultValue: "Σύνολο" })}: ${total}`}
        </span>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="grid cols4" style={{ alignItems: "end", gap: 12 }}>
          <div>
            <div className="label">{t("map.filters.year", { defaultValue: "Έτος αποφοίτησης" })}</div>
            <input value={year} onChange={(e) => setYear(e.target.value)} placeholder={t("map.filters.yearPh", { defaultValue: "π.χ. 2026" })} />
          </div>

          <div>
            <div className="label">{t("map.filters.programId", { defaultValue: "ID προγράμματος" })}</div>
            <input value={studyProgramId} onChange={(e) => setStudyProgramId(e.target.value)} placeholder={t("map.filters.programIdPh", { defaultValue: "π.χ. 1" })} />
          </div>

          <div>
            <div className="label">{t("map.filters.gender", { defaultValue: "Φύλο" })}</div>
            <select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">{t("common.all", { defaultValue: "Όλα" })}</option>
              <option value="M">{t("common.male", { defaultValue: "Άνδρας" })}</option>
              <option value="F">{t("common.female", { defaultValue: "Γυναίκα" })}</option>
            </select>
          </div>

          <div>
            <div className="label">{t("map.filters.ageGroup", { defaultValue: "Ηλικιακή ομάδα" })}</div>
            <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}>
              <option value="">{t("common.all", { defaultValue: "Όλα" })}</option>
              <option value="18-22">18-22</option>
              <option value="23-26">23-26</option>
              <option value="27-30">27-30</option>
              <option value="31+">31+</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <button onClick={onApply} disabled={loading}>{t("common.apply", { defaultValue: "Εφαρμογή" })}</button>
          <button className="secondary" onClick={onReset} disabled={loading}>{t("common.reset", { defaultValue: "Reset" })}</button>
        </div>
      </div>

      <div className="grid cols2" style={{ alignItems: "start", marginTop: 12 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ height: 520 }}>
            <MapContainer center={[38.6, 24.0]} zoom={6} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {geojson ? (
                <GeoJSON
                  data={geojson as any}
                  style={(feature: any) => {
                    const c = currentCountForFeature(feature);
                    return {
                      color: "#334155",
                      weight: 1,
                      fillColor: "#2563eb",
                      fillOpacity: fillOpacityForCount(c),
                    } as any;
                  }}
                  onEachFeature={(feature: any, layer: any) => {
                    // Bind once, but keep content fresh on hover using refs.
                    layer.bindTooltip(renderTooltipHtml(feature), { sticky: true });

                    layer.on({
                      mouseover: () => {
                        layer.setTooltipContent(renderTooltipHtml(feature));
                      },
                      click: () => {
                        const key = normalizeKey(featureGreekName(feature));
                        const match = itemsRef.current.find((it: any) => normalizeKey(String(it.periphery_name || "")) === key) || null;
                        setSelected(match);
                      },
                    });
                  }}
                />
              ) : null}
            </MapContainer>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t("map.detailsTitle", { defaultValue: "Λεπτομέρειες" })}</h3>
          {!selected ? (
            <div className="muted">{t("map.detailsHint", { defaultValue: "Κάνε κλικ σε μία περιφέρεια για λεπτομέρειες." })}</div>
          ) : (
            <div className="grid" style={{ gap: 10 }}>
              <div>
                <div className="label">{t("map.region", { defaultValue: "Περιφέρεια" })}</div>
                <div style={{ fontWeight: 700 }}>{(selected as any).periphery_name}</div>
              </div>

              <div className="grid cols2">
                <div>
                  <div className="label">{t("map.totalLabel", { defaultValue: "Σύνολο" })}</div>
                  <div style={{ fontWeight: 700 }}>{(selected as any).count ?? 0}</div>
                </div>
                <div>
                  <div className="label">{t("map.avgAge", { defaultValue: "Μέση ηλικία" })}</div>
                  <div style={{ fontWeight: 700 }}>{(selected as any).avg_age ?? "-"}</div>
                </div>
              </div>

              <div className="grid cols2">
                <div>
                  <div className="label">{t("map.malePct", { defaultValue: "% Άνδρες" })}</div>
                  <div style={{ fontWeight: 700 }}>{(selected as any).male_pct ?? 0}%</div>
                </div>
                <div>
                  <div className="label">{t("map.femalePct", { defaultValue: "% Γυναίκες" })}</div>
                  <div style={{ fontWeight: 700 }}>{(selected as any).female_pct ?? 0}%</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
