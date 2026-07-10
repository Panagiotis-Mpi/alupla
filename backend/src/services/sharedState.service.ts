import crypto from "crypto";
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

function keyHash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
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
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.app_cache_versions (
        scope VARCHAR(100) PRIMARY KEY,
        version BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `, { transaction });
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.app_response_cache (
        scope VARCHAR(100) NOT NULL,
        key_hash CHAR(64) NOT NULL,
        version BIGINT NOT NULL,
        body JSONB NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (scope, key_hash)
      )
    `, { transaction });
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS app_response_cache_expires_at_idx
      ON public.app_response_cache (expires_at)
    `, { transaction });
    await sequelize.query(`DELETE FROM public.app_rate_limits WHERE reset_at < NOW() - INTERVAL '1 day'`, { transaction });
    await sequelize.query(`DELETE FROM public.app_response_cache WHERE expires_at < NOW()`, { transaction });
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
  const rows = await sequelize.query<{ version: string | number }>(
    `
      WITH inserted AS (
        INSERT INTO public.app_cache_versions (scope, version, updated_at)
        VALUES (:scope, 0, NOW())
        ON CONFLICT (scope) DO NOTHING
        RETURNING version
      )
      SELECT version FROM inserted
      UNION ALL
      SELECT version FROM public.app_cache_versions WHERE scope = :scope
      LIMIT 1
    `,
    { replacements: { scope }, type: QueryTypes.SELECT },
  );
  return Number(rows[0]?.version ?? 0);
}

export async function readSharedCache(scope: string, key: string, version: number) {
  const rows = await sequelize.query<{ body: unknown }>(
    `
      SELECT body
      FROM public.app_response_cache
      WHERE scope = :scope
        AND key_hash = :keyHash
        AND version = :version
        AND expires_at > NOW()
      LIMIT 1
    `,
    {
      replacements: { scope, keyHash: keyHash(key), version },
      type: QueryTypes.SELECT,
    },
  );
  return rows[0]?.body ?? null;
}

export async function writeSharedCache(
  scope: string,
  key: string,
  version: number,
  body: unknown,
  ttlMs: number,
  maxEntries = 200,
) {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      `
        INSERT INTO public.app_response_cache (scope, key_hash, version, body, expires_at, updated_at)
        SELECT :scope, :keyHash, :version, CAST(:body AS JSONB), NOW() + (:ttlMs * INTERVAL '1 millisecond'), NOW()
        FROM public.app_cache_versions
        WHERE scope = :scope AND version = :version
        ON CONFLICT (scope, key_hash) DO UPDATE SET
          version = EXCLUDED.version,
          body = EXCLUDED.body,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
        WHERE public.app_response_cache.version <= EXCLUDED.version
      `,
      {
        replacements: {
          scope,
          keyHash: keyHash(key),
          version,
          body: JSON.stringify(body),
          ttlMs: Math.max(1, Math.trunc(ttlMs)),
        },
        transaction,
      },
    );
    await sequelize.query(
      `
        DELETE FROM public.app_response_cache
        WHERE expires_at <= NOW()
      `,
      { transaction },
    );
    await sequelize.query(
      `
        WITH overflow AS (
          SELECT key_hash
          FROM public.app_response_cache
          WHERE scope = :scope
          ORDER BY updated_at DESC
          OFFSET :maxEntries
        )
        DELETE FROM public.app_response_cache
        WHERE scope = :scope
          AND key_hash IN (SELECT key_hash FROM overflow)
      `,
      {
        replacements: { scope, maxEntries: Math.max(1, Math.trunc(maxEntries)) },
        transaction,
      },
    );
  });
}

export async function invalidateSharedCacheScopes(scopes: string[]) {
  const uniqueScopes = Array.from(new Set(scopes.map((scope) => scope.trim()).filter(Boolean)));
  if (!uniqueScopes.length) return;

  await sequelize.transaction(async (transaction) => {
    for (const scope of uniqueScopes) {
      await sequelize.query(
        `
          INSERT INTO public.app_cache_versions (scope, version, updated_at)
          VALUES (:scope, 1, NOW())
          ON CONFLICT (scope) DO UPDATE SET
            version = public.app_cache_versions.version + 1,
            updated_at = NOW()
        `,
        { replacements: { scope }, transaction },
      );
      await sequelize.query(
        `DELETE FROM public.app_response_cache WHERE scope = :scope`,
        { replacements: { scope }, transaction },
      );
    }
  });
}
