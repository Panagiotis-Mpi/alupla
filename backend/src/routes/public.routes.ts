import { Router } from "express";
import { publicAnonymousGraduatesCsv, publicMap, publicStats, publicStudyPrograms } from "../controllers/public.controller";

export const publicRouter = Router();

publicRouter.get("/study-programs", publicStudyPrograms);
publicRouter.get("/stats", publicStats);
publicRouter.get("/map", publicMap);
publicRouter.get("/anonymous-graduates.csv", publicAnonymousGraduatesCsv);
