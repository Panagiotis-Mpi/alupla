import { Router } from "express";
import { getGraduatesMap, getMapCities, getMapCityDetail, getMapYearRange } from "../controllers/map.controller";
import { routeCache } from "../utils/routeCache";

const r = Router();
const mapCache = routeCache("map", 3 * 60 * 1000);

r.get("/graduates", mapCache, getGraduatesMap);
r.get("/years", mapCache, getMapYearRange);
r.get("/cities", mapCache, getMapCities);
r.get("/city-detail", mapCache, getMapCityDetail);

export default r;
