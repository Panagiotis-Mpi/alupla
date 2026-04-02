import express from "express";
import {
  publicAnonymousGraduatesCsv,
  publicExportActivity,
  publicMap,
  publicStats,
  publicStudyPrograms,
} from "../controllers/public.controller";

const publicRouter = express.Router();

publicRouter.get("/study-programs", publicStudyPrograms);
publicRouter.get("/stats", publicStats);
publicRouter.get("/map", publicMap);
publicRouter.get("/anonymous-graduates.xls", publicAnonymousGraduatesCsv);
publicRouter.post("/activity-export", publicExportActivity);

export { publicRouter };
