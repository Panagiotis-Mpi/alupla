import { Router } from "express";
import { changePassword, login, me, passwordResetAccount, requestPasswordReset, resetPassword } from "../controllers/auth.controller";
import { authRequired } from "../middleware/auth";
import { ipAndBodyKey, rateLimit } from "../middleware/rateLimit";
import { asyncHandler } from "../utils/asyncHandler";

export const authRouter = Router();

const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyGenerator: ipAndBodyKey("email") });
const forgotPasswordLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, keyGenerator: ipAndBodyKey("email") });
const resetAccountLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const resetPasswordLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

authRouter.post("/login", loginLimit, asyncHandler(login));
authRouter.post("/forgot-password", forgotPasswordLimit, asyncHandler(requestPasswordReset));
authRouter.post("/reset-password/account", resetAccountLimit, asyncHandler(passwordResetAccount));
authRouter.post("/reset-password", resetPasswordLimit, asyncHandler(resetPassword));
authRouter.get("/me", authRequired, asyncHandler(me));
authRouter.post("/change-password", authRequired, asyncHandler(changePassword));
