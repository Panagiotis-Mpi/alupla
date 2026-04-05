import { Router } from "express";
import {
  createGraduate,
  deleteGraduate,
  getGraduate,
  listGraduates,
  updateGraduate,
  exportGraduates,
  exportGraduatesImportTemplate,
  logGraduatesPdfExport,
  importGraduates,
} from "../controllers/graduates.controller";
import { allowRoles, authRequired } from "../middleware/auth";
import { upload } from "../middleware/upload";

export const graduatesRouter = Router();

graduatesRouter.use(authRequired, allowRoles(["secretariat", "super_admin"]));

graduatesRouter.get("/", listGraduates);

graduatesRouter.post("/", createGraduate);

graduatesRouter.get("/export", exportGraduates);
graduatesRouter.get("/import-template", exportGraduatesImportTemplate);
graduatesRouter.post("/export-pdf-log", logGraduatesPdfExport);

graduatesRouter.post("/import", upload.single("file"), importGraduates);

graduatesRouter.get("/:id", getGraduate);
graduatesRouter.put("/:id", updateGraduate);
graduatesRouter.delete("/:id", deleteGraduate);
