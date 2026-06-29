import { Router } from "express";
import { getGraduatesMap, getMapCities, getMapCityDetail, getMapSummary, getMapYearRange } from "../controllers/map.controller";
import { rateLimit } from "../middleware/rateLimit";
import { asyncHandler } from "../utils/asyncHandler";
import { routeCache } from "../utils/routeCache";

const r = Router();
const mapCache = routeCache("map", 3 * 60 * 1000);
const mapLimit = rateLimit({ windowMs: 60 * 1000, max: 120 });

r.use(mapLimit);
r.get("/summary", mapCache, asyncHandler(getMapSummary));
r.get("/graduates", mapCache, asyncHandler(getGraduatesMap));
r.get("/years", mapCache, asyncHandler(getMapYearRange));
r.get("/cities", mapCache, asyncHandler(getMapCities));
r.get("/city-detail", mapCache, asyncHandler(getMapCityDetail));

export default r;
