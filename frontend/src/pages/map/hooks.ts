import { useEffect, useState } from "react";
import {
  getGraduatesMap,
  getMapCities,
  type GraduatesMapItem,
  type MapCityPoint,
} from "../../lib/api";

export function useMapData(params: Record<string, string>) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<GraduatesMapItem[]>([]);
  const [cityPoints, setCityPoints] = useState<MapCityPoint[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    (async () => {
      try {
        const [mapResponse, citiesResponse] = await Promise.all([
          getGraduatesMap(params),
          getMapCities(params),
        ]);
        if (!active) return;
        setItems(Array.isArray(mapResponse?.items) ? mapResponse.items : []);
        setCityPoints(Array.isArray(citiesResponse?.items) ? citiesResponse.items : []);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [params]);

  return {
    loading,
    items,
    cityPoints,
  };
}
