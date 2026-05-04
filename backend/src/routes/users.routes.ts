// Ορίζει routes διαχείρισης χρηστών.
import { Router } from "express";
import { allowRoles, authRequired } from "../middleware/auth";
import { createUser, deactivateUser, listUsers, updateUser } from "../controllers/users.controller";
import { routeCache } from "../utils/routeCache";

// Δημιουργεί router που ομαδοποιεί τα σχετικά endpoints.
export const usersRouter = Router();

// Διαχείριση χρηστών επιτρέπεται μόνο σε super admin.
usersRouter.use(authRequired, allowRoles(["super_admin"]));

// Λίστα χρηστών.
usersRouter.get("/", routeCache("users", 10 * 1000), listUsers);
// Δημιουργία χρήστη.
usersRouter.post("/", createUser);
// Ενημέρωση χρήστη/ρόλου.
usersRouter.put("/:id", updateUser);
usersRouter.post("/:id/deactivate", deactivateUser);
// Απενεργοποίηση χρήστη.
usersRouter.delete("/:id", deactivateUser);
