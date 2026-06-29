import crypto from "crypto";
import jwt, { type JwtPayload as StdJwtPayload, type Secret, type SignOptions } from "jsonwebtoken";

const JWT_SECRET_RAW = process.env.JWT_SECRET;
if (!JWT_SECRET_RAW) {
  throw new Error("JWT_SECRET is not set");
}
const JWT_SECRET: Secret = JWT_SECRET_RAW;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "12h") as SignOptions["expiresIn"];

type AppJwtPayload = StdJwtPayload & {
  role: string;
  session_key?: string;
  userId?: number | string;
  email?: string;
};

export function passwordSessionKey(passwordHash: string) {
  return crypto.createHash("sha256").update(passwordHash).digest("base64url");
}

export function tokenMatchesPassword(payload: AppJwtPayload, passwordHash: string) {
  const actual = Buffer.from(String(payload.session_key || ""));
  const expected = Buffer.from(passwordSessionKey(passwordHash));
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function signToken(payload: Record<string, any>) {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): AppJwtPayload {
  return jwt.verify(token, JWT_SECRET) as AppJwtPayload;
}
