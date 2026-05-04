import type { Request, Response, NextFunction } from "express";
import { Op } from "sequelize";
import { User } from "../models/User";
import { verifyToken } from "../utils/jwt";

export type AuthUser = {
  id: number;
  role: "super_admin" | "secretariat";
};

// Προσθέτει user/auth πάνω στο Express request για χρήση στα protected routes.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      auth?: AuthUser;
    }
  }
}

function reject(res: Response, status: number, message: string) {
  return res.status(status).json({ ok: false, error: { message } });
}

function trimWrappedValue(value: string): string {
  const trimmed = value.trim();
  const wrappedInDoubleQuotes = trimmed.startsWith('"') && trimmed.endsWith('"');
  const wrappedInSingleQuotes = trimmed.startsWith("'") && trimmed.endsWith("'");

  if (wrappedInDoubleQuotes || wrappedInSingleQuotes) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

// Καθαρίζει token τιμές που έρχονται με quotes, Bearer ή extra commas.
function normalizeTokenValue(value: string): string {
  let normalized = trimWrappedValue(value);

  if (normalized.toLowerCase().startsWith("bearer ")) {
    normalized = normalized.slice(7).trim();
  }

  const commaIndex = normalized.indexOf(",");
  if (commaIndex !== -1) {
    normalized = normalized.slice(0, commaIndex).trim();
  }

  return normalized;
}

function tokenFromAuthorizationHeader(headerValue: string): string | null {
  const rawValue = headerValue.trim();
  if (!rawValue) return null;

  const parts = rawValue.split(/\s+/);
  if (parts.length > 1 && parts[0].toLowerCase() === "bearer") {
    const token = normalizeTokenValue(parts.slice(1).join(" "));
    return token || null;
  }

  const token = normalizeTokenValue(rawValue);
  return token || null;
}

function getRequestToken(req: Request): string | null {
  const { authorization } = req.headers;
  if (typeof authorization !== "string") {
    return null;
  }

  return tokenFromAuthorizationHeader(authorization);
}

function isAllowedRole(role: unknown): role is AuthUser["role"] {
  return role === "super_admin" || role === "secretariat";
}

function setAuthUser(req: Request, user: AuthUser) {
  req.user = user;
  req.auth = user;
}

const PRESENCE_TOUCH_INTERVAL_MS = 30 * 1000;

// Ενημερώνει last_seen_at χωρίς να γράφει στη βάση σε κάθε request.
function touchPresence(userId: number) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - PRESENCE_TOUCH_INTERVAL_MS);

  return User.update(
    { last_seen_at: now },
    {
      where: {
        id: userId,
        [Op.or]: [{ last_seen_at: null }, { last_seen_at: { [Op.lt]: cutoff } }]
      }
    }
  );
}

// Middleware που απαιτεί έγκυρο JWT και ενεργό χρήστη.
export async function authRequired(req: Request, res: Response, next: NextFunction) {
  const token = getRequestToken(req);
  if (!token) {
    return reject(res, 401, "Missing token");
  }

  try {
    const payload = verifyToken(token);
    const userId = Number((payload as any).sub);

    if (!Number.isFinite(userId) || userId <= 0) {
      return reject(res, 401, "Invalid token");
    }

    const user = await User.findByPk(userId);
    if (!user || !user.is_active || !isAllowedRole(user.role)) {
      return reject(res, 401, "Invalid token");
    }

    const authUser: AuthUser = {
      id: user.id,
      role: user.role
    };

    setAuthUser(req, authUser);
    void touchPresence(authUser.id).catch(() => undefined);

    return next();
  } catch {
    return reject(res, 401, "Invalid token");
  }
}

// Middleware που επιτρέπει μόνο συγκεκριμένους ρόλους.
export function allowRoles(roles: Array<AuthUser["role"]>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const currentUser = req.user;

    if (!currentUser) {
      return reject(res, 401, "Unauthorized");
    }

    if (!roles.includes(currentUser.role)) {
      return reject(res, 403, "Forbidden");
    }

    return next();
  };
}
