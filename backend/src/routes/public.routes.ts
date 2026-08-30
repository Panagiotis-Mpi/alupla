import express from "express";
import { publicStats, publicStudyPrograms } from "../controllers/public.controller";
import { publicAnonymousGraduatesCsv, publicExportActivity } from "../controllers/publicExports.controller";
import { asyncHandler } from "../utils/asyncHandler";

const publicRouter = express.Router();

publicRouter.get("/study-programs", asyncHandler(publicStudyPrograms));
publicRouter.get("/stats", asyncHandler(publicStats));
publicRouter.get("/anonymous-graduates.xlsx", asyncHandler(publicAnonymousGraduatesCsv));
publicRouter.post("/activity-export", asyncHandler(publicExportActivity));

export { publicRouter };
