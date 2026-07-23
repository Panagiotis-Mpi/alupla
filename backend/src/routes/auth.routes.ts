import { Router } from "express";
import { changePassword, login, me, passwordResetAccount, requestPasswordReset, resetPassword } from "../controllers/auth.controller";
import { authRequired } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const authRouter = Router();

authRouter.post("/login", asyncHandler(login));
authRouter.post("/forgot-password", asyncHandler(requestPasswordReset));
authRouter.post("/reset-password/account", asyncHandler(passwordResetAccount));
authRouter.post("/reset-password", asyncHandler(resetPassword));
authRouter.get("/me", authRequired, asyncHandler(me));
authRouter.post("/change-password", authRequired, asyncHandler(changePassword));
