import { Router } from "express";
import { allowRoles, authRequired } from "../middleware/auth";
import { exportActivityLogsCsv, exportActivityLogsXlsx, getActivityLogFileSummary, listActivityLogs } from "../controllers/activityLogs.controller";
import { routeCache } from "../utils/routeCache";

export const activityLogsRouter = Router();

activityLogsRouter.use(authRequired, allowRoles(["super_admin"]));

activityLogsRouter.get("/", routeCache("activity-logs", 15 * 1000), listActivityLogs);
activityLogsRouter.get("/file-summary", routeCache("activity-log-summary", 30 * 1000), getActivityLogFileSummary);
activityLogsRouter.get("/export.csv", exportActivityLogsCsv);
activityLogsRouter.get("/export.xlsx", exportActivityLogsXlsx);
