import { Router } from "express";
import {
  createGraduate,
  deleteGraduate,
  deleteGraduates,
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
import { asyncHandler } from "../utils/asyncHandler";
import { routeCache } from "../utils/routeCache";

// Router για όλα τα endpoints αποφοίτων
export const graduatesRouter = Router();

// Απαιτεί login και συγκεκριμένους ρόλους
graduatesRouter.use(authRequired, allowRoles(["secretariat", "super_admin"]));

// Επιστρέφει λίστα αποφοίτων, με σύντομο cache για καλύτερη απόδοση στον πίνακα.
graduatesRouter.get("/", routeCache("graduates", 2 * 60 * 1000), asyncHandler(listGraduates));

// Δημιουργεί νέο απόφοιτο από τα στοιχεία που στέλνει η φόρμα.
graduatesRouter.post("/", asyncHandler(createGraduate));

// Εξαγωγές και template εισαγωγής αποφοίτων.
graduatesRouter.get("/export", asyncHandler(exportGraduates));
graduatesRouter.post("/export", asyncHandler(exportGraduates));
graduatesRouter.get("/import-template", asyncHandler(exportGraduatesImportTemplate));
graduatesRouter.post("/export-pdf-log", asyncHandler(logGraduatesPdfExport));

// Μαζική εισαγωγή αποφοίτων από αρχείο που ανεβαίνει με πεδίο ονόματος "file".
graduatesRouter.post("/import", upload.single("file"), asyncHandler(importGraduates));
graduatesRouter.delete("/bulk", asyncHandler(deleteGraduates));

// Ενέργειες πάνω σε συγκεκριμένο απόφοιτο, με βάση το id του URL.
graduatesRouter.get("/:id", asyncHandler(getGraduate));
graduatesRouter.put("/:id", asyncHandler(updateGraduate));
graduatesRouter.delete("/:id", asyncHandler(deleteGraduate));
