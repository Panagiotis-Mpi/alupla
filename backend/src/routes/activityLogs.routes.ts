// Ορίζει τα URLs για προβολή και export καταγραφών συστήματος.
import { Router } from "express";
import { allowRoles, authRequired } from "../middleware/auth";
import { exportActivityLogsCsv, exportActivityLogsXlsx, getActivityLogFileSummary, listActivityLogs } from "../controllers/activityLogs.controller";
import { routeCache } from "../utils/routeCache";

// Δημιουργεί router που ομαδοποιεί τα σχετικά endpoints.
export const activityLogsRouter = Router();

// Όλα τα logs routes θέλουν login και ρόλο super_admin.
activityLogsRouter.use(authRequired, allowRoles(["super_admin"]));

// Επιστρέφει τη λίστα logs για τον πίνακα.
activityLogsRouter.get("/", routeCache("activity-logs", 15 * 1000), listActivityLogs);
activityLogsRouter.get("/file-summary", routeCache("activity-log-summary", 30 * 1000), getActivityLogFileSummary);
// Κατεβάζει τα φιλτραρισμένα logs σε CSV.
activityLogsRouter.get("/export.csv", exportActivityLogsCsv);
// Κατεβάζει τα φιλτραρισμένα logs σε Excel.
activityLogsRouter.get("/export.xlsx", exportActivityLogsXlsx);
