import { Router } from "express";
import { publicAnonymousGraduatesCsv, publicExportActivity, publicStats } from "../controllers/public.controller";

export const publicRouter = Router();

publicRouter.get("/stats", publicStats);
publicRouter.get("/anonymous-graduates.xls", publicAnonymousGraduatesCsv);

publicRouter.post("/activity-export", publicExportActivity);
