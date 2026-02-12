import { Router } from "express";
import { createGraduate, deleteGraduate, getGraduate, listGraduates, updateGraduate } from "../controllers/graduates.controller";
import { allowRoles, authRequired } from "../middleware/auth";

export const graduatesRouter = Router();

graduatesRouter.use(authRequired, allowRoles(["secretariat","super_admin"]));

graduatesRouter.get("/", listGraduates);
graduatesRouter.post("/", createGraduate);

graduatesRouter.get("/:id", getGraduate);
graduatesRouter.put("/:id", updateGraduate);
graduatesRouter.delete("/:id", deleteGraduate);
