import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { getGraduatesMap, type GraduatesMapItem } from "../lib/api";

type AgeGroup = "" | "18-22" | "23-26" | "27-30" | "31+";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// Rough centroids for Greek peripheries (good enough for a clean interactive demo).
// Keys are normalized (lowercase, no accents, trimmed).
const PERIPHERY_CENTROIDS: Record<string, [number, number]> = {
  // Greek
  "αττικη": [37.98, 23.73],
  "κεντρικη μακεδονια": [40.64, 22.94],
  "δυτικη μακεδονια": [40.30, 21.78],
  "ανατολικη μακεδονια και θρακη": [41.10, 25.40],
  "ηπειρος": [39.66, 20.85],
  "θεσσαλια": [39.64, 22.42],
  "στερεα ελλαδα": [38.90, 22.43],
  "πελοποννησος": [37.51, 22.38],
  "δυτικη ελλαδα": [38.25, 21.73],
  "ιονια νησια": [38.95, 20.72],
  "βορειο αιγαιο": [39.30, 26.25],
  "νοτιο αιγαιο": [36.40, 25.43],
  "κρητη": [35.24, 24.81],

  // English (in case DB holds EN names)
  "attica": [37.98, 23.73],
  "central macedonia": [40.64, 22.94],
  "west macedonia": [40.30, 21.78],
  "east macedonia and thrace": [41.10, 25.40],
  "epirus": [39.66, 20.85],
  "thessaly": [39.64, 22.42],
  "central greece": [38.90, 22.43],
  "peloponnese": [37.51, 22.38],
  "western greece": [38.25, 21.73],
  "ionian islands": [38.95, 20.72],
  "north aegean": [39.30, 26.25],
  "south aegean": [36.40, 25.43],
  "crete": [35.24, 24.81],
};

function normalizeKey(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function Map() {
  const { t } = useTranslation("map");

  const [filters, setFilters] = useState({
    graduation_year: "",
    study_program_id: "",
    gender: "",
    age_group: "" as AgeGroup,
  });

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<GraduatesMapItem[]>([]);
  const [selected, setSelected] = useState<GraduatesMapItem | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const params = useMemo(() => {
    const p: Record<string, any> = {};
    if (filters.graduation_year) p.graduation_year = filters.graduation_year;
    if (filters.study_program_id) p.study_program_id = filters.study_program_id;
    if (filters.gender) p.gender = filters.gender;
    if (filters.age_group) p.age_group = filters.age_group;
    return p;
  }, [filters]);

  const maxCount = useMemo(() => Math.max(1, ...items.map((x) => Number(x.count) || 0)), [items]);

  async function load() {
    setLoading(true);
    setErr(null);
    setSelected(null);
    try {
      const res = await getGraduatesMap(params);
      setItems(res.items ?? []);
    } catch (e: any) {
      setErr(e?.message ?? t("errors.failed"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>{t("pageTitle")}</h2>
        <span className="badge">{loading ? t("topbar.loading") : t("topbar.ready")}</span>
        <div className="spacer" />
      </div>

      <div className="card">
        <div className="grid cols4">
          <div>
            <label className="label">{t("filters.gradYear")}</label>
            <input
              className="input"
              value={filters.graduation_year}
              onChange={(e) => setFilters((f) => ({ ...f, graduation_year: e.target.value }))}
              placeholder={t("filters.gradYearPlaceholder")}
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="label">{t("filters.studyProgramId")}</label>
            <input
              className="input"
              value={filters.study_program_id}
              onChange={(e) => setFilters((f) => ({ ...f, study_program_id: e.target.value }))}
              placeholder={t("filters.studyProgramIdPlaceholder")}
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="label">{t("filters.gender")}</label>
            <select className="input" value={filters.gender} onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value }))}>
              <option value="">{t("filters.all")}</option>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>

          <div>
            <label className="label">{t("filters.ageGroup")}</label>
            <select
              className="input"
              value={filters.age_group}
              onChange={(e) => setFilters((f) => ({ ...f, age_group: e.target.value as AgeGroup }))}
            >
              <option value="">{t("filters.all")}</option>
              <option value="18-22">18-22</option>
              <option value="23-26">23-26</option>
              <option value="27-30">27-30</option>
              <option value="31+">31+</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button className="btn" onClick={() => void load()}>
            {t("filters.apply")}
          </button>
          <button
            className="btn"
            onClick={() => {
              setFilters({ graduation_year: "", study_program_id: "", gender: "", age_group: "" });
              setTimeout(() => void load(), 0);
            }}
          >
            {t("filters.reset")}
          </button>
          <div className="spacer" />
          {err ? <span className="badge" style={{ borderColor: "#dc2626", color: "#dc2626" }}>{err}</span> : null}
        </div>
      </div>

      <div className="grid cols2" style={{ alignItems: "start" }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ height: 520 }}>
            <MapContainer center={[38.6, 24.0]} zoom={6} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {items.map((it) => {
                const pos =
                  it.latitude != null && it.longitude != null
                    ? ([Number(it.latitude), Number(it.longitude)] as [number, number])
                    : PERIPHERY_CENTROIDS[normalizeKey(it.periphery_name)];
                if (!pos) return null;

                const count = Number(it.count) || 0;
                const r = clamp(6 + (count / maxCount) * 18, 6, 24);

                const isSel = selected?.periphery_id === it.periphery_id;

                return (
                  <CircleMarker
                    key={`${it.periphery_id}`}
                    center={pos}
                    radius={r}
                    pathOptions={{
                      color: isSel ? "#111" : "#2563eb",
                      fillColor: isSel ? "#111" : "#2563eb",
                      fillOpacity: 0.35,
                      weight: isSel ? 2 : 1,
                    }}
                    eventHandlers={{
                      click: () => setSelected(it),
                    }}
                  >
                    <Tooltip direction="top" sticky>
                      <div style={{ fontWeight: 700 }}>{it.periphery_name}</div>
                      <div style={{ fontSize: 12, opacity: 0.9 }}>{t("map.total", { total: count })}</div>
                    </Tooltip>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>

          <div style={{ padding: 12, borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", gap: 10, alignItems: "center" }}>
            <span className="badge">{t("legend.title")}</span>
            <span style={{ fontSize: 12, opacity: 0.75 }}>{t("legend.hint")}</span>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t("panel.title")}</h3>
          {!selected ? (
            <div className="muted">{t("panel.selectHint")}</div>
          ) : (
            <div className="grid" style={{ gap: 10 }}>
              <div>
                <div className="label">{t("panel.region")}</div>
                <div style={{ fontWeight: 700 }}>{selected.periphery_name}</div>
              </div>

              <div className="grid cols2">
                <div>
                  <div className="label">{t("panel.total")}</div>
                  <div style={{ fontWeight: 700 }}>{selected.count}</div>
                </div>
                <div>
                  <div className="label">{t("panel.avgAge")}</div>
                  <div style={{ fontWeight: 700 }}>{selected.avg_age ?? ""}</div>
                </div>
              </div>

              <div className="grid cols2">
                <div>
                  <div className="label">{t("panel.male")}</div>
                  <div style={{ fontWeight: 700 }}>{selected.male_pct ?? ""}%</div>
                </div>
                <div>
                  <div className="label">{t("panel.female")}</div>
                  <div style={{ fontWeight: 700 }}>{selected.female_pct ?? ""}%</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
