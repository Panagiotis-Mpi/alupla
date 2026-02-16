import { Router } from "express";
import { createGraduate, deleteGraduate, getGraduate, listGraduates, updateGraduate, exportGraduates, importGraduates } from "../controllers/graduates.controller";
import { allowRoles, authRequired } from "../middleware/auth";
import { upload } from "../middleware/upload";

export const graduatesRouter = Router();

// TEMPORARY: allow public read for debugging (list only)
graduatesRouter.get("/", listGraduates);

// All write / detail routes remain protected
graduatesRouter.use(authRequired, allowRoles(["secretariat","super_admin"]));

graduatesRouter.post("/", createGraduate);

graduatesRouter.get("/export", exportGraduates);

graduatesRouter.post("/import", upload.single("file"), importGraduates);

graduatesRouter.get("/:id", getGraduate);
graduatesRouter.put("/:id", updateGraduate);
graduatesRouter.delete("/:id", deleteGraduate);
