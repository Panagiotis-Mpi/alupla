import express from "express";
import { publicStats, publicStudyPrograms } from "../controllers/public.controller";
import { publicAnonymousGraduatesCsv, publicExportActivity, publicMap } from "../controllers/publicExports.controller";
import { rateLimit } from "../middleware/rateLimit";
import { asyncHandler } from "../utils/asyncHandler";

const publicRouter = express.Router();
const publicReadLimit = rateLimit({ scope: "public-read", windowMs: 60 * 1000, max: 120 });
const publicExportLimit = rateLimit({ scope: "public-export", windowMs: 60 * 1000, max: 20 });
const publicLogLimit = rateLimit({ scope: "public-export-log", windowMs: 60 * 1000, max: 60 });

publicRouter.get("/study-programs", publicReadLimit, asyncHandler(publicStudyPrograms));
publicRouter.get("/stats", publicReadLimit, asyncHandler(publicStats));
publicRouter.get("/map", publicReadLimit, asyncHandler(publicMap));
publicRouter.get("/anonymous-graduates.xlsx", publicExportLimit, asyncHandler(publicAnonymousGraduatesCsv));
publicRouter.post("/activity-export", publicLogLimit, asyncHandler(publicExportActivity));

export { publicRouter };
