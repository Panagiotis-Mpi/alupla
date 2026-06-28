// Δημιουργεί και επαληθεύει JWT tokens για authentication.
import jwt, { type JwtPayload as StdJwtPayload, type Secret, type SignOptions } from "jsonwebtoken";

const JWT_SECRET_RAW = process.env.JWT_SECRET;
if (!JWT_SECRET_RAW) {
  throw new Error("JWT_SECRET is not set");
}
const JWT_SECRET: Secret = JWT_SECRET_RAW;

type AppJwtPayload = StdJwtPayload & {
  role: string;
  userId?: number | string;
  email?: string;
};

// Δημιουργεί JWT token για logged-in χρήστη.
export function signToken(payload: Record<string, any>) {
  const options: SignOptions = { expiresIn: "7d" };
  return jwt.sign(payload, JWT_SECRET, options);
}

// Ελέγχει JWT token και επιστρέφει payload.
export function verifyToken(token: string): AppJwtPayload {
  return jwt.verify(token, JWT_SECRET) as AppJwtPayload;
}
