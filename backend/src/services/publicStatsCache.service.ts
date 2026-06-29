type PublicStatsCacheEntry = { expires: number; body: Record<string, unknown> };

const publicStatsCache = new Map<string, PublicStatsCacheEntry>();
const PUBLIC_STATS_CACHE_MS = 5 * 60 * 1000;
const PUBLIC_STATS_CACHE_MAX_ENTRIES = 100;

export function getPublicStatsCache(key: string) {
  const item = publicStatsCache.get(key);
  if (!item) return null;
  if (item.expires <= Date.now()) {
    publicStatsCache.delete(key);
    return null;
  }
  publicStatsCache.delete(key);
  publicStatsCache.set(key, item);
  return item.body;
}

export function setPublicStatsCache(key: string, body: Record<string, unknown>) {
  const now = Date.now();
  for (const [entryKey, entry] of publicStatsCache) {
    if (entry.expires <= now) publicStatsCache.delete(entryKey);
  }
  if (!publicStatsCache.has(key) && publicStatsCache.size >= PUBLIC_STATS_CACHE_MAX_ENTRIES) {
    const oldestKey = publicStatsCache.keys().next().value;
    if (oldestKey) publicStatsCache.delete(oldestKey);
  }
  publicStatsCache.delete(key);
  publicStatsCache.set(key, { expires: now + PUBLIC_STATS_CACHE_MS, body });
}

export function clearPublicStatsCache() {
  publicStatsCache.clear();
}
