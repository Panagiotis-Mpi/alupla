import type { Request, Response } from "express";
import { User } from "../models/User";

export async function pingPresence(req: Request, res: Response) {
  const authUser = req.auth;
  if (!authUser) {
    return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });
  }

  const lastSeenAt = new Date();
  await User.update({ last_seen_at: lastSeenAt }, { where: { id: authUser.id } });

  return res.json({ ok: true, last_seen_at: lastSeenAt.toISOString() });
}
