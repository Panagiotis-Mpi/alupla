// Ορίζει routes για unresolved regions και αντιστοίχιση πόλεων.
import { Router } from "express";
import { allowRoles, authRequired } from "../middleware/auth";
import { listRegions } from "../controllers/regions.controller";

// Δημιουργεί router που ομαδοποιεί τα σχετικά endpoints.
export const regionsRouter = Router();

regionsRouter.use(authRequired, allowRoles(["secretariat", "super_admin"]));
regionsRouter.get("/", listRegions);
