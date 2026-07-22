import {
  getMemoryCacheVersion,
  invalidateMemoryCacheScopes,
  readMemoryCache,
  writeMemoryCache,
} from "./memoryCache.service";

const PUBLIC_STATS_CACHE_MS = 5 * 60 * 1000;
const PUBLIC_STATS_SCOPE = "public-stats";

export async function getPublicStatsCache(key: string) {
  const version = await getMemoryCacheVersion(PUBLIC_STATS_SCOPE);
  return readMemoryCache(PUBLIC_STATS_SCOPE, key, version);
}

export async function setPublicStatsCache(key: string, body: Record<string, unknown>) {
  const version = await getMemoryCacheVersion(PUBLIC_STATS_SCOPE);
  await writeMemoryCache(PUBLIC_STATS_SCOPE, key, version, body, PUBLIC_STATS_CACHE_MS, 100);
}

export async function clearPublicStatsCache() {
  await invalidateMemoryCacheScopes([PUBLIC_STATS_SCOPE]);
}
