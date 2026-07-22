import crypto from "crypto";

type CacheEntry = {
  version: number;
  body: unknown;
  expiresAt: number;
  updatedAt: number;
};

const cacheVersions = new Map<string, number>();
const responseCache = new Map<string, Map<string, CacheEntry>>();

function keyHash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function scopeCache(scope: string) {
  let entries = responseCache.get(scope);
  if (!entries) {
    entries = new Map<string, CacheEntry>();
    responseCache.set(scope, entries);
  }
  return entries;
}

function clearExpiredEntries(entries: Map<string, CacheEntry>, now = Date.now()) {
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(key);
  }
}

export function getMemoryCacheVersion(scope: string) {
  return cacheVersions.get(scope) ?? 0;
}

export function readMemoryCache(scope: string, key: string, version: number) {
  const entries = responseCache.get(scope);
  if (!entries) return null;

  const hashedKey = keyHash(key);
  const entry = entries.get(hashedKey);
  if (!entry) return null;

  if (entry.version !== version || entry.expiresAt <= Date.now()) {
    entries.delete(hashedKey);
    if (!entries.size) responseCache.delete(scope);
    return null;
  }

  return entry.body;
}

export function writeMemoryCache(
  scope: string,
  key: string,
  version: number,
  body: unknown,
  ttlMs: number,
  maxEntries = 200,
) {
  if ((cacheVersions.get(scope) ?? 0) !== version) return;

  const entries = scopeCache(scope);
  const now = Date.now();
  clearExpiredEntries(entries, now);
  entries.set(keyHash(key), {
    version,
    body,
    expiresAt: now + Math.max(1, Math.trunc(ttlMs)),
    updatedAt: now,
  });

  const limit = Math.max(1, Math.trunc(maxEntries));
  if (entries.size <= limit) return;

  const overflow = Array.from(entries.entries())
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
    .slice(limit);

  for (const [entryKey] of overflow) entries.delete(entryKey);
}

export function invalidateMemoryCacheScopes(scopes: string[]) {
  const uniqueScopes = Array.from(new Set(scopes.map((scope) => scope.trim()).filter(Boolean)));
  for (const scope of uniqueScopes) {
    cacheVersions.set(scope, (cacheVersions.get(scope) ?? 0) + 1);
    responseCache.delete(scope);
  }
}
