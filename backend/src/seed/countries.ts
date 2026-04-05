import { Region } from "../models/Region";
import { normalizeRegionText } from "../utils/regionText";

const COUNTRIES = [
  { name: "Ελλάδα", latitude: 39.0742, longitude: 21.8243 },
  { name: "Κύπρος", latitude: 35.1264, longitude: 33.4299 },
];

export async function ensureCountriesSeeded() {
  for (const item of COUNTRIES) {
    const existing = await Region.findOne({ where: { type: "COUNTRY", normalized_name: normalizeRegionText(item.name) } });
    if (existing) {
      const needsCoords = existing.latitude == null || existing.longitude == null;
      const needsNormalized = !String(existing.normalized_name || "").trim();
      if (needsCoords || needsNormalized) {
        if (needsCoords) {
          existing.latitude = item.latitude as any;
          existing.longitude = item.longitude as any;
        }
        if (needsNormalized) existing.normalized_name = normalizeRegionText(item.name) as any;
        await existing.save();
      }
      continue;
    }

    await Region.create({
      name: item.name,
      normalized_name: normalizeRegionText(item.name),
      type: "COUNTRY",
      parent_id: null,
      latitude: item.latitude,
      longitude: item.longitude,
    } as any);
  }
}
