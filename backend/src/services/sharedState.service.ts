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
