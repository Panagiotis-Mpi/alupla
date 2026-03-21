import { Router } from "express";
import { allowRoles, authRequired } from "../middleware/auth";
import { createRegion, getRegion, listRegions, listUnmatchedCities, searchRegions, updateRegion } from "../controllers/regions.controller";

export const regionsRouter = Router();

regionsRouter.use(authRequired, allowRoles(["secretariat","super_admin"]));

regionsRouter.get("/", listRegions);
regionsRouter.get("/search", searchRegions);
regionsRouter.get("/unmatched-cities", listUnmatchedCities);
regionsRouter.get("/:id", getRegion);
regionsRouter.post("/", createRegion);
regionsRouter.put("/:id", updateRegion);
