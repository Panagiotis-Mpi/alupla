import { Router } from "express";
import { getDashboard } from "../controllers/dashboard.controller";
import { allowRoles, authRequired } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const dashboardRouter = Router();

dashboardRouter.use(authRequired, allowRoles(["secretariat", "super_admin"]));
dashboardRouter.get("/", asyncHandler(getDashboard));
