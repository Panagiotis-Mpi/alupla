import { Region } from "../models/Region";
import { normalizeRegionText } from "../utils/regionText";

type PeripherySeed = {
  name: string;
  latitude: number;
  longitude: number;
};

const PERIPHERIES: PeripherySeed[] = [
  { name: "Αττική", latitude: 37.9838, longitude: 23.7275 },
  { name: "Κεντρική Μακεδονία", latitude: 40.6401, longitude: 22.9444 },
  { name: "Δυτική Μακεδονία", latitude: 40.3, longitude: 21.79 },
  { name: "Ανατολική Μακεδονία και Θράκη", latitude: 41.12, longitude: 25.405 },
  { name: "Ήπειρος", latitude: 39.665, longitude: 20.853 },
  { name: "Θεσσαλία", latitude: 39.639, longitude: 22.419 },
  { name: "Ιόνια Νησιά", latitude: 39.624, longitude: 19.921 },
  { name: "Δυτική Ελλάδα", latitude: 38.2466, longitude: 21.7346 },
  { name: "Στερεά Ελλάδα", latitude: 38.9, longitude: 22.433 },
  { name: "Πελοπόννησος", latitude: 37.509, longitude: 22.379 },
  { name: "Βόρειο Αιγαίο", latitude: 39.1, longitude: 26.55 },
  { name: "Νότιο Αιγαίο", latitude: 37.44, longitude: 24.94 },
  { name: "Κρήτη", latitude: 35.3387, longitude: 25.1442 },
];

export async function ensurePeripheriesSeeded(): Promise<void> {
  const greece = await Region.findOne({ where: { type: "COUNTRY", normalized_name: normalizeRegionText("Ελλάδα") } });
  if (!greece) return;

  for (const p of PERIPHERIES) {
    const normalizedName = normalizeRegionText(p.name);
    const existing = await Region.findOne({ where: { type: "PERIPHERY", normalized_name: normalizedName } });

    if (!existing) {
      await Region.create({
        name: p.name,
        normalized_name: normalizedName,
        type: "PERIPHERY",
        parent_id: Number(greece.id),
        latitude: p.latitude,
        longitude: p.longitude,
      } as any);
      continue;
    }

    const nextPayload: Record<string, unknown> = {};
    const lat = existing.latitude as any;
    const lng = existing.longitude as any;
    if (existing.parent_id == null) nextPayload.parent_id = Number(greece.id);
    if (lat === null || lng === null || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
      nextPayload.latitude = p.latitude;
      nextPayload.longitude = p.longitude;
    }
    if (!String(existing.normalized_name || "").trim()) nextPayload.normalized_name = normalizedName;
    if (Object.keys(nextPayload).length) {
      await existing.update(nextPayload, { silent: true });
    }
  }
}
