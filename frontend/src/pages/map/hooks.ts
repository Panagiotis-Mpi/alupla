import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  getGraduatesMap,
  getMapCities,
  getRegionCitiesMap,
  type GraduatesMapItem,
  type MapCityPoint,
  type RegionCityMapItem,
} from "../../lib/api";
import { mapCityLatitude, mapCityLongitude, normalizeKey } from "./utils";

export function useMapData(params: Record<string, string>, selectedPeripheryId?: number | null) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<GraduatesMapItem[]>([]);
  const [cityPoints, setCityPoints] = useState<MapCityPoint[]>([]);
  const [cityStatsLoading, setCityStatsLoading] = useState(false);
  const [selectedCityStats, setSelectedCityStats] = useState<RegionCityMapItem[]>([]);
  const scope = params.scope === "abroad" ? "abroad" : "greece";

  const fetchMap = async (nextParams?: Record<string, string>) => {
    setLoading(true);
    try {
      const [mapResponse, citiesResponse] = await Promise.all([
        getGraduatesMap(nextParams ?? params),
        getMapCities(nextParams ?? params),
      ]);
      setItems(Array.isArray(mapResponse?.items) ? mapResponse.items : []);
      setCityPoints(Array.isArray(citiesResponse?.items) ? citiesResponse.items : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMap(params);
  }, [params]);

  useEffect(() => {
    if (scope !== "greece" || !selectedPeripheryId) {
      setSelectedCityStats([]);
      return;
    }

    let active = true;
    setCityStatsLoading(true);

    (async () => {
      try {
        const response = await getRegionCitiesMap({ ...params, periphery_id: selectedPeripheryId });
        if (!active) return;
        setSelectedCityStats(Array.isArray(response?.items) ? response.items : []);
      } catch {
        if (!active) return;
        setSelectedCityStats([]);
      } finally {
        if (active) setCityStatsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [params, scope, selectedPeripheryId]);

  return {
    loading,
    items,
    cityPoints,
    cityStatsLoading,
    selectedCityStats,
    setSelectedCityStats,
    fetchMap,
  };
}

export function useVisibleCities(cityPoints: MapCityPoint[], mapBounds: L.LatLngBounds | null, mapZoom: number, scope: "greece" | "abroad") {
  return useMemo(() => {
    if (scope === "abroad") {
      const sorted = [...cityPoints].sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;
        return left.city_name.localeCompare(right.city_name, "el");
      });
      if (!mapBounds) return sorted;
      const insideBounds = sorted.filter((city) => {
        const latitude = mapCityLatitude(city);
        const longitude = mapCityLongitude(city);
        return latitude !== null && longitude !== null && mapBounds.contains(L.latLng(latitude, longitude));
      });
      return insideBounds.length ? insideBounds : sorted;
    }

    const grouped = new Map<string, MapCityPoint[]>();

    for (const city of cityPoints) {
      const latitude = mapCityLatitude(city);
      const longitude = mapCityLongitude(city);
      if (latitude === null || longitude === null) continue;
      const key = normalizeKey(city.periphery_name);
      const current = grouped.get(key) || [];
      current.push(city);
      grouped.set(key, current);
    }

    const expanded = mapZoom >= 7;
    const next: MapCityPoint[] = [];

    grouped.forEach((group) => {
      const sorted = [...group].sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;
        return left.city_name.localeCompare(right.city_name, "el");
      });

      if (!expanded) {
        if (sorted[0]) next.push(sorted[0]);
        return;
      }

      const insideBounds = mapBounds
        ? sorted.filter((city) => {
            const latitude = mapCityLatitude(city);
            const longitude = mapCityLongitude(city);
            return latitude !== null && longitude !== null && mapBounds.contains(L.latLng(latitude, longitude));
          })
        : sorted;

      next.push(...(insideBounds.length ? insideBounds : sorted));
    });

    return next;
  }, [cityPoints, mapBounds, mapZoom, scope]);
}
