import { clearRouteCaches } from "../utils/routeCache";
import { clearPublicStatsCache } from "./publicStatsCache.service";

export function clearGraduateCaches() {
  clearRouteCaches(["graduates", "map"]);
  clearPublicStatsCache();
}
