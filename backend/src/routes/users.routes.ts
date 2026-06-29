// Ορίζει routes διαχείρισης χρηστών.
import { Router } from "express";
import { allowRoles, authRequired } from "../middleware/auth";
import { createUser, deactivateUser, exportUsersCsv, exportUsersXlsx, listUsers, updateUser } from "../controllers/users.controller";
import { asyncHandler } from "../utils/asyncHandler";

// Δημιουργεί router που ομαδοποιεί τα σχετικά endpoints.
export const usersRouter = Router();

// Διαχείριση χρηστών επιτρέπεται μόνο σε super admin.
usersRouter.use(authRequired, allowRoles(["super_admin"]));

// Δημιουργία χρήστη.
usersRouter.get("/", asyncHandler(listUsers));
usersRouter.get("/export.csv", asyncHandler(exportUsersCsv));
usersRouter.get("/export.xlsx", asyncHandler(exportUsersXlsx));
usersRouter.post("/", asyncHandler(createUser));
// Ενημέρωση χρήστη/ρόλου.
usersRouter.put("/:id", asyncHandler(updateUser));
// Απενεργοποίηση χρήστη.
usersRouter.post("/:id/deactivate", asyncHandler(deactivateUser));
usersRouter.delete("/:id", asyncHandler(deactivateUser));
