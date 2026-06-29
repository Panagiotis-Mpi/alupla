import { Router } from "express";
import { allowRoles, authRequired } from "../middleware/auth";
import { listRegions } from "../controllers/regions.controller";
import { asyncHandler } from "../utils/asyncHandler";

export const regionsRouter = Router();

regionsRouter.use(authRequired, allowRoles(["secretariat", "super_admin"]));
regionsRouter.get("/", asyncHandler(listRegions));
