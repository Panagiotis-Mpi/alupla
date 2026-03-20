import { Router } from "express";
import { getGraduatesMap, getRegionCitiesMapStats } from "../controllers/map.controller";

const r = Router();

// Map data is anonymous/aggregated, so it is safe to expose without login.
// (Admins/secretariat can still access it too.)
r.get("/graduates", getGraduatesMap);
r.get("/region-cities", getRegionCitiesMapStats);

export default r;
