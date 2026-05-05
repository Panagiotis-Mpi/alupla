import { Router } from "express";
import { getGraduatesMap, getMapCities, getMapCityDetail, getMapSummary, getMapYearRange } from "../controllers/map.controller";
import { routeCache } from "../utils/routeCache";

// Δημόσια endpoints για δεδομένα χάρτη.
const r = Router();
// Κρατά προσωρινά τα αποτελέσματα χάρτη για καλύτερη απόδοση.
const mapCache = routeCache("map", 3 * 60 * 1000);

r.get("/summary", mapCache, getMapSummary);
r.get("/graduates", mapCache, getGraduatesMap);
r.get("/years", mapCache, getMapYearRange);
r.get("/cities", mapCache, getMapCities);
r.get("/city-detail", mapCache, getMapCityDetail);

export default r;
