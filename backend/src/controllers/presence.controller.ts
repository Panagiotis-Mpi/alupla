import type { Request, Response } from "express";
import { User } from "../models/User";
import { logAction } from "../services/log.service";

/**
 * Live presence in DB:
 * - Client sends ping every ~10-15s when logged-in.
 * - We store users.last_seen_at = NOW()
 */
export async function pingPresence(req: Request, res: Response) {
  const authUser = (req as any).user as { id: number; role: string } | undefined;
  if (!authUser) return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });

  await User.update(
    { last_seen_at: new Date() } as any,
    { where: { id: authUser.id } }
  );

  // optional log (commented to avoid log spam)
  // await logAction({ user_id: authUser.id, action: "presence_ping", entity_type: "system", entity_id: null });

  return res.json({ ok: true });
}
