import { Router } from "express";
import { allowRoles, authRequired } from "../middleware/auth";
import { exportActivityLogsCsv, exportActivityLogsXlsx, getActivityLogFileSummary, listActivityLogs } from "../controllers/activityLogs.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { routeCache } from "../utils/routeCache";

export const activityLogsRouter = Router();

activityLogsRouter.use(authRequired, allowRoles(["super_admin"]));

// Επιστρέφει τη λίστα logs για τον πίνακα.
activityLogsRouter.get("/", routeCache("activity-logs", 15 * 1000), asyncHandler(listActivityLogs));
activityLogsRouter.get("/file-summary", routeCache("activity-log-summary", 30 * 1000), asyncHandler(getActivityLogFileSummary));
// Κατεβάζει τα φιλτραρισμένα logs σε CSV.
activityLogsRouter.get("/export.csv", asyncHandler(exportActivityLogsCsv));
// Κατεβάζει τα φιλτραρισμένα logs σε Excel.
activityLogsRouter.get("/export.xlsx", asyncHandler(exportActivityLogsXlsx));
