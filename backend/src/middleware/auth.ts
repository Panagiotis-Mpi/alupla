import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { User } from "../models";

export type AuthUser = {
  id: number;
  role: "super_admin" | "secretariat";
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function getToken(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h) {
    // Fallback for file downloads (e.g. CSV export via <a href="...">).
    // Browser links can't send Authorization headers; allow token in query.
    const q: any = (req as any).query;
    const qt = typeof q?.token === "string" ? q.token : null;
    return qt;
  }
  const parts = h.split(" ");
  if (parts.length !== 2) return null;
  if (parts[0].toLowerCase() !== "bearer") return null;
  return parts[1];
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ ok: false, error: { message: "Missing token" } });

  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthUser;
    req.user = { id: Number(payload.id), role: payload.role };

    // LIVE presence: update last_seen_at on ANY authenticated request (fire-and-forget)
    User.update({ last_seen_at: new Date() }, { where: { id: req.user.id } }).catch(() => {});

    return next();
  } catch {
    return res.status(401).json({ ok: false, error: { message: "Invalid token" } });
  }
}

export function superAdminOnly(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });
  if (req.user.role !== "super_admin") return res.status(403).json({ ok: false, error: { message: "Forbidden" } });
  return next();
}

// Keep compatibility with existing routes: allowRoles(["secretariat","super_admin"])
export function allowRoles(roles: Array<AuthUser["role"]>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });
    if (!roles.includes(req.user.role)) return res.status(403).json({ ok: false, error: { message: "Forbidden" } });
    return next();
  };
}
