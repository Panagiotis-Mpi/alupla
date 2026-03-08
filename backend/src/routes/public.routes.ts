import { Router } from "express";
import { publicAnonymousGraduatesCsv, publicExportActivity, publicMap, publicStats, publicStudyPrograms } from "../controllers/public.controller";

export const publicRouter = Router();

publicRouter.get("/study-programs", publicStudyPrograms);
publicRouter.get("/stats", publicStats);
publicRouter.get("/map", publicMap);
publicRouter.get("/anonymous-graduates.xls", publicAnonymousGraduatesCsv);

publicRouter.post("/activity-export", publicExportActivity);
