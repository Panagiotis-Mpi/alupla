// Ενημερώνει το last_seen του χρήστη ώστε να φαίνεται αν είναι online πρόσφατα.
import type { Request, Response } from "express";
import { User } from "../models/User";

// Ενημερώνει last_seen_at του χρήστη όταν είναι ενεργός.
export async function pingPresence(req: Request, res: Response) {
  const authUser = req.auth;
  if (!authUser) {
    return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });
  }

  const now = new Date();

  await User.update(
    { last_seen_at: now } as any,
    { where: { id: authUser.id } }
  );

  return res.json({ ok: true, last_seen_at: now.toISOString() });
}
