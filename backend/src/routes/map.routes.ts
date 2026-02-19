import { Router } from "express";
import { authRequired } from "../middleware/auth";
import { getGraduatesMap } from "../controllers/map.controller";

const r = Router();

// Authenticated map data (used by the frontend interactive map page)
r.get("/graduates", authRequired, getGraduatesMap);

export default r;
