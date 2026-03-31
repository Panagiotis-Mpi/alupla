import { Router } from "express";
import { allowRoles, authRequired } from "../middleware/auth";
import { exportActivityLogsCsv, getActivityLogFileSummary, listActivityLogs } from "../controllers/activityLogs.controller";

export const activityLogsRouter = Router();

activityLogsRouter.use(authRequired, allowRoles(["super_admin"]));

activityLogsRouter.get("/", listActivityLogs);
activityLogsRouter.get("/file-summary", getActivityLogFileSummary);
activityLogsRouter.get("/export.csv", exportActivityLogsCsv);
