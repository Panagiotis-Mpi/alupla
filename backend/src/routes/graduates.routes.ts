import { Router } from "express";
import {
  createGraduate,
  deleteGraduate,
  getGraduate,
  listGraduates,
  updateGraduate,
  exportGraduates,
  importGraduates,
  normalizeGraduateOrigins,
} from "../controllers/graduates.controller";
import { allowRoles, authRequired } from "../middleware/auth";
import { upload } from "../middleware/upload";

export const graduatesRouter = Router();

// Graduates are NOT public. All endpoints require auth + role.
graduatesRouter.use(authRequired, allowRoles(["secretariat", "super_admin"]));

graduatesRouter.get("/", listGraduates);

graduatesRouter.post("/", createGraduate);

graduatesRouter.get("/export", exportGraduates);

graduatesRouter.post("/import", upload.single("file"), importGraduates);

// One-time helper: normalize stored origins to PERIPHERY (Option A)
graduatesRouter.post("/normalize-origins", normalizeGraduateOrigins);

graduatesRouter.get("/:id", getGraduate);
graduatesRouter.put("/:id", updateGraduate);
graduatesRouter.delete("/:id", deleteGraduate);
