import type { NextFunction, Request, Response } from "express";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const message = err instanceof Error ? err.message : "Unknown error";
  const isProduction = process.env.NODE_ENV === "production";

  res.status(500).json({
    ok: false,
    error: { message: isProduction ? "Internal server error" : message }
  });
}
