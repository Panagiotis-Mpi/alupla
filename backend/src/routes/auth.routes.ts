import { Router } from "express";
import { changePassword, login, me, requestPasswordReset, resetPassword } from "../controllers/auth.controller";
import { authRequired } from "../middleware/auth";

// Router για εγγραφή, login και στοιχεία τρέχοντος χρήστη.
export const authRouter = Router();

authRouter.post("/login", login);
authRouter.post("/forgot-password", requestPasswordReset);
authRouter.post("/reset-password", resetPassword);
// Τα παρακάτω endpoints απαιτούν ενεργό login.
authRouter.get("/me", authRequired, me);
authRouter.post("/change-password", authRequired, changePassword);
