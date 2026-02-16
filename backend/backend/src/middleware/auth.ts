import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

export type AuthUser = {
  id: number;
  role: "super_admin" | "secretariat";
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      auth?: AuthUser;
    }
  }
}

function sanitizeToken(raw: string): string {
  let t = raw.trim();

  // If someone stored JSON string in localStorage and sent it with quotes.
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim();
  }

  // If header accidentally became "Bearer Bearer <token>"
  if (t.toLowerCase().startsWith("bearer ")) {
    t = t.slice(7).trim();
  }

  // If something appended extra stuff: "<token>, ..." keep the first token.
  if (t.includes(",")) {
    t = t.split(",")[0].trim();
  }

  return t;
}

function getToken(req: Request): string | null {
  const h = req.headers.authorization;

  if (typeof h === "string" && h.trim()) {
    const parts = h.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0].toLowerCase() === "bearer") {
      const joined = parts.slice(1).join(" ");
      const tok = sanitizeToken(joined);
      return tok ? tok : null;
    }
    // If client mistakenly sent the token without "Bearer"
    const tok = sanitizeToken(h);
    return tok ? tok : null;
  }

  // Fallback for file downloads (<a href>) that can't send Authorization header.
  const q: any = (req as any).query;
  if (q && typeof q.token === "string") {
    const tok = sanitizeToken(q.token);
    return tok ? tok : null;
  }

  return null;
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ ok: false, error: { message: "Missing token" } });

  try {
    const payload = verifyToken(token);
    const au: AuthUser = { id: Number(payload.sub), role: payload.role };
    req.user = au;
    req.auth = au;
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

export function allowRoles(roles: Array<AuthUser["role"]>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });
    if (!roles.includes(req.user.role)) return res.status(403).json({ ok: false, error: { message: "Forbidden" } });
    return next();
  };
}
