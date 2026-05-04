// Ορίζει routes διαχείρισης χρηστών.
import { Router } from "express";
import { allowRoles, authRequired } from "../middleware/auth";
import { createUser, deactivateUser, listUsers, updateUser } from "../controllers/users.controller";

// Δημιουργεί router που ομαδοποιεί τα σχετικά endpoints.
export const usersRouter = Router();

// Διαχείριση χρηστών επιτρέπεται μόνο σε super admin.
usersRouter.use(authRequired, allowRoles(["super_admin"]));

// Δημιουργία χρήστη.
usersRouter.get("/", listUsers);
usersRouter.post("/", createUser);
// Ενημέρωση χρήστη/ρόλου.
usersRouter.put("/:id", updateUser);
// Απενεργοποίηση χρήστη.
usersRouter.post("/:id/deactivate", deactivateUser);
usersRouter.delete("/:id", deactivateUser);
