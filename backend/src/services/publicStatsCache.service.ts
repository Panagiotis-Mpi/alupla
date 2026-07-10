import {
  getSharedCacheVersion,
  invalidateSharedCacheScopes,
  readSharedCache,
  writeSharedCache,
} from "./sharedState.service";

const PUBLIC_STATS_CACHE_MS = 5 * 60 * 1000;
const PUBLIC_STATS_SCOPE = "public-stats";

export async function getPublicStatsCache(key: string) {
  const version = await getSharedCacheVersion(PUBLIC_STATS_SCOPE);
  return readSharedCache(PUBLIC_STATS_SCOPE, key, version);
}

export async function setPublicStatsCache(key: string, body: Record<string, unknown>) {
  const version = await getSharedCacheVersion(PUBLIC_STATS_SCOPE);
  await writeSharedCache(PUBLIC_STATS_SCOPE, key, version, body, PUBLIC_STATS_CACHE_MS, 100);
}

export async function clearPublicStatsCache() {
  await invalidateSharedCacheScopes([PUBLIC_STATS_SCOPE]);
}
