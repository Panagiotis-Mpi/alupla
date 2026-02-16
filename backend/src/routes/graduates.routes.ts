import { Router } from "express";
import { createGraduate, deleteGraduate, getGraduate, listGraduates, updateGraduate } from "../controllers/graduates.controller";
import { allowRoles, authRequired } from "../middleware/auth";

export const graduatesRouter = Router();

// TEMPORARY: allow public read for debugging (list only)
graduatesRouter.get("/", listGraduates);

// All write / detail routes remain protected
graduatesRouter.use(authRequired, allowRoles(["secretariat","super_admin"]));

graduatesRouter.post("/", createGraduate);

graduatesRouter.get("/:id", getGraduate);
graduatesRouter.put("/:id", updateGraduate);
graduatesRouter.delete("/:id", deleteGraduate);
