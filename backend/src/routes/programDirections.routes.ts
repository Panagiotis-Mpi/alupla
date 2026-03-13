import { Router } from "express";
import { allowRoles, authRequired } from "../middleware/auth";
import { createProgramDirection, deleteProgramDirection, listProgramDirections, updateProgramDirection } from "../controllers/programDirections.controller";

export const programDirectionsRouter = Router();

programDirectionsRouter.use(authRequired);
programDirectionsRouter.get("/", allowRoles(["secretariat", "super_admin"]), listProgramDirections);
programDirectionsRouter.post("/", allowRoles(["super_admin"]), createProgramDirection);
programDirectionsRouter.put("/:id", allowRoles(["super_admin"]), updateProgramDirection);
programDirectionsRouter.delete("/:id", allowRoles(["super_admin"]), deleteProgramDirection);
