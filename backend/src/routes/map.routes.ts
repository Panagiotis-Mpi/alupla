import { Router } from "express";
import { getGraduatesMap, getMapCities, getMapCityDetail, getMapYearRange } from "../controllers/map.controller";

const r = Router();

r.get("/graduates", getGraduatesMap);
r.get("/years", getMapYearRange);
r.get("/cities", getMapCities);
r.get("/city-detail", getMapCityDetail);

export default r;
