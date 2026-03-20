import { Router } from "express";
import { getGraduatesMap, getRegionCities } from "../controllers/map.controller";

const r = Router();

r.get("/graduates", getGraduatesMap);
r.get("/region-cities", getRegionCities);

export default r;
