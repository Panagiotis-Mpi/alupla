import { clearRouteCaches } from "../utils/routeCache";
import { clearPublicStatsCache } from "../controllers/public.controller";

export function clearGraduateCaches() {
  clearRouteCaches(["graduates", "map"]);
  clearPublicStatsCache();
}
