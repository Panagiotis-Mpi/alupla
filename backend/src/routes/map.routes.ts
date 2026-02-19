import { Router } from "express";
import { getGraduatesMap } from "../controllers/map.controller";

const r = Router();

// Map data is anonymous/aggregated, so it is safe to expose without login.
// (Admins/secretariat can still access it too.)
r.get("/graduates", getGraduatesMap);

export default r;
