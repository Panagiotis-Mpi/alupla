import type { Request, Response, NextFunction } from "express";
import { Op } from "sequelize";
import { User } from "../models/User";
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

function trimQuotes(value: string): string {
  const token = value.trim();
  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
    return token.slice(1, -1).trim();
  }
  return token;
}

function cleanToken(value: string): string {
  let token = trimQuotes(value);

  if (token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim();
  }

  const commaIndex = token.indexOf(",");
  if (commaIndex >= 0) {
    token = token.slice(0, commaIndex).trim();
  }

  return token;
}

function extractAuthorizationToken(headerValue: string): string | null {
  const raw = headerValue.trim();
  if (!raw) return null;

  const parts = raw.split(/\s+/);
  if (parts.length >= 2 && parts[0].toLowerCase() === "bearer") {
    const token = cleanToken(parts.slice(1).join(" "));
    return token || null;
  }

  const token = cleanToken(raw);
  return token || null;
}

function getRequestToken(req: Request): string | null {
  if (typeof req.headers.authorization === "string") {
    const token = extractAuthorizationToken(req.headers.authorization);
    if (token) return token;
  }

  const query = (req as any).query;
  if (query && typeof query.token === "string") {
    const token = cleanToken(query.token);
    if (token) return token;
  }

  return null;
}

function touchPresence(userId: number) {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);

  return User.update(
    { last_seen_at: new Date() },
    {
      where: {
        id: userId,
        [Op.or]: [{ last_seen_at: null }, { last_seen_at: { [Op.lt]: cutoff } }]
      }
    }
  );
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const token = getRequestToken(req);
  if (!token) return res.status(401).json({ ok: false, error: { message: "Missing token" } });

  try {
    const payload = verifyToken(token);
    const role = String((payload as any).role);

    if (role !== "super_admin" && role !== "secretariat") {
      return res.status(401).json({ ok: false, error: { message: "Invalid token" } });
    }

    const authUser: AuthUser = {
      id: Number(payload.sub),
      role
    };

    req.user = authUser;
    req.auth = authUser;

    void touchPresence(authUser.id).catch(() => undefined);

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
