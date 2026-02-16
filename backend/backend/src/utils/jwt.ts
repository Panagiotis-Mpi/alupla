import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { UserRole } from "../models/User";

export type JwtPayload = {
  sub: number;
  role: UserRole;
};

export function signToken(payload: JwtPayload, opts?: { expiresIn?: string }) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: opts?.expiresIn ?? "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}
