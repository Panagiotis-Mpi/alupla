import { Router } from "express";
import { getGraduatesMap, getMapCities, getMapFilterOptions, getMapTrend, getRegionCities } from "../controllers/map.controller";

const r = Router();

r.get("/filter-options", getMapFilterOptions);
r.get("/graduates", getGraduatesMap);
r.get("/cities", getMapCities);
r.get("/region-cities", getRegionCities);
r.get("/trend", getMapTrend);

export default r;
