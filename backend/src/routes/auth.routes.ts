import { Router } from "express";
import { changePassword, login, me, register, requestPasswordReset, resetPassword, updateProfile } from "../controllers/auth.controller";
import { authRequired } from "../middleware/auth";

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/forgot", requestPasswordReset);
authRouter.post("/reset", resetPassword);
authRouter.post("/login", login);
authRouter.get("/me", authRequired, me);
authRouter.put("/me", authRequired, updateProfile);
authRouter.post("/change-password", authRequired, changePassword);
