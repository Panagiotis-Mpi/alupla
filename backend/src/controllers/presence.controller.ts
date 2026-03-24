import type { Request, Response } from "express";
import { User } from "../models/User";
import { logAction } from "../services/log.service";

export async function pingPresence(req: Request, res: Response) {
  const authUser = (req as any).user as { id: number; role: string } | undefined;
  if (!authUser) return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });

  await User.update(
    { last_seen_at: new Date() } as any,
    { where: { id: authUser.id } }
  );


  return res.json({ ok: true });
}
