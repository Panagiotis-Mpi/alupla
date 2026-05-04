import { Router } from "express";
import { changePassword, login, me, register } from "../controllers/auth.controller";
import { authRequired } from "../middleware/auth";

// Router για εγγραφή, login και στοιχεία τρέχοντος χρήστη.
export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
// Τα παρακάτω endpoints απαιτούν ενεργό login.
authRouter.get("/me", authRequired, me);
authRouter.post("/change-password", authRequired, changePassword);
