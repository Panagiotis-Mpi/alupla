import type { NextFunction, Request, Response } from "express";

// Κεντρικός χειριστής σφαλμάτων για όλο το backend.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Σε production δεν επιστρέφονται εσωτερικά error messages στον χρήστη.
  const message = err instanceof Error ? err.message : "Unknown error";
  const isProduction = process.env.NODE_ENV === "production";

  res.status(500).json({
    ok: false,
    error: { message: isProduction ? "Internal server error" : message }
  });
}
