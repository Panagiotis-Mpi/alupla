import crypto from "crypto";
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

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

export async function initializeSharedState() {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(`SELECT pg_advisory_xact_lock(hashtext('alupla_shared_state'))`, { transaction });
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.app_rate_limits (
        scope VARCHAR(100) NOT NULL,
        key_hash CHAR(64) NOT NULL,
        request_count INTEGER NOT NULL,
        reset_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (scope, key_hash)
      )
    `, { transaction });
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS app_rate_limits_reset_at_idx
      ON public.app_rate_limits (reset_at)
    `, { transaction });
    await sequelize.query(`DELETE FROM public.app_rate_limits WHERE reset_at < NOW() - INTERVAL '1 day'`, { transaction });
  });
}

export async function consumeSharedRateLimit(scope: string, key: string, windowMs: number) {
  const rows = await sequelize.query<{ request_count: number; reset_at: Date | string }>(
    `
      INSERT INTO public.app_rate_limits (scope, key_hash, request_count, reset_at, updated_at)
      VALUES (:scope, :keyHash, 1, NOW() + (:windowMs * INTERVAL '1 millisecond'), NOW())
      ON CONFLICT (scope, key_hash) DO UPDATE SET
        request_count = CASE
          WHEN public.app_rate_limits.reset_at <= NOW() THEN 1
          ELSE public.app_rate_limits.request_count + 1
        END,
        reset_at = CASE
          WHEN public.app_rate_limits.reset_at <= NOW() THEN NOW() + (:windowMs * INTERVAL '1 millisecond')
          ELSE public.app_rate_limits.reset_at
        END,
        updated_at = NOW()
      RETURNING request_count, reset_at
    `,
    {
      replacements: { scope, keyHash: keyHash(key), windowMs: Math.max(1, Math.trunc(windowMs)) },
      type: QueryTypes.SELECT,
    },
  );

  const row = rows[0];
  return {
    count: Number(row?.request_count ?? 1),
    resetAt: new Date(row?.reset_at ?? Date.now() + windowMs).getTime(),
  };
}

export async function getSharedCacheVersion(scope: string) {
  return cacheVersions.get(scope) ?? 0;
}

export async function readSharedCache(scope: string, key: string, version: number) {
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

export async function writeSharedCache(
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

export async function invalidateSharedCacheScopes(scopes: string[]) {
  const uniqueScopes = Array.from(new Set(scopes.map((scope) => scope.trim()).filter(Boolean)));
  for (const scope of uniqueScopes) {
    cacheVersions.set(scope, (cacheVersions.get(scope) ?? 0) + 1);
    responseCache.delete(scope);
  }
}
