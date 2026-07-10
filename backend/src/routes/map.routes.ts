import { Router, type NextFunction, type Request, type Response } from "express";
import { getGraduatesMap, getMapCities, getMapCityDetail, getMapSummary, getMapYearRange } from "../controllers/map.controller";
import { authRequired } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import { asyncHandler } from "../utils/asyncHandler";
import { routeCache } from "../utils/routeCache";

const r = Router();
const mapCache = routeCache("map", 3 * 60 * 1000);
const mapLimit = rateLimit({ scope: "map-read", windowMs: 60 * 1000, max: 120 });
const protectedMapFilters = new Set([
  "ad_code",
  "ad_code_like",
  "student_number",
  "student_number_like",
  "last_name",
  "last_name_like",
  "first_name",
  "first_name_like",
  "father_name",
  "father_name_like",
  "birth_date",
  "birth_date_from",
  "birth_date_to",
  "birth_year",
  "birth_year_min",
  "birth_year_max",
  "q",
]);

function protectPersonalMapFilters(req: Request, res: Response, next: NextFunction) {
  if (!Object.keys(req.query).some((key) => protectedMapFilters.has(key))) return next();
  return authRequired(req, res, next);
}

r.use(mapLimit);
r.use(protectPersonalMapFilters);
r.get("/summary", mapCache, asyncHandler(getMapSummary));
r.get("/graduates", mapCache, asyncHandler(getGraduatesMap));
r.get("/years", mapCache, asyncHandler(getMapYearRange));
r.get("/cities", mapCache, asyncHandler(getMapCities));
r.get("/city-detail", mapCache, asyncHandler(getMapCityDetail));

export default r;
