import { Router } from "express";
import { getGraduatesMap, getMapCities, getMapCityDetail, getMapSummary, getMapYearRange } from "../controllers/map.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { routeCache } from "../utils/routeCache";

const r = Router();
const mapCache = routeCache("map", 3 * 60 * 1000);

r.get("/summary", mapCache, asyncHandler(getMapSummary));
r.get("/graduates", mapCache, asyncHandler(getGraduatesMap));
r.get("/years", mapCache, asyncHandler(getMapYearRange));
r.get("/cities", mapCache, asyncHandler(getMapCities));
r.get("/city-detail", mapCache, asyncHandler(getMapCityDetail));

export default r;
