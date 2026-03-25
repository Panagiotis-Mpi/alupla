import { Router } from "express";
import { allowRoles, authRequired } from "../middleware/auth";
import { createProgramDirection, deleteProgramDirection, downloadProgramDirectionsTemplate, importProgramDirections, listProgramDirections, updateProgramDirection } from "../controllers/programDirections.controller";
import { upload } from "../middleware/upload";

export const programDirectionsRouter = Router();

programDirectionsRouter.use(authRequired);
programDirectionsRouter.get("/", allowRoles(["secretariat", "super_admin"]), listProgramDirections);
programDirectionsRouter.get("/import-template", allowRoles(["secretariat", "super_admin"]), downloadProgramDirectionsTemplate);
programDirectionsRouter.post("/import", allowRoles(["secretariat", "super_admin"]), upload.single("file"), importProgramDirections);
programDirectionsRouter.post("/", allowRoles(["super_admin"]), createProgramDirection);
programDirectionsRouter.put("/:id", allowRoles(["super_admin"]), updateProgramDirection);
programDirectionsRouter.delete("/:id", allowRoles(["super_admin"]), deleteProgramDirection);
