import { Router } from "express";
import { getGraduatesMap, getMapCities, getMapCityDetail, getRegionCities } from "../controllers/map.controller";

const r = Router();

r.get("/graduates", getGraduatesMap);
r.get("/cities", getMapCities);
r.get("/region-cities", getRegionCities);
r.get("/city-detail", getMapCityDetail);

export default r;
