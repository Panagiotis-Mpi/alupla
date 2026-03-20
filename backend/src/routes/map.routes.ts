import { Router } from "express";
import { getGraduatesMap, getMapFilterOptions, getRegionCities } from "../controllers/map.controller";

const r = Router();

r.get("/filter-options", getMapFilterOptions);
r.get("/graduates", getGraduatesMap);
r.get("/region-cities", getRegionCities);

export default r;
