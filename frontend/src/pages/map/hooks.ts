// Custom hooks για φόρτωση και state του χάρτη.
import { useEffect, useMemo, useState } from "react";
import {
  getGraduatesMap,
  getMapSummary,
  type GraduatesMapItem,
  type MapCityPoint,
} from "../../lib/api";

export function useMapData(params: Record<string, string>, options: { includeCities?: boolean; enabled?: boolean } = {}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ key: "", items: [] as GraduatesMapItem[], cityPoints: [] as MapCityPoint[] });

  const includeCities = options.includeCities !== false;
  const enabled = options.enabled !== false;
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

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
          setData({
            key: paramsKey,
            items: Array.isArray(summaryResponse?.items) ? summaryResponse.items : [],
            cityPoints: Array.isArray(summaryResponse?.cities) ? summaryResponse.cities : [],
          });
        } else {
          const mapResponse = await getGraduatesMap(params);
          if (!active) return;
          setData({
            key: paramsKey,
            items: Array.isArray(mapResponse?.items) ? mapResponse.items : [],
            cityPoints: [],
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [params, paramsKey, includeCities, enabled]);

  const current = data.key === paramsKey;

  return {
    loading: loading || !current,
    items: current ? data.items : [],
    cityPoints: current ? data.cityPoints : [],
  };
}
