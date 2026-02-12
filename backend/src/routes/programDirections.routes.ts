import { Router } from "express";
import { allowRoles, authRequired } from "../middleware/auth";
import { listProgramDirections } from "../controllers/programDirections.controller";

export const programDirectionsRouter = Router();

programDirectionsRouter.use(authRequired, allowRoles(["secretariat","super_admin"]));

// GET /program-directions?study_program_id=1
programDirectionsRouter.get("/", listProgramDirections);
