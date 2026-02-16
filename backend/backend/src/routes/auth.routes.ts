import { Router } from "express";
import { changePassword, login, me, register, verifyEmail, requestPasswordReset, resetPassword } from "../controllers/auth.controller";
import { authRequired } from "../middleware/auth";

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.get("/verify", verifyEmail);
authRouter.post("/forgot", requestPasswordReset);
authRouter.post("/reset", resetPassword);
authRouter.post("/login", login);
authRouter.get("/me", authRequired, me);

authRouter.post("/change-password", authRequired, changePassword);
