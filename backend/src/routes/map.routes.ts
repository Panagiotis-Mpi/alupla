import { Router, type NextFunction, type Request, type Response } from "express";
import { getGraduatesMap, getMapCities, getMapCityDetail, getMapYearRange } from "../controllers/map.controller";

const r = Router();
const MAP_ROUTE_CACHE_MS = 3 * 60 * 1000;
const mapRouteCache = new Map<string, { expires: number; body: unknown }>();

function mapCache(req: Request, res: Response, next: NextFunction) {
  if (req.method !== "GET") return next();

  const key = req.originalUrl || req.url;
  const now = Date.now();
  const cached = mapRouteCache.get(key);

  if (cached && cached.expires > now) {
    res.setHeader("X-Map-Cache", "HIT");
    return res.json(cached.body);
  }

  if (cached) mapRouteCache.delete(key);

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    if (res.statusCode >= 200 && res.statusCode < 300 && (body as any)?.ok) {
      mapRouteCache.set(key, { expires: Date.now() + MAP_ROUTE_CACHE_MS, body });
    }
    res.setHeader("X-Map-Cache", "MISS");
    return originalJson(body);
  };

  return next();
}

r.get("/graduates", mapCache, getGraduatesMap);
r.get("/years", mapCache, getMapYearRange);
r.get("/cities", mapCache, getMapCities);
r.get("/city-detail", mapCache, getMapCityDetail);

export default r;
