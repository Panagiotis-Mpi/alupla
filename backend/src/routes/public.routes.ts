import { Router } from "express";
import { listPublicStudyPrograms, publicAnonymousGraduatesCsv, publicExportActivity, publicStats } from "../controllers/public.controller";

export const publicRouter = Router();

publicRouter.get("/stats", publicStats);
publicRouter.get("/study-programs", listPublicStudyPrograms);
publicRouter.get("/anonymous-graduates.xls", publicAnonymousGraduatesCsv);

publicRouter.post("/activity-export", publicExportActivity);
