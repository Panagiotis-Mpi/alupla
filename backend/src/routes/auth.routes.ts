import { Router } from "express";
import { changePassword, login, me, register, requestPasswordReset, resendVerification, resetPassword, updateProfile, verifyEmail } from "../controllers/auth.controller";
import { authRequired } from "../middleware/auth";

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.get("/verify", verifyEmail);
authRouter.post("/resend-verify", resendVerification);
authRouter.post("/forgot", requestPasswordReset);
authRouter.post("/reset", resetPassword);
authRouter.post("/login", login);
authRouter.get("/me", authRequired, me);
authRouter.put("/me", authRequired, updateProfile);
authRouter.post("/change-password", authRequired, changePassword);
