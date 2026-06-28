import {
  buildCountMarkerScale,
  countMarkerPalette,
  localizedCityRecordName,
  localizedCountryKey,
  localizedCountryRecordName,
} from "./markers";
import { mapCityKey, mapCityLatitude, mapCityLongitude } from "./utils";

export type MapLegendEntry = {
  key: string;
  label: string;
  color: string;
  radius?: number;
  opacity: number;
};

type MapMarkerCollection = {
  items: any[];
  legend: MapLegendEntry[];
};

type MapTranslate = (key: string, options?: Record<string, unknown>) => string;

function countLegend(
  counts: number[],
  radii: number[],
  keyPrefix: string,
  mt: MapTranslate,
) {
  const { breaks, bucketForCount } = buildCountMarkerScale(
    counts,
    countMarkerPalette,
    radii,
  );
  const legend = breaks.map((limit, index) => {
    const from = index === 0 ? 1 : breaks[index - 1] + 1;
    return {
      key: `${keyPrefix}-${index}`,
      label: mt("legendLabels.countRange", {
        from,
        to: limit,
        defaultValue: `${from}–${limit} ${mt("legendLabels.graduatesUnit", { defaultValue: "απόφοιτοι" })}`,
      }),
      color: countMarkerPalette[Math.min(index, countMarkerPalette.length - 1)],
      radius: radii[Math.min(index, radii.length - 1)],
      opacity: 0.8,
    };
  });
  return { legend, bucketForCount };
}

function scaledMarkers(
  points: any[],
  radii: number[],
  keyPrefix: string,
  mt: MapTranslate,
) {
  const counts = points
    .map((item) => Math.max(0, Number(item.count) || 0))
    .filter((value) => value > 0)
    .sort((left, right) => left - right);
  if (!counts.length) {
    return { items: [] as any[], legend: [] as MapLegendEntry[] };
  }
  const { legend, bucketForCount } = countLegend(counts, radii, keyPrefix, mt);
  return {
    items: points.map((item) => {
      const bucket = bucketForCount(Math.max(0, Number(item.count) || 0));
      return {
        ...item,
        markerRadius: radii[Math.min(bucket, radii.length - 1)],
        markerFill:
          countMarkerPalette[Math.min(bucket, countMarkerPalette.length - 1)],
        markerStroke:
          bucket >= countMarkerPalette.length - 2 ? "#2563eb" : "#3b82f6",
        markerOpacity:
          bucket >= countMarkerPalette.length - 2 ? 0.92 : 0.8,
      };
    }),
    legend,
  };
}

function addWeightedMetric(current: any, city: any, count: number, key: string) {
  const value = Number(city[key]);
  if (!Number.isFinite(value)) return;
  current[`${key}_weighted_sum`] =
    Number(current[`${key}_weighted_sum`] || 0) + value * count;
  current[`${key}_weight`] = Number(current[`${key}_weight`] || 0) + count;
}

function weightedMetric(item: any, key: string) {
  const weight = Number(item[`${key}_weight`] || 0);
  return weight > 0
    ? Number(item[`${key}_weighted_sum`] || 0) / weight
    : item[key];
}

export function buildGreekCityMarkers(
  cityPoints: any[],
  mapLanguage: "gr" | "en",
  radii: number[],
  mt: MapTranslate,
): MapMarkerCollection {
  const grouped = new Map<string, any>();

  for (const city of cityPoints) {
    const latitude = mapCityLatitude(city);
    const longitude = mapCityLongitude(city);
    const count = Math.max(0, Number(city.count) || 0);
    if (latitude === null || longitude === null || count <= 0) continue;

    const groupKey = String(city.map_group_key || "").trim();
    const key = groupKey
      ? `group:${groupKey}`
      : `city:${mapCityKey(city)}`;
    const current = grouped.get(key) || {
      ...city,
      raw_city_name: city.city_name,
      city_name: localizedCityRecordName(city, mapLanguage),
      latitude,
      longitude,
      map_group_key: groupKey || city.map_group_key || null,
      male_count: 0,
      female_count: 0,
      avg_age_weighted_sum: 0,
      avg_age_weight: 0,
      avg_grade_weighted_sum: 0,
      avg_grade_weight: 0,
      avg_graduation_years_weighted_sum: 0,
      avg_graduation_years_weight: 0,
      count: 0,
    };

    current.count += count;
    current.male_count =
      Math.max(0, Number(current.male_count || 0)) +
      Math.max(0, Number(city.male_count || 0));
    current.female_count =
      Math.max(0, Number(current.female_count || 0)) +
      Math.max(0, Number(city.female_count || 0));
    addWeightedMetric(current, city, count, "avg_age");
    addWeightedMetric(current, city, count, "avg_grade");
    addWeightedMetric(current, city, count, "avg_graduation_years");

    grouped.set(key, current);
  }

  const points = Array.from(grouped.values()).map((item) => ({
    ...item,
    avg_age: weightedMetric(item, "avg_age"),
    avg_grade: weightedMetric(item, "avg_grade"),
    avg_graduation_years: weightedMetric(item, "avg_graduation_years"),
  }));

  return scaledMarkers(points, radii, "city", mt);
}

export function buildAbroadCountryMarkers(
  cityPoints: any[],
  mapLanguage: "gr" | "en",
  radii: number[],
  mt: MapTranslate,
): MapMarkerCollection {
  const grouped = new Map<string, any>();

  for (const city of cityPoints) {
    const latitude = mapCityLatitude(city);
    const longitude = mapCityLongitude(city);
    const rawCountryName = String(
      city.country_name || city.periphery_name || "",
    ).trim();
    const localizedName = localizedCountryRecordName(city, mapLanguage);
    const countryId = Number(
      city.country_region_id || city.periphery_id || 0,
    );
    if (!localizedName || latitude === null || longitude === null) continue;
    const key =
      countryId > 0
        ? `country:${countryId}`
        : `country:${localizedCountryKey(rawCountryName)}`;
    const current = grouped.get(key) || {
      city_id: 0,
      city_name: localizedName,
      periphery_id: countryId || Number(city.periphery_id || 0) || null,
      periphery_name: localizedName,
      country_region_id: countryId || null,
      country_name: localizedName,
      latitude_sum: 0,
      longitude_sum: 0,
      weight: 0,
      count: 0,
      male_count: 0,
      female_count: 0,
    };
    const weight = Math.max(1, Number(city.count) || 0);
    current.city_name = localizedName;
    current.periphery_name = localizedName;
    current.country_name = localizedName;
    current.latitude_sum += latitude * weight;
    current.longitude_sum += longitude * weight;
    current.weight += weight;
    current.count += weight;
    current.male_count += Math.max(0, Number(city.male_count) || 0);
    current.female_count += Math.max(0, Number(city.female_count) || 0);
    grouped.set(key, current);
  }

  const points = Array.from(grouped.values())
    .map((item) => ({
      city_id: 0,
      city_name: item.country_name,
      periphery_id: item.periphery_id,
      periphery_name: item.country_name,
      country_region_id: item.country_region_id,
      country_name: item.country_name,
      latitude: item.weight ? item.latitude_sum / item.weight : null,
      longitude: item.weight ? item.longitude_sum / item.weight : null,
      count: item.count,
      male_count: item.male_count,
      female_count: item.female_count,
    }))
    .filter(
      (item) =>
        Number.isFinite(Number(item.latitude)) &&
        Number.isFinite(Number(item.longitude)),
    );

  const result = scaledMarkers(points, radii, "abroad", mt);
  result.items.sort((left, right) => {
    if ((right.count || 0) !== (left.count || 0)) {
      return (right.count || 0) - (left.count || 0);
    }
    return String(left.country_name || "").localeCompare(
      String(right.country_name || ""),
      "el",
    );
  });
  return result;
}
