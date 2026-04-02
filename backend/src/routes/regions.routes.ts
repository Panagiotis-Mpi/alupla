import { Router } from "express";
import { allowRoles, authRequired } from "../middleware/auth";
import { listRegions } from "../controllers/regions.controller";

export const regionsRouter = Router();

regionsRouter.use(authRequired, allowRoles(["secretariat", "super_admin"]));
regionsRouter.get("/", listRegions);
