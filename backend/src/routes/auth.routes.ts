import { Router } from "express";
import { changePassword, login, me, passwordResetAccount, requestPasswordReset, resetPassword } from "../controllers/auth.controller";
import { authRequired } from "../middleware/auth";
import { ipAndBodyKey, rateLimit } from "../middleware/rateLimit";
import { asyncHandler } from "../utils/asyncHandler";

export const authRouter = Router();

const loginLimit = rateLimit({ scope: "auth-login", windowMs: 15 * 60 * 1000, max: 10, keyGenerator: ipAndBodyKey("email") });
const forgotPasswordLimit = rateLimit({ scope: "auth-forgot-password", windowMs: 60 * 60 * 1000, max: 5, keyGenerator: ipAndBodyKey("email") });
const resetAccountLimit = rateLimit({ scope: "auth-reset-account", windowMs: 15 * 60 * 1000, max: 20 });
const resetPasswordLimit = rateLimit({ scope: "auth-reset-password", windowMs: 15 * 60 * 1000, max: 10 });

authRouter.post("/login", loginLimit, asyncHandler(login));
authRouter.post("/forgot-password", forgotPasswordLimit, asyncHandler(requestPasswordReset));
authRouter.post("/reset-password/account", resetAccountLimit, asyncHandler(passwordResetAccount));
authRouter.post("/reset-password", resetPasswordLimit, asyncHandler(resetPassword));
authRouter.get("/me", authRequired, asyncHandler(me));
authRouter.post("/change-password", authRequired, asyncHandler(changePassword));
