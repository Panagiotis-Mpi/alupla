import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CircleMarker, GeoJSON, MapContainer, Tooltip } from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { getGraduatesMap, getPublicStudyPrograms, logPublicExport, type GraduatesMapItem, type StudyProgram } from "../lib/api";
import greeceRegionsRaw from "../assets/greece-regions.geojson?raw";
import * as XLSX from "xlsx";

type AgeGroup = "" | "18-22" | "23-26" | "27-30" | "31+";

type RegionCity = {
  region: string;
  nameEl: string;
  nameEn: string;
  lat: number;
  lng: number;
};

const regionCities: RegionCity[] = [
  { region: "Ανατολική Μακεδονία και Θράκη", nameEl: "Αλεξανδρούπολη", nameEn: "Alexandroupoli", lat: 40.8457, lng: 25.8739 },
  { region: "Ανατολική Μακεδονία και Θράκη", nameEl: "Καβάλα", nameEn: "Kavala", lat: 40.9396, lng: 24.4018 },
  { region: "Ανατολική Μακεδονία και Θράκη", nameEl: "Κομοτηνή", nameEn: "Komotini", lat: 41.1192, lng: 25.4054 },
  { region: "Κεντρική Μακεδονία", nameEl: "Θεσσαλονίκη", nameEn: "Thessaloniki", lat: 40.6401, lng: 22.9444 },
  { region: "Κεντρική Μακεδονία", nameEl: "Κατερίνη", nameEn: "Katerini", lat: 40.2696, lng: 22.5061 },
  { region: "Κεντρική Μακεδονία", nameEl: "Σέρρες", nameEn: "Serres", lat: 41.0849, lng: 23.5476 },
  { region: "Δυτική Μακεδονία", nameEl: "Κοζάνη", nameEn: "Kozani", lat: 40.3006, lng: 21.7889 },
  { region: "Δυτική Μακεδονία", nameEl: "Φλώρινα", nameEn: "Florina", lat: 40.7845, lng: 21.4096 },
  { region: "Δυτική Μακεδονία", nameEl: "Καστοριά", nameEn: "Kastoria", lat: 40.5217, lng: 21.2636 },
  { region: "Ήπειρος", nameEl: "Ιωάννινα", nameEn: "Ioannina", lat: 39.665, lng: 20.8537 },
  { region: "Ήπειρος", nameEl: "Άρτα", nameEn: "Arta", lat: 39.1609, lng: 20.9856 },
  { region: "Ήπειρος", nameEl: "Πρέβεζα", nameEn: "Preveza", lat: 38.9593, lng: 20.7517 },
  { region: "Θεσσαλία", nameEl: "Λάρισα", nameEn: "Larissa", lat: 39.639, lng: 22.4191 },
  { region: "Θεσσαλία", nameEl: "Βόλος", nameEn: "Volos", lat: 39.361, lng: 22.9422 },
  { region: "Θεσσαλία", nameEl: "Τρίκαλα", nameEn: "Trikala", lat: 39.5553, lng: 21.7679 },
  { region: "Ιόνια Νησιά", nameEl: "Κέρκυρα", nameEn: "Corfu", lat: 39.6243, lng: 19.9217 },
  { region: "Ιόνια Νησιά", nameEl: "Ζάκυνθος", nameEn: "Zakynthos", lat: 37.787, lng: 20.8999 },
  { region: "Ιόνια Νησιά", nameEl: "Αργοστόλι", nameEn: "Argostoli", lat: 38.1811, lng: 20.489 },
  { region: "Δυτική Ελλάδα", nameEl: "Πάτρα", nameEn: "Patras", lat: 38.2466, lng: 21.7346 },
  { region: "Δυτική Ελλάδα", nameEl: "Αγρίνιο", nameEn: "Agrinio", lat: 38.6218, lng: 21.4077 },
  { region: "Δυτική Ελλάδα", nameEl: "Μεσολόγγι", nameEn: "Messolonghi", lat: 38.3692, lng: 21.4296 },
  { region: "Στερεά Ελλάδα", nameEl: "Λαμία", nameEn: "Lamia", lat: 38.9, lng: 22.4333 },
  { region: "Στερεά Ελλάδα", nameEl: "Χαλκίδα", nameEn: "Chalkida", lat: 38.4636, lng: 23.6022 },
  { region: "Στερεά Ελλάδα", nameEl: "Καρπενήσι", nameEn: "Karpenisi", lat: 38.9122, lng: 21.7984 },
  { region: "Αττική", nameEl: "Αθήνα", nameEn: "Athens", lat: 37.9838, lng: 23.7275 },
  { region: "Αττική", nameEl: "Πειραιάς", nameEn: "Piraeus", lat: 37.942, lng: 23.6465 },
  { region: "Αττική", nameEl: "Μαρούσι", nameEn: "Marousi", lat: 38.05, lng: 23.8 },
  { region: "Πελοπόννησος", nameEl: "Τρίπολη", nameEn: "Tripoli", lat: 37.5089, lng: 22.3794 },
  { region: "Πελοπόννησος", nameEl: "Καλαμάτα", nameEn: "Kalamata", lat: 37.0389, lng: 22.1142 },
  { region: "Πελοπόννησος", nameEl: "Κόρινθος", nameEn: "Corinth", lat: 37.9381, lng: 22.9322 },
  { region: "Βόρειο Αιγαίο", nameEl: "Μυτιλήνη", nameEn: "Mytilene", lat: 39.1077, lng: 26.5553 },
  { region: "Βόρειο Αιγαίο", nameEl: "Χίος", nameEn: "Chios", lat: 38.3709, lng: 26.1363 },
  { region: "Βόρειο Αιγαίο", nameEl: "Σάμος", nameEn: "Samos", lat: 37.7544, lng: 26.9785 },
  { region: "Νότιο Αιγαίο", nameEl: "Ερμούπολη", nameEn: "Ermoupoli", lat: 37.4447, lng: 24.9425 },
  { region: "Νότιο Αιγαίο", nameEl: "Ρόδος", nameEn: "Rhodes", lat: 36.4341, lng: 28.2176 },
  { region: "Νότιο Αιγαίο", nameEl: "Κως", nameEn: "Kos", lat: 36.8926, lng: 27.2877 },
  { region: "Κρήτη", nameEl: "Ηράκλειο", nameEn: "Heraklion", lat: 35.3387, lng: 25.1442 },
  { region: "Κρήτη", nameEl: "Χανιά", nameEn: "Chania", lat: 35.5138, lng: 24.018 },
  { region: "Κρήτη", nameEl: "Ρέθυμνο", nameEn: "Rethymno", lat: 35.3656, lng: 24.4823 },
];


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

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function excelCellValue(v: any) {
  if (v === null || v === undefined || v === "") return "";
  return v;
}


export default function Map() {
  const { t, i18n } = useTranslation();

  const mapRef = useRef<L.Map | null>(null);

  const [year, setYear] = useState<string>("");
  const [studyProgramId, setStudyProgramId] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("");
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<GraduatesMapItem[]>([]);
  const [selected, setSelected] = useState<GraduatesMapItem | null>(null);

  const geojson = useMemo(() => tryParseGeoJson(greeceRegionsRaw), []);

  useEffect(() => {
    if (!geojson || !mapRef.current) return;
    try {
      const layer = L.geoJSON(geojson as any);
      const bounds = layer.getBounds();
      if (bounds && bounds.isValid()) {

        mapRef.current.fitBounds(bounds, { padding: [32, 32], maxZoom: 7.25 });
      }
    } catch {

    }
  }, [geojson]);

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

  const countsRef = useRef<Map<string, number>>(countsByGreekName);
  const itemsRef = useRef<GraduatesMapItem[]>(items);

  useEffect(() => {
    countsRef.current = countsByGreekName;
  }, [countsByGreekName]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  async function fetchMap(opts?: {
    year?: string;
    studyProgramId?: string;
    gender?: string;
    ageGroup?: AgeGroup;
  }) {
    setLoading(true);
    setSelected(null);
    try {
      const res = await getGraduatesMap({
        graduation_year: opts?.year || undefined,
        study_program_id: opts?.studyProgramId || undefined,
        gender: opts?.gender || undefined,
        age_group: opts?.ageGroup || undefined,
      });
      setItems(res?.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMap();

  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const res = await getPublicStudyPrograms();
        if (!active) return;
        setStudyPrograms(Array.isArray(res?.items) ? res.items : []);
      } catch {
        if (!active) return;
        setStudyPrograms([]);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function onApply() {
    await fetchMap({ year, studyProgramId, gender, ageGroup });
  }

  function onReset() {
    setYear("");
    setStudyProgramId("");
    setGender("");
    setAgeGroup("");
    setSelected(null);

    fetchMap();
  }

const fillColors = ["#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#2563eb"];

function thresholdsForMax(m: number) {
  const mm = Math.max(1, m || 1);
  const b1 = Math.ceil(mm * 0.2);
  const b2 = Math.ceil(mm * 0.4);
  const b3 = Math.ceil(mm * 0.6);
  const b4 = Math.ceil(mm * 0.8);
  return [0, b1, b2, b3, b4, mm];
}

function bucketIndexForCount(c: number) {
  const t = thresholdsForMax(maxCount);
  for (let i = 0; i < 5; i++) {
    const from = t[i];
    const to = t[i + 1];
    if (c >= from && c <= to) return i;
  }
  return 4;
}

function fillColorForCount(c: number) {
  const idx = bucketIndexForCount(c);
  return fillColors[Math.max(0, Math.min(fillColors.length - 1, idx))];
}

function fillOpacityForCount(c: number) {

  return c <= 0 ? 0.18 : 0.75;
}

  function featureGreekName(feature: any): string {
    const p = feature?.properties || {};
    return String(p.name_greek || p.name_el || p.name || p.NAME || "");
  }

  function featureDisplayName(feature: any): string {
    const p = feature?.properties || {};
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

  async function onExportExcel() {
    const res = await getGraduatesMap({
      graduation_year: year || undefined,
      study_program_id: studyProgramId || undefined,
      gender: gender || undefined,
      age_group: ageGroup || undefined,
    });

    const exportItems = res?.items ?? [];
    const rows = [
      [
        t("map.export.periphery", { defaultValue: "Περιφέρεια" }),
        t("map.export.count", { defaultValue: "Απόφοιτοι" }),
        t("map.export.avgAge", { defaultValue: "Μέση Ηλικία" }),
        t("map.export.malePct", { defaultValue: "% Άνδρες" }),
        t("map.export.femalePct", { defaultValue: "% Γυναίκες" }),
      ],
      ...exportItems.map((it) => [
        excelCellValue((it as any).periphery_name ?? ""),
        excelCellValue((it as any).count ?? 0),
        excelCellValue((it as any).avg_age ?? ""),
        excelCellValue((it as any).male_pct ?? ""),
        excelCellValue((it as any).female_pct ?? ""),
      ]),
    ];

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = [
      { wch: 28 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Χάρτης");

    const output = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
      compression: true,
    });

    const blob = new Blob([output], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const fileName = year
      ? `alupla_graduates_map_peripheries_${year}.xlsx`
      : "alupla_graduates_map_peripheries.xlsx";

    downloadBlob(fileName, blob);

    try {
      await logPublicExport("map_export", "xlsx");
    } catch {
    }
  }

  function legendBuckets(max: number) {

    const m = Math.max(1, max);
    const b1 = Math.ceil(m * 0.2);
    const b2 = Math.ceil(m * 0.4);
    const b3 = Math.ceil(m * 0.6);
    const b4 = Math.ceil(m * 0.8);
    return [0, b1, b2, b3, b4, m];
  }

  const buckets = useMemo(() => legendBuckets(maxCount), [maxCount]);


  const geoRenderKey = useMemo(() => {
    return `${i18n.language}:${items.length}:${maxCount}`;
  }, [i18n.language, items.length, maxCount]);

  return (
    <div className="container">
      {}
      <style>{`
        
        .leaflet-container path:focus { outline: none !important; }
        .leaflet-interactive:focus { outline: none !important; }
        .leaflet-container:focus { outline: none !important; }

        
        .alupla-map .leaflet-container { background: transparent !important; }

        
        .alupla-map-card { padding: 0; overflow: hidden; position: relative; }
      `}</style>

      <div className="topbar">
        <h2 style={{ margin: 0 }}>{t("map.title", { defaultValue: "Χάρτης αποφοίτων" })}</h2>
        <span className="badge">
          {loading
            ? t("common.loading", { defaultValue: "Φόρτωση..." })
            : `${t("common.ready", { defaultValue: "" })}  ${t("map.totalInline", { defaultValue: "Σύνολο" })}: ${total}`}
        </span>
        <div className="spacer" />
        <button className="btn" type="button" onClick={onExportExcel} disabled={loading || items.length === 0}>
          {t("map.exportExcel", { defaultValue: "Export Excel" })}
        </button>
      </div>

      {}
      <div className="page-two-col" style={{ marginTop: 12 }}>
        {}
        <div className="card alupla-map-card">
          <div className="alupla-map map-canvas">
            <MapContainer
              center={[38.6, 24.0]}
              zoom={6.5 as any}
              zoomSnap={0.5}
              whenCreated={(m) => {
                mapRef.current = m;
              }}
              style={{ height: "100%", width: "100%", background: "transparent" }}
              scrollWheelZoom
            >

              {regionCities.map((city) => (
                <CircleMarker
                  key={`${city.region}-${city.nameEl}`}
                  center={[city.lat, city.lng]}
                  radius={3.5}
                  pathOptions={{ color: "#1e293b", weight: 1, fillColor: "#1e293b", fillOpacity: 0.9 }}
                >
                  <Tooltip permanent direction="top" offset={[0, -4]} opacity={1}>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>
                      {i18n.language?.toLowerCase().startsWith("en") ? city.nameEn : city.nameEl}
                    </span>
                  </Tooltip>
                </CircleMarker>
              ))}

              {geojson ? (
                <GeoJSON
                  key={geoRenderKey}
                  data={geojson as any}
                  style={(feature: any) => {
                    const c = currentCountForFeature(feature);
                    return {
                      color: "#334155",
                      weight: 1,
                      fillColor: fillColorForCount(c),
                      fillOpacity: fillOpacityForCount(c),
                    } as any;
                  }}
                  onEachFeature={(feature: any, layer: any) => {
                    layer.bindTooltip(renderTooltipHtml(feature), { sticky: true });

                    layer.on({
                      mouseover: (e: LeafletMouseEvent) => {
                        layer.setStyle({ weight: 2 });
                        layer.bringToFront();
                        layer.setTooltipContent(renderTooltipHtml(feature));
                      },
                      mouseout: () => {
                        layer.setStyle({ weight: 1 });
                      },
                      click: () => {
                        const key = normalizeKey(featureGreekName(feature));
                        const match =
                          itemsRef.current.find((it: any) => normalizeKey(String(it.periphery_name || "")) === key) ||
                          null;
                        setSelected(match);
                        layer.setTooltipContent(renderTooltipHtml(feature));
                      },
                    });
                  }}
                />
              ) : null}
            </MapContainer>
          </div>

          {}
          <div
            style={{
              position: "absolute",
              left: 12,
              bottom: 12,
              background: "rgba(255,255,255,.94)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "10px 12px",
              fontSize: 12,
              boxShadow: "var(--shadow)",
              maxWidth: 220,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{t("map.legend", { defaultValue: "Υπόμνημα" })}</div>
            <div className="muted" style={{ marginBottom: 8 }}>
              {t("map.legendCounts", { defaultValue: "Αριθμός αποφοίτων" })}
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {Array.from({ length: 5 }).map((_, idx) => {
                const from = buckets[idx];
                const to = buckets[idx + 1];
                const mid = (from + to) / 2;
                const opacity = fillOpacityForCount(mid);
                const color = fillColorForCount(mid);
                return (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 16,
                        height: 12,
                        display: "inline-block",
                        border: "1px solid #334155",
                        background: color,
                        opacity,
                        borderRadius: 3,
                      }}
                    />
                    <span>
                      {from}–{to}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {}
        <div className="map-panel-stack">
          <div className="card">
            <div className="grid cols2" style={{ alignItems: "end" }}>
              <div>
                <label className="label">{t("map.filters.year", { defaultValue: "Έτος αποφοίτησης" })}</label>
                <input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder={t("map.filters.yearPh", { defaultValue: "π.χ. 2026" })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">{t("map.filters.studyProgram", { defaultValue: "Πρόγραμμα Σπουδών" })}</label>
                <select className="input" value={studyProgramId} onChange={(e) => setStudyProgramId(e.target.value)}>
                  <option value="">{t("common.all", { defaultValue: "Όλα" })}</option>
                  {studyPrograms.map((program) => (
                    <option key={program.id} value={String(program.id)}>
                      {i18n.language?.toLowerCase().startsWith("en")
                        ? program.name_en || program.name_el || program.code
                        : program.name_el || program.name_en || program.code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">{t("map.filters.gender", { defaultValue: "Φύλο" })}</label>
                <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="">{t("common.all", { defaultValue: "Όλα" })}</option>
                  <option value="M">{t("common.male", { defaultValue: "Άνδρας" })}</option>
                  <option value="F">{t("common.female", { defaultValue: "Γυναίκα" })}</option>
                </select>
              </div>

              <div>
                <label className="label">{t("map.filters.ageGroup", { defaultValue: "Ηλικιακή ομάδα" })}</label>
                <select className="input" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}>
                  <option value="">{t("common.all", { defaultValue: "Όλα" })}</option>
                  <option value="18-22">18-22</option>
                  <option value="23-26">23-26</option>
                  <option value="27-30">27-30</option>
                  <option value="31+">31+</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <button className="btn primary" type="button" onClick={onApply} disabled={loading}>
                {t("common.apply", { defaultValue: "Εφαρμογή" })}
              </button>
              <button className="btn" type="button" onClick={onReset} disabled={loading}>
                {t("common.reset", { defaultValue: "Reset" })}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>{t("map.detailsTitle", { defaultValue: "Λεπτομέρειες" })}</h3>
            {!selected ? (
              <div className="muted">{t("map.detailsHint", { defaultValue: "Κάνε κλικ σε μία περιφέρεια για λεπτομέρειες." })}</div>
            ) : (
              <div className="grid" style={{ gap: 10 }}>
                <div>
                  <label className="label">{t("map.region", { defaultValue: "Περιφέρεια" })}</label>
                  <div style={{ fontWeight: 700 }}>{(selected as any).periphery_name}</div>
                </div>

                <div className="grid cols2">
                  <div>
                    <label className="label">{t("map.totalLabel", { defaultValue: "Σύνολο" })}</label>
                    <div style={{ fontWeight: 700 }}>{(selected as any).count ?? 0}</div>
                  </div>
                  <div>
                    <label className="label">{t("map.avgAge", { defaultValue: "Μέση ηλικία" })}</label>
                    <div style={{ fontWeight: 700 }}>{(selected as any).avg_age ?? "-"}</div>
                  </div>
                </div>

                <div className="grid cols2">
                  <div>
                    <label className="label">{t("map.malePct", { defaultValue: "% Άνδρες" })}</label>
                    <div style={{ fontWeight: 700 }}>{(selected as any).male_pct ?? 0}%</div>
                  </div>
                  <div>
                    <label className="label">{t("map.femalePct", { defaultValue: "% Γυναίκες" })}</label>
                    <div style={{ fontWeight: 700 }}>{(selected as any).female_pct ?? 0}%</div>
                  </div>
                </div>
              </div>
            )}
          </div>
	        </div>
	      </div>
	    </div>
  );
}
