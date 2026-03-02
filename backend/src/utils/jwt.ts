import jwt, { type JwtPayload as StdJwtPayload, type Secret, type SignOptions } from "jsonwebtoken";

const JWT_SECRET_RAW = process.env.JWT_SECRET;
if (!JWT_SECRET_RAW) {
  throw new Error("JWT_SECRET is not set");
}
const JWT_SECRET: Secret = JWT_SECRET_RAW;

export type AppJwtPayload = StdJwtPayload & {
  role: string;
  userId?: number | string;
  email?: string;
};

export function signToken(payload: Record<string, any>) {
  const options: SignOptions = { expiresIn: "7d" };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): AppJwtPayload {
  return jwt.verify(token, JWT_SECRET) as AppJwtPayload;
}
