import { clearRouteCaches } from "../utils/routeCache";
import { clearPublicStatsCache } from "./publicStatsCache.service";

export async function clearGraduateCaches() {
  await Promise.all([
    clearRouteCaches(["graduates", "map"]),
    clearPublicStatsCache(),
  ]);
}
