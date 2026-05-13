// Custom hooks για φόρτωση και state του χάρτη.
import { useEffect, useState } from "react";
import {
  getGraduatesMap,
  getMapSummary,
  type GraduatesMapItem,
  type MapCityPoint,
} from "../../lib/api";

export function useMapData(params: Record<string, string>, options: { includeCities?: boolean; enabled?: boolean } = {}) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<GraduatesMapItem[]>([]);
  const [cityPoints, setCityPoints] = useState<MapCityPoint[]>([]);

  const includeCities = options.includeCities !== false;
  const enabled = options.enabled !== false;

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setLoading(false);
      return () => {
        active = false;
      };
    }
    setLoading(true);

    (async () => {
      try {
        if (includeCities) {
          const summaryResponse = await getMapSummary(params);
          if (!active) return;
          setItems(Array.isArray(summaryResponse?.items) ? summaryResponse.items : []);
          setCityPoints(Array.isArray(summaryResponse?.cities) ? summaryResponse.cities : []);
        } else {
          const mapResponse = await getGraduatesMap(params);
          if (!active) return;
          setItems(Array.isArray(mapResponse?.items) ? mapResponse.items : []);
          setCityPoints([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [params, includeCities, enabled]);

  return {
    loading,
    items,
    cityPoints,
  };
}
