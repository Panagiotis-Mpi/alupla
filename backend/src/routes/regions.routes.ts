import { Router } from "express";
import { allowRoles, authRequired } from "../middleware/auth";
import { getRegion, listRegions, searchRegions } from "../controllers/regions.controller";

export const regionsRouter = Router();

regionsRouter.use(authRequired, allowRoles(["secretariat","super_admin"]));

// GET /regions?parent_id=1   (children of 1)
// GET /regions?parent_id=null (root nodes)
// GET /regions/search?q=Patr
regionsRouter.get("/", listRegions);
regionsRouter.get("/search", searchRegions);
regionsRouter.get("/:id", getRegion);
